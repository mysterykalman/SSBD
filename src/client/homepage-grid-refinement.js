const STYLE_ID = "homepageFourModeGrid";

const css = `
.home-grid.start-grid{
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  grid-auto-rows:1fr;
  gap:24px;
  align-items:stretch;
}
.home-grid.start-grid>.mode-card{
  grid-column:auto!important;
  height:100%;
  min-height:100%;
}
.home-grid.start-grid>.mode-card>.mode-stage,
.home-grid.start-grid>.mode-card>.conn-launch-stage{
  height:200px;
  min-height:200px;
}
.home-grid.start-grid>.mode-card>.mode-body{
  display:flex;
  flex-direction:column;
  flex:1;
  padding:20px 28px 28px;
}
.home-grid.start-grid>.mode-card .start-copy{display:grid;gap:8px}
.home-grid.start-grid>.mode-card .mode-actions{margin-top:auto;padding-top:18px}
.games{margin-top:40px!important}

body.conn-mode-open .topbar{
  display:flex!important;
  grid-template-columns:none!important;
  grid-template-rows:none!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:12px!important;
  padding:max(16px,env(safe-area-inset-top)) 0 8px!important;
}
body.conn-mode-open .brand{
  grid-column:auto!important;
  grid-row:auto!important;
  align-self:auto!important;
  margin:0!important;
}
body.conn-mode-open .brand-logo{width:132px!important}
body.conn-mode-open .top-actions{grid-column:auto!important;grid-row:auto!important;justify-self:auto!important}

.conn-launch .conn-launch-stage{justify-content:space-evenly!important;gap:10px!important;padding-inline:20px!important}
.conn-launch .conn-launch-standee.standee{width:82px!important;height:100px!important;margin-bottom:26px!important}
.conn-launch .conn-launch-standee::after{
  width:82px!important;
  min-width:82px!important;
  max-width:82px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  padding:0 5px 3px!important;
  line-height:1!important;
  text-align:center!important;
}

@media(max-width:680px){
  .home-grid.start-grid{grid-template-columns:minmax(0,1fr)!important;grid-auto-rows:auto;gap:18px}
  .home-grid.start-grid>.mode-card{height:auto;min-height:0}
  .home-grid.start-grid>.mode-card>.mode-stage,
  .home-grid.start-grid>.mode-card>.conn-launch-stage{height:172px;min-height:172px}
  .home-grid.start-grid>.mode-card>.mode-body{padding:18px 22px 24px}
  .games{margin-top:32px!important}
  .conn-launch .conn-launch-stage{padding-inline:12px!important;gap:8px!important}
  .conn-launch .conn-launch-standee.standee{width:68px!important;height:84px!important;margin-bottom:24px!important}
  .conn-launch .conn-launch-standee::after{width:70px!important;min-width:70px!important;max-width:70px!important}
  body.conn-mode-open .topbar{flex-wrap:wrap}
  body.conn-mode-open .top-actions{margin-left:auto;flex-wrap:wrap;justify-content:flex-end}
}
@media(max-width:420px){
  .conn-launch .conn-launch-stage{padding-inline:7px!important;gap:5px!important}
  .conn-launch .conn-launch-standee.standee{width:62px!important;height:78px!important}
  .conn-launch .conn-launch-standee::after{width:64px!important;min-width:64px!important;max-width:64px!important}
  body.conn-mode-open .brand-logo{width:112px!important}
}
`;

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement("style");
  style.id=STYLE_ID;
  style.textContent=css;
  document.head.append(style);
}

