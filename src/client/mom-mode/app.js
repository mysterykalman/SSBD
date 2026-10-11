(function(){
"use strict";
const script=window.PamCopy,adapter=window.MomModeAdapter;
const byId=id=>document.getElementById(id);const text=(id,value)=>{byId(id).textContent=value??"";};const hide=(id,value)=>{byId(id).hidden=Boolean(value);};
const STORAGE_KEY="ssbd:mom-progress:v1";
const RANKS=[
 {min:0,name:"Pam Is Unconcerned"},
 {min:100,name:"Pam Has Noticed"},
 {min:250,name:"Pam Is Suspicious"},
 {min:500,name:"This Is Becoming a Thing"},
 {min:1000,name:"Actually Stumped Mom"},
 {min:2000,name:"Pam Wants a Rematch"},
 {min:5000,name:"Family Legend"}
];
function cleanNumber(v){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.floor(n):0;}
function loadProgress(){
 try{
  const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||{};
  return{totalPoints:cleanNumber(raw.totalPoints),games:cleanNumber(raw.games),streak:cleanNumber(raw.streak),bestStreak:cleanNumber(raw.bestStreak),bestRound:cleanNumber(raw.bestRound)};
 }catch{return{totalPoints:0,games:0,streak:0,bestStreak:0,bestRound:0};}
}
let profile=loadProgress(),stage="intro";
function saveProgress(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));}catch{}}
function rankState(points){
 let current=RANKS[0],next=null;
 for(let i=0;i<RANKS.length;i++){if(points>=RANKS[i].min)current=RANKS[i];else{next=RANKS[i];break;}}
 return{current,next};
}
function renderProfile(){
 const ranks=rankState(profile.totalPoints);
 text("pam-score",profile.totalPoints.toLocaleString());text("pam-rank",ranks.current.name);text("pam-streak",profile.streak);text("pam-best",profile.bestRound);text("best-streak-label",`Best streak: ${profile.bestStreak}`);
 const fill=byId("rank-progress-fill");
 if(!ranks.next){fill.style.width="100%";text("rank-progress-label","Top rank reached");return;}
 const span=ranks.next.min-ranks.current.min;const earned=profile.totalPoints-ranks.current.min;fill.style.width=`${Math.max(0,Math.min(100,earned/span*100))}%`;text("rank-progress-label",`${ranks.next.min-profile.totalPoints} points to ${ranks.next.name}`);
}
function recordResult(state){
 const before=profile.totalPoints,beforeRank=rankState(before).current;
 const earned=cleanNumber(state.score);const beatPam=Boolean(state.stumped||state.correct===false);
 profile.totalPoints+=earned;profile.games+=1;profile.streak=beatPam?profile.streak+1:0;profile.bestStreak=Math.max(profile.bestStreak,profile.streak);profile.bestRound=Math.max(profile.bestRound,earned);saveProgress();renderProfile();
 const afterRank=rankState(profile.totalPoints).current;const rankChanged=afterRank.min>beforeRank.min;
 return{earned,before,after:profile.totalPoints,rankChanged,newRank:rankChanged?afterRank:null};
}
text("pam-bio",script.copy.bio);renderProfile();
function actions(active){for(const id of ["intro-actions","answer-actions","hunch-actions","guess-actions","result-actions"])hide(id,id!==active);}
function progress(number,max){const limit=Number.isFinite(max)&&max>0?max:20;const n=Math.min(Math.max(Number(number)||0,0),limit);byId("progress-fill").style.width=(n/limit*100)+"%";const track=document.querySelector(".progress-track");track.setAttribute("aria-valuemax",String(limit));track.setAttribute("aria-valuenow",String(n));text("question-counter",n?`${n} / ${limit}`:"");hide("question-counter",!n);}
function dialogue(lead,question,aside){text("pam-lead",lead);text("pam-question",question);text("pam-aside",aside);hide("pam-aside",!aside);}
function intro(){stage="intro";adapter.reset();text("stage-label","PAM'S KITCHEN TABLE");dialogue(script.copy.intro.lead,script.copy.intro.question,script.copy.intro.aside);progress(0,20);hide("round-score",true);actions("intro-actions");}
function stageLabel(state){if(state.kind==='hunch')return"PAM HAS A HUNCH";if(state.kind==='guess')return"PAM IS LOCKING IT IN";if(state.number>=17)return"PAM IS VERY INVESTED NOW";if(state.number>=9)return"PAM IS PUTTING IT TOGETHER";return"PAM IS PAYING ATTENTION";}
function showRoundScore(summary,state){hide("round-score",false);text("round-score-value",`+${summary.earned} points`);let total=`Pam Score: ${summary.before.toLocaleString()} → ${summary.after.toLocaleString()}`;if(state.continueCost)total+=` · ${state.continueCost} points spent on extra questions`;if(summary.rankChanged)total+=` · New rank: ${summary.newRank.name}`;text("round-score-total",total);}
function renderState(state){if(!state||!["question","hunch","guess","result"].includes(state.kind))throw Error("Invalid Mom Mode adapter state");stage=state.kind;
 if(stage==="question"){
  progress(state.questionsAsked??state.number-1,state.maxQuestions);text("stage-label",stageLabel(state));hide("round-score",true);
  dialogue(script.leadFor(state),state.text,"");actions("answer-actions");
 }
 else if(stage==="hunch"){
  progress(state.questionsAsked,state.maxQuestions);text("stage-label",stageLabel(state));hide("round-score",true);
  dialogue(script.hunchLead(state.questionsAsked),"Want me to guess now?",script.hunchAside(state.questionsAsked));text("keep-asking-btn",`Keep asking · costs ${state.continuePrice} pts`);actions("hunch-actions");
 }
 else if(stage==="guess"){
  progress(state.questionsAsked,state.maxQuestions);text("stage-label","PAM IS LOCKING IT IN");hide("round-score",true);
  dialogue(script.guessLead(state.questionsAsked),state.text,"One guess. No take-backs.");actions("guess-actions");
 }
 else {
  progress(state.questionsAsked??state.turns,20);text("stage-label",state.stumped?"YOU STUMPED PAM":state.correct?"PAM KNEW IT":"YOU GOT PAM");
  let question;if(state.stumped)question="You made it through all 20 questions.";else if(state.correct)question=`You were thinking of ${state.guess}.`;else question=`Pam guessed ${state.guess}. She was wrong.`;
  const summary=recordResult(state);let aside=script.resultAside(state);if(summary.rankChanged){const milestone=script.milestoneLine(summary.newRank.min);if(milestone)aside+=` ${milestone}`;}
  dialogue(script.resultLine(state),question,aside);showRoundScore(summary,state);actions("result-actions");
 }
}
function start(){renderState(adapter.start());}
function answer(value){if(stage!=="question")return;renderState(adapter.answer(value));}
function chooseGuess(){if(stage!=="hunch")return;renderState(adapter.makeGuess());}
function keepAsking(){if(stage!=="hunch")return;renderState(adapter.keepAsking());}
function confirm(correct){if(stage!=="guess")return;renderState(adapter.confirm(correct));}
byId("start-btn").addEventListener("click",start);document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>answer(b.dataset.answer)));byId("guess-now-btn").addEventListener("click",chooseGuess);byId("keep-asking-btn").addEventListener("click",keepAsking);byId("correct-btn").addEventListener("click",()=>confirm(true));byId("wrong-btn").addEventListener("click",()=>confirm(false));byId("again-btn").addEventListener("click",()=>intro());intro();
})();
