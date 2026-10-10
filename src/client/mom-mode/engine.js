(function(global){
"use strict";
const base=global.MOM_KNOWLEDGE;
if(!base) throw new Error("Mom knowledge not loaded");
const general=global.MOM_GENERAL_KNOWLEDGE||{FEATURES:[],OBJECTS:[],meta:{}};
const extra=global.MOM_GENERATED_KNOWLEDGE||{FEATURES:[],OBJECTS:[],meta:{}};

const featureMap=new Map();
for(const source of [base.FEATURES||[],general.FEATURES||[],extra.FEATURES||[]]){
 for(const f of source){
  if(!f||!f.id||!f.q)continue;
  if(!featureMap.has(f.id))featureMap.set(f.id,{id:f.id,q:f.q,label:f.label||f.id,group:f.group||null,requires:f.requires||null});
 }
}
const FEATURES=[...featureMap.values()];
const idx=Object.fromEntries(FEATURES.map((f,i)=>[f.id,i]));

const objectMap=new Map();
for(const source of [base.OBJECTS||[],general.OBJECTS||[],extra.OBJECTS||[]]){
 for(const raw of source){
  if(!raw||!raw.name)continue;
  const key=String(raw.name).trim().toLocaleLowerCase("en");
  const clean={
   ...raw,
   name:String(raw.name).trim(),
   yes:[...new Set((raw.yes||[]).filter(id=>idx[id]!=null))],
   maybe:[...new Set((raw.maybe||[]).filter(id=>idx[id]!=null))],
   weight:Number.isFinite(Number(raw.weight))&&Number(raw.weight)>0?Number(raw.weight):1
  };
  if(!objectMap.has(key)){objectMap.set(key,clean);continue;}
  const old=objectMap.get(key);
  old.yes=[...new Set([...old.yes,...clean.yes])];
  old.maybe=[...new Set([...old.maybe,...clean.maybe].filter(id=>!old.yes.includes(id)))];
  old.weight=Math.max(old.weight,clean.weight);
  objectMap.set(key,{...clean,...old,yes:old.yes,maybe:old.maybe,weight:old.weight});
 }
}
const OBJECTS=[...objectMap.values()];
const N=OBJECTS.length,F=FEATURES.length;

const yesByObject=OBJECTS.map(o=>new Set(o.yes.map(id=>idx[id])));
const maybeByObject=OBJECTS.map(o=>new Set(o.maybe.map(id=>idx[id])));
const yesByFeature=Array.from({length:F},()=>[]);
const maybeByFeature=Array.from({length:F},()=>[]);
for(let i=0;i<N;i++){
 for(const f of yesByObject[i])yesByFeature[f].push(i);
 for(const f of maybeByObject[i])maybeByFeature[f].push(i);
}

const truthAt=(i,f)=>yesByObject[i].has(f)?1:maybeByObject[i].has(f)?0.5:0;
const binaryEntropy=p=>p<=1e-12||p>=1-1e-12?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p);
const py=(t,noise)=>t*(1-noise)+(1-t)*noise;
function entropy(b){let h=0;for(const p of b)if(p>1e-12)h-=p*Math.log2(p);return h;}

function featureMasses(game){
 const yes=new Float64Array(F),maybe=new Float64Array(F);
 for(let i=0;i<N;i++){
  const p=game.belief[i];
  if(p<=1e-12)continue;
  for(const f of yesByObject[i])yes[f]+=p;
  for(const f of maybeByObject[i])maybe[f]+=p;
 }
 return {yes,maybe};
}
function evalMass(y,m,noise){
 const n=Math.max(0,1-y-m);
 const p1=py(1,noise),p05=py(0.5,noise),p0=py(0,noise);
 const out=y*p1+m*p05+n*p0;
 return binaryEntropy(out)-(y*binaryEntropy(p1)+m*binaryEntropy(p05)+n*binaryEntropy(p0));
}
function normalize(b){
 let sum=0;for(const p of b)sum+=p;
 if(sum<=1e-15)return false;
 for(let i=0;i<b.length;i++)b[i]/=sum;
 return true;
}
function priors(){
 const b=new Float64Array(N);let sum=0;
 for(let i=0;i<N;i++){b[i]=OBJECTS[i].weight;sum+=b[i];}
 if(!sum)return b.fill(1/N);
 for(let i=0;i<N;i++)b[i]/=sum;
 return b;
}
function createGame(opts={}){
 return{
  belief:priors(),
  asked:new Set(),
  answers:new Map(),
  rejected:new Set(),
  turn:0,
  budget:opts.budget||20,
  noise:opts.noise??0.07,
  guessThreshold:opts.guessThreshold??0.86,
  pending:null,
  status:"playing",
  history:[],
  surprise:false,
  wrongGuesses:0
 };
}
function top(game){
 let j=-1,p=-1;
 for(let i=0;i<N;i++){
  if(game.rejected.has(i))continue;
  if(game.belief[i]>p){p=game.belief[i];j=i;}
 }
 if(j<0)return null;
 return{index:j,p,object:OBJECTS[j]};
}
function result(game,reason="stumped"){
 return{kind:"result",winner:"player",reason,turns:game.turn,maxQuestions:game.budget,wrongGuesses:game.wrongGuesses};
}
function choose(game){
 if(game.status!=="playing")return result(game,game.status);
 if(game.turn>=game.budget){game.status="stumped";return result(game);}
 const leader=top(game);
 if(!leader){game.status="stumped";return result(game,"no-candidates");}
 if(leader.p>=game.guessThreshold||game.turn>=game.budget-1){
  return{kind:"guess",index:leader.index,label:leader.object.name,text:guessText(leader.object),confidence:leader.p};
 }
 const masses=featureMasses(game);let best=-1,bg=-1;
 for(let f=0;f<F;f++){
  if(game.asked.has(f))continue;
  const req=FEATURES[f].requires;
  if(req){const ri=idx[req],a=ri==null?null:game.answers.get(ri);if(a!=="yes"&&a!=="probably")continue;}
  const g=evalMass(masses.yes[f],masses.maybe[f],game.noise);
  if(g>bg){bg=g;best=f;}
 }
 if(best<0||bg<1e-5){
  return{kind:"guess",index:leader.index,label:leader.object.name,text:guessText(leader.object),confidence:leader.p};
 }
 return{kind:"question",index:best,id:FEATURES[best].id,text:FEATURES[best].q,gain:bg,confidence:leader.p};
}
function guessText(o){
 const n=o.name.toLowerCase();
 if(o.article==="")return`Is it ${n}?`;
 if(o.article)return`Is it ${o.article} ${n}?`;
 if(o.specificPerson||o.kind==="person")return`Are you thinking of ${o.name}?`;
 if(o.proper)return`Is it ${o.name}?`;
 return`Is it ${"aeiou".includes(n[0])?"an":"a"} ${n}?`;
}
const MIX={yes:[1,0],probably:[0.75,0.25],unknown:null,probably_not:[0.25,0.75],no:[0,1]};
function answer(game,q,a){
 if(game.status!=="playing")throw new Error("game finished");
 if(q.kind!=="question")throw new Error("answer requires a question");
 const mix=MIX[a];if(mix===undefined)throw new Error("unsupported answer");
 game.asked.add(q.index);game.answers.set(q.index,a);game.turn++;game.surprise=false;
 if(mix){
  const before=top(game)?.p||0;
  let sum=0;
  for(let i=0;i<N;i++){
   if(game.rejected.has(i)){game.belief[i]=0;continue;}
   const y=py(truthAt(i,q.index),game.noise);
   const likelihood=mix[0]*y+mix[1]*(1-y);
   game.belief[i]*=likelihood;sum+=game.belief[i];
  }
  if(sum>1e-15)for(let i=0;i<N;i++)game.belief[i]/=sum;
  const after=top(game)?.p||0;
  game.surprise=before>0&&after<before*0.55;
 }
 game.history.push({kind:"question",question:q.text,answer:a});
 return choose(game);
}
function acceptGuess(game,q){
 if(game.status!=="playing")throw new Error("game finished");
 if(q.kind!=="guess")throw new Error("not a guess");
 game.turn++;game.status="won";
 game.history.push({kind:"guess",question:q.text,answer:"yes"});
 return{kind:"result",winner:"pam",correct:true,guess:q.label,turns:game.turn,maxQuestions:game.budget,wrongGuesses:game.wrongGuesses};
}
function rejectGuess(game,q){
 if(game.status!=="playing")throw new Error("game finished");
 if(q.kind!=="guess")throw new Error("not a guess");
 game.turn++;game.wrongGuesses++;game.rejected.add(q.index);game.belief[q.index]=0;normalize(game.belief);
 game.history.push({kind:"guess",question:q.text,answer:"no"});
 if(game.turn>=game.budget){game.status="stumped";return result(game);}
 return choose(game);
}
function confirm(game,q,correct){return correct?acceptGuess(game,q):rejectGuess(game,q);}
function oracle(secret,q){
 if(q.kind==="guess")return q.index===secret?"yes":"no";
 const t=truthAt(secret,q.index);return t===1?"yes":t===0?"no":"unknown";
}
function selfPlay(secret,opts={}){
 const g=createGame(opts);let q=choose(g);
 while(g.status==="playing"&&g.turn<g.budget){
  if(q.kind==="result")break;
  if(q.kind==="guess"){
   if(q.index===secret)return acceptGuess(g,q);
   q=rejectGuess(g,q);continue;
  }
  q=answer(g,q,oracle(secret,q));
 }
 return{kind:"result",winner:"player",correct:false,turns:g.turn,guess:top(g)?.object?.name||null};
}
global.MomBayes={
 FEATURES,OBJECTS,N,F,meta:{baseObjects:(base.OBJECTS||[]).length,generalObjects:(general.OBJECTS||[]).length,generatedObjects:(extra.OBJECTS||[]).length,...(extra.meta||{})},
 createGame,choose,answer,confirm,acceptGuess,rejectGuess,top,selfPlay,oracle,entropy,truthAt
};
if(typeof module!=="undefined")module.exports=global.MomBayes;
})(typeof window!=="undefined"?window:globalThis);
