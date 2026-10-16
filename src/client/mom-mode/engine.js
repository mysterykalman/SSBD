(function(global){
'use strict';
const model=global.PAM_CLASSIC_MODEL;
if(!model)throw new Error('Pam classic model not loaded');
const QUESTIONS=Object.freeze([...model.questions]);
const TARGETS=Object.freeze([...model.targets]);
const N=TARGETS.length,F=QUESTIONS.length;
if(N<1200||F!==156)throw new Error(`Unexpected Pam classic model shape ${N}×${F}`);
function decodeBase64(value){const raw=atob(value);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
const WEIGHTS=decodeBase64(model.weightsB64);
if(WEIGHTS.length!==N*F)throw new Error(`Pam classic matrix has ${WEIGHTS.length} cells; expected ${N*F}`);
const stateAt=(q,t)=>WEIGHTS[q*N+t];
const polarity=s=>s&1;
const strength=s=>(s&2)?2:1;
const CATEGORY_Q=Object.freeze({animal:0,vegetable:1,mineral:2,other:3});
const REGULAR_ANSWERS=new Set(['yes','probably','maybe','unknown','doubtful','probably_not','no']);

function cleanTarget(value){return String(value||'').replace(/\s+/g,' ').trim();}
function guessText(value){return `Are you thinking of ${cleanTarget(value)}?`;}
function createGame(opts={}){
 return{scores:new Float64Array(N),asked:new Set(),history:[],turn:0,budget:opts.budget||20,minGuessQuestions:opts.minGuessQuestions??7,continuePrice:opts.continuePrice??2,continueCost:0,deferGuessOnce:false,status:'playing',category:null,lastQuestion:null};
}
function rank(game,limit=N){const indexes=Array.from({length:N},(_,i)=>i);indexes.sort((a,b)=>game.scores[b]-game.scores[a]||a-b);return indexes.slice(0,limit);}
function confidence(game){
 const leaders=rank(game,24);if(!leaders.length)return 0;
 const max=game.scores[leaders[0]];let sum=0,top=0;
 for(let i=0;i<leaders.length;i++){const v=Math.exp((game.scores[leaders[i]]-max)/2.4);if(i===0)top=v;sum+=v;}
 return sum?top/sum:0;
}
function top(game){const i=rank(game,1)[0]??0;return{index:i,p:confidence(game),object:{name:TARGETS[i]}};}
function applyPolarity(game,q,wantYes,responseStrength){
 for(let t=0;t<N;t++){
  const state=stateAt(q,t),match=polarity(state)===(wantYes?1:0);
  game.scores[t]+=(match?1:-1)*strength(state)*responseStrength;
 }
}
function applyMaybe(game,q){
 for(let t=0;t<N;t++)game.scores[t]+=(strength(stateAt(q,t))===1?0.5:-0.25);
}
function setCategory(game,value){
 if(game.turn!==0)throw new Error('Category can only be chosen at the start of a Pam round');
 const selected=CATEGORY_Q[value];if(selected==null)throw new Error('Unsupported Pam category');
 game.category=value;
 for(const q of Object.values(CATEGORY_Q)){applyPolarity(game,q,q===selected,2);game.asked.add(q);}
 game.turn=1;game.history.push({kind:'category',value,turn:1});
 return choose(game);
}
function responseProfile(answer){
 if(answer==='yes')return{yes:true,power:2};
 if(answer==='probably')return{yes:true,power:1};
 if(answer==='no')return{yes:false,power:2};
 if(answer==='doubtful'||answer==='probably_not')return{yes:false,power:1};
 return null;
}
function answer(game,question,answerValue){
 if(game.status!=='playing')throw new Error('game finished');
 if(!question||question.kind!=='question')throw new Error('Pam is not waiting for a question answer');
 const answer=String(answerValue||'').toLowerCase();if(!REGULAR_ANSWERS.has(answer))throw new Error('Unsupported Pam answer');
 const q=question.index;game.asked.add(q);game.lastQuestion=q;
 const profile=responseProfile(answer);
 if(profile)applyPolarity(game,q,profile.yes,profile.power);
 else if(answer==='maybe')applyMaybe(game,q);
 game.turn+=1;game.history.push({kind:'question',turn:game.turn,id:`q${q}`,text:QUESTIONS[q],answer});
 return choose(game);
}
function candidatePool(game){
 const ranked=rank(game,96),best=game.scores[ranked[0]??0];
 const close=ranked.filter(i=>game.scores[i]>=best-8);
 return close.length>=24?close:ranked.slice(0,Math.min(48,ranked.length));
}
function bestQuestion(game){
 const pool=candidatePool(game);let bestQ=null,bestScore=-Infinity;
 for(let q=4;q<F;q++){
  if(game.asked.has(q))continue;
  let yes=0,no=0,strong=0;
  for(const t of pool){const s=stateAt(q,t),w=Math.exp((game.scores[t]-game.scores[pool[0]])/3);if(polarity(s))yes+=w;else no+=w;if(strength(s)===2)strong+=w;}
  const total=yes+no;if(total<=0)continue;
  const balance=1-Math.abs(yes-no)/total;
  const certainty=strong/total;
  const score=balance*0.9+certainty*0.1;
  if(score>bestScore+1e-12){bestScore=score;bestQ=q;}
 }
 return bestQ==null?null:{index:bestQ,gain:bestScore};
}
function shouldHunch(game){
 if(game.deferGuessOnce){game.deferGuessOnce=false;return false;}
 if(game.turn<game.minGuessQuestions)return false;
 const leaders=rank(game,3);if(leaders.length<2)return true;
 const margin=game.scores[leaders[0]]-game.scores[leaders[1]];
 const p=confidence(game);
 if(game.turn>=16&&margin>=3)return true;
 if(game.turn>=11&&margin>=5&&p>=0.42)return true;
 if(game.turn>=8&&margin>=8&&p>=0.58)return true;
 return false;
}
function makeGuess(game,reason='forced'){
 const leader=top(game);return{kind:'guess',index:leader.index,label:TARGETS[leader.index],text:guessText(TARGETS[leader.index]),confidence:leader.p,reason};
}
function choose(game){
 if(game.status!=='playing')throw new Error('game finished');
 if(game.turn===0)return{kind:'category',number:1,text:'First things first. What kind of thing is it?',options:Object.keys(CATEGORY_Q),questionsAsked:0,maxQuestions:game.budget};
 if(game.turn>=game.budget)return makeGuess(game,'question_limit');
 if(shouldHunch(game))return{kind:'hunch',index:top(game).index,confidence:top(game).p,reason:'confidence',questionsAsked:game.turn,maxQuestions:game.budget,continuePrice:game.continuePrice,continueCost:game.continueCost};
 const next=bestQuestion(game);if(!next)return makeGuess(game,'no_questions');
 return{kind:'question',index:next.index,id:`q${next.index}`,text:QUESTIONS[next.index],gain:next.gain,confidence:top(game).p};
}
function commitGuess(game,hunch){if(!hunch||hunch.kind!=='hunch')throw new Error('guess requires a hunch');return makeGuess(game,'confidence');}
function deferGuess(game,hunch){if(!hunch||hunch.kind!=='hunch')throw new Error('continue requires a hunch');game.continueCost+=game.continuePrice;game.deferGuessOnce=true;game.history.push({kind:'decision',decision:'continue',cost:game.continuePrice});return choose(game);}
function scoreFor(questionCount,correct,continueCost=0){const base=Math.min(Math.max(Number(questionCount)||0,0),20);return Math.max(0,base+(correct?0:10)-Math.max(0,Number(continueCost)||0));}
function confirm(game,guess,correct){
 if(!guess||guess.kind!=='guess')throw new Error('No Pam guess to confirm');game.status='finished';
 return{kind:'result',winner:correct?'pam':'player',correct:Boolean(correct),turns:game.turn,guess:guess.label,reason:guess.reason,continueCost:game.continueCost,score:scoreFor(game.turn,Boolean(correct),game.continueCost)};
}
function debugSnapshot(game,limit=5){return{runtime:{mode:'frozen-classic-20q',concepts:N,questions:F,offline:true,baseConcepts:model.baseTargets||1200,extensionConcepts:model.extensionTargets||Math.max(0,N-1200)},topCandidates:rank(game,limit).map(i=>({name:TARGETS[i],score:game.scores[i],confidence:i===rank(game,1)[0]?confidence(game):null})),turn:game.turn,category:game.category};}

global.PamClassic20Q=Object.freeze({N,F,QUESTIONS,TARGETS,createGame,choose,answer,setCategory,commitGuess,deferGuess,confirm,top,debugSnapshot});
})(window);
