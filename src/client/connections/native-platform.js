import {generateConnectionsGame, shuffleConnections} from "../../shared/connections/generator.js";
import {ODD_ONE_IN_CHARACTERS, oddOneInLine} from "./characters.js";

const STORAGE_KEY = "ssbd.connections.v3";
const GROUP_COLORS = ["yellow", "green", "teal", "purple"];
const STYLE_ID = "connectionsNativeStyles";

const styleText = `
/* Odd One In inherits the SSBD page shell. Only mode-specific layout/state lives here. */
body.conn-mode-open #app > :not(.conn-page){display:none!important}
.conn-page{display:grid;gap:22px;padding:8px 0 54px;color:var(--ink)}
.conn-mode-heading{display:grid;gap:7px;max-width:760px;margin-top:8px}
.conn-mode-heading .eyebrow{margin:0;color:var(--ink-soft);font-size:.76rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
.conn-mode-heading h1{font-size:clamp(2rem,5vw,3rem);line-height:1.03;margin:0;text-wrap:balance}
.conn-mode-heading p:last-child{max-width:660px;margin:0;color:var(--ink-soft);font-size:1rem;font-weight:800;line-height:1.45}
.conn-nav-btn{white-space:nowrap}

/* home launcher */
.conn-launch{display:flex;flex-direction:column;padding:0!important;overflow:hidden}
.conn-launch-stage{--wash:#f5e4c5;display:flex;align-items:flex-end;justify-content:space-evenly;gap:10px;height:200px;padding:0 20px;background:radial-gradient(90% 120% at 50% 100%,var(--wash),transparent 75%)}
.conn-launch-standee.standee{width:82px;height:100px;margin:0 0 26px;border-radius:44px 44px 16px 16px}
.conn-launch-standee>img{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;object-fit:cover;object-position:50% 0}
.conn-launch-standee::after{--felt-h:28px;width:82px;min-width:82px;max-width:82px;min-height:28px;bottom:-14px;padding:2px 6px 6px;font-size:.52rem;letter-spacing:.055em;overflow:visible;text-overflow:clip}
.conn-launch .mode-body{padding:20px 28px 28px}.conn-launch .start-copy{display:grid;gap:8px}.conn-launch .mode-actions{margin-top:auto;padding-top:12px}

/* picker */
.conn-picker{display:grid;gap:18px}
.conn-tiers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.conn-tier{position:relative;overflow:hidden;padding:0;display:grid;grid-template-columns:152px minmax(0,1fr);min-height:184px;text-align:left;transition:transform .14s ease,filter .14s ease;cursor:pointer}
.conn-tier:hover{transform:translateY(-3px);filter:brightness(1.015)}
.conn-tier:focus-visible{outline:4px solid var(--teal);outline-offset:4px}
.conn-tier-portrait{position:relative;min-height:184px;background:var(--cream);overflow:hidden;border-radius:24px 0 0 24px}
.conn-tier-portrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 15%}
.conn-tier-copy{padding:18px 20px;display:grid;align-content:center;gap:7px}
.conn-tier-name-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.conn-tier-name{font-size:1.34rem;font-weight:900;line-height:1.05}
.conn-tier-copy .difficulty{--felt-h:30px;font-size:.68rem;justify-self:start}
.conn-tier-copy .relationship{font-size:.96rem;font-weight:900;line-height:1.3}
.conn-tier-copy .picker{font-size:.9rem;color:var(--ink-soft);font-weight:800;line-height:1.34}

/* host */
.conn-host{display:grid;grid-template-columns:170px minmax(0,1fr);gap:22px;align-items:center;padding:22px 26px;overflow:visible}
.conn-host-profile{display:grid;justify-items:center;gap:8px;align-self:end}
.conn-host-standee.standee{width:112px;height:136px;margin-bottom:18px;border-radius:60px 60px 20px 20px}
.conn-host-standee>img{position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;object-fit:cover;object-position:50% 0}
.conn-host-meta{display:flex;align-items:center;justify-content:center;gap:7px;flex-wrap:wrap;text-align:center}
.conn-host-name{font-weight:900;font-size:1.1rem}
.conn-host-difficulty{--felt-h:28px;font-size:.62rem}
.conn-host-state{grid-column:1/-1;color:var(--ink-soft);font-size:.82rem;font-weight:800;text-align:center;margin-top:-2px}
.conn-host-talk{display:grid;gap:10px;align-content:center}
.conn-bubble{--felt-h:118px;min-height:94px;display:flex;align-items:center;font-size:1.02rem;line-height:1.4;text-align:left}

/* progress and play surface */
.conn-status{display:flex;align-items:center;justify-content:flex-end;gap:12px;min-height:42px}
.conn-mistakes{display:flex;align-items:center;gap:7px;font-weight:900;color:var(--ink-soft)}
.conn-mistake.badge{width:30px;height:30px;font-size:.78rem;transition:transform .15s ease,opacity .15s ease,filter .15s ease}
.conn-mistake.used{opacity:.35;transform:translateY(2px) scale(.86);filter:grayscale(.65)}
.conn-solved{display:grid;gap:10px}
.conn-group{display:grid;gap:5px;padding:14px 18px 16px;text-align:center;cursor:default}
.conn-group .pill{justify-self:center}.conn-group-category{font-weight:900}.conn-group-words{font-weight:900;font-size:.92rem;letter-spacing:.01em;color:var(--ink-soft)}
.conn-group-new{animation:connGroupIn .42s var(--ease-pop) both}
.conn-playmat{position:relative;display:grid;gap:16px;padding:24px;background:rgba(255,250,241,.58);border:2px dashed rgba(177,143,105,.42);box-shadow:inset 0 2px 14px rgba(91,62,38,.06);overflow:visible}
.conn-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}
.conn-tile{--felt-h:80px;width:100%;min-width:0;padding:11px 12px 19px;font-size:clamp(.75rem,2vw,1rem);line-height:1.08;border:0;cursor:pointer;transition:transform .15s ease,filter .15s ease,outline-color .15s ease;transform-origin:center}
.conn-tile:hover:not([aria-pressed=true]){transform:translateY(-2px);filter:brightness(1.035)}
.conn-tile[aria-pressed=true]{transform:translateY(-8px) rotate(-.45deg) scale(1.035);outline:4px solid var(--teal);outline-offset:2px;filter:brightness(1.06) saturate(1.1) drop-shadow(0 10px 8px rgba(65,42,25,.28))}
.conn-board.ready .conn-tile[aria-pressed=true]{outline-color:var(--orange);filter:brightness(1.07) saturate(1.16) drop-shadow(0 12px 9px rgba(65,42,25,.32))}
.conn-board-note{min-height:1.4em;text-align:center;color:var(--ink-soft);font-size:.88rem;font-weight:900}
.conn-actions{display:grid;grid-template-columns:1fr 1fr minmax(190px,1.35fr);gap:10px;align-items:stretch}
.conn-actions .btn{width:100%}.conn-check:not(:disabled){transform:translateY(-1px)}
.conn-check:disabled{opacity:.52}

/* end state */
.conn-end{display:grid;gap:18px;text-align:center;padding:28px}
.conn-end h2{font-size:clamp(1.8rem,4vw,2.5rem)}
.conn-end-host{display:grid;justify-items:center;gap:10px}
.conn-end .conn-host-standee.standee{width:132px;height:160px}
.conn-end-groups{display:grid;gap:9px;width:100%}
.conn-end-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.conn-end-actions .btn{min-width:150px}

.conn-rules-dialog{max-width:min(680px,calc(100% - 24px))}
.conn-rules-body{display:grid;gap:16px;padding:28px}
.conn-rules-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.conn-rules-head h2{font-size:1.8rem}
.conn-rule-list{display:grid;gap:14px}.conn-rule-list>div{display:grid;gap:3px}.conn-rule-list p{color:var(--ink-soft);line-height:1.45}

@keyframes conn-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@keyframes connGroupIn{0%{opacity:0;transform:translateY(12px) scale(.985)}65%{transform:translateY(-2px) scale(1.01)}100%{opacity:1;transform:none}}
.conn-shake{animation:conn-shake .22s linear 2}

@media(max-width:760px){
  .conn-tiers{grid-template-columns:1fr}
  .conn-tier{grid-template-columns:118px minmax(0,1fr);min-height:158px}.conn-tier-portrait{min-height:158px}.conn-tier-copy{padding:15px 16px}
  .conn-host{grid-template-columns:120px minmax(0,1fr);gap:14px;padding:18px}.conn-host-standee.standee{width:92px;height:112px}
  .conn-playmat{padding:16px}.conn-board{gap:7px}.conn-tile{--felt-h:70px;padding:9px 7px 16px;font-size:clamp(.68rem,2.8vw,.9rem)}
  .conn-actions{grid-template-columns:1fr 1fr}.conn-check{grid-column:1/-1;grid-row:1}.conn-actions .btn{min-width:0}
}
@media(max-width:520px){
  .conn-page{gap:16px}.conn-mode-heading{margin-top:0}.conn-mode-heading h1{font-size:2rem}
  .conn-host{grid-template-columns:86px minmax(0,1fr);gap:10px;padding:14px}.conn-host-standee.standee{width:72px;height:88px;margin-bottom:15px}.conn-host-meta{display:grid;gap:4px}.conn-host-name{font-size:.92rem}.conn-host-state{font-size:.72rem}.conn-bubble{--felt-h:102px;min-height:82px;font-size:.9rem}
  .conn-board{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.conn-tile{--felt-h:64px;font-size:.86rem}.conn-playmat{padding:12px}
  .conn-status{justify-content:center}.conn-mistakes>span:first-child{font-size:.82rem}
  .conn-launch-stage{height:172px;padding:0 10px;gap:7px}.conn-launch-standee.standee{width:66px;height:82px;margin-bottom:24px;border-radius:35px 35px 13px 13px}.conn-launch-standee::after{--felt-h:25px;width:68px;min-width:68px;max-width:68px;bottom:-12px;font-size:.44rem;padding-inline:4px}
}
@media(max-width:390px){.conn-tier{grid-template-columns:96px minmax(0,1fr)}.conn-tier-copy .picker{display:none}.conn-launch-stage{padding-inline:5px;gap:4px}.conn-launch-standee.standee{width:60px;height:76px}.conn-launch-standee::after{width:62px;min-width:62px;max-width:62px;font-size:.4rem;letter-spacing:.02em}}

/* Mobile gameplay: the four-column puzzle takes priority over page furniture.
   Picker, desktop layout and puzzle logic remain unchanged. */
@media(max-width:520px){
  .conn-page.conn-playing{gap:10px;padding:0 0 28px}
  .conn-playing .conn-mode-heading{display:none}
  .conn-playing .conn-host{grid-template-columns:64px minmax(0,1fr);gap:10px;padding:9px 11px;border-radius:18px;align-items:center}
  .conn-playing .conn-host-profile{align-self:center;gap:2px}
  .conn-playing .conn-host-standee.standee{width:52px;height:62px;margin-bottom:9px;border-radius:26px 26px 10px 10px}
  .conn-playing .conn-host-meta{display:flex;justify-content:center;gap:4px;flex-wrap:wrap}
  .conn-playing .conn-host-name{font-size:.76rem}
  .conn-playing .conn-host-difficulty{--felt-h:22px;font-size:.52rem}
  .conn-playing .conn-host-state{display:none}
  .conn-playing .conn-host-talk{min-width:0}
  .conn-playing .conn-bubble{--felt-h:65px;min-height:54px;padding:8px 12px;font-size:.82rem;line-height:1.25}
  .conn-playing .conn-status{min-height:27px;justify-content:center}
  .conn-playing .conn-mistakes{gap:6px}
  .conn-playing .conn-mistakes>span:first-child{font-size:.77rem}
  .conn-playing .conn-mistake.badge{width:23px;height:23px;font-size:.67rem}
  .conn-playing .conn-solved{gap:5px}
  .conn-playing .conn-group{padding:7px 10px 9px;gap:2px;border-radius:13px}
  .conn-playing .conn-group .pill{--felt-h:22px;font-size:.66rem}
  .conn-playing .conn-group-words{font-size:.72rem;line-height:1.2;overflow-wrap:anywhere}
  .conn-playing .conn-playmat{gap:9px;padding:9px;border-radius:17px}
  .conn-playing .conn-board{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
  .conn-playing .conn-tile{--felt-h:clamp(58px,17vw,72px);min-width:0;padding:6px 3px 12px;font-size:clamp(.61rem,2.55vw,.83rem);line-height:1.1;overflow-wrap:anywhere;hyphens:auto}
  .conn-playing .conn-tile[aria-pressed=true]{transform:none;outline:3px solid var(--teal);outline-offset:0;filter:brightness(1.07) saturate(1.12)}
  .conn-playing .conn-board.ready .conn-tile[aria-pressed=true]{outline-color:var(--orange)}
  .conn-playing .conn-board-note{display:none}
  .conn-playing .conn-actions{grid-template-columns:1fr 1fr 1.3fr;gap:6px}
  .conn-playing .conn-actions .btn{min-width:0;min-height:44px;padding:8px 4px;font-size:.78rem;line-height:1.12;white-space:normal}
  .conn-playing .conn-check{grid-column:auto;grid-row:auto}
}
@media(max-width:350px){
  .conn-playing .conn-playmat{padding:6px}
  .conn-playing .conn-board{gap:4px}
  .conn-playing .conn-tile{font-size:.61rem;padding-inline:2px}
  .conn-playing .conn-actions .btn{font-size:.72rem}
}
@media(max-height:700px) and (max-width:520px){
  .conn-playing .conn-host{padding-block:6px}
  .conn-playing .conn-playmat{gap:6px}
  .conn-playing .conn-tile{--felt-h:54px}
}
@media(prefers-reduced-motion:reduce){.conn-tier,.conn-tile,.conn-group-new,.conn-shake{animation:none!important;transition:none!important}}
`;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "style" && typeof value === "object") Object.assign(node.style, value);
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

