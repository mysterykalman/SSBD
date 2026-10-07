import {test} from "node:test";
import assert from "node:assert/strict";
import {lemmaKeys, matchKind, sameUnderlyingWord} from "../src/shared/morph.js";
import {checkWord, createGame, currentMove, moveOutcome, revealMove} from "../src/shared/rules.js";

const SAME_EN = [
  ["car", "car"], ["run", "run"], ["RUN", "run"], // exact
  ["car", "cars"], ["glove", "gloves"], ["box", "boxes"], ["baby", "babies"], ["wolf", "wolves"], ["knife", "knives"], ["leaf", "leaves"], // plurals
  ["child", "children"], ["mouse", "mice"], ["foot", "feet"], ["tooth", "teeth"], ["person", "people"], // irregular plurals
  ["run", "running"], ["run", "ran"], ["write", "written"], ["write", "wrote"], ["walk", "walked"], ["bake", "baked"], ["stop", "stopped"],
  ["cry", "cried"], ["make", "making"], ["swim", "swimming"], ["go", "went"], ["eat", "ate"], ["fly", "flew"], ["sing", "sang"], // verbs
  ["big", "bigger"], ["big", "biggest"], ["nice", "nicer"], ["happy", "happier"], ["good", "better"], ["bad", "worst"], // comparatives
  ["ice cream", "ice creams"], ["Running", "RUN"], ["  Cars! ", "car"] // phrases, case, punctuation
];
const DIFFERENT_EN = [
  ["car", "vehicle"], ["couch", "sofa"], ["run", "jog"], ["bake", "baker"], ["happy", "happiness"], ["snow", "snowman"], // brief
  ["teach", "teacher"], ["sing", "singer"], ["even", "evening"], ["build", "building"], ["glass", "glasses"], ["king", "kin"],
  ["red", "re"], ["bed", "be"], ["winter", "wint"], ["dog", "dogma"], ["cat", "category"]
];
const SAME_FR = [["chat", "chats"], ["cheval", "chevaux"], ["jeu", "jeux"], ["oeil", "yeux"], ["petit", "petite"], ["grand", "grandes"], ["manger", "mange"], ["manger", "mangé"], ["étoile", "etoiles"]];
const DIFFERENT_FR = [["chat", "chien"], ["pomme", "pommier"], ["neige", "bonhomme de neige"], ["voiture", "véhicule"]];

test("ordinary inflections are the same underlying word (English)", () => {
  for (const [a, b] of SAME_EN) {
    assert.ok(sameUnderlyingWord(a, b, "en"), `${a} / ${b} should match`);
    assert.ok(sameUnderlyingWord(b, a, "en"), `${b} / ${a} should match (symmetric)`);
  }
});

test("synonyms, related words and derivations stay different (English)", () => {
  for (const [a, b] of DIFFERENT_EN) assert.ok(!sameUnderlyingWord(a, b, "en"), `${a} / ${b} should NOT match`);
});

test("French inflections match; different French words don't", () => {
  for (const [a, b] of SAME_FR) assert.ok(sameUnderlyingWord(a, b, "fr"), `${a} / ${b} should match`);
  for (const [a, b] of DIFFERENT_FR) assert.ok(!sameUnderlyingWord(a, b, "fr"), `${a} / ${b} should NOT match`);
});

test("rulings are deterministic and keep the original words untouched", () => {
  for (let i = 0; i < 3; i++) assert.deepEqual([...lemmaKeys("Running", "en")].sort(), [...lemmaKeys("Running", "en")].sort());
  assert.equal(matchKind("car", "car"), "exact");
  assert.equal(matchKind("car", "cars"), "plural");
  assert.equal(matchKind("child", "children"), "plural");
  assert.equal(matchKind("run", "running"), "variant");
  assert.equal(matchKind("big", "bigger"), "variant");
  assert.equal(matchKind("car", "vehicle"), null);
});

test("game state: exact and inflected matches end the game; synonyms and unrelated words continue", () => {
  for (const [a, b, status] of [["car", "car", "MATCHED"], ["RUNNING", "run", "MATCHED"], ["cars", "car", "MATCHED"], ["couch", "sofa", "REVEALED"], ["snow", "dragon", "REVEALED"]]) {
    let game = createGame({id: `g-${a}-${b}`});
    game = revealMove(game, {a, b});
    assert.equal(game.moves[0].status, status, `${a} + ${b}`);
    if (status === "MATCHED") {
      assert.equal(game.status, "MATCHED");
      assert.equal(game.moves.length, 1, "no next round is created");
      assert.deepEqual(game.moves[0].words, {a, b}, "the original words are kept for the reveal");
    } else {
      assert.equal(game.status, "ACTIVE");
      assert.deepEqual(currentMove(game).prompts, [a, b], "the trail continues with both words");
    }
  }
  assert.equal(moveOutcome(20, "mice", "mouse"), "MATCHED", "a variant on move 20 is still a win");
  assert.equal(moveOutcome(5, "chevaux", "cheval", "fr"), "MATCHED");
});

test("duplicates use the same rule: a side can't replay a variant of its own word", () => {
  let game = createGame({id: "dup"});
  game = revealMove(game, {a: "car", b: "tree"});
  assert.equal(checkWord(game, "a", "cars").code, "SAME_AS_LAST");
  game = revealMove(game, {a: "road", b: "leaf"});
  assert.equal(checkWord(game, "a", "Cars").code, "ALREADY_USED");
  assert.equal(checkWord(game, "a", "vehicle").ok, true, "a synonym is a new word");
  assert.equal(checkWord(game, "a", "trees").ok, true, "the other side's word (or its variant) is fine");
});

test("adversarial words: inflections match, look-alikes and derivations don't", () => {
  const same = [
    ["news", "news"], ["glasses", "glasses"], ["boss", "bosses"], ["class", "classes"], ["dress", "dresses"], ["bus", "buses"],
    ["s", "s"], ["s", "S"], [" s ", "s"], ["runner", "runners"], ["better", "good"], ["best", "good"], ["better", "best"],
    ["left", "left"], ["saw", "see"], ["saw", "saws"], ["found", "find"], ["fox", "foxes"], ["lunch", "lunches"]
  ];
  const different = [
    ["news", "new"], // "news" is its own word, not the plural of "new"
    ["glasses", "glass"], // spectacles: kept as its own word (see handoff limits)
    ["boss", "bos"], ["class", "clas"], ["dress", "dres"], ["bus", "bu"], // a final s that belongs to the word
    ["s", "ss"], ["s", "is"], ["s", "us"],
    ["runner", "run"], ["runner", "running"], // derivation: a runner is a person, not a form of "run"
    ["better", "bet"], ["best", "bes"],
    ["left", "leave"], ["left", "right"], // "left" is read as the direction, not the past of "leave"
    ["saws", "see"], // "saws" can only be the tool
    ["found", "foundation"], ["found", "fund"]
  ];
  for (const [a, b] of same) assert.ok(sameUnderlyingWord(a, b, "en"), `${a} / ${b} should match`);
  for (const [a, b] of different) assert.ok(!sameUnderlyingWord(a, b, "en"), `${a} / ${b} should NOT match`);
});
