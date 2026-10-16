import {generateConnectionsGame, shuffleConnections} from "../../shared/connections/generator.js";
import {ODD_ONE_IN_CHARACTERS, oddOneInCharacter} from "./characters.js";

const STORAGE_KEY = "ssbd.odd-one-in.v1";
const GROUP_COLORS = ["yellow", "green", "blue", "purple"];

const styleText = `
.conn-launch{display:grid;gap:10px}.conn-launch .conn-mini{font-size:.86rem;opacity:.72}.conn-overlay{position:fixed;inset:0;z-index:10000;background:#f7efdf;color:#35261f;overflow:auto;font-family:Nunito,system-ui,sans-serif}.conn-shell{width:min(840px,calc(100% - 24px));margin:0 auto;padding:18px 0 44px}.conn-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.conn-title{font-weight:1000;font-size:clamp(1.7rem,5vw,2.5rem);line-height:1;margin:0}.conn-kicker{font-weight:900;letter-spacing:.08em;text-transform:uppercase;font-size:.72rem;opacity:.55}.conn-close,.conn-btn{font:inherit;font-weight:900;border:2px solid #5b4338;background:#fff9ed;color:#3c2c24;border-radius:999px;padding:10px 16px;cursor:pointer;box-shadow:0 3px 0 rgba(74,48,36,.16)}.conn-close{width:44px;height:44px;padding:0;font-size:24px}.conn-btn:disabled{opacity:.36;cursor:not-allowed}.conn-btn.primary{background:#e6a63a;color:#382719}.conn-intro{text-align:center;padding:10px 0 4px}.conn-intro h2{font-size:clamp(1.45rem,4vw,2.05rem);margin:0 0 6px}.conn-intro>p{margin:0 auto 22px;max-width:610px;font-weight:750;line-height:1.45}.conn-tiers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.conn-tier{display:grid;grid-template-columns:92px 1fr;gap:14px;align-items:center;min-height:142px;border:2px solid rgba(87,61,48,.14);border-radius:28px;padding:14px;text-align:left;font:inherit;cursor:pointer;background:#fff9ee;box-shadow:0 7px 0 rgba(82,55,39,.10)}.conn-tier:hover{transform:translateY(-1px)}.conn-tier-copy strong{display:block;font-size:1.2rem;font-weight:1000;margin-bottom:2px}.conn-tier-difficulty{font-size:.72rem;font-weight:1000;letter-spacing:.06em;text-transform:uppercase;opacity:.52;margin-bottom:7px}.conn-tier-copy p{margin:0;font-size:.9rem;font-weight:760;line-height:1.35}.conn-tier-copy small{display:block;margin-top:7px;font-weight:900;opacity:.67}.conn-portrait{width:86px;height:104px;border-radius:42% 42% 34% 34%;display:grid;place-items:center;position:relative;border:4px solid #f4e0bd;box-shadow:0 4px 0 rgba(70,46,34,.18),inset 0 0 0 2px rgba(255,255,255,.45);font-weight:1000;font-size:1.5rem;color:#fff9ed;text-shadow:0 2px 0 rgba(51,34,28,.22)}.conn-portrait::after{content:attr(data-name);position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#f7e4bd;color:#4a3529;border:2px solid #c7a97d;border-radius:999px;padding:2px 8px;font-size:.63rem;letter-spacing:.03em;text-shadow:none}.conn-portrait.orange{background:#d99038}.conn-portrait.teal{background:#5aa8a4}.conn-portrait.coral{background:#c87363}.conn-portrait.purple{background:#8d73b5}.conn-character-strip{display:grid;grid-template-columns:82px 1fr auto;gap:14px;align-items:center;background:#fff9ee;border:2px solid rgba(87,61,48,.12);border-radius:24px;padding:12px 14px;margin-bottom:12px}.conn-character-strip .conn-portrait{width:72px;height:82px;font-size:1.2rem}.conn-character-name{font-size:1.05rem;font-weight:1000}.conn-character-role{font-size:.78rem;font-weight:900;opacity:.58;text-transform:uppercase;letter-spacing:.05em}.conn-speech{position:relative;margin:10px 0 16px;padding:13px 16px;background:#fffaf0;border:2px solid #c8aa7c;border-radius:18px;font-weight:850;line-height:1.38;min-height:48px}.conn-speech::before{content:"";position:absolute;left:28px;top:-9px;width:14px;height:14px;background:#fffaf0;border-left:2px solid #c8aa7c;border-top:2px solid #c8aa7c;transform:rotate(45deg)}.conn-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 12px;font-weight:900}.conn-mistakes{display:flex;align-items:center;gap:6px}.conn-dot{width:12px;height:12px;border-radius:50%;background:#4d392f;display:inline-block}.conn-dot.used{opacity:.17}.conn-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.conn-tile{aspect-ratio:1.55/1;min-height:66px;border:2px solid rgba(91,67,56,.12);border-radius:18px;background:#efe4cf;color:#35271f;font:inherit;font-weight:1000;font-size:clamp(.72rem,2.7vw,1rem);line-height:1.05;padding:8px 5px;cursor:pointer;overflow-wrap:anywhere;box-shadow:0 3px 0 rgba(61,49,35,.10)}.conn-tile[aria-pressed=true]{background:#5a4940;color:#fffaf0;transform:translateY(-2px)}.conn-solved{display:grid;gap:8px;margin-bottom:9px}.conn-group{border-radius:18px;padding:14px 10px;text-align:center;color:#302a23;box-shadow:0 3px 0 rgba(61,49,35,.10)}.conn-group strong{display:block;font-weight:1000;font-size:.98rem;margin-bottom:4px}.conn-group span{display:block;font-weight:850;font-size:.85rem}.conn-group.yellow{background:#f1d66d}.conn-group.green{background:#a8c98b}.conn-group.blue{background:#91b8d8}.conn-group.purple{background:#b29bc7}.conn-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:18px 0 8px}.conn-end{text-align:center;margin-top:18px;padding:20px;border-radius:24px;background:#f0dfbf}.conn-end h2{margin:0 0 6px;font-size:1.55rem}.conn-end p{font-weight:760;margin:0 0 15px}.conn-reveal{margin-top:12px;display:grid;gap:8px}.conn-home-art{display:flex;align-items:end;justify-content:center;gap:-2px;height:118px;padding-top:10px}.conn-home-art .conn-portrait{width:60px;height:72px;font-size:1rem;margin:0 -3px}.conn-home-art .conn-portrait:nth-child(2),.conn-home-art .conn-portrait:nth-child(4){transform:translateY(8px)}@keyframes conn-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}.conn-shake{animation:conn-shake .22s linear 2}@media(max-width:620px){.conn-shell{width:min(100% - 14px,840px);padding-top:10px}.conn-tiers{grid-template-columns:1fr}.conn-tier{grid-template-columns:78px 1fr;min-height:126px}.conn-portrait{width:72px;height:88px}.conn-character-strip{grid-template-columns:68px 1fr}.conn-character-strip .conn-portrait{width:60px;height:72px}.conn-character-strip>.conn-btn{display:none}.conn-board{gap:6px}.conn-tile{min-height:58px;border-radius:14px;padding:6px 3px}}@media(prefers-reduced-motion:reduce){.conn-tier,.conn-tile,.conn-shake{animation:none!important;transition:none!important}}
`;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

