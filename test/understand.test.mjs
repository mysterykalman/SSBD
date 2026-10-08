// Input understanding (src/shared/understand.js): spelling slips, word boundaries and inflections
// resolve to the intended concept before the engine scores anything; real words are never
// "corrected" into other words; and the everyday vocabulary is covered.
import {test} from "node:test";
import assert from "node:assert/strict";
import {correctionFor, fuzzyMatch, understandWord} from "../src/shared/understand.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {ADDED_CONCEPTS_3} from "../src/shared/lexicon/additions3.js";
import {sameUnderlyingWord} from "../src/shared/morph.js";
import {wordKey} from "../src/shared/words.js";

const lex = getLexicon("en");
const means = (word, ...ids) => assert.deepEqual(understandWord(word, "en").ids, ids, word);

test("typos: the intended word, with high confidence for typical slips", () => {
  for (const [typed, meant] of [["battelship", "battleship"], ["chikcen", "chicken"], ["aqurium", "aquarium"], ["surfin", "surf"], ["elefant", "elephant"], ["bananna", "banana"], ["pizzza", "pizza"], ["koalla", "koala"]]) {
    const u = understandWord(typed, "en");
    assert.equal(u.method, "fuzzy", typed);
    assert.equal(u.fuzzy, true);
    assert.equal(u.confidence, "high", typed);
    assert.deepEqual(u.ids, [meant], typed);
  }
  // The kinds of slip: swapped neighbours, a letter left out, a letter added, one wrong letter.
  assert.equal(fuzzyMatch(lex, "brigde")?.concept, "bridge", "adjacent letters swapped");
  assert.equal(fuzzyMatch(lex, "elphant")?.concept, "elephant", "one letter missing");
  assert.equal(fuzzyMatch(lex, "tigerr")?.concept, "tiger", "one letter doubled");
  assert.equal(fuzzyMatch(lex, "penguine")?.concept, "penguin", "one letter extra (medium)");
  assert.equal(fuzzyMatch(lex, "penguine")?.confidence, "medium");
  assert.equal(fuzzyMatch(lex, "chocolete")?.concept, "chocolate", "one wrong letter");
  assert.deepEqual(correctionFor("battelship", "en"), {word: "battleship", confidence: "high"});
  assert.deepEqual(correctionFor("surfin", "en"), {word: "surfing", confidence: "high"}, "suggested the way the player meant it");
});

test("no over-correction: real words stay themselves; unclear input is not guessed", () => {
  for (const word of ["draft", "stamp", "carpet", "sandal", "wheat", "skirt", "mango", "sparrow"]) {
    const u = understandWord(word, "en");
    assert.notEqual(u.method, "fuzzy", `${word} is a real word`);
    assert.equal(correctionFor(word, "en"), null, word);
  }
  // Pieces of real words are not their meaning (the old resolver read carpet as car + pet).
  means("carpet", "carpet");
  means("sandal", "sandal");
  means("wheat", "wheat");
  for (const unclear of ["zorblax", "qwzzk", "giraf", "skool", "abc", "xyz"]) assert.equal(correctionFor(unclear, "en"), null, unclear);
  assert.equal(understandWord("zorblax", "en").unresolved, true);
  // Short words are never fuzzy-matched (too many neighbours).
  assert.equal(fuzzyMatch(lex, "cst"), null);
  assert.equal(fuzzyMatch(lex, "dgo"), null);
});

test("word boundaries: one word or two, the same concept", () => {
  means("birdnest", "bird", "nest");
  means("bird nest", "bird", "nest");
  means("seahorse", "seahorse");
  means("sea horse", "seahorse");
  means("ice cream", "ice_cream");
  means("icecream", "ice_cream");
  means("fire truck", "fire", "truck");
  means("firetruck", "fire", "truck");
  means("playground", "playground");
  means("play ground", "playground");
  means("raincoat", "raincoat");
  means("rain coat", "raincoat");
  assert.equal(understandWord("sea horse", "en").spacing, true, "logged as a spacing variant");
  assert.equal(understandWord("seahorse", "en").spacing, false);
  // And the game treats them as the same answer.
  assert.ok(sameUnderlyingWord("sea horse", "seahorse"));
  assert.ok(sameUnderlyingWord("ice cream", "icecream"));
});

test("morphology: plurals, gerunds and other inflections resolve to the same concept", () => {
  for (const [a, b] of [["twig", "twigs"], ["chick", "chicks"], ["surf", "surfing"], ["swim", "swimming"], ["tree", "trees"], ["dog", "dogs"], ["run", "running"], ["ride", "riding"]]) {
    assert.deepEqual(understandWord(b, "en").ids, understandWord(a, "en").ids, `${a} / ${b}`);
    assert.ok(understandWord(a, "en").ids.length, a);
  }
  assert.equal(understandWord("twigs", "en").morphology, true);
  assert.equal(understandWord("riding", "en").morphology, true);
  // Genuinely different words stay different.
  assert.notDeepEqual(understandWord("baker", "en").ids, understandWord("bake", "en").ids);
});

test("coverage: the 10:56 game's unknown words and a broad everyday list are understood", () => {
  for (const word of ["battleship", "twigs", "chicks", "tuna", "surfing"]) assert.equal(understandWord(word, "en").unresolved, false, word);
  const everyday = `seagull sailor anchor seal coral canoe kayak paddle rat donkey calf bull piglet lamb hen rooster goose turkey fence deer moose
    gorilla koala hippo rhino lizard toad wasp beetle mosquito hawk crow pigeon robin swan flamingo peacock ostrich hedgehog raccoon skunk beaver otter
    peach lime coconut onion garlic broccoli lettuce cucumber pepper bean pea rice yogurt bacon sausage ham beef steak spaghetti noodle taco waffle
    muffin popsicle soda chips ketchup salt kick dig drive sail hunt room yard garage stairs rug mother father town church cafe bicycle motorcycle
    scooter taxi van teddy jeans shorts necklace bag beak claw whisker horn hoof log stick bark root bush acorn wheat mango carpet skirt sandal sparrow`.split(/\s+/).filter(Boolean);
  const missing = everyday.filter(w => understandWord(w, "en").unresolved);
  assert.deepEqual(missing, []);
});

test("every new concept has its own label in both languages (no word stands for two concepts)", () => {
  for (const lang of ["en", "fr"]) {
    const l = getLexicon(lang);
    for (const [id] of ADDED_CONCEPTS_3) {
      const c = l.concepts.get(id);
      assert.ok(c, `${lang}: ${id}`);
      assert.equal(l.byKey.get(wordKey(c.label)), id, `${lang}: "${c.label}" belongs to ${l.byKey.get(wordKey(c.label))}`);
    }
  }
});

test("French: typos, plurals and spacing too", () => {
  assert.deepEqual(understandWord("poussins", "fr").ids, ["chick"]);
  assert.deepEqual(understandWord("chien", "fr").ids, ["dog"]);
  assert.equal(understandWord("chocolatt", "fr").method, "fuzzy");
  assert.equal(understandWord("pomme de terre", "fr").unresolved, false);
});
