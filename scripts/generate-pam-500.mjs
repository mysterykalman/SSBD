import {writeFile} from 'node:fs/promises';
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
const ANIMAL_NO='stone roots leaves rootVeg seeds vegetarian'; // individual animals can consume plants; do not infer from diet
const PLANT_NO='bodyPart carryPeople carnivore coldBlood dogType eggs feathers feet fish furry growl herbivore hooves insect jump longTail mammal nocturnal paws scavenger shell spine swim warmBlood wings';
const FOOD_NO='alive abstract bodyPart buttons carryPeople carnivore climb coldBlood communicate computer dogType electronic eggs farm feathers fish forest furry garden growl herbivore hooves insect intelligent jump legs living longTail mammal mechanical motorized nocturnal paws produceLight roots rootVeg scavenger shell spine storeInfo swim tool tools transport warmBlood water wear wearHead wings';
const OBJECT_NO='abstract alive beOne bodyPart carnivore coldBlood dogType eat eggs farm feathers fish forest furry garden growl herbivore hooves insect living longTail mammal needLove nocturnal organic paws rootVeg roots scavenger seeds spine vegetarian warmBlood water';
const SAFE_NEGATIVE={
 animal:words(BIO_NO+' '+ANIMAL_NO),
 vegetable:words(BIO_NO+' '+PLANT_NO),
 other:words(FOOD_NO),
 mineral:words(PLANT_NO)
};
const FOOD_KINDS=new Set(['meal','dessert','snack','beverage']);

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
 for(const bucket of ['yes','weakYes','no'])p[bucket]=uniqueStrings(p[bucket]).sort();
 if(p.yes.length+p.weakYes.length+p.no.length<9)throw new Error('Too few profile answers: '+p.name);
 return p;
}

const baseline=await loadPam1775Model(loadPamClassicModel);
const previous=new Set(baseline.targets.map(x=>x.trim().toLowerCase()));
const options=[];
let skipped=0;
for(const [groupId,group] of pam500Catalogue.entries()){
 const names=group.entries.split('\n').map(s=>s.trim()).filter(Boolean).map(parseEntry);
 if(names.length<8)throw new Error('Small catalogue group '+groupId);
 options.push({groupId,group,names});
}
const selected=[],taken=new Set(),signatures=new Set(),byGroup={};
let indistinguishable=0;
let index=0;
while(selected.length<BATCH_SIZE){
 let progressed=false;
 for(const option of options){
  const entry=option.names[index];if(!entry)continue;
  progressed=true;
  const name=entry.name.toLowerCase();
  if(previous.has(name)||taken.has(name)){skipped++;continue;}
  const profile=compile(option.group,entry);
  const signature=[profile.category,...['yes','weakYes','no'].map(key=>profile[key].join(','))].join('|');
  if(signatures.has(signature)){indistinguishable++;continue;}
  signatures.add(signature);taken.add(name);selected.push(profile);
  byGroup[option.group.kind]=(byGroup[option.group.kind]||0)+1;
  if(selected.length===BATCH_SIZE)break;
 }
 if(!progressed)throw new Error('Only '+selected.length+' unique nonbaseline candidates from catalogue');
 index++;
}
const doc={version:1,count:BATCH_SIZE,source:'Curated, deterministic Pam 500 expansion catalogue',profiles:selected};
await writeFile(targetPath,JSON.stringify(doc,null,2)+'\n');
console.log('PAM_500_GENERATED='+selected.length+' candidatesSkipped='+skipped+' identicalProfilesRejected='+indistinguishable+' groups='+JSON.stringify(byGroup));
