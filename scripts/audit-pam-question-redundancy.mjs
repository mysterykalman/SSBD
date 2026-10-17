import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const outputDir=join(root,'artifacts','pam-question-redundancy');
const model=await loadPam1775Model(loadPamClassicModel);
const {questions,targets,weights,knownMask}=model;
const N=targets.length;
const F=questions.length;
if(N!==1775||F!==156)throw new Error(`Expected Pam 1775×156 model, found ${N}×${F}`);

const polarity=state=>state&1;
const strength=state=>(state&2)?2:1;
const stateAt=(q,t)=>weights[q*N+t];
const knownAt=(q,t)=>!knownMask||knownMask[q*N+t]===1;
const pairKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const orderedKey=(a,b)=>`${a}>${b}`;
const round=(value,digits=4)=>Number(Number(value).toFixed(digits));
const pct=value=>round(value*100,2);
const median=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  if(!sorted.length)return 0;
  const m=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2;
};
const quantile=(values,p)=>{
  const sorted=[...values].sort((a,b)=>a-b);
  if(!sorted.length)return 0;
  const index=(sorted.length-1)*p;
  const lo=Math.floor(index),hi=Math.ceil(index);
  if(lo===hi)return sorted[lo];
  return sorted[lo]+(sorted[hi]-sorted[lo])*(index-lo);
};
const increment=(map,key,amount=1)=>map.set(key,(map.get(key)||0)+amount);
const topEntries=(map,limit=20)=>[...map.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))).slice(0,limit);

const FAMILY_DEFS=Object.freeze({
  'life-core':[97,132],
  'combustion':[42,148],
  'headwear':[69,141],
  'sound':[30,32,79,111],
  'texture-softness':[20,101,125],
  'transparency':[56,107,116],
  'size':[8,12,22,24,43,57,60],
  'weight-lift':[29,34,39],
  'temperature':[48,51,65,92],
  'aquatic':[11,45,94,100,120,145],
  'animal-locomotion':[84,94,136,150],
  'animal-taxonomy':[113,124,145,147,152],
  'animal-physiology':[97,99,126,129,131,132,139,149,153,154,155],
  'botanical':[91,93,109,130,151],
  'colour':[6,9,13,27,71,74,87,107,108],
  'light':[23,40,53],
  'smell':[52,64,105],
  'shape':[14,15,18],
  'movement-transport':[31,47,58,77,98,114],
  'electronics-tech':[33,36,40,46,63,68,80,98],
  'carry':[44,59,77],
  'food-taste':[85,86,117],
  'dietary':[115,119,128,142],
  'touch-hold':[4,34,110,143]
});

const familyByQuestion=Array.from({length:F},()=>[]);
for(const [family,indexes] of Object.entries(FAMILY_DEFS)){
  for(const q of indexes)familyByQuestion[q].push(family);
}

const HARD_TWIN_GROUPS=Object.freeze([
  [97,132],
  [42,148],
  [69,141]
]);
const hardTwinPairs=new Set();
for(const group of HARD_TWIN_GROUPS){
  for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)hardTwinPairs.add(pairKey(group[i],group[j]));
}

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

function vectorPairStats(a,b){
  let commonKnown=0,polarityMismatch=0,stateMismatch=0;
  let yesA=0,yesB=0;
  for(let t=0;t<N;t++){
    if(!knownAt(a,t)||!knownAt(b,t))continue;
    commonKnown++;
    const sa=stateAt(a,t),sb=stateAt(b,t);
    if(polarity(sa)!==polarity(sb))polarityMismatch++;
    if(sa!==sb)stateMismatch++;
    if(polarity(sa))yesA++;
    if(polarity(sb))yesB++;
  }
  return{
    a,b,commonKnown,coverage:commonKnown/N,
    polarityMismatch,polarityDisagreement:commonKnown?polarityMismatch/commonKnown:1,
    polaritySimilarity:commonKnown?1-polarityMismatch/commonKnown:0,
    stateMismatch,stateDisagreement:commonKnown?stateMismatch/commonKnown:1,
    yesRateA:commonKnown?yesA/commonKnown:0,yesRateB:commonKnown?yesB/commonKnown:0
  };
}

