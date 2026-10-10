// The Solo characters (Gary, Milo): config, copy and their narratives. Presentation only.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CHARACTERS, CHARACTER_IDS, character, characterId, characterKeys, connectionStrength, copyKey, rematchLine, revealKind} from "../src/client/characters.js";
import {GARY_NARRATIVE, garyBeats, oneOffKeys} from "../src/client/gary-narrative.js";
import {MILO_NARRATIVE, miloBeats} from "../src/client/milo-narrative.js";
import {STRINGS} from "../src/client/i18n.js";
import {getLexicon} from "../src/shared/lexicon/index.js";

// Titles, picker cards, the narratives and each character's wording of shared Solo sentences may be longer than a quick remark.
const LONG_OK = new Set([...CHARACTER_IDS.flatMap(id => characterKeys(id).filter(key => /^(gn|mn)\./.test(key))), "garyIntroCta", "garyTitle", "garyMeetAgain",
  ...CHARACTER_IDS.flatMap(id => [...CHARACTERS[id].card, ...Object.values(CHARACTERS[id].copy), ...Object.values(CHARACTERS[id].results).flat(), ...CHARACTERS[id].rating])]);

// The two approved scripts share these exact lines (each character's own copy of it).
const SHARED_APPROVED = new Set(["That was annoyingly sensible.", "Not it."]);
// Milo's one-line script keys before his narrative (engine-2.3): all gone.
const OLD_MILO_KEYS = ["miloStart", "miloFirstTurn", "miloNormalMiss", "miloFarApart", "miloStrong", "miloConfident", "miloAlreadyUsed", "miloCantUse", "miloTakingWhile",
  "miloSeveralMisses", "miloLongTrail", "miloClever", "miloOddGuess", "miloWin", "miloPostWin", "miloFastWin", "miloLongWin", "miloEncourage", "miloStrong2", "miloStrong3",
  "miloGood2", "miloGood3", "miloWeird", "miloWorkWith", "miloSeeIt", "miloNotMyBrain", "miloInteresting", "miloIdea"];
// Milo's previous writing, which must be gone everywhere ("so close" is back in his approved narrative).
const OLD_MILO = ["Hi! I'm Milo!", "I LOVE words.", "Let's go go go!", "(I'm ready.)", "Ready. Probably too ready.", "Say hi to", "Let's play, Milo!", "let's gooo", "boing", "wiggling", "thinking hat", "socks", "snack thought", "happy spin", "wheee", "almost twins", "wavelength", "plot twist", "I love a surprise", "still going! love it", "totally do this", "already?! amazing", "PHEW", "never gave up", "same word! same word!", "best. day. ever", "I was hoping you'd say that", "I stretched", "SO fun", "again tomorrow", "Ooh, that one's taken", "Keep going!", "Let's gooo!", "super fast", "REALLY ready", "big leap", "still grinning", "What a word adventure", "Ooh, nice connection"];

test("Gary and Milo share one config system: id, name, card, avatar, personality, voice, and a narrative each", () => {
  assert.deepEqual(CHARACTER_IDS, ["gary", "milo"]);
  for (const id of CHARACTER_IDS) {
    const c = CHARACTERS[id];
    assert.equal(c.id, id);
    assert.equal(c.art, id, "each character has its own portrait");
    assert.ok("voiceId" in c && typeof c.voiceStyle === "string" && c.voiceStyle);
    assert.ok(c.personality);
    assert.equal(c.card.length, 2, `${id} has a two-line picker card`);
  }
  // Both speak through a branching narrative (src/client/narrative.js), no random reaction pools at all.
  assert.equal(CHARACTERS.gary.narrative, GARY_NARRATIVE);
  assert.equal(CHARACTERS.milo.narrative, MILO_NARRATIVE);
  for (const id of CHARACTER_IDS) {
    const c = CHARACTERS[id];
    for (const pool of ["close", "strange", "earlyMatch", "lateMatch", "win", "middle", "nearEnd", "gameOver"]) assert.deepEqual(c.lines[pool], [], `${id}.${pool} is empty`);
    assert.equal(c.script, undefined, `${id} has no one-line script`);
    assert.equal(c.pools, undefined, `${id} has no rotating pools`);
  }
  assert.equal(CHARACTERS.milo.intro, null, "the picker card is Milo's introduction");
  // "Meet Milo again" replays exactly his picker card lines.
  assert.deepEqual(CHARACTERS.milo.replay.lines, CHARACTERS.milo.card);
  assert.equal(CHARACTERS.milo.meetAgain, "miloMeetAgain");
  for (const id of CHARACTER_IDS) {
    assert.deepEqual(Object.values(CHARACTERS[id].lines.mismatch), []);
    assert.deepEqual(CHARACTERS[id].results, {});
    assert.equal(CHARACTERS[id].lines.rematch.length, 4, `${id} has four rematch lines`);
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
      assert.doesNotMatch(value, /typing|tape un message|online|en ligne|joined|rejoint|\bbot\b|robot|computer|ordinateur/i, `${lang}.${key}`);
      // (Milo's approved narrative says "definitely connected" about two words.)
      if (!/^(gn|mn)\./.test(key)) assert.doesNotMatch(value, /connected|connecté/i, `${lang}.${key}`);
      assert.doesNotMatch(value, /\b(AI|IA|CPU)\b/, `${lang}.${key}`);
      // (Gary's in-game narrative may say "level of expectation"; the choice itself never mentions difficulty.
      // Milo's narrative may say "this was supposed to be easier".)
      if (!/^(gn|mn)\./.test(key)) assert.doesNotMatch(value, /\b(easy|hard|difficult\w*|level|kids?|child\w*|baby|facile|difficile|niveau|enfants?|bébé)\b/i, `${lang}.${key}: ${value}`);
    }
    for (const value of Object.values(STRINGS[lang])) assert.doesNotMatch(value, /\bbot\b|robot|\bpip\b/i, `"bot"/"robot"/"Pip" in ${lang} copy: ${value}`);
  }
});

