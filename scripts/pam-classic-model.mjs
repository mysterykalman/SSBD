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

// Curated differentiators use only ordinary-human properties from the existing 156 questions.
// They exist specifically to separate concepts that otherwise have the same broad profile.
const DISTINCTIVE=Object.freeze({
  'an aye-aye':{yes:['nocturnal','climb','longTail','forest']},
  'a goblin shark':{yes:['dangerous','saltWater'],weakYes:['veryLarge']},
  'a leafy sea dragon':{yes:['green','saltWater'],weakYes:['colorful','smallBread']},
  'a proboscis monkey':{yes:['longTail','climb','forest','groups'],weakYes:['herbivore']},
  'a slow loris':{yes:['nocturnal','climb','forest']},
  'a binturong':{yes:['longTail','climb','forest','nocturnal']},
  'a dik-dik':{yes:['brown'],weakYes:['forest']},
  'a gerenuk':{yes:['tall','brown']},
  'a markhor':{yes:['climb','brown']},
  'a takin':{yes:['heavy','brown']},
  'a musk ox':{yes:['heavy','fluffy','cold']},
  'a harpy eagle':{yes:['forest','dangerous']},
  'a secretary bird':{yes:['tall']},
  'an albatross':{yes:['veryLarge','saltWater']},
  'a Tasmanian devil':{yes:['growl','nocturnal','dangerous']},
  'a caracal':{yes:['jump','climb']},
  'a serval':{yes:['spotted','jump']},
  'a snow leopard':{yes:['spotted','cold','climb']},
  'a clouded leopard':{yes:['spotted','forest','climb']},
  'an arctic fox':{yes:['white','cold']},
  'a honey badger':{yes:['dangerous'],weakYes:['black']},
  'a raccoon dog':{yes:['nocturnal','forest']},
  'a gelada':{yes:['groups','herbivore']},
  'a mandrill':{yes:['colorful','forest','groups']},
  'a bonobo':{yes:['intelligent','groups','forest']},
  'a vicuña':{yes:['fluffy'],weakYes:['brown']},
  'a guanaco':{yes:['tall','brown'],weakYes:['heavy']},
  'a sun bear':{yes:['black','climb','forest']},

  'pho':{yes:['hot','clear'],weakYes:['white']},
  'pad thai':{yes:['hot'],weakYes:['brown','crunchy']},
  'shawarma':{yes:['hot','hold'],weakYes:['brown']},
  'a kebab':{yes:['hot','hold'],weakYes:['brown','sharp']},
  'a brownie':{yes:['brown','sweet','hold']},
  'a dumpling':{yes:['hot','hold'],weakYes:['white']},
  'a spring roll':{yes:['hot','hold','crunchy'],weakYes:['brown']},
  'a samosa':{yes:['hot','hold','crunchy','brown']},
  'curry':{yes:['hot'],weakYes:['colorful']},
  'lasagna':{yes:['hot'],weakYes:['red','flat','box']},
  'risotto':{yes:['hot'],weakYes:['white']},
  'gnocchi':{yes:['hot','white']},
  'pesto':{yes:['green']},
  'oatmeal':{yes:['hot'],weakYes:['brown']},
  'parmesan cheese':{yes:['white'],weakYes:['goodSmell','crunchy']},
  'guacamole':{yes:['green'],weakYes:['cold']},
  'salsa':{yes:['red'],weakYes:['cold']},
  'kimchi':{yes:['red'],weakYes:['crunchy','cold']},
  'sauerkraut':{yes:['white'],weakYes:['crunchy','cold']},
  'edamame':{yes:['green'],weakYes:['hold']},
  'miso soup':{yes:['hot'],weakYes:['brown']},
  'tempura':{yes:['hot','crunchy'],weakYes:['brown']},
  'teriyaki chicken':{yes:['hot','brown']},
  'sweet potato fries':{yes:['hot','crunchy','sweet'],weakYes:['hold']},
  'onion rings':{yes:['hot','crunchy','round','hole','hold']},
  'mozzarella sticks':{yes:['hot','crunchy','white','hold']},
  'a grilled cheese sandwich':{yes:['hot','hold'],weakYes:['brown']},
  'a jam sandwich':{yes:['sweet','hold'],weakYes:['red']},
  'avocado toast':{yes:['green','hold'],weakYes:['crunchy']},
  'a Caesar salad':{yes:['green'],weakYes:['cold','crunchy']},

  'a streaming stick':{yes:['smallBread','pocket','computer']},
  'a smart speaker':{yes:['heard','noise','communicate'],weakYes:['household']},
  'an e-reader':{yes:['flat','hold','storeInfo'],weakYes:['computer']},
  'a fitness tracker':{yes:['wear','smallBread','storeInfo'],weakYes:['pocket']},
  'an electric pressure cooker':{yes:['hot','heavy'],weakYes:['round']},
  'a hoverboard':{yes:['roll','motorized']},
  'a 3D printer':{yes:['bigMicrowave','mechanical'],weakYes:['move']},
  'a wireless charger':{yes:['flat','smallBread'],weakYes:['pocket']},
  'a smart thermostat':{yes:['household','flat'],weakYes:['warm']},
  'a key fob':{yes:['pocket','buttons','smallBread']},
  'a contactless payment card':{yes:['flat','pocket','smallBread']},
  'a portable projector':{yes:['produceLight','bright'],weakYes:['computer']},
  'a portable game console':{yes:['game','buttons','hold','storeInfo']},
  'a water flosser':{yes:['water','refill']},
  'a curling iron':{yes:['hot','round','hold']},
  'an induction cooktop':{yes:['flat','hot'],weakYes:['heavy']},
  'an espresso machine':{yes:['hot','goodSmell','refill'],weakYes:['heavy']},
  'a food processor':{yes:['spin','sharp','noise']},
  'a stand mixer':{yes:['spin','noise','heavy']},
  'a rice cooker':{yes:['hot','round'],weakYes:['heavy']},
  'a slow cooker':{yes:['hot','round','heavy'],weakYes:['warm']},
  'a toaster oven':{yes:['hot','bigMicrowave'],weakYes:['heavy']},
  'a coffee grinder':{yes:['spin','noise','goodSmell'],weakYes:['hold']},
  'a digital kitchen scale':{yes:['flat'],weakYes:['household']},
  'a garlic press':{yes:['mechanical','hold']},
  'a whisk':{yes:['hold'],weakYes:['stretch']},
  'kitchen tongs':{yes:['hold','mechanical'],weakYes:['pairs']},
  'an ice pack':{yes:['cold'],weakYes:['soft']},
  'a laundry hamper':{yes:['household','bigMicrowave'],weakYes:['soft']},
  'a stud finder':{yes:['household','buttons','smallBread'],weakYes:['pocket']},
  'a socket wrench':{yes:['mechanical','hold']},
  'a zip tie':{yes:['stretch','smallBread']},
  'duct tape':{yes:['roll','stretch'],weakYes:['household']},
  'a bungee cord':{yes:['stretch'],weakYes:['longTail']},
  'a camping lantern':{yes:['bright','produceLight'],weakYes:['household']},
  'a trekking pole':{yes:['tall','hold']},
  'a resistance band':{yes:['stretch','soft']},
  'a dumbbell':{yes:['lift','heavy'],weakYes:['pairs']},
  'a reusable shopping bag':{yes:['stretch','soft','carryThings']},
  'a tote bag':{yes:['soft','carryThings'],weakYes:['wear']},
  'a fanny pack':{yes:['wear','carryThings'],weakYes:['pocket']},
  'a screen protector':{yes:['flat','seeThrough'],weakYes:['fragile']},
  'a magnetic phone mount':{yes:['smallBread','mechanical'],weakYes:['household']},
  'a foldable phone':{yes:['flat','pocket','buttons','storeInfo','computer']},
  'a smart ring':{yes:['wear','smallGolf','storeInfo'],weakYes:['pocket']},
  'a USB-C hub':{yes:['smallBread','computer'],weakYes:['pocket']},
  'a portable monitor':{yes:['flat','computer','storeInfo'],weakYes:['hold']},
  'a mesh Wi-Fi router':{yes:['computer','lights'],weakYes:['household']},
  'a solar power bank':{yes:['pocket','smallBread'],weakYes:['refill']},
  'a dash cam':{yes:['storeInfo','smallBread'],weakYes:['computer']},
  'a balance bike':{yes:['roll','transport','carryPeople'],no:['motorized']}
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

function applyTrait(states,key,value){
  const index=TRAIT_INDEX[key];
  if(index==null)throw new Error(`Unknown Pam extension trait: ${key}`);
  states[index]=value;
}

function compileProfile(profile,questionCount){
  const template=KIND[profile.kind];
  if(!template)throw new Error(`Unknown Pam extension kind: ${profile.kind}`);
  const states=new Uint8Array(questionCount);
  states.fill(2);
  const selected=CATEGORY_INDEX[template.category];
  for(let q=0;q<4;q++)states[q]=q===selected?3:2;
  for(const key of template.yes||[])applyTrait(states,key,3);
  for(const key of template.weakYes||[])applyTrait(states,key,1);
  for(const key of profile.yes||[])applyTrait(states,key,3);
  for(const key of profile.weakYes||[])applyTrait(states,key,1);
  for(const key of profile.no||[])applyTrait(states,key,2);
  const extra=DISTINCTIVE[profile.name];
  for(const key of extra?.yes||[])applyTrait(states,key,3);
  for(const key of extra?.weakYes||[])applyTrait(states,key,1);
  for(const key of extra?.no||[])applyTrait(states,key,2);
  return states;
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
  for(let q=0;q<questions.length;q++){
    baseWeightsRaw.copy(weights,q*targets.length,q*baseTargets.length,(q+1)*baseTargets.length);
  }
  for(let e=0;e<profiles.length;e++){
    const states=compileProfile(profiles[e],questions.length);
    const targetIndex=baseTargets.length+e;
    for(let q=0;q<questions.length;q++)weights[q*targets.length+targetIndex]=states[q];
  }
  for(const value of weights)if(value>3)throw new Error(`Pam matrix contains invalid state ${value}`);
  return{questions,targets,weights,baseTargetCount:baseTargets.length,extensionCount:profiles.length,skippedBaseDuplicates,reserveCandidates:Math.max(0,accepted.length-profiles.length)};
}

export const pamTraitIndex=TRAIT_INDEX;