const vectorPairs=[];
for(let a=4;a<F;a++)for(let b=a+1;b<F;b++)vectorPairs.push(vectorPairStats(a,b));
const vectorThresholdCounts={};
for(const threshold of [0,0.005,0.01,0.02,0.03,0.05]){
  vectorThresholdCounts[String(threshold)]=vectorPairs.filter(x=>x.commonKnown>=1200&&x.polarityDisagreement<=threshold).length;
}
const nearVectorPairs=vectorPairs
  .filter(x=>x.commonKnown>=1200&&x.polarityDisagreement<=0.03)
  .sort((a,b)=>a.polarityDisagreement-b.polarityDisagreement||b.commonKnown-a.commonKnown||a.a-b.a||a.b-b.b);
const nearVectorPairSet=new Set(nearVectorPairs.map(x=>pairKey(x.a,x.b)));

function implicationStats(rule){
  const fromYes=rule.answer==='yes';
  const expectedYes=rule.expected==='yes';
  let support=0,violations=0,commonKnown=0;
  for(let t=0;t<N;t++){
    if(!knownAt(rule.from,t)||!knownAt(rule.to,t))continue;
    commonKnown++;
    const antecedent=polarity(stateAt(rule.from,t))===fromYes;
    if(!antecedent)continue;
    support++;
    if((polarity(stateAt(rule.to,t))===1)!==expectedYes)violations++;
  }
  return{...rule,commonKnown,support,violations,violationRate:support?violations/support:1};
}
const expectedImplicationStats=EXPECTED_IMPLICATIONS.map(implicationStats);

const derivedImplications=[];
for(let from=4;from<F;from++){
  for(let to=4;to<F;to++){
    if(from===to)continue;
    for(const answer of ['yes','no']){
      const expected=answer;
      const stat=implicationStats({from,to,answer,expected,label:'data-derived'});
      if(stat.support>=100&&stat.violationRate<=0.01)derivedImplications.push(stat);
    }
  }
}
derivedImplications.sort((a,b)=>a.violationRate-b.violationRate||b.support-a.support||a.from-b.from||a.to-b.to);

function answerForTarget(q,t){
  if(!knownAt(q,t))return'unknown';
  const state=stateAt(q,t);
  if(polarity(state))return strength(state)===2?'yes':'probably';
  return strength(state)===2?'no':'probably_not';
}
function binaryAnswer(value){
  if(value==='yes'||value==='probably')return'yes';
  if(value==='no'||value==='probably_not'||value==='doubtful')return'no';
  return null;
}
function targetCategory(t){
  for(let q=0;q<4;q++)if(knownAt(q,t)&&polarity(stateAt(q,t))===1)return ['animal','vegetable','mineral','other'][q];
  return'unknown';
}
function targetCohort(t){
  if(t<1200)return'base-1200';
  if(t<1400)return'extension-200';
  return'quality-375';
}

const priorWindow=global.window;
global.window={PAM_CLASSIC_MODEL:{
  questions,targets,weightsB64:weights.toString('base64'),knownMaskB64:knownMask?.toString('base64'),layout:'question-major',states:4,baseTargets:1200,extensionTargets:575
}};
if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
await import(`${pathToFileURL(join(root,'src','client','mom-mode','engine.js')).href}?pamQuestionRedundancyAudit=${Date.now()}`);
const engine=global.window.PamClassic20Q;
if(!engine||engine.N!==1775||engine.F!==156)throw new Error('Could not initialise Pam engine for redundancy audit');

const games=[];
const consecutiveQuestionPairs=new Map();
const closeQuestionPairs=new Map();
const repeatedFamilyPairs=new Map();
const hardPairOccurrences=new Map();
const nearVectorOccurrences=new Map();
const familyGapHistogram=new Map();
const hardGapHistogram=new Map();
const vectorGapHistogram=new Map();
const implicationOccurrenceCounts=new Map();

