// Real Pam-engine oracle screen for EACH separately compiled 2000-pool lead.
// This checks whether a word can be guessed even BEFORE 500 additional names
// compete with it. It is a gate, not a magic source of verified factual traits.
import {readFile,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createContext,runInContext} from 'node:vm';
import {loadPamClassicModel,pamTraitIndex} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const dir=join(root,'.dev-data','pam-2000');
const candidates=JSON.parse(await readFile(join(dir,'compiled-candidates.json'),'utf8'));
const baseline=await loadPam1775Model(loadPamClassicModel);
const engineSource=await readFile(join(root,'src','client','mom-mode','engine.js'),'utf8');
const code=engineSource.replace('![1200,1400,1775,2275].includes(N)','!(N>=1775&&N<=2275)');
if(code===engineSource)throw Error('Cannot safely enable test-only cohort size for Pam');
const categories=['animal','vegetable','mineral','other'];
const F=baseline.questions.length,B=baseline.targets.length;
function makeModel(p){
 const N=B+1,weights=Buffer.alloc(N*F),known=Buffer.alloc(N*F);
 for(let q=0;q<F;q++){
  baseline.weights.copy(weights,q*N,q*B,(q+1)*B);
  baseline.knownMask.copy(known,q*N,q*B,(q+1)*B);
 }
 const ix=categories.indexOf(p.category);if(ix<0)throw Error('Invalid category '+p.category);
 for(let q=0;q<4;q++){weights[q*N+B]=q===ix?3:2;known[q*N+B]=1;}
 const set=(terms,state)=>{
  for(const t of terms){
   const q=pamTraitIndex[t];
   if(q==null)throw Error('Missing question trait '+t+' for '+p.name);
   const off=q*N+B;
   if(known[off])throw Error('Contradictory answer '+t+' for '+p.name);
   weights[off]=state;known[off]=1;
  }
 };
 set(p.yes,3);set(p.weakYes,1);set(p.no,2);
 return{N,weights,known};
}
function createEngine(model){
 const sandbox={window:{PAM_CLASSIC_MODEL:{
  questions:baseline.questions,targets:[...baseline.targets,model.name],
  weightsB64:model.weights.toString('base64'),
  knownMaskB64:model.known.toString('base64')
 }},atob:x=>Buffer.from(x,'base64').toString('binary')};
 createContext(sandbox);runInContext(code,sandbox,{timeout:18000});
 return sandbox.window.PamClassic20Q;
}
function runGame(api,m,category,softened=false){
 const game=api.createGame({budget:20,minGuessQuestions:7});
 let step=api.setCategory(game,category),yesSoftened=false,noSoftened=false;
 for(let guard=0;guard<50;guard++){
  if(step.kind==='question'){
   const off=step.index*m.N+B;
   let answer;
   if(m.known[off]!==1)answer='unknown';
   else{
    const state=m.weights[off];
    answer=(state&1)?((state&2)?'yes':'probably'):((state&2)?'no':'doubtful');
   }
   if(softened&&answer==='yes'&&!yesSoftened){answer='probably';yesSoftened=true;}
   else if(softened&&answer==='no'&&!noSoftened){answer='doubtful';noSoftened=true;}
   step=api.answer(game,step,answer);
  }else if(step.kind==='hunch'){
   step=step.index===B?api.commitGuess(game,step):api.deferGuess(game,step);
  }else if(step.kind==='guess'){
   return{correct:step.index===B,guess:step.label,yesSoftened,noSoftened,questionsAsked:game.turn};
  }else throw Error('Unexpected Pam step '+step.kind);
 }
 throw Error('No guess after 50 steps for '+m.name);
}
const report=[],eligibleNames=[];
const byCategory={},byOrigin={};
let elapsed=0;
for(const row of candidates.profiles){
 const {profile:p,origin,kind,baselineDistance}=row;
 const stat={name:p.name,category:p.category,origin,kind,baselineDistance,
  yesCount:p.yes.length,knownCount:p.yes.length+p.weakYes.length+p.no.length,
  exact:false,softened:false,softenedCoverage:false,eligible:false};
 if(baselineDistance>0){
  const m=makeModel(p);m.name=p.name;
  const api=createEngine(m);
  const exact=runGame(api,m,p.category,false),soft=runGame(api,m,p.category,true);
  stat.exact=exact.correct;stat.softened=soft.correct;
  stat.softenedCoverage=soft.yesSoftened&&soft.noSoftened;
  stat.exactGuess=exact.guess;stat.softGuess=soft.guess;
  stat.questionsAsked=exact.questionsAsked;
  stat.eligible=exact.correct&&soft.correct&&stat.softenedCoverage;
  if(stat.eligible)eligibleNames.push(p.name);
 }
 report.push(stat);
 for(const [ledger,key] of [[byCategory,p.category],[byOrigin,origin]]){
  const rec=ledger[key]||{total:0,exact:0,softened:0,eligible:0};
  rec.total++;rec.exact+=Number(stat.exact);rec.softened+=Number(stat.softened);rec.eligible+=Number(stat.eligible);
  ledger[key]=rec;
 }
 elapsed++;
 if(elapsed%100===0)console.log('PAM_2000_SOLO_PROGRESS='+elapsed+'/'+candidates.profiles.length+' eligible='+eligibleNames.length);
}
const summary={poolCandidates:candidates.sourcePoolCount,
 distinctProfiles:candidates.profiles.length,totalReviewed:report.length,
 exact:report.filter(x=>x.exact).length,softened:report.filter(x=>x.softened).length,
 passesBoth:report.filter(x=>x.exact&&x.softened).length,
 eligible:eligibleNames.length,
 excluded:report.length-eligibleNames.length,
 byCategory,byOrigin,coverage:'one softened yes and one softened no must both be exercised',
 status:eligibleNames.length>=500?'minimum_500_solo_eligible':'insufficient_individually_playable_profiles'};
const doc={...summary,eligibleNames,entries:report};
await writeFile(join(dir,'solo-gameplay.json'),JSON.stringify(doc,null,2)+'\n');
console.log('PAM_2000_SOLO_SUMMARY='+JSON.stringify(summary));
if(eligibleNames.length<500)throw Error('Insufficient individually playable profiles: '+eligibleNames.length+' <500; factual enrichment/new taxonomy required');
