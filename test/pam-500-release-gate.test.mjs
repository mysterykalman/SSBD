import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';

const path='data/pam20q/quality/quality-500.json';
const doc=existsSync(path)?JSON.parse(await readFile(path,'utf8')):null;
const probe="import {loadPamClassicModel} from './scripts/pam-classic-model.mjs';import {loadPamExpandedModel} from './scripts/pam-quality-model.mjs';const m=await loadPamExpandedModel(loadPamClassicModel);console.log(m.targets.length);";

function childModelCount(allowUnreviewed,vercelEnvironment){
 const env={...process.env};
 if(allowUnreviewed)env.PAM_ALLOW_UNREVIEWED_500='1';
 else delete env.PAM_ALLOW_UNREVIEWED_500;
 if(vercelEnvironment)env.VERCEL_ENV=vercelEnvironment;
 else delete env.VERCEL_ENV;
 const p=spawnSync(process.execPath,['--input-type=module','-e',probe],{cwd:process.cwd(),env,encoding:'utf8',timeout:30000});
 assert.equal(p.status,0,p.stderr||p.error?.message||'Pam model process failed');
 const lines=p.stdout.trim().split(/\r?\n/);
 return Number(lines.at(-1));
}

test('normal builds never import unreviewed Pam 500 candidates',()=>{
 const expected=doc?.review_status==='approved'?2275:1775;
 assert.equal(childModelCount(false),expected);
});
test('Vercel production ignores the candidate-testing override',()=>{
 if(!doc)return;
 assert.equal(childModelCount(true,'production'),doc.review_status==='approved'?2275:1775);
});
test('explicit validation environment loads exactly 2275 candidates',()=>{
 if(!doc)return;
 assert.equal(childModelCount(true),2275);
});
