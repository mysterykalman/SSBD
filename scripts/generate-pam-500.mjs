import {writeFile,readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadPamClassicModel,pamTraitIndex} from './pam-classic-model.mjs';
import {loadPam1775Model} from './pam-quality-model.mjs';
import {pam500Catalogue} from '../data/pam20q/quality/catalogue-500.mjs';

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
 berry:{category:'vegetable',yes:'eat tasty organic seeds smallBread',no:'mammal fish feathers electronic mechanical'},
 vegetable:{category:'vegetable',yes:'eat tasty organic',no:'mammal fish feathers electronic mechanical'},
 root:{category:'vegetable',yes:'eat tasty organic roots rootVeg',no:'mammal fish feathers electronic mechanical'},
 herb:{category:'vegetable',yes:'eat organic green leaves goodSmell',no:'mammal fish electronic mechanical'},
 nut:{category:'vegetable',yes:'eat tasty organic smallBread',no:'mammal fish feathers electronic mechanical'},
 plant:{category:'vegetable',yes:'alive living organic green leaves roots',no:'mammal fish feathers electronic mechanical'},
 tree:{category:'vegetable',yes:'alive living organic green leaves roots tall',no:'mammal fish feathers electronic mechanical'},
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
 if(template.category==='animal')p.yes.push('move');
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
const options=[];
let skipped=0;
for(const [groupId,group] of pam500Catalogue.entries()){
 const names=group.entries.split('\n').map(s=>s.trim()).filter(Boolean).map(parseEntry);
 if(names.length<8)throw new Error('Small catalogue group '+groupId);
 options.push({groupId,group,names});
}
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
  candidateProfiles.push({profile,kind:option.group.kind,groupId:option.groupId});
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
}
const selected=[],byGroup={},picked=[];
while(selected.length<BATCH_SIZE){
 let best=null,bestScore=-Infinity;
 for(const candidate of candidateProfiles){
  if(candidate.picked)continue;
  const count=byGroup[candidate.kind]||0;
  // Spread across concept domains, so the game does not acquire 200 nearly
  // identical animals or foods. Enforce meaningful distance from prior targets.
  const score=candidate.baselineDistance*3+Math.min(10,candidate.selectionDistance)*2
    -Math.max(0,count-22)*0.45 +Math.min(4,candidate.profile.yes.length)*0.05;
  if(score>bestScore){bestScore=score;best=candidate;}
 }
 if(!best)throw new Error('Could not assemble 500 candidates');
 best.picked=true;selected.push(best.profile);picked.push(best);
 byGroup[best.kind]=(byGroup[best.kind]||0)+1;
 for(const candidate of candidateProfiles){
  if(candidate.picked)continue;
  const d=distance(candidate.bits,best.bits);
  if(d<candidate.selectionDistance)candidate.selectionDistance=d;
 }
}
console.log('PAM_500_SELECTION='+JSON.stringify({
 sourceCandidates:candidateProfiles.length,
 minimumBaselineDistance:Math.min(...picked.map(p=>p.baselineDistance)),
 medianBaselineDistance:[...picked.map(p=>p.baselineDistance)].sort((a,b)=>a-b)[250],
 minPeerDistance:Math.min(...picked.slice(1).map(p=>p.selectionDistance)),
 comparedToAllExisting:baseline.targets.length
}));
const doc={version:1,count:BATCH_SIZE,source:'Curated, deterministic Pam 500 expansion catalogue',profiles:selected};
await writeFile(targetPath,JSON.stringify(doc,null,2)+'\n');
const mean=key=>Math.round(selected.reduce((n,p)=>n+p[key].length,0)/selected.length);
console.log('PAM_500_PROFILE_DENSITY='+JSON.stringify({yes:mean('yes'),no:mean('no'),weakYes:mean('weakYes'),unknown:152-mean('yes')-mean('no')-mean('weakYes')}));
console.log('PAM_500_GENERATED='+selected.length+' candidatesSkipped='+skipped+' identicalProfilesRejected='+indistinguishable+' groups='+JSON.stringify(byGroup));
