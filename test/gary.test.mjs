// The Solo characters (Gary, Milo): copy, reaction pools and the reaction picker. Presentation only.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CHARACTERS, CHARACTER_IDS, EARLY_MATCH, LATE_MATCH, LONG_TRAIL_AT, REACTION_CHANCE, SEVERAL_MISSES_AT, character, characterId, characterKeys, cleverBridge, connectionStrength, copyKey, pickReaction, rematchLine, resultAvoid, resultKey, resultLines, revealKind, rotate, scriptedHelp, scriptedReaction, scriptedResult, scriptedResultPool} from "../src/client/characters.js";
import {STRINGS} from "../src/client/i18n.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {seededRandom} from "../src/shared/rules.js";

// Titles, picker cards, Milo's script and each character's wording of shared Solo sentences may be longer than a quick remark.
const LONG_OK = new Set(["garyIntroCta", "garyTitle", "garyMeetAgain", ...CHARACTER_IDS.flatMap(id => [...CHARACTERS[id].card, ...Object.values(CHARACTERS[id].copy), ...Object.values(CHARACTERS[id].results).flat(), ...Object.values(CHARACTERS[id].script || {}), ...Object.values(CHARACTERS[id].pools || {}).flat(), ...CHARACTERS[id].rating])]);

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
// Gary's result pools, word for word (the first line of each is the original).
const GARY_RESULTS = {
  opening: ["Okay. That's a start."],
  strong: ["That was annoyingly good.", "Annoyingly, that works.", "I was hoping that wouldn’t make sense."],
  good: ["Okay. That actually makes sense.", "Fine. I can follow that.", "That’s more reasonable than I expected."],
  weak: ["Gary has questions.", "I’m going to need you to explain yourself."],
  veryWeak: ["That feels legally questionable.", "I’m going to need you to explain yourself."]
};
const GARY_NEW_REACTIONS = ["that’s one way to get there", "I’m writing that down for legal reasons", "sure. why not.", "I don’t remember agreeing to this", "that somehow made things worse"];
// Milo's previous writing, which must be gone everywhere.
const OLD_MILO = ["Hi! I'm Milo!", "I LOVE words.", "Let's go go go!", "(I'm ready.)", "Ready. Probably too ready.", "Say hi to", "Let's play, Milo!", "let's gooo", "boing", "wiggling", "thinking hat", "socks", "snack thought", "happy spin", "wheee", "SO close", "almost twins", "wavelength", "plot twist", "I love a surprise", "still going! love it", "totally do this", "already?! amazing", "PHEW", "never gave up", "same word! same word!", "best. day. ever", "I was hoping you'd say that", "I stretched", "SO fun", "again tomorrow", "Ooh, that one's taken", "Keep going!", "Let's gooo!", "super fast", "REALLY ready", "big leap", "still grinning", "What a word adventure", "Ooh, nice connection"];
const flat = list => list.flat().filter(key => key !== "before" && key !== "after");

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
  const gary = CHARACTERS.gary;
  for (const pool of ["close", "strange", "earlyMatch", "lateMatch", "win", "rematch", "middle", "nearEnd"]) assert.ok(gary.lines[pool].length, `gary.${pool}`);
  assert.ok(Object.values(gary.lines.mismatch).flat().length >= 10, "Gary has plenty of mismatch lines");
  assert.equal(gary.lines.gameOver.length, 2);
  assert.equal(gary.script, undefined, "Gary keeps his own script and pools");
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
    assert.match(STRINGS[lang].soloBody, /Gary/);
    assert.match(STRINGS[lang].soloBody, /Milo/);
  }
  assert.equal(STRINGS.en.soloTitle, "Friends not around?");
  assert.equal(STRINGS.en.soloBody, "Hang out with Milo or Gary from Accounting.");
  assert.equal(STRINGS.en.soloStart, "Choose someone");
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
  assert.equal(copyKey("gary", "errALREADY_USED"), "garyAlreadyUsed");
  assert.equal(copyKey("milo", "errALREADY_USED"), "miloAlreadyUsed");
  assert.equal(STRINGS.en.garyAlreadyUsed, "Already played. Gary checked. Twice.");
  assert.equal(STRINGS.en.miloAlreadyUsed, "We used that one already! Try another.");
  for (const lang of ["en", "fr"]) {
    for (const key of ["errALREADY_USED", "garyAlreadyUsed", "miloAlreadyUsed"]) assert.ok(STRINGS[lang][key].length <= 50, `${lang}.${key} is short enough for gameplay`);
    assert.doesNotMatch(STRINGS[lang].garyAlreadyUsed, /!/, "Gary does not exclaim");
    assert.match(STRINGS[lang].miloAlreadyUsed, /!/, "Milo does");
  }
});

