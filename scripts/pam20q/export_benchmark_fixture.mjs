import fs from 'node:fs';
import {loadBenchmarkRows, UNIQUE_CANONICAL_COUNT} from '../../test/fixtures/mom-benchmark-data.mjs';

const out = process.argv[2] || '.dev-data/pam20q/benchmark-fixture.json';
const rows = loadBenchmarkRows();
const seen = new Set();
const unique = [];
for (const row of rows) {
  const key = String(row.item ?? '').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[’‘]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(row);
}
if (unique.length !== UNIQUE_CANONICAL_COUNT) throw new Error(`expected ${UNIQUE_CANONICAL_COUNT} unique rows, got ${unique.length}`);
fs.mkdirSync(new URL('../../.dev-data/pam20q/', import.meta.url), {recursive: true});
fs.writeFileSync(out, JSON.stringify(unique));
console.log(JSON.stringify({sourceRows: rows.length, benchmarkConcepts: unique.length, output: out}, null, 2));
