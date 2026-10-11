import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCandidateAccumulator } from '../scripts/mom-playable-candidates.mjs';
import { mapEvidence } from '../scripts/mom-controlled-traits.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;

test('higher-scored inventory candidates replace metadata and retain alternate spellings', () => {
  const { candidates, addCandidate } = createCandidateAccumulator();
  addCandidate('Blue Whale', 'Brysbaert', 74, { broadCategory: 'Common concepts', reason: 'common lemma' });
  addCandidate('blue whale', 'THINGS', 120, { broadCategory: 'Everyday things', sourceCategory: 'Animals', reason: 'purpose-built answer' });
  const item = candidates.get('blue whale');
  assert.equal(item.name, 'blue whale');
  assert.equal(item.score, 120);
  assert.equal(item.broadCategory, 'Everyday things');
  assert.equal(item.sourceCategory, 'Animals');
  assert.equal(item.reason, 'purpose-built answer');
  assert.deepEqual([...item.sources].sort(), ['Brysbaert', 'THINGS']);
  assert.deepEqual([...item.aliases].sort(), ['Blue Whale', 'blue whale']);
});

test('controlled traits distinguish fictional characters and ignore generic work wording', () => {
  const fictional = mapEvidence([{ source: 'Wikidata', type: 'occupation', trait: 'fictional character' }]);
  assert.ok(fictional.has('fictional_character'));
  assert.ok(!fictional.has('real_person'));
  assert.ok(!fictional.has('person') || fictional.has('fictional_character'));
  assert.deepEqual([...mapEvidence([{ source: 'ConceptNet', type: 'HasProperty', trait: 'work' }])], []);
});

test('analyzer and profile compiler preserve full evidence beyond report examples', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mom-pipeline-'));
  try {
    const inventoryDir = path.join(root, '.dev-data', 'mom-playable-50k');
    const sourceDir = path.join(root, '.dev-data', 'trait-sources');
    const coverageDir = path.join(root, '.dev-data', 'mom-trait-coverage');
    fs.mkdirSync(inventoryDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });
    const inventory = [{ rank: 1, name: 'Fiction Hero', aliases: ['Hero'], key: 'fiction hero', difficulty: 'Core', qid: '', score: 120, sources: ['fixture'], broadCategory: '', sourceCategory: '' }];
    fs.writeFileSync(path.join(inventoryDir, 'playable_50k.jsonl'), inventory.map(row => JSON.stringify(row)).join('\n') + '\n');
    const assertionDir = path.join(sourceDir, 'trait-concept-datasets');
    fs.mkdirSync(assertionDir, { recursive: true });
    const rows = Array.from({ length: 20 }, (_, i) => `Hero,${i === 0 ? 'fictional character' : `fixture trait ${i}`},HasProperty`);
    fs.writeFileSync(path.join(assertionDir, 'fixture.csv'), ['concept,feature,attribute type', ...rows].join('\n') + '\n');
    const edge = '/a/[/r/HasProperty/,/c/en/hero/,/c/en/fictional_character/]\t/r/HasProperty\t/c/en/hero\t/c/en/fictional_character\t' + JSON.stringify({weight: 2.5});
    fs.writeFileSync(path.join(sourceDir, 'conceptnet-assertions-5.7.0.csv.gz'), gzipSync(`${edge}\n${edge}\n`));
    const analyze = spawnSync(NODE, [path.join(ROOT, 'scripts/analyze-mom-trait-coverage.mjs')], { cwd: root, encoding: 'utf8' });
    assert.equal(analyze.status, 0, analyze.stderr || analyze.stdout);
    const evidence = fs.readFileSync(path.join(coverageDir, 'evidence.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(evidence.length, 21);
    const duplicate = evidence.find(row => row.source === 'ConceptNet');
    assert.ok(duplicate);
    assert.equal(duplicate.support, 2);
    assert.equal(duplicate.weight, 2.5);
    const compile = spawnSync(NODE, [path.join(ROOT, 'scripts/build-mom-controlled-profiles.mjs')], { cwd: root, encoding: 'utf8' });
    assert.equal(compile.status, 0, compile.stderr || compile.stdout);
    const profile = JSON.parse(fs.readFileSync(path.join(root, '.dev-data/mom-controlled-profiles/mom-controlled-profiles.json'), 'utf8'));
    assert.equal(profile.objects[0].evidenceCount, 21);
    assert.ok(profile.objects[0].traits.includes('fictional_character'));
    assert.ok(!profile.objects[0].traits.includes('real_person'));
    assert.ok(!profile.objects[0].traits.includes('living'));
    const preserved = fs.readFileSync(path.join(root, '.dev-data/mom-controlled-profiles/all-evidence.jsonl'), 'utf8').trim().split('\n');
    assert.equal(preserved.length, 21);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
