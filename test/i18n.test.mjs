import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LANGUAGES, STRINGS, frenchTypography, languageName, translator} from "../src/client/i18n.js";

const placeholders = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

test("both languages define exactly the same keys", () => {
  assert.deepEqual(LANGUAGES, ["en", "fr"]);
  const en = Object.keys(STRINGS.en).sort(), fr = Object.keys(STRINGS.fr).sort();
  assert.deepEqual(en.filter(k => !fr.includes(k)), [], "missing in French");
  assert.deepEqual(fr.filter(k => !en.includes(k)), [], "missing in English");
});

test("every string is non-empty and placeholders match between en and fr", () => {
  for (const key of Object.keys(STRINGS.en)) {
    for (const lang of LANGUAGES) {
      assert.equal(typeof STRINGS[lang][key], "string", `${lang}.${key}`);
      assert.ok(STRINGS[lang][key].trim(), `${lang}.${key} is empty`);
    }
    assert.deepEqual(placeholders(STRINGS.fr[key]), placeholders(STRINGS.en[key]), `placeholders differ for ${key}`);
  }
});

test("no string exposes the SSBD acronym", () => {
  for (const lang of LANGUAGES) {
    for (const [key, value] of Object.entries(STRINGS[lang])) assert.doesNotMatch(value, /ssbd/i, `${lang}.${key}`);
  }
});

test("app.js uses only keys that exist, and has no hard-coded French/English UI sentences", () => {
  const source = readFileSync(new URL("../src/client/app.js", import.meta.url), "utf8");
  const used = new Set([...source.matchAll(/\bt\("(\w+)"/g)].map(m => m[1]));
  for (const key of used) assert.ok(key in STRINGS.en, `app.js uses unknown key ${key}`);
  // Error codes are looked up as `err${code}`; spot-check the ones the rules can return.
  for (const code of ["EMPTY", "TOO_LONG", "INVALID_CHARACTERS", "SAME_AS_LAST", "ALREADY_USED"]) assert.ok(`err${code}` in STRINGS.en);
  assert.doesNotMatch(source, /state\.lang === "fr" \? "[^"]*[a-z]{3,} [a-z]/i, "inline translated sentence in app.js");
  assert.doesNotMatch(source.replace(/\/\/.*$/gm, ""), /["'`][^"'`]*\bSSBD\b/, "SSBD in a UI string in app.js");
});

test("French typography: narrow no-break space before ! ? ; : and never a plain space", () => {
  for (const [key, value] of Object.entries(STRINGS.fr)) {
    assert.doesNotMatch(value, /[  ][!?;:]/, `fr.${key} has a breakable space before punctuation`);
    assert.doesNotMatch(value, /[\p{L}\p{N}}][!?;:]/u, `fr.${key} is missing the space before punctuation`);
    assert.doesNotMatch(value, /'/, `fr.${key} uses a straight apostrophe`);
  }
  assert.equal(frenchTypography("Salut !"), "Salut !");
  assert.equal(frenchTypography("« oui »"), "« oui »");
});

test("English has no stray space before punctuation", () => {
  for (const [key, value] of Object.entries(STRINGS.en)) assert.doesNotMatch(value, / [!?;:]/, `en.${key}`);
});

test("French copy speaks to kids with tu, not vous", () => {
  const formal = /\b(vous|votre|vos)\b/i;
  // The few lines addressed to both players together legitimately use the plural.
  const plural = new Set(["heroTitle", "heroCopy", "firstSolo", "garyFirstSolo", "miloFirstSolo", "firstFamily", "revealDifferent", "revealMatchCopy", "winCopy"]);
  for (const [key, value] of Object.entries(STRINGS.fr)) {
    if (!plural.has(key)) assert.doesNotMatch(value, formal, `fr.${key}`);
  }
});

test("translator substitutes variables and falls back to English, then the key", () => {
  let lang = "fr";
  const t = translator(() => lang);
  assert.equal(t("moveOf", {n: 3, max: 20}), "Coup 3 sur 20");
  assert.equal(t("langNoteTitle", {game: languageName(t, "en")}), "Cette partie est en anglais.");
  assert.equal(t("langNewGame", {ui: languageName(t, "fr")}), "Nouvelle partie en français");
  assert.equal(t("profileTitle", {name: "Zoé"}), "Salut, Zoé !");
  assert.equal(t("no-such-key"), "no-such-key");
  lang = "de";
  assert.equal(t("lockIn"), "Lock it in");
  lang = "en";
  assert.equal(t("langNoteCopy", {game: languageName(t, "fr"), ui: languageName(t, "en")}), "Its words stay in French. Start a new game to play in English.");
});

test("copy stays warm and kid-facing: no technical or failure words", () => {
  const banned = {
    en: [/\berrors?\b/i, /\binvalid\b/i, /no moves left/i, /different,? so keep going/i, /\bfail(s|ed|ure)?\b/i, /\bwrong\b/i,
      /\bnot allowed\b/i, /\bforbidden\b/i, /\billegal\b/i, /\brejected\b/i, /\bexception\b/i, /\bserver\b/i, /\bnull\b/i, /\bundefined\b/i, /\byou lose\b/i],
    fr: [/\berreurs?\b/i, /\binvalides?\b/i, /plus de coups/i, /\béchec\b/i, /\béchoué/i, /\bimpossible\b/i, /problème est survenu/i,
      /\binterdit/i, /\brefusé/i, /\bserveur\b/i, /\bnull\b/i, /\bundefined\b/i, /\btu as perdu\b/i]
  };
  for (const lang of LANGUAGES) {
    for (const [key, value] of Object.entries(STRINGS[lang])) {
      for (const re of banned[lang]) assert.doesNotMatch(value, re, `${lang}.${key}: ${value}`);
    }
  }
});

test("one-letter words are welcome: no copy asks for two letters", () => {
  assert.doesNotMatch(STRINGS.en.errTOO_SHORT, /two letters/i);
  assert.doesNotMatch(STRINGS.fr.errTOO_SHORT, /deux lettres/i);
});

test("no emoji anywhere in interface copy (either language)", () => {
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2705}\u{270B}\u{2728}\u{274C}\u{2764}]/u;
  for (const lang of ["en", "fr"]) {
    for (const [key, value] of Object.entries(STRINGS[lang])) assert.doesNotMatch(value, emoji, `${lang}.${key}: ${value}`);
  }
});

