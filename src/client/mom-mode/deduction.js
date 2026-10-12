(function(global){
'use strict';
const Engine=global.MomBayes;
if(!Engine) throw new Error('Mom Mode engine failed to load before deduction layer');

const {FEATURES,OBJECTS,N,F,truth}=Engine;
const featureIndex=Object.fromEntries(FEATURES.map((feature,index)=>[feature.id,index]));
const original={choose:Engine.choose,answer:Engine.answer,deferGuess:Engine.deferGuess,selfPlay:Engine.selfPlay};

const ROOT_IDS=['person','animal','plant','place','food','drink','object'];
const ROOT_BY_KIND={
 person:'person',animal:'animal',plant:'plant',place:'place',food:'food',drink:'drink',
 artwork:'object',book:'object',invention:'object',product:'object'
};
const BROAD_IDS=new Set(['alive','person','animal','plant','place','food','drink','object','manmade']);
const ANIMAL_IDS=new Set(['pet','farm','wild','bird','insect','mammal','fur']);
const FOOD_IDS=new Set(['fruit','vegetable','baked','dairy','meat','dessert','frozen','caffeinated','citrus','berry','rootVeg','leafyVeg','coffeeBased','teaBased','lemonBased']);
const PLACE_IDS=new Set(['building','naturalPlace','shopping','preparedFood']);
const PERSON_IDS=new Set(['profession','prescribe']);
const TECH_IDS=new Set(['electronic','battery','screen','computer','phone']);
const MATERIAL_IDS=new Set(['metal','wood','paper','plastic']);
const TRANSPORT_IDS=new Set(['vehicle','wheels','road','rail','air','sea']);
const CATEGORY_IDS=new Set(['household','wearable','vehicle','tool','toy','sports','music','communication','cleaning','furniture','clothing','nature','medical','profession','appliance','container','building','naturalPlace','fruit','vegetable','dessert','computer','phone']);

function metadataFor(feature){
 const id=feature.id;
 const meta={family:feature.group||'attribute',breadth:feature.requires?'specific':'attribute',reliability:0.94,minCoverage:0};
 if(BROAD_IDS.has(id)){meta.family=id==='manmade'?'origin':'ontology';meta.breadth='broad';meta.reliability=0.99;}
 if(CATEGORY_IDS.has(id)){meta.family='category';meta.breadth='category';meta.reliability=0.97;}
 if(ANIMAL_IDS.has(id)){meta.family='animal';meta.breadth=CATEGORY_IDS.has(id)?'category':'attribute';meta.appliesTo=['animal'];meta.minCoverage=0.45;}
 if(FOOD_IDS.has(id)){meta.family='food';meta.appliesTo=['food','drink'];meta.minCoverage=0.4;}
 if(PLACE_IDS.has(id)){meta.family='place';meta.appliesTo=['place'];meta.minCoverage=0.45;}
 if(PERSON_IDS.has(id)){meta.family='person';meta.appliesTo=['person'];meta.minCoverage=0.45;}
 if(TECH_IDS.has(id)){meta.family='technology';meta.appliesTo=['object'];meta.minCoverage=0.35;}
 if(MATERIAL_IDS.has(id)){meta.family='material';meta.appliesTo=['object'];meta.minCoverage=0.35;}
 if(TRANSPORT_IDS.has(id)){meta.family='transport';meta.appliesTo=['object'];meta.minCoverage=0.35;}
 if(id==='manmade'){meta.excludes=['person','animal','plant'];meta.minCoverage=0.55;}
 if(id==='edible'){meta.excludes=['person','place'];meta.family='food';}
 if(id==='alive'){meta.family='ontology';meta.breadth='broad';}
 if(id.startsWith('gk_')){meta.family='general_knowledge';meta.breadth=feature.requires?'specific':'category';meta.reliability=0.95;}
 if(feature.requires){meta.breadth='specific';meta.reliability=Math.min(meta.reliability,0.96);}
 return meta;
}

const QUESTION_META=FEATURES.map(metadataFor);

function candidateRoot(i){
 for(const id of ROOT_IDS){
  const f=featureIndex[id];
  if(f!=null&&truth[i*F+f]===1)return id;
 }
 return ROOT_BY_KIND[String(OBJECTS[i]?.kind||'')]||null;
}

function candidateApplicability(meta,i){
 const root=candidateRoot(i);
 const kind=String(OBJECTS[i]?.kind||'');
 const labels=new Set([root,kind].filter(Boolean));
 if(meta.excludes?.some(value=>labels.has(value)))return 0;
 if(!meta.appliesTo?.length)return 1;
 if(meta.appliesTo.some(value=>labels.has(value)))return 1;
 if(!root&&!kind)return 0.5;
 return 0;
}

function semanticCoverage(game,f){
 const meta=QUESTION_META[f];
 let total=0,covered=0;
 for(let i=0;i<N;i++){
  const p=game.belief[i];
  if(p<=1e-15)continue;
  total+=p;
  covered+=p*candidateApplicability(meta,i);
 }
 return total>0?covered/total:0;
}

function knownCoverage(game,f){
 let total=0,known=0;
 for(let i=0;i<N;i++){
  const p=game.belief[i];
  if(p<=1e-15)continue;
  total+=p;
  if(Number.isFinite(truth[i*F+f]))known+=p;
 }
 return total>0?known/total:0;
}

function stageFactor(turn,breadth){
 if(turn<=2)return breadth==='broad'?1.25:breadth==='category'?1.03:breadth==='specific'?0.58:0.82;
 if(turn<=7)return breadth==='broad'?1.02:breadth==='category'?1.18:breadth==='specific'?0.78:1;
 if(turn<=13)return breadth==='broad'?0.88:breadth==='category'?1.03:breadth==='specific'?1.02:1.1;
 return breadth==='broad'?0.78:breadth==='category'?0.94:breadth==='specific'?1.2:1.03;
}

function repetitionFactor(game,f){
 const family=QUESTION_META[f].family;
 const recent=(game.history||[]).filter(item=>item.kind==='question').slice(-2).map(item=>featureIndex[item.id]).filter(index=>index!=null);
 if(!recent.length)return 1;
 if(QUESTION_META[recent[recent.length-1]]?.family===family)return 0.72;
 if(recent.some(index=>QUESTION_META[index]?.family===family))return 0.88;
 return 1;
}

function sequenceFactor(game,f){
 const meta=QUESTION_META[f];
 const strongPositive=ROOT_IDS.some(id=>{
  const answer=game.answers.get(id);
  return answer==='yes'||answer==='probably';
 });
 if(!strongPositive&&meta.family==='ontology')return 1.12;
 if(strongPositive&&meta.family==='ontology'&&meta.breadth==='broad')return 0.9;
 return 1;
}

function questionScore(game,f){
 if(game.asked.has(f)||!Engine.questionAllowed(game,f))return {score:0,gain:0,semantic:0,known:0,eligible:false};
 const gain=Engine.questionGain(game.belief,f,game.noise);
 if(gain<=1e-12)return {score:0,gain,semantic:0,known:0,eligible:false};
 const meta=QUESTION_META[f];
 const semantic=semanticCoverage(game,f);
 if(meta.minCoverage&&semantic<meta.minCoverage)return {score:0,gain,semantic,known:knownCoverage(game,f),eligible:false};
 const known=knownCoverage(game,f);
 const semanticFactor=0.45+0.55*semantic;
 const knownFactor=0.3+0.7*known;
 const score=gain*semanticFactor*knownFactor*meta.reliability*stageFactor(game.turn,meta.breadth)*repetitionFactor(game,f)*sequenceFactor(game,f);
 return {score,gain,semantic,known,eligible:true,meta};
}

function bestNaturalQuestion(game){
 let best=null;
 for(let f=0;f<F;f++){
  const ranked=questionScore(game,f);
  if(!ranked.eligible)continue;
  if(!best||ranked.score>best.score+1e-12||(Math.abs(ranked.score-best.score)<=1e-12&&ranked.gain>best.gain))best={index:f,...ranked};
 }
 return best;
}

function rerankQuestion(game,action){
 if(!action||action.kind!=='question')return action;
 const ranked=bestNaturalQuestion(game);
 if(!ranked)return action;
 const feature=FEATURES[ranked.index];
 return {...action,index:ranked.index,id:feature.id,text:feature.q,gain:ranked.gain,naturalScore:ranked.score,semanticCoverage:ranked.semantic,knownCoverage:ranked.known};
}

function choose(game){return rerankQuestion(game,original.choose(game));}
function answer(game,question,value){return rerankQuestion(game,original.answer(game,question,value));}
function deferGuess(game,hunch){return rerankQuestion(game,original.deferGuess(game,hunch));}
function selfPlay(secret,opts={}){
 const game=Engine.createGame(opts);
 let action=choose(game);
 while(game.status==='playing'){
  if(action.kind==='hunch'){action=Engine.commitGuess(game,action);continue;}
  if(action.kind==='guess'){
   const ok=action.index===secret;
   const result=Engine.confirm(game,action,ok);
   return {won:ok,turns:game.turn,guess:action.label,score:result.score,stumped:false};
  }
  if(action.kind==='stumped')break;
  action=answer(game,action,Engine.oracle(secret,action));
 }
 return {won:false,turns:game.turn,guess:null,score:Engine.scoreFor(game.turn,false,true,game.continueCost),stumped:true};
}

Object.assign(Engine,{choose,answer,deferGuess,selfPlay,QUESTION_META,questionMeta:metadataFor,semanticCoverage,knownCoverage,questionScore,bestNaturalQuestion});
})(typeof window!=='undefined'?window:globalThis);
