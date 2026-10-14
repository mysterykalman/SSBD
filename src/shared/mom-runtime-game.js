import {createMomRuntimeReasoner,initialRuntimeBelief} from './mom-runtime-reasoning.js';

const MIX={yes:[1,0],probably:[0.75,0.25],unknown:null,probably_not:[0.25,0.75],no:[0,1]};
const py=(truth,noise)=>truth===1?1-noise:truth===0?noise:0.5;
const hardMatch=(truth,answer)=>!Number.isFinite(truth)||answer==='yes'?(!Number.isFinite(truth)||truth>0):answer==='no'?(!Number.isFinite(truth)||truth<1):true;

function scoreFor(questionCount,correct,stumped=false,continueCost=0){
  const base=Math.min(Math.max(Number(questionCount)||0,0),20);
  const bonus=stumped||!correct?10:0;
  return Math.max(0,base+bonus-Math.max(0,Number(continueCost)||0));
}

function guessText(concept){
  const name=String(concept?.name||'').trim();
  const lower=name.toLowerCase();
  if(concept?.specificPerson||concept?.category==='person')return `Are you thinking of ${name}?`;
  if(concept?.proper)return `Is it ${name}?`;
  if(concept?.article==='')return `Is it ${lower}?`;
  if(concept?.article)return `Is it ${concept.article} ${lower}?`;
  return `Is it ${'aeiou'.includes(lower[0])?'an':'a'} ${lower}?`;
}

function naturalQuestionText(text,id='',value=''){
  const raw=String(text||'').trim();
  const key=String(id||'').toLowerCase();
  const facetValue=String(value||'').toLowerCase();
  if(key==='clothing'||facetValue==='clothing'||/^is it an? clothing\??$/i.test(raw))return 'Is it clothing or something you wear?';
  return raw;
}

