(function(global){
"use strict";
const Engine=global.MomBayes;
if(!Engine) throw new Error("Mom Mode engine failed to load");
let game=null,pending=null,lastGuess=null,lastWrongGuess=null;
const supportedAnswers=["yes","probably","unknown","probably_not","no"];

function questionState(q){
 return{
  kind:"question",
  text:q.text,
  number:game.turn+1,
  maxQuestions:game.budget,
  questionId:q.id,
  confidence:q.confidence||Engine.top(game)?.p||0,
  surprise:Boolean(game.surprise),
  wrongGuesses:game.wrongGuesses,
  lastWrongGuess
 };
}
function guessState(q){
 lastGuess=q;
 return{
  kind:"guess",
  text:q.text,
  guess:q.label,
  number:game.turn+1,
  maxQuestions:game.budget,
  confidence:q.confidence||Engine.top(game)?.p||0,
  wrongGuesses:game.wrongGuesses,
  lastWrongGuess
 };
}
function resultState(result){
 pending=null;
 return{
  kind:"result",
  winner:result.winner,
  correct:result.winner==="pam",
  stumped:result.winner==="player",
  reason:result.reason||null,
  guess:result.guess||lastGuess?.label||null,
  turns:result.turns??game?.turn??0,
  maxQuestions:result.maxQuestions??game?.budget??20,
  wrongGuesses:result.wrongGuesses??game?.wrongGuesses??0,
  fast:result.winner==="pam"&&(result.turns||0)<=7,
  long:(result.turns||0)>=16
 };
}
function stateFor(q){
 pending=q;
 if(q.kind==="result")return resultState(q);
 return q.kind==="guess"?guessState(q):questionState(q);
}
function startGame(){
 game=Engine.createGame({budget:20,noise:0.07,guessThreshold:0.86});
 lastGuess=null;lastWrongGuess=null;
 return stateFor(Engine.choose(game));
}
function getNextQuestion(){if(!game)return startGame();return stateFor(Engine.choose(game));}
function submitAnswer(answer){
 if(!game||!pending||pending.kind!=="question")throw new Error("No Mom Mode question is waiting for an answer");
 if(!supportedAnswers.includes(answer))throw new Error("Unsupported Mom Mode answer");
 lastWrongGuess=null;
 return stateFor(Engine.answer(game,pending,answer));
}
function getProgress(){
 if(!game)return{number:0,maxQuestions:20,confidence:0,wrongGuesses:0};
 return{
  number:Math.min(game.turn+1,game.budget),
  maxQuestions:game.budget,
  confidence:Engine.top(game)?.p||0,
  surprise:Boolean(game.surprise),
  wrongGuesses:game.wrongGuesses
 };
}
function getGuess(){return lastGuess?{guess:lastGuess.label,text:lastGuess.text,confidence:lastGuess.confidence||Engine.top(game)?.p||0}:null;}
function confirmGuess(correct){
 if(!game||!lastGuess)throw new Error("No Mom Mode guess is waiting for confirmation");
 if(correct){
  const result=Engine.acceptGuess(game,lastGuess);
  return resultState(result);
 }
 lastWrongGuess=lastGuess.label;
 const next=Engine.rejectGuess(game,lastGuess);
 lastGuess=null;
 return stateFor(next);
}
function resetGame(){game=null;pending=null;lastGuess=null;lastWrongGuess=null;}
global.MomModeAdapter=Object.freeze({
 connected:true,
 supportedAnswers,
 start:startGame,startGame,
 getNextQuestion,
 answer:submitAnswer,submitAnswer,
 getProgress,getGuess,
 confirm:confirmGuess,confirmGuess,
 reset:resetGame,resetGame,
 knowledgeSize:Engine.N,
 questionCount:Engine.F,
 knowledgeMeta:Engine.meta
});
})(window);
