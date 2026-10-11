(function(global){
'use strict';
const DATA=global.MOM_KNOWLEDGE; if(!DATA) throw new Error('Mom knowledge not loaded');
const {FEATURES,OBJECTS}=DATA, N=OBJECTS.length, F=FEATURES.length;
const idx=Object.fromEntries(FEATURES.map((f,i)=>[f.id,i]));
const truth=new Float64Array(N*F);
OBJECTS.forEach((o,i)=>{for(const id of o.yes||[]) if(idx[id]!=null) truth[i*F+idx[id]]=1; for(const id of o.maybe||[]) if(idx[id]!=null) truth[i*F+idx[id]]=0.5;});
function entropy(b){let h=0;for(const p of b)if(p>1e-12)h-=p*Math.log2(p);return h;}
function py(t,noise){return t*(1-noise)+(1-t)*noise;}
function evalQ(b,f,noise){let y=0;for(let i=0;i<N;i++)y+=b[i]*py(truth[i*F+f],noise);let n=1-y,hy=0,hn=0;if(y>1e-12)for(let i=0;i<N;i++){const p=b[i]*py(truth[i*F+f],noise)/y;if(p>1e-12)hy-=p*Math.log2(p);}if(n>1e-12)for(let i=0;i<N;i++){const p=b[i]*(1-py(truth[i*F+f],noise))/n;if(p>1e-12)hn-=p*Math.log2(p);}return entropy(b)-(y*hy+n*hn);}
function createGame(opts={}){return{belief:new Float64Array(N).fill(1/N),asked:new Set(),answers:new Map(),turn:0,budget:opts.budget||20,noise:opts.noise??0.06,guessThreshold:opts.guessThreshold??0.92,minGuessQuestions:opts.minGuessQuestions??5,continuePrice:opts.continuePrice??2,pending:null,status:'playing',history:[],surprise:false,guessUsed:false,continueCost:0,deferGuessOnce:false};}
function top(game){let j=0;for(let i=1;i<N;i++)if(game.belief[i]>game.belief[j])j=i;return{index:j,p:game.belief[j],object:OBJECTS[j]};}
function topTwo(game){let a=-1,b=-1;for(let i=0;i<N;i++){if(a<0||game.belief[i]>game.belief[a]){b=a;a=i;}else if(b<0||game.belief[i]>game.belief[b])b=i;}return{first:a,second:b,firstP:a<0?0:game.belief[a],secondP:b<0?0:game.belief[b]};}
const strongYes=a=>a==='yes'||a==='probably';
const OBJECTISH=new Set(['manmade','household','kitchen','bedroom','bathroom','wearable','electronic','battery','screen','wheels','vehicle','handheld','soft','fragile','metal','wood','paper','plastic','round','handle','opens','tool','toy','cleaning','furniture','clothing','container','cutting','writing','reading','computer','phone','road','rail','air','sea','building','appliance']);
const PERSON_SKIP=new Set([...OBJECTISH,'animal','plant','food','drink','pet','farm','wild','edible','sweet','salty','hot','cold','liquid','fruit','vegetable','baked','dairy','meat','dessert','frozen','caffeinated','bird','insect','mammal']);
const ANIMAL_SKIP=new Set([...OBJECTISH,'person','plant','food','drink','profession','fruit','vegetable','baked','dairy','meat','dessert','appliance','building']);
const FOOD_SKIP=new Set([...OBJECTISH,'person','animal','plant','place','profession','vehicle','building','pet','farm','wild','bird','insect','mammal']);
const PLACE_SKIP=new Set([...OBJECTISH,'person','animal','plant','food','drink','profession','wearable','clothing','tool','toy','edible']);
function questionAllowed(game,f){
 const id=FEATURES[f].id,a=game.answers;
 if(strongYes(a.get('person'))&&PERSON_SKIP.has(id))return false;
 if(strongYes(a.get('animal'))&&ANIMAL_SKIP.has(id))return false;
 if(strongYes(a.get('food'))&&FOOD_SKIP.has(id))return false;
 if(strongYes(a.get('drink'))&&FOOD_SKIP.has(id))return false;
 if(strongYes(a.get('place'))&&PLACE_SKIP.has(id))return false;
 if(strongYes(a.get('alive'))&&id==='manmade')return false;
 return true;
}
function hardMatch(t,a){if(a==='yes')return t>0;if(a==='no')return t<1;return true;}
function viableCandidates(game){
 const out=[];
 for(let i=0;i<N;i++){
  let ok=true;
  for(const [id,a] of game.answers){
   if(a!=='yes'&&a!=='no')continue;
   const f=idx[id];if(f==null)continue;
   if(!hardMatch(truth[i*F+f],a)){ok=false;break;}
  }
  if(ok)out.push(i);
 }
 return out;
}
function guessReason(game){
 if(game.guessUsed||game.turn<game.minGuessQuestions)return null;
 const viable=viableCandidates(game);
 if(viable.length===1)return{reason:'logical',index:viable[0]};
 const leaders=topTwo(game);
 const separated=leaders.secondP<=0.0001||leaders.firstP/leaders.secondP>=3;
 if(leaders.firstP>=game.guessThreshold&&separated)return{reason:'confidence',index:leaders.first};
 return null;
}
function makeGuess(game,decision){const i=decision?.index??top(game).index,o=OBJECTS[i];return{kind:'guess',index:i,label:o.name,text:guessText(o),confidence:game.belief[i],reason:decision?.reason||'forced'};}
function makeHunch(game,decision){return{kind:'hunch',index:decision.index,confidence:game.belief[decision.index],reason:decision.reason,questionsAsked:game.turn,maxQuestions:game.budget,continuePrice:game.continuePrice,continueCost:game.continueCost};}
function scoreFor(questionCount,correct,stumped=false,continueCost=0){const base=Math.min(Math.max(Number(questionCount)||0,0),20);const bonus=stumped||!correct?10:0;return Math.max(0,base+bonus-Math.max(0,Number(continueCost)||0));}
function stumpedState(game){game.status='stumped';return{kind:'stumped',turns:game.turn,continueCost:game.continueCost,score:scoreFor(game.turn,false,true,game.continueCost)};}
function bestQuestion(game){let best=null,bg=-1;for(let f=0;f<F;f++){if(game.asked.has(f)||!questionAllowed(game,f))continue;const g=evalQ(game.belief,f,game.noise);if(g>bg){bg=g;best=f;}}return best==null?null:{index:best,gain:bg};}
function choose(game){
 if(game.status!=='playing')throw new Error('game finished');
 if(game.turn>=game.budget)return stumpedState(game);
 const decision=guessReason(game);
 if(decision?.reason==='logical')return makeGuess(game,decision);
 const nextQuestion=bestQuestion(game);
 if(decision?.reason==='confidence'&&!game.deferGuessOnce){
  if(nextQuestion)return makeHunch(game,decision);
  return makeGuess(game,{...decision,reason:'no_questions'});
 }
 if(game.deferGuessOnce)game.deferGuessOnce=false;
 if(!nextQuestion){const leader=top(game);if(game.turn>=game.minGuessQuestions)return makeGuess(game,{reason:'no_questions',index:leader.index});return stumpedState(game);}
 const best=nextQuestion.index;
 return{kind:'question',index:best,id:FEATURES[best].id,text:FEATURES[best].q,gain:nextQuestion.gain,confidence:top(game).p};
}
function commitGuess(game,hunch){if(!hunch||hunch.kind!=='hunch')throw new Error('guess requires a hunch');if(game.status!=='playing')throw new Error('game finished');return makeGuess(game,{reason:'confidence',index:hunch.index});}
function deferGuess(game,hunch){if(!hunch||hunch.kind!=='hunch')throw new Error('continue requires a hunch');if(game.status!=='playing')throw new Error('game finished');game.continueCost+=game.continuePrice;game.deferGuessOnce=true;game.history.push({kind:'decision',decision:'continue',cost:game.continuePrice,afterQuestions:game.turn});return choose(game);}
function guessText(o){const n=o.name.toLowerCase();if(o.article==='')return`Is it ${n}?`;if(o.article)return`Is it ${o.article} ${n}?`;return`Is it ${'aeiou'.includes(n[0])?'an':'a'} ${n}?`;}
const MIX={yes:[1,0],probably:[0.75,0.25],unknown:null,probably_not:[0.25,0.75],no:[0,1]};
function answer(game,q,a){if(game.status!=='playing')throw new Error('game finished');if(q.kind!=='question')throw new Error('answer requires a question');const mix=MIX[a];game.asked.add(q.index);game.answers.set(q.id,a);game.turn++;game.surprise=false;if(mix){const before=top(game).p;let sum=0;for(let i=0;i<N;i++){const y=py(truth[i*F+q.index],game.noise);const l=mix[0]*y+mix[1]*(1-y);game.belief[i]*=l;sum+=game.belief[i];}if(sum>1e-15)for(let i=0;i<N;i++)game.belief[i]/=sum;const after=top(game).p;game.surprise=after<before*0.55;}game.history.push({kind:'question',id:q.id,question:q.text,answer:a});return choose(game);}
function confirm(game,q,correct){if(q.kind!=='guess')throw new Error('not a guess');if(game.status!=='playing')throw new Error('game finished');if(game.guessUsed)throw new Error('guess already used');game.guessUsed=true;game.history.push({kind:'guess',question:q.text,guess:q.label,answer:correct?'yes':'no'});game.status=correct?'won':'lost';return{correct:Boolean(correct),guess:q.label,turns:game.turn,done:true,continueCost:game.continueCost,score:scoreFor(game.turn,Boolean(correct),false,game.continueCost),reason:q.reason||null};}
function oracle(secret,q){if(q.kind==='guess')return q.index===secret?'yes':'no';const t=truth[secret*F+q.index];return t===1?'yes':t===0?'no':'unknown';}
function selfPlay(secret,opts={}){const g=createGame(opts);let q=choose(g);while(g.status==='playing'){if(q.kind==='hunch'){q=commitGuess(g,q);continue;}if(q.kind==='guess'){const ok=q.index===secret;const r=confirm(g,q,ok);return{won:ok,turns:g.turn,guess:q.label,score:r.score,stumped:false};}if(q.kind==='stumped')break;q=answer(g,q,oracle(secret,q));}return{won:false,turns:g.turn,guess:null,score:scoreFor(g.turn,false,true,g.continueCost),stumped:true};}
global.MomBayes={FEATURES,OBJECTS,N,F,truth,createGame,choose,answer,confirm,top,selfPlay,oracle,entropy,questionAllowed,viableCandidates,guessReason,scoreFor,commitGuess,deferGuess};
if(typeof module!=='undefined')module.exports=global.MomBayes;
})(typeof window!=='undefined'?window:globalThis);
