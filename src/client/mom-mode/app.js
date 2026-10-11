(function(){
"use strict";
const script=window.PamCopy,adapter=window.MomModeAdapter;
const byId=id=>document.getElementById(id); const text=(id,value)=>{byId(id).textContent=value||"";}; const hide=(id,value)=>{byId(id).hidden=Boolean(value);};
let stage="intro";
text("pam-bio",script.copy.bio);
function actions(active){for(const id of ["intro-actions","answer-actions","guess-actions","result-actions"])hide(id,id!==active);}
function progress(number,max){const limit=Number.isFinite(max)&&max>0?max:20;const n=Math.min(Math.max(Number(number)||0,0),limit);byId("progress-fill").style.width=(n/limit*100)+"%";const track=document.querySelector(".progress-track");track.setAttribute("aria-valuemax",String(limit));track.setAttribute("aria-valuenow",String(n));text("question-counter",n?`${n} / ${limit}`:"");hide("question-counter",!n);}
function dialogue(lead,question,aside){text("pam-lead",lead);text("pam-question",question);text("pam-aside",aside);hide("pam-aside",!aside);}
function intro(){stage="intro";adapter.reset();text("stage-label","PAM'S KITCHEN TABLE");dialogue(script.copy.intro.lead,script.copy.intro.question,script.copy.intro.aside);progress(0,20);actions("intro-actions");}
function stageLabel(state){if(state.kind==='guess')return"PAM HAS A HUNCH";if(state.number>=17)return"PAM IS VERY INVESTED NOW";if(state.number>=9)return"PAM IS PUTTING IT TOGETHER";return"PAM IS PAYING ATTENTION";}
function renderState(state){if(!state||!["question","guess","result"].includes(state.kind))throw Error("Invalid Mom Mode adapter state");stage=state.kind;
 if(stage==="question"){
  progress(state.number,state.maxQuestions);text("stage-label",stageLabel(state));
  dialogue(script.leadFor(state),state.text,"");actions("answer-actions");
 }
 else if(stage==="guess"){
  progress(state.number,state.maxQuestions);text("stage-label","PAM HAS A HUNCH");
  dialogue(script.guessLead(state.number),state.text,"Am I right?");actions("guess-actions");
 }
 else {
  progress(state.turns,20);text("stage-label",state.correct?"PAM KNEW IT":"YOU GOT PAM");
  const question=state.correct?`You were thinking of ${state.guess}.`:`Okay. You got me.`;
  dialogue(script.resultLine(state),question,script.resultAside(state));actions("result-actions");
 }
}
function start(){renderState(adapter.start());}
function answer(value){if(stage!=="question")return;renderState(adapter.answer(value));}
function confirm(correct){if(stage!=="guess")return;renderState(adapter.confirm(correct));}
byId("start-btn").addEventListener("click",start);document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>answer(b.dataset.answer)));byId("correct-btn").addEventListener("click",()=>confirm(true));byId("wrong-btn").addEventListener("click",()=>confirm(false));byId("again-btn").addEventListener("click",()=>intro());intro();
})();
