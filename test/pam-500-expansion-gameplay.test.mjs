import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model,loadPamExpandedModel} from '../scripts/pam-quality-model.mjs';

const root=process.cwd();
const qualityPath=join(root,'data','pam20q','quality','quality-500.json');
const doc=JSON.parse(await readFile(qualityPath,'utf8'));
const baseline=await loadPam1775Model(loadPamClassicModel);
const full=await loadPamExpandedModel(loadPamClassicModel);
const count=full.targets.length;
const releaseEnabled=process.env.PAM_ALLOW_UNREVIEWED_500==='1'||doc.review_status==='approved';
if(!releaseEnabled){
 test('unapproved Pam 500 candidates are excluded from default gameplay testing',{skip:'Candidate profiles require controlled opt-in or approval'},()=>{});
}else{
assert.equal(count,2275,'500-target file MUST be integrated in complete runtime model');
assert.equal(doc.count,500);
assert.equal(doc.profiles.length,500);

function response(model,q,t){
 const index=q*model.targets.length+t;
 if(model.knownMask&&model.knownMask[index]!==1)return'unknown';
 const state=model.weights[index];
 return (state&1)?((state&2)?'yes':'probably'):((state&2)?'no':'doubtful');
}
function category(model,t){
 for(let q=0;q<4;q++)if(model.weights[q*model.targets.length+t]&1)return['animal','vegetable','mineral','other'][q];
 throw new Error('Target lacks category: '+model.targets[t]);
}
async function engine(model,tag){
 global.window={PAM_CLASSIC_MODEL:{questions:model.questions,targets:model.targets,weightsB64:model.weights.toString('base64'),knownMaskB64:model.knownMask?.toString('base64'),layout:'question-major',states:4}};
 if(!global.atob)global.atob=value=>Buffer.from(value,'base64').toString('binary');
 await import(pathToFileURL(join(root,'src','client','mom-mode','engine.js')).href+'?'+tag+'='+Date.now());
 return window.PamClassic20Q;
}
function simulate(api,model,index,softened=false){
 const game=api.createGame({budget:20,minGuessQuestions:7});
 let step=api.setCategory(game,category(model,index));
 let yesSoftened=false,noSoftened=false,questionCount=0;
 for(let guard=0;guard<50;guard++){
  if(step.kind==='question'){
   let answer=response(model,step.index,index);
   if(softened&&answer==='yes'&&!yesSoftened){answer='probably';yesSoftened=true;}
   else if(softened&&answer==='no'&&!noSoftened){answer='doubtful';noSoftened=true;}
   questionCount++;step=api.answer(game,step,answer);
  }else if(step.kind==='hunch'){
   step=step.index===index?api.commitGuess(game,step):api.deferGuess(game,step);
  }else if(step.kind==='guess'){
   return{right:step.index===index,guess:step.label,yesSoftened,noSoftened,questionCount};
  }else throw new Error('Unexpected Pam state: '+step.kind);
 }
 throw new Error('No final Pam guess: '+model.targets[index]);
}
const legacyEngine=await engine(baseline,'legacy');
const newEngine=await engine(full,'expanded');

test('new names are unique, category valid and every profile has defensible known evidence',()=>{
 const all=new Set();
 for(const p of doc.profiles){
  const key=p.name.trim().toLowerCase();
  assert.ok(!all.has(key),'Duplicate in new batch: '+p.name);all.add(key);
  assert.ok(['animal','vegetable','mineral','other'].includes(p.category));
  assert.ok(p.yes.length>=2,'Too little positive evidence: '+p.name);
  assert.ok(p.no.length>=2,'Too little negative evidence: '+p.name);
  assert.ok(p.yes.length+p.weakYes.length+p.no.length>=9,'Too few known traits: '+p.name);
 }
 assert.deepEqual(full.targets.slice(1775),doc.profiles.map(x=>x.name));
 assert.equal(new Set(full.targets.map(x=>x.trim().toLowerCase())).size,2275);
});

test('500 new targets pass exact and independently softened oracle play, with no false positives',()=>{
 const exactFailures=[],softFailures=[],noiseMissing=[];
 for(let index=1775;index<count;index++){
  const exact=simulate(newEngine,full,index,false);
  const soft=simulate(newEngine,full,index,true);
  if(!exact.right)exactFailures.push({target:full.targets[index],guess:exact.guess});
  if(!soft.right)softFailures.push({target:full.targets[index],guess:soft.guess});
  if(!soft.yesSoftened||!soft.noSoftened)noiseMissing.push(full.targets[index]);
 }
 console.log('PAM_500_EXACT='+String(500-exactFailures.length)+'/500');
 console.log('PAM_500_SOFTENED='+String(500-softFailures.length)+'/500');
 console.log('PAM_500_SOFTENED_COVERAGE='+String(500-noiseMissing.length)+'/500');
 if(exactFailures.length)console.log('PAM_500_EXACT_MISSES='+JSON.stringify(exactFailures));
 if(softFailures.length)console.log('PAM_500_SOFTENED_MISSES='+JSON.stringify(softFailures));
 if(noiseMissing.length)console.log('PAM_500_NOISE_NOT_EXERCISED='+JSON.stringify(noiseMissing));
 assert.equal(exactFailures.length,0,'Every new target must be guessed correctly with exact answers');
 assert.equal(softFailures.length,0,'Every new target must survive one softened yes and no');
 assert.equal(noiseMissing.length,0,'Both softened response types must be exercised');
});

test('500 additional targets introduce no correctness regressions across the original 1775',()=>{
 const regressions=[],changed=[];
 for(let index=0;index<1775;index++){
  const old=simulate(legacyEngine,baseline,index);
  const updated=simulate(newEngine,full,index);
  if(old.guess!==updated.guess)changed.push({target:baseline.targets[index],before:old.guess,after:updated.guess});
  if(old.right&&!updated.right)regressions.push({target:baseline.targets[index],after:updated.guess});
 }
 console.log('PAM_500_EXISTING_CHANGED='+changed.length+'/1775');
 console.log('PAM_500_EXISTING_REGRESSIONS='+regressions.length+'/1775');
 if(regressions.length)console.log('PAM_500_EXISTING_REGRESSION_DETAILS='+JSON.stringify(regressions));
 assert.equal(regressions.length,0,'Existing target accuracy must not regress');
});

}
