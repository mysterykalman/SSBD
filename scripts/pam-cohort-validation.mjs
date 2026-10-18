/**
 * Whole-cohort, provenance-preserving Pam evidence analysis.
 *
 * This module deliberately separates source claims from editorial approvals.
 * A claim and an identity lookup are useful inputs; neither is a reviewed
 * statement suitable for shipping. Missing Wikidata properties are UNKNOWN.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MOVIE_FRANCHISES} from './pam-movie-franchise-review.mjs';
const QID=/^Q[1-9]\d*$/;
const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('en').replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const distinct=arr=>[...new Set(arr)];
const idMap=new Map();
for(const [franchise,titles] of Object.entries(MOVIE_FRANCHISES)){
 for(const title of titles){
  const n=normalize(title);
  if(idMap.has(n))throw Error('Duplicate curated franchise title: '+title);
  idMap.set(n,franchise);
 }
}
const preferred={
 'Jurassic Park':'Jurassic Park',
 'Batman':'The Dark Knight',
 'Star Wars':'Star Wars',
 'The Lord of the Rings':'The Lord of the Rings: The Fellowship of the Ring',
 'Toy Story':'Toy Story','Shrek':'Shrek','The Godfather':'The Godfather',
 'Back to the Future':'Back to the Future','Indiana Jones':'Raiders of the Lost Ark',
 'Avatar':'Avatar','The Matrix':'The Matrix','Spider-Man':'Spider-Man: Into the Spider-Verse',
 'Frozen':'Frozen','Finding Nemo':'Finding Nemo','The Lion King':'The Lion King'
};
const CATEGORY_PROPERTIES=Object.freeze({
 'Movies':['film_director','genre','country_of_origin','original_language','cast_member','release_date','series'],
 'TV Shows':['genre','country_of_origin','original_language','inception_date','performer'],
 'Musicals':['composer','author','creator','inception_date','country_of_origin'],
 'Bands & Music Groups':['genre','country_of_origin','formation_location','inception_date','member_of'],
 'People':['occupation','citizenship','birthplace','birth_date','field_of_work','award'],
 'Cities':['country','continent','administrative_location'],
 'Countries':['continent','official_language','currency','capital'],
 'Landmarks':['country','continent','creator','architecture_style','current_location'],
 'Monuments, Paintings & Sculptures':['creator','country','material','depicts','movement','current_location','inception_date'],
 'Brands':['country_of_origin','industry','founder','inception_date','headquarters_location'],
 'Car Companies':['country_of_origin','founder','inception_date','headquarters_location']
});
const DATE_FIELD=Object.freeze({
 Movies:'release_date',People:'birth_date','TV Shows':'inception_date',
 'Bands & Music Groups':'inception_date',Brands:'inception_date',
 'Car Companies':'inception_date',Musicals:'inception_date'
});
function claimValue(claim){
 if(claim.kind==='item'&&QID.test(claim.value_id||''))return claim.value_id;
 if(claim.kind==='time'&&typeof claim.value_time==='string')return claim.value_time;
 return null;
}
function sourceClaims(subject){
 const accepted=new Map();
 for(const c of subject?.claims||[]){
  if(c.status!=='source_claim_unreviewed'||!/^P\d+$/.test(c.property||'')||c.rank==='deprecated')continue;
  const value=claimValue(c);
  if(!value||typeof c.source!=='string'||!c.source.startsWith('https://www.wikidata.org/wiki/'))continue;
  if(!accepted.has(c.field))accepted.set(c.field,[]);
  accepted.get(c.field).push({value,kind:c.kind,property:c.property,claim_id:c.claim_id||null,source:c.source,precision:c.precision??null,point_in_time:c.point_in_time||null});
 }
 return accepted;
}
function knownYear(claims,field){
 const times=(claims.get(field)||[]).filter(c=>c.kind==='time'&&c.precision>=9);
 const years=distinct(times.map(c=>Number(/^[+]?(\d{4})-/.exec(c.value)?.[1])).filter(y=>y>=1000&&y<=2099));
 return years.length===1?years[0]:null;
}
function movieFranchise(row,claims){
 const curated=idMap.get(normalize(row.name));
 if(curated)return {id:'curated:'+curated,label:curated};
 const series=distinct((claims.get('series')||[]).filter(c=>c.kind==='item').map(c=>c.value));
 if(series.length===1)return {id:'wikidata:'+series[0],label:'Wikidata series '+series[0]};
 return null;
}
function chooseKeeper(group){
 const known=preferred[group[0].franchise?.label];
 if(known){
  const match=group.find(x=>normalize(x.name)===normalize(known));
  if(match)return match.id;
 }
 // A sole or ambiguous franchise representative is not cleared automatically.
 return null;
}
export function auditPamCohort(queue,facts,{originalNames=[],labels={}}={}){
 if(queue?.review_status!=='IDENTITY_RESEARCH_ONLY'||queue.results?.length!==1650)throw Error('Expected full frozen 1650 identity review');
 if(facts?.status!=='RESEARCH_CLAIMS_UNREVIEWED'||!Array.isArray(facts.subjects))throw Error('Expected provenance-marked research claims');
 const active=queue.results.filter(r=>r.status==='single_plausible_not_verified');
 const paused=queue.results.filter(r=>r.status!=='single_plausible_not_verified');
 if(active.length!==1352||paused.length!==298)throw Error('Frozen research counts changed');
 if(queue.results.some(r=>r.reviewed||r.reviewed_qid)||facts.identity_approvals||facts.factual_approvals)throw Error('Research is not an editorial signoff');
 const bySubject=new Map();
 for(const s of facts.subjects){
  if(bySubject.has(s.id))throw Error('Duplicated source subject '+s.id);
  bySubject.set(s.id,s);
 }
 const original=new Set(originalNames.map(normalize));
 const qids=new Map(),franchises=new Map(),profiles=[];
 for(const r of active){
  const s=bySubject.get(r.id)||null;
  const c=sourceClaims(s);
  const allowed=new Set(CATEGORY_PROPERTIES[r.category]||[]);
  const positives=[];
  for(const [field,list] of c){
   if(!allowed.has(field))continue;
   for(const claim of list){
    if(claim.kind==='item'){
     const l=labels[claim.value]?.label||labels[claim.value]?.name||null;
     positives.push({field,qid:claim.value,value_label:l,source:claim.source,claim_id:claim.claim_id,kind:'item',review_status:'UNREVIEWED'});
    }
   }
  }
  const dateField=DATE_FIELD[r.category];
  const year=dateField?knownYear(c,dateField):null;
  if(year!==null)positives.push({field:dateField+'_year',year,source:(c.get(dateField)||[]).find(x=>x.kind==='time')?.source,kind:'year',review_status:'UNREVIEWED'});
  const nameMatches=s&&normalize(s.entity_label)===normalize(r.name.replace(/\s*\([^)]*\)\s*$/,''));
  const sourceComplete=s?.source_status==='wikidata_entity_found_unverified';
  const contextYear=r.category==='Movies'&&/^\d{4}$/.test(r.context)?Number(r.context):null;
  const yearConflict=contextYear!==null&&year!==null&&contextYear!==year;
  const franchise=r.category==='Movies'?movieFranchise(r,c):null;
  const profile={id:r.id,name:r.name,category:r.category,subcategory:r.subcategory,
   proposedQid:r.qid_suggestion,sourceQid:s?.qid||null,
   sourceComplete:Boolean(sourceComplete),nameMatches:Boolean(nameMatches),
   year,yearConflict,franchise,
   originalNameCollision:original.has(normalize(r.name)),
   positives,sourceClaimCount:s?.claims?.length||0,
   identityStatus:'SOURCE_SUGGESTION_UNREVIEWED',
   gameplayStatus:'NOT_VALIDATED',editorialApproved:false};
  if(QID.test(r.qid_suggestion||'')){
   if(!qids.has(r.qid_suggestion))qids.set(r.qid_suggestion,[]);
   qids.get(r.qid_suggestion).push(r.id);
  }
  if(franchise){
   if(!franchises.has(franchise.id))franchises.set(franchise.id,[]);
   franchises.get(franchise.id).push(profile);
  }
  profiles.push(profile);
 }
 const franchiseActions=[];
 for(const [family,items] of franchises){
  if(items.length<=1)continue;
  const keeper=chooseKeeper(items);
  franchiseActions.push({franchise:family,proposedRepresentativeId:keeper,
   competingCandidates:items.map(x=>({id:x.id,name:x.name})),
   decision:'REVIEW_AND_REPLACE_DUPLICATES',approvedRemoval:false});
  for(const x of items)x.franchiseCollision=true;
 }
 const curations=[];
 for(const p of profiles){
  if(p.category!=='Movies'||!p.franchise)continue;
  const recommended=preferred[p.franchise.label];
  if(recommended&&normalize(p.name)!==normalize(recommended)){
   p.sequelReview='REVIEW_REMOVE_OR_REPLACE';
   curations.push({id:p.id,name:p.name,franchise:p.franchise.label,preferred:recommended});
  }
 }
 // For each source-backed binary year observation, both sides are explicitly
 // known only when all reported dates agree. No missing statement becomes No.
 const byCluster=new Map();
 for(const p of profiles){
  const key=p.category+' / '+p.subcategory;
  if(!byCluster.has(key))byCluster.set(key,[]);
  byCluster.get(key).push(p);
 }
 const clusterReports=[];
 for(const [cluster,rows] of [...byCluster].sort(([a],[b])=>a.localeCompare(b))){
  const candidateQuestions=[];
  const years=distinct(rows.map(r=>r.year).filter(x=>x!=null)).sort((a,b)=>a-b);
  const isMovie=rows[0].category==='Movies';
  const dateField=DATE_FIELD[rows[0].category];
  if(dateField){
   const thresholds=distinct(years.map(y=>Math.floor(y/10)*10)).sort((a,b)=>a-b);
   for(const y of thresholds){
    const answer=rows.map(p=>p.year==null?'?':p.year<y?'Y':'N');
    const yes=answer.filter(x=>x==='Y').length,no=answer.filter(x=>x==='N').length;
    if(yes&&no)candidateQuestions.push({field:'year_before',value:y,
      text:isMovie?'Was the movie released before '+y+'?':'Did it begin before '+y+'?',
      yes,no,known:yes+no,unreviewed:true});
   }
  }
  const fields=new Map();
  for(const p of rows){
   for(const fact of p.positives){
    if(fact.kind!=='item'||!fact.value_label)continue;
    const key=fact.field+':'+fact.qid;
    if(!fields.has(key))fields.set(key,{field:fact.field,value:fact.qid,label:fact.value_label,count:0,sourceQids:[]});
    const item=fields.get(key);item.count++;item.sourceQids.push(p.id);
   }
  }
  for(const item of fields.values()){
   // Multi-valued predicates yield explicit Yes but UNKNOWN elsewhere.
   // They are research prompts, not production questions.
   if(item.count<2||item.count>=rows.length)continue;
   const templates={
    film_director:'Was this film directed by ',genre:'Is it associated with the genre ',
    country:'Is it located in ',country_of_origin:'Did it originate in ',
    occupation:'Is this person known for working in ',citizenship:'Was this person a citizen of ',
    creator:'Was it created by ',original_language:'Was it originally in ',
    industry:'Does this brand operate in the ',continent:'Is it located in '
   };
   const base=templates[item.field];
   if(!base)continue;
   const text=base+item.label+(item.field==='industry'?' industry?':'?');
   if(text.length>145)continue;
   candidateQuestions.push({field:item.field,value:item.value,text,yes:item.count,no:0,
    unknown:rows.length-item.count,sourceKnownYes:item.sourceQids,unreviewed:true});
  }
  const signature=new Map();
  for(const p of rows){
   const keys=p.positives.filter(f=>f.kind==='item').map(f=>f.field+':'+f.qid).sort();
   if(p.year!=null)keys.push('year:'+p.year);
   const fingerprint=keys.join('|');
   if(!signature.has(fingerprint))signature.set(fingerprint,[]);
   signature.get(fingerprint).push(p.name);
  }
  const colliding=[...signature.values()].filter(v=>v.length>1).sort((a,b)=>b.length-a.length);
  const withClaim=rows.filter(p=>p.sourceComplete).length;
  clusterReports.push({cluster,count:rows.length,sourceEntities:withClaim,
   questionCandidates:candidateQuestions.length,
   identicalSourceSignatures:colliding.reduce((n,g)=>n+g.length,0),
   largestIdenticalProfiles:colliding.slice(0,4),
   sampleNames:rows.slice(0,12).map(p=>p.name),
   sampleQuestions:candidateQuestions.slice(0,8).map(q=>q.text),
   approvalStatus:'UNREVIEWED'});
 }
 const duplicatedQids=[...qids].filter(([,ids])=>ids.length>1).map(([qid,ids])=>({qid,ids}));
 const summary={activeCount:profiles.length,pausedCount:paused.length,reviewedIdentityCount:0,editorialApprovedCount:0,
  sourceFound:profiles.filter(x=>x.sourceComplete).length,sourceMissing:profiles.filter(x=>!x.sourceComplete).length,
  exactLabelMatches:profiles.filter(x=>x.nameMatches).length,
  identityYearConflicts:profiles.filter(x=>x.yearConflict).length,
  originalDisplayNameCollisions:profiles.filter(x=>x.originalNameCollision).length,
  duplicatedQidGroups:duplicatedQids.length,
  franchiseCollisionGroups:franchiseActions.length,
  curatedSequelReplacementFlags:curations.length,
  sourcePositiveEvidenceCount:profiles.reduce((n,p)=>n+p.positives.length,0),
  clusterCount:clusterReports.length,
  researchQuestionCandidates:clusterReports.reduce((n,c)=>n+c.questionCandidates,0)};
 return {status:'SOURCE_EVIDENCE_REVIEW_ONLY',summary,franchiseActions,curations,
  duplicatedQids,clusters:clusterReports,profiles,
  releaseEligibility:'NOT_APPROVED: independent identity review, negative evidence review, integrated games and regression QA required'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [queuePath,factsPath,labelsPath,outPath]=process.argv.slice(2);
 if(!queuePath||!factsPath||!outPath)throw Error('Usage: node scripts/pam-cohort-validation.mjs <queue> <facts> <labels-or-dash> <output>');
 const [q,f]=await Promise.all([readFile(queuePath,'utf8'),readFile(factsPath,'utf8')]);
 const labels=labelsPath&&labelsPath!=='-'?JSON.parse(await readFile(labelsPath,'utf8')).labels:{};
 const report=auditPamCohort(JSON.parse(q),JSON.parse(f),{labels});
 await mkdir(dirname(outPath),{recursive:true});
 await writeFile(outPath,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({summary:report.summary,filmGroups:report.franchiseActions,
  sampleMovieClusters:report.clusters.filter(x=>x.cluster.startsWith('Movies /'))},null,2));
}
