/** Extract candidate positive facts with first-party Wikidata entity provenance.
 *  Research-only. NEVER turn a blank property into no, or assert matching is approved.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {wikidataFetch} from './pam-wikidata-reconcile.mjs';
const root=join(fileURLToPath(new URL('.',import.meta.url)),'..','data','pam20q','expansion');
export const CLAIMS=Object.freeze({
 P17:'country',P495:'country_of_origin',P27:'citizenship',P19:'birthplace',
 P106:'occupation',P136:'genre',P569:'birth_date',P570:'death_date',
 P577:'release_date',P571:'inception_date',P170:'creator',P50:'author',
 P86:'composer',P175:'performer',P740:'formation_location',
 P131:'administrative_location',P36:'capital',P166:'award',P1412:'languages_spoken'
});
export function extractClaimFacts(entity){
 const out=[];
 for(const [pid,role] of Object.entries(CLAIMS)){
  const claims=entity.claims?.[pid]||[];
  for(const claim of claims){
   if(claim.rank==='deprecated')continue;
   const main=claim.mainsnak;
   if(main?.snaktype!=='value'||!main.datavalue?.value)continue;
   const val=main.datavalue.value;
   if(typeof val.id==='string'&&/^Q\d+$/.test(val.id)){
    out.push({property:pid,field:role,kind:'item',value_id:val.id,source:`https://www.wikidata.org/wiki/${entity.id}#${pid}`,claim_id:claim.id||null,status:'source_claim_unreviewed'});
   }else if(typeof val.time==='string'){
    // Dates can be approximate or uncertain. Save the source string/precision;
    // do not collapse into 'born in year X' without checking precision.
    out.push({property:pid,field:role,kind:'time',value_time:val.time,precision:val.precision,source:`https://www.wikidata.org/wiki/${entity.id}#${pid}`,claim_id:claim.id||null,status:'source_claim_unreviewed'});
   }
  }
 }
 return out;
}
/** Resolve related QIDs to human-readable names; these are reference labels, not proof. */
export async function labelFactObjects(subjects,{fetchImpl=fetch}={}){
 const ids=[...new Set(subjects.flatMap(subject=>subject.claims.filter(claim=>claim.kind==='item').map(claim=>claim.value_id)))];
 const labels={};
 for(let i=0;i<ids.length;i+=45){
  const selected=ids.slice(i,i+45);
  try{
   const response=await wikidataFetch({action:'wbgetentities',ids:selected.join('|'),props:'labels|descriptions',languages:'en',format:'json',formatversion:2},{fetchImpl});
   for(const [qid,entity] of Object.entries(response.entities||{})){
    if(entity.missing||!entity.labels?.en?.value)continue;
    labels[qid]={name:entity.labels.en.value,description:entity.descriptions?.en?.value||null};
   }
  }catch(error){
   // A failed label API is a reference gap, not a negative fact.
   process.stderr.write(`Could not label Wikidata batch ${i/45+1}: ${String(error).slice(0,160)}\n`);
  }
 }
 for(const subject of subjects){
  for(const claim of subject.claims){
   if(claim.kind==='item'){
    const match=labels[claim.value_id];
    claim.value_label=match?.name||null;
    claim.value_description=match?.description||null;
    claim.value_label_status=match?'wikidata_label_unreviewed':'label_missing';
   }
  }
 }
 return {subjects,linkedEntityCount:ids.length,labeledEntityCount:Object.keys(labels).length};
}
export async function retrieveFactCandidates(doc,{fetchImpl=fetch,includeValueLabels=false}={}){
 const single=doc.results.filter(x=>x.status==='single_plausible_not_verified'&&x.suggested_candidates?.[0]?.qid);
 const ids=[...new Set(single.map(x=>x.suggested_candidates[0].qid))];
 const entities={};
 for(let start=0;start<ids.length;start+=40){
  const idsBatch=ids.slice(start,start+40).join('|');
  const response=await wikidataFetch({action:'wbgetentities',ids:idsBatch,props:'claims|labels|descriptions',languages:'en',format:'json',formatversion:2},{fetchImpl});
  Object.assign(entities,response.entities||{});
 }
 const suggestions=single.map(x=>{
  const qid=x.suggested_candidates[0].qid;
  const subject=entities[qid];
  return {id:x.id,name:x.name,category:x.category,qid,match_status:x.status,
   entity_label:subject?.labels?.en?.value??null,entity_description:subject?.descriptions?.en?.value??null,
   reviewed:false,claims:subject?extractClaimFacts(subject):[]};
 });
 let labels={linkedEntityCount:0,labeledEntityCount:0};
 if(includeValueLabels)labels=await labelFactObjects(suggestions,{fetchImpl});
 return {review_status:'research_only_unverified',subject_count:suggestions.length,label_metrics:{referenced_qids:labels.linkedEntityCount,resolved_labels:labels.labeledEntityCount},subjects:suggestions};
}
async function main(){
 const doc=JSON.parse(await readFile(join(root,'wikidata-suggestion-sample.json'),'utf8'));
 const facts=await retrieveFactCandidates(doc,{includeValueLabels:true});
 facts.source='https://www.wikidata.org/';
 facts.generated_at=new Date().toISOString();
 await writeFile(join(root,'wikidata-facts-suggested.json'),JSON.stringify(facts,null,2)+'\n');
 console.log(JSON.stringify({subjects:facts.subject_count,claims:facts.subjects.reduce((n,x)=>n+x.claims.length,0),labels:facts.label_metrics,review_status:facts.review_status}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])await main();