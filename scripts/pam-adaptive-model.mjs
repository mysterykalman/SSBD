import {enrichCanonicalPamQuestions} from './pam-adaptive-canonical-enrichment.mjs';
import {generatePamFactQuestions} from './pam-adaptive-predicates.mjs';
import {readFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..','data','pam20q','adaptive');
const EXTRA_QUESTIONS=332;
const EXTRA_TARGETS=1509;
const STATUS=Object.freeze({Y:3,N:2,P:1,U:0});

export async function loadPamAdaptiveModel(loadOriginalModel){
 const original=await loadOriginalModel();
 const [questionDoc,...answerDocs]=await Promise.all([
  readFile(join(ROOT,'questions-332.json'),'utf8').then(JSON.parse),
  ...[1,2,3,4,5].map(i=>readFile(join(ROOT,'answers-'+String(i).padStart(2,'0')+'.json'),'utf8').then(JSON.parse))
 ]);
 if(questionDoc.schemaVersion!==1||questionDoc.questions?.length!==EXTRA_QUESTIONS)throw Error('Invalid adaptive question catalogue');
 const ids=new Set(),labels=new Set(),rows=[];
 for(let i=0;i<answerDocs.length;i++){
  const doc=answerDocs[i];
  if(doc.schemaVersion!==1||doc.start!==rows.length+1)throw Error('Out-of-order adaptive answer part '+i);
  for(const row of doc.rows){
   if(!Array.isArray(row)||row.length!==4||!/^[YNPU]{332}$/.test(row[3]))throw Error('Invalid adaptive vector');
   if(ids.has(row[0]))throw Error('Duplicate adaptive answer ID '+row[0]);
   ids.add(row[0]);rows.push(row);
  }
 }
 if(rows.length!==EXTRA_TARGETS)throw Error('Expected 1509 expansion records, got '+rows.length);
 const metadataDocs=await Promise.all([1,2,3,4,5].map(i=>readFile(join(ROOT,'metadata-'+String(i).padStart(2,'0')+'.json'),'utf8').then(JSON.parse)));
 const metadataRows=[];
 for(const doc of metadataDocs){
  if(doc.schemaVersion!==1||doc.start!==metadataRows.length+1)throw Error('Out-of-order adaptive metadata part');
  metadataRows.push(...doc.rows);
 }
 const canonical=enrichCanonicalPamQuestions(rows,metadataRows,questionDoc);
 const generated=generatePamFactQuestions(rows,metadataRows);
 const oldN=original.targets.length,oldF=original.questions.length,N=oldN+rows.length,F=oldF+EXTRA_QUESTIONS+generated.questions.length;
 if(oldN!==1775||oldF!==156)throw Error('Unexpected original Pam dimensions');
 const questions=[...original.questions,...questionDoc.questions.map(q=>q.text),...generated.questions.map(q=>q.text)];
 const targets=[...original.targets,...rows.map(r=>r[1])];
 const weights=Buffer.alloc(N*F,0),knownMask=Buffer.alloc(N*F,0);
 for(let q=0;q<oldF;q++){
  for(let t=0;t<oldN;t++){
   const oldPos=q*oldN+t,newPos=q*N+t;
   weights[newPos]=original.weights[oldPos];
   knownMask[newPos]=original.knownMask?.[oldPos]??1;
  }
 }
 // Original category routing has four choices; current expansion entities
 // (cities, places, people, media, brands) route to Other in the classic UI.
 // Do not infer the other 152 classic question answers for these entities.
 for(let i=0;i<rows.length;i++){
  const t=oldN+i,category=rows[i][2];
  const oldClass=category==='Animals'?'animal':category==='Plants'?'vegetable':'other';
  for(let q=0;q<4;q++){
   const pos=q*N+t;weights[pos]=q===({animal:0,vegetable:1,mineral:2,other:3}[oldClass])?3:2;knownMask[pos]=1;
  }
  for(let q=0;q<EXTRA_QUESTIONS;q++){
   const state=canonical.vectors[i][q],pos=(oldF+q)*N+t;
   if(state!=='U'){weights[pos]=STATUS[state];knownMask[pos]=1}
  }
 }
 for(let q=0;q<generated.questions.length;q++){
  const answers=generated.questions[q].states,questionIndex=oldF+EXTRA_QUESTIONS+q;
  for(let i=0;i<rows.length;i++){
   const state=answers[i];if(state==='U')continue;
   const pos=questionIndex*N+oldN+i;
   knownMask[pos]=1;weights[pos]=STATUS[state];
  }
 }
 const route=category=>{
  if(['People'].includes(category))return 'person';
  if(['Cities','Countries','Landmarks'].includes(category))return 'place';
  if(['Movies','TV Shows','Music Groups','Musicals'].includes(category))return 'entertainment';
  if(['Animals','Plants'].includes(category))return 'animal_plant';
  if(['Brands','Car Companies','Art & Monuments'].includes(category))return 'other';
  return 'object';
 };
 const routingCategories=[];
 for(let t=0;t<oldN;t++){
  const categoryStates=[0,1,2,3].map(q=>original.weights[q*oldN+t]);
  const selected=categoryStates.indexOf(3);
  routingCategories.push(selected===0||selected===1?'animal_plant':selected===2?'object':'object');
 }
 for(const row of rows)routingCategories.push(route(row[2]));
 return {...original,questions,targets,weights,knownMask,routingCategories,
  adaptive:{originalTargets:oldN,expansionTargets:rows.length,originalQuestions:oldF,expansionQuestions:EXTRA_QUESTIONS,generatedQuestions:generated.questions.length,generatedTopics:generated.questions.map(q=>({id:q.id,text:q.text,origin:q.origin})),
   answeredExpansionCells:canonical.vectors.reduce((n,v)=>n+v.replace(/U/g,'').length,0),canonicalAdded:canonical.patches.length,canonicalConflicts:canonical.conflicts.length}
 };
}
