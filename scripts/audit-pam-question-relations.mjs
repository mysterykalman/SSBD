import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const outputDir=join(root,'artifacts','pam-question-redundancy');
const model=await loadPam1775Model(loadPamClassicModel);
const {questions,targets,weights,knownMask}=model;
const N=targets.length,F=questions.length;
const polarity=state=>state&1;
const strength=state=>(state&2)?2:1;
const stateAt=(q,t)=>weights[q*N+t];
const knownAt=(q,t)=>!knownMask||knownMask[q*N+t]===1;
const round=(v,d=4)=>Number(Number(v).toFixed(d));
const pct=v=>round(v*100,2);
const pairKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const increment=(map,key)=>map.set(key,(map.get(key)||0)+1);

const SEMANTIC_PAIRS=Object.freeze([
  {a:97,b:132,label:'alive / living',class:'twin'},
  {a:42,b:148,label:'burn / combustible',class:'twin'},
  {a:69,b:141,label:'placed on head / wear on head',class:'twin'},
  {a:30,b:32,label:'makes noise / can be heard',class:'near'},
  {a:56,b:116,label:'see through / clear',class:'near'},
  {a:101,b:125,label:'fluffy / furry',class:'near'},
  {a:30,b:79,label:'makes noise / rings',class:'related'},
  {a:32,b:79,label:'heard / rings',class:'related'},
  {a:48,b:65,label:'warm / hot',class:'ordered'},
  {a:51,b:92,label:'cold / cool',class:'ordered'},
  {a:100,b:120,label:'water / salt-water',class:'ordered'},
  {a:94,b:145,label:'swims / fish',class:'related'},
  {a:126,b:152,label:'warm-blooded / mammal',class:'related'},
  {a:129,b:152,label:'spine / mammal',class:'related'},
  {a:149,b:153,label:'feathers / wings',class:'related'}
]);

const EXPECTED_IMPLICATIONS=Object.freeze([
  {from:22,answer:'yes',to:8,expected:'yes',label:'smaller than golf ball -> smaller than loaf'},
  {from:57,answer:'yes',to:24,expected:'yes',label:'bigger than sofa -> bigger than microwave'},
  {from:24,answer:'yes',to:12,expected:'yes',label:'bigger than microwave -> bigger than butter'},
  {from:8,answer:'no',to:22,expected:'no',label:'not smaller than loaf -> not smaller than golf ball'},
  {from:12,answer:'no',to:24,expected:'no',label:'not bigger than butter -> not bigger than microwave'},
  {from:24,answer:'no',to:57,expected:'no',label:'not bigger than microwave -> not bigger than sofa'},
  {from:65,answer:'yes',to:48,expected:'yes',label:'hot -> warm'},
  {from:51,answer:'yes',to:92,expected:'yes',label:'cold -> cool'},
  {from:141,answer:'yes',to:69,expected:'yes',label:'wear on head -> placed on head'},
  {from:69,answer:'yes',to:141,expected:'yes',label:'placed on head -> wear on head'},
  {from:120,answer:'yes',to:100,expected:'yes',label:'salt-water -> lives in water'},
  {from:152,answer:'yes',to:126,expected:'yes',label:'mammal -> warm blooded'},
  {from:152,answer:'yes',to:129,expected:'yes',label:'mammal -> spine'},
  {from:152,answer:'yes',to:97,expected:'yes',label:'mammal -> alive'},
  {from:152,answer:'yes',to:132,expected:'yes',label:'mammal -> living'},
  {from:124,answer:'yes',to:152,expected:'yes',label:'rodent -> mammal'},
  {from:113,answer:'yes',to:152,expected:'yes',label:'dog -> mammal'},
  {from:145,answer:'yes',to:100,expected:'yes',label:'fish -> lives in water'},
  {from:145,answer:'yes',to:94,expected:'yes',label:'fish -> swims'},
  {from:145,answer:'yes',to:129,expected:'yes',label:'fish -> spine'},
  {from:145,answer:'yes',to:139,expected:'yes',label:'fish -> cold blooded'},
  {from:79,answer:'yes',to:30,expected:'yes',label:'rings -> makes noise'},
  {from:79,answer:'yes',to:32,expected:'yes',label:'rings -> can be heard'},
  {from:111,answer:'yes',to:30,expected:'yes',label:'growls -> makes noise'},
  {from:111,answer:'yes',to:32,expected:'yes',label:'growls -> can be heard'},
  {from:53,answer:'yes',to:23,expected:'yes',label:'produces light -> bright'}
]);

