import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadBenchmarkRows,UNIQUE_CANONICAL_COUNT} from './fixtures/mom-benchmark-data.mjs';
import {evaluateRuntimeBenchmark,resolveRuntimeConcept,summarizeRuntimeBenchmark,traceRuntimeSelfPlay} from '../scripts/mom-runtime-benchmark.mjs';

const ROOT=process.cwd();
const REAL_RUNTIME=path.join(ROOT,'.dev-data','mom-runtime','knowledge.runtime.json');
const RUN_FULL=process.env.MOM_RUNTIME_BENCHMARK_RUN==='1'||process.env.MOM_RUNTIME_BENCHMARK_ENFORCE==='1';
const ENFORCE=process.env.MOM_RUNTIME_BENCHMARK_ENFORCE==='1';

const fixture={
  meta:{sourceHash:'fixture'},
  questions:[
    {id:'object',q:'Is it an object?',family:'ontology',group:'domain',breadth:'broad',reliability:0.99,requires:null,appliesTo:[],excludes:[],minCoverage:0},
    {id:'handheld',q:'Can you hold it?',family:'physical',group:'object',breadth:'attribute',reliability:0.94,requires:0,appliesTo:['object'],excludes:[],minCoverage:0.25}
  ],
  concepts:[
    {id:'switch',name:'Nintendo Switch',category:'object',subcategory:'device',difficulty:'core',prior:0.7,yes:[0,1],no:[],maybe:[],facets:{brand:'Nintendo'}},
    {id:'lamp',name:'Lamp',category:'object',subcategory:null,difficulty:'core',prior:0.3,yes:[0],no:[1],maybe:[],facets:{brand:'IKEA'}}
  ],
  aliases:{'nintendo switch':0,switch:0,lamp:1},
  facetIndex:{version:1,types:{brand:{question:'Is it made by {value}?',exclusiveKnown:true,requiresCategory:'object',reliability:0.98,known:[0,1],values:{Nintendo:[0],IKEA:[1]}}}}
};

test('runtime benchmark lookup resolves aliases without revealing them to deduction',()=>{
  const match=resolveRuntimeConcept(fixture,'Switch');
  assert.equal(match.index,0);
  assert.equal(match.concept.name,'Nintendo Switch');
});

test('runtime benchmark self-play uses the compact runtime game',()=>{
  const traced=traceRuntimeSelfPlay(fixture,0,{minGuessQuestions:1});
  assert.ok(['pam','player'].includes(traced.result.winner));
  assert.ok(traced.path.length>0);
  assert.ok(traced.path.every(step=>step.kind!=='question'||typeof step.text==='string'));
});

test('runtime benchmark coverage distinguishes missing from present concepts',()=>{
  const rows=[{item:'Nintendo Switch',tier:'Core',category:'Everyday things'},{item:'Missing thing',tier:'Core',category:'Everyday things'}];
  const evaluated=evaluateRuntimeBenchmark(fixture,rows,{selfPlay:false});
  assert.equal(evaluated[0].present,true);
  assert.equal(evaluated[1].present,false);
  const summary=summarizeRuntimeBenchmark(fixture,evaluated);
  assert.equal(summary.presentCount,1);
  assert.equal(summary.missingCount,1);
  assert.equal(summary.coverageRate,0.5);
});

test('full 1,081-row compact runtime benchmark', {skip:!RUN_FULL||!fs.existsSync(REAL_RUNTIME)},()=>{
  const runtime=JSON.parse(fs.readFileSync(REAL_RUNTIME,'utf8'));
  const rows=loadBenchmarkRows();
  assert.equal(rows.length,UNIQUE_CANONICAL_COUNT);
  const evaluated=evaluateRuntimeBenchmark(runtime,rows,{selfPlay:true});
  const summary=summarizeRuntimeBenchmark(runtime,evaluated);
  const dir=path.join(ROOT,'.dev-data','mom-runtime-benchmark');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(summary,null,2)+'\n');
  assert.equal(summary.rowCount,1081);
  assert.equal(summary.presentCount+summary.missingCount,1081);

  if(ENFORCE){
    const normalize=value=>String(value??'').trim().toLowerCase();
    const core=evaluated.filter(row=>row.tier==='Core'||row.tier==='Core + Sweet Spot');
    const sweet=evaluated.filter(row=>row.tier==='Sweet Spot'||row.tier==='Core + Sweet Spot');
    const hard=evaluated.filter(row=>normalize(row.category)==='harder but fair');
    const coverage=group=>group.filter(row=>row.present).length/group.length;
    const solvedPresent=group=>{const present=group.filter(row=>row.present);return present.length?present.filter(row=>row.pamWon).length/present.length:0;};
    assert.ok(coverage(core)>=0.90,`Core coverage ${(coverage(core)*100).toFixed(1)}% < 90%`);
    assert.ok(coverage(sweet)>=0.85,`Sweet Spot coverage ${(coverage(sweet)*100).toFixed(1)}% < 85%`);
    assert.ok(coverage(hard)>=0.80,`Harder but fair coverage ${(coverage(hard)*100).toFixed(1)}% < 80%`);
    assert.ok(solvedPresent(core)>=0.90,`Core present-item win rate ${(solvedPresent(core)*100).toFixed(1)}% < 90%`);
    assert.ok(solvedPresent(sweet)>=0.85,`Sweet Spot present-item win rate ${(solvedPresent(sweet)*100).toFixed(1)}% < 85%`);
    assert.ok(solvedPresent(hard)>=0.80,`Harder but fair present-item win rate ${(solvedPresent(hard)*100).toFixed(1)}% < 80%`);
    assert.equal(summary.pathFlagCount,0,`runtime benchmark has ${summary.pathFlagCount} human-intent path violations`);
  }
});
