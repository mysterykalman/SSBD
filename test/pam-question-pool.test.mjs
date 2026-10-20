import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('Pam considers candidates outside an arbitrary top-96 cut',()=>{
 const N=1200,F=156;
 const weights=Buffer.alloc(N*F,2);
 for(let t=0;t<N;t++){
  // In the first 96 entries q4 looks perfectly balanced, but globally it is not.
  weights[4*N+t]=t<48?3:2;
  // q5 separates the entire tied field into equal halves.
  weights[5*N+t]=t<600?3:2;
 }
 const sandbox={
  window:{PAM_CLASSIC_MODEL:{
   questions:Array.from({length:F},(_,i)=>'Question '+i+'?'),
   targets:Array.from({length:N},(_,i)=>'Target '+i),
   weightsB64:weights.toString('base64')
  }},
  atob:value=>Buffer.from(value,'base64').toString('binary'),
  Float64Array,Uint8Array,Set,Object,Array,Math,Number,String,Boolean
 };
 runInNewContext(readFileSync(new URL('../src/client/mom-mode/engine.js',import.meta.url),'utf8'),sandbox);
 const game=sandbox.window.PamClassic20Q.createGame();
 game.turn=1;
 for(let q=0;q<4;q++)game.asked.add(q);
 const question=sandbox.window.PamClassic20Q.choose(game);
 assert.equal(question.kind,'question');
 assert.equal(question.index,5);
});
