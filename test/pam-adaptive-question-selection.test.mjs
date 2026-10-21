import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const N=1200,F=156;
const questions=Array.from({length:F},(_,i)=>'Question '+i);
const targets=Array.from({length:N},(_,i)=>'Answer '+i);
const weights=Buffer.alloc(N*F,2);
const knownMask=Buffer.alloc(N*F,0);
function put(q,t,yes){weights[q*N+t]=yes?3:2;knownMask[q*N+t]=1;}
// Every candidate has a reliable, balanced primary question.
for(let t=0;t<N;t++)put(5,t,t<600);
// Question 4 superficially separates two answers but tells us nothing
// about the other 1198. Unknown values must not earn split credit.
put(4,0,true);put(4,600,false);
// Another question makes a lopsided split across the entire set.
for(let t=0;t<N;t++)put(6,t,t<30);
for(let q=0;q<4;q++)for(let t=0;t<N;t++)put(q,t,q===3);

globalThis.window={PAM_CLASSIC_MODEL:{
 questions,targets,weightsB64:weights.toString('base64'),
 knownMaskB64:knownMask.toString('base64'),
 layout:'question-major',states:4
}};
globalThis.atob=value=>Buffer.from(value,'base64').toString('binary');
await import(pathToFileURL(resolve('src/client/mom-mode/engine.js')).href+'?adaptive-split-test=1');
const Engine=window.PamClassic20Q;

test('prefer meaningful, high-coverage splits over unknown-heavy apparent splits',()=>{
 const game=Engine.createGame({budget:20,minGuessQuestions:7});
 assert.equal(Engine.choose(game).kind,'category');
 const next=Engine.setCategory(game,'other');
 assert.equal(next.kind,'question');
 assert.equal(next.index,5);
});

test('do not ask a question twice after its answer is supplied',()=>{
 const game=Engine.createGame({budget:20,minGuessQuestions:7});
 let next=Engine.setCategory(game,'other');
 assert.equal(next.index,5);
 next=Engine.answer(game,next,'yes');
 assert.notEqual(next.kind==='question'?next.index:-1,5);
});