function portrait(character, cls = "") {
  return el("div", {class:`conn-portrait ${character.accent} ${cls}`.trim(), "data-name":character.name, "aria-hidden":"true"}, character.initials);
}

function readMemory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {recentFamilies:Array.isArray(value.recentFamilies)?value.recentFamilies.slice(-32):[],signatures:Array.isArray(value.signatures)?value.signatures.slice(-500):[]};
  } catch { return {recentFamilies:[],signatures:[]}; }
}
function writeMemory(memory){localStorage.setItem(STORAGE_KEY,JSON.stringify({recentFamilies:memory.recentFamilies.slice(-32),signatures:memory.signatures.slice(-500)}));}

let overlay=null;
let game=null;

function installStyles(){if(document.getElementById("connectionsNativeStyles"))return;const style=el("style",{id:"connectionsNativeStyles"});style.textContent=styleText;document.head.append(style);}
function closeMode(){overlay?.remove();overlay=null;game=null;document.body.style.overflow="";}
function shell(...content){return el("div",{class:"conn-shell"},el("div",{class:"conn-top"},el("div",{},el("div",{class:"conn-kicker"},"Same Same But Different"),el("h1",{class:"conn-title"},"Odd One In")),el("button",{class:"conn-close",type:"button","aria-label":"Close Odd One In",onclick:closeMode},"×")),...content);}
function openMode(){if(overlay)return;document.body.style.overflow="hidden";overlay=el("div",{class:"conn-overlay",role:"dialog","aria-modal":"true","aria-label":"Odd One In game"});document.body.append(overlay);renderPicker();}

