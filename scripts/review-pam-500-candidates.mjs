// Editorial/practical cull of the 500 PROPOSED Pam targets. Produces a
// standalone, UNREVIEWED shortlist. It does not activate targets in production.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createContext,runInContext} from 'node:vm';
import {loadPamClassicModel,pamTraitIndex} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {pam500Catalogue} from '../data/pam20q/quality/catalogue-500.mjs';
import {pam500DiverseCatalogue} from '../data/pam20q/candidates/diverse-500.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const outDir=join(root,'.dev-data','pam-500','culled');
await mkdir(outDir,{recursive:true});
const sourceCode=await readFile(join(root,'src','client','mom-mode','engine.js'),'utf8');
const questions=156;
const baseline=await loadPam1775Model(loadPamClassicModel);
const document=JSON.parse(await readFile(join(root,'data','pam20q','quality','quality-500.json'),'utf8'));
if(document.profiles?.length!==500||baseline.targets.length!==1775)throw new Error('Unexpected source batch');
const candidates=document.profiles;
const categories=['animal','vegetable','mineral','other'];
const categoryByName=new Map();
for(const group of [...pam500DiverseCatalogue,...pam500Catalogue]){
 for(const line of group.entries.trim().split(/\r?\n/)){
  const name=line.split('|')[0].trim().toLowerCase();
  if(!categoryByName.has(name))categoryByName.set(name,group.kind);
 }
}
function norm(value){
 return String(value).normalize('NFKD').toLowerCase().replace(/[’']/g,'').replace(/^\s*(?:a|an|the)\s+/,'')
  .replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}
// These are suggestions for editorial comparison, never automatic synonym claims.
function rootPhrase(value){
 return norm(value).replace(/^(?:a |an |the )?(?:(?:a |an )?pair of |piece of |chunk of |handful of |pile of |set of |slice of )/,'').trim();
}
function familyFor(profile){return categoryByName.get(profile.name.toLowerCase())||'unclassified';}
function polarity(profile,trait){
 if(profile.yes.includes(trait)||profile.weakYes.includes(trait))return 1;
 if(profile.no.includes(trait))return -1;
 return 0;
}
function knownOpposites(a,b){
 if(a.category!==b.category)return 4;
 let contradictions=0;
 for(const key of Object.keys(pamTraitIndex)){
  const p=polarity(a,key),q=polarity(b,key);
  if(p&&q&&p!==q)contradictions++;
 }
 return contradictions;
}
function newModel(items){
 const N=baseline.targets.length+items.length;
 const targets=baseline.targets.concat(items.map(x=>x.name));
 const weights=Buffer.alloc(N*questions),knownMask=Buffer.alloc(N*questions);
 for(let q=0;q<questions;q++){
  baseline.weights.copy(weights,q*N,q*1775,(q+1)*1775);
  baseline.knownMask.copy(knownMask,q*N,q*1775,(q+1)*1775);
 }
 for(let i=0;i<items.length;i++){
  const p=items[i],cat=categories.indexOf(p.category);
  if(cat<0)throw Error('Unknown category: '+p.name);
  for(let q=0;q<4;q++){const ofs=q*N+1775+i;weights[ofs]=q===cat?3:2;knownMask[ofs]=1;}
  const apply=(keys,state)=>{
   for(const key of keys){
    const q=pamTraitIndex[key];
    if(q==null)throw Error('Unknown trait '+key);
    const ofs=q*N+1775+i;
    if(knownMask[ofs])throw Error('Duplicate/contradictory trait '+key+' in '+p.name);
    weights[ofs]=state;knownMask[ofs]=1;
   }
  };
  apply(p.yes,3);apply(p.no,2);apply(p.weakYes,1);
 }
 return{questions:baseline.questions,targets,weights,knownMask};
}
function engine(model){
 const sandbox={window:{PAM_CLASSIC_MODEL:{
  questions:model.questions,targets:model.targets,weightsB64:model.weights.toString('base64'),
  knownMaskB64:model.knownMask.toString('base64')
 }},atob:x=>Buffer.from(x,'base64').toString('binary')};
 createContext(sandbox);
 // This substitution permits a temporary cohort size ONLY for a local audit.
 // It does not modify or relax the production engine's integrity check.
 const inspectable=sourceCode.replace('![1200,1400,1775,2275].includes(N)','!(N>=1775&&N<=2275)');
 runInContext(inspectable,sandbox,{timeout:20000});
 return sandbox.window.PamClassic20Q;
}
function simulate(api,model,index,softened=false){
 const N=model.targets.length;
 const cat=categories.find((_,q)=>(model.weights[q*N+index]&1)===1);
 const game=api.createGame({budget:20,minGuessQuestions:7});
 let step=api.setCategory(game,cat),yesSoftened=false,noSoftened=false;
 for(let guard=0;guard<50;guard++){
  if(step.kind==='question'){
   const slot=step.index*N+index;
   let answer;
   if(model.knownMask[slot]!==1)answer='unknown';
   else {
    const state=model.weights[slot];
    answer=(state&1)?((state&2)?'yes':'probably'):((state&2)?'no':'doubtful');
   }
   if(softened&&answer==='yes'&&!yesSoftened){answer='probably';yesSoftened=true;}
   else if(softened&&answer==='no'&&!noSoftened){answer='doubtful';noSoftened=true;}
   step=api.answer(game,step,answer);
  }else if(step.kind==='hunch'){
   step=step.index===index?api.commitGuess(game,step):api.deferGuess(game,step);
  }else if(step.kind==='guess'){
   return{correct:step.index===index,guessed:step.label,yesSoftened,noSoftened,questions:game.turn};
  }else throw Error('Unexpected engine step '+String(step.kind));
 }
 throw Error('No guess after 50 steps '+model.targets[index]);
}
function redFlag(profile){
 const n=norm(profile.name),k=familyFor(profile);
 const reasons=[];
 // Broad/non-atomic referents cannot have one reliable answer to the fixed questions.
 if(/^(a |an |the )?(?:handful|pile|patch|layer|cloud|mound|clump) of /i.test(profile.name))
  reasons.push('quantity_or_boundary_dependent');
 if(/(?:computer virus|lunar eclipse|solar eclipse shadow|mirage|shooting star|meteor streak|rainbow halo|daydream|nightmare)/.test(n))
  reasons.push('interpretive_or_abstract_variant');
 if(/(?:\b(?:rock|gem|crystal|stone|ore)\b)/.test(n)&&k==='landform')
  reasons.push('natural_object_size_ambiguous');
 if(k==='invert'&&/(?:wasp|ant)\b/.test(n)&&!profile.yes.includes('insect'))
  reasons.push('insect_type_inconsistent');
 return reasons;
}
const baselineCanonical=new Map();
for(const name of baseline.targets) {
 const key=norm(name);
 const arr=baselineCanonical.get(key)||[];arr.push(name);baselineCanonical.set(key,arr);
}
const canonicalGroups=new Map();
const diagnostics=candidates.map((p,i)=>{
 const key=norm(p.name);const arr=canonicalGroups.get(key)||[];
 arr.push(i);canonicalGroups.set(key,arr);
 return{index:i,name:p.name,category:p.category,family:familyFor(p),
  canonical:key,legacyCanonical:baselineCanonical.get(key)||[],flags:redFlag(p),
  missingEvidence:questions-4-p.yes.length-p.no.length-p.weakYes.length,
  positiveFacts:p.yes.length,exact:false,softened:false,noiseCoverage:false};
});
for(const entry of diagnostics){
 const grp=canonicalGroups.get(entry.canonical)||[];
 if(grp.length>1)entry.flags.push('duplicate_normalized_name');
 if(entry.legacyCanonical.length)entry.flags.push('duplicate_of_existing_answer');
}
const full=newModel(candidates),fullEngine=engine(full);
for(let i=0;i<candidates.length;i++){
 const ex=simulate(fullEngine,full,1775+i),so=simulate(fullEngine,full,1775+i,true);
 diagnostics[i].exact=ex.correct;
 diagnostics[i].softened=so.correct;
 diagnostics[i].noiseCoverage=so.yesSoftened&&so.noSoftened;
 diagnostics[i].exactGuess=ex.guessed;
 diagnostics[i].softGuess=so.guessed;
 diagnostics[i].questionCount=ex.questions;
}
const baseGood=diagnostics.filter(d=>d.exact&&d.softened&&d.noiseCoverage&&!d.flags.length);
const eligible=new Set(baseGood.map(d=>d.index));
const adjacency=Array.from({length:candidates.length},()=>new Set());
for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
 if(candidates[i].category!==candidates[j].category)continue;
 if(knownOpposites(candidates[i],candidates[j])===0){
  adjacency[i].add(j);adjacency[j].add(i);
 }
}
// Greedy maximum-independent-set approximation with deterministic tie-breaks.
// It never treats 'unknown' as 'no'. Excluded collisions go to manual review.
const survivors=[],rejectedByOverlap=new Set();
const usable=new Set(eligible);
while(usable.size){
 let best=-1,smallest=Infinity,bestRank=-Infinity;
 for(const idx of usable){
  let degree=0;for(const nb of adjacency[idx])if(usable.has(nb))degree++;
  const d=diagnostics[idx];
  const qualityRank=d.positiveFacts+2*(d.family!=='unclassified')+(d.family==='toy'?2:0);
  if(degree<smallest||(degree===smallest&&(qualityRank>bestRank||(qualityRank===bestRank&&idx<best)))){
   best=idx;smallest=degree;bestRank=qualityRank;
  }
 }
 survivors.push(best);usable.delete(best);
 for(const nb of adjacency[best])if(usable.delete(nb))rejectedByOverlap.add(nb);
}
const stages=[];
let cohort=survivors.map(i=>candidates[i]);
for(let pass=1;pass<=8;pass++){
 const model=newModel(cohort),api=engine(model);
 const failures=[];
 for(let i=0;i<cohort.length;i++){
  const ex=simulate(api,model,1775+i),so=simulate(api,model,1775+i,true);
  if(!ex.correct||!so.correct||!so.yesSoftened||!so.noSoftened){
   failures.push({name:cohort[i].name,reason:!ex.correct?'subset_exact_failure':!so.correct?'subset_softened_failure':'softened_coverage_missing',exactGuess:ex.guessed,softGuess:so.guessed});
  }
 }
 stages.push({pass,candidates:cohort.length,failures:failures.length});
 if(!failures.length)break;
 const drop=new Set(failures.map(x=>x.name));
 cohort=cohort.filter(p=>!drop.has(p.name));
 if(pass===8)throw Error('Cohort did not converge in eight passes');
}
const model=newModel(cohort),api=engine(model),baselineApi=engine(baseline);
const oldRegressions=[],oldChanged=[];
for(let i=0;i<1775;i++){
 const orig=simulate(baselineApi,baseline,i);
 const next=simulate(api,model,i);
 if(orig.guessed!==next.guessed)oldChanged.push({name:baseline.targets[i],from:orig.guessed,to:next.guessed});
 if(orig.correct&&!next.correct)oldRegressions.push({name:baseline.targets[i],from:orig.guessed,to:next.guessed});
}
const finalNames=new Set(cohort.map(p=>p.name));
const exclusions=diagnostics.filter(d=>!finalNames.has(d.name)).map(d=>{
 const reason=d.flags.length?d.flags.join('|'):!d.exact?'fails_exact_oracle':!d.softened?'fails_softened_oracle':!d.noiseCoverage?'softened_both_sides_not_exercised':rejectedByOverlap.has(d.index)?'zero_known_distinguishing_traits_against_retained':'fails_after_culling';
 return{name:d.name,reason,exact:d.exact,softened:d.softened,category:d.category,closestGuess:d.exactGuess};
});
const nearMatches=[];
const basal=baseline.targets.map(s=>({name:s,canon:norm(s),root:rootPhrase(s)}));
for(const p of cohort){
 const key=rootPhrase(p.name);
 const candidates=basal.filter(b=>b.canon===key||b.root===key||key===rootPhrase(b.name));
 if(candidates.length)nearMatches.push({name:p.name,legacyPossibleSameConcept:candidates.slice(0,10).map(x=>x.name)});
}
const summary={
 sourceCount:500,legacyBaseline:1775,rawExact:diagnostics.filter(x=>x.exact).length,
 rawSoftened:diagnostics.filter(x=>x.softened).length,
 passesBoth:diagnostics.filter(x=>x.exact&&x.softened).length,
 passesBothAndNoise:diagnostics.filter(x=>x.exact&&x.softened&&x.noiseCoverage).length,
 canonicalDuplicatesVsLegacy:diagnostics.filter(x=>x.legacyCanonical.length).length,
 duplicateNormalizedNames:diagnostics.filter(x=>x.flags.includes('duplicate_normalized_name')).length,
 editorialFlags:diagnostics.filter(x=>x.flags.length).length,
 baseEligible:baseGood.length,afterPairwiseCulling:survivors.length,
 afterSubsetGameplay:cohort.length,excluded:500-cohort.length,
 potentialTotal:1775+cohort.length,
 oldRegressions:oldRegressions.length,oldGuessChanges:oldChanged.length,
 nearMatchesRequiringEditorialCheck:nearMatches.length,
 stages,status:oldRegressions.length?'blocked_existing_regressions':'unreviewed_provisional_shortlist'
};
const out={version:1,review_status:'candidate_unreviewed',source:'pam-500 cull, separate from production loader',count:cohort.length,profiles:cohort};
await Promise.all([
 writeFile(join(outDir,'retained-candidates.json'),JSON.stringify(out,null,2)+'\n'),
 writeFile(join(outDir,'rejected-candidates.json'),JSON.stringify({count:exclusions.length,items:exclusions},null,2)+'\n'),
 writeFile(join(outDir,'canonical-near-matches.json'),JSON.stringify(nearMatches,null,2)+'\n'),
 writeFile(join(outDir,'full-audit.json'),JSON.stringify({summary,diagnostics,oldRegressions,oldChanged},null,2)+'\n'),
 writeFile(join(outDir,'summary.json'),JSON.stringify(summary,null,2)+'\n')
]);
console.log('PAM_CULL_FINAL='+JSON.stringify(summary));
console.log('PAM_CULL_NEAR_LEGACY='+JSON.stringify(nearMatches.slice(0,20)));
console.log('PAM_CULL_RETAINED='+JSON.stringify(cohort.map(p=>p.name)));
if(oldRegressions.length)throw Error(oldRegressions.length+' old-target correctness regressions after culling');
