import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createCandidateAccumulator} from '../scripts/mom-playable-candidates.mjs';
import {compileMomRuntimeKnowledge} from '../scripts/mom-runtime-compiler.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const NODE=process.execPath;

const traits=[
  {id:'food_drink',q:'Is it food or drink?',group:'domain',parents:[]},
  {id:'fictional_character',q:'Is it a fictional character?',group:'fictional',parents:[]}
];

function questionIndex(runtime){return Object.fromEntries(runtime.questions.map((q,i)=>[q.id,i]));}

test('candidate accumulator keeps generic and QID-specific homonyms separate',()=>{
  const {candidates,addCandidate}=createCandidateAccumulator();
  addCandidate('Noodle','THINGS',120,{broadCategory:'Everyday things'});
  addCandidate('Noodle','Wikipedia Vital Articles',80,{qid:'Q192874',broadCategory:'Named / cultural knowledge'});
  assert.equal(candidates.size,2);
  assert.equal(candidates.get('noodle')?.qid,'');
  assert.equal(candidates.get('wd:Q192874')?.qid,'Q192874');
});

test('runtime compiler keeps same-label supplement facts on the matching QID sense',()=>{
  const inventory=[
    {name:'Noodle',key:'noodle',qid:'',difficulty:'Core',score:120,broadCategory:'Everyday things'},
    {name:'Noodle',key:'noodle',qid:'Q192874',difficulty:'Long Tail',score:60,broadCategory:'Named / cultural knowledge'}
  ];
  const profiles=[
    {name:'Noodle',key:'noodle',qid:'',difficulty:'Core',score:120,traits:['food_drink']},
    {name:'Noodle',key:'noodle',qid:'Q192874',difficulty:'Long Tail',score:60,traits:[]}
  ];
  const supplements=[{source:'fixture',features:[],objects:[{name:'Noodle',qid:'Q192874',yes:['fictional_character']}]}];
  const runtime=compileMomRuntimeKnowledge({inventory,profiles,traits,supplements,generatedAt:'deterministic'});
  const q=questionIndex(runtime);
  const generic=runtime.concepts.find(c=>c.id==='concept:noodle');
  const named=runtime.concepts.find(c=>c.id==='wd:Q192874');
  assert.ok(generic?.yes.includes(q.food_drink));
  assert.ok(!generic?.yes.includes(q.fictional_character));
  assert.ok(named?.yes.includes(q.fictional_character));
  assert.ok(!named?.yes.includes(q.food_drink));
  assert.ok(Array.isArray(runtime.aliases.noodle));
  assert.equal(runtime.aliases.noodle.length,2);
});

test('trait analysis and profile compilation isolate generic evidence from named homonyms',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mom-homonym-'));
  try{
    const inventoryDir=path.join(root,'.dev-data','mom-playable-50k');
    const sourceDir=path.join(root,'.dev-data','trait-sources');
    fs.mkdirSync(inventoryDir,{recursive:true});
    fs.mkdirSync(sourceDir,{recursive:true});
    const inventory=[
      {rank:1,name:'Noodle',aliases:[],key:'noodle',identityKey:'noodle',difficulty:'Core',qid:'',score:120,sources:['THINGS'],broadCategory:'Everyday things',sourceCategory:''},
      {rank:2,name:'Noodle',aliases:[],key:'noodle',identityKey:'wd:Q192874',difficulty:'Long Tail',qid:'Q192874',score:60,sources:['Wikipedia Vital Articles'],broadCategory:'Named / cultural knowledge',sourceCategory:''}
    ];
    fs.writeFileSync(path.join(inventoryDir,'playable_50k.jsonl'),inventory.map(row=>JSON.stringify(row)).join('\n')+'\n');
    fs.writeFileSync(path.join(sourceDir,'wordnet-evidence.json'),JSON.stringify([{concept:'Noodle',traits:['hypernym:food']}])) ;
    fs.writeFileSync(path.join(sourceDir,'wikidata-labelled-evidence.json'),JSON.stringify([
      {concept:'Noodle',qid:'Q192874',evidence:[{trait:'fictional character',type:'instance of',confidence:1}]}
    ]));

    const analyze=spawnSync(NODE,[path.join(ROOT,'scripts/analyze-mom-trait-coverage.mjs')],{cwd:root,encoding:'utf8'});
    assert.equal(analyze.status,0,analyze.stderr||analyze.stdout);
    const evidence=fs.readFileSync(path.join(root,'.dev-data/mom-trait-coverage/evidence.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
    const genericEvidence=evidence.filter(row=>row.concept==='Noodle'&&!row.qid);
    const namedEvidence=evidence.filter(row=>row.qid==='Q192874');
    assert.ok(genericEvidence.some(row=>row.source==='Open English WordNet'));
    assert.ok(namedEvidence.some(row=>row.source==='Wikidata'));
    assert.ok(!genericEvidence.some(row=>row.source==='Wikidata'));
    assert.ok(!namedEvidence.some(row=>row.source==='Open English WordNet'));

    const compile=spawnSync(NODE,[path.join(ROOT,'scripts/build-mom-controlled-profiles.mjs')],{cwd:root,encoding:'utf8'});
    assert.equal(compile.status,0,compile.stderr||compile.stdout);
    const profiles=JSON.parse(fs.readFileSync(path.join(root,'.dev-data/mom-controlled-profiles/mom-controlled-profiles.json'),'utf8')).objects;
    const generic=profiles.find(row=>!row.qid);
    const named=profiles.find(row=>row.qid==='Q192874');
    assert.ok(generic);
    assert.ok(named?.traits.includes('fictional_character'));
    assert.ok(!generic.traits.includes('fictional_character'));
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
