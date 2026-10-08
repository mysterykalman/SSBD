// The Solo characters (Gary, Milo): copy, reaction pools and the reaction picker. Presentation only.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CHARACTERS, CHARACTER_IDS, EARLY_MATCH, LATE_MATCH, LONG_TRAIL_AT, SEVERAL_MISSES_AT, character, characterId, characterKeys, cleverBridge, connectionStrength, copyKey, rematchLine, resultLines, revealKind, rotate, scriptedHelp, scriptedReaction, scriptedResult, scriptedResultPool} from "../src/client/characters.js";
import {garyBeats, oneOffKeys} from "../src/client/gary-narrative.js";
import {STRINGS} from "../src/client/i18n.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {seededRandom} from "../src/shared/rules.js";

// Titles, picker cards, Milo's script and each character's wording of shared Solo sentences may be longer than a quick remark.
const LONG_OK = new Set([...characterKeys("gary").filter(key => key.startsWith("gn.")), "garyIntroCta", "garyTitle", "garyMeetAgain", ...CHARACTER_IDS.flatMap(id => [...CHARACTERS[id].card, ...Object.values(CHARACTERS[id].copy), ...Object.values(CHARACTERS[id].results).flat(), ...Object.values(CHARACTERS[id].script || {}), ...Object.values(CHARACTERS[id].pools || {}).flat(), ...CHARACTERS[id].rating])]);

// Milo's approved script, word for word: one fixed line per milestone moment (ordinary result
// lines start their pools with the original line; see MILO_POOLS).
const MILO_SCRIPT = {
  start: "Okay, I’m ready.",
  firstTurn: "Okay, what are you thinking?",
  normalMiss: "Oh! Okay, I see where you’re going.",
  farApart: "Huh. I was not expecting that.",
  strong: "Wait, that was actually really good.",
  confident: "Okay, I think we’ve got this.",
  alreadyUsed: "We used that one already! Try another.",
  cantUse: "Oh, right. We already used that.",
  takingWhile: "No rush. I’m thinking too.",
  severalMisses: "I think we’re getting closer. Probably.",
  longTrail: "Okay, now I really want to see where this ends.",
  clever: "Ohhh. That’s clever.",
  oddGuess: "Okay, hear me out.",
  win: "YES! We got it!",
  postWin: "That was fun. Again?",
  fastWin: "Already?! Okay, we’re good at this.",
  longWin: "FINALLY. Okay, that was worth it.",
  encourage: "I think we’re close."
};
// Milo's rotating ordinary lines, word for word.
const MILO_POOLS = {
  strong: ["Wait, that was actually really good.", "Oh, that connects really well.", "Wait, that was a good one."],
  good: ["Oh! Okay, I see where you’re going.", "Yeah! I can see that.", "Okay, we’re definitely getting somewhere."],
  weak: ["Huh. Let’s see where that takes us.", "Oh! Okay, I see where you’re going."],
  farApart: ["Huh. I was not expecting that.", "Huh. Let’s see where that takes us."],
  general: ["Wait, okay, I can work with that.", "Ohhh, I think I see it.", "That was not where my brain went.", "Okay, this could get interesting.", "Hang on. I have an idea."]
};
// Milo's previous writing, which must be gone everywhere.
const OLD_MILO = ["Hi! I'm Milo!", "I LOVE words.", "Let's go go go!", "(I'm ready.)", "Ready. Probably too ready.", "Say hi to", "Let's play, Milo!", "let's gooo", "boing", "wiggling", "thinking hat", "socks", "snack thought", "happy spin", "wheee", "SO close", "almost twins", "wavelength", "plot twist", "I love a surprise", "still going! love it", "totally do this", "already?! amazing", "PHEW", "never gave up", "same word! same word!", "best. day. ever", "I was hoping you'd say that", "I stretched", "SO fun", "again tomorrow", "Ooh, that one's taken", "Keep going!", "Let's gooo!", "super fast", "REALLY ready", "big leap", "still grinning", "What a word adventure", "Ooh, nice connection"];