let page = null;
let game = null;
let attempts = 0;
let hostTimer = null;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = el("style", {id: STYLE_ID});
  style.textContent = styleText;
  document.head.append(style);
}

function colourFor(character) { return character.accent || "orange"; }
function portrait(character, className = "", alt = true) {
  return el("img", {class: className, src: character.image, alt: alt ? character.name : "", "aria-hidden": alt ? null : "true", loading: "eager", draggable: "false"});
}
function standee(character, className = "", label = character.shortName || character.name) {
  return el("span", {class: `standee ${className}`.trim(), "data-name": label}, portrait(character, "", false));
}

function addModeNav() {
  const actions = document.querySelector(".top-actions");
  if (!actions || actions.querySelector("[data-conn-nav]")) return;
  const profile = document.getElementById("profileBtn");
  const games = el("button", {class: "btn small ghost conn-nav-btn", type: "button", "data-conn-nav": "games", onclick: closeMode}, el("span", {"aria-hidden": "true"}, "←"), " Games");
  const rules = el("button", {class: "btn small ghost conn-nav-btn", type: "button", "data-conn-nav": "rules", onclick: showRules}, el("span", {"aria-hidden": "true"}, "?"), " How to play");
  actions.insertBefore(games, profile || null);
  actions.insertBefore(rules, profile || null);
}
function removeModeNav() { document.querySelectorAll("[data-conn-nav]").forEach(node => node.remove()); }

