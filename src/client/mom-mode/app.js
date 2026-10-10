(function(){
"use strict";
const script=window.PamCopy,adapter=window.MomModeAdapter;
const byId=id=>document.getElementById(id);
const text=(id,value)=>{const el=byId(id);if(el)el.textContent=value||"";};
const hide=(id,value)=>{const el=byId(id);if(el)el.hidden=Boolean(value);};
let stage="intro",roundRecorded=false;
const SCORE_KEY="ssbd:mom-mode:score:v1";

function readScore(){
 try{
  const raw=JSON.parse(localStorage.getItem(SCORE_KEY)||"{}");
  return{pam:Number(raw.pam)||0,you:Number(raw.you)||0};
 }catch{return{pam:0,you:0};}
}
function writeScore(score){try{localStorage.setItem(SCORE_KEY,JSON.stringify(score));}catch{}}
function renderScore(){
 const score=readScore();
 text("score-pam",String(score.pam));
 text("score-you",String(score.you));
}
function recordResult(state){
 if(roundRecorded)return;
 const score=readScore();
 if(state.winner==="pam")score.pam++;else score.you++;
 writeScore(score);roundRecorded=true;renderScore();
}
function actions(active){
 for(const id of ["intro-actions","answer-actions","guess-actions","result-actions"])hide(id,id!==active);
}
function progress(number,max){
 const limit=Number.isFinite(max)&&max>0?max:20;
 const n=Math.min(Math.max(Number(number)||0,0),limit);
 byId("progress-fill").style.width=(n/limit*100)+"%";
 const track=document.querySelector(".progress-track");
 track.setAttribute("aria-valuemax",String(limit));
 track.setAttribute("aria-valuenow",String(n));
 text("question-counter",n?`TURN ${n} OF ${limit}`:"");
 hide("question-counter",!n);
}
function dialogue(lead,question,aside){
 text("pam-lead",lead);text("pam-question",question);text("pam-aside",aside);hide("pam-aside",!aside);
}
function knowledgeLine(){
 const meta=adapter.knowledgeMeta||{};
 const live=Number(meta.wikidataPeople||0)+Number(meta.wikidataFictional||0)+Number(meta.wikidataPlaces||0);
 const source=live>0?"Wikidata-backed local knowledge":"local knowledge";
 return`${adapter.knowledgeSize.toLocaleString()} things · ${adapter.questionCount.toLocaleString()} possible clues · ${source}`;
}
function intro(){
 stage="intro";roundRecorded=false;adapter.reset();
 text("stage-label","STUMP MOM");
 dialogue(script.copy.intro.lead,script.copy.intro.question,script.copy.intro.aside);
 progress(0,20);actions("intro-actions");renderScore();
}
function renderState(state){
 if(!state||!["question","guess","result"].includes(state.kind))throw Error("Invalid Mom Mode adapter state");
 stage=state.kind;
 if(stage==="question"){
  const n=state.number,max=state.maxQuestions;
  progress(n,max);
  text("stage-label",n>=max-4?"MOM'S RUNNING OUT OF TIME":"MOM'S ASKING QUESTIONS");
  const lead=state.lastWrongGuess?script.wrongGuessLead(state.lastWrongGuess,n):script.leadFor(n,max,state.surprise);
  const aside=state.lastWrongGuess?script.wrongGuessAside(state.lastWrongGuess):script.asideFor(state.text,n);
  dialogue(lead,state.text,aside);
  actions("answer-actions");
 }else if(stage==="guess"){
  progress(state.number,state.maxQuestions);
  text("stage-label",state.number>=state.maxQuestions?"MOM'S LAST SHOT":"MOM HAS A GUESS");
  dialogue(script.guessLead(state.number,state.wrongGuesses),state.text,state.number>=state.maxQuestions?"If I miss this, you win.":"Am I right?");
  actions("guess-actions");
 }else{
  progress(state.turns,state.maxQuestions);
  recordResult(state);
  text("stage-label",state.winner==="player"?"YOU STUMPED MOM":"MOM GOT IT");
  if(state.winner==="player"){
   dialogue(script.resultLine(state),"You stumped Mom.",script.stumpedAside(state));
  }else{
   dialogue(script.resultLine(state),`You were thinking of ${state.guess}.`,state.fast?"See? Eyes in the back of my head.":"That’s what I thought.");
  }
  document.body.dataset.winner=state.winner;
  actions("result-actions");
 }
}
function start(){delete document.body.dataset.winner;roundRecorded=false;renderState(adapter.start());}
function answer(value){if(stage!=="question")return;renderState(adapter.answer(value));}
function confirm(correct){if(stage!=="guess")return;renderState(adapter.confirm(correct));}

text("pam-bio",script.copy.bio);
text("knowledge-note",knowledgeLine());
byId("start-btn").addEventListener("click",start);
document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>answer(b.dataset.answer)));
byId("correct-btn").addEventListener("click",()=>confirm(true));
byId("wrong-btn").addEventListener("click",()=>confirm(false));
byId("again-btn").addEventListener("click",()=>intro());
intro();
})();