for(let t=0;t<N;t++){
  const category=targetCategory(t);
  if(category==='unknown')throw new Error(`Target ${t} (${targets[t]}) has no category`);
  const game=engine.createGame();
  let next=engine.setCategory(game,category);
  const seq=[];
  let guess=null;
  let safety=0;
  while(!guess&&safety++<64){
    if(next.kind==='question'){
      const answer=answerForTarget(next.index,t);
      seq.push({q:next.index,answer,turn:seq.length+2});
      next=engine.answer(game,next,answer);
      continue;
    }
    if(next.kind==='hunch'){
      guess=engine.commitGuess(game,next);
      break;
    }
    if(next.kind==='guess'){
      guess=next;
      break;
    }
    throw new Error(`Unexpected Pam action ${next.kind} for ${targets[t]}`);
  }
  if(!guess)throw new Error(`Simulation did not finish for ${targets[t]}`);
  const correct=guess.index===t;

  let familyEvents=0,hardEvents=0,vectorEvents=0,implicationEvents=0;
  let minFamilyGap=null,minHardGap=null,minVectorGap=null;
  const familySeen=new Map();
  for(let i=0;i<seq.length;i++){
    const cur=seq[i];
    if(i>0)increment(consecutiveQuestionPairs,orderedKey(seq[i-1].q,cur.q));
    for(let j=Math.max(0,i-5);j<i;j++)increment(closeQuestionPairs,pairKey(seq[j].q,cur.q));

    for(const family of familyByQuestion[cur.q]){
      if(familySeen.has(family)){
        const prior=familySeen.get(family);
        const gap=i-prior.index;
        familyEvents++;
        minFamilyGap=minFamilyGap==null?gap:Math.min(minFamilyGap,gap);
        increment(familyGapHistogram,String(gap));
        increment(repeatedFamilyPairs,`${family}|${pairKey(prior.q,cur.q)}`);
      }
      familySeen.set(family,{index:i,q:cur.q});
    }

    for(let j=0;j<i;j++){
      const key=pairKey(seq[j].q,cur.q),gap=i-j;
      if(hardTwinPairs.has(key)){
        hardEvents++;
        minHardGap=minHardGap==null?gap:Math.min(minHardGap,gap);
        increment(hardGapHistogram,String(gap));
        increment(hardPairOccurrences,key);
      }
      if(nearVectorPairSet.has(key)){
        vectorEvents++;
        minVectorGap=minVectorGap==null?gap:Math.min(minVectorGap,gap);
        increment(vectorGapHistogram,String(gap));
        increment(nearVectorOccurrences,key);
      }
    }

    const curBinary=binaryAnswer(cur.answer);
    if(curBinary){
      for(const [r,rule] of EXPECTED_IMPLICATIONS.entries()){
        if(rule.from!==cur.q||rule.answer!==curBinary)continue;
        for(let k=i+1;k<seq.length;k++){
          if(seq[k].q!==rule.to)continue;
          implicationEvents++;
          increment(implicationOccurrenceCounts,String(r));
          break;
        }
      }
    }
  }

  games.push({
    targetIndex:t,target:targets[t],category,cohort:targetCohort(t),correct,guessIndex:guess.index,guess:guess.label,
    traitQuestions:seq.length,totalPrompts:seq.length+1,reason:guess.reason,
    familyEvents,hardEvents,vectorEvents,implicationEvents,minFamilyGap,minHardGap,minVectorGap,
    sequence:seq.map(x=>x.q)
  });
}
if(priorWindow===undefined)delete global.window;else global.window=priorWindow;

const traitCounts=games.map(g=>g.traitQuestions);
const promptCounts=games.map(g=>g.totalPrompts);
const distribution=new Map();
for(const g of games)increment(distribution,String(g.totalPrompts));
const accuracy=games.filter(g=>g.correct).length/games.length;

