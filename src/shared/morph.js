// @ts-check
// Deterministic "same underlying word" check for match resolution and duplicates.
//
// Rule (product): players win when they arrive at the same word regardless of ordinary
// grammatical inflection (plural, verb tense, comparative). Synonyms (car/vehicle),
// related words (snow/snowman) and derivations (bake/baker, happy/happiness) stay different.
//
// Approach: each word maps to a small SET of possible base forms ("lemmas"), built from
// irregular-form tables plus suffix rules. A suffix rule only fires when the resulting
// base is a known word (lexicon + spelling vocabulary), so "baker" never becomes "bake"
// and "evening" never becomes "even". Comparatives (-er/-est) only apply to a curated
// list of adjectives. Two words are the same when their sets overlap; no AI judgement,
// so the same input always gives the same ruling.

import {getLexicon} from "./lexicon/index.js";
import {cleanWord, wordKey} from "./words.js";

/** @typedef {"en" | "fr"} Lang */

const EN_IRREGULAR = {
  // nouns
  children: "child", mice: "mouse", men: "man", women: "woman", feet: "foot", teeth: "tooth", geese: "goose",
  people: "person", oxen: "ox", dice: "die", lice: "louse", cacti: "cactus", fungi: "fungus",
  // verbs: past / participle → base
  ran: "run", went: "go", gone: "go", ate: "eat", eaten: "eat", saw: "see", seen: "see", took: "take", taken: "take",
  gave: "give", given: "give", came: "come", became: "become", began: "begin", begun: "begin", broke: "break", broken: "break",
  chose: "choose", chosen: "choose", drove: "drive", driven: "drive", flew: "fly", flown: "fly", forgot: "forget", forgotten: "forget",
  froze: "freeze", frozen: "freeze", got: "get", gotten: "get", grew: "grow", grown: "grow", hid: "hide", hidden: "hide",
  knew: "know", known: "know", rode: "ride", ridden: "ride", rang: "ring", rung: "ring", rose: "rise", risen: "rise",
  sang: "sing", sung: "sing", sank: "sink", sunk: "sink", spoke: "speak", spoken: "speak", stole: "steal", stolen: "steal",
  swam: "swim", swum: "swim", threw: "throw", thrown: "throw", woke: "wake", woken: "wake", wore: "wear", worn: "wear",
  won: "win", sat: "sit", slept: "sleep", felt: "feel", kept: "keep", made: "make", built: "build", bought: "buy",
  brought: "bring", caught: "catch", taught: "teach", thought: "think", fought: "fight", found: "find", held: "hold",
  told: "tell", sold: "sell", stood: "stand", dug: "dig", drank: "drink", drunk: "drink", drew: "draw", drawn: "draw",
  fell: "fall", fallen: "fall", did: "do", done: "do", was: "be", were: "be", been: "be", had: "have", said: "say",
  paid: "pay", met: "meet", fed: "feed", shot: "shoot", lost: "lose", slid: "slide", spun: "spin", stuck: "stick",
  swung: "swing", blew: "blow", blown: "blow", bit: "bite", bitten: "bite", shook: "shake", shaken: "shake",
  tore: "tear", torn: "tear", wrote: "write", written: "write", hung: "hang", lit: "light", heard: "hear", ground: "grind",
  // comparatives
  better: "good", best: "good", worse: "bad", worst: "bad"
};

// Ordinary adjectives whose -er/-est forms are comparatives (so "baker", "teacher" are untouched).
const EN_ADJECTIVES = new Set(("big small fast slow tall short hot cold nice happy sad funny long soft hard loud quiet bright dark warm cool " +
  "old young new strong weak high low easy busy pretty ugly clean dirty rich poor deep wide thin thick fat smart kind brave wild calm cute " +
  "sweet sour late early heavy light quick near far full wet dry safe scary silly tiny huge great fresh sharp smooth rough tough " +
  "lucky sunny windy rainy snowy cloudy crazy fancy friendly gentle simple close fine large loose noisy shiny sticky tasty yummy hungry " +
  "sleepy angry lazy dull mild odd pale pure rare ripe sick slim sore steep tight wise grumpy").split(" "));

