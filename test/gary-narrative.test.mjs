// Gary's branching narrative (src/client/gary-narrative.js): one paired before/after beat per move,
// chosen from the direction of the game (not the move number alone), from the exact approved script.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {BRANCHES, branchFor, conceptsOf, garyBeats, oneOffKeys, oneOffLine, pairKeys, pairsOf, trendOf} from "../src/client/gary-narrative.js";
import {CHARACTERS, characterKeys} from "../src/client/characters.js";
import {STRINGS} from "../src/client/i18n.js";
import {currentMove} from "../src/shared/rules.js";
import {startSoloGame, submitSoloWord} from "../src/shared/solo.js";

const en = key => STRINGS.en[key];
/** Rounds for garyBeats: move 1 is the opening; then {strength, kind} per move; `end` = "MATCHED" | "EXHAUSTED". */
function game(steps, end = null) {
  const rounds = [{number: 1, status: "REVEALED", strength: "opening", kind: null}];
  steps.forEach((step, i) => {
    const [strength, kind = null] = Array.isArray(step) ? step : [step];
    const last = i === steps.length - 1;
    rounds.push({number: i + 2, status: last && end ? end : "REVEALED", strength, kind});
  });
  return rounds;
}
const branchesOf = rounds => garyBeats("test-game", rounds).map(b => b.branch);
const lastBranch = rounds => branchesOf(rounds).at(-1);
const every = () => BRANCHES.flatMap(branch => pairsOf(branch).map(pair => ({branch, pair, ...pairKeys(branch, pair)})));

test("the approved script: the right branches and pair counts, word for word where it matters", () => {
  const sizes = Object.fromEntries(BRANCHES.map(b => [b, pairsOf(b).length]));
  assert.deepEqual(sizes, {opening: 3, close: 5, recovery: 4, improving: 5, drifting: 5, stuck: 5, strange: 5, strong: 5, good: 5, weak: 5, veryWeak: 5, normal: 5,
    long: 5, veryLong: 5, fastWin: 3, normalWin: 5, lateWin: 4, veryLateWin: 4, exhausted: 3});
  assert.equal(en(pairKeys("close", "a").before), "Wait. I think we’re circling the same idea now. Please don’t ruin this for both of us.");
  assert.equal(en(pairKeys("close", "b").before), "I think we’re close. This is usually where things go wrong.");
  assert.equal(en(pairKeys("improving", "a").after), "Fine. That one made sense. Let’s not make a whole thing out of it.");
  assert.equal(en(pairKeys("weak", "a").before), "I have a word. I would describe my confidence as 'available upon request.'");
  assert.equal(en(pairKeys("normal", "e").after), "Not the same. Apparently we're continuing.");
  assert.deepEqual(Object.values(pairKeys("veryLateWin", "a")).map(en), ["If this isn’t it, I’m filing for overtime.", "...finally. We got it.",
    "I would like the record to show that I never stopped believing in us. Please ignore the previous seventeen rounds."]);
  assert.deepEqual(Object.values(pairKeys("exhausted", "c")).map(en), ["Move twenty. I have nothing useful to add to that.", "No match.", "I would like to formally conclude whatever this was."]);
  assert.deepEqual(oneOffKeys("rematch").map(en), ["Again? Fine. We have established a process.", "Round two. I brought a pen.", "All right. Apparently one successful collaboration was not enough.", "Fine. But this time I’m managing expectations from the beginning."]);
  assert.deepEqual(oneOffKeys("typo").map(en), ["Good. That makes more sense.", "Right. That’s the word I thought you meant.", "Okay. Administrative issue resolved."]);
  assert.deepEqual(oneOffKeys("waiting").map(en), ["No rush. I’m pretending not to watch the clock.", "Take your time. I’ve already committed to mine, so now I just sit here.", "I’m still here. Against several expectations.", "This is fine. I have nowhere else I’m required to be in this fictional scenario."]);
  // Every line exists in English and French; wins carry a post-win line, a 20-move miss a follow-up.
  for (const {branch, before, after, extra} of every()) {
    for (const lang of ["en", "fr"]) for (const key of [before, after, extra].filter(Boolean)) assert.ok(STRINGS[lang][key], `${lang}.${key}`);
    assert.equal(Boolean(extra), /Win$|^exhausted$/.test(branch), `${branch} extra line`);
  }
  // The rating and the picker card are unchanged.
  assert.deepEqual(CHARACTERS.gary.rating.map(en), ["Gary’s boss wants feedback.", "Apparently “showed up” isn’t enough anymore."]);
  assert.deepEqual(CHARACTERS.gary.card.map(en), ["We heard you had no friends, so we lured Gary over from Accounting with the promise of cake.", "There is no cake."]);
});

