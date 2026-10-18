/**
 * Turn the 1,352-row research audit into individually actionable editorial
 * dossiers, grouped by semantic category, without fabricating approvals.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const esc=value=>String(value??'').replace(/\|/g,'/').replace(/\r?\n/g,' ');
const slug=s=>String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
function summarizeProfile(profile,audit){
 const nearest=audit.nearestCompetitors.find(x=>x.id===profile.id)?.closest||[];
 const flags=[];
 if(!profile.sourceComplete)flags.push('SOURCE_ENTITY_UNAVAILABLE');
 if(!profile.nameMatches)flags.push('IDENTITY_NAME_NOT_EXACT');
 if(profile.yearConflict)flags.push('RELEASE_CONTEXT_CONFLICT');
 if(profile.originalNameCollision)flags.push('SAME_DISPLAY_NAME_AS_EXISTING');
 if(profile.franchiseCollision)flags.push('FRANCHISE_COLLISION');
 if(profile.sequelReview)flags.push('SEQUEL_REPLACEMENT');
 if(audit.duplicatedQids.some(x=>x.ids.includes(profile.id)))flags.push('DUPLICATE_IDENTITY_SUGGESTION');
 if(profile.positives.length<4)flags.push('TOO_FEW_SOURCE_FACTS');
 if(nearest[0]&&!nearest[0].sourceBackedYearDifference)flags.push('CLOSE_COMPETITOR_NOT_SEPARATED');
 return {id:profile.id,name:profile.name,category:profile.category,subcategory:profile.subcategory,
  suggestedIdentity:profile.proposedQid,identitySource:profile.proposedQid?'https://www.wikidata.org/wiki/'+profile.proposedQid:'',
  riskFlags:flags,year:profile.year,
  distinctSources:profile.positives.length,sourceClaims:profile.sourceClaimCount,
  neighbourIds:nearest.map(x=>x.id),
  status:'EDITORIAL_REVIEW_REQUIRED',productionEnabled:false};
}
export function createEditorialIndex(audit){
 if(audit.status!=='SOURCE_EVIDENCE_REVIEW_ONLY'||audit.summary.activeCount!==1352||audit.summary.pausedCount!==298)
  throw Error('Expected completed 1352-source audit and 298 deferred candidates');
 if(audit.profiles.some(x=>x.editorialApproved))throw Error('Unexpected source approval');
 const rows=audit.profiles.map(x=>summarizeProfile(x,audit));
 if(new Set(rows.map(x=>x.id)).size!==1352)throw Error('Duplicate research row');
 const aggregate={count:rows.length,flagged:rows.filter(x=>x.riskFlags.length).length,
  flags:{},perCategory:{},approved:0};
 for(const row of rows){
  aggregate.perCategory[row.category]=(aggregate.perCategory[row.category]||0)+1;
  for(const f of row.riskFlags)aggregate.flags[f]=(aggregate.flags[f]||0)+1;
 }
 return {status:'UNAPPROVED_EDITORIAL_DOSSIERS',aggregate,rows};
}
export async function writeEditorialDossiers(audit,dir){
 const index=createEditorialIndex(audit);
 await mkdir(dir,{recursive:true});
 const related=new Map(audit.nearestCompetitors.map(x=>[x.id,x.closest]));
 const groups=new Map();
 for(const profile of audit.profiles){
  const key=profile.category+' / '+profile.subcategory;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(profile);
 }
 const docs=[];
 for(const [key,profiles] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
  const file='review-'+slug(key)+'.md',lines=[];
  lines.push('# '+key,'','Status: **Research only. No identities or facts have been approved.**','');
  lines.push('Each entry needs identity and source verification, replacement decisions, distinct positive/negative/unknown facts, and a simulated gameplay pass.','');
  for(const profile of profiles){
   const summary=index.rows.find(r=>r.id===profile.id);
   const peers=related.get(profile.id)||[];
   lines.push('## '+profile.id+' '+profile.name,'');
   lines.push('- Proposed Wikidata identity: '+(summary.identitySource||'None'));
   lines.push('- Decision: PENDING; playable: NO');
   lines.push('- Source-linked claim count: '+summary.sourceClaims);
   lines.push('- Research flags: '+(summary.riskFlags.join(', ')||'No automatic risk flags; still unapproved'));
   if(profile.year!=null)lines.push('- Source-reported year: '+profile.year);
   if(peers.length)lines.push('- Nearest competitors: '+peers.map(x=>x.name+
    (x.sourceBackedYearDifference?' (different sourced years)':' (no proven opposite)')).join('; '));
   const traitLines=profile.positives.slice(0,40).map(f=>f.kind==='year'?
    '  - '+f.field+': '+f.year+' | '+(f.source||''):
    '  - '+f.field+': '+(f.value_label||f.qid)+' | '+f.source);
   lines.push('- Positive source claims (NOT independently editorially verified):');
   lines.push(...(traitLines.length?traitLines:['  - None available']));
   lines.push('- Reviewed identity: [ ]  Reviewed facts: [ ]  Safe opposites: [ ]  Distinct in 20Q: [ ]  Franchise decision: [ ]','');
  }
  await writeFile(join(dir,file),lines.join('\n')+'\n');
  docs.push({category:key,file,count:profiles.length});
 }
 const header=['id','name','category','subcategory','qid','source_claims','year','risk_flags','production_enabled','review_status'];
 const csv=[header,...index.rows.map(r=>[r.id,r.name,r.category,r.subcategory,r.suggestedIdentity,
  r.sourceClaims,r.year,r.riskFlags.join(';'),false,r.status])].map(fields=>fields.map(v=>'"'+esc(v).replace(/"/g,'""')+'"').join(',')).join('\n')+'\n';
 await writeFile(join(dir,'editorial-index.csv'),csv);
 await writeFile(join(dir,'editorial-summary.json'),JSON.stringify({aggregate:index.aggregate,groups:docs},null,2)+'\n');
 return {aggregate:index.aggregate,groups:docs.length,reviewRecords:index.rows.length};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/pam-editorial-dossiers.mjs <audit.json> <output-directory>');
 const audit=JSON.parse(await readFile(input,'utf8'));
 console.log(JSON.stringify(await writeEditorialDossiers(audit,output),null,2));
}
