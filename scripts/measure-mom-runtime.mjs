import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createMomRuntimeGame} from '../src/shared/mom-runtime-game.js';

const ROOT=process.cwd();
const input=path.join(ROOT,'.dev-data','mom-runtime','knowledge.runtime.json');
if(!fs.existsSync(input))throw new Error('Missing compact Mom runtime; build it first.');
const raw=fs.readFileSync(input,'utf8');
const rawBytes=Buffer.byteLength(raw);
const gzipBytes=gzipSync(raw,{level:9}).byteLength;

const parseStart=performance.now();
const runtime=JSON.parse(raw);
const parseMs=performance.now()-parseStart;
const initStart=performance.now();
const api=createMomRuntimeGame(runtime);
const initMs=performance.now()-initStart;
const chooseStart=performance.now();
const firstAction=api.choose();
const firstQuestionMs=performance.now()-chooseStart;

const result={
  sourceHash:runtime.meta?.sourceHash||'',
  conceptCount:runtime.meta?.conceptCount||runtime.concepts.length,
  questionCount:runtime.meta?.questionCount||runtime.questions.length,
  rawBytes,
  gzipBytes,
  rawMiB:Number((rawBytes/1024/1024).toFixed(3)),
  gzipMiB:Number((gzipBytes/1024/1024).toFixed(3)),
  parseMs:Number(parseMs.toFixed(2)),
  initMs:Number(initMs.toFixed(2)),
  firstQuestionMs:Number(firstQuestionMs.toFixed(2)),
  firstAction:firstAction?.kind||null
};
const out=path.join(ROOT,'.dev-data','mom-runtime','metrics.json');
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
