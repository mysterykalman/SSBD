import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('CSKG extractor keeps generic and QID homonyms isolated',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mom-cskg-'));
  try{
    const inventory=path.join(root,'inventory.csv');
    const graph=path.join(root,'cskg.tsv');
    const output=path.join(root,'evidence.json');
    fs.writeFileSync(inventory,[
      'Canonical answer,Wikidata QID',
      'guitar,',
      'Noodle,Q192874',
      'noodle,',
    ].join('\n')+'\n');
    fs.writeFileSync(graph,[
      ['id','node1','relation','node2','node1;label','node2;label','relation;label','relation;dimension','source','sentence'].join('\t'),
      ['1','/c/en/guitar','/r/HasA','/c/en/strings','guitar','strings','','','CN',''].join('\t'),
      ['2','wd:Q192874','/r/IsA','/c/en/fictional_character','Noodle','fictional character','','','WD',''].join('\t'),
      ['3','/c/en/noodle','/r/IsA','/c/en/food','noodle','food','','','CN',''].join('\t'),
    ].join('\n')+'\n');
    const run=spawnSync('python3',[path.join(ROOT,'scripts/extract-cskg-traits.py'),'--inventory',inventory,'--cskg',graph,'--output',output,'--replace'],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
    const rows=JSON.parse(fs.readFileSync(output,'utf8'));
    const byName=new Map(rows.map(row=>[row.concept,row.evidence]));
    assert.ok(byName.get('guitar').some(e=>e.trait==='hasa:strings'));
    assert.ok(byName.get('Noodle').some(e=>e.trait==='isa:fictional character'));
    assert.ok(byName.get('noodle').some(e=>e.trait==='isa:food'));
    assert.equal(byName.get('Noodle').some(e=>e.trait==='isa:food'),false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});

test('CSKG extractor accepts real-world KGTK fields larger than the csv default limit',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mom-cskg-large-'));
  try{
    const inventory=path.join(root,'inventory.csv');
    const graph=path.join(root,'cskg.tsv');
    const output=path.join(root,'evidence.json');
    const oversizedSentence='x'.repeat(160_000);
    fs.writeFileSync(inventory,'Canonical answer,Wikidata QID\nguitar,\n');
    fs.writeFileSync(graph,[
      ['id','node1','relation','node2','node1;label','node2;label','relation;label','relation;dimension','source','sentence'].join('\t'),
      ['1','/c/en/guitar','/r/HasA','/c/en/strings','guitar','strings','','','CN',oversizedSentence].join('\t'),
    ].join('\n')+'\n');
    const run=spawnSync('python3',[path.join(ROOT,'scripts/extract-cskg-traits.py'),'--inventory',inventory,'--cskg',graph,'--output',output,'--replace'],{encoding:'utf8'});
    assert.equal(run.status,0,run.stderr||run.stdout);
    const rows=JSON.parse(fs.readFileSync(output,'utf8'));
    assert.ok(rows[0].evidence.some(e=>e.trait==='hasa:strings'));
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
});