test("Milo's old one-line script is gone; every Milo line is his name, card, rating or narrative", async () => {
  const milo = CHARACTERS.milo;
  for (const lang of ["en", "fr"]) {
    for (const key of OLD_MILO_KEYS) assert.equal(STRINGS[lang][key], undefined, `${lang}.${key} is gone`);
    for (const key of Object.keys(STRINGS[lang]).filter(k => k.startsWith("milo"))) assert.ok([milo.name, ...milo.card, ...milo.rating, milo.replay.kicker, milo.replay.cta, milo.meetAgain].includes(key), `${lang}.${key} is not his name, card, rating or "Meet Milo again"`);
    for (const key of characterKeys("milo")) assert.ok(STRINGS[lang][key], `${lang}.${key}`);
  }
  assert.deepEqual(milo.rating.map(key => STRINGS.en[key]), ["Okay, important question.", "How much fun was that?"], "his rating question, exactly");
  const config = await readFile(new URL("../src/client/characters.js", import.meta.url), "utf8");
  for (const old of OLD_MILO) {
    for (const lang of ["en", "fr"]) for (const value of Object.values(STRINGS[lang])) assert.ok(!value.toLowerCase().includes(old.toLowerCase()), `old Milo copy "${old}" still in ${lang}`);
    assert.ok(!config.includes(old), `old Milo copy "${old}" in characters.js`);
  }
  // Milo never borrows Gary's dialogue.
  const gary = new Set(characterKeys("gary").map(key => STRINGS.en[key]));
  for (const key of characterKeys("milo")) assert.ok(!gary.has(STRINGS.en[key]) || SHARED_APPROVED.has(STRINGS.en[key]), key);
});

test("shared Solo copy suits both characters; each character's own wording keeps the same information", () => {
  const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  // Strings both characters share never name or describe just one of them.
  const shared = ["pickTitle", "pickStart", "soloStart", "revealBotWord", "revealMatchTitle", "revealMatchCopy", "revealNextStarts", "winTitle", "winCopy", "playAgainWith", "nowHint", "promptTitle", "promptCopy", "revealSeeEnd"];
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
  // Milo's lines come only from his narrative: shared system sentences stay neutral for him.
  for (const key of ["firstSolo", "revealNextStarts", "keepPlaying", "errALREADY_USED"]) assert.equal(copyKey("milo", key), key, `${key} stays neutral for Milo`);
  // The next pair is plain system copy for both (the character's narrative says the rest).
  assert.equal(copyKey("gary", "revealNextStarts"), "revealNextStarts");
  assert.equal(STRINGS.en.revealNextStarts, "Next: {a} + {b}");
  // Gary's own wording; buttons stay plain and functional for him.
  assert.equal(STRINGS.en[copyKey("gary", "firstSolo")], "Type any word you like. Gary is thinking. This was not on his calendar. Then you both reveal!");
  assert.equal(STRINGS.en[copyKey("gary", "botReady")], "Gary has a word. Apparently we're doing this.");
  // The neutral ending at the internal move cap is shared system copy (never Gary's "twenty moves").
  assert.equal(copyKey("gary", "gameOverCopy"), "gameOverCopy");
  assert.equal(STRINGS.en.gameOverTitle, "That’s all 20 moves!");
  assert.equal(STRINGS.en[copyKey("gary", "keepPlaying")], "Keep playing");
});

