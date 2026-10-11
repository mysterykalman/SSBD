import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const BENCHMARK_CANDIDATES = [
  path.join(ROOT, '.dev-data/mom-benchmark/benchmark.json'),
  path.join(ROOT, '.dev-data/mom-benchmark/benchmark.csv'),
  path.join(ROOT, 'test/fixtures/mom-benchmark.json'),
];

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('en')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ');
}

function loadScript(relPath, globalName) {
  const source = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = { globalThis: null, window: null, console };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: relPath });
  return sandbox[globalName];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function loadBenchmark() {
  for (const file of BENCHMARK_CANDIDATES) {
    if (!fs.existsSync(file)) continue;
    if (file.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(data) ? data : data.rows ?? [];
    }
    const rows = parseCsv(fs.readFileSync(file, 'utf8'));
    const [header, ...data] = rows;
    const idx = Object.fromEntries(header.map((h, i) => [normalize(h), i]));
    return data
      .filter((r) => r.some((v) => String(v).trim()))
      .map((r) => ({
        item: r[idx.item] ?? r[idx['canonical answer']] ?? r[1] ?? '',
        tier: r[idx.tier] ?? r[idx.difficulty] ?? '',
        category: r[idx['primary category']] ?? r[idx.category] ?? '',
        aliases: r[idx['alternate tags']] ?? r[idx.aliases] ?? '',
      }));
  }
  return [];
}

function getObjects() {
  const general = loadScript('src/client/mom-mode/knowledge.general.js', 'MOM_GENERAL_KNOWLEDGE')?.OBJECTS ?? [];
  const base = loadScript('src/client/mom-mode/knowledge.js', 'MOM_KNOWLEDGE')?.OBJECTS ?? [];
  const generated = loadScript('src/client/mom-mode/knowledge.generated.js', 'MOM_GENERATED_KNOWLEDGE')?.OBJECTS ?? [];
  return [...general, ...base, ...generated];
}

function buildNameIndex(objects) {
  const map = new Map();
  for (const obj of objects) {
    const names = [obj.name, ...(obj.aliases ?? [])].filter(Boolean);
    for (const name of names) {
      const key = normalize(name);
      if (!map.has(key)) map.set(key, obj);
    }
  }
  return map;
}

function tryCreateEngine() {
  try {
    const engineGlobal = loadScript('src/client/mom-mode/engine.js', 'MOM_ENGINE');
    return engineGlobal;
  } catch {
    return null;
  }
}

function simulateConcept(engineGlobal, targetName) {
  if (!engineGlobal) return { supported: false, reason: 'engine_unavailable' };
  const constructors = [
    engineGlobal.createEngine,
    engineGlobal.createGame,
    engineGlobal.Engine,
  ].filter((fn) => typeof fn === 'function');
  if (!constructors.length) return { supported: false, reason: 'engine_api_unknown' };

  // Harness intentionally does not guess at private engine internals. It records
  // presence now and provides a stable report shape for simulation once the engine
  // exposes a deterministic benchmark adapter.
  return { supported: false, reason: 'benchmark_adapter_not_exposed', targetName };
}

const benchmark = loadBenchmark();
const objects = getObjects();
const nameIndex = buildNameIndex(objects);
const engine = tryCreateEngine();

const report = benchmark.map((row) => {
  const item = String(row.item ?? row.name ?? '').trim();
  const aliases = String(row.aliases ?? row['alternate tags'] ?? '')
    .split(/[|;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const keys = [item, ...aliases].map(normalize);
  const match = keys.map((k) => nameIndex.get(k)).find(Boolean) ?? null;
  const sim = match ? simulateConcept(engine, item) : { supported: false, reason: 'missing_from_runtime_knowledge' };
  return {
    item,
    tier: row.tier ?? row.difficulty ?? '',
    category: row.category ?? row.primary_category ?? '',
    present: Boolean(match),
    matchedName: match?.name ?? '',
    turns: null,
    won: null,
    sensibleQuestionPath: null,
    failureReason: sim.supported ? '' : sim.reason,
  };
});

fs.mkdirSync(path.join(ROOT, '.dev-data/mom-benchmark'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, '.dev-data/mom-benchmark/report.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    benchmarkCount: benchmark.length,
    runtimeKnowledgeCount: objects.length,
    presentCount: report.filter((r) => r.present).length,
    missingCount: report.filter((r) => !r.present).length,
    simulationReady: report.some((r) => r.failureReason !== 'benchmark_adapter_not_exposed' && r.failureReason !== 'engine_api_unknown' && r.failureReason !== 'engine_unavailable'),
    rows: report,
  }, null, 2) + '\n',
);

if (benchmark.length) {
  test('Mom benchmark source is stable and complete', () => {
    assert.equal(benchmark.length, 1082, `Expected 1,082 benchmark concepts, found ${benchmark.length}`);
  });

  test('Mom benchmark produces a machine-readable coverage report', () => {
    assert.equal(report.length, 1082);
    assert.ok(report.every((r) => r.item));
    assert.ok(report.every((r) => typeof r.present === 'boolean'));
    assert.ok(report.every((r) => 'failureReason' in r));
  });

  test('Every benchmark concept is represented in the current runtime knowledge', () => {
    const missing = report.filter((r) => !r.present).map((r) => r.item);
    assert.deepEqual(missing, [], `Missing benchmark concepts: ${missing.slice(0, 40).join(', ')}${missing.length > 40 ? ` (+${missing.length - 40} more)` : ''}`);
  });
} else {
  test('Mom benchmark harness is installed', () => {
    assert.ok(true, 'Benchmark fixture is supplied by the benchmark workflow/artifact step.');
  });
}
