import {writeFile,readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPamClassicModel,pamTraitIndex} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {pam500Catalogue} from '../data/pam20q/quality/catalogue-500.mjs';
import {pam500DiverseCatalogue} from '../data/pam20q/candidates/diverse-500.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const targetPath=join(root,'data','pam20q','quality','quality-500.json');
const BATCH_SIZE=500;

const T={
 mammal:{category:'animal',yes:'alive living organic mammal warmBlood spine feet',no:'fish insect feathers wings coldBlood'},
 hoof:{category:'animal',yes:'alive living organic mammal warmBlood spine feet hooves herbivore',no:'fish insect feathers wings coldBlood'},
 bird:{category:'animal',yes:'alive living organic warmBlood spine feet feathers wings eggs',no:'mammal fish insect furry'},
 fish:{category:'animal',yes:'alive living organic coldBlood spine fish swim water',no:'mammal insect feathers hooves warmBlood'},
 reptile:{category:'animal',yes:'alive living organic coldBlood spine',no:'mammal fish insect feathers warmBlood'},
 amphibian:{category:'animal',yes:'alive living organic coldBlood spine eggs feet',no:'mammal fish insect feathers warmBlood'},
 insect:{category:'animal',yes:'alive living organic coldBlood insect eggs legs',no:'mammal fish feathers spine hooves'},
 invert:{category:'animal',yes:'alive living organic coldBlood',no:'mammal fish feathers spine hooves'},
 shellfish:{category:'animal',yes:'alive living organic coldBlood water shell swim',no:'mammal fish feathers spine hooves'},
 fruit:{category:'vegetable',yes:'eat tasty organic seeds',no:'mammal fish feathers electronic mechanical'},
 berry:{category:'vegetable',yes:'eat tasty organic seeds smallBread smallGolf',no:'mammal fish feathers electronic mechanical'},
 // Here 'vegetable' refers to the harvested edible greens/shoots, not a mature seed-producing plant.
 vegetable:{category:'vegetable',yes:'eat tasty organic',no:'mammal fish feathers electronic mechanical seeds sweet'},
 // Root targets are harvested storage organs; they are not seed-bearing fruit.
 root:{category:'vegetable',yes:'eat tasty organic roots rootVeg',no:'mammal fish feathers electronic mechanical seeds'},
 herb:{category:'vegetable',yes:'eat organic green leaves goodSmell',no:'mammal fish electronic mechanical'},
 nut:{category:'vegetable',yes:'eat tasty organic smallBread smallGolf',no:'mammal fish feathers electronic mechanical'},
 plant:{category:'vegetable',yes:'alive living organic green leaves roots',no:'mammal fish feathers electronic mechanical'},
 tree:{category:'vegetable',yes:'alive living organic green leaves roots tall trunk',no:'mammal fish feathers electronic mechanical'},
 meal:{category:'other',yes:'eat tasty buy',weakYes:'delivered goodSmell',no:'living mammal fish insect electronic'},
 dessert:{category:'other',yes:'eat tasty buy sweet',weakYes:'delivered goodSmell',no:'living mammal fish insect electronic'},
 snack:{category:'other',yes:'eat tasty buy hold',weakYes:'delivered goodSmell',no:'living mammal fish insect electronic'},
 beverage:{category:'other',yes:'buy tasty',weakYes:'cold sweet refill',no:'living mammal fish insect mechanical'},
 kitchen:{category:'other',yes:'manufactured invented buy useful touch household',weakYes:'hold',no:'living mammal fish insect'},
 gadget:{category:'other',yes:'manufactured invented buy useful electronic touch',weakYes:'buttons computer lights',no:'living mammal fish insect'},
 tool:{category:'other',yes:'manufactured invented buy useful tool touch',weakYes:'hold',no:'living mammal fish insect'},
 object:{category:'other',yes:'manufactured buy touch',weakYes:'useful',no:'living mammal fish insect'},
 soft:{category:'other',yes:'manufactured buy touch soft',weakYes:'wear',no:'living mammal fish insect'},
 wear:{category:'other',yes:'manufactured buy touch wear',weakYes:'sizes',no:'living mammal fish insect'},
 sport:{category:'other',yes:'manufactured buy touch game',weakYes:'hold',no:'living mammal fish insect'},
 vehicle:{category:'other',yes:'manufactured invented buy transport move carryPeople',weakYes:'mechanical motorized',no:'living mammal fish insect'},
 instrument:{category:'other',yes:'manufactured buy played noise heard',weakYes:'hold',no:'living mammal fish insect'},
 nature:{category:'mineral',yes:'organic seenReal',weakYes:'touch',no:'mammal fish insect electronic'},
 rock:{category:'mineral',yes:'stone touch',no:'living alive manufactured invented electronic motorized wear eat'},
 gem:{category:'mineral',yes:'stone buy touch smallBread',no:'living alive manufactured invented electronic motorized wear'},
 ice:{category:'mineral',yes:'cold wet touch',no:'living alive electronic motorized wear eat'},
 landform:{category:'mineral',yes:'touch',no:'living alive manufactured electronic motorized wear eat'},
 weather:{category:'other',yes:'',no:'living alive manufactured invented buy electronic motorized tool'},
 body:{category:'other',yes:'bodyPart organic touch',no:'manufactured invented electronic motorized tool'},
 abstract:{category:'other',yes:'abstract',no:'manufactured invented buy living alive bodyPart hold lift touch'},
 office:{category:'other',yes:'manufactured invented buy useful touch',no:'living alive'},
 bath:{category:'other',yes:'manufactured invented buy household touch useful',no:'living alive'},
 cleaning:{category:'other',yes:'manufactured invented buy useful household touch',no:'living alive'},
 craft:{category:'other',yes:'manufactured invented buy hold touch',no:'living alive'},
 party:{category:'other',yes:'manufactured invented buy',weakYes:'joy',no:'living alive'},
 toy:{category:'other',yes:'manufactured invented buy played game touch',no:'living alive'},
 gardenobject:{category:'other',yes:'manufactured invented buy useful touch garden',no:'living alive'},
 medicine:{category:'other',yes:'manufactured invented buy useful',no:'living alive'},
};
function words(s){return s?s.split(/\s+/).filter(Boolean):[];}
function uniqueStrings(list){return [...new Set(list)];}

