import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {
  loadBenchmarkRows,
  SOURCE_ROW_COUNT,
  UNIQUE_CANONICAL_COUNT,
  NORMALIZATION_COLLISIONS,
} from './fixtures/mom-benchmark-data.mjs';

const ROOT = process.cwd();
const ENFORCE = process.env.MOM_BENCHMARK_ENFORCE === '1';

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');
}

function loadEngine() {
  const sandbox = { globalThis: null, window: null, console };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const relPath of [
    'src/client/mom-mode/knowledge.generated.js',
    'src/client/mom-mode/knowledge.general.js',
    'src/client/mom-mode/knowledge.js',
    'src/client/mom-mode/engine.js',
  ]) {
    const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    vm.runInContext(source, sandbox, { filename: relPath });
  }
  return sandbox.MomBayes;
}

function buildIndex(engine) {
  const map = new Map();
  engine.OBJECTS.forEach((obj, index) => {
    const names = [obj.name, ...(obj.aliases ?? [])].filter(Boolean);
    for (const name of names) {
      const key = normalize(name);
      if (!map.has(key)) map.set(key, { obj, index });
    }
  });
  return map;
}

function traceSelfPlay(engine, secret) {
  const game = engine.createGame({ budget: 20 });
  const path = [];
  let next = engine.choose(game);
  while (game.status === 'playing' && game.turn < game.budget) {
    if (!next || next.kind === 'result') break;
    if (next.kind === 'guess') {
      const correct = next.index === secret;
      path.push({ turn: game.turn + 1, kind: 'guess', text: next.text, label: next.label, answer: correct ? 'yes' : 'no' });
      next = correct ? engine.acceptGuess(game, next) : engine.rejectGuess(game, next);
      if (correct) return { result: next, path };
      continue;
    }
    const answer = engine.oracle(secret, next);
    path.push({ turn: game.turn + 1, kind: 'question', id: next.id, text: next.text, answer });
    next = engine.answer(game, next, answer);
  }
  const result = next?.kind === 'result'
    ? next
    : { kind: 'result', winner: 'player', correct: false, turns: game.turn, reason: game.status || 'budget' };
  return { result, path };
}

function pathFlags(row, path) {
  const flags = [];
  const category = normalize(row.category);
  const isPerson = category === 'people' || category === 'people / characters' || category.includes('people');
  if (isPerson) {
    for (const step of path) {
      if (step.kind !== 'question') continue;
      const q = normalize(step.text);
      if (/man[- ]made|manufactured/.test(q)) flags.push('person_asked_manmade');
      if (/can you eat|edible|food/.test(q)) flags.push('person_asked_edible');
    }
  }
  return [...new Set(flags)];
}

const benchmark = loadBenchmarkRows();
const engine = loadEngine();
const nameIndex = buildIndex(engine);

const report = benchmark.map((row) => {
  const match = nameIndex.get(normalize(row.item));
  if (!match) {
    return {
      ...row,
      present: false,
      matchedName: '',
      pamWon: false,
      turns: null,
      sensibleQuestionPath: null,
      pathFlags: [],
      failureReason: 'missing_from_runtime_knowledge',
      path: [],
    };
  }
  const { result, path } = traceSelfPlay(engine, match.index);
  const flags = pathFlags(row, path);
  const pamWon = result?.winner === 'pam';
  return {
    ...row,
    present: true,
    matchedName: match.obj.name,
    pamWon,
    turns: Number.isFinite(result?.turns) ? result.turns : path.length,
    sensibleQuestionPath: flags.length === 0,
    pathFlags: flags,
    failureReason: pamWon ? '' : (result?.reason || 'not_guessed_within_20'),
    path,
  };
});

