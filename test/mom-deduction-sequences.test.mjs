import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

async function load(){
  const ctx={globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);
  for(const file of [
    "src/client/mom-mode/knowledge.js",
    "src/client/mom-mode/knowledge.general.js",
    "src/client/mom-mode/facets.js",
    "src/client/mom-mode/engine.js",
    "src/client/mom-mode/deduction.js"
  ])vm.runInContext(await readFile(file,"utf8"),ctx,{filename:file});
  return ctx.MomBayes;
}

const fi=(e,id)=>e.FEATURES.findIndex(feature=>feature.id===id);
const oi=(e,name)=>e.OBJECTS.findIndex(object=>object.name===name);

function restrictBelief(e,g,indexes){
  g.belief.fill(0);
  for(const index of indexes)g.belief[index]=1/indexes.length;
}

test("Pam begins with a broad or category-level filter rather than a niche detail",async()=>{
  const e=await load();
  const g=e.createGame();
  const action=e.choose(g);
  assert.equal(action.kind,"question");
  const meta=e.QUESTION_META[action.index];
  assert.ok(meta.breadth==="broad"||meta.breadth==="category",`opening question was ${action.id} (${meta.breadth})`);
});

test("once the answer is known to be a person, object-style questions cannot re-enter the sequence",async()=>{
  const e=await load();
  const people=[];
  const person=fi(e,"person");
  for(let i=0;i<e.N;i++)if(e.truth[i*e.F+person]===1)people.push(i);
  assert.ok(people.length>=5);
  const g=e.createGame();
  restrictBelief(e,g,people);
  g.answers.set("person","yes");
  g.turn=2;
  const blocked=new Set(["manmade","electronic","battery","screen","vehicle","wearable","tool","furniture","appliance"]);
  for(let step=0;step<4;step++){
    const action=e.choose(g);
    if(action.kind!=="question")break;
    assert.ok(!blocked.has(action.id),`person branch asked ${action.id}`);
    const doctor=oi(e,"Doctor");
    assert.ok(doctor>=0);
    const answer=e.oracle(doctor,action);
    const next=e.answer(g,action,answer);
    if(next.kind!=="question")break;
  }
});

test("brand becomes the natural next filter when three known consoles remain",async()=>{
  const e=await load();
  const candidates=["Nintendo Switch","PlayStation 5","Xbox"].map(name=>oi(e,name));
  assert.ok(candidates.every(index=>index>=0));
  const g=e.createGame();
  restrictBelief(e,g,candidates);
  g.answers.set("gk_product","yes");
  g.answers.set("gk_console","yes");
  g.turn=8;
  const best=e.bestNaturalQuestion(g);
  assert.ok(best);
  const id=e.FEATURES[best.index].id;
  assert.match(id,/^facet_brand_/);
});

test("a product brand filter is not competitive before the product branch is established",async()=>{
  const e=await load();
  const brand=fi(e,"facet_brand_nintendo");
  assert.ok(brand>=0);
  const g=e.createGame();
  const ranked=e.questionScore(g,brand);
  assert.equal(ranked.eligible,false);
});