// Words that look inflected but are their own words.
const EN_NOT_INFLECTED = new Set(("evening morning ceiling during string wedding building painting drawing feeling meaning earring sibling " +
  "darling pudding nothing something everything anything thing king ring sing spring wing swing sling sting bring cling fling " +
  "news glasses pants jeans scissors shorts series species physics maths mathematics trousers pajamas pyjamas stairs " +
  "hundred sacred naked wicked bed red shed sled seed need feed speed weed bleed breed " +
  "ladder letter water winter summer flower tower power river silver butter dinner paper spider monster tiger number finger hamburger " +
  "upper under over after never ever corner danger mother father sister brother teacher baker").split(" "));

const FR_IRREGULAR = {yeux: "oeil", cieux: "ciel", messieurs: "monsieur", mesdames: "madame"};

/** Words the rules may use as a base form: lexicon labels, spelling words, irregular bases, adjectives. */
const knownCache = new Map();
function known(lang) {
  if (!knownCache.has(lang)) {
    const set = new Set();
    for (const word of getLexicon(lang).words) for (const token of tokens(word)) set.add(token);
    if (lang === "en") {
      for (const base of Object.values(EN_IRREGULAR)) set.add(base);
      for (const adjective of EN_ADJECTIVES) set.add(adjective);
    }
    knownCache.set(lang, set);
  }
  return knownCache.get(lang);
}

