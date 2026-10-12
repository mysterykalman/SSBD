import {createMomRuntimeGame} from '../src/shared/mom-runtime-game.js';
import {normalizeMomLookup} from './mom-runtime-compiler.mjs';

export function resolveRuntimeConcept(runtime,value){
  const key=normalizeMomLookup(value);
  const target=runtime.aliases?.[key];
  if(Number.isInteger(target))return{index:target,concept:runtime.concepts[target],ambiguous:false};
  if(Array.isArray(target)){
    const exact=target.find(index=>normalizeMomLookup(runtime.concepts[index]?.name)===key);
    if(Number.isInteger(exact))return{index:exact,concept:runtime.concepts[exact],ambiguous:false};
    return{index:null,concept:null,ambiguous:true,candidates:[...target]};
  }
  const exact=runtime.concepts.findIndex(concept=>normalizeMomLookup(concept.name)===key);
  return exact>=0?{index:exact,concept:runtime.concepts[exact],ambiguous:false}:{index:null,concept:null,ambiguous:false};
}

export function oracleRuntimeAnswer(api,secretIndex,question){
  const truth=api.truthForAction(secretIndex,question);
  return truth===1?'yes':truth===0?'no':'unknown';
}

function questionDescriptor(runtime,action){
  if(action.source==='facet')return{family:`facet:${action.type}`,breadth:'specific'};
  const question=runtime.questions[action.index];
  return{family:question?.family||question?.group||'attribute',breadth:question?.breadth||'attribute'};
}

export function traceRuntimeSelfPlay(runtime,secretIndex,opts={}){
  const api=createMomRuntimeGame(runtime,{budget:20,...opts});
  const path=[];
  let next=api.choose();
  while(api.game.status==='playing'){
    if(!next)break;
    if(next.kind==='hunch'){
      path.push({turn:api.game.turn+1,kind:'hunch',label:runtime.concepts[next.index]?.name||'',confidence:next.confidence,reason:next.reason});
      next=api.commitGuess(next);continue;
    }
    if(next.kind==='guess'){
      const correct=next.index===secretIndex;
      path.push({turn:api.game.turn+1,kind:'guess',label:next.label,answer:correct?'yes':'no',reason:next.reason});
      const confirmed=api.confirm(next,correct);
      return{result:{kind:'result',winner:correct?'pam':'player',correct,turns:api.game.turn,guess:next.label,reason:correct?'':(next.reason||'wrong_guess'),score:confirmed.score},path};
    }
    if(next.kind==='stumped')return{result:{kind:'result',winner:'player',correct:false,turns:api.game.turn,reason:'stumped',score:next.score},path};
    const answer=oracleRuntimeAnswer(api,secretIndex,next);
    const descriptor=questionDescriptor(runtime,next);
    path.push({turn:api.game.turn+1,kind:'question',id:next.id,text:next.text,source:next.source,family:descriptor.family,breadth:descriptor.breadth,answer,gain:next.gain,naturalScore:next.naturalScore,semanticCoverage:next.semanticCoverage,knownCoverage:next.knownCoverage});
    next=api.answer(next,answer);
  }
  return{result:{kind:'result',winner:'player',correct:false,turns:api.game.turn,reason:api.game.status||'budget'},path};
}

export function runtimePathFlags(row,path){
  const flags=[];
  const category=normalizeMomLookup(row.category);
  const isPerson=category.includes('people')||category==='person';
  if(isPerson){
    for(const step of path){
      if(step.kind!=='question')continue;
      const q=normalizeMomLookup(step.text);
      if(/man made|manufactured/.test(q))flags.push('person_asked_manmade');
      if(/can you eat|edible|food/.test(q))flags.push('person_asked_edible');
    }
  }
  return[...new Set(flags)];
}