function showRules() {
  let dialog = document.getElementById("connRulesDialog");
  if (!dialog) {
    dialog = el("dialog", {id: "connRulesDialog", class: "dialog conn-rules-dialog", "aria-labelledby": "connRulesTitle"});
    document.body.append(dialog);
  }
  dialog.replaceChildren(el("div", {class: "card conn-rules-body"},
    el("div", {class: "conn-rules-head"},
      el("div", {}, el("p", {class: "eyebrow"}, "HOW TO PLAY"), el("h2", {id: "connRulesTitle"}, "Odd One In")),
      el("button", {class: "dialog-close", type: "button", "aria-label": "Close rules", onclick: () => dialog.close()}, "×")),
    el("div", {class: "conn-rule-list"},
      el("div", {}, el("strong", {}, "Find four that belong together."), el("p", {}, "Pick four words that share a connection, then check your group.")),
      el("div", {}, el("strong", {}, "There are four groups."), el("p", {}, "Every word belongs to exactly one intended group. Some words will try very hard to make that unclear.")),
      el("div", {}, el("strong", {}, "Four mistakes and you’re out."), el("p", {}, "A near miss still costs a mistake, but your character will tell you when you were one word away.")),
      el("div", {}, el("strong", {}, "The character is part of the game."), el("p", {}, "Owen, Zoe, Martin and Professor Braine each react differently to what you do.")))));
  if (!dialog.open) dialog.showModal();
}

