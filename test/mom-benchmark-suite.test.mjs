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
const RUN_FULL = ENFORCE || process.env.MOM_BENCHMARK_RUN === '1';

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
  const scripts = [
    'src/client/mom-mode/knowledge.generated.js',
    'src/client/mom-mode/knowledge.general.js',
    'src/client/mom-mode/knowledge.js',
  ];
  const controlled = '.dev-data/mom-controlled-profiles/knowledge.controlled.js';
  if (fs.existsSync(path.join(ROOT, controlled))) scripts.push(controlled);
  scripts.push('src/client/mom-mode/engine.js');
  for (const relPath of scripts) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, relPath), 'utf8'), sandbox, { filename: relPath });
  }
  return sandbox.MomBayes;
}

function buildIndex(engine) {
  const map = new Map();
  engine.OBJECTS.forEach((obj, index) => {
    for (const name of [obj.name, ...(obj.aliases ?? [])].filter(Boolean)) {
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
  while (game.status === 'playing') {
    if (!next) break;
    if (next.kind === 'hunch') {
      path.push({ turn: game.turn + 1, kind: 'hunch', label: next.label, confidence: next.confidence });
      next = engine.commitGuess(game, next);
      continue;
    }
    if (next.kind === 'guess') {
      const correct = next.index === secret;
      path.push({ turn: game.turn + 1, kind: 'guess', label: next.label, answer: correct ? 'yes' : 'no' });
      const confirmed = engine.confirm(game, next, correct);
      return {
        result: { kind: 'result', winner: correct ? 'pam' : 'player', correct, turns: game.turn, guess: next.label, reason: correct ? '' : 'wrong_guess', score: confirmed.score },
        path,
      };
    }
    if (next.kind === 'stumped') {
      return { result: { kind: 'result', winner: 'player', correct: false, turns: game.turn, reason: 'stumped' }, path };
    }
    assert.equal(next.kind, 'question', `unexpected Mom action: ${next.kind}`);
    const answer = engine.oracle(secret, next);
    path.push({ turn: game.turn + 1, kind: 'question', id: next.id, text: next.text, answer });
    next = engine.answer(game, next, answer);
  }
  return { result: { kind: 'result', winner: 'player', correct: false, turns: game.turn, reason: game.status || 'budget' }, path };
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

function coverageRows(rows = benchmark) {
  return rows.map((row) => {
    const match = nameIndex.get(normalize(row.item));
    return { ...row, present: Boolean(match), matchedName: match?.obj?.name ?? '' };
  });
}

function evaluateRows(rows = benchmark) {
  return rows.map((row) => {
    const match = nameIndex.get(normalize(row.item));
    if (!match) return { ...row, present: false, matchedName: '', pamWon: false, turns: null, sensibleQuestionPath: null, pathFlags: [], failureReason: 'missing_from_runtime_knowledge', path: [] };
    const { result, path: questionPath } = traceSelfPlay(engine, match.index);
    const flags = pathFlags(row, questionPath);
    const pamWon = result?.winner === 'pam';
    return {
      ...row,
      present: true,
      matchedName: match.obj.name,
      pamWon,
      turns: Number.isFinite(result?.turns) ? result.turns : questionPath.length,
      sensibleQuestionPath: flags.length === 0,
      pathFlags: flags,
      failureReason: pamWon ? '' : (result?.reason || 'not_guessed_within_20'),
      path: questionPath,
    };
  });
}

function aggregate(rows, key) {
  const out = {};
  for (const row of rows) {
    const label = row[key] || 'Unclassified';
    out[label] ||= { total: 0, present: 0, wins: 0, turnTotal: 0, turnCount: 0 };
    const b = out[label];
    b.total++;
    if (row.present) b.present++;
    if (row.pamWon) b.wins++;
    if (Number.isFinite(row.turns)) { b.turnTotal += row.turns; b.turnCount++; }
  }
  for (const b of Object.values(out)) {
    b.coverageRate = b.total ? b.present / b.total : 0;
    b.winRateOverall = b.total ? b.wins / b.total : 0;
    b.winRatePresent = b.present ? b.wins / b.present : 0;
    b.avgTurns = b.turnCount ? b.turnTotal / b.turnCount : null;
    delete b.turnTotal; delete b.turnCount;
  }
  return out;
}

function summarize(report) {
  const presentCount = report.filter((r) => r.present).length;
  const pamWinCount = report.filter((r) => r.pamWon).length;
  const failureClasses = {};
  for (const row of report) if (!row.pamWon) failureClasses[row.failureReason || 'unknown'] = 1 + (failureClasses[row.failureReason || 'unknown'] || 0);
  return {
    generatedAt: new Date().toISOString(),
    sourceRowCount: SOURCE_ROW_COUNT,
    uniqueCanonicalCount: UNIQUE_CANONICAL_COUNT,
    normalizationCollisions: NORMALIZATION_COLLISIONS,
    runtimeKnowledgeCount: engine.N,
    runtimeControlledCount: engine.meta?.controlledObjects ?? 0,
    runtimeFeatureCount: engine.F,
    presentCount,
    missingCount: report.length - presentCount,
    coverageRate: report.length ? presentCount / report.length : 0,
    pamWinCount,
    pamWinRateOverall: report.length ? pamWinCount / report.length : 0,
    pamWinRatePresent: presentCount ? pamWinCount / presentCount : 0,
    pathFlagCount: report.filter((r) => r.pathFlags.length).length,
    failureClasses,
    byTier: aggregate(report, 'tier'),
    byCategory: aggregate(report, 'category'),
    rows: report,
  };
}

function writeReport(summary) {
  const dir = path.join(ROOT, '.dev-data/mom-benchmark');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(summary, null, 2) + '\n');
  const csvCell = (value) => { const s = String(value ?? ''); return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
  const header = ['item','tier','category','present','pamWon','turns','sensibleQuestionPath','pathFlags','failureReason'];
  const lines = [header, ...summary.rows.map((r) => [r.item,r.tier,r.category,r.present,r.pamWon,r.turns ?? '',r.sensibleQuestionPath ?? '',r.pathFlags.join(' | '),r.failureReason])];
  fs.writeFileSync(path.join(dir, 'report.csv'), lines.map((row) => row.map(csvCell).join(',')).join('\n') + '\n');
}

let fullSummary = null;
function getFullSummary() {
  if (!fullSummary) { fullSummary = summarize(evaluateRows()); writeReport(fullSummary); }
  return fullSummary;
}

test('Mom benchmark fixture has the full curated gold set', () => {
  assert.equal(SOURCE_ROW_COUNT, 1082);
  assert.equal(benchmark.length, UNIQUE_CANONICAL_COUNT);
  assert.equal(UNIQUE_CANONICAL_COUNT, 1081);
  assert.equal(NORMALIZATION_COLLISIONS, 1);
});

test('Harder but fair is a populated Primary Category, not a tier', () => {
  const hard = benchmark.filter((r) => normalize(r.category) === 'harder but fair');
  assert.equal(hard.length, 15, 'expected all 15 Harder but fair category rows');
  assert.equal(benchmark.filter((r) => normalize(r.tier).includes('hard')).length, 0, 'Harder but fair must not be inferred from tier');
});

test('runtime coverage accounting is complete without self-play', () => {
  const rows = coverageRows();
  assert.equal(rows.length, 1081);
  assert.equal(rows.filter((r) => r.present).length + rows.filter((r) => !r.present).length, 1081);
});

test('full curated Mom benchmark evaluation', { skip: !RUN_FULL }, () => {
  const summary = getFullSummary();
  assert.equal(summary.rows.length, 1081);
  assert.equal(summary.presentCount + summary.missingCount, 1081);
  assert.ok(summary.byCategory['Harder but fair']?.total === 15);
});

test('Mom benchmark quality gate', { skip: !ENFORCE }, () => {
  const summary = getFullSummary();
  const rows = summary.rows;
  const core = rows.filter((r) => r.tier === 'Core' || r.tier === 'Core + Sweet Spot');
  const sweet = rows.filter((r) => r.tier === 'Sweet Spot' || r.tier === 'Core + Sweet Spot');
  const hard = rows.filter((r) => normalize(r.category) === 'harder but fair');
  for (const [name, group] of [['Core',core],['Sweet Spot',sweet],['Harder but fair',hard]]) assert.ok(group.length > 0, `${name} benchmark group is empty`);
  const coverage = (group) => group.filter((r) => r.present).length / group.length;
  const solvedPresent = (group) => { const present=group.filter((r) => r.present); return present.length ? present.filter((r) => r.pamWon).length / present.length : 0; };
  assert.ok(coverage(core) >= 0.90, `Core coverage ${(coverage(core)*100).toFixed(1)}% < 90%`);
  assert.ok(coverage(sweet) >= 0.85, `Sweet Spot coverage ${(coverage(sweet)*100).toFixed(1)}% < 85%`);
  assert.ok(coverage(hard) >= 0.80, `Harder but fair coverage ${(coverage(hard)*100).toFixed(1)}% < 80%`);
  assert.ok(solvedPresent(core) >= 0.90, `Core present-item win rate ${(solvedPresent(core)*100).toFixed(1)}% < 90%`);
  assert.ok(solvedPresent(sweet) >= 0.85, `Sweet Spot present-item win rate ${(solvedPresent(sweet)*100).toFixed(1)}% < 85%`);
  assert.ok(solvedPresent(hard) >= 0.80, `Harder but fair present-item win rate ${(solvedPresent(hard)*100).toFixed(1)}% < 80%`);
  assert.equal(summary.pathFlagCount, 0, `benchmark has ${summary.pathFlagCount} human-intent path violations`);
});
