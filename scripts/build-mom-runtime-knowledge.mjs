import fs from 'node:fs';
import path from 'node:path';
import {TRAITS} from './mom-controlled-traits.mjs';
import {compileMomRuntimeKnowledge} from './mom-runtime-compiler.mjs';
import {loadMomRuntimeSupplements} from './load-mom-runtime-supplements.mjs';

const ROOT = process.cwd();
const INVENTORY = path.resolve(ROOT, process.env.MOM_RUNTIME_INVENTORY || '.dev-data/mom-playable-50k/playable_50k.jsonl');
const PROFILES = path.resolve(ROOT, process.env.MOM_RUNTIME_PROFILES || '.dev-data/mom-controlled-profiles/mom-controlled-profiles.json');
const OUT_DIR = path.resolve(ROOT, process.env.MOM_RUNTIME_OUT_DIR || '.dev-data/mom-runtime');
const OUT = path.join(OUT_DIR, process.env.MOM_RUNTIME_OUT_FILE || 'knowledge.runtime.json');

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

if (!fs.existsSync(INVENTORY)) throw new Error(`Missing playable 50k inventory: ${INVENTORY}`);
if (!fs.existsSync(PROFILES)) throw new Error(`Missing controlled profiles: ${PROFILES}`);

const inventory = readJsonl(INVENTORY);
const profileFile = JSON.parse(fs.readFileSync(PROFILES, 'utf8'));
const profiles = Array.isArray(profileFile.objects) ? profileFile.objects : [];
if (!profiles.length) throw new Error('Controlled profile artifact contains no objects.');
const supplements = loadMomRuntimeSupplements(ROOT);

const runtime = compileMomRuntimeKnowledge({
  inventory,
  profiles,
  traits: Array.isArray(profileFile.traits) && profileFile.traits.length ? profileFile.traits : TRAITS,
  supplements,
  generatedAt: 'deterministic'
});

fs.mkdirSync(OUT_DIR, {recursive:true});
fs.writeFileSync(OUT, JSON.stringify(runtime) + '\n');
console.log(JSON.stringify({
  output: path.relative(ROOT, OUT),
  concepts: runtime.meta.conceptCount,
  questions: runtime.meta.questionCount,
  aliases: Object.keys(runtime.aliases).length,
  supplements: supplements.map(s=>s.source),
  sourceHash: runtime.meta.sourceHash
}, null, 2));
