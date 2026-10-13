import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

async function load(){
  const ctx={globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);
  for(const file of ["src/client/mom-mode/knowledge.js","src/client/mom-mode/engine.js","src/client/mom-mode/deduction.js"]){
    vm.runInContext(await readFile(file,"utf8"),ctx,{filename:file});
  }
  return ctx.MomBayes;
}

function featureIndex(engine,id){return engine.FEATURES.findIndex(feature=>feature.id===id);}
function knownRoot(engine,candidate,id){const f=featureIndex(engine,id);return f>=0&&engine.truth[candidate*engine.F+f]===1;}

test("deduction layer adds semantic metadata without replacing the Bayes core",async()=>{
  const e=await load();
  assert.equal(typeof e.questionScore,"function");
  assert.equal(typeof e.semanticCoverage,"function");
  assert.equal(typeof e.bestNaturalQuestion,"function");
  const manmade=featureIndex(e,"manmade");
  assert.ok(manmade>=0);
  assert.equal(e.QUESTION_META[manmade].family,"origin");
  assert.equal(e.QUESTION_META[manmade].breadth,"broad");
});

test("man-made loses semantic coverage when the remaining belief is mostly people",async()=>{
  const e=await load();
  const manmade=featureIndex(e,"manmade");
  const person=e.OBJECTS.findIndex((_,i)=>knownRoot(e,i,"person"));
  const nonPerson=e.OBJECTS.findIndex((_,i)=>!knownRoot(e,i,"person"));
  assert.ok(person>=0&&nonPerson>=0);
  const g=e.createGame();
  g.belief.fill(0);g.belief[person]=0.8;g.belief[nonPerson]=0.2;
  const coverage=e.semanticCoverage(g,manmade);
  assert.ok(coverage<=0.21,`expected low coverage, got ${coverage}`);
  assert.equal(e.questionScore(g,manmade).eligible,false);
});

test("man-made remains available when the remaining belief is non-living",async()=>{
  const e=await load();
  const manmade=featureIndex(e,"manmade");
  const candidates=[];
  for(let i=0;i<e.N&&candidates.length<4;i++)if(!knownRoot(e,i,"person")&&!knownRoot(e,i,"animal")&&!knownRoot(e,i,"plant"))candidates.push(i);
  assert.ok(candidates.length>=2);
  const g=e.createGame();g.belief.fill(0);
  for(const i of candidates)g.belief[i]=1/candidates.length;
  assert.ok(e.semanticCoverage(g,manmade)>=0.99);
});

test("unknown-heavy traits receive lower known-data coverage",async()=>{
  const e=await load();
  const g=e.createGame();
  let sparse=-1,dense=-1,sparseCoverage=2,denseCoverage=-1;
  for(let f=0;f<e.F;f++){
    const coverage=e.knownCoverage(g,f);
    if(coverage<sparseCoverage){sparseCoverage=coverage;sparse=f;}
    if(coverage>denseCoverage){denseCoverage=coverage;dense=f;}
  }
  assert.ok(sparse>=0&&dense>=0);
  assert.ok(denseCoverage>sparseCoverage,`expected coverage spread, got ${sparseCoverage} to ${denseCoverage}`);
});

test("questions returned by the natural layer expose ranking diagnostics",async()=>{
  const e=await load();
  const g=e.createGame();
  const action=e.choose(g);
  assert.equal(action.kind,"question");
  assert.ok(action.naturalScore>0);
  assert.ok(action.semanticCoverage>=0&&action.semanticCoverage<=1);
  assert.ok(action.knownCoverage>=0&&action.knownCoverage<=1);
});

test("natural-ranking self-play remains bounded by the 20-question game",async()=>{
  const e=await load();
  const sample=[...new Set(Array.from({length:16},(_,n)=>Math.round(n*(e.N-1)/15)))];
  for(const i of sample){
    const result=e.selfPlay(i);
    assert.ok(result.turns<=20,`${e.OBJECTS[i].name} took ${result.turns} questions`);
  }
});