test("Gary and Milo share one config system: id, name, card, avatar, personality, voice; Gary's pools, Milo's script", () => {
  assert.deepEqual(CHARACTER_IDS, ["gary", "milo"]);
  for (const id of CHARACTER_IDS) {
    const c = CHARACTERS[id];
    assert.equal(c.id, id);
    assert.equal(c.art, id, "each character has its own portrait");
    assert.ok("voiceId" in c && typeof c.voiceStyle === "string" && c.voiceStyle);
    assert.ok(c.personality);
    assert.equal(c.card.length, 2, `${id} has a two-line picker card`);
  }
  // Gary: his branching narrative (src/client/gary-narrative.js), no random reaction pools at all.
  const gary = CHARACTERS.gary;
  assert.equal(gary.narrative, true);
  for (const pool of ["close", "strange", "earlyMatch", "lateMatch", "win", "middle", "nearEnd", "gameOver"]) assert.deepEqual(gary.lines[pool], [], `gary.${pool} is empty`);
  assert.deepEqual(Object.values(gary.lines.mismatch), []);
  assert.deepEqual(gary.results, {});
  assert.equal(gary.lines.rematch.length, 4);
  assert.equal(gary.script, undefined);
  // Milo: a script with exactly one key per approved moment, plus his own rotating ordinary pools.
  const milo = CHARACTERS.milo;
  assert.deepEqual(Object.keys(milo.script).sort(), Object.keys(MILO_SCRIPT).sort());
  assert.deepEqual(Object.keys(milo.pools).sort(), Object.keys(MILO_POOLS).sort());
  for (const pool of ["close", "strange", "earlyMatch", "lateMatch", "win", "rematch", "middle", "nearEnd"]) assert.deepEqual(milo.lines[pool], [], `milo.${pool} is empty`);
  assert.deepEqual(Object.values(milo.lines.mismatch), []);
  assert.equal(milo.intro, null, "the picker card is Milo's introduction");
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
  assert.equal(STRINGS.en.pickTitle, "Who do you want to play with?");
  // The picker cards, exactly as approved.
  assert.equal(STRINGS.en[CHARACTERS.gary.name], "Gary");
  assert.deepEqual(CHARACTERS.gary.card.map(key => STRINGS.en[key]), ["We heard you had no friends, so we lured Gary over from Accounting with the promise of cake.", "There is no cake."]);
  assert.equal(STRINGS.en[CHARACTERS.milo.name], "Milo");
  assert.deepEqual(CHARACTERS.milo.card.map(key => STRINGS.en[key]), ["I’ve been waiting, like, all day.", "Are you ready to play already?"]);
  assert.equal(STRINGS.en.pickStart.replace("{name}", "Gary"), "Play with Gary");
  assert.equal(STRINGS.en.pickStart.replace("{name}", "Milo"), "Play with Milo");
  // The deliberately odd line stays odd.
  assert.equal(STRINGS.en.garyIntro2, "I do words now.");
  assert.equal(STRINGS.fr.garyIntro2, "Je fais des mots maintenant.");
});

test("the choice is personality, never difficulty, age or machine", () => {
  const keys = [...new Set([...characterKeys("gary"), ...characterKeys("milo"), "pickTitle", "pickStart", "soloStart"])];
  for (const lang of ["en", "fr"]) {
    for (const key of keys) {
      const value = STRINGS[lang][key];
      assert.doesNotMatch(value, /typing|tape un message|online|en ligne|joined|rejoint|connected|connecté|\bbot\b|robot|computer|ordinateur/i, `${lang}.${key}`);
      assert.doesNotMatch(value, /\b(AI|IA|CPU)\b/, `${lang}.${key}`);
      // (Gary's in-game narrative may say "level of expectation"; the choice itself never mentions difficulty.)
      if (!key.startsWith("gn.")) assert.doesNotMatch(value, /\b(easy|hard|difficult\w*|level|kids?|child\w*|baby|facile|difficile|niveau|enfants?|bébé)\b/i, `${lang}.${key}: ${value}`);
    }
    for (const value of Object.values(STRINGS[lang])) assert.doesNotMatch(value, /\bbot\b|robot|\bpip\b/i, `"bot"/"robot"/"Pip" in ${lang} copy: ${value}`);
  }
});