// Category-safe negative evidence. These are answers to literal questions,
// not statistical guesses. Unlisted/contextual questions remain unknown.
// The per-target catalogue can override a negative with directly curated fact.
const BIO_NO='abstract bodyPart box buttons computer electronic game invented mechanical manufactured motorized plastic refill storeInfo tool wear wearHead';
const ANIMAL_NO='stone roots leaves rootVeg seeds'; // individual animals can consume plants; do not infer from diet
const PLANT_NO='bodyPart carryPeople carnivore coldBlood dogType eggs feathers feet fish furry growl herbivore hooves insect jump longTail mammal nocturnal paws scavenger shell spine swim warmBlood wings';
const FOOD_NO='alive abstract bodyPart buttons carryPeople carnivore climb coldBlood communicate computer dogType electronic eggs farm feathers fish forest furry garden growl herbivore hooves insect intelligent jump legs living longTail mammal mechanical motorized nocturnal paws produceLight roots rootVeg scavenger shell spine storeInfo swim tool tools transport warmBlood water wear wearHead wings';
const OBJECT_NO='abstract alive beOne bodyPart carnivore coldBlood dogType eat eggs farm feathers fish forest furry garden growl herbivore hooves insect living longTail mammal needLove nocturnal paws rootVeg roots scavenger seeds spine vegetarian warmBlood water';
const SAFE_NEGATIVE={
 animal:words(BIO_NO+' '+ANIMAL_NO),
 vegetable:words(BIO_NO+' '+PLANT_NO),
 other:words(FOOD_NO),
 mineral:words(PLANT_NO)
};
const FOOD_KINDS=new Set(['meal','dessert','snack','beverage']);
const DIVERSE_KINDS=new Set(['rock','gem','ice','landform','weather','body','abstract','office','bath','cleaning','craft','party','toy','gardenobject','medicine']);

