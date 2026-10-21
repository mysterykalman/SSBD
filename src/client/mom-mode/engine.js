(function(global){
'use strict';
const model=global.PAM_CLASSIC_MODEL;
if(!model)throw new Error('Pam classic model not loaded');
const QUESTIONS=Object.freeze(model.questions.map(question=>String(question).trim().replace(/\?+$/,'')+'?'));
const TARGETS=Object.freeze([...model.targets]);
const N=TARGETS.length,F=QUESTIONS.length;
if(!([1200,1400,1775].includes(N)&&F===156)&&!(N===3284&&F>=488&&F<=1000))throw new Error(`Unexpected Pam model shape ${N}×${F}`);
function decodeBase64(value){const raw=atob(value);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
const WEIGHTS=decodeBase64(model.weightsB64);
if(WEIGHTS.length!==N*F)throw new Error(`Pam classic matrix has ${WEIGHTS.length} cells; expected ${N*F}`);
const KNOWN=model.knownMaskB64?decodeBase64(model.knownMaskB64):null;
if(KNOWN&&KNOWN.length!==N*F)throw new Error(`Pam known mask has ${KNOWN.length} cells; expected ${N*F}`);
const stateAt=(q,t)=>WEIGHTS[q*N+t];
const knownAt=(q,t)=>!KNOWN||KNOWN[q*N+t]===1;
const polarity=s=>s&1;
const strength=s=>(s&2)?2:1;
const CATEGORY_Q=Object.freeze({animal:0,vegetable:1,mineral:2,other:3});
const ADAPTIVE_CATEGORIES=Object.freeze({person:'Person',place:'Place',animal_plant:'Animal or Plant',object:'Object',entertainment:'Entertainment',other:'Other'});
const ROUTING=Array.isArray(model.routingCategories)&&model.routingCategories.length===N?model.routingCategories:null;
const REGULAR_ANSWERS=new Set(['yes','probably','maybe','unknown','doubtful','probably_not','no']);

const REDUNDANCY_SCORE_FLOOR=0.99;
const FAMILY_RECENCY_FACTORS=Object.freeze({1:0.8,2:0.9,3:0.96});
const PAIR_RECENCY_FACTORS=Object.freeze({1:0.5,2:0.7,3:0.85,4:0.94});
const QUESTION_FAMILIES=Object.freeze([
 Object.freeze([8,12,22,24,43,57]),
 Object.freeze([30,32,79,111]),
 Object.freeze([97,126,129,132,152]),
 Object.freeze([94,100,120,145]),
 Object.freeze([48,51,65,92]),
 Object.freeze([69,141]),
 Object.freeze([56,116]),
 Object.freeze([20,101,125]),
 Object.freeze([149,153]),
 Object.freeze([85,86,117]),
 Object.freeze([115,119,128,142]),
 Object.freeze([6,9,13,27,71,74,87,108]),
 Object.freeze([62,154])
]);
const SEMANTIC_PAIRS=Object.freeze([
 Object.freeze([97,132]),
 Object.freeze([30,32]),
 Object.freeze([85,117]),
 Object.freeze([126,152]),
 Object.freeze([62,154]),
 Object.freeze([149,153]),
 Object.freeze([56,116]),
 Object.freeze([100,120]),
 Object.freeze([119,128]),
 Object.freeze([42,148]),
 Object.freeze([69,141]),
 Object.freeze([101,125])
]);
const FAMILY_IDS_BY_QUESTION=Array.from({length:F},()=>[]);
for(let familyId=0;familyId<QUESTION_FAMILIES.length;familyId++){
 for(const q of QUESTION_FAMILIES[familyId])FAMILY_IDS_BY_QUESTION[q].push(familyId);
}
const SEMANTIC_PARTNERS_BY_QUESTION=Array.from({length:F},()=>[]);
for(const [a,b] of SEMANTIC_PAIRS){SEMANTIC_PARTNERS_BY_QUESTION[a].push(b);SEMANTIC_PARTNERS_BY_QUESTION[b].push(a);}

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
  if(!knownAt(q,t))continue;
  const state=stateAt(q,t),match=polarity(state)===(wantYes?1:0);
  game.scores[t]+=(match?1:-1)*strength(state)*responseStrength;
 }
}
function applyMaybe(game,q){
 for(let t=0;t<N;t++){
  if(!knownAt(q,t))continue;
  game.scores[t]+=(strength(stateAt(q,t))===1?0.5:-0.25);
 }
}
function setCategory(game,value){
 if(game.turn!==0)throw new Error('Category can only be chosen at the start of a Pam round');
 const adaptive=Boolean(ROUTING);
 const selected=adaptive?ADAPTIVE_CATEGORIES[value]:CATEGORY_Q[value];
 if(selected==null)throw new Error('Unsupported Pam category');
 game.category=value;
 if(adaptive){
  // Coarse first-turn partition; keep alternatives possible for imperfect
  // metadata instead of removing them from the candidate pool entirely.
  for(let t=0;t<N;t++)game.scores[t]+=ROUTING[t]===value?8:-8;
  for(const q of Object.values(CATEGORY_Q))game.asked.add(q);
 }else{
  for(const q of Object.values(CATEGORY_Q)){applyPolarity(game,q,q===selected,2);game.asked.add(q);}
 }
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
 // Consider every candidate close to the leader. A hard top-96 cut can hide
 // unresolved ties in larger knowledge libraries and lead to wasted questions.
 const ranked=rank(game),best=game.scores[ranked[0]??0];
 const close=ranked.filter(i=>game.scores[i]>=best-8);
 return close.length>=24?close:ranked.slice(0,Math.min(48,ranked.length));
}
function recentQuestionGap(game,q){
 let gap=0;
 for(let i=game.history.length-1;i>=0;i--){
  const event=game.history[i];
  if(event.kind!=='question')continue;
  gap+=1;
  if(event.id===`q${q}`)return gap;
 }
 return null;
}
function redundancyFactor(game,q){
 let factor=1;
 for(const familyId of FAMILY_IDS_BY_QUESTION[q]){
  let closest=null;
  for(const priorQ of QUESTION_FAMILIES[familyId]){
   if(priorQ===q||!game.asked.has(priorQ))continue;
   const gap=recentQuestionGap(game,priorQ);
   if(gap!=null&&(closest==null||gap<closest))closest=gap;
  }
  if(closest!=null)factor=Math.min(factor,FAMILY_RECENCY_FACTORS[closest]??1);
 }
 for(const priorQ of SEMANTIC_PARTNERS_BY_QUESTION[q]){
  if(!game.asked.has(priorQ))continue;
  const gap=recentQuestionGap(game,priorQ);
  if(gap!=null)factor=Math.min(factor,PAIR_RECENCY_FACTORS[gap]??1);
 }
 return factor;
}
function bestQuestion(game){
 const pool=candidatePool(game);
 if(!pool.length)return null;
 const highest=game.scores[pool[0]];
 const weighted=pool.map(t=>({target:t,weight:Math.exp((game.scores[t]-highest)/3)}));
 const total=weighted.reduce((sum,item)=>sum+item.weight,0);
 const leaders=weighted.slice(0,Math.min(8,weighted.length));
 const leaderTotal=leaders.reduce((sum,item)=>sum+item.weight,0);
 let best=null;
 // A good question must distinguish plausible answers, not simply be
 // answerable by the largest number of them. Unknown classifications make
 // no prediction and cannot be credited as a useful split.
 for(let q=4;q<F;q++){
  if(game.asked.has(q))continue;
  let yes=0,no=0,strong=0,leaderYes=0,leaderNo=0;
  for(const item of weighted){
   const t=item.target,w=item.weight;
   if(!knownAt(q,t))continue;
   const state=stateAt(q,t);
   if(polarity(state))yes+=w;else no+=w;
   if(strength(state)===2)strong+=w;
  }
  // Under sparse data, a one-sided, partially known trait can still be
  // informative: a matching Yes supports its known targets, and a No weakens
  // them. Keep this as a low-priority fallback, never treating Unknown as No.
  const oneSided= yes<=0||no<=0;
  if(yes+no<=0)continue;
  for(const item of leaders){
   if(!knownAt(q,item.target))continue;
   if(polarity(stateAt(q,item.target)))leaderYes+=item.weight;
   else leaderNo+=item.weight;
  }
  const known=yes+no,coverage=known/total;
  const split=4*yes*no/(known*known);
  const leadKnown=leaderYes+leaderNo;
  const leaderSplit=leadKnown>0?4*leaderYes*leaderNo/(leadKnown*leadKnown)*(leadKnown/leaderTotal):0;
  // The coverage penalty is squared: a 50/50 split of five known answers
  // must not outrank a moderately balanced split of the whole candidate pool.
  const information=oneSided
   ? 0.11*coverage*(1-coverage)
   : (0.72*split+0.28*leaderSplit)*coverage*coverage;
  const reliability=0.85+0.15*(strong/known);
  const score=information*reliability*redundancyFactor(game,q);
  if(!best||score>best.score+1e-12||
     (Math.abs(score-best.score)<=1e-12&&q<best.index)){
   best={index:q,score,gain:information,coverage};
  }
 }
 return best;
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
 if(game.turn===0)return{kind:'category',number:1,text:'First things first. What kind of thing is it?',options:Object.keys(ROUTING?ADAPTIVE_CATEGORIES:CATEGORY_Q),questionsAsked:0,maxQuestions:game.budget};
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
function debugSnapshot(game,limit=5){return{runtime:{mode:'frozen-classic-20q',concepts:N,questions:F,offline:true},topCandidates:rank(game,limit).map(i=>({name:TARGETS[i],score:game.scores[i],confidence:i===rank(game,1)[0]?confidence(game):null})),turn:game.turn,category:game.category};}

global.PamClassic20Q=Object.freeze({N,F,QUESTIONS,TARGETS,createGame,choose,answer,setCategory,commitGuess,deferGuess,confirm,top,debugSnapshot});
})(window);