test("Milo's in-game script and pools are exactly the approved ones, and nothing of his old writing is left", async () => {
  const milo = CHARACTERS.milo;
  for (const [moment, text] of Object.entries(MILO_SCRIPT)) assert.equal(STRINGS.en[milo.script[moment]], text, moment);
  for (const [pool, texts] of Object.entries(MILO_POOLS)) assert.deepEqual(milo.pools[pool].map(key => STRINGS.en[key]), texts, pool);
  // Every Milo string in the app is his name, his card or one of these lines: no extras.
  const allowed = new Set([milo.name, ...milo.card, ...Object.values(milo.script), ...Object.values(milo.pools).flat(), ...milo.rating]);
  assert.deepEqual(milo.rating.map(key => STRINGS.en[key]), ["Okay, important question.", "How much fun was that?"], "his rating question, exactly");
  assert.deepEqual(CHARACTERS.gary.rating.map(key => STRINGS.en[key]), ["Gary’s boss wants feedback.", "Apparently “showed up” isn’t enough anymore."], "Gary's, exactly");
  for (const lang of ["en", "fr"]) {
    for (const key of Object.keys(STRINGS[lang]).filter(k => k.startsWith("milo"))) assert.ok(allowed.has(key), `${lang}.${key} is not in the approved script`);
    for (const key of characterKeys("milo")) assert.ok(STRINGS[lang][key], `${lang}.${key}`);
  }
  // One line per moment: no two moments share a key or a text.
  assert.equal(new Set(Object.values(milo.script)).size, Object.keys(MILO_SCRIPT).length - 0);
  // The old writing is gone from every string (both languages) and from the character config.
  const config = await readFile(new URL("../src/client/characters.js", import.meta.url), "utf8");
  for (const old of OLD_MILO) {
    for (const lang of ["en", "fr"]) for (const value of Object.values(STRINGS[lang])) assert.ok(!value.toLowerCase().includes(old.toLowerCase()), `old Milo copy "${old}" still in ${lang}: ${value}`);
    assert.ok(!config.includes(old), `old Milo copy "${old}" in characters.js`);
  }
  // Milo never borrows Gary's dialogue.
  const gary = new Set(characterKeys("gary").map(key => STRINGS.en[key]));
  for (const key of characterKeys("milo")) assert.ok(!gary.has(STRINGS.en[key]), key);
});

