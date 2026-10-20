import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {pamTraitIndex} from './pam-classic-model.mjs';

// Applies only source-backed affirmative facts to explicitly unknown model cells.
// Existing known answers are immutable. Conflicts are recorded for review.
export async function applyVerifiedPamFacts(model){
 const url=new URL('../data/pam20q/enrichment/verified-facts.json',import.meta.url);
 const doc=JSON.parse(await readFile(fileURLToPath(url),'utf8'));
 if(doc.schemaVersion!==1)throw Error('Unsupported Pam verified-facts schema');
 const n=model.targets.length;
 const weights=Buffer.from(model.weights),knownMask=Buffer.from(model.knownMask);
 const lookup=new Map(model.targets.map((name,t)=>[name.toLowerCase(),t]));
 const applied=[],alreadyKnown=[],conflicts=[];
 for(const entry of doc.entries){
  const t=lookup.get(entry.target.toLowerCase());
  if(t===undefined)throw Error('Unknown verified Pam target: '+entry.target);
  if(!entry.source?.startsWith('https://'))throw Error('Missing HTTPS evidence for '+entry.target);
  for(const trait of entry.yes){
   const q=pamTraitIndex[trait];
   if(q===undefined)throw Error('Unknown verified trait '+trait);
   const cell=q*n+t;
   if(knownMask[cell]){
    if(weights[cell]===3)alreadyKnown.push({target:entry.target,trait,source:entry.source});
    else conflicts.push({target:entry.target,trait,existing:weights[cell],source:entry.source});
    continue;
   }
   knownMask[cell]=1;weights[cell]=3;
   applied.push({target:entry.target,trait,source:entry.source});
  }
 }
 return {...model,weights,knownMask,verifiedEnrichment:{applied,alreadyKnown,conflicts}};
}
