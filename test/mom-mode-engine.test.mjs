import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

async function load(){
 const ctx={globalThis:null};ctx.globalThis=ctx;vm.createContext(ctx);
 for(const file of ["src/client/mom-mode/knowledge.js","src/client/mom-mode/engine.js"]){vm.runInContext(await readFile(file,"utf8"),ctx,{filename:file});}
 return ctx.MomBayes;
}

test("Mom Mode knowledge is broad and distinguishable",async()=>{
 const e=await load();assert.ok(e.N>=150);assert.ok(e.F>=80);
 const vectors=new Set;
 for(let i=0;i<e.N;i++){
  let key="";for(let f=0;f<e.F;f++)key+=e.truth[i*e.F+f]+",";
  assert.ok(!vectors.has(key),`duplicate feature vector: ${e.OBJECTS[i].name}`);vectors.add(key);
 }
});

test("truthful self-play always resolves within the 20-question limit",async()=>{
 const e=await load();
 const sample=[...new Set(Array.from({length:24},(_,n)=>Math.round(n*(e.N-1)/23)))];
 for(const i of sample){
  const r=e.selfPlay(i);
  assert.ok(r.turns<=20,`${e.OBJECTS[i].name} took ${r.turns} questions`);
  assert.equal(typeof r.score,"number");
  if(r.stumped)assert.equal(r.guess,null);
 }
});

test("person answers suppress object-style questions such as man-made",async()=>{
 const e=await load();
 const g=e.createGame();
 const personIndex=e.FEATURES.findIndex(f=>f.id==="person");
 const manmadeIndex=e.FEATURES.findIndex(f=>f.id==="manmade");
 g.answers.set("person","yes");
 assert.equal(e.questionAllowed(g,manmadeIndex),false);
 assert.equal(e.questionAllowed(g,personIndex),true);
});

test("Pam cannot guess before five questions even at extreme confidence",async()=>{
 const e=await load();
 const g=e.createGame({guessThreshold:0});
 g.belief.fill(0);g.belief[0]=0.99;g.belief[1]=0.01;
 g.turn=4;
 assert.equal(e.guessReason(g),null);
 g.turn=5;
 assert.equal(e.guessReason(g)?.reason,"confidence");
});

test("logical certainty forces a guess once the minimum question count is reached",async()=>{
 const e=await load();
 const g=e.createGame();
 const target=0,feature=0;
 for(let i=0;i<e.N;i++)e.truth[i*e.F+feature]=i===target?1:0;
 g.answers.set(e.FEATURES[feature].id,"yes");g.turn=5;
 const viable=e.viableCandidates(g);
 assert.deepEqual(Array.from(viable),[target]);
 const reason=e.guessReason(g);
 assert.equal(reason.reason,"logical");
 assert.equal(reason.index,target);
});

test("a strong hunch lets the player force a guess or buy another question",async()=>{
 const e=await load();
 const pair=(()=>{for(let f=0;f<e.F;f++)for(let a=0;a<e.N;a++)for(let b=a+1;b<e.N;b++){const x=e.truth[a*e.F+f],y=e.truth[b*e.F+f];if((x===0&&y===1)||(x===1&&y===0))return{a,b};}return null;})();
 assert.ok(pair,"fixture needs a known feature that separates two candidates");
 const g=e.createGame({guessThreshold:0.9,minGuessQuestions:5,continuePrice:2});
 g.belief.fill(0);g.belief[pair.a]=0.96;g.belief[pair.b]=0.04;g.turn=5;
 const h=e.choose(g);
 assert.equal(h.kind,"hunch");
 assert.equal(h.continuePrice,2);
 const continued=e.deferGuess(g,h);
 assert.equal(g.continueCost,2);
 assert.equal(continued.kind,"question");
 const g2=e.createGame({guessThreshold:0.9,minGuessQuestions:5});
 g2.belief.fill(0);g2.belief[pair.a]=0.96;g2.belief[pair.b]=0.04;g2.turn=5;
 const h2=e.choose(g2);const guess=e.commitGuess(g2,h2);
 assert.equal(guess.kind,"guess");
 assert.equal(guess.index,pair.a);
});

