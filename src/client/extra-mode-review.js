// Adds locally captured Don’t Tell Me and Odd One In sessions to /review only.
// These logs never render during gameplay.

const MOM_KEY = 'ssbd.mom.gamelog.v1';
const OOI_KEY = 'ssbd.connections.gamelog.v1';
const SECTION_ID = 'extraModeReview';

function read(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || 'null');
    return raw?.v === 1 && Array.isArray(raw.games) ? raw.games : [];
  } catch { return []; }
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function when(value) {
  try { return new Date(value).toLocaleString(); } catch { return String(value || ''); }
}

function empty(text) {
  return el('p', {class: 'rv-sub'}, text);
}

function momGame(game) {
  const result = game.result || {};
  const outcome = result.abandoned ? 'abandoned' : result.correct === true ? 'Pam guessed it' : result.correct === false ? 'Pam was stumped' : 'in progress';
  const summary = `${when(game.startedAt)} · ${outcome}${game.secretWord ? ` · answer: ${game.secretWord}` : ''}${Number.isFinite(result.score) ? ` · ${result.score} pts` : ''}`;
  const details = el('details', {class: 'card rv-game extra-review-game'}, el('summary', {}, summary));
  const body = el('div', {class: 'extra-review-body'});
  if (game.runtime) body.append(el('p', {class: 'rv-auto'}, `Runtime: ${typeof game.runtime === 'string' ? game.runtime : JSON.stringify(game.runtime)}`));
  const events = Array.isArray(game.events) ? game.events : [];
  if (!events.length) body.append(empty('No recorded questions yet.'));
  else {
    const table = el('table', {class: 'rv-rounds extra-review-table'},
      el('thead', {}, el('tr', {}, ...['Step', 'Pam', 'Answer', 'Confidence / notes'].map(label => el('th', {scope: 'col'}, label)))));
    const tbody = el('tbody');
    for (const event of events) {
      const pam = event.kind === 'guess' || event.kind === 'result' ? (event.guess || event.text || event.kind) : (event.text || event.kind);
      const answer = event.answer ?? (event.correct === true ? 'Correct' : event.correct === false ? 'Wrong' : '—');
      const notes = [event.confidence != null ? `confidence ${event.confidence}` : '', event.gain != null ? `gain ${event.gain}` : '', event.reason || ''].filter(Boolean).join(' · ') || '—';
      tbody.append(el('tr', {}, el('td', {}, event.number || event.kind), el('td', {}, pam || '—'), el('td', {}, answer || '—'), el('td', {}, notes)));
    }
    table.append(tbody);
    body.append(table);
  }
  details.append(body);
  return details;
}

function ooiGame(game) {
  const result = game.result || {};
  const outcome = result.abandoned ? 'abandoned' : result.won === true ? 'solved' : result.won === false ? 'lost' : 'in progress';
  const summary = `${when(game.startedAt)} · ${game.character || 'Unknown'} · ${game.difficulty || '—'} · ${outcome}${Number.isFinite(result.guesses) ? ` · ${result.guesses} guesses` : ''}`;
  const details = el('details', {class: 'card rv-game extra-review-game'}, el('summary', {}, summary));
  const body = el('div', {class: 'extra-review-body'});
  if (Array.isArray(game.initialBoard) && game.initialBoard.length) body.append(el('p', {class: 'rv-auto'}, `Starting board: ${game.initialBoard.join(' · ')}`));
  const guesses = Array.isArray(game.guesses) ? game.guesses : [];
  if (!guesses.length) body.append(empty('No submitted groups yet.'));
  else {
    const table = el('table', {class: 'rv-rounds extra-review-table'},
      el('thead', {}, el('tr', {}, ...['Guess', 'Words', 'Outcome', 'State after guess'].map(label => el('th', {scope: 'col'}, label)))));
    const tbody = el('tbody');
    for (const guess of guesses) {
      const state = [guess.oneAway ? 'one away' : '', Number.isFinite(guess.solvedCount) ? `${guess.solvedCount}/4 solved` : '', Number.isFinite(guess.mistakes) ? `${guess.mistakes} mistakes` : ''].filter(Boolean).join(' · ') || '—';
      tbody.append(el('tr', {}, el('td', {}, guess.number), el('td', {}, (guess.words || []).join(' · ')), el('td', {}, guess.outcome || '—'), el('td', {}, state)));
    }
    table.append(tbody);
    body.append(table);
  }
  if (Array.isArray(game.solution) && game.solution.length) {
    body.append(el('h4', {}, 'Solution'));
    for (const group of game.solution) body.append(el('p', {class: 'rv-auto'}, `${group.category}: ${(group.words || []).join(' · ')}`));
  }
  details.append(body);
  return details;
}

function modeSection(title, games, renderer) {
  const section = el('section', {class: 'card rv-section extra-mode-section'}, el('h2', {}, title));
  if (!games.length) section.append(empty('No reviewable games recorded on this device yet.'));
  else [...games].reverse().forEach(game => section.append(renderer(game)));
  return section;
}

function installStyles() {
  if (document.getElementById('extraModeReviewStyles')) return;
  const style = el('style', {id: 'extraModeReviewStyles'});
  style.textContent = `
    #${SECTION_ID}{display:grid;gap:18px}
    #${SECTION_ID} .extra-review-game{padding:0;overflow:hidden}
    #${SECTION_ID} .extra-review-game>summary{cursor:pointer;padding:14px 16px;font-weight:900}
    #${SECTION_ID} .extra-review-body{display:grid;gap:12px;padding:0 16px 16px;overflow:auto}
    #${SECTION_ID} .extra-review-table{min-width:680px}
    #${SECTION_ID} h4{margin:6px 0 0}
  `;
  document.head.append(style);
}

function render() {
  if (location.pathname !== '/review') return;
  const review = document.querySelector('.review');
  if (!review || document.getElementById(SECTION_ID)) return;
  installStyles();
  const wrap = el('div', {id: SECTION_ID},
    modeSection('Don’t Tell Me', read(MOM_KEY), momGame),
    modeSection('Odd One In', read(OOI_KEY), ooiGame));
  review.append(wrap);
}

const observer = new MutationObserver(render);
observer.observe(document.documentElement, {childList: true, subtree: true});
window.addEventListener('popstate', () => setTimeout(render, 0));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, {once: true});
else render();
