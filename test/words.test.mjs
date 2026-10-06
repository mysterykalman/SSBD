import {test} from "node:test";
import assert from "node:assert/strict";
import {cleanWord, createSpeller, sameWord, validateWord, wordKey} from "../src/shared/words.js";

test("cleanWord keeps the friendly form and strips edge punctuation", () => {
  assert.equal(cleanWord("  ice   cream!! "), "ice cream");
  assert.equal(cleanWord("«Étoile»"), "Étoile");
  assert.equal(cleanWord("don’t"), "don't");
  assert.equal(cleanWord("ice - cream"), "ice-cream");
});

test("wordKey ignores case, accents, spaces, hyphens and apostrophes", () => {
  assert.equal(wordKey("Étoile"), wordKey("etoile"));
  assert.equal(wordKey("ICE CREAM"), wordKey("ice-cream"));
  assert.equal(wordKey("cœur"), "coeur");
  assert.ok(sameWord("Sun", "sun."));
  assert.ok(!sameWord("sun", "suns"));
  assert.ok(!sameWord("", ""));
});

test("validateWord rejects unsafe input with clear codes", () => {
  assert.equal(validateWord("").code, "EMPTY");
  assert.equal(validateWord("    ").code, "EMPTY");
  assert.equal(validateWord("?!...").code, "EMPTY");
  assert.equal(validateWord("a".repeat(25)).code, "TOO_LONG");
  assert.equal(validateWord("abc123").code, "INVALID_CHARACTERS");
  assert.equal(validateWord("<script>").code, "INVALID_CHARACTERS");
  assert.equal(validateWord("a").code, "TOO_SHORT");
  assert.equal(validateWord("one two three four").code, "TOO_MANY_WORDS");
  assert.deepEqual(validateWord(" Rainbow! "), {ok: true, word: "Rainbow", key: "rainbow"});
  assert.equal(validateWord("arc-en-ciel").ok, true);
  assert.equal(validateWord("Zyxwvut").ok, true, "unusual but valid words are allowed");
});

test("speller only suggests when confident and never for known words", () => {
  const s = createSpeller(["friend", "family", "rainbow", "dragon", "drag", "moon", "mood", "étoile"]);
  assert.equal(s.suggest("freind"), "friend");
  assert.equal(s.suggest("famly"), "family");
  assert.equal(s.suggest("rainbw"), "rainbow");
  assert.equal(s.suggest("friend"), null);
  assert.equal(s.suggest("friends"), null, "plurals of known words are fine");
  assert.equal(s.suggest("moob"), null, "ambiguous between moon and mood");
  assert.equal(s.suggest("etoile"), null, "accent-free spelling is accepted as typed");
  assert.equal(s.suggest("xylophonic"), null);
});

test("speller does not 'correct' real words that are one letter from another word", async () => {
  const {getLexicon} = await import("../src/shared/lexicon/index.js");
  const en = createSpeller(getLexicon("en").words), fr = createSpeller(getLexicon("fr").words);
  for (const word of ["draft", "jumped", "stamp", "brand", "prime", "chime", "flight", "slight", "drape", "skool"]) assert.equal(en.suggest(word), null, word);
  for (const word of ["vin", "bâton", "race", "lobe"]) assert.equal(fr.suggest(word), null, word);
  for (const [typo, fix] of [["freind", "friend"], ["famly", "family"], ["rainbw", "rainbow"], ["mooon", "moon"], ["dinosuar", "dinosaur"]]) assert.equal(en.suggest(typo), fix, typo);
  for (const [typo, fix] of [["chocolta", "chocolat"], ["grenouile", "grenouille"], ["soliel", "soleil"], ["chatteau", "château"], ["maizon", "maison"]]) assert.equal(fr.suggest(typo), fix, typo);
});