test("shared Solo copy suits both characters; each character's own wording keeps the same information", () => {
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  // Strings both characters share never name or describe just one of them.
  const shared = ["pickTitle", "pickStart", "soloStart", "revealBotWord", "revealMatchTitle", "revealMatchCopy", "winTitle", "winCopy", "playAgainWith", "nowHint", "nowHintSub", "promptTitle", "promptCopy", "revealSeeEnd"];
  for (const lang of ["en", "fr"]) {
    for (const key of shared) assert.doesNotMatch(STRINGS[lang][key], /gary|milo|comptab|accounting|\b(he|his|him|il|lui)\b/i, `${lang}.${key}: ${STRINGS[lang][key]}`);
    // The homepage tile introduces both of them.
    assert.match(STRINGS[lang].soloBody2, /Gary/);
    assert.match(STRINGS[lang].soloBody, /Milo/);
  }
  assert.equal(STRINGS.en.soloTitle, "Solo Play");
  assert.equal(STRINGS.en.soloBody, "Milo finished his homework early, so now he’s free to play.");
  assert.equal(STRINGS.en.soloBody2, "We couldn’t find anyone else, so we got Gary from Accounting. HR said this counts as team building.");
  assert.equal(STRINGS.en.soloStart, "Choose your player");
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
  // Milo's lines come only from his script: shared system sentences stay neutral for him.
  for (const key of ["firstSolo", "revealNice", "revealNextStarts", "keepPlaying", "gameOverAww", "gameOverCopy"]) assert.equal(copyKey("milo", key), key, `${key} stays neutral for Milo`);
  assert.equal(copyKey("milo", "revealLoose"), CHARACTERS.milo.script.oddGuess, "his own odd guess");
  for (const code of ["ALREADY_USED", "SAME_AS_LAST"]) assert.equal(copyKey("milo", `err${code}`), CHARACTERS.milo.script.alreadyUsed);
  // Gary's own wording; buttons stay plain and functional for him.
  assert.equal(STRINGS.en[copyKey("gary", "firstSolo")], "Type any word you like. Gary is thinking. This was not on his calendar. Then you both reveal!");
  assert.equal(STRINGS.en[copyKey("gary", "botReady")], "Gary has a word. Apparently we're doing this.");
  assert.equal(STRINGS.en[copyKey("gary", "revealNextStarts")], "Fine. Now try {a} + {b}.");
  assert.equal(STRINGS.en[copyKey("gary", "gameOverCopy")], "Twenty moves. Gary would like this meeting to end.");
  assert.equal(STRINGS.en[copyKey("gary", "gameOverAww")], "No match. Gary is pretending this was the expected outcome.");
  assert.equal(STRINGS.en[copyKey("gary", "keepPlaying")], "Keep playing");
});

test("an already-played word: one plain Together message, and each character's own short line in Solo", () => {
  assert.equal(STRINGS.en.errALREADY_USED, "That word has already been played.");
  assert.equal(STRINGS.fr.errALREADY_USED, "Ce mot a déjà été joué.");
  assert.equal(copyKey("milo", "errALREADY_USED"), "miloAlreadyUsed");
  assert.equal(STRINGS.en.miloAlreadyUsed, "We used that one already! Try another.");
  // Gary rotates through his four exact lines (see gary-narrative.test.mjs).
  assert.deepEqual(oneOffKeys("alreadyUsed").map(key => STRINGS.en[key]), ["We already used that one. I checked.", "That word’s already been played. Unfortunately, I remember.", "We used that already. Try another one.", "Already played. I have notes."]);
  for (const lang of ["en", "fr"]) {
    for (const key of ["errALREADY_USED", "miloAlreadyUsed", ...oneOffKeys("alreadyUsed")]) assert.ok(STRINGS[lang][key].length <= 70, `${lang}.${key} is short enough for gameplay`);
    for (const key of oneOffKeys("alreadyUsed")) assert.doesNotMatch(STRINGS[lang][key], /!/, "Gary does not exclaim");
    assert.match(STRINGS[lang].miloAlreadyUsed, /!/, "Milo does");
  }
});

test("connection strength (what Gary's narrative reads): opening, strong, good, weak, very weak", () => {
  const lex = getLexicon("en");
  const cases = [[null, "beach", "opening"], [["sand", "shell"], "beach", "strong"], [["sand", "shell"], "castle", "good"], [["jogging", "sea"], "sport", "weak"], [["sand", "shell"], "violin", "veryWeak"], [["sand", "shell"], "qwzzk", "veryWeak"]];
  for (const [prompts, mine, strength] of cases) assert.equal(connectionStrength(lex, {prompts, mine}), strength, `${prompts}: ${mine}`);
});

