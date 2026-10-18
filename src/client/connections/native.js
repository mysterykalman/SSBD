import {CONNECTION_TIER_NAMES, generateConnectionsGame, shuffleConnections} from "../../shared/connections/generator.js";

const STORAGE_KEY = "ssbd.connections.v1";
const GROUP_COLORS = ["yellow", "green", "blue", "purple"];

const styleText = `
.conn-launch{display:grid;gap:10px}.conn-launch .conn-mini{font-size:.86rem;opacity:.72}.conn-overlay{position:fixed;inset:0;z-index:10000;background:#fff4df;color:#241f1a;overflow:auto;font-family:Nunito,system-ui,sans-serif}.conn-shell{width:min(760px,calc(100% - 24px));margin:0 auto;padding:18px 0 38px}.conn-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.conn-title{font-weight:900;font-size:clamp(1.55rem,5vw,2.35rem);line-height:1;margin:0}.conn-close,.conn-btn{font:inherit;font-weight:800;border:2px solid #2e2923;background:#fffaf0;color:#2e2923;border-radius:999px;padding:10px 16px;cursor:pointer}.conn-close{width:44px;height:44px;padding:0;font-size:24px}.conn-btn:disabled{opacity:.38;cursor:not-allowed}.conn-btn.primary{background:#2e2923;color:#fffaf0}.conn-intro{text-align:center;padding:18px 6px 10px}.conn-intro h2{font-size:clamp(1.5rem,5vw,2.2rem);margin:0 0 8px}.conn-intro p{margin:0 auto 22px;max-width:560px;font-weight:700;line-height:1.45}.conn-tiers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.conn-tier{min-height:112px;border:0;border-radius:24px;padding:16px;text-align:left;font:inherit;cursor:pointer;background:#f3e4c5;box-shadow:0 4px 0 rgba(61,49,35,.16)}.conn-tier strong{display:block;font-size:1.18rem;font-weight:900;margin-bottom:5px}.conn-tier span{font-weight:700;opacity:.75;line-height:1.3}.conn-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 14px;font-weight:800}.conn-mistakes{display:flex;align-items:center;gap:6px}.conn-dot{width:12px;height:12px;border-radius:50%;background:#3b352e;display:inline-block}.conn-dot.used{opacity:.18}.conn-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.conn-tile{aspect-ratio:1.5/1;min-height:64px;border:0;border-radius:16px;background:#eee5d4;color:#29241f;font:inherit;font-weight:900;font-size:clamp(.72rem,2.7vw,1rem);line-height:1.05;padding:8px 5px;cursor:pointer;overflow-wrap:anywhere;box-shadow:0 2px 0 rgba(61,49,35,.12)}.conn-tile[aria-pressed=true]{background:#4b453e;color:#fffaf0;transform:translateY(-1px)}.conn-solved{display:grid;gap:8px;margin-bottom:8px}.conn-group{border-radius:16px;padding:14px 10px;text-align:center;color:#302a23}.conn-group strong{display:block;font-weight:900;font-size:.98rem;margin-bottom:4px}.conn-group span{display:block;font-weight:800;font-size:.85rem;letter-spacing:.01em}.conn-group.yellow{background:#f5d96f}.conn-group.green{background:#a8c98b}.conn-group.blue{background:#91b8d8}.conn-group.purple{background:#b29bc7}.conn-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:18px 0 8px}.conn-message{min-height:30px;text-align:center;font-weight:900;margin:10px 0 2px}.conn-end{text-align:center;margin-top:18px;padding:20px;border-radius:24px;background:#f3e4c5}.conn-end h2{margin:0 0 6px;font-size:1.55rem}.conn-end p{font-weight:700;margin:0 0 15px}.conn-reveal{margin-top:12px;display:grid;gap:8px}@keyframes conn-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}.conn-shake{animation:conn-shake .22s linear 2}@media(max-width:560px){.conn-shell{width:min(100% - 14px,760px);padding-top:10px}.conn-board{gap:6px}.conn-tile{min-height:58px;border-radius:13px;padding:6px 3px}.conn-tiers{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.conn-tile,.conn-shake{animation:none!important;transition:none!important}}
`;