test("1 / 13: Gary is a teammate: none of the old adversarial lines or bare fragments can be said", () => {
  const removed = ["I object", "rude", "you're very pleased with yourself", "there. happy?", "that somehow made things worse", "can we be done now", "I’m going to need you to explain yourself."];
  const fragments = ["ugh", "really?", "fine", "there", "wow"];
  const said = characterKeys("gary").filter(key => key.startsWith("gn.")).map(en);
  assert.ok(said.length > 200);
  for (const line of said) {
    for (const bad of removed) assert.ok(!line.toLowerCase().includes(bad.toLowerCase()), `"${line}" contains "${bad}"`);
    assert.ok(!fragments.includes(line.trim().toLowerCase()), `bare fragment "${line}"`);
    assert.doesNotMatch(line, /!/, `Gary does not exclaim: ${line}`);
    assert.doesNotMatch(line, /\b(we’ve got this|great job|you lose|i win|beat you|my win)\b/i, line);
  }
  // And none of them is in the app's strings any more (not just unselected).
  for (const bad of removed) for (const value of Object.values(STRINGS.en)) assert.ok(!value.includes(bad) || !/^gary/.test(Object.keys(STRINGS.en).find(k => STRINGS.en[k] === value) || ""), bad);
  // The team voice: wins are "we got it", never "you win".
  for (const branch of ["fastWin", "normalWin", "lateWin", "veryLateWin"]) for (const pair of pairsOf(branch)) assert.match(en(pairKeys(branch, pair).after), /we|that’s|yes|finally/i);
});

test("2 / 3: every reveal gets one complete pair; before and after always come from the same pair", () => {
  const strengths = ["strong", "good", "weak", "veryWeak"], kinds = [null, null, "close", "strange"];
  for (let g = 0; g < 200; g++) {
    let x = g * 7919 + 13;
    const next = n => { x = (x * 1103515245 + 12345) >>> 0; return x % n; };
    const steps = Array.from({length: 1 + next(18)}, () => [strengths[next(4)], kinds[next(4)]]);
    const end = next(3) === 0 ? "MATCHED" : steps.length === 19 ? "EXHAUSTED" : null;
    const beats = garyBeats(`game-${g}`, game(steps, end));
    assert.equal(beats.length, steps.length + 1);
    for (const beat of beats) {
      assert.ok(en(beat.before) && en(beat.after), `${beat.branch}.${beat.pair}`);
      const prefix = `gn.${beat.branch}.${beat.pair}.`;
      assert.ok(beat.before.startsWith(prefix) && beat.after.startsWith(prefix), "one pair");
      if (beat.extra) assert.ok(beat.extra.startsWith(prefix));
    }
  }
});

test("opening only before the first reveal", () => {
  assert.deepEqual(branchesOf(game([])), ["opening"]);
  assert.ok(!branchesOf(game(["strong", "good", "weak"])).slice(1).includes("opening"));
});

test("4 / 12: close beats long-game lines; an improving long game is not defeated", () => {
  const long = Array(13).fill("veryWeak");
  assert.equal(lastBranch(game([...long, ["good", "close"]])), "close", "move 15 close is CLOSE, not LONG");
  assert.equal(lastBranch(game([...Array(17).fill("veryWeak"), ["weak", "close"]])), "close", "move 19 close");
  // Move 14, getting better (weak, good, strong): improving, not long-game resignation.
  assert.equal(lastBranch(game([...Array(10).fill("strong"), "weak", "good", "strong"])), "improving");
  // The same long game when nothing is happening: the long-game lines.
  assert.equal(lastBranch(game(Array(13).fill("veryWeak"))), "long");
  assert.equal(lastBranch(game(Array(16).fill("veryWeak"))), "veryLong");
});

