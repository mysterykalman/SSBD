/**
 * Diversified 15-film replacement nominations for franchise sibling exclusions.
 * These are research proposals only. They are NEVER copied into the runtime.
 * Every proposed title needs its own verified, unique referent and profile.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {selectMovieFranchiseRepresentatives} from './pam-movie-franchise-review.mjs';
import {reconcileOne} from './pam-wikidata-reconcile.mjs';
import {loadPamClassicModel} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
const NOMINATIONS=Object.freeze([
 ['The Sting',1973],['Amadeus',1984],['Stand by Me',1986],
 ['Good Will Hunting',1997],['The Big Lebowski',1998],['The Iron Giant',1999],
 ['School of Rock',2003],['Mean Girls',2004],['The Prestige',2006],
 ['Little Miss Sunshine',2006],['Moana',2016],['Arrival',2016],
 ['La La Land',2016],['Coco',2017],['The Shape of Water',2017]
]);
const norm=v=>String(v).normalize('NFKC').toLocaleLowerCase('en').trim();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function buildReplacementPlan(queue,{originalNames=[]}={}){
 if(queue?.review_status!=='IDENTITY_RESEARCH_ONLY'||queue.results?.length!==1650)
  throw Error('Original 1650-row research queue required');
 const active=queue.results.filter(x=>x.status==='single_plausible_not_verified');
 if(active.length!==1352)throw Error('The paused roster must not be repurposed for movie slots');
 const selection=selectMovieFranchiseRepresentatives(active);
 const replaced=[...selection.exclude].sort((a,b)=>a.id.localeCompare(b.id));
 if(replaced.length!==NOMINATIONS.length)
  throw Error('Movie replacement count changed from '+NOMINATIONS.length+' to '+replaced.length+'; manual editorial reconciliation required');
 const occupied=new Set([...originalNames,...queue.results.map(x=>x.name)].map(norm));
 const movies=NOMINATIONS.map(([name,year],index)=>{
  if(occupied.has(norm(name)))throw Error('Replacement duplicates active or existing catalogue: '+name);
  occupied.add(norm(name));
  const slot=replaced[index];
  return{slotId:slot.id,original:slot.name,originalFranchise:slot.family,
   retainedFranchiseRepresentative:slot.retainedName,
   candidateName:name,releaseYear:year,category:'Movies',
   subcategory:year<1980?'Classic Cinema (to 1979)':year<2000?'1980s & 1990s':year<2010?'2000s':'2010s & 2020s',
   identityReview:'PENDING',factualReview:'PENDING',gameplayReview:'PENDING',
   productionEnabled:false};
 });
 return{status:'RESEARCH_REPLACEMENT_NOMINATIONS_ONLY',originalActive:1352,
  sequelsExcluded:replaced.length,remainingOriginal:1352-replaced.length,
  proposedReplacements:movies.length,proposedFinalCount:1352,
  reviewRequirements:'Independently source and approve identity, distinguishing traits, reliable known Yes/No cells, gameplay within 20 turns, original regression',
  replacements:movies};
}
export async function researchMovieReplacements(plan,{fetchImpl=fetch,onProgress=()=>{}}={}){
 if(plan.status!=='RESEARCH_REPLACEMENT_NOMINATIONS_ONLY')throw Error('Unexpected nominations');
 const results=[];
 for(const item of plan.replacements){
  try{
   const lookup=await reconcileOne({id:item.slotId,name:item.candidateName,category:'Movies',
    subcategory:item.subcategory,context:String(item.releaseYear)},{fetchImpl});
   results.push({...item,suggested_candidates:lookup.suggested_candidates,
    matchStatus:lookup.status,identityApproved:false});
  }catch(error){results.push({...item,matchStatus:'source_error',
    error:String(error).slice(0,250),identityApproved:false});}
  onProgress({complete:results.length,total:plan.replacements.length});
  if(results.length<plan.replacements.length)await sleep(1200);
 }
 return{status:'REPLACEMENT_IDENTITY_RESEARCH_UNAPPROVED',reviewed:0,
  results,summary:{requested:results.length,plausible:results.filter(x=>x.matchStatus==='single_plausible_not_verified').length,
   ambiguous:results.filter(x=>x.matchStatus==='ambiguous_needs_review').length,
   unmatched:results.filter(x=>x.matchStatus==='not_found').length,
   sourceErrors:results.filter(x=>x.matchStatus==='source_error').length}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [reviewFile,outFile]=process.argv.slice(2);
 if(!reviewFile||!outFile)throw Error('Usage: node scripts/pam-movie-replacements.mjs <1650-review.json> <results.json>');
 const queue=JSON.parse(await readFile(reviewFile,'utf8'));
 const baseline=await loadPam1775Model(loadPamClassicModel);
 const plan=buildReplacementPlan(queue,{originalNames:baseline.targets});
 const research=await researchMovieReplacements(plan,{onProgress:r=>process.stderr.write('Replacement QIDs '+r.complete+'/'+r.total+'\n')});
 await mkdir(dirname(outFile),{recursive:true});
 await writeFile(outFile,JSON.stringify({plan,research},null,2)+'\n');
 console.log(JSON.stringify({slots:plan.sequelsExcluded,research:research.summary,productionApproved:0},null,2));
}
