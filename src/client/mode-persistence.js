// Unified resumable-game layer for modes that do not live in the main store.
// Solo remains device-local in store.js; Together remains server-backed. This module
// adds real device-local resume for Odd One In and presents all modes together on Home.

const OOI_KEY = 'ssbd.resume.odd-one-in.v1';
const MOM_KEY = 'ssbd.resume.mom.v1';
const OOI_MEMORY_KEY = 'ssbd.connections.v3';
const nativeRandom = Math.random.bind(Math);
const nativeStorageGet = Storage.prototype.getItem;

let recordingOoi = false;
let replayingOoi = false;
let recordedRandom = [];
let ooiDraft = null;
let dashboardQueued = false;
let restoring = false;
let lastDashboardList = null;
let lastDashboardSignature = '';

function randomProxy() {
  const value = nativeRandom();
  if (recordingOoi) recordedRandom.push(value);
  return value;
}
Math.random = randomProxy;

function jsonRead(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function jsonWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function remove(key) { try { localStorage.removeItem(key); } catch {} }
function now() { return new Date().toISOString(); }
function text(selector, root = document) { return root.querySelector(selector)?.textContent?.trim() || ''; }
function pressedWords() { return [...document.querySelectorAll('.conn-tile[aria-pressed="true"]')].map(n => n.textContent.trim()).filter(Boolean); }

function beginOoiCapture(tier) {
  if (replayingOoi) return;
  recordedRandom = [];
  recordingOoi = true;
  ooiDraft = {
    v: 1,
    mode: 'odd-one-in',
    tier,
    createdAt: now(),
    updatedAt: now(),
    preMemory: localStorage.getItem(OOI_MEMORY_KEY),
    random: recordedRandom,
    guesses: [],
    selected: []
  };
  setTimeout(() => {
    recordingOoi = false;
    if (!document.querySelector('.conn-host') || document.querySelector('.conn-picker')) return;
    const host = document.querySelector('.conn-host');
    ooiDraft.character = text('.conn-host-name', host);
    ooiDraft.difficulty = text('.conn-host-difficulty', host);
    ooiDraft.initialBoard = [...document.querySelectorAll('.conn-tile')].map(n => n.textContent.trim()).filter(Boolean);
    ooiDraft.random = [...recordedRandom];
    jsonWrite(OOI_KEY, ooiDraft);
    scheduleDashboard(true);
  }, 0);
}

function updateOoiSelected() {
  if (replayingOoi) return;
  const saved = jsonRead(OOI_KEY);
  if (!saved || !document.body.classList.contains('conn-mode-open')) return;
  saved.selected = pressedWords();
  saved.updatedAt = now();
  jsonWrite(OOI_KEY, saved);
}

function recordOoiGuess() {
  if (replayingOoi) return;
  const words = pressedWords();
  if (words.length !== 4) return;
  const saved = jsonRead(OOI_KEY);
  if (!saved) return;
  saved.guesses = Array.isArray(saved.guesses) ? saved.guesses : [];
  saved.guesses.push(words);
  saved.selected = [];
  saved.updatedAt = now();
  jsonWrite(OOI_KEY, saved);
  setTimeout(() => {
    if (document.querySelector('.conn-end')) {
      remove(OOI_KEY);
      scheduleDashboard(true);
    }
  }, 80);
}

function waitFor(selector, timeout = 1800) {
  return new Promise(resolve => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) { observer.disconnect(); resolve(found); }
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});
    setTimeout(() => { observer.disconnect(); resolve(document.querySelector(selector)); }, timeout);
  });
}

async function clickWords(words) {
  for (const word of words || []) {
    const tile = [...document.querySelectorAll('.conn-tile')].find(node => node.textContent.trim() === word);
    if (tile && tile.getAttribute('aria-pressed') !== 'true') tile.click();
  }
  await new Promise(resolve => setTimeout(resolve, 20));
}

async function resumeOddOneIn() {
  const saved = jsonRead(OOI_KEY);
  if (!saved || restoring) return;
  restoring = true;
  replayingOoi = true;
  try {
    document.querySelector('[data-mode="connections"] .mode-actions .btn')?.click();
    await waitFor('.conn-tier');
    const tierButton = [...document.querySelectorAll('.conn-tier')][Math.max(0, Number(saved.tier || 1) - 1)];
    if (!tierButton) return;

    let index = 0;
    Math.random = () => Number(saved.random?.[index++] ?? nativeRandom());
    Storage.prototype.getItem = function (key) {
      if (this === localStorage && key === OOI_MEMORY_KEY) return saved.preMemory ?? null;
      return nativeStorageGet.call(this, key);
    };
    tierButton.click();
    Math.random = randomProxy;
    Storage.prototype.getItem = nativeStorageGet;
    await waitFor('.conn-board');

    for (const guess of saved.guesses || []) {
      await clickWords(guess);
      const check = document.querySelector('.conn-check');
      if (check && !check.disabled) check.click();
      await new Promise(resolve => setTimeout(resolve, 70));
      if (document.querySelector('.conn-end')) break;
    }
    if (!document.querySelector('.conn-end')) await clickWords(saved.selected || []);
    saved.updatedAt = now();
    jsonWrite(OOI_KEY, saved);
  } finally {
    Math.random = randomProxy;
    Storage.prototype.getItem = nativeStorageGet;
    replayingOoi = false;
    restoring = false;
  }
}

function modeOfExisting(item) {
  const strong = item.querySelector('.game-info strong')?.textContent?.trim().toLowerCase() || '';
  if (strong === 'solo' || item.querySelector('[data-character]')) return 'solo';
  return 'together';
}

function whenLabel(iso) {
  try { return new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeStyle:'short'}).format(new Date(iso)); }
  catch { return ''; }
}