test("Pam gets exactly one guess and a wrong guess ends the round",async()=>{
 const e=await load();
 const g=e.createGame();g.turn=8;
 const q={kind:"guess",index:0,label:e.OBJECTS[0].name,text:"Guess?",reason:"confidence"};
 const r=e.confirm(g,q,false);
 assert.equal(r.done,true);
 assert.equal(g.status,"lost");
 assert.equal(g.guessUsed,true);
 assert.throws(()=>e.confirm(g,q,false),/game finished|guess already used/);
});

test("continuing costs round points and 20 questions without a guess is a stump",async()=>{
 const e=await load();
 assert.equal(e.scoreFor(12,false,false,0),22);
 assert.equal(e.scoreFor(12,false,false,4),18);
 assert.equal(e.scoreFor(12,true,false,4),8);
 const g=e.createGame();g.turn=20;g.continueCost=4;
 const result=e.choose(g);
 assert.equal(result.kind,"stumped");
 assert.equal(result.score,26);
});


test("missing Mom traits are unknown rather than explicit no",async()=>{
 const e=await load();
 let pair=null;
 for(let i=0;i<e.N&&!pair;i++){
  const o=e.OBJECTS[i];
  const known=new Set([...(o.yes||[]),...(o.maybe||[]),...(o.no||[])]);
  const f=e.FEATURES.findIndex(feature=>!known.has(feature.id));
  if(f>=0)pair={i,f};
 }
 assert.ok(pair,"expected at least one sparse concept/feature pair");
 const value=e.truth[pair.i*e.F+pair.f];
 assert.equal(Number.isNaN(value),true,"missing evidence must use unknown sentinel");
 assert.equal(e.oracle(pair.i,{kind:"question",index:pair.f}),"unknown");
});

test("unknown evidence does not eliminate a candidate on hard yes/no answers",async()=>{
 const e=await load();
 let pair=null;
 for(let i=0;i<e.N&&!pair;i++){
  const o=e.OBJECTS[i];
  const known=new Set([...(o.yes||[]),...(o.maybe||[]),...(o.no||[])]);
  const f=e.FEATURES.findIndex(feature=>!known.has(feature.id));
  if(f>=0)pair={i,f,id:e.FEATURES[f].id};
 }
 assert.ok(pair);
 for(const answer of ["yes","no"]){
  const g=e.createGame();
  g.answers.set(pair.id,answer);
  assert.ok(e.viableCandidates(g).includes(pair.i),`unknown candidate was eliminated by ${answer}`);
 }
});


test("unknown traits are an explicit third outcome with no information gain",async()=>{
 const e=await load();
 let pair=null;
 for(let f=0;f<e.F&&!pair;f++){
  for(let a=0;a<e.N&&!pair;a++){
   for(let b=a+1;b<e.N;b++){
    const x=e.truth[a*e.F+f],y=e.truth[b*e.F+f];
    if(!Number.isFinite(x)&&!Number.isFinite(y)){pair={f,a,b};break;}
   }
  }
 }
 assert.ok(pair,"fixture needs two candidates with unknown evidence for a shared trait");
 const belief=new Float64Array(e.N);belief[pair.a]=0.5;belief[pair.b]=0.5;
 assert.equal(e.questionGain(belief,pair.f,0.06),0);
 const game=e.createGame();const question={kind:"question",index:pair.f,id:e.FEATURES[pair.f].id,text:e.FEATURES[pair.f].q};const before=Array.from(game.belief);const next=e.answer(game,question,"unknown");
 assert.deepEqual(Array.from(game.belief),before);
 assert.ok(next.kind==="question"||next.kind==="hunch"||next.kind==="guess"||next.kind==="stumped");
});

test("late-round confidence can surface a separated sparse-evidence hunch",async()=>{
 const e=await load();
 const g=e.createGame({guessThreshold:0.92,minGuessQuestions:5});
 g.belief.fill(0);
 g.belief[0]=0.24;
 g.belief[1]=0.13;
 const rest=(1-0.37)/(e.N-2);
 for(let i=2;i<e.N;i++)g.belief[i]=rest;
 g.turn=16;
 const action=e.choose(g);
 assert.equal(action.kind,"hunch");
 assert.equal(action.index,0);
});
