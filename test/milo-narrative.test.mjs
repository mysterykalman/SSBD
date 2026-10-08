// Milo's branching narrative (src/client/milo-narrative.js): the exact approved script, the same
// branches and precedence as Gary's, pairs kept together, rotation, and reload stability.
import {test} from "node:test";
import assert from "node:assert/strict";
import {GARY_NARRATIVE} from "../src/client/gary-narrative.js";
import {MILO_NARRATIVE, miloBeats} from "../src/client/milo-narrative.js";
import {STRINGS} from "../src/client/i18n.js";
import {characterKeys} from "../src/client/characters.js";
import {seededRandom} from "../src/shared/rules.js";

const M = MILO_NARRATIVE;

// The approved English script, word for word: [before, after, post-win / follow-up].
const APPROVED = {
  opening: [
    ["Okay, I picked one. I’ve been ready for this since, like, five minutes before we started.", "Oh! Completely different. Great. Now it gets interesting."],
    ["I have a word. I changed my mind twice, which feels like a strong start.", "Okay, not even close. I kind of love that."],
    ["Ready. And no, I’m not changing it again.", "Different words. Fine. Now we have clues."]],
  close: [
    ["Wait. I think our brains are finally in the same room.", "NO. That was so close."],
    ["Okay, okay. I think I know where you’re going.", "Almost! We were basically standing next to the same word."],
    ["Hang on. This feels really close.", "Ahhh! Same idea, wrong word."],
    ["I have a really good feeling about this one.", "That was painfully close. Again."],
    ["I think we’re circling it now.", "Yep. Definitely close. My brain is officially invested."]],
  recovery: [
    ["Okay, I think we found the road again.", "Yes. Better. Much less wandering."],
    ["I have an idea that actually connects to what we were doing. Huge development.", "Okay! We’re back."],
    ["New plan. Let’s pretend the last couple of rounds were research.", "See? Research."],
    ["Wait, I think this makes sense again.", "Much better. I was starting to wonder."]],
  improving: [
    ["I think we’re getting closer. Don’t do anything unpredictable.", "Yep. Closer."],
    ["Oh, I think I see the path now.", "Okay, that definitely moved us in the right direction."],
    ["I have one. And for once I feel weirdly confident.", "That worked! Not enough, but still."],
    ["Wait. I think I’m starting to understand how your brain works.", "Yep. That was more like it."],
    ["I think we’re actually narrowing this down.", "Closer again. This is getting suspicious."]],
  drifting: [
    ["I think we somehow got farther apart. That feels rude.", "Yeah. We definitely took different roads there."],
    ["Okay, I may have lost the plot a little.", "Nope. That did not find the plot."],
    ["I have another idea. I’m less confident than I was ten seconds ago.", "Okay. Maybe not that direction."],
    ["I think our brains just missed an exit.", "Yep. We’re off the highway."],
    ["New attempt. We’re going to pretend that last one was intentional.", "It was not."]],
  stuck: [
    ["We have tried several things now. Statistically, one of them should have helped.", "Apparently statistics are taking the day off."],
    ["I’m running out of ways to say 'I have an idea.'", "Good news: I’ll need another one."],
    ["We are extremely committed to almost understanding each other.", "Still committed."],
    ["Okay. One of these rounds has to suddenly make us look smart.", "Not that one."],
    ["I feel like the answer is hiding from us now.", "Still hiding."]],
  strange: [
    ["Okay, I have mine. Please prepare to explain yours if necessary.", "Ohhh. Okay. That actually took me a second."],
    ["I’m committing to this before I talk myself out of it.", "That is absolutely not where my brain went."],
    ["I feel normal about my answer. We’ll see how long that lasts.", "Huh. I can see it. Eventually."],
    ["Ready. Let’s see how strange this gets.", "Pretty strange. Not bad, though."],
    ["I have mine.", "Okay, hear me out: I kind of like yours."]],
  strong: [
    ["Okay. This one feels good.", "Oh, that connects really well."],
    ["I think this is a pretty good one.", "Wait, that was a good one too."],
    ["I have something that feels almost obvious.", "Yep. Same kind of thought."],
    ["Okay, I’m feeling weirdly confident.", "That was annoyingly sensible."],
    ["This one makes sense in my head. Always dangerous.", "Okay! That worked."]],
  good: [
    ["I have something. Let’s see.", "Yeah! I can see that."],
    ["Okay, mine’s locked.", "Different, but I get it."],
    ["I think this makes sense.", "Yep. Same neighbourhood."],
    ["I’ve got one.", "Okay, I can follow that."],
    ["This feels reasonable.", "Not the same, but definitely connected."]],
  weak: [
    ["I have an answer. I’m not deeply attached to it.", "Yeah. We were thinking about very different things."],
    ["Okay, this one might be a stretch.", "Yep. Stretch confirmed."],
    ["I picked something. That is all I’m promising.", "Not close. We try again."],
    ["I’m slightly worried about mine.", "Reasonable concern."],
    ["Okay. Let’s just see what happens.", "Different directions. That happens."]],
  veryWeak: [
    ["I honestly have no idea if this helps.", "It did not."],
    ["This one felt better before I locked it in.", "Yeah. I see the problem now."],
    ["I have a word. I would like everyone to keep expectations low.", "Excellent decision."],
    ["I’m trying something.", "We have learned not to try that."],
    ["This could go either way.", "It went the other way."]],
  normal: [
    ["Okay, I’ve got one.", "Different again. Keep going."],
    ["Ready.", "Nope. Next clue."],
    ["I have mine. Let’s see yours.", "Different. Interesting."],
    ["Locked.", "Not it. Again."],
    ["Okay. Reveal time.", "Still different. We’ve got more to work with now."]],
  long: [
    ["Okay, we have been doing this for a while now.", "Still going. I respect the commitment."],
    ["I’m pretty sure this was supposed to be easier.", "Apparently not."],
    ["We’ve come too far to suddenly start making sense.", "See? Consistency."],
    ["I really want to know where this ends now.", "Not there."],
    ["At this point I’m refusing to stop on principle.", "Again."]],
  fastWin: [
    ["Wait. I have a really good feeling about this.", "YES! Already?!", "Okay, we might actually be good at this."],
    ["Okay, this feels suspiciously easy.", "WE GOT IT.", "That was ridiculously fast."],
    ["I think this might be it.", "YES!", "I was absolutely prepared for that to take longer."]],
  normalWin: [
    ["Wait. I think this might actually be it.", "YES! We got it!", "Okay, that was really satisfying."],
    ["Okay. I think I know what you’re thinking.", "THAT’S IT!", "I knew we were getting closer."],
    ["I have a good feeling about this.", "YES!", "Okay. Again. Immediately."],
    ["Wait. Don’t say anything.", "WE GOT IT.", "That was so good."],
    ["I think our brains are finally doing the same thing.", "YES!", "See? Eventually they cooperate."]],
  lateWin: [
    ["Wait. I really think this is it.", "FINALLY! We got it!", "Okay, that was worth it."],
    ["I swear if this isn’t it...", "YES!", "Thank you. I needed that."],
    ["Okay. I think we actually have it.", "WE GOT IT.", "I was starting to take this personally."],
    ["This has to be it.", "YES!", "Okay. I can relax now."]],
  veryLateWin: [
    ["Please be it. Please be it. Please be it.", "YES!", "FINALLY."],
    ["I refuse to believe we can miss again.", "WE GOT IT.", "Okay. That took years off my life."],
    ["Last few chances. I’m emotionally involved now.", "YES!", "Worth it."],
    ["I think this is it. I need this to be it.", "FINALLY!", "Okay. That was ridiculous. Again?"]],
  exhausted: [
    ["Okay. Last one.", "Nooo.", "Twenty moves and our brains still refused to cooperate. Honestly, kind of impressive."],
    ["This is literally our last chance.", "Not it.", "Okay. We lost. But in a very committed way."],
    ["Move twenty. Please do something useful, brain.", "Nope.", "I still want another round."]]
};
const APPROVED_ONE_OFF = {
  alreadyUsed: ["We used that one already! Pick another.", "Already played. My memory works sometimes.", "That one’s taken. Try another."],
  typo: ["Ohhh, okay. That makes sense.", "Yep. That’s the one I thought you meant.", "Got it."],
  waiting: ["No rush. I’m still thinking about everything we’ve already said.", "I’m ready whenever you are.", "Take your time. I already picked mine.", "I am being extremely patient right now."],
  rematch: ["Again? Yes.", "Okay, round two.", "Absolutely. I’m ready.", "Again. I think we can do better."]
};

