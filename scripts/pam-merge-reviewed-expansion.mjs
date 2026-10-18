/**
 * Gated 1775 + 1352 Pam model assembler.
 * This is the sole allowed path from individually approved editorial records
 * into the classic 20Q runtime. Research artifacts cannot pass this gate.
 */
import {compileReviewedEvidence} from './pam-reviewed-fact-compiler.mjs';
import {openingCategoriesForThematicTarget} from './pam-thematic-lab.mjs';
import {movieFranchiseForTitle} from './pam-movie-franchise-review.mjs';
const norm=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('en').trim().replace(/\s+/g,' ');
export function appendReviewedPamExpansion(base,roster,approved,questions,{count=1352}={}){
 if(approved?.release_status!=='EDITORIAL_APPROVAL_COMPLETE'||approved?.approval_kind!=='human_reviewed')
  throw Error('Pam expansion requires explicit human-reviewed release approval, not Wikidata suggestions');
 if(!Array.isArray(approved.records)||approved.records.length!==count)throw Error('Complete approved candidate count required');
 if(!Array.isArray(questions)||!questions.length||questions.length>1024)throw Error('Reviewed question bank required');
 const rosterById=new Map(roster.map(t=>[t.id,t]));
 if(roster.length!==1650||rosterById.size!==1650)throw Error('Unexpected frozen research roster');
 if(base.targets.length!==1775||base.questions.length!==156)throw Error('Frozen original model changed');
 const selected=new Set(),existing=new Set(base.targets.map(norm)),reviewedFranchises=new Map();
 const overlays=new Map();
 for(const replacement of approved.replacements||[]){
  const slot=rosterById.get(replacement.slot_id);
  if(!slot||slot.category!=='Movies'||slot.name!==replacement.original_name)
   throw Error('Replacement slot must preserve a frozen movie candidate and its provenance');
  if(overlays.has(replacement.slot_id))throw Error('Duplicate replacement slot');
  if(replacement.review_status!=='approved'||!replacement.reviewed_by||!/^20\\d{2}-\\d{2}-\\d{2}$/.test(replacement.reviewed_at||''))
   throw Error('Individually dated, accountable replacement approval required');
  if(!replacement.approved_name||!/^Q\\d+$/.test(replacement.subject_qid||'')||
    replacement.identity_source!=='https://www.wikidata.org/wiki/'+replacement.subject_qid)
   throw Error('Replacement requires canonical name and approved sourced identity');
  overlays.set(replacement.slot_id,replacement);
 }
 const usedOverlays=new Set();
 const additions=[];
 for(const record of approved.records){
  const frozenTarget=rosterById.get(record.id);
  if(!frozenTarget)throw Error('Approved record outside source roster: '+record.id);
  const replacement=overlays.get(record.id);
  if(replacement&&record.approved_name!==replacement.approved_name)
   throw Error('Replacement name not approved for slot: '+record.id);
  if(!replacement&&record.approved_name!==frozenTarget.name)
   throw Error('Name change requires individually approved replacement: '+record.id);
  if(replacement&&record.subject_qid!==replacement.subject_qid)
   throw Error('Replacement identity QID conflicts with reviewed facts');
  if(replacement)usedOverlays.add(record.id);
  const target=replacement?{...frozenTarget,name:replacement.approved_name,
   context:String(replacement.release_year||frozenTarget.context),
   subcategory:replacement.subcategory||frozenTarget.subcategory}:frozenTarget;
  if(selected.has(record.id))throw Error('Duplicate reviewed candidate: '+record.id);
  if(existing.has(norm(target.name)))throw Error('Existing playable answer collision: '+target.name);
  if(record.franchise_review!=='APPROVED'||record.gameplay_review!=='APPROVED')
   throw Error('Franchise and gameplay review required: '+record.id);
  if(target.category==='Movies'){
   const franchise=movieFranchiseForTitle(target.name);
   if(franchise&&reviewedFranchises.has(franchise))throw Error('One-film-per-franchise rule: '+target.name+' conflicts with '+reviewedFranchises.get(franchise));
   if(franchise)reviewedFranchises.set(franchise,target.name);
  }
  selected.add(record.id);
  additions.push({...target,subject_qid:record.subject_qid});
 }
 if(usedOverlays.size!==overlays.size)throw Error('Approved replacement ledger contains unused entries');
 const activeQuestions=questions.map((q,i)=>{
  if(!q?.text?.endsWith('?')||q.text.length>145||!q.field||!q.value)throw Error('Malformed reviewed question '+i);
  return q;
 });
 const evidence=compileReviewedEvidence(additions,approved.records,activeQuestions);
 if(evidence.summary.approvedSubjectCount!==count)throw Error('Incomplete reviewed evidence');
 // Every new subject must have enough reviewed evidence to support at least
 // some useful questions. Unknown cannot be silently converted into No.
 const N=base.targets.length+count,F=base.questions.length+activeQuestions.length;
 const weights=new Uint8Array(N*F),knownMask=new Uint8Array(N*F);
 for(let q=0;q<base.questions.length;q++){
  const offset=q*N;
  weights.set(base.weights.subarray(q*base.targets.length,(q+1)*base.targets.length),offset);
  knownMask.set(base.knownMask.subarray(q*base.targets.length,(q+1)*base.targets.length),offset);
 }
 for(let q=0;q<activeQuestions.length;q++){
  weights.set(evidence.weights.subarray(q*count,(q+1)*count), (q+base.questions.length)*N+base.targets.length);
  knownMask.set(evidence.knownMask.subarray(q*count,(q+1)*count), (q+base.questions.length)*N+base.targets.length);
 }
 for(let i=0;i<count;i++){
  let positive=0,negative=0;
  for(let q=base.questions.length;q<F;q++){
   const idx=q*N+base.targets.length+i;
   if(knownMask[idx]){
    if(weights[idx]===3)positive++;
    else if(weights[idx]===2)negative++;
   }
  }
  if(positive<4||negative<4)throw Error('Candidate has insufficient reviewed Yes/No distinctions: '+additions[i].id);
 }
 const seenSignatures=new Map();
 for(let i=0;i<count;i++){
  const signature=[];
  for(let q=base.questions.length;q<F;q++){
   const idx=q*N+base.targets.length+i;
   signature.push(!knownMask[idx]?'?':weights[idx]===3?'Y':'N');
  }
  const key=signature.join('');
  if(seenSignatures.has(key))throw Error('Unresolved identical question profile: '+additions[i].name+' vs '+seenSignatures.get(key));
  seenSignatures.set(key,additions[i].name);
 }
 if(questions.some(q=>!q.reviewed_by||!q.reviewed_at||q.review_status!=='approved'))
  throw Error('Each question requires separate dated editorial signoff');
 return {
  ...base,targets:[...base.targets,...additions.map(a=>a.name)],
  questions:[...base.questions,...activeQuestions.map(q=>q.text)],
  weights:Buffer.from(weights),knownMask:Buffer.from(knownMask),
  openingCategories:[
   ...Array.from({length:base.targets.length},()=>null),
   ...additions.map(openingCategoriesForThematicTarget)
  ],
  expansionReviewed:true,reviewedExpansionCount:count,
  expansionKnownCells:evidence.summary.reviewedKnownCells
 };
}