// The validated 375-pack answers almost every question explicitly (135 strong
// negatives on average). Under-specified profiles cannot compete against it:
// unknown cells score zero, while confirmed "no" answers earn evidence.
// Preserve unknown for inherently contextual questions; classify the remaining
// inapplicable traits as factual negatives rather than leaving every cell blank.
const SUBJECTIVE='joy love cool annoying lostWithout touchPole beOne seenReal spontaneous';
const VARIABLE='white black brown colorful red green yellow round flat soft fragile smallBread smallGolf largerButter bigMicrowave heavierDuck heavy veryLarge tall warm hot cold wet bright specificColor dangerous seeThrough clear colorless hole breakDrop burn combustible old';
const CONTEXTUAL={
 animal:SUBJECTIVE+' '+VARIABLE+' forest nocturnal water saltWater swim climb jump spotted striped furry fluffy longTail groups growl scavenger communicate intelligent noise heard vegetarian',
 vegetable:SUBJECTIVE+' '+VARIABLE+' smell sweet goodSmell smellSweet tasty crunchy garden forest leaves roots seeds',
 food:SUBJECTIVE+' '+VARIABLE+' smell smellSweet goodSmell crunchy sweet hold old burn delivered organic',
 object:SUBJECTIVE+' '+VARIABLE+' noise heard roll spin pocket lift open buttons lights household shade carryThings plastic stone smell goodSmell organic hold',
};


