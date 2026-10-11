import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

async function load(){
 const ctx={globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);
 for(const file of ["src/client/mom-mode/knowledge.js","src/client/mom-mode/engine.js"]){vm.runInContext(await readFile(file,"utf8"),ctx,{filename:file});}
 return ctx.MomBayes;
}

test("Mom Mode knowledge is broad and distinguishable",async()=>{
 const e=await load();assert.ok(e.N>=150);assert.ok(e.F>=80);
 const vectors=new Set;
 for(let i=0;i<e.N;i++){
  let key="";for(let f=0;f<e.F;f++)key+=e.truth[i*e.F+f]+",";
  assert.ok(!vectors.has(key),`duplicate feature vector: ${e.OBJECTS[i].name}`);vectors.add(key);
 }
});

test("truthful self-play always resolves within the 20-question limit",async()=>{
 const e=await load();
 const sample=[...new Set(Array.from({length:24},(_,n)=>Math.round(n*(e.N-1)/23)))];
 for(const i of sample){
  const r=e.selfPlay(i);
  assert.ok(r.turns<=20,`${e.OBJECTS[i].name} took ${r.turns} questions`);
  assert.equal(typeof r.score,"number");
  if(r.stumped)assert.equal(r.guess,null);
 }
});

test("person answers suppress object-style questions such as man-made",async()=>{
 const e=await load();
 const g=e.createGame();
 const personIndex=e.FEATURES.findIndex(f=>f.id==="person");
 const manmadeIndex=e.FEATURES.findIndex(f=>f.id==="manmade");
 g.answers.set("person","yes");
 assert.equal(e.questionAllowed(g,manmadeIndex),false);
 assert.equal(e.questionAllowed(g,personIndex),true);
});

test("Pam cannot guess before five questions even at extreme confidence",async()=>{
 const e=await load();
 const g=e.createGame({guessThreshold:0});
 g.belief.fill(0);g.belief[0]=0.99;g.belief[1]=0.01;
 g.turn=4;
 assert.equal(e.guessReason(g),null);
 g.turn=5;
 assert.equal(e.guessReason(g)?.reason,"confidence");
});

test("logical certainty forces a guess once the minimum question count is reached",async()=>{
 const e=await load();
 const g=e.createGame();
 const target=0;g.turn=5;
 for(let f=0;f<e.F;f++)g.answers.set(e.FEATURES[f].id,e.truth[target*e.F+f]===1?"yes":"no");
 const viable=e.viableCandidates(g);
 assert.deepEqual(Array.from(viable),[target]);
 const reason=e.guessReason(g);
 assert.equal(reason.reason,"logical");
 assert.equal(reason.index,target);
});

test("a strong hunch lets the player force a guess or buy another question",async()=>{
 const e=await load();
 const g=e.createGame({guessThreshold:0.9,minGuessQuestions:5,continuePrice:2});
 g.belief.fill(0);g.belief[0]=0.96;g.belief[1]=0.04;g.turn=5;
 const h=e.choose(g);
 assert.equal(h.kind,"hunch");
 assert.equal(h.continuePrice,2);
 const continued=e.deferGuess(g,h);
 assert.equal(g.continueCost,2);
 assert.equal(continued.kind,"question");
 const g2=e.createGame({guessThreshold:0.9,minGuessQuestions:5});
 g2.belief.fill(0);g2.belief[0]=0.96;g2.belief[1]=0.04;g2.turn=5;
 const h2=e.choose(g2);const guess=e.commitGuess(g2,h2);
 assert.equal(guess.kind,"guess");
 assert.equal(guess.index,0);
});

test("Pam gets exactly one guess and a wrong guess ends the round",async()=>{
 const e=await load();
 const g=e.createGame();g.turn=8;
 const q={kind:"guess",index:0,label:e.OBJECTS[0].name,text:"Guess?",reason:"confidence"};
 const r=e.confirm(g,q,false);
 assert.equal(r.done,true);
 assert.equal(g.status,"lost");
 assert.equal(g.guessUsed,true);
 assert.throws(()=>e.confirm(g,q,false),/game finished|guess already used/);
});

test("continuing costs round points and 20 questions without a guess is a stump",async()=>{
 const e=await load();
 assert.equal(e.scoreFor(12,false,false,0),22);
 assert.equal(e.scoreFor(12,false,false,4),18);
 assert.equal(e.scoreFor(12,true,false,4),8);
 const g=e.createGame();g.turn=20;g.continueCost=4;
 const result=e.choose(g);
 assert.equal(result.kind,"stumped");
 assert.equal(result.score,26);
});
