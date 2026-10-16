import {CONNECTION_TIER_NAMES, generateConnectionsGame, shuffleConnections} from "../../shared/connections/generator.js";
import {ODD_ONE_IN_CHARACTERS, oddOneInLine} from "./characters.js";

const STORAGE_KEY = "ssbd.connections.v2";
const GROUP_COLORS = ["yellow", "green", "blue", "purple"];

const styleText = `
.conn-launch{display:grid;gap:12px}.conn-launch .conn-mini{font-size:.86rem;color:var(--ink-soft)}
.conn-overlay{position:fixed;inset:0;z-index:10000;background:var(--grain),radial-gradient(900px 420px at 20% -10%,#fffaf2,transparent 60%),var(--page);color:var(--ink);overflow:auto;font-family:var(--font)}
.conn-shell{width:min(900px,calc(100% - 28px));margin:0 auto;padding:18px 0 44px}
.conn-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.conn-title-wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.conn-title{font-weight:900;font-size:clamp(1.7rem,5vw,2.55rem);line-height:1;margin:0}.conn-subtitle{font-weight:800;color:var(--ink-soft);font-size:.92rem}
.conn-intro{text-align:center;display:grid;gap:10px;padding:14px 4px 6px}.conn-intro h2{font-size:clamp(1.55rem,5vw,2.25rem)}.conn-intro>p{max-width:640px;margin:0 auto;color:var(--ink-soft);font-weight:800}
.conn-tiers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:12px}.conn-tier{padding:16px;display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;text-align:left;min-height:150px;transition:transform .12s ease}.conn-tier:hover{transform:translateY(-2px)}
.conn-character-patch{--felt-h:72px;min-width:72px;padding-inline:18px;font-size:1.45rem}.conn-character-patch.owen{color:var(--green-deep)}.conn-character-patch.zoe{color:var(--teal-deep)}.conn-character-patch.martin{color:var(--orange-deep)}.conn-character-patch.braine{color:var(--purple-deep)}
.conn-tier-copy{display:grid;gap:5px}.conn-tier-copy strong{font-size:1.18rem;font-weight:900}.conn-tier-copy .difficulty{font-size:.76rem;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-soft);font-weight:900}.conn-tier-copy span:last-child{font-size:.9rem;color:var(--ink-soft);font-weight:800;line-height:1.35}
.conn-game-head{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:end;margin-bottom:10px}.conn-speaker{display:grid;gap:8px;justify-items:center}.conn-speaker .pill{white-space:nowrap}.conn-bubble{--felt-h:104px;min-height:82px;display:flex;align-items:center;font-size:1rem;text-align:left}.conn-bubble strong{font-weight:900}
.conn-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 12px;flex-wrap:wrap}.conn-meta-left{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.conn-mistakes{display:flex;align-items:center;gap:7px;font-weight:900}.conn-dot{width:13px;height:13px;border-radius:50%;background:var(--coral);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 1px 1px rgba(80,40,20,.18)}.conn-dot.used{opacity:.18}
.conn-solved{display:grid;gap:9px;margin-bottom:10px}.conn-group{display:grid;gap:6px;padding:10px 12px 12px;text-align:center}.conn-group .pill{justify-self:center}.conn-group-words{font-weight:900;font-size:.9rem;letter-spacing:.01em}
.conn-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.conn-tile{--felt-h:78px;width:100%;min-width:0;padding:10px 12px 18px;font-size:clamp(.72rem,2.15vw,1rem);line-height:1.05;border:0;cursor:pointer;transition:transform .12s ease,filter .12s ease}.conn-tile:hover{transform:translateY(-1px);filter:brightness(1.03)}.conn-tile[aria-pressed=true]{transform:translateY(2px) scale(.985)}
.conn-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin:16px 0 6px}.conn-actions .btn{min-width:130px}.conn-message{min-height:28px;text-align:center;font-weight:900;margin:8px 0 0;color:var(--ink-soft)}
.conn-end{display:grid;gap:12px;text-align:center;margin-top:18px;padding:20px}.conn-end .conn-actions{margin-top:4px}.conn-reveal{display:grid;gap:8px;margin-top:4px}
.conn-launch-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:2px}
@keyframes conn-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}.conn-shake{animation:conn-shake .22s linear 2}
@media(max-width:680px){.conn-shell{width:min(100% - 14px,900px);padding-top:10px}.conn-tiers{grid-template-columns:1fr}.conn-board{gap:6px}.conn-tile{--felt-h:68px;padding:8px 6px 16px;font-size:clamp(.67rem,3vw,.9rem)}.conn-game-head{grid-template-columns:1fr}.conn-speaker{grid-template-columns:auto auto;justify-content:start;align-items:center}.conn-character-patch{--felt-h:58px;min-width:58px}.conn-bubble{--felt-h:96px}.conn-actions .btn{min-width:0}}
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
    return {
      recentFamilies: Array.isArray(value.recentFamilies) ? value.recentFamilies.slice(-32) : [],
      signatures: Array.isArray(value.signatures) ? value.signatures.slice(-500) : []
    };
  } catch { return {recentFamilies: [], signatures: []}; }
}
function writeMemory(memory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({recentFamilies: memory.recentFamilies.slice(-32), signatures: memory.signatures.slice(-500)}));
}

let overlay = null;
let game = null;
let attempts = 0;

function installStyles() {
  if (document.getElementById("connectionsNativeStyles")) return;
  const style = el("style", {id: "connectionsNativeStyles"});
  style.textContent = styleText;
  document.head.append(style);
}
function closeMode() { overlay?.remove(); overlay = null; game = null; attempts = 0; document.body.style.overflow = ""; }
function shell(...content) {
  return el("div", {class: "conn-shell"},
    el("div", {class: "conn-top"},
      el("div", {class: "conn-title-wrap"}, el("h1", {class: "conn-title"}, "Odd One In"), el("span", {class: "pill sm orange"}, "16 words · 4 groups")),
      el("button", {class: "dialog-close", type: "button", "aria-label": "Close Odd One In", onclick: closeMode}, "×")),
    ...content);
}
function openMode() {
  if (overlay) return;
  document.body.style.overflow = "hidden";
  overlay = el("div", {class: "conn-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Odd One In game"});
  document.body.append(overlay);
  renderPicker();
}

function patchFor(character) {
  const colourClass = character.id === "owen" ? "green" : character.id === "zoe" ? "teal" : character.id === "martin" ? "orange" : "purple";
  return el("span", {class: `pill conn-character-patch ${colourClass} ${character.id}`, "aria-hidden": "true"}, character.mark);
}
function characterButton(character) {
  return el("button", {class: "card conn-tier", type: "button", onclick: () => startGame(character.tier)},
    patchFor(character),
    el("span", {class: "conn-tier-copy"},
      el("span", {class: "difficulty"}, CONNECTION_TIER_NAMES[character.tier]),
      el("strong", {}, character.name),
      el("span", {}, character.picker)));
}
function renderPicker() {
  overlay.replaceChildren(shell(
    el("section", {class: "conn-intro"},
      el("h2", {}, "Who do you want in your corner?"),
      el("p", {}, "Sort sixteen words into four groups. Easy enough. Probably. The puzzle changes with your company."),
      el("div", {class: "conn-tiers"}, ...Object.values(ODD_ONE_IN_CHARACTERS).map(characterButton)))));
  overlay.querySelector(".conn-tier")?.focus();
}

function setLine(event, context = {}) {
  if (!game) return;
  game.message = oddOneInLine(game.character.id, event, context);
}
function startGame(tier) {
  const character = ODD_ONE_IN_CHARACTERS[tier];
  const memory = readMemory();
  try {
    const generated = generateConnectionsGame({tier, recentFamilyIds: memory.recentFamilies, usedSignatures: memory.signatures});
    memory.signatures.push(generated.signature);
    memory.recentFamilies.push(...generated.groups.map(group => group.familyId));
    writeMemory(memory);
    attempts = 0;
    game = {
      tier, character,
      groups: generated.groups.map((group, index) => ({...group, color: GROUP_COLORS[index]})),
      board: [...generated.board], selected: new Set(), solved: [], mistakes: 0, message: ""
    };
    setLine("intro");
    renderGame();
  } catch (error) {
    overlay.replaceChildren(shell(el("section", {class: "card conn-end"},
      el("h2", {}, "Couldn’t build a fresh board"),
      el("p", {class: "muted"}, error?.message || "Try another difficulty."),
      el("div", {class: "conn-actions"}, el("button", {class: "btn ghost", type: "button", onclick: renderPicker}, "Back")))));
  }
}
function chooseWord(word) {
  if (!game || game.solved.length === 4 || game.mistakes >= 4) return;
  if (game.selected.has(word)) game.selected.delete(word);
  else if (game.selected.size < 4) game.selected.add(word);
  if (game.selected.size === 4 && attempts === 0) setLine("firstSelection");
  renderGame();
}
function submitSelection() {
  if (!game || game.selected.size !== 4) return;
  attempts += 1;
  const hit = game.groups.find(group => !game.solved.includes(group.id) && group.words.every(word => game.selected.has(word)));
  if (hit) {
    game.solved.push(hit.id);
    game.board = game.board.filter(word => !game.selected.has(word));
    game.selected.clear();
    if (game.solved.length === 4) setLine("win", {attempts});
    else if (game.solved.length === 3) setLine("finalGroup");
    else if (game.solved.length === 2) setLine("twoGroups");
    else setLine(game.solved.length === 1 ? "correct" : "anotherCorrect");
    renderGame();
    return;
  }
  const oneAway = game.groups.some(group => !game.solved.includes(group.id) && group.words.filter(word => game.selected.has(word)).length === 3);
  game.mistakes += 1;
  game.selected.clear();
  if (game.mistakes >= 4) setLine("loss");
  else if (oneAway) setLine("oneAway");
  else if (game.mistakes >= 2) setLine("severalFailed");
  else setLine("wrong");
  renderGame(true);
}
function groupRow(group) {
  return el("div", {class: "card conn-group"},
    el("span", {class: `pill sm ${group.color}`}, group.category),
    el("span", {class: "conn-group-words"}, group.words.join(" · ")));
}
function characterPanel() {
  const character = game.character;
  const colourClass = character.id === "owen" ? "green" : character.id === "zoe" ? "teal" : character.id === "martin" ? "orange" : "purple";
  return el("div", {class: "conn-game-head"},
    el("div", {class: "conn-speaker"}, patchFor(character), el("span", {class: `pill sm ${colourClass}`}, character.name)),
    el("div", {class: "bubble conn-bubble", role: "status", "aria-live": "polite"}, game.message));
}
function endPanel(won, unsolved) {
  return el("section", {class: "card conn-end"},
    el("h2", {}, won ? "All four found." : "That was the last mistake."),
    el("p", {class: "muted"}, won ? "The board has officially run out of places to hide." : "Here’s what the puzzle was doing."),
    won ? null : el("div", {class: "conn-reveal"}, ...unsolved.map(groupRow)),
    el("div", {class: "conn-actions"},
      el("button", {class: "btn sage", type: "button", onclick: () => startGame(game.tier)}, "Play another"),
      el("button", {class: "btn ghost", type: "button", onclick: renderPicker}, "Change character"),
      el("button", {class: "btn teal", type: "button", onclick: closeMode}, "Return home")));
}
function renderGame(shake = false) {
  const solvedGroups = game.solved.map(id => game.groups.find(group => group.id === id));
  const unsolvedGroups = game.groups.filter(group => !game.solved.includes(group.id));
  const won = game.solved.length === 4;
  const lost = game.mistakes >= 4 && !won;
  const dots = [0,1,2,3].map(index => el("span", {class: `conn-dot ${index < game.mistakes ? "used" : ""}`, "aria-hidden": "true"}));
  const board = el("div", {class: `conn-board ${shake ? "conn-shake" : ""}`, "aria-label": "Word board"},
    ...game.board.map(word => el("button", {class: "tile conn-tile", type: "button", "aria-pressed": game.selected.has(word) ? "true" : "false", onclick: () => chooseWord(word)}, word)));
  overlay.replaceChildren(shell(
    characterPanel(),
    el("div", {class: "conn-meta"},
      el("div", {class: "conn-meta-left"}, el("span", {class: "pill sm orange"}, CONNECTION_TIER_NAMES[game.tier]), el("span", {class: "pill sm"}, `${game.solved.length}/4 groups`)),
      el("div", {class: "conn-mistakes", "aria-label": `${Math.max(0, 4 - game.mistakes)} mistakes remaining`}, el("span", {}, "Mistakes"), ...dots)),
    el("div", {class: "conn-solved"}, ...solvedGroups.map(groupRow)),
    board,
    el("div", {class: "conn-actions"},
      el("button", {class: "btn ghost small", type: "button", disabled: won || lost || game.board.length < 2, onclick: () => {game.board = shuffleConnections(game.board); renderGame();}}, "Shuffle"),
      el("button", {class: "btn ghost small", type: "button", disabled: game.selected.size === 0, onclick: () => {game.selected.clear(); renderGame();}}, "Deselect all"),
      el("button", {class: "btn small", type: "button", disabled: game.selected.size !== 4, onclick: submitSelection}, "Submit")),
    won || lost ? endPanel(won, unsolvedGroups) : null));
}

function makeLauncher() {
  return el("section", {class: "card mode-card start conn-launch", "data-mode": "connections", "aria-labelledby": "connectionsTitle"},
    el("div", {class: "mode-body"},
      el("div", {class: "conn-launch-badges"}, el("span", {class: "pill sm orange"}, "NEW"), el("span", {class: "pill sm"}, "4 characters")),
      el("h2", {id: "connectionsTitle"}, "Odd One In"),
      el("p", {}, "Sort sixteen words into four groups. Easy enough. Probably."),
      el("p", {class: "conn-mini"}, "Owen helps. Zoe teases. Martin competes. Professor Braine takes notes."),
      el("button", {class: "btn big go", type: "button", onclick: openMode}, "Choose your challenge")));
}
function mountLauncher() {
  installStyles();
  const grid = document.querySelector(".home-grid.start-grid");
  if (!grid || grid.querySelector('[data-mode="connections"]')) return;
  grid.append(makeLauncher());
}

const observer = new MutationObserver(mountLauncher);
observer.observe(document.documentElement, {childList: true, subtree: true});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountLauncher, {once: true});
else mountLauncher();
