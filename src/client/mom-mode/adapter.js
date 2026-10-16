(function(global){
'use strict';
const Engine=global.PamClassic20Q;
if(!Engine)throw new Error('Pam classic 20Q engine failed to load');
let game=null,pending=null,lastGuess=null;
const supportedAnswers=['yes','probably','maybe','unknown','doubtful','no'];
const supportedCategories=['animal','vegetable','mineral','other'];

// Player-facing personality lives here, after the frozen 20Q model has chosen a
// trait. The underlying question text and scoring matrix remain untouched.
const SPECIAL_QUESTION_COPY=Object.freeze({
 'Does it bring joy to people':'Nice question for once. Does it bring joy to people?',
 'Is it smaller than a loaf of bread':'Quick size check. Is it smaller than a loaf of bread?',
 'Does it break if dropped':'Careful now. Does it break if dropped?',
 'Is it dangerous':'Important question. Is it dangerous?',
 'Do you know any songs about it':'Odd one, but useful. Do you know any songs about it?',
 'Do you love it':'Be honest, do you love it?',
 'Does it weigh more than a duck':'This is important. Does it weigh more than a duck?',
 'Is it very large':'Let’s establish scale. Is it very large?',
 'Is it useful':'Be honest. Is it useful?',
 'Would you be lost without it':'Be honest, would you be lost without it?',
 'Can it be placed on your head':'Humour me. Can it be placed on your head?',
 'Is it annoying':'No judgement. Is it annoying?',
 'Can you eat it':'Important question. Can you eat it?',
 'Is it cool':'Just wondering, is it cool?',
 'Would you touch it with a 10-foot pole':'Be honest, would you touch it with a 10-foot pole?',
 'Is it spontaneous':'Curious one. Is it spontaneous?',
 'Is it tasty':'More importantly, is it tasty?',
 'Is it addictive':'Serious question. Is it addictive?',
 'Does it need love':'This may matter. Does it need love?',
 'Would you like to be one':'Slightly strange question. Would you like to be one?'
});
function lowerFirst(value){return value?value[0].toLowerCase()+value.slice(1):value;}
function questionCopy(text,index){
 const raw=String(text||'').replace(/\?$/,'');
 const special=SPECIAL_QUESTION_COPY[raw];
 if(special)return special;
 // Keep the proposition intact. Personality is added around it, never by
 // weakening it with words such as “usually” or by swapping its meaning.
 switch(Math.abs(Number(index)||0)%8){
  case 0:return `Out of curiosity, ${lowerFirst(raw)}?`;
  case 1:return `Just wondering, ${lowerFirst(raw)}?`;
  case 2:return `Let me check something. ${raw}?`;
  case 3:return `${raw}?`;
  case 4:return `Hmm. ${raw}?`;
  case 5:return `${raw}?`;
  case 6:return `Quick question. ${raw}?`;
  default:return `${raw}?`;
 }
}
function context(){const history=game?.history||[];const previous=[...history].reverse().find(h=>h.kind==='question')||null;return{previous,history:history.filter(h=>h.kind==='question')};}
function categoryState(q){return{kind:'category',text:q.text,number:1,questionsAsked:0,maxQuestions:game.budget,options:[...supportedCategories],...context()};}
function questionState(q){return{kind:'question',text:questionCopy(q.text,q.index),number:game.turn+1,questionsAsked:game.turn,maxQuestions:game.budget,questionId:q.id,confidence:q.confidence||Engine.top(game).p,gain:q.gain??null,...context()};}
function hunchState(q){lastGuess=null;return{kind:'hunch',number:game.turn,questionsAsked:game.turn,maxQuestions:game.budget,confidence:q.confidence,continuePrice:q.continuePrice,continueCost:q.continueCost,forcedQuestions:q.forcedQuestions||4,...context()};}
function guessState(q){lastGuess=q;return{kind:'guess',text:q.text,guess:q.label,number:game.turn,questionsAsked:game.turn,maxQuestions:game.budget,confidence:q.confidence||Engine.top(game).p,guessReason:q.reason||null,continueCost:game.continueCost,...context()};}
function stateFor(q){pending=q;if(q.kind==='category')return categoryState(q);if(q.kind==='hunch')return hunchState(q);if(q.kind==='guess')return guessState(q);return questionState(q);}
function startGame(){game=Engine.createGame({budget:20,minGuessQuestions:7,continuePrice:0});lastGuess=null;return stateFor(Engine.choose(game));}
function submitAnswer(value){
 if(!game||!pending)throw new Error('No Pam question is waiting for an answer');
 const answer=String(value||'').toLowerCase();
 if(pending.kind==='category'){
  if(!supportedCategories.includes(answer))throw new Error('Unsupported Pam category');
  return stateFor(Engine.setCategory(game,answer));
 }
 if(pending.kind!=='question')throw new Error('Pam is not waiting for an answer');
 if(!supportedAnswers.includes(answer))throw new Error('Unsupported Pam answer');
 return stateFor(Engine.answer(game,pending,answer));
}
function makeGuess(){if(!game||!pending||pending.kind!=='hunch')throw new Error('Pam does not have a hunch to guess from');return stateFor(Engine.commitGuess(game,pending));}
function keepAsking(){if(!game||!pending||pending.kind!=='hunch')throw new Error('Pam does not have a hunch to continue from');return stateFor(Engine.deferGuess(game,pending));}
function getProgress(){if(!game)return{number:0,maxQuestions:20,confidence:0,continueCost:0};return{number:Math.min(game.turn,game.budget),maxQuestions:game.budget,confidence:Engine.top(game).p,continueCost:game.continueCost};}
function getGuess(){return lastGuess?{guess:lastGuess.label,text:lastGuess.text,confidence:lastGuess.confidence||Engine.top(game).p,reason:lastGuess.reason||null}:null;}
function confirmGuess(correct){if(!game||!lastGuess)throw new Error('No Pam guess is waiting for confirmation');const result=Engine.confirm(game,lastGuess,Boolean(correct));return{kind:'result',correct:Boolean(correct),stumped:false,guess:result.guess,turns:result.turns,questionsAsked:result.turns,continueCost:result.continueCost||0,score:result.score,fast:result.turns<=6,long:result.turns>=15,guessReason:result.reason||null,reveal:null};}
function resetGame(){game=null;pending=null;lastGuess=null;}
function debugSnapshot(limit=5){return game?Engine.debugSnapshot(game,limit):{runtime:{mode:'frozen-classic-20q',concepts:Engine.N,questions:Engine.F,offline:true},topCandidates:[]};}
global.MomModeAdapter=Object.freeze({connected:true,supportedAnswers,supportedCategories,start:startGame,startGame,answer:submitAnswer,submitAnswer,makeGuess,keepAsking,getProgress,getGuess,confirm:confirmGuess,confirmGuess,reset:resetGame,resetGame,debugSnapshot,knowledgeSize:Engine.N,questionCount:Engine.F});
})(window);
