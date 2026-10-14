import {createMomRuntimeGame} from '../../shared/mom-runtime-game.js';
import {resolveMomRuntimeLookup} from '../../shared/mom-runtime-lookup.js';

const runtime=window.MOM_RUNTIME_KNOWLEDGE;
if(!runtime?.concepts?.length)throw new Error('Mom runtime intelligence failed to load');

let api=null,pending=null,lastGuess=null;
const supportedAnswers=['yes','probably','unknown','probably_not','no'];

function questionHistory(){return api?.game?.history?.filter(item=>item.kind==='question')||[];}
function context(){const history=questionHistory();return{previous:history.length?history[history.length-1]:null,history};}
function topConfidence(){return api?api.top().p:0;}
function questionState(action){return{kind:'question',text:action.text,number:api.game.turn+1,questionsAsked:api.game.turn,maxQuestions:api.game.budget,questionId:action.id,confidence:action.confidence??topConfidence(),surprise:Boolean(api.game.surprise),continueCost:api.game.continueCost,source:action.source||'static',gain:action.gain??0,naturalScore:action.naturalScore??0,semanticCoverage:action.semanticCoverage??0,knownCoverage:action.knownCoverage??0,...context()};}
function hunchState(action){lastGuess=null;return{kind:'hunch',number:api.game.turn,questionsAsked:api.game.turn,maxQuestions:api.game.budget,confidence:action.confidence,continuePrice:action.continuePrice,continueCost:action.continueCost,...context()};}
function guessState(action){lastGuess=action;return{kind:'guess',text:action.text,guess:action.label,number:api.game.turn,questionsAsked:api.game.turn,maxQuestions:api.game.budget,confidence:action.confidence??topConfidence(),guessReason:action.reason||null,continueCost:api.game.continueCost,...context()};}
function stumpedState(action){lastGuess=null;return{kind:'result',correct:false,stumped:true,guess:null,turns:action.turns,questionsAsked:action.turns,continueCost:action.continueCost||0,score:action.score,fast:false,long:true};}
function stateFor(action){pending=action;if(action.kind==='hunch')return hunchState(action);if(action.kind==='guess')return guessState(action);if(action.kind==='stumped')return stumpedState(action);return questionState(action);}

function startGame(){api=createMomRuntimeGame(runtime,{budget:20,guessThreshold:0.92,minGuessQuestions:5,continuePrice:2});lastGuess=null;return stateFor(api.choose());}
function getNextQuestion(){if(!api)return startGame();return stateFor(api.choose());}
function submitAnswer(answer){if(!api||!pending||pending.kind!=='question')throw new Error('No Mom Mode question is waiting for an answer');if(!supportedAnswers.includes(answer))throw new Error('Unsupported Mom Mode answer');return stateFor(api.answer(pending,answer));}
function makeGuess(){if(!api||!pending||pending.kind!=='hunch')throw new Error('Pam does not have a hunch to guess from');return stateFor(api.commitGuess(pending));}
function keepAsking(){if(!api||!pending||pending.kind!=='hunch')throw new Error('Pam does not have a hunch to continue from');return stateFor(api.deferGuess(pending));}
function getProgress(){if(!api)return{number:0,maxQuestions:20,confidence:0,continueCost:0};return{number:Math.min(api.game.turn,api.game.budget),maxQuestions:api.game.budget,confidence:topConfidence(),surprise:Boolean(api.game.surprise),continueCost:api.game.continueCost};}
function getGuess(){return lastGuess?{guess:lastGuess.label,text:lastGuess.text,confidence:lastGuess.confidence??topConfidence(),reason:lastGuess.reason||null}:null;}
function confirmGuess(correct){if(!api||!lastGuess)throw new Error('No Mom Mode guess is waiting for confirmation');const result=api.confirm(lastGuess,Boolean(correct));return{kind:'result',correct:Boolean(correct),stumped:false,guess:result.guess,turns:result.turns,questionsAsked:result.turns,continueCost:result.continueCost||0,score:result.score,fast:result.turns<=6,long:result.turns>=15,guessReason:result.reason||null,reveal:null};}
function resetGame(){api=null;pending=null;lastGuess=null;}
function lookup(value){const result=resolveMomRuntimeLookup(runtime,value);return{status:result.status,index:result.index,name:result.concept?.name||null,candidates:result.candidates.map(index=>runtime.concepts[index]?.name).filter(Boolean)};}
function debugSnapshot(limit=5){
  if(!api)return{runtime:{concepts:runtime.meta?.conceptCount||runtime.concepts.length,questions:runtime.meta?.questionCount||runtime.questions.length,sourceHash:runtime.meta?.sourceHash||''},topCandidates:[],pending:null};
  const ranked=Array.from(api.game.belief,(p,index)=>({index,p,name:runtime.concepts[index].name,category:runtime.concepts[index].category})).sort((a,b)=>b.p-a.p).slice(0,Math.max(1,limit));
  return{runtime:{concepts:runtime.meta?.conceptCount||runtime.concepts.length,questions:runtime.meta?.questionCount||runtime.questions.length,sourceHash:runtime.meta?.sourceHash||''},turn:api.game.turn,topCandidates:ranked,pending:pending?.kind==='question'?{id:pending.id,text:pending.text,source:pending.source,gain:pending.gain,naturalScore:pending.naturalScore,semanticCoverage:pending.semanticCoverage,knownCoverage:pending.knownCoverage}:pending?.kind||null};
}

window.MomModeAdapter=Object.freeze({connected:true,runtime:true,supportedAnswers,start:startGame,startGame,getNextQuestion,answer:submitAnswer,submitAnswer,makeGuess,keepAsking,getProgress,getGuess,confirm:confirmGuess,confirmGuess,reset:resetGame,resetGame,lookup,debugSnapshot,knowledgeSize:runtime.concepts.length,questionCount:runtime.questions.length,sourceHash:runtime.meta?.sourceHash||''});