function parseEntry(raw){
 const [name,...flags]=raw.split('|').map(s=>s.trim());
 if(!name||!name.match(/[a-z]/i))throw new Error('Empty catalogue target');
 return{name,flags:flags.join('|').split(/\s+/).filter(Boolean)};
}
function compile(group,entry){
 const template=T[group.kind];if(!template)throw new Error('Unknown kind: '+group.kind);
 const p={name:entry.name,category:template.category,yes:words(template.yes),weakYes:words(template.weakYes),no:words(template.no)};
 const defaults=FOOD_KINDS.has(group.kind)?SAFE_NEGATIVE.other:template.category==='other'?words(OBJECT_NO):SAFE_NEGATIVE[template.category];
 for(const key of defaults)if(!p.yes.includes(key)&&!p.weakYes.includes(key)&&!p.no.includes(key))p.no.push(key);
 if(group.kind==='body')p.no=p.no.filter(t=>!['living','alive'].includes(t));
 if(group.kind==='weather')p.no=p.no.filter(t=>!['move','wet','smell'].includes(t));
 if(template.category==='animal'){
   p.yes.push('move');
   // Habitat refers to living IN water, not merely swimming or frequenting it.
   // Marine and freshwater animal entries override these terrestrial defaults.
   if(!['fish','shellfish'].includes(group.kind))p.no.push('water','saltWater');
 }
 if(group.kind==='bird')p.yes.push('noise','heard');
 if(group.kind==='tree')p.yes.push('shade','seeds','touch');
 if(FOOD_KINDS.has(group.kind))p.yes.push('touch','smell','lift');
 if(['fruit','berry','vegetable','root','herb','nut'].includes(group.kind))p.yes.push('touch','lift');
 const flags=[...words(group.flags),...entry.flags];
 for(const flag of flags){
  const op=flag[0],trait=flag.slice(1);
  if(!['+','~','-'].includes(op)||!(trait in pamTraitIndex))throw new Error('Unknown flag '+flag+' for '+entry.name);
  for(const bucket of ['yes','weakYes','no'])p[bucket]=p[bucket].filter(x=>x!==trait);
  p[op==='+'?'yes':op==='~'?'weakYes':'no'].push(trait);
  if(op==='+'&&trait==='hot'){
    p.yes=p.yes.filter(x=>x!=='cold');p.weakYes=p.weakYes.filter(x=>x!=='cold');
    if(!p.no.includes('cold'))p.no.push('cold');
  }
  if(op==='+'&&trait==='cold'){
    p.yes=p.yes.filter(x=>x!=='hot');p.weakYes=p.weakYes.filter(x=>x!=='hot');
    if(!p.no.includes('hot'))p.no.push('hot');
  }
 }
 if(p.yes.includes('hot')){
   p.yes=p.yes.filter(x=>x!=='cold');p.weakYes=p.weakYes.filter(x=>x!=='cold');
   p.yes.push('warm');p.no=p.no.filter(x=>!['warm','hot'].includes(x));
 }
 if(p.yes.includes('hold')){
   p.yes.push('lift');p.no=p.no.filter(x=>x!=='lift');p.weakYes=p.weakYes.filter(x=>x!=='lift');
 }
 if(template.category==='animal'&&p.yes.includes('herbivore')&&!p.no.includes('vegetarian'))p.yes.push('vegetarian');

 // Logically entailed answers are safe ways to enrich evidence without
 // fabricating species-specific or object-specific properties. If a curated
 // negative contradicts an implication, halt instead of overwriting it.
 const strictImplications=[
  ['smallGolf',['smallBread']],
  ['pocket',['smallBread','lift']],
  ['wearHead',['wear','head']],
  ['motorized',['mechanical']],
  ['noise',['heard']],
  ['bigSofa',['bigMicrowave','largerButter']],
  ['veryLarge',['bigMicrowave','largerButter']],
  ['bigMicrowave',['largerButter']]
 ];
 for(const [antecedent,consequents] of strictImplications){
  if(!p.yes.includes(antecedent))continue;
  for(const trait of consequents){
   if(p.no.includes(trait))throw new Error('Contradictory certain trait '+antecedent+' => '+trait+' for '+p.name);
   if(p.weakYes.includes(trait))p.weakYes=p.weakYes.filter(x=>x!==trait);
   p.yes.push(trait);
  }
 }


 // Strict size implications are physical constraints, not fabricated colors
 // or subjective properties. Explicit facts always win; incoherent size
 // combinations fail rather than silently becoming fake knowledge.
 const yesSize=new Set(p.yes);
 const impossiblePairs=[['smallGolf','veryLarge'],['smallBread','veryLarge'],['smallBread','bigMicrowave'],['smallGolf','bigMicrowave'],['smallGolf','bigSofa'],['smallBread','bigSofa']];
 for(const [a,b] of impossiblePairs)if(yesSize.has(a)&&yesSize.has(b))throw new Error('Contradictory size evidence '+a+'/'+b+' for '+p.name);
 const inferredNo=new Set();
 if(yesSize.has('smallGolf')||yesSize.has('smallBread'))for(const x of ['veryLarge','bigSofa','bigMicrowave'])inferredNo.add(x);
 if(yesSize.has('veryLarge')||yesSize.has('bigSofa')||yesSize.has('bigMicrowave'))for(const x of ['smallGolf','smallBread','pocket'])inferredNo.add(x);
 if(yesSize.has('tall'))inferredNo.add('smallGolf');
 for(const trait of inferredNo){
   if(!p.yes.includes(trait)&&!p.weakYes.includes(trait)&&!p.no.includes(trait))p.no.push(trait);
 }

 const unknown=words(FOOD_KINDS.has(group.kind)?CONTEXTUAL.food:template.category==='animal'?CONTEXTUAL.animal:template.category==='vegetable'?CONTEXTUAL.vegetable:CONTEXTUAL.object);
 const uncertain=new Set(unknown);
 const categorized=new Set([...p.yes,...p.weakYes,...p.no]);
 for(const trait of Object.keys(pamTraitIndex))if(!categorized.has(trait)&&!uncertain.has(trait))p.no.push(trait);
 for(const bucket of ['yes','weakYes','no'])p[bucket]=uniqueStrings(p[bucket]).sort();
 if(p.yes.length+p.weakYes.length+p.no.length<9)throw new Error('Too few profile answers: '+p.name);
 return p;
}

