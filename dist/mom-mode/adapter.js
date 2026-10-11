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
 if(q.kind==="guess")ret¶»§q«^