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
});

test("Venus de Milo is a fair Mom win under truthful answers",async()=>{
 const e=await load();
 const secret=e.OBJECTS.findIndex(o=>o.name==="Venus de Milo");
 assert.notEqual(secret,-1);
 const result=e.selfPlay(secret);
 assert.equal(result.winner,"pam",`Pam failed Venus de Milo; final candidate was ${result.guess||"none"}`);
 assert.ok(result.turns<=20);
});

test("Pam solves most representative general-knowledge benchmarks within 20 turns",async()=>{
 const e=await load();
 let wins=0;
 const failures=[];
 for(const name of benchmarks){
  const secret=e.OBJECTS.findIndex(o=>o.name===name);
  assert.notEqual(secret,-1,`missing ${name}`);
  const result=e.selfPlay(secret);
  if(result.winner==="pam")wins++;else failures.push(`${name} -> ${result.guess||"none"}`);
  assert.ok(result.turns<=20,`${name} exceeded turn budget`);
 }
 assert.ok(wins>=12,`Pam solved only ${wins}/${benchmarks.length}: ${failures.join(", ")}`);
});