const baseline=await loadPam1775Model(loadPamClassicModel);
const referenceParts=await Promise.all([1,2,3,4].map(i=>readFile(join(root,'data','pam20q','quality',`quality-375.part${i}`),'utf8')));
const referenceDoc=JSON.parse(gunzipSync(Buffer.from(referenceParts.join('').trim(),'base64')).toString('utf8'));
const avg=(key)=>Math.round(referenceDoc.profiles.reduce((n,p)=>n+(p[key]?.length||0),0)/referenceDoc.profiles.length);
console.log('PAM_375_REFERENCE_DENSITY='+JSON.stringify({yes:avg('yes'),no:avg('no'),weakYes:avg('weakYes'),example:referenceDoc.profiles[0]}));
const previous=new Set(baseline.targets.map(x=>x.trim().toLowerCase()));
const poolManifest=JSON.parse(await readFile(join(root,'data','pam20q','candidates','pam-2000-preflight-pool.json'),'utf8'));
if(poolManifest.summary?.eligibleUniqueCandidates<2000||poolManifest.candidates?.length!==poolManifest.summary.eligibleUniqueCandidates){
 throw new Error('Fresh Pam source pool must contain at least 2000 independently screened names');
}
const prior100Doc=JSON.parse(await readFile(join(root,'data','pam20q','candidates','pam-100-provisional.json'),'utf8'));
const prior100=new Set(prior100Doc.retained.map(p=>p.name.trim().toLowerCase()));
const options=poolManifest.candidates.map((item,groupId)=>({
 groupId,group:{kind:item.kind,flags:item.source_flags,entries:item.name},
 names:[{name:item.name,flags:[]}],origin:item.origin
}));
let skipped=0;
// Select factually distinguishable candidates, not merely names with different
// spellings. The 156-question vocabulary has finite information capacity.
const candidateProfiles=[],candidateSignatures=new Set(),candidateNames=new Set();
let indistinguishable=0;
for(const option of options){
 for(const entry of option.names){
  const key=entry.name.trim().toLowerCase();
  if(previous.has(key)||candidateNames.has(key)){skipped++;continue;}
  const profile=compile(option.group,entry);
  const signature=[profile.category,...['yes','weakYes','no'].map(x=>profile[x].join(','))].join('|');
  if(candidateSignatures.has(signature)){indistinguishable++;continue;}
  candidateSignatures.add(signature);candidateNames.add(key);
  candidateProfiles.push({profile,kind:option.group.kind,groupId:option.groupId,diverse:option.origin==='diversified_catalogue',lexical:option.origin==='lexical_52k',origin:option.origin,validated100:prior100.has(key)});
 }
}
if(candidateProfiles.length<BATCH_SIZE)throw new Error('Insufficient distinct factual candidate profiles '+candidateProfiles.length);

// Bitsets let us consider all 1775 existing targets when comparing proposed
// answers. Unknown values do not count as factual contradictions.
const WORDS=Math.ceil(baseline.questions.length/32);
function bitsForProfile(profile){
 const yes=new Uint32Array(WORDS),known=new Uint32Array(WORDS);
 for(const key of [...profile.yes,...profile.weakYes,...profile.no]){
  const q=pamTraitIndex[key],slot=q>>>5,bit=1<<(q&31);known[slot]|=bit;
 }
 for(const key of [...profile.yes,...profile.weakYes]){
  const q=pamTraitIndex[key];yes[q>>>5]|=1<<(q&31);
 }
 for(let q=0;q<4;q++){
  const bit=1<<q;known[0]|=bit;
  if(['animal','vegetable','mineral','other'][q]===profile.category)yes[0]|=bit;
 }
 return{yes,known};
}
function popcount(v){
 v-=(v>>>1)&0x55555555;
 v=(v&0x33333333)+((v>>>2)&0x33333333);
 return (((v+(v>>>4))&0x0f0f0f0f)*0x01010101)>>>24;
}
function distance(a,b){
 let n=0;
 for(let w=0;w<WORDS;w++)n+=popcount((a.yes[w]^b.yes[w])&a.known[w]&b.known[w]);
 return n;
}
const existing=Array.from({length:baseline.targets.length},(_,t)=>{
 const yes=new Uint32Array(WORDS),known=new Uint32Array(WORDS);
 for(let q=0;q<baseline.questions.length;q++){
  const i=q*baseline.targets.length+t,bit=1<<(q&31),slot=q>>>5;
  if(baseline.knownMask[i])known[slot]|=bit;
  if(baseline.weights[i]&1)yes[slot]|=bit;
 }
 return{yes,known};
});
for(const candidate of candidateProfiles){
 candidate.bits=bitsForProfile(candidate.profile);
 let nearest=Infinity;
 for(const prior of existing){
  const d=distance(candidate.bits,prior);
  if(d<nearest)nearest=d;
  if(nearest===0)break;
 }
 candidate.baselineDistance=nearest;
 candidate.selectionDistance=Infinity;
 candidate.collisionsSelected=0;
}

