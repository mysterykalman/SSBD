(function(){
"use strict";
const script=window.PamCopy,adapter=window.MomModeAdapter;
const byId=id=>document.getElementById(id);const text=(id,value)=>{byId(id).textContent=value??"";};const hide=(id,value)=>{byId(id).hidden=Boolean(value);};
const STORAGE_KEY="ssbd:mom-progress:v1";
const RANKS=[
 {min:0,name:"Look at You"},
 {min:100,name:"Okay, Sweetie"},
 {min:250,name:"You’re Getting Good at This"},
 {min:500,name:"Alright, Now You’re Showing Off"},
 {min:1000,name:"I’m Very Proud. Also Annoyed."},
 {min:2000,name:"This Is Getting Personal, Honey"},
 {min:5000,name:"Fine. You’re the Favourite"}
];
function cleanNumber(v){const n=Number(v);return Number.isFinite(n)&&n>=0?Math.floor(n):0;}
function loadProgress(){
 try{const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||{};return{totalPoints:cleanNumber(raw.totalPoints),games:cleanNumber(raw.games),streak:cleanNumber(raw.streak),bestStreak:cleanNumber(raw.bestStreak),bestRound:cleanNumber(raw.bestRound)};}
 catch{return{totalPoints:0,games:0,streak:0,bestStreak:0,bestRound:0};}
}
let profile=loadProgress(),stage="intro";
function saveProgress(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));}catch{}}
function rankState(points){let current=RANKS[0],next=null;for(let i=0;i<RANKS.length;i++){if(points>=RANKS[i].min)current=RANKS[i];else{next=RANKS[i];break;}}return{current,next};}
function renderProfile(){
 const ranks=rankState(profile.totalPoints);
 text("pam-score",profile.totalPoints.toLocaleString());text("pam-rank",ranks.current.name);text("pam-streak",profile.streak);text("pam-best",profile.bestRound);text("best-streak-label",`Best streak: ${profile.bestStreak}`);
 const fill=byId("rank-progress-fill");
 if(!ranks.next){fill.style.width="100%";text("rank-progress-label","Top rank reached");return;}
 const span=ranks.next.min-ranks.current.min,earned=profile.totalPoints-ranks.current.min,remaining=ranks.next.min-profile.totalPoints;
 fill.style.width=`${Math.max(0,Math.min(100,earned/span*100))}%`;text("rank-progress-label",`Next rank: ${ranks.next.name} · ${remaining} point${remaining===1?"":"s"}`);
}
function recordResult(state){
 const before=profile.totalPoints,beforeRank=rankState(before).current,earned=cleanNumber(state.score),wonRound=Boolean(state.stumped||state.correct===false);
 profile.totalPoints+=earned;profile.games+=1;profile.streak=wonRound?profile.streak+1:0;profile.bestStreak=Math.max(profile.bestStreak,profile.streak);profile.bestRound=Math.max(profile.bestRound,earned);saveProgress();renderProfile();
 const afterRank=rankState(profile.totalPoints).current,rankChanged=afterRank.min>beforeRank.min;
 return{earned,before,after:profile.totalPoints,rankChanged,newRank:rankChanged?afterRank:null};
}
text("pam-bio",script.copy.bio);renderProfile();
function actions(active){for(const id of ["intro-actions","answer-actions","hunch-actions","guess-actions","result-actions"])hide(id,id!==active);}
function progress(number,max){const limit=Number.isFinite(max)&&max>0?max:20,n=Math.min(Math.max(Number(number)||0,0),limit);byId("progress-fill").style.width=(n/limit*100)+"%";const track=document.querySelector(".progress-track");track.setAttribute("aria-valuemax",String(limit));track.setAttribute("aria-valuenow",String(n));text("question-counter",n?`${n} / ${limit}`:"");hide("question-counter",!n);}
function dialogue(lead,question,aside){text("pam-lead",lead);text("pam-question",question);text("pam-aside",aside);hide("pam-aside",!aside);}
function intro(){stage="intro";adapter.reset();text("stage-label","ROUND SETUP");dialogue(script.copy.intro.lead,script.copy.intro.question,script.copy.intro.aside);progress(0,20);hide("result-points",true);actions("intro-actions");}
function stageLabel(state){if(state.kind==='hunch')return"STRONG HUNCH";if(state.kind==='guess')return"FINAL GUESS";if(state.number>=17)return"GETTING CLOSE";if(state.number>=9)return"NARROWING IT DOWN";return"THINKING";}
function showResultPoints(summary){text("result-points",`+${summary.earned} points`);hide("result-points",false);}
function renderState(state){
 if(!state||!["question","hunch","guess","result"].includes(state.kind))throw Error("Invalid Mom Mode adapter state");stage=state.kind;
 if(stage==="question"){
  progress(state.questionsAsked??state.number-1,state.maxQuestions);text("stage-label",stageLabel(state));hide("result-points",true);dialogue(script.leadFor(state),state.text,"");actions("answer-actions");return;
 }
 if(stage==="hunch"){
  progress(state.questionsAsked,state.maxQuestions);text("stage-label","STRONG HUNCH");hide("result-points",true);dialogue(script.hunchLead(state.questionsAsked),"Want me to guess now?",script.hunchAside(state.questionsAsked));text("keep-asking-btn",`Keep asking · costs ${state.continuePrice} pts`);actions("hunch-actions");return;
 }
 if(stage==="guess"){
  progress(state.questionsAsked,state.maxQuestions);text("stage-label","FINAL GUESS");hide("result-points",true);dialogue(script.guessLead(state.questionsAsked),state.text,"One guess. No take-backs.");actions("guess-actions");return;
 }
 progress(state.questionsAsked??state.turns,20);text("stage-label",state.correct?"ROUND LOST":"ROUND WON");
 let question;if(state.stumped)question="Okay. I don't know.";else if(state.correct)question=`She got it: ${state.guess}.`;else question=`She guessed ${state.guess}. Wrong.`;
 const summary=recordResult(state);let aside=script.resultAside(state);if(summary.rankChanged){const milestone=script.milestoneLine(summary.newRank.min);if(milestone)aside=milestone;}
 dialogue(script.resultLine(state),question,aside);showResultPoints(summary);actions("result-actions");
}
function start(){renderState(adapter.start());}
function answer(value){if(stage!=="question")return;renderState(adapter.answer(value));}
function chooseGuess(){if(stage!=="hunch")return;renderState(adapter.makeGuess());}
function keepAsking(){if(stage!=="hunch")return;renderState(adapter.keepAsking());}
function confirm(correct){if(stage!=="guess")return;renderState(adapter.confirm(correct));}
const rules=byId("rules-dialog");
function openRules(){if(typeof rules.showModal==="function")rules.showModal();else rules.setAttribute("open","");}
function closeRules(){if(typeof rules.close==="function"&&rules.open)rules.close();else rules.removeAttribute("open");}
byId("rules-btn").addEventListener("click",openRules);byId("rules-close").addEventListener("click",closeRules);rules.addEventListener("click",e=>{if(e.target===rules)closeRules();});
byId("start-btn").addEventListener("click",start);document.querySelectorAll("[data-answer]").forEach(b=>b.addEventListener("click",()=>answer(b.dataset.answer)));byId("guess-now-btn").addEventListener("click",chooseGuess);byId("keep-asking-btn").addEventListener("click",keepAsking);byId("correct-btn").addEventListener("click",()=>confirm(true));byId("wrong-btn").addEventListener("click",()=>confirm(false));byId("again-btn").addEventListener("click",()=>intro());intro();
})();
