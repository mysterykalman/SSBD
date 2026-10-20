/**
 * Provenance-preserving identity-review queue from Wikidata search evidence.
 * No candidate QID or fact is approved automatically. This is an intermediate
 * research data product, not a player-facing model or gameplay input.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {brotliDecompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadThematicRoster} from './pam-thematic-lab.mjs';
import {rankCandidates,matchSuggestion} from './pam-wikidata-reconcile.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const dir=join(root,'data','pam20q','expansion');
const sourcePath=join(dir,'wikidata-550-source.br.b64');
const manifestPath=join(dir,'wikidata-550-manifest.json');
const hash=x=>createHash('sha256').update(x).digest('hex');

export async function loadRecovered550(){
 const [encoded,manifestText]=await Promise.all([readFile(sourcePath,'utf8'),readFile(manifestPath,'utf8')]);
 const raw=brotliDecompressSync(Buffer.from(encoded.trim(),'base64'));
 const manifest=JSON.parse(manifestText);
 if(manifest.sha256!==hash(raw))throw Error('Wikidata source evidence integrity mismatch');
 const result=JSON.parse(raw.toString('utf8'));
 if(result.results.length!==550||result.completed!==550)throw Error('Expected 550 existing research rows');
 if(result.status!=='research_candidates_only')throw Error('Unexpected source approval state');
 return result;
}

export function buildIdentityReview(roster,sourceDocs,{strict=true}={}){
 const expected=new Map(roster.map(t=>[t.id,t]));
 const results=[],ids=new Set(),dupes=[];
 for(const doc of sourceDocs){
  if(!Array.isArray(doc.results)||doc.status!=='research_candidates_only')throw Error('Research doc shape invalid');
  for(const raw of doc.results){
   const target=expected.get(raw.id);
   if(!target||target.name!==raw.name||target.category!==raw.category)throw Error('Research lookup mismatches frozen target '+raw.id);
   if(ids.has(raw.id)){dupes.push(raw.id);continue;}
   ids.add(raw.id);
   const candidates=rankCandidates(target,(raw.suggested_candidates||[]).map(x=>({id:x.qid,label:x.label,description:x.description})));
   const status=raw.status==='source_error'?'source_error':matchSuggestion(target,candidates);
   results.push({id:target.id,name:target.name,category:target.category,
    subcategory:target.subcategory,context:target.context,status,
    qid_suggestion:candidates[0]?.qid||null,reviewed:false,
    reviewed_qid:null,
    top_score:candidates[0]?.score??null,
    score_margin:candidates.length>=2?candidates[0].score-candidates[1].score:null,
    suggested_candidates:candidates});
  }
 }
 if(strict&&dupes.length)throw Error('Duplicate source rows '+dupes.join(','));
 results.sort((a,b)=>a.id.localeCompare(b.id));
 const byCategory={},qidReferences=new Map();
 for(const row of results){
  const count=byCategory[row.category]??={researched:0,plausible:0,ambiguous:0,notFound:0,sourceErrors:0};
  count.researched++;
  if(row.status==='single_plausible_not_verified')count.plausible++;
  else if(row.status==='ambiguous_needs_review')count.ambiguous++;
  else if(row.status==='not_found')count.notFound++;
  else count.sourceErrors++;
  if(row.qid_suggestion){const arr=qidReferences.get(row.qid_suggestion)||[];arr.push(row.id);qidReferences.set(row.qid_suggestion,arr);}
 }
 const reviewed=results.filter(x=>x.reviewed).length;
 if(reviewed>0)throw Error('Unverified research must never mark identities approved');
 const duplicateQids=[...qidReferences].filter(([,list])=>list.length>1).map(([qid,list])=>({qid,targets:list}));
 return {review_status:'IDENTITY_RESEARCH_ONLY',
  total_targets:roster.length,retrieved:results.length,missing:roster.length-results.length,
  source_docs:sourceDocs.map(x=>({completed:x.completed,generated_at:x.generated_at})),
  byCategory,counts:{plausible:results.filter(x=>x.status==='single_plausible_not_verified').length,
   ambiguous:results.filter(x=>x.status==='ambiguous_needs_review').length,
   missing:results.filter(x=>x.status==='not_found').length,
   sourceErrors:results.filter(x=>x.status==='source_error').length,
   identityApprovals:0},duplicateQids,results,
  releaseGate:'BLOCKED: QID suggestions are not factually approved, complete verified question profiles and 20-turn games are still required'};
}

const csvEsc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
export async function createReviewQueue(sources){
 const roster=await loadThematicRoster();
 const review=buildIdentityReview(roster,sources);
 await mkdir(dir,{recursive:true});
 await writeFile(join(dir,'wikidata-identity-review.json'),JSON.stringify(review,null,2)+'\n');
 const rows=[['id','name','category','subcategory','context','research_status','qid_suggestion','qid_url','score','score_margin','human_reviewed']];
 for(const x of review.results)rows.push([x.id,x.name,x.category,x.subcategory,x.context,x.status,x.qid_suggestion,
  x.qid_suggestion?`https://www.wikidata.org/wiki/${x.qid_suggestion}`:null,x.top_score,x.score_margin,'NO']);
 await writeFile(join(dir,'wikidata-identity-review.csv'),rows.map(row=>row.map(csvEsc).join(',')).join('\n')+'\n');
 return review;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const source=await loadRecovered550();
 const files=process.argv.slice(2);
 const others=await Promise.all(files.map(p=>readFile(p,'utf8').then(x=>JSON.parse(x))));
 const r=await createReviewQueue([source,...others]);
 console.log(JSON.stringify({researched:r.retrieved,missing:r.missing,counts:r.counts,duplicateQids:r.duplicateQids.length,byCategory:r.byCategory},null,2));
}