function groupMetrics(keyFn){
  const groups=new Map();
  for(const game of games){
    const key=keyFn(game);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(game);
  }
  return Object.fromEntries([...groups.entries()].map(([key,list])=>{
    const counts=list.map(x=>x.totalPrompts);
    return[key,{
      games:list.length,accuracy:pct(list.filter(x=>x.correct).length/list.length),
      averagePrompts:round(counts.reduce((a,b)=>a+b,0)/counts.length,3),medianPrompts:median(counts),
      gamesWithFamilyRepeat:pct(list.filter(x=>x.familyEvents>0).length/list.length),
      familyEventsPerGame:round(list.reduce((s,x)=>s+x.familyEvents,0)/list.length,3),
      hardViolations:list.reduce((s,x)=>s+x.hardEvents,0),
      implicationViolations:list.reduce((s,x)=>s+x.implicationEvents,0),
      nearVectorEventsPerGame:round(list.reduce((s,x)=>s+x.vectorEvents,0)/list.length,3)
    }];
  }));
}

const familyEventTotal=games.reduce((s,g)=>s+g.familyEvents,0);
const hardEventTotal=games.reduce((s,g)=>s+g.hardEvents,0);
const vectorEventTotal=games.reduce((s,g)=>s+g.vectorEvents,0);
const implicationEventTotal=games.reduce((s,g)=>s+g.implicationEvents,0);
const gamesWithFamilyRepeat=games.filter(g=>g.familyEvents>0).length;
const gamesWithHard=games.filter(g=>g.hardEvents>0).length;
const gamesWithVector=games.filter(g=>g.vectorEvents>0).length;

const describeQuestion=q=>({index:q,text:questions[q],families:familyByQuestion[q]});
const vectorTop=nearVectorPairs.slice(0,50).map(x=>({
  ...x,polarityDisagreement:pct(x.polarityDisagreement),coverage:pct(x.coverage),stateDisagreement:pct(x.stateDisagreement),
  questionA:questions[x.a],questionB:questions[x.b]
}));
const implicationExpected=expectedImplicationStats.map(x=>({
  ...x,violationRate:pct(x.violationRate),fromText:questions[x.from],toText:questions[x.to]
}));
const derivedTop=derivedImplications.slice(0,100).map(x=>({
  ...x,violationRate:pct(x.violationRate),fromText:questions[x.from],toText:questions[x.to]
}));
const commonRedundantPairs=topEntries(repeatedFamilyPairs,30).map(([key,count])=>{
  const [family,pair]=key.split('|');
  const [a,b]=pair.split(':').map(Number);
  return{family,a,b,count,questionA:questions[a],questionB:questions[b]};
});
const commonConsecutive=topEntries(consecutiveQuestionPairs,30).map(([key,count])=>{
  const [a,b]=key.split('>').map(Number);
  return{a,b,count,questionA:questions[a],questionB:questions[b]};
});
const hardPairDetails=topEntries(hardPairOccurrences,20).map(([key,count])=>{
  const [a,b]=key.split(':').map(Number);return{a,b,count,questionA:questions[a],questionB:questions[b]};
});
const vectorOccurrenceDetails=topEntries(nearVectorOccurrences,30).map(([key,count])=>{
  const [a,b]=key.split(':').map(Number);
  const vector=nearVectorPairs.find(x=>x.a===a&&x.b===b);
  return{a,b,count,gapClass:'any',disagreement:pct(vector?.polarityDisagreement??1),questionA:questions[a],questionB:questions[b]};
});
const implicationOccurrenceDetails=topEntries(implicationOccurrenceCounts,30).map(([index,count])=>{
  const stat=implicationExpected[Number(index)];return{count,...stat};
});