test("an already-played word: one plain Together message, and each character's own short line in Solo", () => {
  assert.equal(STRINGS.en.errALREADY_USED, "That word has already been played.");
  assert.equal(STRINGS.fr.errALREADY_USED, "Ce mot a déjà été joué.");
  // Gary rotates through his four exact lines (see gary-narrative.test.mjs), Milo through his three.
  assert.deepEqual(oneOffKeys("alreadyUsed").map(key => STRINGS.en[key]), ["We already used that one. I checked.", "That word’s already been played. Unfortunately, I remember.", "We used that already. Try another one.", "Already played. I have notes."]);
  const milo = MILO_NARRATIVE.oneOffKeys("alreadyUsed");
  assert.deepEqual(milo.map(key => STRINGS.en[key]), ["We used that one already! Pick another.", "Already played. My memory works sometimes.", "That one’s taken. Try another."]);
  for (const lang of ["en", "fr"]) {
    for (const key of ["errALREADY_USED", ...milo, ...oneOffKeys("alreadyUsed")]) assert.ok(STRINGS[lang][key].length <= 70, `${lang}.${key} is short enough for gameplay`);
    for (const key of oneOffKeys("alreadyUsed")) assert.doesNotMatch(STRINGS[lang][key], /!/, "Gary does not exclaim");
    assert.match(STRINGS[lang][milo[0]], /!/, "Milo does");
  }
});

test("connection strength (what Gary's narrative reads): opening, strong, good, weak, very weak", () => {
  const lex = getLexicon("en");
  const cases = [[null, "beach", "opening"], [["sand", "shell"], "beach", "strong"], [["sand", "shell"], "castle", "good"], [["guitar", "tomato"], "music", "weak"], [["sand", "shell"], "violin", "veryWeak"], [["sand", "shell"], "qwzzk", "veryWeak"]];
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
  for (const key of said) assert.ok(!milo.has(STRINGS.en[key].toLowerCase()) || SHARED_APPROVED.has(STRINGS.en[key]), key);
});

test("Milo's one-off moments: rematch greeting, waiting, typo and repeated-word lines are his own exact lines", () => {
  const line = key => STRINGS.en[key];
  assert.deepEqual(CHARACTERS.milo.lines.rematch.map(line), ["Again? Yes.", "Okay, round two.", "Absolutely. I’m ready.", "Again. I think we can do better."]);
  for (const r of [0, 0.3, 0.6, 0.99]) assert.ok(CHARACTERS.milo.lines.rematch.includes(rematchLine("milo", () => r)));
  assert.deepEqual(MILO_NARRATIVE.oneOffKeys("waiting").map(line), ["No rush. I’m still thinking about everything we’ve already said.", "I’m ready whenever you are.", "Take your time. I already picked mine.", "I am being extremely patient right now."]);
  assert.deepEqual(MILO_NARRATIVE.oneOffKeys("typo").map(line), ["Ohhh, okay. That makes sense.", "Yep. That’s the one I thought you meant.", "Got it."]);
  // Rotation per game: the n-th line of each one-off pool cycles through all of them.
  for (const kind of MILO_NARRATIVE.ONE_OFF) {
    const keys = MILO_NARRATIVE.oneOffKeys(kind);
    const seen = new Set(Array.from({length: keys.length}, (_, i) => MILO_NARRATIVE.oneOffLine(kind, "game-1", i)));
    assert.equal(seen.size, keys.length, kind);
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
  for (const file of ["characters.js", "gary.js", "narrative.js", "gary-narrative.js", "milo-narrative.js"]) {
    const source = await readFile(new URL(`../src/client/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from "\.\.\/shared\/|from "\.\/store|fetch\(|\/api\//, file);
    // The narratives store nothing: every beat is re-derived from the game itself, and they import
    // nothing but the shared narrative machinery.
    if (file.endsWith("narrative.js")) {
      assert.doesNotMatch(source, /localStorage|sessionStorage/, file);
      for (const imported of source.match(/from "[^"]+"/g) || []) assert.equal(imported, 'from "./narrative.js"', `${file}: ${imported}`);
    }
  }
  const rounds = [{number: 1, status: "REVEALED", strength: "opening", kind: null}, {number: 2, status: "REVEALED", strength: "good", kind: "close"}];
  assert.deepEqual(garyBeats("g", rounds), garyBeats("g", rounds));
  assert.deepEqual(miloBeats("m", rounds), miloBeats("m", rounds));
});

test("Gary never gets Milo's lines and Milo never gets Gary's, in every pool", () => {
  const garyKeys = new Set(characterKeys("gary")), miloKeys = new Set(characterKeys("milo"));
  for (const key of garyKeys) assert.ok(!miloKeys.has(key), key);
  const garyTexts = new Set([...garyKeys].map(k => STRINGS.en[k])), miloTexts = new Set([...miloKeys].map(k => STRINGS.en[k]));
  for (const text of miloTexts) assert.ok(!garyTexts.has(text) || SHARED_APPROVED.has(text), text);
  for (let i = 0; i < 200; i++) {
    const rounds = [{number: 1, status: "REVEALED", strength: "opening", kind: null}, {number: 2, status: i % 2 ? "MATCHED" : "REVEALED", strength: "strong", kind: null}];
    for (const beat of garyBeats(`g${i}`, rounds)) for (const key of [beat.before, beat.after, beat.extra].filter(Boolean)) assert.ok(garyKeys.has(key) && !miloKeys.has(key), key);
    for (const beat of miloBeats(`m${i}`, rounds)) for (const key of [beat.before, beat.after, beat.extra].filter(Boolean)) assert.ok(miloKeys.has(key) && !garyKeys.has(key), key);
  }
});
