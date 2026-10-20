/**
 * Deterministic 1775-target PRE-EXPANSION Pam oracle baseline.
 * Run: node scripts/pam-1775-oracle-report.mjs --sample=96
 * Run all originals: node scripts/pam-1775-oracle-report.mjs --full
 * The output is synthetic and must not be described as human-player accuracy.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {loadCurrentPam,oracleAnswer} from '../test/support/pam-current-engine.mjs';

const fixture=await loadCurrentPam();
const {engine,model}=fixture;
const count=model.targets.length;
const requested=process.argv.includes('--full')?count:
 Number(process.argv.find(a=>a.startsWith('--sample='))?.split('=')[1]||96);
if(!Number.isInteger(requested)||requested<1||requested>count)
 throw Error('Expected --sample=1..'+count+' or --full');
const indices=[...new Set(Array.from({length:requested},(_,i)=>
 Math.round((i+.5)*count/requested-.5)))];
const modes=['exact','soft_yes','soft_no','one_unknown','mixed','wrong_opening'];
const cohortFor=i=>i<1200?'original_1200':i<1400?'extension_200':'quality_375';
const quantile=(rows,p)=>{
 if(!rows.length)return null;
 const sorted=[...rows].sort((a,b)=>a-b);
 return Number(sorted[Math.ceil(p*sorted.length)-1].toFixed(2));
};
const ms=[];
function run(i,mode){
 const g=engine.createGame({budget:20,minGuessQuestions:7});
 const animal=(model.weights[i]&1)===1;
 const plant=(model.weights[count+i]&1)===1;
 let opener=animal||plant?'animal_plant':'other';
 if(mode==='wrong_opening')opener=opener==='animal_plant'?'object':'animal_plant';
 let action=engine.setOpeningCategory(g,opener);
 const seen=new Set();
 let modifications=0,yesChanged=false,noChanged=false,unknownChanged=false;
 for(let guard=0;guard<24;guard++){
  if(action.kind==='hunch')action=engine.commitGuess(g,action);
  if(action.kind==='guess'){
   const right=action.index===i;
   engine.confirm(g,action,right);
   return{
    target:i,name:model.targets[i],cohort:cohortFor(i),mode,
    applied:mode==='exact'||mode==='wrong_opening'||modifications>0,
    modifications,correct:right,guess:action.label,turns:g.turn,
    usedQuestions:seen.size,violations:0
   };
  }
  if(action.kind!=='question')throw Error('Unexpected decision '+action.kind+' for '+i);
  if(seen.has(action.index))throw Error('Repeated question '+action.index+' for '+i);
  seen.add(action.index);
  const base=oracleAnswer(model,i,action.index);
  let response=base;
  if(mode==='soft_yes'&&base==='yes'&&!yesChanged){
   response='probably';yesChanged=true;modifications++;
  }else if(mode==='soft_no'&&base==='no'&&!noChanged){
   response='doubtful';noChanged=true;modifications++;
  }else if(mode==='one_unknown'&&base!=='unknown'&&!unknownChanged){
   response='unknown';unknownChanged=true;modifications++;
  }else if(mode==='mixed'){
   if(base==='yes'&&!yesChanged){response='maybe';yesChanged=true;modifications++;}
   else if(base==='no'&&!noChanged){response='doubtful';noChanged=true;modifications++;}
   else if(!unknownChanged&&base!=='unknown'){response='unknown';unknownChanged=true;modifications++;}
  }
  const start=performance.now();
  action=engine.answer(g,action,response);
  ms.push(performance.now()-start);
  if(g.turn>20)throw Error('Turn-limit overrun for '+i);
 }
 throw Error('Non-terminating game for '+i);
}
const trials=[];
for(const i of indices)for(const mode of modes)trials.push(run(i,mode));
const summarise=rows=>{
 const applicable=rows.filter(r=>r.applied);
 const correct=applicable.filter(r=>r.correct);
 return{
  attempted:rows.length,applicable:applicable.length,
  correct:correct.length,incorrect:applicable.length-correct.length,
  accuracy:applicable.length?Number((correct.length/applicable.length).toFixed(4)):null,
  turns_p50:quantile(applicable.map(r=>r.turns),.5),
  turns_p95:quantile(applicable.map(r=>r.turns),.95)
 };
};
const byMode=Object.fromEntries(modes.map(mode=>[mode,summarise(trials.filter(t=>t.mode===mode))]));
const byCohort=Object.fromEntries(
 ['original_1200','extension_200','quality_375'].map(c=>[c,
  Object.fromEntries(modes.map(mode=>[mode,summarise(trials.filter(t=>t.mode===mode&&t.cohort===c))]))]));
const report={
 version:1,type:'synthetic_pre_expansion_oracle',sourceModel:'pam-1775',
 reproducibility:{originalTargets:count,questions:model.questions.length,sampleSize:indices.length,
  indexSelection:'evenly_spaced_with_midpoints',scenarios:modes},
 status:'NOT_A_3425_RELEASE_VALIDATION',
 byMode,byCohort,
 selectionLatencyMs:{p50:quantile(ms,.5),p95:quantile(ms,.95),samples:ms.length},
 trials
};
await mkdir('.dev-data/pam-baseline',{recursive:true});
await writeFile('.dev-data/pam-baseline/oracle.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,trials:undefined},null,2));
console.log('Report: .dev-data/pam-baseline/oracle.json');