test("5: recovery beats weak/stuck when a drifting or stuck game turns good", () => {
  assert.equal(lastBranch(game(["veryWeak", "veryWeak", "veryWeak", "strong"])), "recovery", "stuck, then strong");
  assert.equal(lastBranch(game(["strong", "weak", "veryWeak", "good"])), "recovery", "drifting, then good");
  // A close result still wins over recovery (it is higher up).
  assert.equal(lastBranch(game(["veryWeak", "veryWeak", "veryWeak", ["good", "close"]])), "close");
  // No recovery without a bad stretch before it.
  assert.notEqual(lastBranch(game(["good", "strong"])), "recovery");
});

test("6: improving and drifting come from the recent direction, not the move number", () => {
  assert.equal(trendOf([{strength: "veryWeak"}, {strength: "weak"}, {strength: "good"}]), "improving");
  assert.equal(trendOf([{strength: "strong"}, {strength: "good"}, {strength: "weak"}]), "drifting");
  assert.equal(trendOf([{strength: "good"}, {strength: "weak"}, {strength: "veryWeak"}]), "drifting");
  assert.equal(trendOf([{strength: "weak"}, {strength: "veryWeak"}, {strength: "weak"}]), "stuck");
  assert.equal(trendOf([{strength: "good"}, {strength: "weak"}, {strength: "good"}, {strength: "weak"}]), "stuck", "four rounds without a strong/close one");
  assert.equal(trendOf([{strength: "good"}, {strength: "strong"}]), "stable");
  assert.equal(lastBranch(game(["veryWeak", "weak", "good"])), "improving", "move 4 improving");
  assert.equal(lastBranch(game(["strong", "good", "weak"])), "drifting", "move 4 drifting: regrouping early");
  // Plain results when the game has no direction yet.
  assert.equal(lastBranch(game(["strong"])), "strong");
  assert.equal(lastBranch(game(["good"])), "good");
  assert.equal(lastBranch(game(["weak"])), "weak");
  assert.equal(lastBranch(game(["veryWeak"])), "veryWeak");
  assert.equal(lastBranch(game([["veryWeak", "strange"]])), "strange");
});

test("7–11: wins by move (fast, normal, late, very late) with a post-win line; a 20-move miss is exhausted", () => {
  const winAt = move => lastBranch(game(Array(move - 1).fill("good"), "MATCHED"));
  for (const move of [2, 3]) assert.equal(winAt(move), "fastWin", `move ${move}`);
  for (const move of [4, 7, 11]) assert.equal(winAt(move), "normalWin", `move ${move}`);
  for (const move of [12, 14, 16]) assert.equal(winAt(move), "lateWin", `move ${move}`);
  for (const move of [17, 20]) assert.equal(winAt(move), "veryLateWin", `move ${move}`);
  assert.equal(branchFor({number: 1, status: "MATCHED", strength: "opening", kind: null}, []), "fastWin", "a move-1 match is fast too");
  const win = garyBeats("w", game(["good", "good", "good", "good"], "MATCHED")).at(-1);
  assert.ok(win.extra && en(win.extra), "post-win line");
  const miss = garyBeats("x", game(Array(19).fill("good"), "EXHAUSTED")).at(-1);
  assert.equal(miss.branch, "exhausted");
  assert.ok(en(miss.extra), "follow-up line");
  // A match overrides everything, even a close, long game.
  assert.equal(lastBranch(game([...Array(14).fill("veryWeak"), ["good", "close"]], "MATCHED")), "lateWin", "move 16");
});

