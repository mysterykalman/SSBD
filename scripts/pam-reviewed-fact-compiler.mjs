/**
 * Pam's future thematic facts: reviewed-only compiler.
 *
 * This does NOT mutate the frozen 1,775-target classic model and does not
 * magically approve facts imported from Wikidata. It is deliberately small:
 * an auditable 4-state + known-mask compiler for the *additional* names.
 *
 * Claims have domain-authored `field`, `value`, reviewer decision, source URL.
 * Defensible No is either an individually reviewed false fact or a reviewed
 * complete single-value domain. Missing properties are always UNKNOWN.
 */

export const KNOWN_STATES=Object.freeze({NO:2,YES:3});
const SOURCE=/^https:\/\/(www\.)?(wikidata\.org|wikipedia\.org|britannica\.com|nps\.gov|unesco\.org|imdb\.com|musicbrainz\.org|metmuseum\.org|moma\.org|louvre\.fr|nga\.gov|officialcharts\.com)\//i;
function normalize(v){return String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ');}
function pair(field,value){return normalize(field).toLocaleLowerCase('en')+'\u001f'+normalize(value).toLocaleLowerCase('en');}
function meaningful(value){return /^[\p{L}\p{N}][\p{L}\p{N} '’.,&/()-]+$/u.test(value);}
function sourceCheck(url){return typeof url==='string'&&SOURCE.test(url);}

/**
 * Each record:
 *  {id:'PAM-0001',subject_qid:'Q90', identity_reviewed:true,
 *   facts:[{field:'country',value:'France',truth:'yes',review_status:'approved',
 *     source:'https://www.wikidata.org/wiki/Q90',complete:true}, ...] }
 *
 * `complete:true` is an explicit review of a *single-choice domain*, e.g. a
 * historic film release year, and may be used for safe opposite values.
 * Multi-valued domains (occupation, artist, genre, nationality) are excluded
 * from automatic negative derivation, even when someone ticks `complete`.
 */
export const EXCLUSIVE_FIELDS=Object.freeze(new Set(['movie_release_decade','movie_release_year','country_geographic_region','city_present_day_country','painting_primary_medium','person_birth_decade']));
const RESERVED=new Set(['name','qid','id','title','initial','last_name','first_name','letter','length','alphabetical','wikidata_id']);
export function validateReviewedSubject(record){
 if(!record||!/^PAM-\d{4}$/.test(record.id||''))throw Error('Candidate ID required');
 if(!record.identity_reviewed)throw Error(`Unreviewed identity cannot provide Pam facts: ${record.id}`);
 if(!/^Q\d+$/.test(record.subject_qid||''))throw Error(`Verified subject QID required for ${record.id}`);
 if(!Array.isArray(record.facts))throw Error(`Facts array missing for ${record.id}`);
 const stored=new Map();
 for(const f of record.facts){
  if(f.review_status!=='approved')continue;
  const field=normalize(f.field),value=normalize(f.value),truth=f.truth;
  if(!field||!value||RESERVED.has(field.toLowerCase())||!meaningful(value))throw Error(`Bad/non-semantic fact ${field}: ${value}`);
  if(!['yes','no'].includes(truth))throw Error(`Approved fact must be explicitly true or false: ${record.id}`);
  if(!sourceCheck(f.source))throw Error(`Approved fact lacks trusted HTTPS source: ${record.id}`);
  const key=pair(field,value);
  if(stored.has(key)&&stored.get(key).truth!==truth)throw Error(`Contradictory approved facts for ${record.id}: ${key}`);
  stored.set(key,{field,value,truth,complete: f.complete===true,source:f.source});
 }
 // A single-choice domain cannot have two confirmed positives when declared
 // complete; that is an ambiguity to resolve, never quietly choose one.
 for(const field of EXCLUSIVE_FIELDS){
  const list=[...stored.values()].filter(x=>x.field===field&&x.truth==='yes'&&x.complete);
  if(list.length>1)throw Error(`Multiple complete ${field} values for ${record.id}`);
 }
 return stored;
}

/** Compiles selected approved questions into question-major matrices. */
export function compileReviewedEvidence(targets,records,questions){
 const targetIds=new Set(targets.map(t=>t.id));
 const byId=new Map();
 for(const record of records){
  if(!targetIds.has(record.id))throw Error(`Unknown candidate in verified fact set: ${record.id}`);
  if(byId.has(record.id))throw Error(`Duplicate verified record: ${record.id}`);
  byId.set(record.id,validateReviewedSubject(record));
 }
 const N=targets.length,F=questions.length;
 const weights=new Uint8Array(N*F),knownMask=new Uint8Array(N*F);
 for(let q=0;q<F;q++){
  const question=questions[q];
  if(!question||!normalize(question.text).endsWith('?')||!normalize(question.field)||!normalize(question.value))throw Error('Each question needs a meaningful, punctuated text and fact');
  if(question.text.length>145)throw Error('Question too long');
  const wanted=pair(question.field,question.value);
  for(let t=0;t<N;t++){
   const facts=byId.get(targets[t].id);if(!facts)continue;
   const direct=facts.get(wanted);
   if(direct){weights[q*N+t]=direct.truth==='yes'?3:2;knownMask[q*N+t]=1;continue;}
   // The ONLY automatically inferred No: reviewer explicitly confirmed a
   // complete, single-valued field whose value is different from the query.
   if(EXCLUSIVE_FIELDS.has(question.field)){
    const single=[...facts.values()].find(f=>f.field===question.field&&f.truth==='yes'&&f.complete);
    if(single&&pair(single.field,single.value)!==wanted){weights[q*N+t]=2;knownMask[q*N+t]=1;}
   }
  }
 }
 let known=0,yes=0,no=0;
 for(let i=0;i<knownMask.length;i++)if(knownMask[i]){known++;if(weights[i]===3)yes++;else if(weights[i]===2)no++;}
 return {N,F,weights,knownMask,summary:{approvedSubjectCount:byId.size,reviewedKnownCells:known,reviewedYes:yes,reviewedNo:no,unknownCells:N*F-known}};
}