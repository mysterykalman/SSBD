(function () {
"use strict";
const script=window.PamCopy,adapter=window.MomModeAdapter;
const byId=id=>document.getElementById(id);
const text=(id,value)=>{byId(id).textContent=value||"";};
const hide=(id,value)=>{byId(id).hidden=Boolean(value);};
const sample=[
 {text:"Are you thinking of something alive?",number:1,maxQuestions:20},
 {text:"Is it an animal?",number:2,maxQuestions:20},
 {text:"Does it have fur?",number:3,maxQuestions:20},
 {text:"Would you find it in your home?",number:4,maxQuestions:20},
 {text:"Does it need food?",number:5,maxQuestions:20},
 {text:"Is it a pet?",number:6,maxQuestions:20}
];
let stage="intro",step=0,demo=!adapter.connected;
text("pam-bio",script.copy.bio);
function actions(active){for(const id of ["intro-actions","answer-actions","guess-actions","result-actions"])hide(id,id!==active);}
function progress(number,max){
 const limit=Number.isFinite(max)&&max>0?max:20;
 const n=Math.min(Math.max(Number(number)||0,0),limit);
 byId("progress-fill").style.width=(n/limit*100)+"%";
 const track=document.querySelector(".progress-track");
 track.setAttribute("aria-valuemax",String(limit));track.setAttribute("aria-valuenow",String(n));
 text("question-counter","QUESTION "+n+" OF "+limit);hide("question-counter",n===0);
}
function dialogue(lead,question,aside){text("pam-lead",lead);text("pam-question",question);text("pam-aside",aside);}
function intro(){
 stage="intro";step=0;
 if(adapter.connected)adapter.reset();
 text("stage-label","PAM'S KITCHEN TABLE");
 dialogue(script.copy.intro.lead,script.copy.intro.question,script.copy.intro.aside);
 progress(0,20);actions("intro-actions");
 text("start-btn",adapter.connected?"Let's play →":"Preview a round →");
 hide("preview-note",!demo);
}
function renderState(state){
 if(!state||!["question","guess","result"].includes(state.kind))throw Error("Invalid Mom Mode adapter state");
 stage=state.kind;
 if(stage==="question"){
  const n=Number(state.number)||1,max=Number(state.maxQuestions)||20;
  progress(n,max);text("stage-label",n>=max-3?"PAM HAS A HUNCH":"LET'S NARROW IT DOWN");
  dialogue(script.leadFor(n,max),state.text,script.asideFor(state.text,n));
  actions("answer-actions");
  const choices=adapter.connected?adapter.supportedAnswers:["yes","no","probably","unknown"];
  document.querySelectorAll("[data-answer]").forEach(btn=>{btn.hidden=!choices.includes(btn.dataset.answer);});
 }else if(stage==="guess"){
  text("stage-label","PAM'S FINAL ANSWER");
  dialogue(script.copy.guess,state.text||("Are you thinking of "+(state.guess||"something")+"?"),"I could be wrong. It's happened before. Briefly.");
  actions("guess-actions");
 }else{
  text("stage-label",state.correct?"PAM KNEW IT":"WELL, WELL, WELL");
  const lines=state.correct?script.copy.correct:script.copy.incorrect;
  dialogue(lines.lead,lines.question,lines.aside);actions("result-actions");
 }
}
function start(){
 if(!adapter.connected){demo=true;step=0;renderState({kind:"question",...sample[0]});return;}
 demo=false;renderState(adapter.start());
}
function answer(value){
 if(stage!=="question")return;
 if(demo){step+=1;if(step<sample.length)renderState({kind:"question",...sample[step]});else renderState({kind:"guess",text:"Are you thinking of a dog?",guess:"dog"});return;}
 renderState(adapter.answer(value));
}
function confirm(correct){
 if(stage!=="guess")return;
 renderState(demo?{kind:"result",correct}:adapter.confirm(correct));
}
byId("start-btn").addEventListener("click",start);
document.querySelectorAll("[data-answer]").forEach(button=>button.addEventListener("click",()=>answer(button.dataset.answer)));
byId("correct-btn").addEventListener("click",()=>confirm(true));
byId("wrong-btn").addEventListener("click",()=>confirm(false));
byId("again-btn").addEventListener("click",intro);
intro();
})();