// Approximate how many entries in this source catalogue have at least one
// mutually known, opposite-polarity answer against every other selected entry.
// This is a conservative separability yardstick, NOT a claim that an overlap
// makes self-play mathematically impossible (unknown answers can still matter).
const conflicts=candidateProfiles.map(()=>[]);
for(let a=0;a<candidateProfiles.length;a++)for(let b=a+1;b<candidateProfiles.length;b++){
 if(distance(candidateProfiles[a].bits,candidateProfiles[b].bits)===0){
  conflicts[a].push(b);conflicts[b].push(a);
 }
}
const orders=[0,1,2,3].map(mode=>candidateProfiles.map((_,i)=>i).sort((a,b)=>{
 const ca=candidateProfiles[a],cb=candidateProfiles[b];
 if(mode===0)return conflicts[a].length-conflicts[b].length||cb.baselineDistance-ca.baselineDistance||a-b;
 if(mode===1)return cb.baselineDistance-ca.baselineDistance||conflicts[a].length-conflicts[b].length||a-b;
 if(mode===2)return conflicts[a].length-conflicts[b].length||cb.profile.yes.length-ca.profile.yes.length||a-b;
 return cb.profile.yes.length-ca.profile.yes.length||conflicts[a].length-conflicts[b].length||a-b;
}));
const independentCounts=orders.map(order=>{
 const chosen=new Set(),blocked=new Set();
 for(const i of order){
  if(blocked.has(i))continue;
  chosen.add(i);blocked.add(i);
  for(const neighbor of conflicts[i])blocked.add(neighbor);
 }
 return chosen.size;
});
console.log('PAM_500_CANDIDATE_DISTINGUISHABILITY='+JSON.stringify({
 sourceCandidates:candidateProfiles.length,
 independentPhaseCount,
 pairwiseNoContradictionPairs:conflicts.reduce((n,c)=>n+c.length,0)/2,
 heuristicNonOverlappingSubsetSizes:independentCounts,
 bestHeuristicSubset:Math.max(...independentCounts),
 requiresFactualEnrichmentFor500:Math.max(...independentCounts)<BATCH_SIZE
}));

