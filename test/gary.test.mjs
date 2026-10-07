// The Solo characters (Gary, Milo): copy, reaction pools and the reaction picker. Presentation only.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CHARACTERS, CHARACTER_IDS, EARLY_MATCH, LATE_MATCH, REACTION_CHANCE, character, characterId, characterKeys, copyKey, pickReaction, rematchLine, revealKind} from "../src/client/characters.js";
import {STRINGS} from "../src/client/i18n.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {seededRandom} from "../src/shared/rules.js";

// Titles, taglines and each character's wording of shared Solo sentences may be longer than a quick remark.
const LONG_OK = new Set(["garyIntroCta", "garyTitle", "garyMeetAgain", "garyTagline", "miloTagline", "miloMeetAgain", ...CHARACTER_IDS.flatMap(id => Object.values(CHARACTERS[id].copy))]);
const flat = list => list.flat().filter(key => key !== "before" && key !== "after");

test("Gary and Milo share one config shape: id, name, avatar, personality, reaction pools, voice", () => {
  assert.deepEqual(CHARACTER_IDS, ["gary", "milo"]);
  const shape = c => ({keys: Object.keys(c).sort(), lines: Object.keys(c.lines).sort(), intro: Object.keys(c.intro).sort()});
  assert.deepEqual(shape(CHARACTERS.milo), shape(CHARACTERS.gary));
  for (const id of CHARACTER_IDS) {
    const c = CHARACTERS[id];
    assert.equal(c.id, id);
    assert.equal(c.art, id, "each character has its own portrait");
    assert.ok("voiceId" in c && typeof c.voiceStyle === "string" && c.voiceStyle);
    assert.ok(c.personality);
    for (const pool of ["close", "strange", "earlyMatch", "lateMatch", "win", "rematch", "middle", "nearEnd"]) assert.ok(c.lines[pool].length, `${id}.${pool}`);
    assert.ok(Object.values(c.lines.mismatch).flat().length >= 10, `${id} has plenty of mismatch lines`);
    assert.equal(c.lines.gameOver.length, 2);
  }
  // Unknown or missing ids (games saved before characters existed) are Gary's.
  assert.equal(characterId(undefined), "gary");
  assert.equal(characterId("pip"), "gary");
  assert.equal(characterId("milo"), "milo");
  assert.equal(character("__proto__").id, "gary");
});

test("every character line exists in English and French, short and simple; the cards read as personality", () => {
  for (const id of CHARACTER_IDS) {
    for (const key of characterKeys(id)) {
      for (const lang of ["en", "fr"]) {
        assert.ok(STRINGS[lang][key], `${lang}.${key} missing`);
        if (!LONG_OK.has(key)) assert.ok(STRINGS[lang][key].length <= 40, `${lang}.${key} too long`);
      }
    }
  }
  assert.equal(STRINGS.en.garyTitle, "Gary from Accounting");
  assert.equal(STRINGS.en.garyTagline, "He was told there would be cake.");
  assert.equal(STRINGS.en.miloTitle, "Milo");
  assert.equal(STRINGS.en.miloTagline, "Ready. Probably too ready.");
  assert.equal(STRINGS.en.pickTitle, "Who do you want to play with?");
  // The deliberately odd line stays odd.
  assert.equal(STRINGS.en.garyIntro2, "I do words now.");
  assert.equal(STRINGS.fr.garyIntro2, "Je fais des mots maintenant.");
  assert.equal(STRINGS.en.garySameTime, "...same time tomorrow?");
});

test("the choice is personality, never difficulty, age or machine", () => {
  const keys = [...new Set([...characterKeys("gary"), ...characterKeys("milo"), "pickTitle", "pickStart", "soloStart"])];
  for (const lang of ["en", "fr"]) {
    for (const key of keys) {
      const value = STRINGS[lang][key];
      assert.doesNotMatch(value, /typing|tape un message|online|en ligne|joined|rejoint|connected|connecté|\bbot\b|robot|computer|ordinateur/i, `${lang}.${key}`);
      assert.doesNotMatch(value, /\b(AI|IA|CPU)\b/, `${lang}.${key}`);
      assert.doesNotMatch(value, /\b(easy|hard|difficult\w*|level|kids?|child\w*|baby|facile|difficile|niveau|enfants?|bébé)\b/i, `${lang}.${key}: ${value}`);
    }
    for (const value of Object.values(STRINGS[lang])) assert.doesNotMatch(value, /\bbot\b|robot|\bpip\b/i, `"bot"/"robot"/"Pip" in ${lang} copy: ${value}`);
  }
});

