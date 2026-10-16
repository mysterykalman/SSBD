import {readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const refRoot=join(root,'data','pam20q','reference');
const extRoot=join(root,'data','pam20q','extensions');
const ACTIVE_EXTENSION_TARGETS=200;

const TRAIT_INDEX=Object.freeze({
  hold:4,box:5,white:6,joy:7,smallBread:8,black:9,household:10,wet:11,largerButter:12,colorful:13,hole:14,round:15,breakDrop:16,open:17,flat:18,fragile:19,soft:20,dangerous:21,smallGolf:22,bright:23,bigMicrowave:24,songs:25,plastic:26,brown:27,refill:28,heavy:29,noise:30,roll:31,heard:32,electronic:33,lift:34,love:35,buttons:36,buy:37,played:38,heavierDuck:39,lights:40,old:41,burn:42,veryLarge:43,pocket:44,float:45,storeInfo:46,move:47,warm:48,manufactured:49,useful:50,cold:51,smell:52,produceLight:53,tool:54,sizes:55,seeThrough:56,bigSofa:57,spin:58,carryThings:59,tall:60,stretch:61,legs:62,computer:63,goodSmell:64,hot:65,sharp:66,lostWithout:67,invented:68,head:69,game:70,specificColor:71,crunchy:72,annoying:73,green:74,pairs:75,wear:76,carryPeople:77,slippery:78,ring:79,mechanical:80,recycle:81,shade:82,seenReal:83,climb:84,eat:85,sweet:86,red:87,trunk:88,forest:89,longTail:90,leaves:91,cool:92,garden:93,swim:94,communicate:95,groups:96,alive:97,motorized:98,eggs:99,water:100,fluffy:101,delivered:102,bodyPart:103,stone:104,smellSweet:105,toughSkin:106,colorless:107,yellow:108,seeds:109,touchPole:110,growl:111,spontaneous:112,dogType:113,transport:114,carnivore:115,clear:116,tasty:117,blowUp:118,vegetarian:119,saltWater:120,abstract:121,addictive:122,striped:123,rodent:124,furry:125,warmBlood:126,organic:127,herbivore:128,spine:129,roots:130,paws:131,living:132,needLove:133,spotted:134,nocturnal:135,hop:136,beOne:137,intelligent:138,coldBlood:139,tools:140,wearHead:141,scavenger:142,touch:143,farm:144,fish:145,shell:146,insect:147,combustible:148,feathers:149,jump:150,rootVeg:151,mammal:152,wings:153,feet:154,hooves:155
});

const KIND=Object.freeze({
  amphibian:{category:'animal',yes:['alive','living','organic','coldBlood','spine','feet']},
  mammal:{category:'animal',yes:['alive','living','organic','mammal','warmBlood','spine','feet']},
  hoof_mammal:{category:'animal',yes:['alive','living','organic','mammal','warmBlood','spine','feet','hooves']},
  aquatic_mammal:{category:'animal',yes:['alive','living','organic','mammal','warmBlood','spine','water','swim']},
  egg_mammal:{category:'animal',yes:['alive','living','organic','mammal','warmBlood','spine','feet','eggs']},
  bird:{category:'animal',yes:['alive','living','organic','warmBlood','spine','feet','feathers','wings','eggs']},
  fish:{category:'animal',yes:['alive','living','organic','coldBlood','spine','fish','water','swim']},
  aquatic_invertebrate:{category:'animal',yes:['alive','living','organic','coldBlood','water']},
  invertebrate:{category:'animal',yes:['alive','living','organic','coldBlood']},
  prepared_food:{category:'other',yes:['eat','tasty','buy'],weakYes:['goodSmell','delivered']},
  plant_food:{category:'vegetable',yes:['eat','tasty','buy','organic'],weakYes:['goodSmell']},
  drink:{category:'other',yes:['buy'],weakYes:['tasty','sweet','cold']},
  tech:{category:'other',yes:['electronic','manufactured','invented','buy','useful'],weakYes:['buttons','lights']},
  tech_small:{category:'other',yes:['electronic','manufactured','invented','buy','useful','smallBread'],weakYes:['buttons','lights','pocket']},
  wearable_tech:{category:'other',yes:['electronic','manufactured','invented','buy','useful','wear'],weakYes:['buttons','lights']},
  appliance:{category:'other',yes:['electronic','manufactured','invented','buy','useful','household'],weakYes:['heavy','buttons','lights']},
  appliance_small:{category:'other',yes:['electronic','manufactured','invented','buy','useful','household','hold'],weakYes:['buttons','lights']},
  vehicle_small:{category:'other',yes:['manufactured','buy','move','transport','carryPeople'],weakYes:['motorized']},
  object:{category:'other',yes:['manufactured','buy','touch']},
  object_small:{category:'other',yes:['manufactured','buy','touch','smallBread']},
  other_abstract:{category:'other',yes:['abstract']},
  container:{category:'other',yes:['manufactured','buy','touch','carryThings','open']},
  container_wearable:{category:'other',yes:['manufactured','buy','touch','carryThings','open','wear']},
  tool:{category:'other',yes:['manufactured','buy','touch','tool','useful']},
  tool_small:{category:'other',yes:['manufactured','buy','touch','tool','useful','smallBread'],weakYes:['pocket']},
  tool_kitchen:{category:'other',yes:['manufactured','buy','touch','tool','useful']},
  tool_household:{category:'other',yes:['manufactured','buy','touch','tool','useful','household']},
  tool_power:{category:'other',yes:['manufactured','buy','tool','useful','electronic','invented'],weakYes:['buttons','lights']},
  wearable_object:{category:'other',yes:['manufactured','buy','touch','wear']},
  soft_object:{category:'other',yes:['manufactured','buy','touch','soft']},
  sports:{category:'other',yes:['manufactured','buy','touch','game']},
  sports_ball:{category:'other',yes:['manufactured','buy','touch','game','round','roll']}
});

const CATEGORY_INDEX=Object.freeze({animal:0,vegetable:1,mineral:2,other:3});

async function findPinnedModel(){
  const dirs=await readdir(refRoot,{withFileTypes:true});
  for(const entry of dirs){
    if(!entry.isDirectory())continue;
    const dir=join(refRoot,entry.name);
    const q=join(dir,'questions.json'),t=join(dir,'targets.json'),w=join(dir,'weights.u2states.bin');
    if(existsSync(q)&&existsSync(t)&&existsSync(w))return{q,t,w};
  }
  throw new Error('Pinned Pam classic 20Q model files were not found under data/pam20q/reference');
}

function desiredTraits(profile){
  const template=KIND[profile.kind];
  if(!template)throw new Error(`Unknown Pam extension kind: ${profile.kind}`);
  const desired=new Map();
  const selected=CATEGORY_INDEX[template.category];
  for(let q=0;q<4;q++)desired.set(q,{yes:q===selected,power:3});
  for(const key of template.yes||[])desired.set(TRAIT_INDEX[key],{yes:true,power:3});
  for(const key of template.weakYes||[])desired.set(TRAIT_INDEX[key],{yes:true,power:1});
  for(const key of profile.yes||[])desired.set(TRAIT_INDEX[key],{yes:true,power:3});
  for(const key of profile.weakYes||[])desired.set(TRAIT_INDEX[key],{yes:true,power:1});
  for(const key of profile.no||[])desired.set(TRAIT_INDEX[key],{yes:false,power:3});
  for(const [q] of desired)if(q==null)throw new Error(`Pam extension contains an unknown trait in ${profile.name}`);
  return desired;
}

function choosePrototype(profile,baseWeights,baseCount,questionCount,used){
  const desired=desiredTraits(profile);
  let best=-1,bestScore=-Infinity;
  for(let t=0;t<baseCount;t++){
    let score=used.has(t)?-1.75:0;
    for(const [q,want] of desired){
      const state=baseWeights[q*baseCount+t],isYes=(state&1)===1,strong=(state&2)===2;
      const importance=q<4?7:(want.power===3?2.5:1);
      score+=(isYes===want.yes?1:-2.25)*importance*(strong?1.15:0.85);
    }
    if(score>bestScore){bestScore=score;best=t;}
  }
  return best;
}

function compileProfile(profile,questionCount,baseWeights,baseCount,usedPrototypes){
  const prototype=choosePrototype(profile,baseWeights,baseCount,questionCount,usedPrototypes);
  usedPrototypes.add(prototype);
  const states=new Uint8Array(questionCount);
  for(let q=0;q<questionCount;q++)states[q]=(baseWeights[q*baseCount+prototype]&1)?1:0;
  const desired=desiredTraits(profile);
  for(const [q,want] of desired)states[q]=want.yes?(want.power===3?3:1):(want.power===3?2:0);
  return{states,prototype};
}

export async function loadPamClassicModel(){
  const source=await findPinnedModel();
  const [questionsRaw,targetsRaw,baseWeightsRaw]=await Promise.all([
    readFile(source.q,'utf8'),readFile(source.t,'utf8'),readFile(source.w)
  ]);
  const questionDoc=JSON.parse(questionsRaw),targetDoc=JSON.parse(targetsRaw);
  const questions=Array.isArray(questionDoc)?questionDoc:questionDoc.questions;
  const baseTargets=Array.isArray(targetDoc)?targetDoc:targetDoc.targets;
  if(!Array.isArray(questions)||questions.length!==156)throw new Error(`Expected 156 Pam questions, found ${questions?.length??'invalid'}`);
  if(!Array.isArray(baseTargets)||baseTargets.length!==1200)throw new Error(`Expected 1200 base Pam targets, found ${baseTargets?.length??'invalid'}`);
  if(baseWeightsRaw.length!==questions.length*baseTargets.length)throw new Error(`Pam base matrix has ${baseWeightsRaw.length} cells; expected ${questions.length*baseTargets.length}`);

  const candidates=[];
  if(existsSync(extRoot)){
    const files=(await readdir(extRoot)).filter(name=>name.endsWith('.json')).sort((a,b)=>{
      const ar=a.includes('reserve'),br=b.includes('reserve');
      if(ar!==br)return ar?1:-1;
      return a.localeCompare(b);
    });
    for(const file of files){
      const doc=JSON.parse(await readFile(join(extRoot,file),'utf8'));
      if(!Array.isArray(doc.profiles))throw new Error(`Pam extension ${file} is missing profiles[]`);
      if(doc.count!=null&&doc.count!==doc.profiles.length)throw new Error(`Pam extension ${file} count mismatch`);
      candidates.push(...doc.profiles);
    }
  }

  const baseSeen=new Set(baseTargets.map(name=>String(name).trim().toLowerCase()));
  const extensionSeen=new Set();
  const accepted=[];
  const skippedBaseDuplicates=[];
  for(const profile of candidates){
    const key=String(profile.name||'').trim().toLowerCase();
    if(!key)throw new Error('Pam extension contains a blank target name');
    if(baseSeen.has(key)){skippedBaseDuplicates.push(profile.name);continue;}
    if(extensionSeen.has(key))throw new Error(`Pam extension contains duplicate candidate: ${profile.name}`);
    extensionSeen.add(key);
    accepted.push(profile);
  }
  if(accepted.length<ACTIVE_EXTENSION_TARGETS)throw new Error(`Pam expansion has only ${accepted.length} unique new targets; expected at least ${ACTIVE_EXTENSION_TARGETS}`);
  const profiles=accepted.slice(0,ACTIVE_EXTENSION_TARGETS);

  const targets=[...baseTargets,...profiles.map(p=>p.name)];
  const weights=Buffer.alloc(questions.length*targets.length);
  for(let q=0;q<questions.length;q++)baseWeightsRaw.copy(weights,q*targets.length,q*baseTargets.length,(q+1)*baseTargets.length);
  const usedPrototypes=new Set(),prototypeNames=[];
  for(let e=0;e<profiles.length;e++){
    const {states,prototype}=compileProfile(profiles[e],questions.length,baseWeightsRaw,baseTargets.length,usedPrototypes);
    prototypeNames.push(baseTargets[prototype]);
    const targetIndex=baseTargets.length+e;
    for(let q=0;q<questions.length;q++)weights[q*targets.length+targetIndex]=states[q];
  }
  for(const value of weights)if(value>3)throw new Error(`Pam matrix contains invalid state ${value}`);
  return{questions,targets,weights,baseTargetCount:baseTargets.length,extensionCount:profiles.length,skippedBaseDuplicates,reserveCandidates:Math.max(0,accepted.length-profiles.length),prototypeNames};
}

export const pamTraitIndex=TRAIT_INDEX;