function titleOf(card){return card?.querySelector("h2")?.textContent?.trim().toLowerCase()||"";}
function findCard(grid,kind){
  const cards=[...grid.querySelectorAll(":scope > .mode-card")];
  if(kind==="solo")return cards.find(card=>card.dataset.mode==="solo"||card.classList.contains("solo-card")||titleOf(card).includes("solo play"));
  if(kind==="together")return cards.find(card=>card.dataset.mode==="together"||card.classList.contains("family-card")||titleOf(card).includes("play together"));
  if(kind==="pam")return cards.find(card=>card.dataset.mode==="pam"||titleOf(card).includes("don’t tell me")||titleOf(card).includes("mom mode"));
  if(kind==="connections")return cards.find(card=>card.dataset.mode==="connections"||titleOf(card).includes("odd one in"));
  return null;
}

function paragraph(text){const p=document.createElement("p");p.textContent=text;return p;}
function currentParagraphs(copy){return copy?[...copy.querySelectorAll(":scope > p")].map(p=>p.textContent):[];}
function sameLines(a,b){return a.length===b.length&&a.every((line,index)=>line===b[index]);}

function ensureCopy(card,lines,{preserveControls=false}={}){
  const body=card?.querySelector(":scope > .mode-body");
  if(!body)return null;
  let copy=body.querySelector(":scope > .start-copy");
  if(!copy){
    copy=document.createElement("div");
    copy.className="start-copy home-copy-refined";
    body.querySelector(":scope > h2")?.after(copy);
  }
  const controls=preserveControls?[...copy.querySelectorAll(":scope > button, :scope > a")]:[];
  if(!sameLines(currentParagraphs(copy),lines))copy.replaceChildren(...lines.map(paragraph),...controls);
  [...body.querySelectorAll(":scope > p")].forEach(p=>p.remove());
  return copy;
}

function refineSolo(card){
  if(!card)return;
  card.querySelectorAll(".beta-badge").forEach(badge=>badge.remove());
}

function refinePam(card){
  if(!card)return;
  const title=card.querySelector("h2");
  if(title&&title.textContent!=="Don’t Tell Me")title.textContent="Don’t Tell Me";
  ensureCopy(card,[
    "Pick a word. Pam will take it from there.",
    "She’ll ask the questions and narrow it down before you get too pleased with yourself.",
    "Good luck with that."
  ]);
}

function refineTogether(card){
  if(!card)return;
  const unavailable=card.classList.contains("is-unavailable");
  ensureCopy(card,unavailable?[
    "Grab a friend and see if your brains make the same strange choices.",
    "Right now this mode is taking a short break. Solo still works."
  ]:[
    "Grab a friend and see if your brains make the same strange choices.",
    "Start a game or join one already in progress."
  ],{preserveControls:unavailable});
}

function refineConnections(card){
  if(!card)return;
  const title=card.querySelector("h2");
  if(title&&title.textContent!=="Odd One In")title.textContent="Odd One In";
  ensureCopy(card,[
    "Some words belong together.",
    "Some are just being difficult.",
    "Pick a challenge and sort out the troublemaker."
  ]);
  const standees=[...card.querySelectorAll(".conn-launch-standee")];
  const labels=["OWEN","ZOE","MARTIN","PROF. BRAINE"];
  standees.forEach((standee,index)=>{if(labels[index]&&standee.dataset.name!==labels[index])standee.dataset.name=labels[index];});
}

function reorder(grid){
  const wanted=[findCard(grid,"solo"),findCard(grid,"together"),findCard(grid,"pam"),findCard(grid,"connections")].filter(Boolean);
  const current=[...grid.querySelectorAll(":scope > .mode-card")].filter(card=>wanted.includes(card));
  if(wanted.length!==current.length||wanted.some((card,index)=>card!==current[index]))wanted.forEach(card=>grid.append(card));
}

function applyHomepageRefinement(){
  installStyles();
  const grid=document.querySelector(".home-grid.start-grid");
  if(!grid)return;
  refineSolo(findCard(grid,"solo"));
  refineTogether(findCard(grid,"together"));
  refinePam(findCard(grid,"pam"));
  refineConnections(findCard(grid,"connections"));
  reorder(grid);
}

let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;applyHomepageRefinement();});
}
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});
else schedule();