test("Gary's reveal result follows how well the word fits", () => {
  const lex = getLexicon("en");
  const cases = [[null, "beach", "opening"], [["sand", "shell"], "beach", "strong"], [["sand", "shell"], "castle", "good"], [["jogging", "sea"], "sport", "weak"], [["sand", "shell"], "violin", "veryWeak"], [["sand", "shell"], "qwzzk", "veryWeak"]];
  for (const [prompts, mine, strength] of cases) assert.equal(connectionStrength(lex, {prompts, mine}), strength, `${prompts}: ${mine}`);
  for (const [strength, texts] of Object.entries(GARY_RESULTS)) {
    assert.deepEqual(CHARACTERS.gary.results[strength].map(key => STRINGS.en[key]), texts, strength);
    for (let index = 0; index < 6; index++) assert.ok(texts.includes(STRINGS.en[resultKey("gary", strength, {seed: "g", index})]), strength);
  }
  // After "That was annoyingly good." Gary never also remarks "that's annoyingly good".
  assert.deepEqual(resultAvoid("gary", "strong"), ["garyAnnoyinglyGood"]);
  for (let i = 0; i < 500; i++) {
    const pick = pickReaction({character: "gary", status: "REVEALED", move: 4, recent: resultAvoid("gary", "strong"), random: seededRandom(i)});
    assert.notDeepEqual(pick?.keys, ["garyAnnoyinglyGood"]);
  }
});

test("Gary's voice: dry, reluctant, understated; never excited, gloomy or mean; not all accounting jokes", () => {
  const c = CHARACTERS.gary;
  // Everything Gary himself says (system sentences in his wording included, minus their neutral instruction part).
  const said = [...flat(Object.values(c.lines.mismatch).flat()), ...flat(c.lines.close), ...flat(c.lines.strange), ...c.lines.middle, ...c.lines.nearEnd,
    ...flat([...c.lines.earlyMatch, ...c.lines.lateMatch, ...c.lines.win]), ...c.lines.rematch, ...c.lines.gameOver, ...Object.values(c.results).flat(),
    ...Object.values(c.copy), ...c.intro.lines];
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
  // Win: Gary is not suddenly excited.
  assert.ok(c.lines.win.some(([, key]) => key === "garyImpressive"));
  assert.equal(STRINGS.en.garyImpressive, "well. that's inconveniently impressive");
});