function pageHeading(title, copy) {
  return el("div", {class: "conn-mode-heading"}, el("p", {class: "eyebrow"}, "ODD ONE IN"), el("h1", {}, title), el("p", {}, copy));
}

function closeMode() {
  clearTimeout(hostTimer);
  hostTimer = null;
  page?.remove();
  page = null;
  game = null;
  attempts = 0;
  document.body.classList.remove("conn-mode-open");
  removeModeNav();
  document.querySelector('[data-mode="connections"] .go')?.focus();
  window.scrollTo({top: 0, behavior: "auto"});
}
function openMode() {
  if (page) return;
  installStyles();
  const app = document.getElementById("app");
  if (!app) return;
  document.body.classList.add("conn-mode-open");
  addModeNav();
  page = el("section", {class: "conn-page", "aria-label": "Odd One In"});
  app.append(page);
  renderPicker();
  window.scrollTo({top: 0, behavior: "auto"});
}

function characterButton(character) {
  return el("button", {class: "card conn-tier", type: "button", onclick: () => startGame(character.tier), "aria-label": `${character.name}, ${character.difficulty}`},
    el("span", {class: "conn-tier-portrait"}, portrait(character, "", false)),
    el("span", {class: "conn-tier-copy"},
      el("span", {class: "conn-tier-name-row"},
        el("strong", {class: "conn-tier-name"}, character.name),
        el("span", {class: `pill sm ${colourFor(character)} difficulty`}, character.difficulty)),
      el("span", {class: "relationship"}, character.relationship),
      el("span", {class: "picker"}, character.picker)));
}
function renderPicker() {
  clearTimeout(hostTimer);
  game = null;
  attempts = 0;
  page.classList.remove("conn-playing");
  page.replaceChildren(
    pageHeading("Who are we getting involved in this?", "Sixteen words. Four groups. Pick someone who thinks they can make sense of it."),
    el("div", {class: "conn-picker"}, el("div", {class: "conn-tiers"}, ...Object.values(ODD_ONE_IN_CHARACTERS).map(characterButton))));
  page.querySelector(".conn-tier")?.focus();
}

