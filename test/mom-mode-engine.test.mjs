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

test("truthful self-play reaches representative known concepts within 20 questions",async()=>{
 const e=await load();
 const sample=[...new Set(Array.from({length:24},(_,n)=>Math.round(n*(e.N-1)/23)))];
 for(const i of sample){
  const r=e.selfPlay(i);
  assert.equal(r.won,true,`${e.OBJECTS[i].name} was not solved`);
  assert.ok(r.turns<=20,`${e.OBJECTS[i].name} took ${r.turns} turns`);
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

test("a wrong guess costs a turn but does not immediately end the game",async()=>{
 const e=await load();
 const g=e.createGame({budget:20,guessThreshold:0});
 const q=e.choose(g);
 assert.equal(q.kind,"guess");
 const r=e.confirm(g,q,false);
 assert.equal(r.done,false);
 assert.equal(g.status,"playing");
 assert.equal(g.turn,1);
 assert.ok(r.next);
});
