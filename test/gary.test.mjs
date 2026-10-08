// The Solo characters (Gary, Milo): copy, reaction pools and the reaction picker. Presentation only.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CHARACTERS, CHARACTER_IDS, EARLY_MATCH, LATE_MATCH, LONG_TRAIL_AT, REACTION_CHANCE, SEVERAL_MISSES_AT, character, characterId, characterKeys, cleverBridge, connectionStrength, copyKey, pickReaction, rematchLine, resultAvoid, resultKey, revealKind, scriptedHelp, scriptedReaction, scriptedResult} from "../src/client/characters.js";
import {STRINGS} from "../src/client/i18n.js";
import {getLexicon} from "../src/shared/lexicon/index.js";
import {seededRandom} from "../src/shared/rules.js";

// Titles, picker cards, Milo's script and each character's wording of shared Solo sentences may be longer than a quick remark.
const LONG_OK = new Set(["garyIntroCta", "garyTitle", "garyMeetAgain", ...CHARACTER_IDS.flatMap(id => [...CHARACTERS[id].card, ...Object.values(CHARACTERS[id].copy), ...Object.values(CHARACTERS[id].results), ...Object.values(CHARACTERS[id].script || {})])]);

// Milo's approved script, word for word: one line per game moment.
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
  // Milo: a script with exactly one key per approved moment, no pools to pick from at random.
  const milo = CHARACTERS.milo;
  assert.deepEqual(Object.keys(milo.script).sort(), Object.keys(MILO_SCRIPT).sort());
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

test("Milo's in-game script is exactly the approved one, and nothing of his old writing is left", async () => {
  const milo = CHARACTERS.milo;
  for (const [moment, text] of Object.entries(MILO_SCRIPT)) assert.equal(STRINGS.en[milo.script[moment]], text, moment);
  // Every Milo string in the app is his name, his card or one of these lines: no extras, no variants.
  const allowed = new Set([milo.name, ...milo.card, ...Object.values(milo.script)]);
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
  assert.deepEqual(["opening", "strong", "good", "weak", "veryWeak"].map(s => STRINGS.en[resultKey("gary", s)]),
    ["Okay. That's a start.", "That was annoyingly good.", "Okay. That actually makes sense.", "Gary has questions.", "That feels legally questionable."]);
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
    ...flat([...c.lines.earlyMatch, ...c.lines.lateMatch, ...c.lines.win]), ...c.lines.rematch, ...c.lines.gameOver, ...Object.values(c.results),
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
  // Gary's lines are unchanged where they were already used.
  assert.deepEqual(pickReaction({character: "gary", status: "MATCHED", move: 5, recent: [], random: () => 0}).keys, ["garyDots", "garyInconvenient"]);
  assert.deepEqual(pickReaction({character: "gary", status: "REVEALED", move: 1, recent: [], random: () => 0.1}).keys, ["garySigh"]);
  assert.deepEqual(pickReaction({status: "REVEALED", move: 1, recent: [], random: () => 0.1}).keys, ["garySigh"], "no character means Gary");
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

test("Milo's script is wired to each game moment, one canonical line each, never at random", () => {
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
  const result = (prompts, mine, theirs) => line(scriptedResult(script, {
    strength: connectionStrength(lex, {prompts, mine}), close: revealKind(lex, {prompts, mine, theirs}) === "close", clever: cleverBridge(lex, {prompts, mine})
  }));
  assert.equal(result(["sand", "shell"], "violin", "sea"), MILO_SCRIPT.farApart);
  assert.equal(result(["sand", "shell"], "qwzzk", "sea"), MILO_SCRIPT.farApart);
  assert.equal(result(["sand", "shell"], "beach", "sea"), MILO_SCRIPT.confident, "strong and close to Milo's word");
  assert.equal(result(["sand", "shell"], "beach", "violin"), MILO_SCRIPT.strong);
  assert.equal(result(["sand", "shell"], "sun", "violin"), MILO_SCRIPT.clever, "an indirect bridge to both words");
  assert.equal(result(["sand", "shell"], "castle", "violin"), MILO_SCRIPT.normalMiss);
  assert.equal(result(null, "garden", "music"), MILO_SCRIPT.normalMiss, "move 1");
  assert.equal(STRINGS.en[copyKey("milo", "revealLoose")], MILO_SCRIPT.oddGuess);
  // Speech bubbles: exact, deterministic (no random source at all).
  const react = args => scriptedReaction(script, {recent: [], ...args})?.keys.map(line);
  assert.deepEqual(react({status: "MATCHED", move: 1}), [MILO_SCRIPT.fastWin]);
  assert.deepEqual(react({status: "MATCHED", move: EARLY_MATCH}), [MILO_SCRIPT.fastWin]);
  assert.deepEqual(react({status: "MATCHED", move: 7}), [MILO_SCRIPT.win]);
  assert.deepEqual(react({status: "MATCHED", move: LATE_MATCH}), [MILO_SCRIPT.longWin]);
  assert.deepEqual(react({status: "REVEALED", move: 4, cantUse: true}), [MILO_SCRIPT.cantUse]);
  assert.deepEqual(react({status: "REVEALED", move: SEVERAL_MISSES_AT}), [MILO_SCRIPT.severalMisses]);
  assert.equal(react({status: "REVEALED", move: SEVERAL_MISSES_AT, recent: [script.severalMisses]}), undefined, "said once");
  assert.deepEqual(react({status: "REVEALED", move: LONG_TRAIL_AT}), [MILO_SCRIPT.longTrail]);
  for (const move of [2, 4, 10, 18]) assert.equal(react({status: "REVEALED", move}), undefined, "nothing extra on an ordinary miss");
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
