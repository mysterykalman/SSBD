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
function stageLabel(state){if(state.kind==='guess')return"PAM IS LOCKING IT IN";if(state.number>=17)return"PAM IS VERY INVESTED NOW";if(state.number>=9)return"PAM IS PUTTING IT TOGETHER";return"PAM IS PAYING ATTENTION";}
function renderState(state){if(!state||!["question","guess","result"].includes(state.kind))throw Error("Invalid Mom Mode adapter state");stage=state.kind;
 if(stage==="question"){
  progress(state.questionsAsked??state.number-1,state.maxQuestions);text("stage-label",stageLabel(state));
  dialogue(script.leadFor(state),state.text,"");actions("answer-actions");
 }
 else if(stage==="guess"){
  progress(state.questionsAsked,state.maxQuestions);text("stage-label","PAM IS LOCKING IT IN");
  dialogue(script.guessLead(state.questionsAsked),state.text,"One guess. No take-backs.");actions("guess-actions");
 }
 else {
  progress(state.questionsAsked??state.turns,20);text("stage-label",state.stumped?"YOU STUMPED PAM":state.correct?"PAM KNEW IT":"YOU GOT PAM");
  let question;
  if(state.stumped)question=`You made it through all 20 questions.`;
  else if(state.correct)question=`You were thinking of ${state.guess}.`;
  else question=`Pam guessed ${state.guess}. She was wrong.`;
  dialogue(script.resultLine(state),question,script.resultAside(state));actions("result-actions");
 }
}
function start(){renderState(adapter.start());}
function answer(value){if(stage!=="question")return;renderState(adapter.answer(value));}
function confirm(correct){if(stage!=="guess")return;renderState(adapter.confirm(correct));}
byId("start-btn").addEventListener("click",start);document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>answer(b.dataset.answer)));byId("correct-btn").addEventListener("click",()=>confirm(true));byId("wrong-btn").addEventListener("click",()=>confirm(false));byId("again-btn").addEventListener("click",()=>intro());intro();
})();