function vectorStats(a,b){
  let commonKnown=0,n11=0,n10=0,n01=0,n00=0,stateMismatch=0;
  for(let t=0;t<N;t++){
    if(!knownAt(a,t)||!knownAt(b,t))continue;
    commonKnown++;
    const sa=stateAt(a,t),sb=stateAt(b,t),pa=polarity(sa),pb=polarity(sb);
    if(pa&&pb)n11++;else if(pa)n10++;else if(pb)n01++;else n00++;
    if(sa!==sb)stateMismatch++;
  }
  const disagreement=n10+n01;
  const union=n11+n10+n01;
  const denom=Math.sqrt((n11+n10)*(n01+n00)*(n11+n01)*(n10+n00));
  const phi=denom?((n11*n00-n10*n01)/denom):0;
  return{a,b,commonKnown,n11,n10,n01,n00,positiveUnion:union,polarityDisagreement:commonKnown?disagreement/commonKnown:1,jaccard:union?n11/union:0,phi,stateDisagreement:commonKnown?stateMismatch/commonKnown:1};
}

function implicationStats(rule){
  const fromPolarity=rule.answer==='yes'?1:0;
  const expectedPolarity=rule.expected==='yes'?1:0;
  let commonKnown=0,support=0,violations=0;
  for(let t=0;t<N;t++){
    if(!knownAt(rule.from,t)||!knownAt(rule.to,t))continue;
    commonKnown++;
    if(polarity(stateAt(rule.from,t))!==fromPolarity)continue;
    support++;
    if(polarity(stateAt(rule.to,t))!==expectedPolarity)violations++;
  }
  return{...rule,commonKnown,support,violations,violationRate:support?violations/support:null};
}

const allPairs=[];
for(let a=4;a<F;a++)for(let b=a+1;b<F;b++)allPairs.push(vectorStats(a,b));
const meaningfulNear=allPairs.filter(x=>x.commonKnown>=1200&&x.positiveUnion>=20&&(x.jaccard>=0.7||x.phi>=0.85)).sort((a,b)=>b.phi-a.phi||b.jaccard-a.jaccard||a.polarityDisagreement-b.polarityDisagreement);
const semanticPairStats=SEMANTIC_PAIRS.map(x=>({...x,...vectorStats(x.a,x.b),questionA:questions[x.a],questionB:questions[x.b]}));
const implicationAudit=EXPECTED_IMPLICATIONS.map(rule=>({...implicationStats(rule),fromText:questions[rule.from],toText:questions[rule.to]}));

const derived=[];
for(let from=4;from<F;from++){
  for(let to=4;to<F;to++){
    if(from===to)continue;
    for(const answer of ['yes','no'])for(const expected of ['yes','no']){
      const s=implicationStats({from,to,answer,expected,label:'derived'});
      if(s.support<25||s.violationRate==null||s.violationRate>0.01)continue;
      let expectedBase=0,known=0;
      const want=expected==='yes'?1:0;
      for(let t=0;t<N;t++)if(knownAt(to,t)){known++;if(polarity(stateAt(to,t))===want)expectedBase++;}
      const baseRate=known?expectedBase/known:1;
      if(baseRate>=0.97)continue;
      derived.push({...s,baseRate,lift:(1-s.violationRate)-baseRate});
    }
  }
}
derived.sort((a,b)=>b.lift-a.lift||a.violationRate-b.violationRate||b.support-a.support);

function answerForTarget(q,t){
  if(!knownAt(q,t))return'unknown';
  const s=stateAt(q,t);
  if(polarity(s))return strength(s)===2?'yes':'probably';
  return strength(s)===2?'no':'probably_not';
}
function binary(answer){
  if(answer==='yes'||answer==='probably')return'yes';
  if(answer==='no'||answer==='probably_not'||answer==='doubtful')return'no';
  return null;
}
function categoryFor(t){
  for(let q=0;q<4;q++)if(knownAt(q,t)&&polarity(stateAt(q,t)))return ['animal','vegetable','mineral','other'][q];
  throw new Error(`No category for ${targets[t]}`);
}

