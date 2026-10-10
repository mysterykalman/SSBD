(function(global){
"use strict";
const Engine=global.MomBayes;
if(!Engine) throw new Error("Mom Mode engine failed to load");
let game=null,pending=null,lastGuess=null;
const supportedAnswers=["yes","probably","unknown","probably_not","no"];
function questionState(q){return {kind:"question",text:q.text,number:game.turn+1,maxQuestions:game.budget,questionId:q.id,confidence:q.confidence||Engine.top(game).p,surprise:Boolean(game.surprise)};}
function guessState(q){lastGuess=q;return {kind:"guess",text:q.text,guess:q.label,number:game.turn+1,maxQuestions:game.budget,confidence:q.confidence||Engine.top(game).p};}
function stateFor(q){pending=q;return q.kind==="guess"?guessState(q):questionState(q);}
function startGame(){game=Engine.createGame({budget:20,noise:0.06,guessThreshold:0.90});lastGuess=null;return stateFor(Engine.choose(game));}
function getNextQuestion(){if(!game)return startGame();return stateFor(Engine.choose(game));}
function submitAnswer(answer){if(!game||!pending||pending.kind!=="question")throw new Error("No Mom Mode question is waiting for an answer");if(!supportedAnswers.includes(answer))throw new Error("Unsupported Mom Mode answer");return stateFor(Engine.answer(game,pending,answer));}
function getProgress(){if(!game)return {number:0,maxQuestions:20,confidence:0};return {number:Math.min(game.turn+1,game.budget),maxQuestions:game.budget,confidence:Engine.top(game).p,surprise:Boolean(game.surprise)};}
function getGuess(){return lastGuess?{guess:lastGuess.label,text:lastGuess.text,confidence:lastGuess.confidence||Engine.top(game).p}:null;}
function confirmGuess(correct){if(!game||!lastGuess)throw new Error("No Mom Mode guess is waiting for confirmation");const result=Engine.confirm(game,lastGuess,Boolean(correct));return {kind:"result",correct:Boolean(correct),guess:result.guess,turns:result.turns,fast:result.turns<=6,long:result.turns>=15};}
function resetGame(){game=null;pending=null;lastGuess=null;}
global.MomModeAdapter=Object.freeze({connected:true,supportedAnswers,start:startGame,startGame,getNextQuestion,answer:submitAnswer,submitAnswer,getProgress,getGuess,confirm:confirmGuess,confirmGuess,reset:resetGame,resetGame,knowledgeSize:Engine.N,questionCount:Engine.F});
})(window);
