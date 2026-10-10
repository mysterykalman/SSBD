import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

async function load(){
 const ctx={globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);
 for(const file of ["src/client/mom-mode/knowledge.generated.js","src/client/mom-mode/knowledge.js","src/client/mom-mode/engine.js"]){
  vm.runInContext(await readFile(file,"utf8"),ctx,{filename:file});
 }
 return ctx.MomBayes;
}

test("Mom Mode knowledge is broad, merged, and gated",async()=>{
 const e=await load();
 assert.ok(e.N>=350,`expected at least 350 concepts, got ${e.N}`);
 assert.ok(e.F>=200,`expected at least 200 traits, got ${e.F}`);
 assert.ok(e.OBJECTS.some(o=>o.name==="Taylor Swift"),"missing notable-person seed");
 assert.ok(e.OBJECTS.some(o=>o.name==="Mickey Mouse"),"missing fictional-character seed");
 assert.ok(e.OBJECTS.some(o=>o.name==="Eiffel Tower"),"missing landmark seed");
 const birth=e.FEATURES.find(f=>f.id==="bornBefore_1985");
 assert.equal(birth?.requires,"specificPerson");
 const character=e.FEATURES.find(f=>f.id==="superhero");
 assert.equal(character?.requires,"fictional");
});

test("wrong guesses cost a turn, remove the candidate, and can end in a player win",async()=>{
 const e=await load();
 const g=e.createGame({budget:2,guessThreshold:1});
 g.turn=1;
 const q=e.choose(g);
 assert.equal(q.kind,"guess");
 const rejected=q.index;
 const result=e.rejectGuess(g,q);
 assert.equal(g.wrongGuesses,1);
 assert.equal(g.rejected.has(rejected),true);
 assert.equal(g.turn,2);
 assert.equal(result.kind,"result");
 assert.equal(result.winner,"player");
 assert.equal(result.reason,"stumped");
});

test("a correct guess still ends immediately with a Pam win",async()=>{
 const e=await load();
 const secret=e.OBJECTS.findIndex(o=>o.name==="Taylor Swift");
 assert.notEqual(secret,-1);
 const g=e.createGame();
 const result=e.acceptGuess(g,{kind:"guess",index:secret,label:"Taylor Swift",text:"Are you thinking of Taylor Swift?"});
 assert.equal(result.kind,"result");
 assert.equal(result.winner,"pam");
 assert.equal(result.correct,true);
 assert.equal(g.status,"won");
});

test("truthful self-play remains capable on representative common concepts",async()=>{
 const e=await load();
 const names=["Dog","Pizza","Smartphone","Taylor Swift","Michael Jordan","Albert Einstein","Mickey Mouse","Batman","Eiffel Tower","Niagara Falls"];
 const present=names.map(name=>[name,e.OBJECTS.findIndex(o=>o.name===name)]).filter(([,i])=>i>=0);
 assert.ok(present.length>=8);
 let wins=0;
 for(const [name,i] of present){
  const r=e.selfPlay(i);
  if(r.winner==="pam")wins++;
  assert.ok(r.turns<=20,`${name} exceeded the turn budget`);
 }
 assert.ok(wins>=Math.ceil(present.length*0.7),`Pam solved only ${wins}/${present.length} representative concepts`);
});