function setLine(event) { if (game) game.message = oddOneInLine(game.character.id, event); }
function scheduleObservation() {
  clearTimeout(hostTimer);
  hostTimer = setTimeout(() => {
    if (!game || attempts || game.selected.size || game.solved.length) return;
    setLine("observation");
    renderGame();
  }, 1700);
}
function startGame(tier) {
  const character = ODD_ONE_IN_CHARACTERS[tier] || ODD_ONE_IN_CHARACTERS[1];
  const memory = readMemory();
  try {
    const generated = generateConnectionsGame({tier, recentFamilyIds: memory.recentFamilies, usedSignatures: memory.signatures});
    memory.signatures.push(generated.signature);
    memory.recentFamilies.push(...generated.groups.map(group => group.familyId));
    writeMemory(memory);
    attempts = 0;
    game = {
      tier,
      character,
      groups: generated.groups.map((group, index) => ({...group, color: GROUP_COLORS[index]})),
      board: [...generated.board],
      selected: new Set(),
      solved: [],
      mistakes: 0,
      message: "",
      lastSolvedId: null
    };
    setLine("intro");
    renderGame();
    scheduleObservation();
  } catch (error) {
    page.replaceChildren(pageHeading("Odd One In", "The puzzle box is being difficult before we even begin."),
      el("section", {class: "card conn-end"}, el("h2", {}, "Couldn’t build a fresh board"), el("p", {class: "muted"}, error?.message || "Try another character."), el("div", {class: "conn-end-actions"}, el("button", {class: "btn ghost", type: "button", onclick: renderPicker}, "Choose someone else"))));
  }
}