test("Gary's voice: dry, reluctant, understated; never excited, gloomy or mean; not all accounting jokes", () => {
  const c = CHARACTERS.gary;
  // Everything Gary himself says (system sentences in his wording included, minus their neutral instruction part).
  const said = [...characterKeys("gary").filter(key => key.startsWith("gn.")), ...Object.values(c.copy), ...c.intro.lines];
  for (const lang of ["en", "fr"]) {
    for (const key of said) {
      const text = STRINGS[lang][key].replace(/^(Type any word you like|Tape le mot que tu veux)\. /, "").replace(/ (Then you both reveal|Ensuite, vous révélez vos mots en même temps)[\s\u202f]?!$/, "");
      assert.doesNotMatch(text, /!/, `${lang}.${key} is never exclaimed: ${text}`);
      assert.doesNotMatch(text, /\b(amazing|awesome|yay|woo+|great job|love|génial|super|trop bien|youpi|j’adore)\b/i, `${lang}.${key} is not excited`);
      assert.doesNotMatch(text, /\b(sad|cry|lonely|miserable|hate|alone|triste|pleure|seul|déteste)\b/i, `${lang}.${key} is not gloomy`);
      assert.doesNotMatch(text, /\byou('re| are| were)? (bad|wrong|terrible|awful|slow)|\bterrible|\bnul\b|\bstupid|\bdumb/i, `${lang}.${key} is never mean to the player`);
    }
  }
  // Attitude carries the humour: office/accounting references stay rare.
  const office = said.filter(key => /calendar|meeting|spreadsheet|tax|invoice|account|for the file|a pen\b/i.test(STRINGS.en[key]));
  assert.ok(office.length <= 4, `office jokes: ${office}`);
  // Gary and Milo never share a line of dialogue.
  const milo = new Set(characterKeys("milo").map(key => STRINGS.en[key].toLowerCase()));
  for (const key of said) assert.ok(!milo.has(STRINGS.en[key].toLowerCase()), key);
});

test("Milo's script is wired to each game moment: fixed milestone lines, ordinary results from his pools", () => {
  const script = CHARACTERS.milo.script;
  const line = key => STRINGS.en[key];
  const lex = getLexicon("en");
  // Start of a game (fresh or Play again), and the line above the word box.
  assert.equal(line(rematchLine("milo", () => 0)), MILO_SCRIPT.start);
  assert.equal(line(rematchLine("milo", () => 0.99)), MILO_SCRIPT.start);
  assert.equal(line(scriptedHelp(script, {move: 1})), MILO_SCRIPT.firstTurn);
  for (const move of [2, 7, 19]) assert.equal(line(scriptedHelp(script, {move})), MILO_SCRIPT.encourage);
  for (const move of [1, 5]) assert.equal(line(scriptedHelp(script, {move, idle: true})), MILO_SCRIPT.takingWhile);
  // The reveal result, by how the player's word fits the two words in play (and Milo's word).
  const round = (prompts, mine, theirs) => ({strength: connectionStrength(lex, {prompts, mine}), close: revealKind(lex, {prompts, mine, theirs}) === "close", clever: cleverBridge(lex, {prompts, mine})});
  const result = (prompts, mine, theirs, index = 0) => line(scriptedResult(script, round(prompts, mine, theirs), {seed: "m", index}));
  const pool = (prompts, mine, theirs) => scriptedResultPool(round(prompts, mine, theirs));
  assert.equal(pool(["sand", "shell"], "violin", "sea"), "farApart");
  assert.equal(pool(["sand", "shell"], "qwzzk", "sea"), "farApart");
  assert.equal(result(["sand", "shell"], "beach", "sea"), MILO_SCRIPT.confident, "strong and close to Milo's word: fixed");
  assert.equal(pool(["sand", "shell"], "beach", "violin"), "strong");
  assert.equal(result(["sand", "shell"], "sun", "violin"), MILO_SCRIPT.clever, "an indirect bridge to both words: fixed");
  assert.equal(pool(["sand", "shell"], "castle", "violin"), "good");
  assert.equal(pool(["jogging", "sea"], "sport", "violin"), "weak");
  assert.equal(pool(null, "garden", "music"), "good", "move 1");
  for (let index = 0; index < 6; index++) {
    assert.ok(MILO_POOLS.farApart.includes(result(["sand", "shell"], "violin", "sea", index)));
    assert.ok(MILO_POOLS.strong.includes(result(["sand", "shell"], "beach", "violin", index)));
    assert.ok(MILO_POOLS.good.includes(result(["sand", "shell"], "castle", "violin", index)));
  }
  assert.equal(STRINGS.en[copyKey("milo", "revealLoose")], MILO_SCRIPT.oddGuess);
  // Milestone speech bubbles: exact and fixed.
  const react = args => scriptedReaction(script, {recent: [], ...args})?.keys.map(line);
  assert.deepEqual(react({status: "MATCHED", move: 1}), [MILO_SCRIPT.fastWin]);
  assert.deepEqual(react({status: "MATCHED", move: EARLY_MATCH}), [MILO_SCRIPT.fastWin]);
  assert.deepEqual(react({status: "MATCHED", move: 7}), [MILO_SCRIPT.win]);
  assert.deepEqual(react({status: "MATCHED", move: LATE_MATCH}), [MILO_SCRIPT.longWin]);
  assert.deepEqual(react({status: "REVEALED", move: 4, cantUse: true}), [MILO_SCRIPT.cantUse]);
  assert.deepEqual(react({status: "REVEALED", move: SEVERAL_MISSES_AT}), [MILO_SCRIPT.severalMisses]);
  assert.equal(react({status: "REVEALED", move: SEVERAL_MISSES_AT, recent: [script.severalMisses]}), undefined, "said once");
  assert.deepEqual(react({status: "REVEALED", move: LONG_TRAIL_AT}), [MILO_SCRIPT.longTrail]);
  for (const move of [2, 4, 10, 18]) assert.equal(react({status: "REVEALED", move, random: () => 0.99}), undefined, "usually nothing extra on an ordinary miss");
  for (const move of [2, 4, 10, 18]) assert.ok(MILO_POOLS.general.includes(react({status: "REVEALED", move, random: () => 0})[0]), "now and then a general line");
  assert.equal(react({status: "EXHAUSTED", move: 20}), undefined);
  assert.deepEqual(CHARACTERS.milo.lines.gameOver.map(line), [MILO_SCRIPT.postWin], "the post-game line");
  assert.equal(STRINGS.en[CHARACTERS.milo.script.postWin], MILO_SCRIPT.postWin);
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
  for (const file of ["characters.js", "gary.js", "gary-narrative.js"]) {
    const source = await readFile(new URL(`../src/client/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from "\.\.\/shared\/|from "\.\/store|fetch\(|\/api\//, file);
    // Gary's narrative stores nothing: every beat is re-derived from the game itself.
    if (file === "gary-narrative.js") assert.doesNotMatch(source, /localStorage|sessionStorage|import /, file);
  }
  const rounds = [{number: 1, status: "REVEALED", strength: "opening", kind: null}, {number: 2, status: "REVEALED", strength: "good", kind: "close"}];
  assert.deepEqual(garyBeats("g", rounds), garyBeats("g", rounds));
  const a = scriptedReaction(CHARACTERS.milo.script, {status: "REVEALED", move: 6, random: seededRandom(42), gameId: "m"});
  const b = scriptedReaction(CHARACTERS.milo.script, {status: "REVEALED", move: 6, random: seededRandom(42), gameId: "m"});
  assert.deepEqual(a, b);
});

// ---------- rotating reaction pools ----------

test("rotation: no line repeats until the pool is used up, never twice in a row, and games start at different lines", () => {
  const list = ["a", "b", "c", "d", "e"];
  for (const seed of ["g1", "g2", "g3", "game-xyz"]) {
    const run = Array.from({length: 15}, (_, index) => rotate(list, {seed, index}));
    for (let cycle = 0; cycle < 3; cycle++) assert.deepEqual([...run.slice(cycle * 5, cycle * 5 + 5)].sort(), list, "each cycle uses every line once");
    for (let i = 1; i < run.length; i++) assert.notEqual(run[i], run[i - 1], `${seed}: no immediate repeat`);
  }
  const starts = new Set(Array.from({length: 40}, (_, i) => rotate(list, {seed: `game-${i}`, index: 0})));
  assert.ok(starts.size >= 4, "different games begin with different lines");
  // Avoided lines are skipped while anything else is left.
  assert.notEqual(rotate(list, {seed: "g1", index: 0, avoid: [rotate(list, {seed: "g1", index: 0})]}), rotate(list, {seed: "g1", index: 0}));
  assert.equal(rotate(["only"], {seed: "g", index: 3, avoid: ["only"]}), "only");
});

test("result lines: strong stays strong, weak stays weak, each pool rotates, and a reload gives the same lines", () => {
  const rounds = [
    {strength: "strong", close: false, clever: false}, {strength: "strong", close: false, clever: false}, {strength: "good", close: false, clever: false},
    {strength: "strong", close: false, clever: false}, {strength: "weak", close: false, clever: false}, {strength: "veryWeak", close: false, clever: false},
    {strength: "weak", close: false, clever: false}, {strength: "good", close: false, clever: false}, {strength: "good", close: false, clever: false}
  ];
  for (const id of ["milo"]) { // Gary has no result pools: his narrative covers the reveal
    const c = CHARACTERS[id];
    const poolOf = round => (c.script ? scriptedResultPool(round) : round.strength);
    const listOf = round => (c.script ? c.pools[poolOf(round)] : c.results[round.strength]);
    for (const gameId of ["a", "b", "c"]) {
      const keys = resultLines(id, gameId, rounds);
      assert.deepEqual(resultLines(id, gameId, rounds), keys, "pure: the same game gives the same lines");
      keys.forEach((key, i) => assert.ok(listOf(rounds[i]).includes(key), `${id}: ${rounds[i].strength} → ${key}`));
      for (let i = 1; i < keys.length; i++) assert.notEqual(keys[i], keys[i - 1], `${id} ${gameId}: no immediate repeat`);
      // The three strong rounds use three different strong lines.
      const strong = keys.filter((_, i) => rounds[i].strength === "strong");
      assert.equal(new Set(strong).size, 3, `${id}: ${strong}`);
    }
    // Strong lines are never offered for a weak word and vice versa.
    const strongTexts = new Set((c.script ? c.pools.strong : c.results.strong).map(k => STRINGS.en[k]));
    const weakTexts = (c.script ? [...c.pools.weak, ...c.pools.farApart] : [...c.results.weak, ...c.results.veryWeak]).map(k => STRINGS.en[k]);
    for (const text of weakTexts) assert.ok(!strongTexts.has(text), `${id}: "${text}" is both weak and strong`);
  }
  const firsts = new Set(["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"].map(gameId => resultLines("milo", gameId, [rounds[0]])[0]));
  assert.ok(firsts.size >= 2, "games do not all open with the same strong line");
});

test("Gary never gets Milo's lines and Milo never gets Gary's, in every pool", () => {
  const garyKeys = new Set(characterKeys("gary")), miloKeys = new Set(characterKeys("milo"));
  for (const key of garyKeys) assert.ok(!miloKeys.has(key), key);
  const garyTexts = new Set([...garyKeys].map(k => STRINGS.en[k])), miloTexts = new Set([...miloKeys].map(k => STRINGS.en[k]));
  for (const text of miloTexts) assert.ok(!garyTexts.has(text), text);
  for (let i = 0; i < 200; i++) {
    const rounds = [{number: 1, status: "REVEALED", strength: "opening", kind: null}, {number: 2, status: i % 2 ? "MATCHED" : "REVEALED", strength: "strong", kind: null}];
    for (const beat of garyBeats(`g${i}`, rounds)) for (const key of [beat.before, beat.after, beat.extra].filter(Boolean)) assert.ok(garyKeys.has(key) && !miloKeys.has(key), key);
    const m = scriptedReaction(CHARACTERS.milo.script, {status: "REVEALED", move: 5, random: seededRandom(i), gameId: `m${i}`, turn: () => i});
    if (m) for (const key of m.keys) assert.ok(miloKeys.has(key) && !garyKeys.has(key), key);
  }
});
