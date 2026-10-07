// Gary plays Say the Same Thing to win: he predicts what the human will type and aims for the
// semantic centre of the two words. These tests read his ranking (the same numbers the developer
// diagnostics show), so a better-looking answer by luck can't pass: the centre must be ranked
// first, and obviously tangential words must rank far below it.
import {test} from "node:test";
import assert from "node:assert/strict";
import {BOT_TUNING, chooseResponse, rankCandidates} from "../src/shared/bot.js";
import {seededRandom} from "../src/shared/rules.js";
import {setGaryDiagnostics, startSoloGame, submitSoloWord} from "../src/shared/solo.js";
import {currentMove} from "../src/shared/rules.js";

// [pair, acceptable centre answers, obviously tangential words]
const CASES = [
  [["wife", "brother"], ["family"], ["play"]],
  [["dog", "cat"], ["pet", "animal"], ["tail", "paw", "fur", "bone", "mouse"]],
  [["rain", "snow"], ["weather"], ["boots", "umbrella", "puddle"]],
  [["apple", "banana"], ["fruit"], ["tree", "snack", "monkey", "pie"]],
  [["bed", "tired"], ["sleep"], ["bedroom", "blanket", "pajamas"]],
  [["school", "teacher"], ["education", "class"], ["book", "pencil", "homework"]]
];
const SEEDS = 200;
const picks = (prompts, extra = {}) => {
  const seen = new Map();
  for (let seed = 1; seed <= SEEDS; seed++) {
    const {word} = chooseResponse({prompts, rng: seededRandom(seed * 7919), ...extra});
    seen.set(word, (seen.get(word) || 0) + 1);
  }
  return seen;
};

for (const [prompts, centre, tangents] of CASES) {
  const label = prompts.map(w => w.toUpperCase()).join(" + ");
  test(`${label} → ${centre.map(w => w.toUpperCase()).join(" / ")}`, () => {
    // 1. What Gary selects, across many games.
    const seen = picks(prompts);
    const hits = centre.reduce((sum, word) => sum + (seen.get(word) || 0), 0);
    assert.ok(hits >= SEEDS * 0.95, `${label}: ${JSON.stringify([...seen])}`);
    for (const word of tangents) assert.ok(!seen.has(word), `${label}: picked tangential ${word}`);

    // 2. How he ranked it: the human-answer model predicts the centre first...
    const {ranked, predicted} = rankCandidates({prompts});
    assert.ok(centre.includes(predicted[0].word), `${label}: predicted ${predicted.map(p => p.word)}`);
    // ...and the centre is the top eligible candidate, clear of the 5% personality whim.
    const eligible = ranked.filter(r => r.tier === 1);
    assert.ok(centre.includes(eligible[0].word), `${label}: ranked ${eligible.slice(0, 5).map(r => r.word)}`);
    const best = eligible[0];
    // 3. Tangential words fail the ranking: well below the centre, and far from the human prediction.
    for (const word of tangents) {
      const row = ranked.find(r => r.word === word);
      if (!row) continue; // not even a candidate
      assert.ok(row.score <= best.score * 0.82, `${label}: ${word} scores ${row.score.toFixed(3)} vs ${best.word} ${best.score.toFixed(3)}`);
      assert.ok(row.human < 0.75, `${label}: ${word} looks like a likely human answer (${row.human.toFixed(2)})`);
    }
  });
}

test("WIFE + BROTHER: PLAY scores extremely poorly (not even an eligible answer); FAMILY dominates the predicted human answers", () => {
  const {ranked, predicted} = rankCandidates({prompts: ["wife", "brother"]});
  const family = ranked.find(r => r.word === "family"), play = ranked.find(r => r.word === "play");
  assert.ok(!play || (play.tier === 0 && play.score < family.score * 0.3), `play ${play?.score} tier ${play?.tier}`);
  assert.equal(predicted[0].word, "family");
  assert.ok(predicted[0].p >= 0.3, `family p=${predicted[0].p}`);
  assert.ok(!predicted.some(p => p.word === "play"), "PLAY is not a predicted human answer");
  // Relative and in-family words are what people say; they come next.
  assert.ok(predicted.slice(0, 3).some(p => p.word === "relative"));
});

test("SISTER + PLAY: Gary predicts game / kid / child / family / pretend answers and picks one, never a sideways swap", () => {
  const {predicted} = rankCandidates({prompts: ["sister", "play"]});
  const likely = ["game", "kid", "child", "family", "pretend", "toy", "fun"];
  assert.ok(predicted.slice(0, 5).filter(p => likely.includes(p.word)).length >= 3, predicted.map(p => p.word).join(","));
  const seen = picks(["sister", "play"]);
  for (const word of seen.keys()) assert.ok(likely.includes(word), `picked ${word}`);
  assert.ok(!seen.has("brother"), "BROTHER for SISTER is a sideways swap, not a meeting point");
  // The sideways swap is marked and halved in the human model.
  const brother = predicted.find(p => p.word === "brother");
  assert.ok(!brother || /sideways/.test(brother.why));
});

