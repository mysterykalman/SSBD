// Hidden local gameplay log for Odd One In. Nothing from this module is rendered
// during play; /review reads the stored sessions for QA/review.

const KEY = 'ssbd.connections.gamelog.v1';
const KEEP = 80;
let current = null;
let lastHostSignature = '';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw?.v === 1 && Array.isArray(raw.games) ? raw : {v: 1, games: []};
  } catch { return {v: 1, games: []}; }
}

function save(data) {
  try {
    data.games = data.games.slice(-KEEP);
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

function id() {
  try { return crypto.randomUUID(); }
  catch { return `ooi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
}

function persist() {
  if (!current) return;
  const data = load();
  const index = data.games.findIndex(game => game.id === current.id);
  if (index >= 0) data.games[index] = current;
  else data.games.push(current);
  save(data);
}

function text(selector, root = document) {
  return root.querySelector(selector)?.textContent?.trim() || '';
}

function pressedWords() {
  return [...document.querySelectorAll('.conn-tile[aria-pressed="true"]')]
    .map(node => node.textContent.trim()).filter(Boolean);
}

function boardWords() {
  return [...document.querySelectorAll('.conn-tile')]
    .map(node => node.textContent.trim()).filter(Boolean);
}

function solvedGroups() {
  return [...document.querySelectorAll('.conn-solved .conn-group, .conn-end-groups .conn-group')].map(group => ({
    category: text('.conn-group-category', group),
    words: text('.conn-group-words', group).split('·').map(word => word.trim()).filter(Boolean)
  }));
}

function mistakesUsed() {
  return document.querySelectorAll('.conn-mistake.used').length;
}

function ensureSession() {
  const host = document.querySelector('.conn-host');
  if (!host || document.querySelector('.conn-picker')) return null;
  const character = text('.conn-host-name', host);
  const difficulty = text('.conn-host-difficulty', host);
  if (!character) return null;

  const signature = `${character}|${difficulty}|${boardWords().join('|')}`;
  if (current && !current.endedAt && lastHostSignature === signature) return current;

  if (current && !current.endedAt) {
    current.endedAt = new Date().toISOString();
    current.result = {abandoned: true};
    persist();
  }

  current = {
    id: id(),
    mode: 'odd-one-in',
    startedAt: new Date().toISOString(),
    endedAt: null,
    character,
    difficulty,
    initialBoard: boardWords(),
    guesses: [],
    solution: null,
    result: null
  };
  lastHostSignature = signature;
  persist();
  return current;
}

function recordGuess(words, beforeSolved, _beforeMistakes) {
  const session = ensureSession();
  if (!session || words.length !== 4) return;
  const guess = {number: session.guesses.length + 1, at: new Date().toISOString(), words, outcome: null};
  session.guesses.push(guess);
  persist();

  setTimeout(() => {
    if (!current || current.id !== session.id) return;
    const afterSolved = solvedGroups().length;
    const afterMistakes = mistakesUsed();
    guess.outcome = afterSolved > beforeSolved ? 'correct' : 'wrong';
    guess.oneAway = /one of those|one away|saboteur/i.test(text('.conn-bubble')) || undefined;
    guess.solvedCount = afterSolved;
    guess.mistakes = afterMistakes;
    persist();
    finishIfNeeded();
  }, 40);
}

function finishIfNeeded() {
  if (!current || current.endedAt) return;
  const end = document.querySelector('.conn-end');
  if (!end) return;
  const groups = solvedGroups();
  const heading = text('.conn-end h2', end);
  const won = /got all four/i.test(heading);
  current.endedAt = new Date().toISOString();
  current.solution = groups;
  current.result = {
    won,
    guesses: current.guesses.length,
    mistakes: Math.max(0, current.guesses.filter(g => g.outcome === 'wrong').length)
  };
  persist();
}

function abandonIfLeaving() {
  if (!current || current.endedAt) return;
  if (document.body.classList.contains('conn-mode-open')) return;
  current.endedAt = new Date().toISOString();
  current.result = {abandoned: true, guesses: current.guesses.length};
  persist();
  current = null;
  lastHostSignature = '';
}

document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const check = target.closest('.conn-check');
  if (check && !check.disabled) {
    recordGuess(pressedWords(), solvedGroups().length, mistakesUsed());
    return;
  }
  if (target.closest('.conn-tier')) setTimeout(ensureSession, 0);
  if (target.closest('[data-conn-nav="games"], .conn-end-actions')) setTimeout(abandonIfLeaving, 0);
}, true);

new MutationObserver(() => {
  ensureSession();
  finishIfNeeded();
  abandonIfLeaving();
}).observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});

window.addEventListener('pagehide', () => {
  if (current && !current.endedAt) {
    current.lastSeenAt = new Date().toISOString();
    persist();
  }
});