export function evaluateRuntimeBenchmark(runtime,rows,{selfPlay=true}={}){
  return rows.map(row=>{
    const match=resolveRuntimeConcept(runtime,row.item);
    if(match.index==null)return{...row,present:false,ambiguous:Boolean(match.ambiguous),matchedName:'',pamWon:false,turns:null,sensibleQuestionPath:null,pathFlags:[],failureReason:match.ambiguous?'ambiguous_alias':'missing_from_runtime_knowledge',path:[]};
    if(!selfPlay)return{...row,present:true,ambiguous:false,matchedName:match.concept.name,pamWon:null,turns:null,sensibleQuestionPath:null,pathFlags:[],failureReason:'',path:[]};
    const traced=traceRuntimeSelfPlay(runtime,match.index);
    const flags=runtimePathFlags(row,traced.path);
    const pamWon=traced.result.winner==='pam';
    return{...row,present:true,ambiguous:false,matchedName:match.concept.name,pamWon,turns:traced.result.turns,sensibleQuestionPath:flags.length===0,pathFlags:flags,failureReason:pamWon?'':(traced.result.reason||'not_guessed_within_20'),path:traced.path};
  });
}

function aggregate(rows,key){
  const out={};
  for(const row of rows){
    const label=row[key]||'Unclassified';
    out[label]||={total:0,present:0,wins:0,turnTotal:0,turnCount:0};
    const bucket=out[label];bucket.total++;
    if(row.present)bucket.present++;
    if(row.pamWon)bucket.wins++;
    if(Number.isFinite(row.turns)){bucket.turnTotal+=row.turns;bucket.turnCount++;}
  }
  for(const bucket of Object.values(out)){
    bucket.coverageRate=bucket.total?bucket.present/bucket.total:0;
    bucket.winRateOverall=bucket.total?bucket.wins/bucket.total:0;
    bucket.winRatePresent=bucket.present?bucket.wins/bucket.present:0;
    bucket.avgTurns=bucket.turnCount?bucket.turnTotal/bucket.turnCount:null;
    delete bucket.turnTotal;delete bucket.turnCount;
  }
  return out;
}

function median(values){
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return null;
  const middle=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
}

export function runtimeQuestionQuality(rows){
  let totalQuestions=0,unknownHeavy=0,repeatedFamily=0,prematureSpecific=0,weakSemantic=0;
  for(const row of rows){
    let previousFamily=null;
    for(const step of row.path||[]){
      if(step.kind!=='question')continue;
      totalQuestions++;
      if(Number(step.knownCoverage)<0.5)unknownHeavy++;
      if(previousFamily&&step.family===previousFamily)repeatedFamily++;
      if(step.turn<=3&&step.breadth==='specific')prematureSpecific++;
      if(Number(step.semanticCoverage)<0.5)weakSemantic++;
      previousFamily=step.family||null;
    }
  }
  const rate=value=>totalQuestions?value/totalQuestions:0;
  return{
    totalQuestions,
    medianTurns:median(rows.filter(row=>row.present&&Number.isFinite(row.turns)).map(row=>row.turns)),
    unknownHeavyQuestions:unknownHeavy,unknownHeavyRate:rate(unknownHeavy),
    repeatedFamilyQuestions:repeatedFamily,repeatedFamilyRate:rate(repeatedFamily),
    prematureSpecificQuestions:prematureSpecific,prematureSpecificRate:rate(prematureSpecific),
    weakSemanticQuestions:weakSemantic,weakSemanticRate:rate(weakSemantic)
  };
}

export function summarizeRuntimeBenchmark(runtime,rows){
  const presentCount=rows.filter(row=>row.present).length;
  const pamWinCount=rows.filter(row=>row.pamWon).length;
  const failureClasses={};
  for(const row of rows)if(row.pamWon===false)failureClasses[row.failureReason||'unknown']=1+(failureClasses[row.failureReason||'unknown']||0);
  return{
    generatedAt:new Date().toISOString(),runtimeSourceHash:runtime.meta?.sourceHash||'',runtimeKnowledgeCount:runtime.concepts.length,runtimeFeatureCount:runtime.questions.length,
    rowCount:rows.length,presentCount,missingCount:rows.length-presentCount,coverageRate:rows.length?presentCount/rows.length:0,pamWinCount,
    pamWinRateOverall:rows.length?pamWinCount/rows.length:0,pamWinRatePresent:presentCount?pamWinCount/presentCount:0,
    pathFlagCount:rows.filter(row=>row.pathFlags?.length).length,questionQuality:runtimeQuestionQuality(rows),failureClasses,byTier:aggregate(rows,'tier'),byCategory:aggregate(rows,'category'),rows
  };
}