/** Lowercase, accent-free word tokens ("Ice-Creams" → ["ice", "creams"]). */
function tokens(raw) {
  return cleanWord(raw).toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/\p{M}/gu, "")
    .split(/[\s'-]+/).filter(Boolean);
}

const undouble = stem => (/([bdgklmnprstz])\1$/.test(stem) ? stem.slice(0, -1) : null);

/** @returns {Set<string>} possible base forms of one English token (always includes the token). */
function enLemmas(word, base) {
  const out = new Set([word]);
  const add = candidate => { if (candidate && candidate.length >= 2 && base.has(candidate)) out.add(candidate); };
  if (EN_IRREGULAR[word]) out.add(EN_IRREGULAR[word]);
  if (EN_NOT_INFLECTED.has(word) || word.length < 3) return out;
  // Plurals and 3rd person: cars, boxes, babies, wolves, knives.
  if (word.endsWith("ies") && word.length > 4) add(word.slice(0, -3) + "y");
  if (word.endsWith("ves") && word.length > 4) { add(word.slice(0, -3) + "f"); add(word.slice(0, -3) + "fe"); }
  if (word.endsWith("es") && word.length > 3) {
    const stem = word.slice(0, -2);
    // After s, x, z, ch, sh, English plurals add -es ("bosses", "foxes", "lunches"): drop it even for unknown words.
    if (base.has(stem) || (/(ss|x|z|ch|sh)$/.test(stem) && !base.has(word))) out.add(stem);
  }
  if (word.endsWith("s") && !/(ss|us|is)$/.test(word) && word.length > 2) {
    const stem = word.slice(0, -1);
    // Unknown words still lose a plural s ("zorbles" → "zorble") unless the s is part of the word.
    if (base.has(stem) || (!base.has(word) && word.length > 4 && !/ous$/.test(word))) out.add(stem);
  }
  // -ing: running, making, playing.
  if (word.endsWith("ing") && word.length > 5) {
    const stem = word.slice(0, -3);
    add(stem); add(stem + "e"); add(undouble(stem));
    if (stem.endsWith("y")) add(stem.slice(0, -1) + "ie"); // lying → lie
  }
  // -ed: walked, baked, stopped, cried.
  if (word.endsWith("ed") && word.length > 4) {
    const stem = word.slice(0, -2);
    add(stem); add(word.slice(0, -1)); add(undouble(stem));
    if (stem.endsWith("i")) add(stem.slice(0, -1) + "y");
  }
  // Comparatives, only for real adjectives: bigger, nicer, happiest.
  for (const ending of ["est", "er"]) {
    if (!word.endsWith(ending) || word.length <= ending.length + 2) continue;
    const stem = word.slice(0, -ending.length);
    for (const candidate of [stem, stem + "e", undouble(stem), stem.endsWith("i") ? stem.slice(0, -1) + "y" : null]) {
      if (candidate && EN_ADJECTIVES.has(candidate)) out.add(candidate);
    }
  }
  return out;
}

/** @returns {Set<string>} possible base forms of one French token (accent-free). */
function frLemmas(word, base) {
  const out = new Set([word]);
  const add = candidate => { if (candidate && candidate.length >= 2 && base.has(candidate)) out.add(candidate); };
  if (FR_IRREGULAR[word]) out.add(FR_IRREGULAR[word]);
  if (word.length < 3) return out;
  // Plurals: chats, chevaux, jeux.
  if (word.endsWith("aux") && word.length > 4) { add(word.slice(0, -3) + "al"); add(word.slice(0, -3) + "ail"); }
  if (word.endsWith("x") && word.length > 3) add(word.slice(0, -1));
  if (word.endsWith("s") && word.length > 3) {
    const stem = word.slice(0, -1);
    if (base.has(stem) || (!base.has(word) && word.length > 4)) out.add(stem);
  }
  // Feminine forms of adjectives and nouns: petite, grande, chanteuse, sportive.
  for (const [ending, replacement] of [["es", ""], ["e", ""], ["euses", "eur"], ["euse", "eur"], ["ives", "if"], ["ive", "if"], ["ennes", "en"], ["enne", "en"], ["elles", "el"], ["elle", "el"]]) {
    if (word.endsWith(ending) && word.length > ending.length + 2) add(word.slice(0, -ending.length) + replacement);
  }
  // Regular -er verbs: mange, manges, mangent, mangé(e)(s), mangeant, mangeons, mangez → manger.
  for (const ending of ["eant", "ant", "ons", "ent", "ees", "ez", "ee", "es", "e"]) {
    if (word.endsWith(ending) && word.length > ending.length + 2) add(word.slice(0, -ending.length) + "er");
  }
  return out;
}

/**
 * All base-form keys of a typed word (comparison keys, accent/space/case-free).
 * @param {unknown} raw
 * @param {Lang | string} [language]
 * @returns {Set<string>}
 */
export function lemmaKeys(raw, language = "en") {
  const lang = language === "fr" ? "fr" : "en";
  const parts = tokens(raw);
  const result = new Set([wordKey(raw)]);
  if (!parts.length) return result;
  const base = known(lang);
  const lemmatize = lang === "fr" ? frLemmas : enLemmas;
  // Multi-word answers: only the last word inflects in English ("ice creams"); every word may in French.
  let combos = [""];
  parts.forEach((part, i) => {
    const forms = lang === "en" && i < parts.length - 1 ? new Set([part]) : lemmatize(part, base);
    const next = [];
    for (const prefix of combos) for (const form of forms) next.push(prefix + form);
    combos = next.slice(0, 32);
  });
  for (const combo of combos) result.add(combo);
  return result;
}

/** True when two answers are the same underlying word (identical, or an ordinary inflection of each other). */
export function sameUnderlyingWord(a, b, language = "en") {
  const keyA = wordKey(a);
  if (!keyA) return false;
  if (keyA === wordKey(b)) return true;
  const setB = lemmaKeys(b, language);
  for (const key of lemmaKeys(a, language)) if (setB.has(key)) return true;
  return false;
}

/**
 * How two matching answers relate, for friendly copy:
 * "exact" (same word as typed), "plural" (one is the plural of the other), "variant" (another inflection),
 * or null when they are different words.
 * @returns {"exact" | "plural" | "variant" | null}
 */
export function matchKind(a, b, language = "en") {
  const keyA = wordKey(a), keyB = wordKey(b);
  if (!keyA) return null;
  if (keyA === keyB) return "exact";
  if (!sameUnderlyingWord(a, b, language)) return null;
  const [long, short] = keyA.length >= keyB.length ? [keyA, keyB] : [keyB, keyA];
  const plural = long === short + "s" || long === short + "es" || long === short + "x"
    || (short.endsWith("y") && long === short.slice(0, -1) + "ies")
    || (/fe?$/.test(short) && long === short.replace(/fe?$/, "ves"))
    || (short.endsWith("al") && long === short.slice(0, -2) + "aux")
    || ["children", "mice", "men", "women", "feet", "teeth", "geese", "people", "oxen", "yeux"].includes(long) || ["children", "mice", "men", "women", "feet", "teeth", "geese", "people", "oxen", "yeux"].includes(short);
  return plural ? "plural" : "variant";
}
