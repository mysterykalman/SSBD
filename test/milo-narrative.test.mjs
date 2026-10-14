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
    ["Okay, I picked one. Hurry up.", "Oh! Completely different. Good. Now we have something to chase."],
    ["Got mine. Your turn. Come onnn.", "Wow. We did not go the same way at all."],
    ["Ready. Been ready. Still ready.", "Different words. Fine. Race you to the next one."]],
  close: [
    ["Wait. I think I know where you’re going.", "NO. We were right there."],
    ["Okay, don’t mess this up. I think we’re close.", "Ahhh! Same idea. Wrong word."],
    ["I think our brains finally caught up to each other.", "Almost! Again. Again."],
    ["Oh, this one feels good.", "That was SO close."],
    ["We’re right there. I can feel it.", "Yep. Close. Don’t slow down now."]],
  recovery: [
    ["Okay. We got lost for a second. I found us.", "Yes! Back on track."],
    ["New plan. Follow me.", "See? Much better."],
    ["I know where we went wrong. Probably.", "Okay! We’re moving again."],
    ["Wait, wait. I’ve got it now.", "Better. Way better."]],
  improving: [
    ["We’re getting closer. Keep up.", "Yep. Closer."],
    ["Oh! I see it. Go, go, go.", "Okay, that actually worked."],
    ["Got one. Don’t overthink yours.", "Yes! Not there yet, but yes."],
    ["I think I’m figuring your brain out.", "Ha! Knew it."],
    ["We’re closing in.", "Closer again. Told you."]],
  drifting: [
    ["Uh-oh. I think we ran past it.", "Yep. Way past it."],
    ["Okay, I might have gone the wrong way.", "Nope. Definitely the wrong way."],
    ["New one. Pretend the last thing never happened.", "Good idea. It was terrible."],
    ["I think our brains just ran into different rooms.", "Yep. Completely different rooms."],
    ["Reset. Go again.", "Still wrong. Faster this time."]],
  stuck: [
    ["Okay, how are we STILL here?", "Apparently very easily."],
    ["I have another idea. Obviously.", "Cool. Need another one."],
    ["We are really good at almost getting this.", "Still almost."],
    ["One of these has to make us look smart eventually.", "Not that one."],
    ["I swear the answer is running away from us.", "Catch it next round."]],
  strange: [
    ["Okay, mine makes sense. Yours better.", "...Okay. I see it. Took me a second."],
    ["I’m locking this before I change my mind.", "You went THAT way?"],
    ["Mine feels normal. Which is suspicious.", "Huh. Weird. I like it."],
    ["Ready. Let’s see what you did.", "Wow. Okay. That’s a choice."],
    ["Got mine.", "Wait. Yours is actually kind of great."]],
  strong: [
    ["Oh, this one’s good.", "YES. That connects."],
    ["I like mine. A lot.", "Yours was good too. Annoying."],
    ["This feels obvious.", "Yep. Same place."],
    ["Okay, I’m weirdly sure about this.", "Ha! That worked."],
    ["This better work because I really like it.", "Okay! Worth it."]],
  good: [
    ["Got one.", "Yeah, I see yours."],
    ["Locked.", "Different, but okay."],
    ["This makes sense to me.", "Yep. Same neighbourhood."],
    ["Ready.", "Okay, I get it."],
    ["I’ve got something.", "Not the same, but close enough to keep going."]],
  weak: [
    ["I picked something. Don’t ask questions.", "Yeah. We went completely different ways."],
    ["This might be terrible.", "Confirmed."],
    ["Okay, I’m trying something.", "Let’s not try that again."],
    ["I don’t love mine.", "Good instinct."],
    ["Whatever. Let’s see.", "Nope. Run it back."]],
  veryWeak: [
    ["I have absolutely no idea if this works.", "It did not."],
    ["This was better in my head.", "Much better in your head."],
    ["Nobody get excited about this one.", "Excellent advice."],
    ["I’m trying a thing.", "Stop trying that thing."],
    ["Could work. Could be awful.", "Awful won."]],
  normal: [
    ["Got one.", "Nope. Again."],
    ["Ready.", "Different. Go."],
    ["Mine’s done. Hurry up.", "Huh. Okay. Next one."],
    ["Locked.", "Not it. Again."],
    ["Reveal it.", "Different again. Keep moving."]],
  long: [
    ["We have been doing this FOREVER.", "Still going. Fine by me."],
    ["Wasn’t this supposed to be easy?", "Apparently not."],
    ["We’ve gone too far to quit now.", "Exactly. Again."],
    ["I need to know how this ends.", "Not like that."],
    ["I’m not stopping. Just so you know.", "Good. Again."]],
  fastWin: [
    ["Wait. I think this is it.", "YES! ALREADY?!", "Again. Right now."],
    ["Ohhh, this feels way too easy.", "WE GOT IT.", "That was FAST."],
    ["I think we have it.", "YES!", "Okay, that was awesome."]],
  normalWin: [
    ["Wait. I think this is actually it.", "YES! WE GOT IT!", "Again. Again. Again."],
    ["Oh! I know where you’re going.", "THAT’S IT!", "Ha! I knew we were getting there."],
    ["I have a really good feeling about this.", "YES!", "Okay. Rematch. Immediately."],
    ["Wait. Don’t say anything.", "WE GOT IT.", "That was SO good."],
    ["I think our brains finally did the same thing.", "YES!", "Took them long enough."]],
  lateWin: [
    ["This has to be it.", "FINALLY!", "YES. Worth it."],
    ["If we miss again I’m blaming you.", "YES!", "Okay, never mind. We’re amazing."],
    ["I think we actually have it.", "WE GOT IT.", "Finally! I was starting to take that personally."],
    ["Come on. Be it.", "YES!", "Okay. Again?"]],
  veryLateWin: [
    ["Please be it. Please be it. Please be it.", "YES!", "FINALLY."],
    ["We are NOT missing again.", "WE GOT IT.", "Told you."],
    ["Okay, now I really care.", "YES!", "Worth every single one."],
    ["This is it. It has to be.", "FINALLY!", "That was ridiculous. Again?"]],
  exhausted: [
    ["Okay. Last shot. Go.", "Nooo.", "Our brains really refused to cooperate. Kind of impressive."],
    ["I have a really good feeling about this.", "Nope.", "Okay. It got away. Rematch?"],
    ["Come on, brain. Do something useful.", "Nope.", "Again. I’m not done."]]
};
const APPROVED_ONE_OFF = {
  alreadyUsed: ["We already used that!", "Nope. Taken. Pick another.", "That one again? Come on."],
  typo: ["Ohhh. Yep. That makes way more sense.", "Okay, THAT word.", "Got it."],
  waiting: ["You’re still thinking?", "I already picked mine like twelve years ago.", "Come onnn.", "Hurry up, my brain is getting bored.", "I’m waiting.", "Catch up!"],
  rematch: ["Again? YES.", "Okay, go go go.", "Absolutely. I’m ready.", "Rematch. Right now."]
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