test("Milo is energetic and kind: no jokes about scores or machines, never at the player's expense, no repeated 'high five'", () => {
  for (const lang of ["en", "fr"]) {
    for (const key of characterKeys("milo")) {
      const value = STRINGS[lang][key];
      assert.doesNotMatch(value, /score|\bpoints?\b|\blos(e|er|ing)\b|\bperd|\bnul\b|\bbad\b|wrong|silly you|dumb|stupid|bête|idiot/i, `${lang}.${key}: ${value}`);
      assert.doesNotMatch(value, /high.?five|tapé dans la main|tope/i, `${lang}.${key} would repeat the match subcopy`);
    }
  }
  // ...and the match pools for Gary never repeat the system subcopy either.
  for (const id of CHARACTER_IDS) {
    for (const key of flat([...CHARACTERS[id].lines.earlyMatch, ...CHARACTERS[id].lines.lateMatch, ...CHARACTERS[id].lines.win])) {
      assert.doesNotMatch(STRINGS.en[key], /high.?five|brains/i, key);
    }
  }
  // Milo sounds different from Gary: exclamation marks, no sighs.
  const exclaim = characterKeys("milo").filter(key => STRINGS.en[key].includes("!")).length;
  assert.ok(exclaim >= characterKeys("milo").length / 2, `${exclaim} lively lines`);
  assert.ok(!characterKeys("milo").some(key => /\b(sigh|ugh)\b/i.test(STRINGS.en[key])));
});

test("shared Solo copy suits both characters; each character's own wording keeps the same information", () => {
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  // Strings both characters share never name or describe just one of them.
  const shared = ["pickTitle", "pickStart", "soloStart", "revealBotWord", "revealMatchTitle", "revealMatchCopy", "winTitle", "winCopy", "playAgainWith", "nowHint", "nowHintSub", "promptTitle", "promptCopy", "revealSeeEnd"];
  for (const lang of ["en", "fr"]) {
    for (const key of shared) assert.doesNotMatch(STRINGS[lang][key], /gary|milo|comptab|accounting|\b(he|his|him|il|lui)\b/i, `${lang}.${key}: ${STRINGS[lang][key]}`);
    // The home Solo card now introduces both of them.
    assert.match(STRINGS[lang].soloCopy2, /Gary/);
    assert.match(STRINGS[lang].soloCopy2, /Milo/);
  }
  for (const id of CHARACTER_IDS) {
    const other = CHARACTER_IDS.find(x => x !== id);
    for (const [base, own] of Object.entries(CHARACTERS[id].copy)) {
      assert.equal(copyKey(id, base), own);
      for (const lang of ["en", "fr"]) {
        const text = STRINGS[lang][own];
        assert.ok(text, `${lang}.${own}`);
        // Same information: the pair still appears as "{a} + {b}", and no placeholder is dropped or invented.
        for (const name of placeholders(text)) assert.ok(placeholders(STRINGS[lang][base]).includes(name), `${lang}.${own} uses {${name}}`);
        if (base === "revealNextStarts") assert.match(text, /\{a\} \+ \{b\}/);
        assert.doesNotMatch(text, new RegExp(other, "i"), `${lang}.${own} never names ${other}`);
      }
    }
  }
  // Milo has his own wording wherever the game speaks to the player during a Solo game.
  for (const key of ["firstSolo", "botReady", "revealLoose", "revealNice", "revealNextStarts", "keepPlaying", "gameOverAww", "gameOverCopy"]) {
    assert.notEqual(copyKey("milo", key), key, `Milo says ${key} his way`);
    assert.notEqual(STRINGS.en[copyKey("milo", key)], STRINGS.en[copyKey("gary", key)]);
  }
  // Gary keeps the wording players already know.
  assert.equal(STRINGS.en[copyKey("gary", "firstSolo")], "Type any word you like. Gary is picking his own word right now. Then you both reveal!");
  assert.equal(STRINGS.en[copyKey("gary", "keepPlaying")], "Keep playing");
  assert.equal(STRINGS.en[copyKey("gary", "revealNextStarts")], "Next move starts with {a} + {b}");
});

test("a character speaks on roughly a third of ordinary reveals, and only from their own pools", () => {
  for (const id of CHARACTER_IDS) {
    const own = new Set(characterKeys(id));
    const random = seededRandom(7);
    let spoke = 0;
    const runs = 4000;
    for (let i = 0; i < runs; i++) {
      const pick = pickReaction({character: id, status: "REVEALED", move: 3, recent: [], random});
      if (!pick) continue;
      spoke++;
      assert.equal(pick.pool, "mismatch");
      for (const key of pick.keys) assert.ok(own.has(key), `${id} said ${key}`);
    }
    const rate = spoke / runs;
    assert.ok(rate > 0.25 && rate < 0.35, `${id} rate ${rate} (target ${REACTION_CHANCE})`);
  }
});