// Phase one: first keep a maximal set with a known contradictory answer
// against *every* other member. This avoids sacrificing many clean options
// merely to fit 500 early. Phase two fills exactly 500 with the fewest possible
// remaining evidence overlaps, marked as editorial work, not approved.
const selected=[],byGroup={},byCategory={},picked=[];
function pick(candidate){
 candidate.picked=true;selected.push(candidate.profile);picked.push(candidate);
 byGroup[candidate.kind]=(byGroup[candidate.kind]||0)+1;
 byCategory[candidate.profile.category]=(byCategory[candidate.profile.category]||0)+1;
 for(const other of candidateProfiles){
  if(other.picked)continue;
  const d=distance(other.bits,candidate.bits);
  if(d<other.selectionDistance)other.selectionDistance=d;
  if(d===0)other.collisionsSelected++;
 }
}
const independentOrder=[...candidateProfiles.keys()].sort((a,b)=>{
 const ca=candidateProfiles[a],cb=candidateProfiles[b];
 const da=conflicts[a].length,db=conflicts[b].length;
 return da-db||Number(cb.validated100)-Number(ca.validated100)
  ||cb.baselineDistance-ca.baselineDistance||cb.profile.yes.length-ca.profile.yes.length||a-b;
});
for(const id of independentOrder){
 const c=candidateProfiles[id];
 if(c.baselineDistance===0||c.selectionDistance===0)continue;
 if(c.lexical&&c.profile.yes.length<8)continue;
 pick(c);
 if(selected.length===BATCH_SIZE)break;
}
const independentPhaseCount=selected.length;
while(selected.length<BATCH_SIZE){
 let best=null,bestScore=-Infinity;
 for(const candidate of candidateProfiles){
  if(candidate.picked||candidate.baselineDistance===0)continue;
  const count=byGroup[candidate.kind]||0;
  const overlapPenalty=candidate.selectionDistance===0?50:candidate.selectionDistance===1?12:0;
  const peerCollisionPenalty=candidate.collisionsSelected*18;
  const categoryPenalty=candidate.profile.category==='other'?Math.max(0,(byCategory.other||0)-260)*3:0;
  const familyPenalty=Math.max(0,count-24)*4;
  const score=candidate.baselineDistance*3+Math.min(10,candidate.selectionDistance)*2
    -overlapPenalty-peerCollisionPenalty-categoryPenalty-familyPenalty
    +Math.min(15,candidate.profile.yes.length)*0.3
    +(candidate.diverse?15:0)+(candidate.validated100?20:0)-(candidate.lexical?10:0);
  if(score>bestScore){bestScore=score;best=candidate;}
 }
 if(!best)throw new Error('Could not assemble 500 candidates distinguishable from original 1775');
 pick(best);
}
console.log('PAM_500_SELECTION='+JSON.stringify({
 sourceCandidates:candidateProfiles.length,
 minimumBaselineDistance:Math.min(...picked.map(p=>p.baselineDistance)),
 medianBaselineDistance:[...picked.map(p=>p.baselineDistance)].sort((a,b)=>a-b)[250],
 minPeerDistance:Math.min(...picked.slice(1).map(p=>p.selectionDistance)),
 comparedToAllExisting:baseline.targets.length,
 selectedDiverseCount:picked.filter(p=>p.diverse).length,
 selectedPriorCulled100:picked.filter(p=>p.validated100).length,
 selectedLexicalCount:picked.filter(p=>p.lexical).length,
 poolCount:poolManifest.candidates.length,
 selectedByOrigin:Object.fromEntries([...new Set(picked.map(p=>p.origin))].map(origin=>[origin,picked.filter(p=>p.origin===origin).length])),
 collidingCandidateJoins:picked.reduce((total,p)=>total+p.collisionsSelected,0),
 baselineZeroCandidatesRejected:candidateProfiles.filter(p=>p.baselineDistance===0).length,
 byCategory
}));
const doc={version:2,count:BATCH_SIZE,review_status:'candidate_unreviewed',source:'Crossreferenced 2399-name preflight pool, factual and gameplay validation pending',pool_size:poolManifest.candidates.length,profiles:selected};
await writeFile(targetPath,JSON.stringify(doc,null,2)+'\n');
const mean=key=>Math.round(selected.reduce((n,p)=>n+p[key].length,0)/selected.length);
console.log('PAM_500_PROFILE_DENSITY='+JSON.stringify({yes:mean('yes'),no:mean('no'),weakYes:mean('weakYes'),unknown:152-mean('yes')-mean('no')-mean('weakYes')}));
console.log('PAM_500_GENERATED='+selected.length+' selectedDiverse='+picked.filter(p=>p.diverse).length+' candidatesSkipped='+skipped+' identicalProfilesRejected='+indistinguishable+' groups='+JSON.stringify(byGroup));
