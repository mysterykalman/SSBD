import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model} from '../scripts/pam-quality-model.mjs';
const base=await loadPam1775Model(loadPamClassicModel);
const N=3127,EXTRA=1352,NEW_Q=20,F=156+NEW_Q;
function fixture(){
 const weights=Buffer.alloc(N*F),known=Buffer.alloc(N*F);
 for(let q=0;q<156;q++){
  const offset=q*N;
  base.weights.copy(weights,offset,q*1775,(q+1)*1775);
  base.knownMask.copy(known,offset,q*1775,(q+1)*1775);
 }
 for(let q=0;q<NEW_Q;q++){
  for(let i=0;i<EXTRA;i++){
   const cell=(q+156)*N+1775+i;
   weights[cell]=i&(1<<q)?3:2;known[cell]=1;
  }
 }
 return{questions:[...base.questions,...Array.from({length:NEW_Q},(_,i)=>'Does the test fixture have synthetic attribute '+i+'?')],
  targets:[...base.targets,...Array.from({length:EXTRA},(_,i)=>'TEST SUBJECT '+i)],
  weightsB64:weights.toString('base64'),knownMaskB64:known.toString('base64'),
  expansionReviewed:true,openingCategories:[
   ...Array.from({length:1775},()=>null),
   ...Array.from({length:EXTRA},()=>['entertainment'])]};
}
test('full 3127-target fixture loads into real browser engine without mutating original 1775',async()=>{
 const ctx={console,atob:s=>Buffer.from(s,'base64').toString('binary')};ctx.window=ctx;
 ctx.PAM_CLASSIC_MODEL=fixture();
 vm.createContext(ctx);
 vm.runInContext(await readFile(new URL('../src/client/mom-mode/engine.js',import.meta.url),'utf8'),ctx);
 const engine=ctx.PamClassic20Q;
 assert.equal(engine.N,3127);assert.equal(engine.F,176);
 assert.deepEqual(Array.from(engine.TARGETS.slice(0,1775)),base.targets);
 const game=engine.createGame({budget:20});
 let action=engine.setOpeningCategory(game,'entertainment');
 let count=0,sawNewQuestion=false;
 for(let steps=0;steps<21;steps++){
  if(action.kind==='hunch')action=engine.commitGuess(game,action);
  if(action.kind==='guess'){const result=engine.confirm(game,action,false);assert.equal(result.turns<=20,true);break;}
  assert.equal(action.kind,'question');
  if(action.index>=156)sawNewQuestion=true;
  action=engine.answer(game,action,'unknown');
  count++;
 }
 assert.equal(sawNewQuestion,true,'future reviewed questions must be accessible to question selector');
 assert(count<=19);
});
test('engine refuses an unapproved 3127-target fixture',async()=>{
 const ctx={console,atob:s=>Buffer.from(s,'base64').toString('binary')};ctx.window=ctx;
 const obj=fixture();obj.expansionReviewed=false;ctx.PAM_CLASSIC_MODEL=obj;
 const source=await readFile(new URL('../src/client/mom-mode/engine.js',import.meta.url),'utf8');
 vm.createContext(ctx);
 assert.throws(()=>vm.runInContext(source,ctx),/Unexpected Pam classic model shape/);
});