function tierCard(tier) {
  const character = oddOneInCharacter(tier);
  return el("button",{class:"conn-tier",type:"button",onclick:()=>startGame(tier),"aria-label":`${character.name}, ${character.difficulty}`},
    portrait(character),
    el("div",{class:"conn-tier-copy"},
      el("strong",{},character.name),
      el("div",{class:"conn-tier-difficulty"},character.difficulty),
      el("p",{},character.blurb),
      el("small",{},character.relationship)));
}

function renderPicker(){
  overlay.replaceChildren(shell(
    el("section",{class:"conn-intro"},
      el("h2",{},"Who do you want in your corner?"),
      el("p",{},"Sort sixteen words into four groups. The puzzle gets harder. So does the company."),
      el("div",{class:"conn-tiers"},...Object.keys(ODD_ONE_IN_CHARACTERS).map(Number).map(tierCard)))));
  overlay.querySelector(".conn-tier")?.focus();
}

function startGame(tier){
  const memory=readMemory();
  const character=oddOneInCharacter(tier);
  try{
    const generated=generateConnectionsGame({tier,recentFamilyIds:memory.recentFamilies,usedSignatures:memory.signatures});
    memory.signatures.push(generated.signature);memory.recentFamilies.push(...generated.groups.map(group=>group.familyId));writeMemory(memory);
    game={tier,character,groups:generated.groups.map((group,index)=>({...group,color:GROUP_COLORS[index]})),board:[...generated.board],selected:new Set(),solved:[],mistakes:0,message:character.lines.intro,selectionEvents:0};
    renderGame();
  }catch(error){overlay.replaceChildren(shell(el("section",{class:"conn-end"},el("h2",{},"Couldn’t build a fresh board"),el("p",{},error?.message||"Try another character."),el("button",{class:"conn-btn",type:"button",onclick:renderPicker},"Back"))));}
}

function chooseWord(word){
  if(!game||game.solved.length===4||game.mistakes>=4)return;
  if(game.selected.has(word))game.selected.delete(word);else if(game.selected.size<4)game.selected.add(word);
  if(game.selected.size===4&&game.selectionEvents===0){game.selectionEvents=1;game.message=game.character.lines.firstSelection;}
  renderGame();
}

function submitSelection(){
  if(!game||game.selected.size!==4)return;
  const hit=game.groups.find(group=>!game.solved.includes(group.id)&&group.words.every(word=>game.selected.has(word)));
  if(hit){
    game.solved.push(hit.id);game.board=game.board.filter(word=>!game.selected.has(word));game.selected.clear();
    if(game.solved.length===4) game.message=game.character.lines.win;
    else if(game.solved.length===3) game.message=game.character.lines.finalFour;
    else if(game.solved.length===2) game.message=game.character.lines.twoLeft;
    else game.message=game.solved.length===1?game.character.lines.correct:game.character.lines.correctAgain;
    renderGame();return;
  }
  const oneAway=game.groups.some(group=>!game.solved.includes(group.id)&&group.words.filter(word=>game.selected.has(word)).length===3);
  game.mistakes+=1;game.selected.clear();
  if(game.mistakes>=4) game.message=game.character.lines.loss;
  else if(oneAway) game.message=game.character.lines.oneAway;
  else if(game.mistakes>=3) game.message=game.character.lines.severalFailed;
  else game.message=game.mistakes===1?game.character.lines.wrong:game.character.lines.wrongAlt;
  renderGame(true);
}