const baseline={
  generatedAt:new Date().toISOString(),
  baselineCommit:'6ee006258414a8b65a23e2b9785b647a5e6ece3e',
  model:{targets:N,questions:F,baseTargetCount:model.baseTargetCount,extensionCount:model.extensionCount,qualityCount:model.qualityCount},
  simulationPolicy:'truthful matrix answers; commit the first confidence hunch; category prompt included in totalPrompts',
  performance:{
    games:games.length,accuracy:pct(accuracy),correct:games.filter(g=>g.correct).length,
    averageTraitQuestions:round(traitCounts.reduce((a,b)=>a+b,0)/traitCounts.length,3),medianTraitQuestions:median(traitCounts),
    averagePrompts:round(promptCounts.reduce((a,b)=>a+b,0)/promptCounts.length,3),medianPrompts:median(promptCounts),
    p75Prompts:round(quantile(promptCounts,0.75),2),p90Prompts:round(quantile(promptCounts,0.9),2),p95Prompts:round(quantile(promptCounts,0.95),2),maxPrompts:Math.max(...promptCounts),
    questionCountDistribution:Object.fromEntries([...distribution.entries()].sort((a,b)=>Number(a[0])-Number(b[0])))
  },
  redundancy:{
    repeatedSemanticFamilyEvents:familyEventTotal,gamesWithRepeatedSemanticFamily:gamesWithFamilyRepeat,gamesWithRepeatedSemanticFamilyPct:pct(gamesWithFamilyRepeat/games.length),eventsPerGame:round(familyEventTotal/games.length,3),
    hardTwinViolations:hardEventTotal,gamesWithHardTwinViolation:gamesWithHard,gamesWithHardTwinViolationPct:pct(gamesWithHard/games.length),
    expectedImplicationFollowups:implicationEventTotal,
    nearVectorEvents:vectorEventTotal,gamesWithNearVectorEvent:gamesWithVector,gamesWithNearVectorEventPct:pct(gamesWithVector/games.length),eventsPerGameNearVector:round(vectorEventTotal/games.length,3),
    familyGapHistogram:Object.fromEntries([...familyGapHistogram.entries()].sort((a,b)=>Number(a[0])-Number(b[0]))),
    hardGapHistogram:Object.fromEntries([...hardGapHistogram.entries()].sort((a,b)=>Number(a[0])-Number(b[0]))),
    vectorGapHistogram:Object.fromEntries([...vectorGapHistogram.entries()].sort((a,b)=>Number(a[0])-Number(b[0])))
  },
  concentration:{byCategory:groupMetrics(g=>g.category),byCohort:groupMetrics(g=>g.cohort)},
  semanticFamilies:Object.fromEntries(Object.entries(FAMILY_DEFS).map(([name,indexes])=>[name,indexes.map(describeQuestion)])),
  vectorAudit:{thresholdCounts:vectorThresholdCounts,nearPairThreshold:'commonKnown >= 1200 and polarity disagreement <= 3%',topPairs:vectorTop},
  implicationAudit:{expected:implicationExpected,derivedRuleCount:derivedImplications.length,derivedTop},
  occurrences:{commonRedundantPairs,commonConsecutive,hardPairDetails,vectorOccurrenceDetails,implicationOccurrenceDetails},
  games
};

