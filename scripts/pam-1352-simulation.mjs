/**
 * Diagnostic lower-bound games against source-backed cells only.
 * Running these is essential before releasing anything, but the findings do
 * NOT certify production play: Wikidata facts and identities are unreviewed.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {oracleThematicGame} from './pam-thematic-reasoner.mjs';
export function buildDiagnosticModel(rows){
 if(!rows.length)throw Error('Empty diagnostic cluster');
 const targets=rows.map(x=>({id:x.id,name:x.name}));
 const thresholds=[...new Set(rows.map(x=>x.year).filter(y=>Number.isInteger(y)))].sort((a,b)=>a-b);
 const questions=[];
 for(const cutoff of thresholds){
  const known=new Uint8Array(rows.length),states=new Uint8Array(rows.length);
  let yes=0,no=0;
  for(let i=0;i<rows.length;i++){
   const year=rows[i].year;
   if(!Number.isInteger(year))continue;
   known[i]=1;
   if(year<cutoff){states[i]=3;yes++;}else{states[i]=2;no++;}
  }
  if(yes&&no)questions.push({id:'year_'+cutoff,field:'year_before',value:cutoff,
   text:'Did it originate before '+cutoff+'?',known,states});
 }
 // Positive-only claims are saved as documentation, but without validated
 // negative cells they cannot safely split a binary choice. No fact absent
 // from Wikidata may be guessed to be false.
 for(const key of new Set(rows.flatMap(x=>x.positives.filter(f=>f.kind==='item').map(f=>f.field+':'+f.qid)))){
  const [field,qid]=key.split(':');
  const known=new Uint8Array(rows.length),states=new Uint8Array(rows.length);
  let yes=0;
  for(let i=0;i<rows.length;i++){
   if(rows[i].positives.some(f=>f.kind==='item'&&f.field===field&&f.qid===qid)){
    known[i]=1;states[i]=3;yes++;
   }
  }
  if(yes>0&&yes<rows.length)questions.push({id:key,field,value:qid,
   text:'Source reports '+field+' '+qid+'?',known,states,diagnosticOnly:true});
 }
 return {targets,questions};
}
export function simulateSourceCohort(audit){
 if(audit.status!=='SOURCE_EVIDENCE_REVIEW_ONLY'||audit.summary.activeCount!==1352)
  throw Error('Only full unapproved research can be diagnosed');
 const byCluster=new Map();
 for(const p of audit.profiles){
  const key=p.category+' / '+p.subcategory;
  if(!byCluster.has(key))byCluster.set(key,[]);
  byCluster.get(key).push(p);
 }
 const categories=[];
 let played=0,exact=0,soft=0,questionless=0;
 for(const [cluster,rows] of [...byCluster].sort(([a],[b])=>a.localeCompare(b))){
  const model=buildDiagnosticModel(rows);
  let passed=0,passedSoft=0,noQuestion=0,turnSum=0;
  for(let i=0;i<rows.length;i++){
   const out=oracleThematicGame(model,i);
   const softened=oracleThematicGame(model,i,{softAt:[3]});
   if(out.correct)passed++;
   if(softened.correct)passedSoft++;
   if(out.kind==='insufficient_evidence')noQuestion++;
   turnSum+=out.turns;
  }
  categories.push({cluster,targets:rows.length,sourceQuestions:model.questions.length,
   exactCorrect:passed,softCorrect:passedSoft,
   noQuestionGames:noQuestion,averageTurns:Number((turnSum/rows.length).toFixed(2))});
  played+=rows.length;exact+=passed;soft+=passedSoft;questionless+=noQuestion;
 }
 if(played!==1352)throw Error('Diagnostic did not cover all 1352');
 return{status:'RESEARCH_DIAGNOSTIC_NOT_GAMEPLAY_APPROVAL',
  all:played,exactCorrect:exact,softCorrect:soft,
  exactPct:Number((exact/played*100).toFixed(2)),
  softPct:Number((soft/played*100).toFixed(2)),
  insufficientEvidence:questionless,
  caution:'Isolated semantic clusters, unverified research labels, source-positive or date-backed only. Not representative of live original 1775 target integration.',
  categories};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [path,out]=process.argv.slice(2);
 if(!path||!out)throw Error('Usage: node scripts/pam-1352-simulation.mjs <audit.json> <result.json>');
 const audit=JSON.parse(await readFile(path,'utf8'));
 const result=simulateSourceCohort(audit);
 await writeFile(out,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}