function extraItem({mode, title, meta, status, avatar, href, buttonClass}) {
  const li = document.createElement('li');
  li.className = `game-item your-turn resume-mode resume-${mode}`;
  li.dataset.extraPersist = mode;
  const badge = document.createElement('span');
  badge.className = 'badge small resume-avatar';
  if (avatar) {
    const img = document.createElement('img');
    img.src = avatar; img.alt = ''; img.setAttribute('aria-hidden', 'true');
    badge.append(img);
  } else badge.textContent = mode === 'mom' ? 'P' : '?';
  li.append(badge);

  const info = document.createElement('span');
  info.className = 'game-info';
  const strong = document.createElement('strong'); strong.textContent = title;
  const date = document.createElement('span'); date.className = 'game-meta'; date.textContent = meta;
  const state = document.createElement('span'); state.className = 'game-meta'; state.textContent = status;
  info.append(strong, date, state); li.append(info);

  const btn = document.createElement(href ? 'a' : 'button');
  btn.className = `btn tiny ${buttonClass}`.trim(); btn.textContent = 'Resume';
  if (href) btn.href = href;
  else { btn.type = 'button'; btn.addEventListener('click', resumeOddOneIn); }
  li.append(btn);
  return li;
}

function installDashboardStyles() {
  if (document.getElementById('allModeResumeStyles')) return;
  const style = document.createElement('style');
  style.id = 'allModeResumeStyles';
  style.textContent = `
    .game-item.resume-solo{box-shadow:inset 4px 0 0 var(--orange)}
    .game-item.resume-together{box-shadow:inset 4px 0 0 var(--teal)}
    .game-item.resume-mom{box-shadow:inset 4px 0 0 var(--purple)}
    .game-item.resume-odd-one-in{box-shadow:inset 4px 0 0 var(--green)}
    .resume-avatar img{width:100%;height:100%;object-fit:cover}
  `;
  document.head.append(style);
}

function dashboardSignature(list) {
  const native = [...list.querySelectorAll(':scope > .game-item:not([data-extra-persist])')]
    .map(item => item.textContent.replace(/\s+/g,' ').trim()).join('|');
  const mom = jsonRead(MOM_KEY);
  const ooi = jsonRead(OOI_KEY);
  return `${native}::${mom?.updatedAt||''}::${ooi?.updatedAt||''}`;
}

function refreshDashboard(force = false) {
  installDashboardStyles();
  const list = document.getElementById('gameList');
  if (!list || !document.querySelector('.home-grid.start-grid')) return;
  const signature = dashboardSignature(list);
  if (!force && list === lastDashboardList && signature === lastDashboardSignature) return;
  lastDashboardList = list;
  lastDashboardSignature = signature;

  list.querySelectorAll('[data-extra-persist]').forEach(node => node.remove());
  const nativeItems = [...list.querySelectorAll(':scope > .game-item')];
  nativeItems.forEach(item => {
    const mode = modeOfExisting(item);
    item.classList.remove('resume-solo','resume-together');
    item.classList.add(`resume-${mode}`);
    const button = item.querySelector('.btn');
    if (button) {
      if (mode === 'together') button.classList.add('ghost');
      else button.classList.remove('ghost');
    }
  });

  const extras = [];
  const mom = jsonRead(MOM_KEY);
  if (mom?.secretWord && !mom.finished) extras.push({
    updatedAt:mom.updatedAt,
    node:extraItem({mode:'mom',title:'Don’t Tell Me',meta:whenLabel(mom.updatedAt),status:`Pam · ${Math.max(1,(mom.actions?.filter(a=>a.type==='answer').length||0)+1)} questions in`,avatar:'/mom/pam-v2.webp',href:'/mom/?resume=1',buttonClass:'sun'})
  });
  const ooi = jsonRead(OOI_KEY);
  if (ooi?.tier && !ooi.finished) {
    const slug = String(ooi.character||'owen').toLowerCase().replace('professor braine','professor-braine').replace(/\s+/g,'-');
    extras.push({
      updatedAt:ooi.updatedAt,
      node:extraItem({mode:'odd-one-in',title:'Odd One In',meta:whenLabel(ooi.updatedAt),status:`${ooi.character || ooi.difficulty || 'Puzzle'} · ${(ooi.guesses||[]).length} guesses`,avatar:`/odd-one-in/${slug}.png`,href:'',buttonClass:'sage'})
    });
  }
  if (extras.length) list.querySelector('.empty')?.remove();
  extras.sort((a,b)=>String(a.updatedAt).localeCompare(String(b.updatedAt))).forEach(entry => list.prepend(entry.node));
  lastDashboardSignature = dashboardSignature(list);
}

function scheduleDashboard(force = false) {
  if (dashboardQueued) return;
  dashboardQueued = true;
  requestAnimationFrame(() => { dashboardQueued = false; refreshDashboard(force); });
}

document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const tier = target.closest('.conn-tier');
  if (tier && !replayingOoi) {
    const tiers = [...document.querySelectorAll('.conn-tier')];
    beginOoiCapture(tiers.indexOf(tier) + 1);
    return;
  }
  const check = target.closest('.conn-check');
  if (check && !check.disabled) recordOoiGuess();
  if (target.closest('.conn-tile')) setTimeout(updateOoiSelected, 0);
}, true);

new MutationObserver(() => {
  if (document.querySelector('.conn-end') && jsonRead(OOI_KEY)) {
    remove(OOI_KEY);
    lastDashboardSignature = '';
  }
  scheduleDashboard();
}).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class','aria-pressed']});

window.addEventListener('storage', () => scheduleDashboard(true));
window.addEventListener('ssbd:progress-changed', () => scheduleDashboard(true));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scheduleDashboard(true), {once:true});
else scheduleDashboard(true);