const STRENGTHS = ["veryWeak", "weak", "good", "strong"];
function randomGame(seed, length = 20, end = "REVEALED") {
  const rnd = seededRandom(seed);
  return Array.from({length}, (_, i) => {
    const number = i + 1;
    const status = number === length && end !== "REVEALED" ? end : "REVEALED";
    if (number === 1) return {number, status, strength: "opening", kind: null};
    const r = rnd();
    return {number, status, strength: STRENGTHS[Math.floor(rnd() * 4)], kind: r < 0.12 ? "close" : r < 0.22 ? "strange" : null};
  });
}

test("the approved script, word for word: every branch, every pair, every one-off line (and French for all of it)", () => {
  assert.deepEqual(M.BRANCHES, Object.keys(APPROVED));
  for (const [branch, pairs] of Object.entries(APPROVED)) {
    assert.equal(M.pairsOf(branch).length, pairs.length, branch);
    M.pairsOf(branch).forEach((pair, i) => {
      const keys = M.pairKeys(branch, pair);
      const text = [keys.before, keys.after, keys.extra].filter(Boolean).map(key => STRINGS.en[key]);
      assert.deepEqual(text, pairs[i], `${branch}.${pair}`);
      for (const key of Object.values(keys)) {
        assert.ok(STRINGS.fr[key], `fr ${key}`);
        assert.notEqual(STRINGS.fr[key], STRINGS.en[key].replace(/’/g, "'"), `fr ${key} is translated`);
      }
    });
  }
  assert.deepEqual(M.ONE_OFF, Object.keys(APPROVED_ONE_OFF));
  for (const [kind, lines] of Object.entries(APPROVED_ONE_OFF)) {
    assert.deepEqual(M.oneOffKeys(kind).map(key => STRINGS.en[key]), lines, kind);
    for (const key of M.oneOffKeys(kind)) assert.ok(STRINGS.fr[key], `fr ${key}`);
  }
  // Wins carry a post-win line and the 20-move miss a follow-up; nothing else has a third line.
  for (const branch of M.BRANCHES) for (const pair of M.pairsOf(branch)) {
    assert.equal(Boolean(M.pairKeys(branch, pair).extra), /Win$|^exhausted$/.test(branch), `${branch}.${pair}`);
  }
  // No invented Milo dialogue: every Milo line in the app is one of these (plus name, card, rating).
  const approved = new Set([...Object.values(APPROVED).flat(2), ...Object.values(APPROVED_ONE_OFF).flat()]);
  for (const key of characterKeys("milo").filter(k => k.startsWith("mn."))) assert.ok(approved.has(STRINGS.en[key]), key);
});