function element(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat()) if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}

function readMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      recentFamilies: Array.isArray(parsed.recentFamilies) ? parsed.recentFamilies.slice(-32) : [],
      signatures: Array.isArray(parsed.signatures) ? parsed.signatures.slice(-500) : []
    };
  } catch {
    return {recentFamilies: [], signatures: []};
  }
}

function writeMemory(memory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    recentFamilies: memory.recentFamilies.slice(-32),
    signatures: memory.signatures.slice(-500)
  }));
}

let overlay = null;
let game = null;

function installStyles() {
  if (document.getElementById("connectionsNativeStyles")) return;
  const style = element("style", {id: "connectionsNativeStyles"});
  style.textContent = styleText;
  document.head.append(style);
}

function shell(...content) {
  return element("div", {class: "conn-shell"},
    element("div", {class: "conn-top"},
      element("h1", {class: "conn-title"}, "Connections"),
      element("button", {class: "conn-close", type: "button", "aria-label": "Close Connections", onclick: closeMode}, "×")),
    ...content);
}

function closeMode() {
  overlay?.remove();
  overlay = null;
  game = null;
  document.body.style.overflow = "";
}

function openMode() {
  if (overlay) return;
  document.body.style.overflow = "hidden";
  overlay = element("div", {class: "conn-overlay", role: "dialog", "aria-modal": "true", "aria-label": "Connections game"});
  document.body.append(overlay);
  renderPicker();
}

function tierButton(tier, copy) {
  return element("button", {class: "conn-tier", type: "button", onclick: () => startGame(tier)},
    element("strong", {}, CONNECTION_TIER_NAMES[tier]),
    element("span", {}, copy));
}

function renderPicker() {
  overlay.replaceChildren(shell(
    element("section", {class: "conn-intro"},
      element("h2", {}, "Choose a difficulty"),
      element("p", {}, "Find four groups of four. Each level changes the mix of clues, overlap and wordplay."),
      element("div", {class: "conn-tiers"},
        tierButton(1, "A friendly start with mostly direct categories."),
        tierButton(2, "More overlap, with a harder group mixed in."),
        tierButton(3, "A real puzzle: phrases, misdirection and wordplay."),
        tierButton(4, "The sharp end. Hard clues and lateral connections.")))));
  overlay.querySelector(".conn-tier")?.focus();
}

function startGame(tier) {
  const memory = readMemory();
  try {
    const generated = generateConnectionsGame({tier, recentFamilyIds: memory.recentFamilies, usedSignatures: memory.signatures});
    memory.signatures.push(generated.signature);
    memory.recentFamilies.push(...generated.groups.map(group => group.familyId));
    writeMemory(memory);
    game = {
      tier,
      signature: generated.signature,
      groups: generated.groups.map((group, index) => ({...group, color: GROUP_COLORS[index]})),
      board: [...generated.board],
      selected: new Set(),
      solved: [],
      mistakes: 0,
      message: ""
    };
    renderGame();
  } catch (error) {
    overlay.replaceChildren(shell(element("section", {class: "conn-end"},
      element("h2", {}, "Couldn’t build a fresh board"),
      element("p", {}, error?.message || "Try another difficulty."),
      element("button", {class: "conn-btn", type: "button", onclick: renderPicker}, "Back"))));
  }
}

function chooseWord(word) {
  if (!game || game.solved.length === 4 || game.mistakes >= 4) return;
  if (game.selected.has(word)) game.selected.delete(word);
  else if (game.selected.size < 4) game.selected.add(word);
  game.message = "";
  renderGame();
}