const oldWindow=global.window;
global.window={PAM_CLASSIC_MODEL:{questions,targets,weightsB64:weights.toString('base64'),knownMaskB64:knownMask?.toString('base64'),layout:'question-major',states:4,baseTargets:1200,extensionTargets:575}};
if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
await import(`${pathToFileURL(join(root,'src/client','mom-mode','engine.js')).href}?relations=${Date.now()}`);
const engine=global.window.PamClassic20Q;

const implicationOccurrences=Array.from({length:EXPECTED_IMPLICATIONS.length},()=>({count:0,gaps:new Map()}));
const semanticOccurrences=new Map();
for(let t=0;t<N;t++){
  const game=engine.createGame();
  let next=engine.setCategory(game,categoryFor(t));
  const seq=[];
  let safety=0;
  while(safety++<64){
    if(next.kind==='question'){
      const answer=answerForTarget(next.index,t);
      seq.push({q:next.index,answer});
      next=engine.answer(game,next,answer);
      continue;
    }
    if(next.kind==='hunch'){engine.commitGuess(game,next);break;}
    if(next.kind==='guess')break;
    throw new Error(`Unexpected action ${next.kind}`);
  }
  for(const pair of SEMANTIC_PAIRS){
    const ia=seq.findIndex(x=>x.q===pair.a),ib=seq.findIndex(x=>x.q===pair.b);
    if(ia>=0&&ib>=0){
      const key=pairKey(pair.a,pair.b);
      if(!semanticOccurrences.has(key))semanticOccurrences.set(key,{count:0,gaps:new Map()});
      const rec=semanticOccurrences.get(key);rec.count++;increment(rec.gaps,String(Math.abs(ia-ib)));
    }
  }
  for(let i=0;i<seq.length;i++){
    const answer=binary(seq[i].answer);
    if(!answer)continue;
    for(let r=0;r<EXPECTED_IMPLICATIONS.length;r++){
      const rule=EXPECTED_IMPLICATIONS[r];
      if(rule.from!==seq[i].q||rule.answer!==answer)continue;
      const later=seq.findIndex((x,k)=>k>i&&x.q===rule.to);
      if(later<0)continue;
      implicationOccurrences[r].count++;
      increment(implicationOccurrences[r].gaps,String(later-i));
    }
  }
}
if(oldWindow===undefined)delete global.window;else global.window=oldWindow;

const formatVector=x=>({...x,polarityDisagreementPct:pct(x.polarityDisagreement),jaccardPct:pct(x.jaccard),phi:round(x.phi,4),stateDisagreementPct:pct(x.stateDisagreement)});
const result={
  generatedAt:new Date().toISOString(),
  semanticPairs:semanticPairStats.map(x=>({...formatVector(x),occurrence:semanticOccurrences.get(pairKey(x.a,x.b))?{count:semanticOccurrences.get(pairKey(x.a,x.b)).count,gaps:Object.fromEntries([...semanticOccurrences.get(pairKey(x.a,x.b)).gaps.entries()].sort((a,b)=>Number(a[0])-Number(b[0])))}:{count:0,gaps:{}}})),
  meaningfulNearVectors:meaningfulNear.slice(0,100).map(x=>({...formatVector(x),questionA:questions[x.a],questionB:questions[x.b]})),
  implications:implicationAudit.map((x,i)=>({...x,violationRatePct:x.violationRate==null?null:pct(x.violationRate),occurrence:{count:implicationOccurrences[i].count,gaps:Object.fromEntries([...implicationOccurrences[i].gaps.entries()].sort((a,b)=>Number(a[0])-Number(b[0])))}})),
  derivedImplications:derived.slice(0,150).map(x=>({...x,violationRatePct:pct(x.violationRate),baseRatePct:pct(x.baseRate),liftPct:pct(x.lift),fromText:questions[x.from],toText:questions[x.to]}))
};

await mkdir(outputDir,{recursive:true});
await writeFile(join(outputDir,'relations.json'),JSON.stringify(result,null,2));
console.log('PAM_RELATION_AUDIT_START');
console.log(JSON.stringify({
  semanticPairs:result.semanticPairs,
  meaningfulNearVectors:result.meaningfulNearVectors.slice(0,30),
  implications:result.implications,
  derivedImplications:result.derivedImplications.slice(0,50)
},null,2));
console.log('PAM_RELATION_AUDIT_END');
