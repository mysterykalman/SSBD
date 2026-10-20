// Conservative, reproducible population of logically implied Pam trait answers.
// Usage: node scripts/populate-pam-answers.mjs [--write]
// Without --write, emit proposals only. Never infer a "no" from an unknown.
import {readFile,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';
import {pamTraitIndex} from './pam-classic-model.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const dir=join(root,'data','pam20q','quality');
const paths=[1,2,3,4].map(i=>join(dir,`quality-375.part${i}`));
const original=(await Promise.all(paths.map(p=>readFile(p,'utf8')))).join('').trim();
const doc=JSON.parse(gunzipSync(Buffer.from(original,'base64')).toString('utf8'));
if(doc.count!==375||doc.profiles.length!==375)throw Error('Unexpected quality target count');

// All relationships below are necessary implications, not statistical guesses.
// A single weakYes is never promoted to a hard yes.
const implications={
 mammal:['warmBlood','spine','living','alive','organic'],
 feathers:['wings','animal','alive','living','organic'],
 hooves:['mammal','spine','warmBlood','alive','living','organic'],
 paws:['feet'],
 insect:['alive','living','organic'],
 bird:['feathers','wings','alive','living','organic'],
 rodent:['mammal','warmBlood','spine','alive','living','organic'],
 fish:['spine','alive','living','organic'],
 carnivore:['eat'],
 herbivore:['eat'],
 roots:['organic'],
};
for(const [k,vs] of Object.entries(implications)){
 if(pamTraitIndex[k]===undefined)throw Error(`Unknown trigger ${k}`);
 for(const v of vs)if(pamTraitIndex[v]===undefined && v!=='animal' && v!=='bird')throw Error(`Unknown consequent ${v}`);
}
const proposals=[],conflicts=[];
for(const p of doc.profiles){
 const yes=new Set(p.yes||[]),no=new Set(p.no||[]),weak=new Set(p.weakYes||[]);
 const pending=[...yes],visited=new Set();
 while(pending.length){
  const trigger=pending.shift();
  if(visited.has(trigger))continue;
  visited.add(trigger);
  for(const implied of implications[trigger]||[]){
   if(implied==='animal'||implied==='bird')continue; // category is separately encoded
   if(no.has(implied)||weak.has(implied)){
    conflicts.push({target:p.name,trigger,implied,existing:no.has(implied)?'no':'weakYes'});
    continue;
   }
   if(yes.has(implied))continue;
   proposals.push({target:p.name,trigger,trait:implied,answer:'yes',evidence:'logical implication'});
   yes.add(implied);
   pending.push(implied);
  }
 }
 if(process.argv.includes('--write')&&conflicts.every(c=>c.target!==p.name)){
  p.yes=[...yes].sort();
 }
}
const report={targets:doc.profiles.length,proposedAnswers:proposals.length,conflicts:conflicts.length,proposals,conflictDetails:conflicts};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--write')){
 if(conflicts.length)throw Error('Refusing to write: resolve contradictory inferred attributes first');
 const encoded=gzipSync(Buffer.from(JSON.stringify(doc))).toString('base64');
 const size=Math.ceil(encoded.length/4);
 await Promise.all(paths.map((p,i)=>writeFile(p,encoded.slice(i*size,(i+1)*size),'utf8')));
}