export function createMomRuntimeGame(runtime,opts={}){
  const reasoner=createMomRuntimeReasoner(runtime);
  const game={
    runtime,reasoner,belief:initialRuntimeBelief(runtime),
    asked:new Set(),askedFacetKeys:new Set(),answers:new Map(),confirmedYes:new Set(),confirmedFacetYes:new Set(),
    turn:0,budget:opts.budget||20,noise:opts.noise??0.12,guessThreshold:opts.guessThreshold??0.92,
    minGuessQuestions:opts.minGuessQuestions??5,continuePrice:opts.continuePrice??2,pending:null,status:'playing',
    history:/** @type {Array<Record<string, any>>} */([]),surprise:false,guessUsed:false,continueCost:0,deferGuessOnce:false,
    recentQuestionIndexes:/** @type {number[]} */([]),recentFacetTypes:/** @type {string[]} */([]),
    askedTexts:new Set()
  };

  function top(){
    let index=0;
    for(let i=1;i<game.belief.length;i++)if(game.belief[i]>game.belief[index])index=i;
    return{index,p:game.belief[index],concept:runtime.concepts[index]};
  }
  function topTwo(){
    let first=-1,second=-1;
    for(let i=0;i<game.belief.length;i++){
      if(first<0||game.belief[i]>game.belief[first]){second=first;first=i;}
      else if(second<0||game.belief[i]>game.belief[second])second=i;
    }
    return{first,second,firstP:first<0?0:game.belief[first],secondP:second<0?0:game.belief[second]};
  }
  /** Share of belief held by her top candidates: how narrowed-down she is. */
  function focus(limit=12){
    const sorted=Array.from(game.belief).sort((a,b)=>b-a);
    let sum=0;for(let i=0;i<Math.min(limit,sorted.length);i++)sum+=sorted[i];
    return sum;
  }
  function context(){
    return{
      focus:focus(),askedTexts:game.askedTexts,
      turn:game.turn,noise:game.noise,asked:game.asked,askedFacetKeys:game.askedFacetKeys,
      confirmedYes:game.confirmedYes,confirmedFacetYes:game.confirmedFacetYes,
      recentQuestionIndexes:game.recentQuestionIndexes,recentFacetTypes:game.recentFacetTypes
    };
  }
  function facetTruth(conceptIndex,type,value){
    const definition=runtime.facetIndex?.types?.[type];
    if(!definition)return NaN;
    const yes=definition.values?.[value]||[];
    if(yes.includes(conceptIndex))return 1;
    if(definition.exclusiveKnown&&(definition.known||[]).includes(conceptIndex))return 0;
    return NaN;
  }
  function truthForAction(conceptIndex,action){
    if(action?.source==='facet'||action?.kind==='facet')return facetTruth(conceptIndex,action.type,action.value);
    if(Number.isInteger(action?.index))return reasoner.truthAt(conceptIndex,action.index);
    return NaN;
  }
  function answerKey(action){return action?.source==='facet'?action.key:action?.id;}
  function viableCandidates(){
    const out=[];
    for(let i=0;i<runtime.concepts.length;i++){
      let ok=true;
      for(const entry of game.history){
        if(entry.kind!=='question'||(entry.answer!=='yes'&&entry.answer!=='no'))continue;
        if(!hardMatch(truthForAction(i,entry.action),entry.answer)){ok=false;break;}
      }
      if(ok)out.push(i);
    }
    return out;
  }
  function restrictedBelief(indexes){
    const belief=new Float64Array(runtime.concepts.length);
    if(!indexes.length)return belief;
    const mass=indexes.reduce((sum,index)=>sum+game.belief[index],0);
    if(mass>1e-15){for(const index of indexes)belief[index]=game.belief[index]/mass;}
    else{for(const index of indexes)belief[index]=1/indexes.length;}
    return belief;
  }
  function tiedCandidates(){
    const leader=top();
    const tied=[];
    for(let i=0;i<game.belief.length;i++)if(game.belief[i]>=leader.p*0.99)tied.push(i);
    return tied;
  }
  function distinguishable(indexes){
    if(indexes.length<2)return false;
    return Boolean(reasoner.bestQuestion(restrictedBelief(indexes),context()));
  }
  function guessReason(){
    if(game.guessUsed||game.turn<game.minGuessQuestions)return null;
    const viable=viableCandidates();
    if(viable.length===1)return{reason:'logical',index:viable[0]};
    const leaders=topTwo();
    const ratio=leaders.secondP<=0.0001?Infinity:leaders.firstP/leaders.secondP;
    // Guess once one answer is clearly ahead of the rest; the bar relaxes as questions run out.
    const clear=(leaders.firstP>=Math.min(game.guessThreshold,0.5)&&ratio>=3)
      ||(game.turn>=10&&leaders.firstP>=0.3&&ratio>=2.5)
      ||(game.turn>=14&&leaders.firstP>=0.18&&ratio>=2)
      ||(game.turn>=17&&ratio>=1.6);
    if(clear)return{reason:'confidence',index:leaders.first};
    if(game.turn>=18&&leaders.firstP>=0.1){
      const tied=tiedCandidates();
      if(tied.length>=2&&tied.length<=3&&!distinguishable(tied))return{reason:'tie',index:leaders.first};
    }
    return null;
  }
  function makeGuess(decision){
    const index=decision?.index??top().index;
    const concept=runtime.concepts[index];
    return{kind:'guess',index,label:concept.name,text:guessText(concept),confidence:game.belief[index],reason:decision?.reason||'forced'};
  }
  function makeHunch(decision){
    return{kind:'hunch',index:decision.index,confidence:game.belief[decision.index],reason:decision.reason,questionsAsked:game.turn,maxQuestions:game.budget,continuePrice:game.continuePrice,continueCost:game.continueCost};
  }
  function stumpedState(){
    game.status='stumped';
    return{kind:'stumped',turns:game.turn,continueCost:game.continueCost,score:scoreFor(game.turn,false,true,game.continueCost)};
  }
  function questionAction(best){
    if(best.kind==='facet')return{kind:'question',source:'facet',key:best.key,type:best.type,value:best.value,id:best.key,text:naturalQuestionText(best.text,best.key,best.value),gain:best.gain,naturalScore:best.score,semanticCoverage:best.semantic,knownCoverage:best.known,confidence:top().p};
    return{kind:'question',source:'static',index:best.index,id:best.question.id,text:naturalQuestionText(best.question.q,best.question.id),gain:best.gain,naturalScore:best.score,semanticCoverage:best.semantic,knownCoverage:best.known,confidence:top().p};
  }
  function choose(){
    if(game.status!=='playing')throw new Error('game finished');
    // Out of questions: she always takes her one guess with her best candidate.
    if(game.turn>=game.budget)return game.guessUsed?stumpedState():makeGuess({reason:'final',index:top().index});
    const decision=guessReason();
    if(decision?.reason==='logical')return makeGuess(decision);
    const next=reasoner.bestQuestion(game.belief,context());
    if((decision?.reason==='confidence'||decision?.reason==='tie')&&!game.deferGuessOnce){
      if(next)return makeHunch(decision);
      return makeGuess({...decision,reason:'no_questions'});
    }
    if(game.deferGuessOnce)game.deferGuessOnce=false;
    if(!next)return makeGuess({reason:'no_questions',index:top().index});
    return questionAction(next);
  }
  function answer(question,value){
    if(game.status!=='playing')throw new Error('game finished');
    if(question?.kind!=='question')throw new Error('answer requires a question');
    if(!Object.hasOwn(MIX,value))throw new Error('unsupported answer');
    const mix=MIX[value];
    game.askedTexts.add(reasoner.normalizedText(question.text));
    if(question.source==='facet')game.askedFacetKeys.add(question.key);
    else if(Number.isInteger(question.index))game.asked.add(question.index);
    game.answers.set(answerKey(question),value);
    if(value==='yes'||value==='probably'){
      if(question.source==='facet')game.confirmedFacetYes.add(question.key);
      else if(Number.isInteger(question.index))game.confirmedYes.add(question.index);
    }
    game.turn++;
    game.surprise=false;
    if(mix){
      const before=top().p;
      let sum=0;
      for(let i=0;i<game.belief.length;i++){
        const likelihoodYes=py(truthForAction(i,question),game.noise);
        const likelihood=mix[0]*likelihoodYes+mix[1]*(1-likelihoodYes);
        game.belief[i]*=likelihood;sum+=game.belief[i];
      }
      if(sum>1e-15)for(let i=0;i<game.belief.length;i++)game.belief[i]/=sum;
      game.surprise=top().p<before*0.55;
    }
    if(question.source==='facet')game.recentFacetTypes.push(question.type);
    else if(Number.isInteger(question.index))game.recentQuestionIndexes.push(question.index);
    game.history.push({kind:'question',id:question.id,question:question.text,answer:value,action:{...question}});
    return choose();
  }
  function commitGuess(hunch){
    if(hunch?.kind!=='hunch')throw new Error('guess requires a hunch');
    if(game.status!=='playing')throw new Error('game finished');
    return makeGuess({reason:'confidence',index:hunch.index});
  }
  function deferGuess(hunch){
    if(hunch?.kind!=='hunch')throw new Error('continue requires a hunch');
    if(game.status!=='playing')throw new Error('game finished');
    game.continueCost+=game.continuePrice;game.deferGuessOnce=true;
    game.history.push({kind:'decision',decision:'continue',cost:game.continuePrice,afterQuestions:game.turn});
    return choose();
  }
  function confirm(guess,correct){
    if(guess?.kind!=='guess')throw new Error('not a guess');
    if(game.status!=='playing')throw new Error('game finished');
    if(game.guessUsed)throw new Error('guess already used');
    game.guessUsed=true;
    game.history.push({kind:'guess',question:guess.text,guess:guess.label,answer:correct?'yes':'no'});
    game.status=correct?'won':'lost';
    return{correct:Boolean(correct),guess:guess.label,turns:game.turn,done:true,continueCost:game.continueCost,score:scoreFor(game.turn,Boolean(correct),false,game.continueCost),reason:guess.reason||null};
  }

  return{game,top,topTwo,viableCandidates,guessReason,choose,answer,commitGuess,deferGuess,confirm,truthForAction,scoreFor};
}

export{scoreFor};