test("sideways swaps lose: APPLE + BANANA is never another fruit, DOG + CAT never another pet", () => {
  for (const word of picks(["apple", "banana"]).keys()) assert.ok(!["orange", "grape", "pear", "cherry", "lemon", "strawberry"].includes(word), word);
  for (const word of picks(["dog", "cat"]).keys()) assert.ok(!["hamster", "rabbit", "puppy", "kitten", "goldfish"].includes(word), word);
});

test("French uses the same convergence: CHIEN + CHAT → animal, POMME + BANANE → fruit, PLUIE + NEIGE → météo", () => {
  for (const [prompts, centre] of [[["chien", "chat"], ["animal", "animal domestique"]], [["pomme", "banane"], ["fruit"]], [["pluie", "neige"], ["météo"]]]) {
    const seen = picks(prompts, {language: "fr"});
    const hits = centre.reduce((sum, word) => sum + (seen.get(word) || 0), 0);
    assert.ok(hits >= SEEDS * 0.95, `${prompts}: ${JSON.stringify([...seen])}`);
  }
});

test("the trail informs but never dominates: a theme can tip a near-tie between centre words, never toward a tangent", () => {
  const farm = [["farm", "barn"], ["cow", "tractor"]];
  const plain = rankCandidates({prompts: ["dog", "cat"]}).ranked;
  const themed = rankCandidates({prompts: ["dog", "cat"], history: farm}).ranked;
  const centreOf = (rows, word) => rows.find(r => r.word === word).centre;
  assert.ok(centreOf(themed, "animal") > centreOf(plain, "animal"), "the farm trail pulls ANIMAL toward the centre");
  for (let seed = 1; seed <= 100; seed++) {
    const word = chooseResponse({prompts: ["dog", "cat"], history: farm, rng: seededRandom(seed)}).word;
    assert.ok(["pet", "animal"].includes(word), `farm trail pulled Gary to ${word}`);
  }
  // A trail about something else entirely leaves the obvious answer alone.
  const space = [["rocket", "astronaut"], ["alien", "planet"]];
  for (let seed = 1; seed <= 100; seed++) assert.equal(chooseResponse({prompts: ["rain", "snow"], history: space, rng: seededRandom(seed)}).word, "weather");
  // The centre term is only 15% of the score, of which the theme is under half.
  assert.ok(BOT_TUNING.weights.centre <= 0.15);
});

test("diagnostics: the decision shows the pair, predicted answers, every candidate's score parts, the selection and why", () => {
  const {word, decision} = chooseResponse({prompts: ["wife", "brother"], history: [["ring", "cake"]], rng: seededRandom(3), explain: true});
  assert.ok(decision);
  assert.deepEqual(decision.pair, ["wife", "brother"]);
  assert.deepEqual(decision.trail.sort(), ["cake", "ring"]);
  assert.equal(decision.selected, word);
  assert.equal(decision.candidates[0].word, word, "the selection is the top-scored candidate");
  assert.ok(decision.predicted.length >= 3);
  assert.ok(Math.abs(decision.predicted.reduce((sum, p) => sum + p.p, 0) - 1) < 0.01, "probabilities sum to 1");
  for (const p of decision.predicted) assert.ok(p.word && typeof p.p === "number" && p.why);
  const w = decision.weights;
  for (const c of decision.candidates) {
    // The score is exactly the documented weighted sum of its parts.
    const total = w.human * c.human + w.fit * c.fit + w.centre * c.centre + w.personality * c.personality - c.penalty;
    assert.ok(Math.abs(total - c.total) < 0.003, `${c.word}: ${total} vs ${c.total}`);
    assert.equal(c.sides.length, 2);
  }
  for (let i = 1; i < decision.candidates.length; i++) assert.ok(decision.candidates[i - 1].total >= decision.candidates[i].total);
  assert.match(decision.reason, /human answer/);
  assert.match(decision.reason, /fits both words/);
  // Without explain, nothing extra is returned (stored games stay small).
  assert.deepEqual(Object.keys(chooseResponse({prompts: ["wife", "brother"], rng: seededRandom(3)})).sort(), ["quality", "word"]);
});

test("Solo games keep Gary's decision per move only in developer mode, and never change his word", () => {
  const play = explain => {
    setGaryDiagnostics(explain);
    try {
      let game = startSoloGame({id: "diag", seed: 42});
      const moves = [];
      for (const word of ["kite", "family", "garden"]) {
        const r = submitSoloWord(game, word);
        assert.ok(r.ok);
        moves.push(r.move);
        game = r.game;
        if (game.status !== "ACTIVE") break;
      }
      return {moves, open: currentMove(game)};
    } finally {
      setGaryDiagnostics(false);
    }
  };
  const off = play(false), on = play(true);
  assert.deepEqual(on.moves.map(m => m.words.b), off.moves.map(m => m.words.b), "diagnostics never change Gary's words");
  for (const m of off.moves) assert.equal(m.garyDecision, undefined);
  for (const m of on.moves) {
    assert.ok(m.garyDecision, `move ${m.number} has a decision`);
    assert.equal(m.garyDecision.selected, m.words.b);
  }
  assert.equal(on.moves[0].garyDecision.pair, null, "the opening has no pair");
  assert.ok(on.moves[1].garyDecision.pair, "later moves record their pair");
});