test("each moment uses the character's own pool: close, strange, early match, match, late match, long game, rematch", () => {
  for (const id of CHARACTER_IDS) {
    const {lines} = CHARACTERS[id];
    const other = CHARACTER_IDS.find(x => x !== id);
    const foreign = new Set(characterKeys(other));
    const random = seededRandom(5);
    const seen = {};
    for (let i = 0; i < 2000; i++) {
      for (const [args, pool, expected] of [
        [{status: "REVEALED", move: 4, kind: "close"}, "close", flat(lines.close)],
        [{status: "REVEALED", move: 4, kind: "strange"}, "strange", flat(lines.strange)],
        [{status: "MATCHED", move: 1}, "earlyMatch", flat(lines.earlyMatch)],
        [{status: "MATCHED", move: EARLY_MATCH}, "earlyMatch", flat(lines.earlyMatch)],
        [{status: "MATCHED", move: 7}, "win", flat(lines.win)],
        [{status: "MATCHED", move: LATE_MATCH}, "lateMatch", flat(lines.lateMatch)],
        [{status: "MATCHED", move: 20}, "lateMatch", flat(lines.lateMatch)]
      ]) {
        const pick = pickReaction({character: id, ...args, recent: [], random});
        if (!pick) continue;
        assert.equal(pick.pool, pool, `${id} ${JSON.stringify(args)}`);
        for (const key of pick.keys) {
          assert.ok(expected.includes(key), `${id} ${pool}: ${key}`);
          assert.ok(!foreign.has(key), `${id} never says ${other}'s lines`);
        }
        seen[pool] = (seen[pool] || 0) + 1;
      }
    }
    for (const pool of ["close", "strange", "earlyMatch", "win", "lateMatch"]) assert.ok(seen[pool] > 100, `${id} ${pool} used`);
    // Matches get a line about 70% of the time, close/strange answers a bit more often than ordinary ones.
    assert.equal(pickReaction({character: id, status: "EXHAUSTED", move: 20, recent: [], random: () => 0}), null);
    assert.deepEqual(pickReaction({character: id, status: "REVEALED", move: 10, recent: [], random: () => 0}).keys, lines.middle);
    assert.notDeepEqual(pickReaction({character: id, status: "REVEALED", move: 10, recent: lines.middle, random: () => 0})?.keys, lines.middle);
    assert.deepEqual(pickReaction({character: id, status: "REVEALED", move: 18, recent: [], random: () => 0}).keys, lines.nearEnd);
    assert.equal(pickReaction({character: id, status: "REVEALED", move: 3, recent: [], random: () => 0.99}), null);
    assert.ok(lines.rematch.includes(rematchLine(id, () => 0)) && lines.rematch.includes(rematchLine(id, () => 0.99)));
  }
  // Gary's lines are unchanged where they were already used.
  assert.deepEqual(pickReaction({character: "gary", status: "MATCHED", move: 5, recent: [], random: () => 0}).keys, ["garyDots", "garyInconvenient"]);
  assert.deepEqual(pickReaction({character: "gary", status: "REVEALED", move: 1, recent: [], random: () => 0.1}).keys, ["garySigh"]);
  assert.deepEqual(pickReaction({status: "REVEALED", move: 1, recent: [], random: () => 0.1}).keys, ["garySigh"], "no character means Gary");
});

test("reactions avoid recent repeats", () => {
  for (const id of CHARACTER_IDS) {
    const random = seededRandom(11);
    const all = new Set(Object.values(CHARACTERS[id].lines.mismatch).flat().map(([key]) => key));
    let recent = [];
    let repeats = 0, said = 0;
    for (let i = 0; i < 3000; i++) {
      const pick = pickReaction({character: id, status: "REVEALED", move: 4, recent, random});
      if (!pick) continue;
      said++;
      assert.equal(pick.keys.length, 1);
      assert.ok(all.has(pick.keys[0]));
      assert.ok(pick.when === "before" || pick.when === "after");
      if (recent.includes(pick.keys[0])) repeats++;
      recent = [...recent, ...pick.keys].slice(-6);
    }
    assert.ok(said > 500);
    assert.equal(repeats, 0, `a line ${id} used recently is not picked again`);
  }
});

test("revealKind: close when the two answers are connected, strange when the player's word ignores both prompts", () => {
  const lex = getLexicon("en");
  assert.equal(revealKind(lex, {prompts: null, mine: "zzzz", theirs: "sea"}), null, "move 1 is never strange");
  assert.equal(revealKind(lex, {prompts: ["sand", "shell"], mine: "beach", theirs: "sea"}), "close");
  assert.equal(revealKind(lex, {prompts: ["sand", "shell"], mine: "qwzzk", theirs: "sea"}), "strange");
  assert.equal(revealKind(lex, {prompts: ["sand", "shell"], mine: "violin", theirs: "sea"}), "strange");
  assert.equal(revealKind(lex, {prompts: ["sand", "shell"], mine: "beach", theirs: "violin"}), null, "on topic but not close to the other word");
});

test("characters are presentation only: no game, bot, storage or network code; picks are pure", async () => {
  for (const file of ["characters.js", "gary.js"]) {
    const source = await readFile(new URL(`../src/client/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from "\.\.\/shared\/|from "\.\/store|fetch\(|\/api\//, file);
  }
  for (const id of CHARACTER_IDS) {
    const a = pickReaction({character: id, status: "REVEALED", move: 6, kind: "close", recent: ["garyFine"], random: seededRandom(42)});
    const b = pickReaction({character: id, status: "REVEALED", move: 6, kind: "close", recent: ["garyFine"], random: seededRandom(42)});
    assert.deepEqual(a, b);
  }
});
