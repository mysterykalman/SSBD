import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {loadPamClassicModel} from '../scripts/pam-classic-model.mjs';
import {loadPam1775Model,loadPamExpandedModel} from '../scripts/pam-quality-model.mjs';

const baseline=await loadPam1775Model(loadPamClassicModel);
const expanded=await loadPamExpandedModel(loadPamClassicModel);
const count=expanded.targets.length;
const batchPresent=existsSync('data/pam20q/quality/quality-500.json');

test('500-target expansion never modifies existing 1775 target names or answer cells',()=>{
  assert.deepEqual(expanded.targets.slice(0,1775),baseline.targets);
  assert.equal(count,batchPresent?2275:1775);
  assert.equal(expanded.weights.length,156*count);
  assert.equal(expanded.knownMask.length,156*count);
  for(let q=0;q<156;q++)for(let t=0;t<1775;t++){
    assert.equal(expanded.weights[q*count+t],baseline.weights[q*1775+t],`state regression q=${q} t=${t}`);
    assert.equal(expanded.knownMask[q*count+t],baseline.knownMask[q*1775+t],`mask regression q=${q} t=${t}`);
  }
});

test('all targets are unique and the 500 batch is explicitly gated',()=>{
  assert.equal(new Set(expanded.targets.map(x=>x.toLowerCase())).size,count);
  assert.equal(expanded.newQualityCount||0,batchPresent?500:0);
});