function groupRow(group){return el("div",{class:`conn-group ${group.color}`},el("strong",{},group.category),el("span",{},group.words.join(", ")));}

function characterStrip(){
  const c=game.character;
  return el("section",{class:"conn-character-strip"},portrait(c),el("div",{},el("div",{class:"conn-character-name"},c.name),el("div",{class:"conn-character-role"},`${c.difficulty} · ${c.relationship}`)),el("button",{class:"conn-btn",type:"button",onclick:renderPicker},"Change"));
}

function endPanel(won,unsolved){
  return el("section",{class:"conn-end"},el("h2",{},won?"Puzzle solved.":"Puzzle wins this one."),el("p",{},won?game.character.lines.win:game.character.lines.loss),won?null:el("div",{class:"conn-reveal"},...unsolved.map(groupRow)),el("div",{class:"conn-actions"},el("button",{class:"conn-btn primary",type:"button",onclick:()=>{const line=game.character.lines.replay;startGame(game.tier);game.message=line;renderGame();}},"Play another"),el("button",{class:"conn-btn",type:"button",onclick:renderPicker},"Change character"),el("button",{class:"conn-btn",type:"button",onclick:closeMode},"Return home")));
}

function renderGame(shake=false){
  const solvedGroups=game.solved.map(id=>game.groups.find(group=>group.id===id));
  const unsolvedGroups=game.groups.filter(group=>!game.solved.includes(group.id));
  const won=game.solved.length===4;const lost=game.mistakes>=4&&!won;
  const dots=[0,1,2,3].map(index=>el("span",{class:`conn-dot ${index<game.mistakes?"used":""}`,"aria-hidden":"true"}));
  const board=el("div",{class:`conn-board ${shake?"conn-shake":""}`,"aria-label":"Word board"},...game.board.map(word=>el("button",{class:"conn-tile",type:"button","aria-pressed":game.selected.has(word)?"true":"false",onclick:()=>chooseWord(word)},word)));
  overlay.replaceChildren(shell(
    characterStrip(),
    el("div",{class:"conn-speech",role:"status","aria-live":"polite"},game.message),
    el("div",{class:"conn-meta"},el("span",{},"Find four groups of four"),el("div",{class:"conn-mistakes","aria-label":`${Math.max(0,4-game.mistakes)} mistakes remaining`},el("span",{},"Mistakes"),...dots)),
    el("div",{class:"conn-solved"},...solvedGroups.map(groupRow)),board,
    el("div",{class:"conn-actions"},el("button",{class:"conn-btn",type:"button",disabled:won||lost||game.board.length<2,onclick:()=>{game.board=shuffleConnections(game.board);renderGame();}},"Shuffle"),el("button",{class:"conn-btn",type:"button",disabled:game.selected.size===0,onclick:()=>{game.selected.clear();renderGame();}},"Deselect all"),el("button",{class:"conn-btn primary",type:"button",disabled:game.selected.size!==4,onclick:submitSelection},"Submit")),won||lost?endPanel(won,unsolvedGroups):null));
}

function makeLauncher(){
  const characters=Object.values(ODD_ONE_IN_CHARACTERS);
  return el("section",{class:"card mode-card start conn-launch","data-mode":"connections","aria-labelledby":"connectionsTitle"},
    el("div",{class:"conn-home-art","aria-hidden":"true"},...characters.map(character=>portrait(character))),
    el("div",{class:"mode-body"},el("h2",{id:"connectionsTitle"},"Odd One In"),el("p",{},"Sort sixteen words into four hidden groups."),el("p",{class:"conn-mini"},"Four characters. Four difficulty levels. Very different ideas about how helpful they’re being."),el("button",{class:"btn big",type:"button",onclick:openMode},"Choose your opponent")));
}

function mountLauncher(){installStyles();const grid=document.querySelector(".home-grid.start-grid");if(!grid||grid.querySelector('[data-mode="connections"]'))return;grid.append(makeLauncher());}
const observer=new MutationObserver(mountLauncher);observer.observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountLauncher,{once:true});else mountLauncher();