test("same branches and precedence as Gary (Milo's own win ranges, and one long-game branch instead of two)", () => {
  assert.deepEqual(M.BRANCHES, GARY_NARRATIVE.BRANCHES.filter(b => b !== "veryLong"));
  for (let seed = 1; seed <= 300; seed++) {
    const rounds = randomGame(seed, 2 + (seed % 19), seed % 3 === 0 ? "MATCHED" : seed % 7 === 0 ? "EXHAUSTED" : "REVEALED");
    const history = [];
    for (const round of rounds) {
      const g = GARY_NARRATIVE.branchFor(round, history), m = M.branchFor(round, history);
      if (round.status === "MATCHED") {
        const n = round.number;
        assert.equal(m, n <= 3 ? "fastWin" : n <= 10 ? "normalWin" : n <= 16 ? "lateWin" : "veryLateWin", `move ${n}`);
      } else assert.equal(m, g === "veryLong" ? "long" : g, `seed ${seed} move ${round.number}`);
      if (round.status === "REVEALED" && round.number > 1) history.push(round);
    }
  }
  // Spot checks of the precedence.
  const at = (number, strength, kind = null, before = []) => M.branchFor({number, status: "REVEALED", strength, kind}, before);
  assert.equal(at(1, "opening"), "opening");
  assert.equal(at(12, "weak", "close"), "close", "close beats a long game");
  assert.equal(at(12, "weak"), "long", "long only from move 10, replacing weak");
  assert.equal(at(9, "weak"), "weak");
  assert.equal(at(18, "normal"), "long", "Milo has no separate very-long branch");
  assert.equal(at(12, "strong"), "strong", "a meaningful branch beats long");
  const stuck = [{strength: "veryWeak", kind: null}, {strength: "weak", kind: null}, {strength: "veryWeak", kind: null}];
  assert.equal(at(6, "good", null, stuck), "recovery");
  assert.equal(M.branchFor({number: 11, status: "MATCHED"}, []), "lateWin", "Milo's normal win ends at move 10");
  assert.equal(GARY_NARRATIVE.branchFor({number: 11, status: "MATCHED"}, []), "normalWin", "Gary's at move 11");
  assert.equal(M.branchFor({number: 20, status: "EXHAUSTED"}, []), "exhausted");
});