function submitSelection() {
  if (!game || game.selected.size !== 4) return;
  const hit = game.groups.find(group => !game.solved.includes(group.id) && group.words.every(word => game.selected.has(word)));

  if (hit) {
    game.solved.push(hit.id);
    game.board = game.board.filter(word => !game.selected.has(word));
    game.selected.clear();
    game.message = game.solved.length === 4 ? "You got all four." : "That’s one.";
    renderGame();
    return;
  }

  const oneAway = game.groups.some(group => !game.solved.includes(group.id) && group.words.filter(word => game.selected.has(word)).length === 3);
  game.mistakes += 1;
  game.selected.clear();
  game.message = oneAway ? "One away." : "Not quite.";
  renderGame(true);
}

function groupRow(group) {
  return element("div", {class: `conn-group ${group.color}`},
    element("strong", {}, group.category),
    element("span", {}, group.words.join(", ")));
}

function endPanel(won, unsolved) {
  return element("section", {class: "conn-end"},
    element("h2", {}, won ? "Nicely done." : "That was the last mistake."),
    element("p", {}, won ? "Four groups, sorted." : "Here’s what was hiding in the board."),
    won ? null : element("div", {class: "conn-reveal"}, ...unsolved.map(groupRow)),
    element("div", {class: "conn-actions"},
      element("button", {class: "conn-btn primary", type: "button", onclick: () => startGame(game.tier)}, "Play another"),
      element("button", {class: "conn-btn", type: "button", onclick: renderPicker}, "Change difficulty"),
      element("button", {class: "conn-btn", type: "button", onclick: closeMode}, "Return home")));
}

function renderGame(shake = false) {
  const solvedGroups = game.solved.map(id => game.groups.find(group => group.id === id));
  const unsolvedGroups = game.groups.filter(group => !game.solved.includes(group.id));
  const won = game.solved.length === 4;
  const lost = game.mistakes >= 4 && !won;

  const mistakeDots = [0, 1, 2, 3].map(index => element("span", {class: `conn-dot ${index < game.mistakes ? "used" : ""}`, "aria-hidden": "true"}));
  const board = element("div", {class: `conn-board ${shake ? "conn-shake" : ""}`, "aria-label": "Word board"},
    ...game.board.map(word => element("button", {
      class: "conn-tile",
      type: "button",
      "aria-pressed": game.selected.has(word) ? "true" : "false",
      onclick: () => chooseWord(word)
    }, word)));

  overlay.replaceChildren(shell(
    element("div", {class: "conn-meta"},
      element("span", {}, CONNECTION_TIER_NAMES[game.tier]),
      element("div", {class: "conn-mistakes", "aria-label": `${Math.max(0, 4 - game.mistakes)} mistakes remaining`}, element("span", {}, "Mistakes"), ...mistakeDots)),
    element("div", {class: "conn-solved"}, ...solvedGroups.map(groupRow)),
    board,
    element("div", {class: "conn-message", role: "status", "aria-live": "polite"}, game.message),
    element("div", {class: "conn-actions"},
      element("button", {class: "conn-btn", type: "button", disabled: won || lost || game.board.length < 2, onclick: () => {game.board = shuffleConnections(game.board); renderGame();}}, "Shuffle"),
      element("button", {class: "conn-btn", type: "button", disabled: game.selected.size === 0, onclick: () => {game.selected.clear(); renderGame();}}, "Deselect all"),
      element("button", {class: "conn-btn primary", type: "button", disabled: game.selected.size !== 4, onclick: submitSelection}, "Submit")),
    won || lost ? endPanel(won, unsolvedGroups) : null));
}

function makeLauncher() {
  return element("section", {class: "card mode-card start conn-launch", "data-mode": "connections", "aria-labelledby": "connectionsTitle"},
    element("div", {class: "mode-body"},
      element("h2", {id: "connectionsTitle"}, "Connections"),
      element("p", {}, "Sort 16 words into four hidden groups."),
      element("p", {class: "conn-mini"}, "Four difficulty levels. Fresh boards from the reusable puzzle library."),
      element("button", {class: "btn big", type: "button", onclick: openMode}, "Play")));
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
