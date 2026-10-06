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
  const plural = new Set(["heroTitle", "heroCopy", "firstSolo", "firstFamily", "revealDifferent", "winCopy"]);
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