test("pairs stay together: every beat's lines come from one pair of one branch", () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const beat of miloBeats(`g${seed}`, randomGame(seed, 20, seed % 2 ? "MATCHED" : "EXHAUSTED"))) {
      const prefix = `mn.${beat.branch}.${beat.pair}.`;
      for (const key of [beat.before, beat.after, beat.extra].filter(Boolean)) assert.ok(key.startsWith(prefix), `${key} is not from ${prefix}`);
      assert.deepEqual({before: beat.before, after: beat.after, ...(beat.extra ? {extra: beat.extra} : {})}, M.pairKeys(beat.branch, beat.pair));
    }
  }
});

test("a branch never repeats a pair until all its pairs are used; never the same line twice in a row", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const beats = miloBeats(`r${seed}`, randomGame(seed * 7, 20));
    const used = new Map();
    for (const beat of beats) {
      const set = used.get(beat.branch) || new Set();
      if (set.size >= M.pairsOf(beat.branch).length) set.clear();
      assert.ok(!set.has(beat.pair), `seed ${seed}: ${beat.branch}.${beat.pair} repeated before the branch was exhausted`);
      set.add(beat.pair);
      used.set(beat.branch, set);
    }
    for (let i = 1; i < beats.length; i++) {
      assert.notEqual(STRINGS.en[beats[i].before], STRINGS.en[beats[i - 1].before]);
      assert.notEqual(STRINGS.en[beats[i].after], STRINGS.en[beats[i - 1].after]);
    }
  }
});

test("a reload shows the same dialogue: earlier beats never change as the game goes on", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rounds = randomGame(seed, 20, "MATCHED");
    const full = miloBeats(`reload-${seed}`, rounds);
    for (let n = 1; n <= rounds.length; n++) assert.deepEqual(miloBeats(`reload-${seed}`, rounds.slice(0, n)), full.slice(0, n));
  }
  // Different games start branches at different pairs.
  const openings = new Set(Array.from({length: 30}, (_, i) => miloBeats(`game-${i}`, randomGame(i, 1))[0].pair));
  assert.ok(openings.size >= 2);
});

test("Milo's voice: playful and friendly, not a coach, never mean, never helping", () => {
  for (const key of characterKeys("milo").filter(k => k.startsWith("mn."))) {
    const text = STRINGS.en[key];
    assert.doesNotMatch(text, /\b(good job|great job|well done|nice work|you can do it|try (thinking|saying)|hint|here'?s a clue)\b/i, `${key} is coaching: ${text}`);
    assert.doesNotMatch(text, /\byou('re| are| were)? (bad|wrong|terrible|awful|slow)|\bstupid|\bdumb/i, `${key} is mean: ${text}`);
  }
});