test("homepage copy", () => {
  const en = STRINGS.en;
  assert.equal(en.heroTitle, "Try to read each other’s minds.");
  assert.equal(en.heroCopy, "No pressure. Just your entire friendship.");
  assert.deepEqual([en.soloTitle, en.soloCopy1, en.soloCopy2, en.soloCopy3, en.soloStart, en.soloOfflineNote],
    ["Play Solo", "We heard you had no friends.", "So we lured Gary from Accounting over with the promise of cake. Milo came anyway.", "There is no cake.", "Let’s play!", "Plays offline too. Fancy."]);
  assert.deepEqual([en.togetherTitle, en.togetherCopy1, en.togetherCopy2, en.familyCreate, en.familyJoin],
    ["Play Together", "Choose someone who claims to know you well.", "Time to investigate.", "Start a game", "Join a game"]);
  assert.deepEqual([en.gamesTitle, en.gamesEmpty1, en.gamesEmpty2], ["Your games", "Nothing here yet.", "Suspiciously peaceful."]);
  for (const key of ["heroTitle", "heroCopy", "soloCopy1", "soloCopy2", "soloCopy3", "soloOfflineNote", "soloStart", "togetherTitle", "togetherCopy1", "togetherCopy2", "familyCreate", "familyJoin", "gamesEmpty1", "gamesEmpty2"]) {
    assert.ok(STRINGS.fr[key] && STRINGS.fr[key] !== en[key], `fr.${key} is translated`);
  }
  // No technical "works without internet" phrasing, and no special copy for inflected matches.
  for (const lang of ["en", "fr"]) {
    assert.doesNotMatch(Object.values(STRINGS[lang]).join(" "), /without internet|sans internet|close enough|schmural|ça compte/i);
  }
});
