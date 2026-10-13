(function(global){
"use strict";
const Engine=global.MomBayes;
if(!Engine) throw new Error("Mom Mode engine failed to load");
let game=null,pending=null,lastGuess=null;
const supportedAnswers=["yes","probably","unknown","probably_not","no"];
function context(){const history=game?.history||[];const previous=[...history].reverse().find(h=>h.kind==='question')||null;return{previous,history:history.filter(h=>h.kind==='question')};}
function questionState(q){return {kind:"question",text:q.text,number:game.turn+1,questionsAsked:game.turn,maxQuestions:game.budget,questionId:q.id,confidence:q.confidence||Engine.top(game).p,surprise:Boolean(game.surprise),continueCost:game.continueCost,...context()};}
function hunchState(q){lastGuess=null;return {kind:"hunch",number:game.turn,questionsAsked:game.turn,maxQuestions:game.budget,confidence:q.confidence,continuePrice:q.continuePrice,continueCost:q.continueCost,...context()};}
function guessState(q){lastGuess=q;return {kind:"guess",text:q.text,guess:q.label,number:game.turn,questionsAsked:game.turn,maxQuestions:game.budget,confidence:q.confidence||Engine.top(game).p,guessReason:q.reason||null,continueCost:game.continueCost,...context()};}
function stumpedState(q){lastGuess=null;return {kind:"result",correct:false,stumped:true,guess:null,turns:q.turns,questionsAsked:q.turns,continueCost:q.continueCost||0,score:q.score,fast:false,long:true};}
function stateFor(q){
 pending=q;
 if(q.kind==="hunch")return hunchState(q);
 if(q.kind==="guess")return guessState(q);
 if(q.kind==="stumped")return stumpedState(q);
 return questionState(q);
}
function startGame(){game=Engine.createGame({budget:20,noise:0.06,guessThreshold:0.92,minGuessQuestions:5,continuePrice:2});lastGuess=null;return stateFor(Engine.choose(game));}
function getNextQuestion(){if(!game)return startGame();return stateFor(Engine.choose(game));}
function submitAnswer(answer){if(!game||!pending||pending.kind!=="question")throw new Error("No Mom Mode question is waiting for an answer");if(!supportedAnswers.includes(answer))throw new Error("Unsupported Mom Mode answer");return stateFor(Engine.answer(game,pending,answer));}
function makeGuess(){if(!game||!pending||pending.kind!=="hunch")throw new Error("Pam does not have a hunch to guess from");return stateFor(Engine.commitGuess(game,pending));}
function keepAsking(){if(!game||!pending||pending.kind!=="hunch")throw new Error("Pam does not have a hunch to continue from");return stateFor(Engine.deferGuess(game,pending));}
function getProgress(){if(!game)return {number:0,maxQuestions:20,confidence:0,continueCost:0};return {number:Math.min(game.turn,game.budget),maxQuestions:game.budget,confidence:Engine.top(game).p,surprise:Boolean(game.surprise),continueCost:game.continueCost};}
function getGuess(){return lastGuess?{guess:lastGuess.label,text:lastGuess.text,confidence:lastGuess.confidence||Engine.top(game).p,reason:lastGuess.reason||null}:null;}
function confirmGuess(correct){
 if(!game||!lastGuess)throw new Error("No Mom Mode guess is waiting for confirmation");
 const result=Engine.confirm(game,lastGuess,Boolean(correct));
 return {kind:"result",correct:Boolean(correct),stumped:false,guess:result.guess,turns:result.turns,questionsAsked:result.turns,continueCost:result.continueCost||0,score:result.score,fast:result.turns<=6,long:result.turns>=15,guessReason:result.reason||null,reveal:null};
}
function resetGame(){game=null;pending=null;lastGuess=null;}
global.MomModeAdapter=Object.freeze({connected:true,supportedAnswers,start:startGame,startGame,getNextQuestion,answer:submitAnswer,submitAnswer,makeGuess,keepAsking,getProgress,getGuess,confirm:confirmGuess,confirmGuess,reset:resetGame,resetGame,knowledgeSize:Engine.N,questionCount:Engine.F});
})(window);