function chooseWord(word) {
  if (!game || game.solved.length === 4 || game.mistakes >= 4) return;
  clearTimeout(hostTimer);
  const hadFour = game.selected.size === 4;
  if (game.selected.has(word)) game.selected.delete(word);
  else if (game.selected.size < 4) game.selected.add(word);
  if (game.selected.size === 4) setLine("fourSelected");
  else if (!attempts && game.selected.size && !hadFour) setLine("firstSelection");
  renderGame();
}

function submitSelection() {
  if (!game || game.selected.size !== 4) return;
  attempts += 1;
  const hit = game.groups.find(group => !game.solved.includes(group.id) && group.words.every(word => game.selected.has(word)));
  if (hit) {
    game.solved.push(hit.id);
    game.lastSolvedId = hit.id;
    game.board = game.board.filter(word => !game.selected.has(word));
    game.selected.clear();
    const count = game.solved.length;
    if (count === 4) setLine("win");
    else if (count === 3) setLine("correct3");
    else if (count === 2) setLine("correct2");
    else setLine("correct1");
    renderGame();
    game.lastSolvedId = null;
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

function groupRow(group, className = "") {
  return el("div", {class: `card conn-group ${className}`.trim()},
    el("span", {class: `pill sm ${group.color} conn-group-category`}, group.category),
    el("span", {class: "conn-group-words"}, group.words.join(" · ")));
}

function hostPanel() {
  const character = game.character;
  return el("section", {class: "card conn-host", "aria-label": `${character.name}, your Odd One In partner`},
    el("div", {class: "conn-host-profile"},
      standee(character, "conn-host-standee"),
      el("div", {class: "conn-host-meta"}, el("span", {class: "conn-host-name"}, character.name), el("span", {class: `pill sm ${colourFor(character)} conn-host-difficulty`}, character.difficulty)),
      el("p", {class: "conn-host-state"}, character.state)),
    el("div", {class: "conn-host-talk"}, el("div", {class: "bubble conn-bubble", role: "status", "aria-live": "polite", "aria-atomic": "true"}, game.message)));
}

function mistakeTokens() {
  return [0, 1, 2, 3].map(index => {
    const used = index < game.mistakes;
    return el("span", {class: `badge small conn-mistake ${used ? "used" : ""}`, "aria-hidden": "true"}, used ? "×" : "•");
  });
}

function activeStateMessage() {
  if (game.selected.size === 4) return "Four picked. Your character has opinions.";
  if (game.solved.length === 3) return "The last four have nowhere left to hide.";
  if (game.solved.length === 2) return "Halfway. The remaining words are getting nervous.";
  if (game.solved.length === 1) return "One down. Twelve words pretending they don’t know each other.";
  return "Nothing suspicious here. Obviously.";
}

function celebration() {
  const pieces = Array.from({length: 18}, (_, index) => el("i", {class: index % 3 === 0 ? "dot" : index % 3 === 1 ? "strip" : "", style: {left: `${5 + (index * 17) % 90}%`, "--dur": `${1.5 + (index % 5) * .14}s`, "--drift": `${(index % 2 ? 1 : -1) * (18 + index * 2)}px`, "--spin": `${360 + index * 31}deg`}}));
  return el("div", {class: "confetti", "aria-hidden": "true"}, ...pieces);
}

function endState(won) {
  const allGroups = game.groups;
  return el("section", {class: "card conn-end"},
    won ? celebration() : null,
    el("div", {class: "conn-end-host"}, standee(game.character, "conn-host-standee"), el("h2", {}, won ? "You got all four." : "The puzzle got the last word."), el("div", {class: "bubble conn-bubble", role: "status"}, game.message)),
    el("div", {class: "conn-end-groups"}, ...allGroups.map(group => groupRow(group))),
    el("div", {class: "conn-end-actions"},
      el("button", {class: "btn primary big", type: "button", onclick: () => { setLine("replay"); startGame(game.tier); }}, won ? "Play another" : "Try another"),
      el("button", {class: "btn ghost big", type: "button", onclick: renderPicker}, "Choose someone else"),
      el("button", {class: "btn ghost big", type: "button", onclick: closeMode}, "Games")));
}

function renderGame(shake = false) {
  if (!game) return;
  const solvedGroups = game.solved.map(id => game.groups.find(group => group.id === id)).filter(Boolean);
  const won = game.solved.length === 4;
  const lost = game.mistakes >= 4 && !won;

  if (won || lost) {
    page.classList.remove("conn-playing");
    page.replaceChildren(pageHeading("Odd One In", won ? "Four groups. No loose ends." : "Four mistakes. Time to see what the puzzle was hiding."), hostPanel(), endState(won));
    window.scrollTo({top: 0, behavior: "smooth"});
    return;
  }

  page.classList.add("conn-playing");
  const board = el("div", {class: `conn-board ${game.selected.size === 4 ? "ready" : ""} ${shake ? "conn-shake" : ""}`, "aria-label": "Word board"},
    ...game.board.map(word => el("button", {class: "tile conn-tile", type: "button", "aria-pressed": game.selected.has(word) ? "true" : "false", onclick: () => chooseWord(word)}, word)));

  page.replaceChildren(
    pageHeading("Odd One In", "Pick four words that belong together. Your chosen expert will provide completely unsolicited support."),
    hostPanel(),
    el("div", {class: "conn-status"}, el("div", {class: "conn-mistakes", "aria-label": `${Math.max(0, 4 - game.mistakes)} mistakes remaining`}, el("span", {}, "Mistakes"), ...mistakeTokens())),
    el("div", {class: "conn-solved", "aria-label": "Solved groups"}, ...solvedGroups.map(group => groupRow(group, group.id === game.lastSolvedId ? "conn-group-new" : ""))),
    el("section", {class: "card conn-playmat", "aria-label": "Active word board"},
      board,
      el("p", {class: "conn-board-note"}, activeStateMessage()),
      el("div", {class: "conn-actions"},
        el("button", {class: "btn ghost small", type: "button", disabled: game.board.length < 2, onclick: () => { game.board = shuffleConnections(game.board); renderGame(); }}, "Shuffle"),
        el("button", {class: "btn ghost small", type: "button", disabled: game.selected.size === 0, onclick: () => { game.selected.clear(); setLine("observation"); renderGame(); }}, "Clear picks"),
        el("button", {class: "btn primary big conn-check", type: "button", disabled: game.selected.size !== 4, onclick: submitSelection}, "Check these four"))));
}

function makeLauncher() {
  const stage = el("div", {class: "mode-stage conn-launch-stage", "aria-hidden": "true"}, ...Object.values(ODD_ONE_IN_CHARACTERS).map(character => standee(character, "conn-launch-standee", character.shortName)));
  return el("section", {class: "card mode-card start conn-launch", "data-mode": "connections", "aria-labelledby": "connectionsTitle"},
    stage,
    el("div", {class: "mode-body"},
      el("h2", {id: "connectionsTitle"}, "Odd One In"),
      el("div", {class: "start-copy"},
        el("p", {}, "Some words belong together."),
        el("p", {}, "Some are just being difficult."),
        el("p", {}, "Pick a challenge and sort out the troublemaker.")),
      el("div", {class: "mode-actions"}, el("button", {class: "btn big go", type: "button", onclick: openMode}, "Choose your challenge"))));
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
