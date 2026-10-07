import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {GARY, REACTION_CHANCE, garyKeys, pickReaction} from "../src/client/gary.js";
import {STRINGS} from "../src/client/i18n.js";
import {seededRandom} from "../src/shared/rules.js";

test("every Gary line exists in English and French, short and simple", () => {
  for (const key of [...garyKeys(), "garyMeetAgain"]) {
    for (const lang of ["en", "fr"]) {
      assert.ok(STRINGS[lang][key], `${lang}.${key} missing`);
      if (key.startsWith("gary") && !["garyIntroCta", "garyTitle", "garyMeetAgain"].includes(key)) assert.ok(STRINGS[lang][key].length <= 40, `${lang}.${key} too long`);
    }
  }
  // The deliberately odd line stays odd.
  assert.equal(STRINGS.en.garyIntro2, "I do words now.");
  assert.equal(STRINGS.fr.garyIntro2, "Je fais des mots maintenant.");
  assert.equal(STRINGS.en.garySameTime, "...same time tomorrow?");
});

test("Gary is never presented as a person connected to the game", () => {
  for (const lang of ["en", "fr"]) {
    for (const key of garyKeys()) {
      assert.doesNotMatch(STRINGS[lang][key], /typing|tape un message|online|en ligne|joined|rejoint|connected|connecté|\bbot\b|robot|computer|ordinateur/i, `${lang}.${key}`);
      assert.doesNotMatch(STRINGS[lang][key], /\b(AI|IA|CPU)\b/, `${lang}.${key}`);
    }
    for (const value of Object.values(STRINGS[lang])) assert.doesNotMatch(value, /\bbot\b|robot/i, `"bot"/"robot" still in ${lang} copy: ${value}`);
  }
});

test("Gary speaks on roughly a third of ordinary reveals", () => {
  const random = seededRandom(7);
  let spoke = 0;
  const runs = 4000;
  for (let i = 0; i < runs; i++) if (pickReaction({status: "REVEALED", move: 3, recent: [], random})) spoke++;
  const rate = spoke / runs;
  assert.ok(rate > 0.25 && rate < 0.35, `rate ${rate} (target ${REACTION_CHANCE})`);
});

test("reactions avoid recent repeats and come from the pools", () => {
  const random = seededRandom(11);
  const all = new Set(Object.values(GARY.reactions).flat().map(([key]) => key));
  let recent = [];
  let repeats = 0, said = 0;
  for (let i = 0; i < 3000; i++) {
    const pick = pickReaction({status: "REVEALED", move: 4, recent, random});
    if (!pick) continue;
    said++;
    assert.equal(pick.keys.length, 1);
    assert.ok(all.has(pick.keys[0]));
    assert.ok(pick.when === "before" || pick.when === "after");
    if (recent.includes(pick.keys[0])) repeats++;
    recent = [...recent, ...pick.keys].slice(-6);
  }
  assert.ok(said > 500);
  assert.equal(repeats, 0, "a line Gary used recently is not picked again");
});

test("special moments: match lines, rare mid/late lines once, nothing on the final 20-move reveal", () => {
  const random = seededRandom(3);
  let match = 0;
  for (let i = 0; i < 1000; i++) {
    const pick = pickReaction({status: "MATCHED", move: 5, recent: [], random});
    if (!pick) continue;
    match++;
    assert.equal(pick.keys[0], "garyDots");
    assert.ok(["garyInconvenient", "garyYouWin"].includes(pick.keys[1]));
  }
  assert.ok(match > 600 && match < 800, `match rate ${match / 1000}`);
  assert.equal(pickReaction({status: "EXHAUSTED", move: 20, recent: [], random: () => 0}), null);
  assert.deepEqual(pickReaction({status: "REVEALED", move: 10, recent: [], random: () => 0}).keys, ["garyStillDoing"]);
  assert.notDeepEqual(pickReaction({status: "REVEALED", move: 10, recent: ["garyStillDoing"], random: () => 0})?.keys, ["garyStillDoing"]);
  assert.deepEqual(pickReaction({status: "REVEALED", move: 18, recent: [], random: () => 0}).keys, ["garyToldEnding"]);
  assert.equal(pickReaction({status: "REVEALED", move: 3, recent: [], random: () => 0.99}), null);
});

test("Gary is presentation only: no game, bot, storage or network code", async () => {
  const source = await readFile(new URL("../src/client/gary.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from "\.\.\/shared\/|from "\.\/store|fetch\(|\/api\//);
  // pickReaction is pure: the same inputs give the same answer.
  const a = pickReaction({status: "REVEALED", move: 6, recent: ["garyFine"], random: seededRandom(42)});
  const b = pickReaction({status: "REVEALED", move: 6, recent: ["garyFine"], random: seededRandom(42)});
  assert.deepEqual(a, b);
});