function mdTable(headers,rows){
  const safe=value=>String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');
  return[
    `| ${headers.map(safe).join(' | ')} |`,
    `| ${headers.map(()=> '---').join(' | ')} |`,
    ...rows.map(row=>`| ${row.map(safe).join(' | ')} |`)
  ].join('\n');
}
const md=[];
md.push('# Pam question redundancy baseline');
md.push('');
md.push(`Baseline: \`${baseline.baselineCommit.slice(0,7)}\`  `);
md.push(`Model: ${N.toLocaleString()} targets × ${F} questions  `);
md.push(`Simulation: ${baseline.simulationPolicy}`);
md.push('');
md.push('## Performance');
md.push('');
md.push(mdTable(['Metric','Value'],[
  ['Accuracy',`${baseline.performance.accuracy}% (${baseline.performance.correct}/${N})`],
  ['Average prompts before guess',baseline.performance.averagePrompts],
  ['Median prompts',baseline.performance.medianPrompts],
  ['Average trait questions',baseline.performance.averageTraitQuestions],
  ['Median trait questions',baseline.performance.medianTraitQuestions],
  ['P90 prompts',baseline.performance.p90Prompts],
  ['Max prompts',baseline.performance.maxPrompts]
]));
md.push('');
md.push('## Redundancy');
md.push('');
md.push(mdTable(['Metric','Value'],[
  ['Semantic-family repeat events',familyEventTotal],
  ['Games with semantic-family repeats',`${gamesWithFamilyRepeat}/${N} (${baseline.redundancy.gamesWithRepeatedSemanticFamilyPct}%)`],
  ['Hard twin violations',hardEventTotal],
  ['Games with hard twin violation',`${gamesWithHard}/${N} (${baseline.redundancy.gamesWithHardTwinViolationPct}%)`],
  ['Expected implication follow-ups',implicationEventTotal],
  ['Near-vector pair events',vectorEventTotal],
  ['Games with near-vector event',`${gamesWithVector}/${N} (${baseline.redundancy.gamesWithNearVectorEventPct}%)`]
]));
md.push('');
md.push('## Most common repetitive semantic pairs');
md.push('');
md.push(mdTable(['Family','Count','Gap-independent pair'],commonRedundantPairs.slice(0,20).map(x=>[x.family,x.count,`${x.questionA} / ${x.questionB}`])));
md.push('');
md.push('## Hard twin pairs seen in games');
md.push('');
md.push(mdTable(['Count','Pair'],hardPairDetails.map(x=>[x.count,`${x.questionA} / ${x.questionB}`])));
md.push('');
md.push('## Closest answer-vector pairs');
md.push('');
md.push(mdTable(['Disagreement','Common known','Pair'],vectorTop.slice(0,25).map(x=>[`${x.polarityDisagreement}%`,x.commonKnown,`${x.questionA} / ${x.questionB}`])));
md.push('');
md.push('## Expected logical implications, measured');
md.push('');
md.push(mdTable(['Violation rate','Support','Rule'],implicationExpected.map(x=>[`${x.violationRate}%`,x.support,`${x.fromText} [${x.answer}] -> ${x.toText} [${x.expected}]`])));
md.push('');
md.push('## Repetition concentration by category');
md.push('');
md.push(mdTable(['Category','Games','Accuracy','Avg prompts','Games with family repeat','Family events/game','Hard violations','Implication follow-ups'],
  Object.entries(baseline.concentration.byCategory).map(([key,x])=>[key,x.games,`${x.accuracy}%`,x.averagePrompts,`${x.gamesWithFamilyRepeat}%`,x.familyEventsPerGame,x.hardViolations,x.implicationViolations])));
md.push('');
md.push('## Repetition concentration by target cohort');
md.push('');
md.push(mdTable(['Cohort','Games','Accuracy','Avg prompts','Games with family repeat','Family events/game','Hard violations','Implication follow-ups'],
  Object.entries(baseline.concentration.byCohort).map(([key,x])=>[key,x.games,`${x.accuracy}%`,x.averagePrompts,`${x.gamesWithFamilyRepeat}%`,x.familyEventsPerGame,x.hardViolations,x.implicationViolations])));
md.push('');
md.push('Full per-game sequences, vector analysis, and derived implication candidates are in `baseline.json`.');

await mkdir(outputDir,{recursive:true});
await writeFile(join(outputDir,'baseline.json'),JSON.stringify(baseline,null,2));
await writeFile(join(outputDir,'baseline.md'),md.join('\n'));

const consoleSummary={
  performance:baseline.performance,
  redundancy:baseline.redundancy,
  concentration:baseline.concentration,
  vectorThresholdCounts,
  topRepetitivePairs:commonRedundantPairs.slice(0,15),
  hardPairDetails,
  topVectorPairs:vectorTop.slice(0,20),
  expectedImplications:implicationExpected,
  implicationOccurrences:implicationOccurrenceDetails.slice(0,20),
  topDerivedImplications:derivedTop.slice(0,30)
};
console.log('PAM_REDUNDANCY_BASELINE_START');
console.log(JSON.stringify(consoleSummary,null,2));
console.log('PAM_REDUNDANCY_BASELINE_END');