const byTier = {};
for (const row of report) {
  const tier = row.tier || 'Unclassified';
  byTier[tier] ||= { total: 0, present: 0, wins: 0, turnTotal: 0, turnCount: 0 };
  const bucket = byTier[tier];
  bucket.total += 1;
  if (row.present) bucket.present += 1;
  if (row.pamWon) bucket.wins += 1;
  if (Number.isFinite(row.turns)) { bucket.turnTotal += row.turns; bucket.turnCount += 1; }
}
for (const bucket of Object.values(byTier)) {
  bucket.coverageRate = bucket.total ? bucket.present / bucket.total : 0;
  bucket.winRate = bucket.total ? bucket.wins / bucket.total : 0;
  bucket.avgTurns = bucket.turnCount ? bucket.turnTotal / bucket.turnCount : null;
  delete bucket.turnTotal;
  delete bucket.turnCount;
}

const summary = {
  generatedAt: new Date().toISOString(),
  sourceRowCount: SOURCE_ROW_COUNT,
  uniqueCanonicalCount: UNIQUE_CANONICAL_COUNT,
  normalizationCollisions: NORMALIZATION_COLLISIONS,
  runtimeKnowledgeCount: engine.N,
  presentCount: report.filter((r) => r.present).length,
  missingCount: report.filter((r) => !r.present).length,
  pamWinCount: report.filter((r) => r.pamWon).length,
  pamWinRate: report.length ? report.filter((r) => r.pamWon).length / report.length : 0,
  pathFlagCount: report.filter((r) => r.pathFlags.length).length,
  byTier,
  rows: report,
};

fs.mkdirSync(path.join(ROOT, '.dev-data/mom-benchmark'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.dev-data/mom-benchmark/report.json'), JSON.stringify(summary, null, 2) + '\n');

// Small CSV makes CI artifacts easy to inspect without opening the full JSON traces.
const csvCell = (value) => {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const csv = [
  ['Concept','Tier','Category','Present','Pam won','Turns','Question path sane','Path flags','Failure reason'],
  ...report.map((r) => [r.item,r.tier,r.category,r.present,r.pamWon,r.turns ?? '',r.sensibleQuestionPath ?? '',r.pathFlags.join(' | '),r.failureReason]),
].map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
fs.writeFileSync(path.join(ROOT, '.dev-data/mom-benchmark/report.csv'), csv);

test('Mom benchmark fixture preserves the curated benchmark', () => {
  assert.equal(SOURCE_ROW_COUNT, 1082);
  assert.equal(UNIQUE_CANONICAL_COUNT, 1081);
  assert.equal(NORMALIZATION_COLLISIONS, 1);
  assert.equal(benchmark.length, UNIQUE_CANONICAL_COUNT);
  assert.equal(new Set(benchmark.map((r) => normalize(r.item))).size, UNIQUE_CANONICAL_COUNT);
});

test('Mom benchmark runs every unique canonical concept and writes a complete report', () => {
  assert.equal(report.length, UNIQUE_CANONICAL_COUNT);
  assert.ok(report.every((r) => r.item));
  assert.ok(report.every((r) => typeof r.present === 'boolean'));
  assert.ok(report.every((r) => Array.isArray(r.path)));
  assert.ok(fs.existsSync(path.join(ROOT, '.dev-data/mom-benchmark/report.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.dev-data/mom-benchmark/report.csv')));
});

test('Mom benchmark quality gate', { skip: !ENFORCE }, () => {
  const missing = report.filter((r) => !r.present);
  assert.deepEqual(missing, [], `Missing ${missing.length} benchmark concepts; first: ${missing.slice(0, 30).map((r) => r.item).join(', ')}`);

  const core = report.filter((r) => r.tier === 'Core' || r.tier === 'Core + Sweet Spot');
  const sweet = report.filter((r) => r.tier === 'Sweet Spot' || r.tier === 'Core + Sweet Spot');
  const hard = report.filter((r) => r.tier === 'Hard but Fair');
  const rate = (rows) => rows.length ? rows.filter((r) => r.pamWon).length / rows.length : 1;
  assert.ok(rate(core) >= 0.90, `Core win rate ${(rate(core) * 100).toFixed(1)}% < 90%`);
  assert.ok(rate(sweet) >= 0.85, `Sweet Spot win rate ${(rate(sweet) * 100).toFixed(1)}% < 85%`);
  assert.ok(rate(hard) >= 0.80, `Hard but Fair win rate ${(rate(hard) * 100).toFixed(1)}% < 80%`);
});
