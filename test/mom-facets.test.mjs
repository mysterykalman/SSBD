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
  return {engine:ctx.MomBayes,facets:ctx.MOM_FACETS};
}

const fi=(e,id)=>e.FEATURES.findIndex(feature=>feature.id===id);
const oi=(e,name)=>e.OBJECTS.findIndex(object=>object.name===name);

test("facet compiler creates brand and product-type questions before the engine loads",async()=>{
  const {engine:e,facets}=await load();
  assert.ok(facets.compiledFeatures>=5);
  const brand=fi(e,"facet_brand_nintendo");
  const type=fi(e,"facet_product_type_video_game_console");
  assert.ok(brand>=0);
  assert.ok(type>=0);
  assert.equal(e.FEATURES[brand].q,"Is it made by Nintendo?");
  assert.equal(e.FEATURES[brand].requires,"gk_product");
});

test("Nintendo Switch carries Nintendo and console facets as ordinary Bayes truth",async()=>{
  const {engine:e}=await load();
  const nintendo=oi(e,"Nintendo Switch");
  const brand=fi(e,"facet_brand_nintendo");
  const type=fi(e,"facet_product_type_video_game_console");
  assert.ok(nintendo>=0&&brand>=0&&type>=0);
  assert.equal(e.truth[nintendo*e.F+brand],1);
  assert.equal(e.truth[nintendo*e.F+type],1);
});

test("brand questions stay locked until Pam has established a product branch",async()=>{
  const {engine:e}=await load();
  const brand=fi(e,"facet_brand_nintendo");
  const g=e.createGame();
  assert.equal(e.questionAllowed(g,brand),false);
  g.answers.set("gk_product","yes");
  assert.equal(e.questionAllowed(g,brand),true);
});

test("Nintendo becomes a useful filter once the remaining candidates are game consoles",async()=>{
  const {engine:e}=await load();
  const names=["Nintendo Switch","PlayStation 5","Xbox"];
  const candidates=names.map(name=>oi(e,name));
  assert.ok(candidates.every(index=>index>=0));
  const brand=fi(e,"facet_brand_nintendo");
  const g=e.createGame();g.belief.fill(0);
  for(const index of candidates)g.belief[index]=1/candidates.length;
  g.answers.set("gk_product","yes");
  g.turn=8;
  const ranked=e.questionScore(g,brand);
  assert.equal(ranked.eligible,true);
  assert.ok(ranked.gain>0.5,`expected a useful Nintendo split, got ${ranked.gain}`);
  assert.ok(ranked.score>0);
});