test("Gary speaks on roughly a third of ordinary reveals, and only from his own pools", () => {
  for (const id of ["gary"]) {
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

test("each moment uses Gary's own pool: close, strange, early match, match, late match, long game, rematch", () => {
  for (const id of ["gary"]) {
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
  // A match line is "..." then one of his win lines; no character means Gary.
  const win = pickReaction({character: "gary", status: "MATCHED", move: 5, recent: [], random: () => 0}).keys;
  assert.equal(win[0], "garyDots");
  assert.ok(CHARACTERS.gary.lines.win.some(([, key]) => key === win[1]));
  const noCharacter = pickReaction({status: "REVEALED", move: 1, recent: [], random: () => 0.1, gameId: "x"});
  assert.deepEqual(noCharacter, pickReaction({character: "gary", status: "REVEALED", move: 1, recent: [], random: () => 0.1, gameId: "x"}), "no character means Gary");
});

test("Gary's reactions avoid recent repeats", () => {
  for (const id of ["gary"]) {
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

// ---------- rotating reaction pools ----------

test("Gary has his new general reactions in fitting pools, and several ordinary variants; so does Milo", () => {
  const gary = CHARACTERS.gary;
  const mismatch = Object.values(gary.lines.mismatch).flat().map(([key]) => STRINGS.en[key]);
  for (const text of GARY_NEW_REACTIONS) assert.ok(mismatch.includes(text), text);
  // The new ones never land in the grudging-praise mood (competitive).
  for (const [key] of gary.lines.mismatch.competitive) assert.ok(!GARY_NEW_REACTIONS.includes(STRINGS.en[key]));
  for (const pool of ["strong", "good"]) assert.ok(gary.results[pool].length >= 3, `gary.${pool}`);
  assert.ok(CHARACTERS.milo.pools.general.length >= 5 && CHARACTERS.milo.pools.strong.length >= 3 && CHARACTERS.milo.pools.good.length >= 3);
});

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

test("Gary's ordinary remarks cycle through a mood before repeating, and weak words never get grudging praise", () => {
  for (const gameId of ["one", "two", "three"]) {
    const counts = {};
    const turn = pool => (counts[pool] = (counts[pool] ?? -1) + 1);
    const said = [];
    for (let move = 2; move < 40; move++) {
      const pick = pickReaction({character: "gary", status: "REVEALED", move: 4, strength: "weak", recent: [], random: () => 0, gameId, turn});
      said.push(pick.keys[0]);
    }
    for (let i = 1; i < said.length; i++) assert.notEqual(said[i], said[i - 1], `${gameId}: no immediate repeat`);
    const praise = new Set(CHARACTERS.gary.lines.mismatch.competitive.map(([key]) => key));
    assert.ok(said.every(key => !praise.has(key)), "weak → no grudging praise");
    // Each mood's lines are all used before any of them repeats.
    const byMood = {};
    for (const key of said) {
      const mood = Object.entries(CHARACTERS.gary.lines.mismatch).find(([, lines]) => lines.some(([k]) => k === key))[0];
      (byMood[mood] ||= []).push(key);
    }
    for (const [mood, keys] of Object.entries(byMood)) {
      const size = CHARACTERS.gary.lines.mismatch[mood].length;
      assert.equal(new Set(keys.slice(0, size)).size, Math.min(size, keys.length), `${gameId} ${mood}`);
    }
  }
});

test("result lines: strong stays strong, weak stays weak, each pool rotates, and a reload gives the same lines", () => {
  const rounds = [
    {strength: "strong", close: false, clever: false}, {strength: "strong", close: false, clever: false}, {strength: "good", close: false, clever: false},
    {strength: "strong", close: false, clever: false}, {strength: "weak", close: false, clever: false}, {strength: "veryWeak", close: false, clever: false},
    {strength: "weak", close: false, clever: false}, {strength: "good", close: false, clever: false}, {strength: "good", close: false, clever: false}
  ];
  for (const id of CHARACTER_IDS) {
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
  const firsts = new Set(["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"].map(gameId => resultLines("gary", gameId, [rounds[0]])[0]));
  assert.ok(firsts.size >= 2, "games do not all open with the same strong line");
});

test("Gary never gets Milo's lines and Milo never gets Gary's, in every pool", () => {
  const garyKeys = new Set(characterKeys("gary")), miloKeys = new Set(characterKeys("milo"));
  for (const key of garyKeys) assert.ok(!miloKeys.has(key) || key === "garyDots", key);
  const garyTexts = new Set([...garyKeys].map(k => STRINGS.en[k])), miloTexts = new Set([...miloKeys].map(k => STRINGS.en[k]));
  for (const text of miloTexts) assert.ok(!garyTexts.has(text), text);
  for (let i = 0; i < 200; i++) {
    const g = pickReaction({character: "gary", status: "REVEALED", move: 5, random: seededRandom(i), gameId: `g${i}`, turn: () => i});
    if (g) for (const key of g.keys) assert.ok(garyKeys.has(key), key);
    const m = scriptedReaction(CHARACTERS.milo.script, {status: "REVEALED", move: 5, random: seededRandom(i), gameId: `m${i}`, turn: () => i});
    if (m) for (const key of m.keys) assert.ok(miloKeys.has(key) && !garyKeys.has(key), key);
  }
});
