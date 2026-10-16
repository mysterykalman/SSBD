import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const finalUrl = new URL('../data/pam20q/final-canonical-questions.json', import.meta.url);
const baseUrl = new URL('../data/pam20q/canonical-questions.json', import.meta.url);
const questionUrl = fs.existsSync(finalUrl) ? finalUrl : baseUrl;
const questions = JSON.parse(fs.readFileSync(questionUrl, 'utf8')).questions;
const byId = new Map(questions.map((q) => [q.id, q]));

function ancestors(id, seen = new Set()) {
  if (seen.has(id)) return seen;
  seen.add(id);
  for (const p of byId.get(id)?.parents || []) ancestors(p, seen);
  return seen;
}

test('canonical Pam 20Q question set is compact and unique', () => {
  assert.ok([131, 150].includes(questions.length), `unexpected question count ${questions.length}`);
  assert.ok(questions.length >= 80 && questions.length <= 150);
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
});

test('every hierarchy parent exists and hierarchy is acyclic', () => {
  for (const q of questions) {
    for (const parent of q.parents || []) assert.ok(byId.has(parent), `${q.id} -> missing ${parent}`);
    const seen = new Set();
    const walk = (id, stack = new Set()) => {
      assert.ok(!stack.has(id), `cycle at ${id}`);
      if (seen.has(id)) return;
      seen.add(id);
      const next = new Set(stack); next.add(id);
      for (const parent of byId.get(id)?.parents || []) walk(parent, next);
    };
    walk(q.id);
  }
});

test('required 20Q hierarchy relationships are preserved', () => {
  assert.ok(ancestors('mammal').has('animal'));
  assert.ok(ancestors('mammal').has('living'));
  assert.ok(ancestors('city').has('place'));
  assert.ok(ancestors('aircraft').has('vehicle'));
  assert.ok(ancestors('aircraft').has('object'));
  assert.ok(ancestors('film').has('media_work'));
});

test('classic-reference additions preserve broad human-friendly splits', () => {
  if (questions.length !== 150) return;
  for (const id of ['body_part','flat','sharp','transparent','heavy','pocket_sized','floats','mechanical','motorized','buttons_controls','stores_information','recyclable','wings','feathers','lays_eggs','shell','lives_in_water','leaves','roots']) {
    assert.ok(byId.has(id), `missing classic-reference addition ${id}`);
  }
});

test('pretrainer remains isolated from production gameplay imports', () => {
  const productionFiles = [
    '../src/client/mom-mode/engine.js',
    '../src/client/mom-mode/runtime-entry.js',
    '../src/shared/mom-runtime-game.js'
  ];
  for (const rel of productionFiles) {
    const text = fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /pam20q|pretrained-20q/i, `${rel} imports pretrainer`);
  }
});
