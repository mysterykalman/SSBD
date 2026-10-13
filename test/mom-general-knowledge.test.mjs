import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

async function load(){
 const ctx={globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);
 for(const file of [
  "src/client/mom-mode/knowledge.generated.js",
  "src/client/mom-mode/knowledge.general.js",
  "src/client/mom-mode/knowledge.js",
  "src/client/mom-mode/engine.js"
 ]) vm.runInContext(await readFile(file,"utf8"),ctx,{filename:file});
 return ctx.MomBayes;
}

function traceSecret(e,name){
 const secret=e.OBJECTS.findIndex(o=>o.name===name);
 assert.notEqual(secret,-1,`missing ${name}`);
 const game=e.createGame();
 const questionIds=[];
 const guesses=[];
 let q=e.choose(game);
 while(game.status==="playing"){
  if(q.kind==="hunch") q=e.commitGuess(game,q);
  if(q.kind==="guess"){
   guesses.push(q.label);
   const correct=q.index===secret;
   const confirmed=e.confirm(game,q,correct);
   return {result:{kind:"result",winner:correct?"pam":"player",turns:game.turn,guess:q.label,score:confirmed.score},questionIds,guesses};
  }
  if(q.kind==="stumped") return {result:{kind:"result",winner:"player",turns:game.turn,guess:e.top(game)?.object?.name||null,stumped:true},questionIds,guesses};
  assert.equal(q.kind,"question",`unexpected Mom action: ${q.kind}`);
  questionIds.push(q.id);
  q=e.answer(game,q,e.oracle(secret,q));
 }
 return {result:{kind:"result",winner:game.status==="won"?"pam":"player",turns:game.turn,guess:e.top(game)?.object?.name||null},questionIds,guesses};
}

const benchmarks=[
 "Venus de Milo","Mona Lisa","Statue of Liberty","Colosseum","Hamlet",
 "1984","Star Wars","Toy Story","Photosynthesis","Gravity","Apollo 11 moon landing",
 "World War II","Zeus","Nintendo Switch","iPhone","Beethoven's Fifth Symphony"
];

test("Mom has broad category-based general knowledge",async()=>{
 const e=await load();
 assert.ok(e.meta.generalObjects>=90,`expected at least 90 general-knowledge anchors, got ${e.meta.generalObjects}`);
 for(const name of benchmarks) assert.ok(e.OBJECTS.some(o=>o.name===name),`missing benchmark concept: ${name}`);
 for(const trait of ["gk_artwork","gk_sculpture","gk_book","gk_film","gk_science","gk_event","gk_product"])
  assert.ok(e.FEATURES.some(f=>f.id===trait),`missing general-knowledge trait: ${trait}`);
 const colosseum=e.OBJECTS.find(o=>o.name==="Colosseum");
 assert.ok(colosseum?.yes.includes("place"));
 assert.ok(colosseum?.no.includes("gk_book")&&colosseum?.no.includes("gk_artwork"));
 const photosynthesis=e.OBJECTS.find(o=>o.name==="Photosynthesis");
 assert.ok(photosynthesis?.yes.includes("gk_science"));
 assert.ok(["person","animal","place","food","drink"].every(id=>photosynthesis?.no.includes(id)));
});

test("Venus de Milo is a fair Mom win with a culturally sensible path",async()=>{
 const e=await load();
 const trace=traceSecret(e,"Venus de Milo");
 assert.equal(trace.result.winner,"pam",`Pam failed Venus de Milo; final candidate was ${trace.result.guess||"none"}`);
 assert.ok(trace.result.turns<=20);
 assert.ok(trace.questionIds.includes("gk_artwork"),`Pam never established artwork; path: ${trace.questionIds.join(", ")}`);
 const sculptureSignals=["gk_artwork","gk_sculpture","gk_marble","gk_ancient","gk_greek","gk_museum","gk_louvre"];
 const used=sculptureSignals.filter(id=>trace.questionIds.includes(id));
 assert.ok(used.length>=2,`Pam did not narrow Venus de Milo through useful sculpture/history traits; path: ${trace.questionIds.join(", ")}`);
});

test("Pam solves most representative general-knowledge benchmarks within 20 turns",{skip:process.env.MOM_GENERAL_BENCHMARK!=="1"},async()=>{
 const e=await load();
 let wins=0;
 const failures=[];
 for(const name of benchmarks){
  const secret=e.OBJECTS.findIndex(o=>o.name===name);
  assert.notEqual(secret,-1,`missing ${name}`);
  const result=e.selfPlay(secret);
  if(result.won)wins++;else failures.push(`${name} -> ${result.guess||"none"}`);
  assert.ok(result.turns<=20,`${name} exceeded turn budget`);
 }
 assert.ok(wins>=12,`Pam solved only ${wins}/${benchmarks.length}: ${failures.join(", ")}`);
});


test("confirmed general-knowledge families suppress unrelated generic questions",async()=>{
 const e=await load();
 const g=e.createGame();
 g.answers.set("gk_book","yes");
 const genericIds=["person","place","animal","plant","food","drink","household","electronic"];
 for(const id of genericIds){const f=e.FEATURES.findIndex(feature=>feature.id===id);if(f>=0)assert.equal(e.questionAllowed(g,f),false,`${id} should be suppressed after gk_book=yes`);}
 const novel=e.FEATURES.findIndex(feature=>feature.id==="gk_novel");
 assert.ok(novel>=0);
 assert.equal(e.questionAllowed(g,novel),true);
});

test("non-entity general-knowledge kinds get safe root negatives",async()=>{
 const e=await load();
 const music=e.OBJECTS.findIndex(o=>o.name==="Beethoven's Fifth Symphony");
 assert.ok(music>=0);
 for(const id of ["person","animal","plant","place","food","drink"]){
  const f=e.FEATURES.findIndex(feature=>feature.id===id);
  assert.ok(f>=0);
  assert.equal(e.truth[music*e.F+f],0,`${id} should be an explicit safe negative for a music work`);
 }
});