test("14: a branch never repeats a pair until all its pairs are used; never the same line twice in a row", () => {
  // Ten strong results in a row (no trend): the strong branch, twice through.
  const beats = garyBeats("cycle", game(Array(10).fill("strong"))).slice(1);
  assert.ok(beats.every(b => b.branch === "strong"));
  assert.equal(new Set(beats.slice(0, 5).map(b => b.pair)).size, 5, "first cycle uses every pair");
  assert.equal(new Set(beats.slice(5, 10).map(b => b.pair)).size, 5, "second cycle too");
  for (let i = 1; i < beats.length; i++) {
    assert.notEqual(en(beats[i].before), en(beats[i - 1].before));
    assert.notEqual(en(beats[i].after), en(beats[i - 1].after));
  }
  // Different games start at different pairs.
  const firsts = new Set(Array.from({length: 30}, (_, i) => garyBeats(`g${i}`, game(["strong"])).at(-1).pair));
  assert.ok(firsts.size >= 3);
});

test("narrative memory: a joke concept already used is not repeated while a fresh pair is left", () => {
  assert.ok(conceptsOf("long", "d").includes("project"));
  assert.ok(conceptsOf("veryLong", "b").includes("investment"));
  assert.ok(conceptsOf("veryLateWin", "a").includes("overtime") && conceptsOf("veryLateWin", "a").includes("record"));
  for (let g = 0; g < 40; g++) {
    const beats = garyBeats(`memo-${g}`, game(Array(19).fill("veryWeak"), "EXHAUSTED"));
    const seen = new Set();
    for (const beat of beats) {
      const pairs = pairsOf(beat.branch);
      const fresh = pairs.some(p => !conceptsOf(beat.branch, p).some(c => seen.has(c)));
      if (beat.concepts.some(c => seen.has(c)) && fresh) {
        // Only allowed when every fresh pair was already used in this cycle of the branch.
        const sameBranch = beats.filter(b => b.branch === beat.branch && b.number < beat.number).map(b => b.pair);
        const freshUnused = pairs.filter(p => !sameBranch.includes(p) && !conceptsOf(beat.branch, p).some(c => seen.has(c)));
        assert.deepEqual(freshUnused, [], `${beat.branch}.${beat.pair} at move ${beat.number} repeats ${beat.concepts}`);
      }
      beat.concepts.forEach(c => seen.add(c));
    }
  }
});

test("15: a reload shows the same dialogue: earlier beats never change as the game goes on", () => {
  const steps = ["veryWeak", "weak", "good", ["strong", "close"], "weak", "veryWeak", "veryWeak", "good", "strong", "weak", "weak", "veryWeak"];
  const full = garyBeats("reload", game(steps));
  for (let n = 1; n <= steps.length; n++) assert.deepEqual(garyBeats("reload", game(steps.slice(0, n))), full.slice(0, n + 1));
  assert.deepEqual(garyBeats("reload", game(steps)), full);
  assert.equal(oneOffLine("waiting", "reload", 2), oneOffLine("waiting", "reload", 2));
});

test("16 / 17: the dialogue has no say in the game: the engine never sees it, and replaying a game gives the same words", async () => {
  for (let seed = 1; seed <= 10; seed++) {
    let one = startSoloGame({id: `same-${seed}`, seed, character: "gary"});
    let two = startSoloGame({id: `same-${seed}`, seed, character: "gary"});
    for (const word of ["garden", "violin", "rocket", "pencil"]) {
      assert.equal(currentMove(one).hidden.b, currentMove(two).hidden.b);
      // Working out the dialogue for the game so far changes nothing.
      garyBeats(one.id, one.moves.filter(m => m.words).map(m => ({number: m.number, status: m.status, strength: "good", kind: null})));
      const a = submitSoloWord(one, word), b = submitSoloWord(two, word);
      if (!a.ok || a.game.status !== "ACTIVE") break;
      one = a.game; two = b.game;
    }
  }
  for (const file of ["../src/shared/engine.js", "../src/shared/solo.js", "../src/shared/rules.js", "../src/shared/understand.js"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /narrative|characters\.js|i18n/, `${file} never reads character dialogue`);
  }
});
