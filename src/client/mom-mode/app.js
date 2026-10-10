(function(){
"use strict";
const script=window.PamCopy,adapter=window.MomModeAdapter;
const byId=id=>document.getElementById(id); const text=(id,value)=>{byId(id).textContent=value||"";}; const hide=(id,value)=>{byId(id).hidden=Boolean(value);};
let stage="intro";
text("pam-bio",script.copy.bio); text("knowledge-note",`${adapter.knowledgeSize} familiar things · ${adapter.questionCount} possible questions · no AI service needed`);
function actions(active){for(const id of ["intro-actions","answer-actions","guess-actions","result-actions"])hide(id,id!==active);}
function progress(number,max){const limit=Number.isFinite(max)&&max>0?max:20;const n=Math.min(Math.max(Number(number)||0,0),limit);byId("progress-fill").style.width=(n/limit*100)+"%";const track=document.querySelector(".progress-track");track.setAttribute("aria-valuemax",String(limit));track.setAttribute("aria-valuenow",String(n));text("question-counter",n?`QUESTION ${n} OF ${limit}`:"");hide("question-counter",!n);}
function dialogue(lead,question,aside){text("pam-lead",lead);text("pam-question",question);text("pam-aside",aside);hide("pam-aside",!aside);}
function intro(){stage="intro";adapter.reset();text("stage-label","PAM'S KITCHEN TABLE");dialogue(script.copy.intro.lead,script.copy.intro.question,script.copy.intro.aside);progress(0,20);actions("intro-actions");}
function renderState(state){if(!state||!["question","guess","result"].includes(state.kind))throw Error("Invalid Mom Mode adapter state");stage=state.kind;
 if(stage==="question"){const n=state.number,max=state.maxQuestions;progress(n,max);text("stage-label",n>=max-4?"PAM HAS A HUNCH":"LET'S NARROW IT DOWN");dialogue(script.leadFor(n,max,state.surprise),state.text,script.asideFor(state.text,n));actions("answer-actions");}
 else if(stage==="guess"){progress(state.number,state.maxQuestions);text("stage-label","PAM'S FINAL ANSWER");dialogue(script.guessLead(state.number),state.guess,"Am I right?");actions("guess-actions");}
 else {text("stage-label",state.correct?"PAM KNEW IT":"YOU GOT PAM");const aside=state.correct?(state.fast?"See? Eyes in the back of my head.":"Mom knows. Occasionally."):"You learn something every day.";dialogue(script.resultLine(state),state.correct?`You were thinking of ${state.guess}.`:`I missed ${state.guess}.`,aside);actions("result-actions");}
}
function start(){renderState(adapter.start());}
function answer(value){if(stage!=="question")return;renderState(adapter.answer(value));}
function confirm(correct){if(stage!=="guess")return;renderState(adapter.confirm(correct));}
byId("start-btn").addEventListener("click",start);document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>answer(b.dataset.answer)));byId("correct-btn").addEventListener("click",()=>confirm(true));byId("wrong-btn").addEventListener("click",()=>confirm(false));byId("again-btn").addEventListener("click",()=>intro());intro();
})();
