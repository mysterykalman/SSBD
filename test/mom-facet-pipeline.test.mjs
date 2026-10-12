import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createCandidateAccumulator} from '../scripts/mom-playable-candidates.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const NODE=process.execPath;

test('candidate accumulation merges structured facets across sources',()=>{
  const {candidates,addCandidate}=createCandidateAccumulator();
  addCandidate('Nintendo Switch','source-a',100,{facets:{brand:'Nintendo',productType:'video game console'}});
  addCandidate('Nintendo Switch','source-b',90,{facets:{brand:['Nintendo'],country:'Japan'}});
  const item=candidates.get('nintendo switch');
  assert.deepEqual(item.facets.brand,['Nintendo']);
  assert.deepEqual(item.facets.productType,['video game console']);
  assert.deepEqual(item.facets.country,['Japan']);
});

test('controlled-profile compiler preserves inventory facets',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mom-facets-'));
  try{
    const inventoryDir=path.join(root,'.dev-data','mom-playable-50k');
    fs.mkdirSync(inventoryDir,{recursive:true});
    const row={rank:1,name:'Nintendo Switch',aliases:[],key:'nintendo switch',difficulty:'Core',qid:'',score:120,sources:['fixture'],broadCategory:'Everyday things',sourceCategory:'Games',facets:{brand:['Nintendo'],productType:['video game console']}};
    fs.writeFileSync(path.join(inventoryDir,'playable_50k.jsonl'),JSON.stringify(row)+'\n');
    const compile=spawnSync(NODE,[path.join(ROOT,'scripts/build-mom-controlled-profiles.mjs')],{cwd:root,encoding:'utf8'});
    assert.equal(compile.status,0,compile.stderr||compile.stdout);
    const profile=JSON.parse(fs.readFileSync(path.join(root,'.dev-data/mom-controlled-profiles/mom-controlled-profiles.json'),'utf8'));
    assert.deepEqual(profile.objects[0].facets,row.facets);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('canonical Mom schema permits structured facets',()=>{
  const schema=JSON.parse(fs.readFileSync(path.join(ROOT,'src/client/mom-mode/knowledge.schema.json'),'utf8'));
  assert.ok(schema.properties.facets);
  assert.equal(schema.properties.facets.type,'object');
});
