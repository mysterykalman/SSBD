import {CONNECTION_TIER_NAMES, generateConnectionsGame, shuffleConnections} from "../../shared/connections/generator.js";
import {ODD_ONE_IN_CHARACTERS, oddOneInLine} from "./characters.js";

const STORAGE_KEY = "ssbd.connections.v2";
const GROUP_COLORS = ["yellow", "green", "blue", "purple"];

const styleText = `
.conn-launch{display:grid;gap:12px}.conn-launch .beta-badge,.conn-launch-badges{display:none!important}
.conn-launch-cast{display:flex;align-items:flex-end;gap:10px;margin:-2px 0 10px;padding-top:4px}.conn-launch-standee.standee{width:72px;height:88px;margin-bottom:14px;border-radius:38px 38px 14px 14px}.conn-launch-standee>img{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;object-fit:cover;object-position:50% 0}.conn-launch-standee::after{--felt-h:26px;bottom:-13px;min-height:26px;padding:2px 10px 6px;font-size:.55rem;letter-spacing:.07em}
.conn-overlay{position:fixed;inset:0;z-index:10000;background:var(--grain),radial-gradient(900px 420px at 20% -10%,#fffaf2,transparent 60%),var(--page);color:var(--ink);overflow:auto;font-family:var(--font)}
.conn-shell{width:min(940px,calc(100% - 28px));margin:0 auto;padding:18px 0 44px}
.conn-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}.conn-title-wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.conn-title{font-weight:900;font-size:clamp(1.7rem,5vw,2.55rem);line-height:1;margin:0}
.conn-intro{text-align:center;display:grid;gap:10px;padding:14px 4px 6px}.conn-intro h2{font-size:clamp(1.55rem,5vw,2.25rem)}.conn-intro>p{max-width:660px;margin:0 auto;color:var(--ink-soft);font-weight:800}
.conn-tiers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px}.conn-tier{position:relative;overflow:hidden;padding:0;display:grid;grid-template-columns:145px 1fr;gap:0;align-items:stretch;text-align:left;min-height:184px;transition:transform .12s ease}.conn-tier:hover{transform:translateY(-2px)}
.conn-tier-portrait{position:relative;min-height:184px;background:var(--cream);overflow:hidden;border-radius:24px 0 0 24px}.conn-tier-portrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 18%}.conn-tier-portrait::after{content:"";position:absolute;inset:0;box-shadow:inset -12px 0 18px -18px rgba(60,36,20,.6)}
.conn-tier-copy{padding:17px 18px 16px;display:grid;align-content:center;gap:7px}.conn-tier-copy strong{font-size:1.24rem;font-weight:900}.conn-tier-copy .difficulty{justify-self:start}.conn-tier-copy .relationship{font-size:.9rem;font-weight:900}.conn-tier-copy .picker{font-size:.86rem;color:var(--ink-soft);font-weight:800;line-height:1.34}
.conn-game-head{display:grid;grid-template-columns:112px 1fr;gap:14px;align-items:end;margin-bottom:10px}.conn-speaker{display:grid;gap:7px;justify-items:center}.conn-speaker-portrait{width:108px;height:108px;object-fit:cover;object-position:50% 18%;border-radius:26px;background:var(--cream);border:4px solid var(--panel);box-shadow:var(--shadow-panel)}.conn-speaker .pill{white-space:nowrap;max-width:130px}.conn-bubble{--felt-h:118px;min-height:94px;display:flex;align-items:center;font-size:1rem;text-align:left}
.conn-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 12px;flex-wrap:wrap}.conn-meta-left{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.conn-mistakes{display:flex;align-items:center;gap:7px;font-weight:900}.conn-dot{width:13px;height:13px;border-radius:50%;background:var(--coral);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 1px 1px rgba(80,40,20,.18)}.conn-dot.used{opacity:.18}
.conn-solved{display:grid;gap:9px;margin-bottom:10px}.conn-group{display:grid;gap:6px;padding:10px 12px 12px;text-align:center}.conn-group .pill{justify-self:center}.conn-group-words{font-weight:900;font-size:.9rem;letter-spacing:.01em}
.conn-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.conn-tile{--felt-h:78px;width:100%;min-width:0;padding:10px 12px 18px;font-size:clamp(.72rem,2.15vw,1rem);line-height:1.05;border:0;cursor:pointer;transition:transform .12s ease,filter .12s ease}.conn-tile:hover{transform:translateY(-1px);filter:brightness(1.03)}.conn-tile[aria-pressed=true]{transform:translateY(2px) scale(.985);filter:saturate(1.12) brightness(.94)}
.conn-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin:16px 0 6px}.conn-actions .btn{min-width:130px}.conn-end{display:grid;gap:12px;text-align:center;margin-top:18px;padding:20px}.conn-end .conn-actions{margin-top:4px}.conn-reveal{display:grid;gap:8px;margin-top:4px}
@keyframes conn-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}.conn-shake{animation:conn-shake .22s linear 2}
@media(max-width:680px){.conn-shell{width:min(100% - 14px,940px);padding-top:10px}.conn-tiers{grid-template-columns:1fr}.conn-tier{grid-template-columns:112px 1fr;min-height:154px}.conn-tier-portrait{min-height:154px}.conn-tier-copy{padding:14px}.conn-board{gap:6px}.conn-tile{--felt-h:68px;padding:8px 6px 16px;font-size:clamp(.67rem,3vw,.9rem)}.conn-game-head{grid-template-columns:82px 1fr;gap:8px}.conn-speaker-portrait{width:80px;height:80px;border-radius:21px}.conn-speaker .pill{font-size:.7rem}.conn-bubble{--felt-h:108px;font-size:.9rem}.conn-actions .btn{min-width:0}.conn-launch-standee.standee{width:64px;height:78px;border-radius:34px 34px 13px 13px}.conn-launch-standee::after{--felt-h:24px;bottom:-12px;font-size:.5rem;padding:2px 8px 6px}}
@media(max-width:430px){.conn-tier{grid-template-columns:92px 1fr}.conn-tier-portrait{min-height:146px}.conn-tier-copy .picker{display:none}.conn-board{grid-template-columns:repeat(2,minmax(0,1fr))}.conn-tile{--felt-h:62px}.conn-game-head{grid-template-columns:72px 1fr}.conn-speaker-portrait{width:70px;height:70px}}
@media(prefers-reduced-motion:reduce){.conn-tier,.conn-tile,.conn-shake{animation:none!important;transition:none!important}}
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

function readMemory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {recentFamilies:Array.isArray(value.recentFamilies)?value.recentFamilies.slice(-32):[],signatures:Array.isArray(value.signatures)?value.signatures.slice(-500):[]};
  } catch { return {recentFamilies:[], signatures:[]}; }
}
function writeMemory(memory) { localStorage.setItem(STORAGE_KEY, JSON.stringify({recentFamilies:memory.recentFamilies.slice(-32),signatures:memory.signatures.slice(-500)})); }

let overlay = null;
let game = null;
let attempts = 0;

function installStyles() {
  if (document.getElementById("connectionsNativeStyles")) return;
  const style = el("style", {id:"connectionsNativeStyles"});
  style.textContent = styleText;
  document.head.append(style);
}
function closeMode() { overlay?.remove(); overlay=null; game=null; attempts=0; document.body.style.overflow=""; }
function shell(...content) {
  return el("div", {class:"conn-shell"},
    el("div", {class:"conn-top"},
      el("div", {class:"conn-title-wrap"}, el("h1", {class:"conn-title"}, "Odd One In"), el("span", {class:"pill sm orange"}, "16 words · 4 groups")),
      el("button", {class:"dialog-close", type:"button", "aria-label":"Close Odd One In", onclick:closeMode}, "×")),
    ...content);
}
function openMode() {
  if (overlay) return;
  document.body.style.overflow="hidden";
  overlay=el("div", {class:"conn-overlay", role:"dialog", "aria-modal":"true", "aria-label":"Odd One In game"});
  document.body.append(overlay);
  renderPicker();
}

function colourFor(character) {
  return character.id === "owen" ? "orange" : character.id === "zoe" ? "teal" : character.id === "martin" ? "green" : "purple";
}
function portrait(character, className, alt=true) {
  return el("img", {class:className, src:character.image, alt:alt ? character.name : "", "aria-hidden":alt ? null : "true", loading:"eager", draggable:"false"});
}
function characterButton(character) {
  return el("button", {class:"card conn-tier", type:"button", onclick:()=>startGame(character.tier), "aria-label":`${character.name}, ${character.difficulty}`},
    el("span", {class:"conn-tier-portrait"}, portrait(character, "", false)),
    el("span", {class:"conn-tier-copy"},
      el("span", {class:`pill sm ${colourFor(character)} difficulty`}, character.difficulty),
      el("strong", {}, character.name),
      el("span", {class:"relationship"}, character.relationship),
      el("span", {class:"picker"}, character.picker)));
}
function renderPicker() {
  overlay.replaceChildren(shell(
    el("section", {class:"conn-intro"},
      el("h2", {}, "Who are we getting involved in this?"),
      el("p", {}, "Sixteen words. Four groups. Everyone thinks they see it."),
      el("div", {class:"conn-tiers"}, ...Object.values(ODD_ONE_IN_CHARACTERS).map(characterButton)))));
  overlay.querySelector(".conn-tier")?.focus();
}

function setLine(event) { if (game) game.message = oddOneInLine(game.character.id, event); }
function startGame(tier) {
  const character = ODD_ONE_IN_CHARACTERS[tier];
  const memory = readMemory();
  try {
    const generated = generateConnectionsGame({tier, recentFamilyIds:memory.recentFamilies, usedSignatures:memory.signatures});
    memory.signatures.push(generated.signature);
    memory.recentFamilies.push(...generated.groups.map(group=>group.familyId));
    writeMemory(memory);
    attempts=0;
    game={tier,character,groups:generated.groups.map((group,index)=>({...group,color:GROUP_COLORS[index]})),board:[...generated.board],selected:new Set(),solved:[],mistakes:0,message:""};
    setLine("intro");
    renderGame();
  } catch (error) {
    overlay.replaceChildren(shell(el("section", {class:"card conn-end"},
      el("h2", {}, "Couldn’t build a fresh board"),
      el("p", {class:"muted"}, error?.message || "Try another difficulty."),
      el("div", {class:"conn-actions"}, el("button", {class:"btn ghost", type:"button", onclick:renderPicker}, "Back")))));
  }
}
function chooseWord(word) {
  if (!game || game.solved.length===4 || game.mistakes>=4) return;
  if (game.selected.has(word)) game.selected.delete(word);
  else if (game.selected.size<4) game.selected.add(word);
  if (game.selected.size===4 && attempts===0) setLine("firstSelection");
  renderGame();
}
function submitSelection() {
  if (!game || game.selected.size!==4) return;
  attempts+=1;
  const hit=game.groups.find(group=>!game.solved.includes(group.id)&&group.words.every(word=>game.selected.has(word)));
  if (hit) {
    game.solved.push(hit.id);
    game.board=game.board.filter(word=>!game.selected.has(word));
    game.selected.clear();
    if (game.solved.length===4) setLine("win");
    else if (game.solved.length===3) setLine("finalGroup");
    else if (game.solved.length===2) setLine("twoGroups");
    else setLine(game.solved.length===1 ? "correct" : "anotherCorrect");
    renderGame();
    return;
  }
  const oneAway=game.groups.some(group=>!game.solved.includes(group.id)&&group.words.filter(word=>game.selected.has(word)).length===3);
  game.mistakes+=1;
  game.selected.clear();
  if (game.mistakes>=4) setLine("loss");
  else if (oneAway) setLine("oneAway");
  else if (game.mistakes>=2) setLine("severalFailed");
  else setLine("wrong");
  renderGame(true);
}
function groupRow(group) {
  return el("div", {class:"card conn-group"},
    el("span", {class:`pill sm ${group.color}`}, group.category),
    el("span", {class:"conn-group-words"}, group.words.join(" · ")));
}
function characterPanel() {
  const character=game.character;
  return el("div", {class:"conn-game-head"},
    el("div", {class:"conn-speaker"}, portrait(character, "conn-speaker-portrait"), el("span", {class:`pill sm ${colourFor(character)}`}, character.name)),
    el("div", {class:"bubble conn-bubble", role:"status", "aria-live":"polite"}, game.message));
}
function endPanel(won, unsolved) {
  return el("section", {class:"card conn-end"},
    el("h2", {}, won ? "All four found." : "That was the last mistake."),
    el("p", {class:"muted"}, won ? "The board has officially run out of places to hide." : "Here’s what the puzzle was doing."),
    won ? null : el("div", {class:"conn-reveal"}, ...unsolved.map(groupRow)),
    el("div", {class:"conn-actions"},
      el("button", {class:"btn sage", type:"button", onclick:()=>{setLine("replay");startGame(game.tier);}}, "Play another"),
      el("button", {class:"btn ghost", type:"button", onclick:renderPicker}, "Change character"),
      el("button", {class:"btn teal", type:"button", onclick:closeMode}, "Return home")));
}
function renderGame(shake=false) {
  const solvedGroups=game.solved.map(id=>game.groups.find(group=>group.id===id));
  const unsolvedGroups=game.groups.filter(group=>!game.solved.includes(group.id));
  const won=game.solved.length===4;
  const lost=game.mistakes>=4&&!won;
  const dots=[0,1,2,3].map(index=>el("span", {class:`conn-dot ${index<game.mistakes?"used":""}`, "aria-hidden":"true"}));
  const board=el("div", {class:`conn-board ${shake?"conn-shake":""}`, "aria-label":"Word board"},
    ...game.board.map(word=>el("button", {class:"tile conn-tile", type:"button", "aria-pressed":game.selected.has(word)?"true":"false", onclick:()=>chooseWord(word)}, word)));
  overlay.replaceChildren(shell(
    characterPanel(),
    el("div", {class:"conn-meta"},
      el("div", {class:"conn-meta-left"}, el("span", {class:`pill sm ${colourFor(game.character)}`}, CONNECTION_TIER_NAMES[game.tier]), el("span", {class:"pill sm"}, `${game.solved.length}/4 groups`)),
      el("div", {class:"conn-mistakes", "aria-label":`${Math.max(0,4-game.mistakes)} mistakes remaining`}, el("span", {}, "Mistakes"), ...dots)),
    el("div", {class:"conn-solved"}, ...solvedGroups.map(groupRow)),
    board,
    el("div", {class:"conn-actions"},
      el("button", {class:"btn ghost small", type:"button", disabled:won||lost||game.board.length<2, onclick:()=>{game.board=shuffleConnections(game.board);renderGame();}}, "Shuffle"),
      el("button", {class:"btn ghost small", type:"button", disabled:game.selected.size===0, onclick:()=>{game.selected.clear();renderGame();}}, "Deselect all"),
      el("button", {class:"btn small", type:"button", disabled:game.selected.size!==4, onclick:submitSelection}, "Submit")),
    won||lost ? endPanel(won,unsolvedGroups) : null));
}

function makeLauncher() {
  const cast=el("div", {class:"conn-launch-cast", "aria-hidden":"true"}, ...Object.values(ODD_ONE_IN_CHARACTERS).map(character=>el("span", {class:"standee conn-launch-standee", "data-name":character.name}, portrait(character,"",false))));
  return el("section", {class:"card mode-card start conn-launch", "data-mode":"connections", "aria-labelledby":"connectionsTitle"},
    el("div", {class:"mode-body"},
      cast,
      el("h2", {id:"connectionsTitle"}, "Odd One In"),
      el("p", {}, "Some words belong together."),
      el("p", {}, "Some are just being difficult."),
      el("p", {}, "Pick someone to make sense of it."),
      el("button", {class:"btn big go", type:"button", onclick:openMode}, "Choose your challenge")));
}
function mountLauncher() {
  installStyles();
  const grid=document.querySelector(".home-grid.start-grid");
  if (!grid || grid.querySelector('[data-mode="connections"]')) return;
  grid.append(makeLauncher());
}

const observer=new MutationObserver(mountLauncher);
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountLauncher,{once:true});
else mountLauncher();
