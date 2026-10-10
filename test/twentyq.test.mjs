import {test} from "node:test";
import assert from "node:assert/strict";
import {KNOWLEDGE} from "../src/client/twentyq/knowledge.js";
import {MAX_QUESTIONS, createGame, answerQuestion, finishGame, rankCandidates} from "../src/client/twentyq/engine.js";

test("20Q dataset has valid values", () => {
  assert.equal(KNOWLEDGE.questions.length, 26);
  assert.equal(KNOWLEDGE.items.length, 78);
  for (const item of KNOWLEDGE.items) {
    assert.equal(item.values.length, KNOWLEDGE.questions.length);
    assert.ok(item.values.every(value => Number.isFinite(value) && value >= -1 && value <= 1));
  }
});
test("20Q never repeats questions and stops at 20", () => {
  let game = createGame(KNOWLEDGE);
  const asked = new Set();
  while (game.status === "asking") {
    assert.ok(!asked.has(game.questionIndex));
    asked.add(game.questionIndex);
    game = answerQuestion(game, "unknown", KNOWLEDGE);
  }
  assert.ok(game.history.length <= MAX_QUESTIONS);
  assert.equal(game.status, "guessing");
  assert.equal(finishGame(game, true, KNOWLEDGE).status, "won");
  assert.equal(finishGame(game, false, KNOWLEDGE).status, "lost");
  assert.deepEqual(rankCandidates(KNOWLEDGE, game.history), rankCandidates(KNOWLEDGE, []));
});
test("20Q identifies every starter item with matching answers", () => {
  for (const item of KNOWLEDGE.items) {
    let game = createGame(KNOWLEDGE);
    while (game.status === "asking") {
      const value = item.values[game.questionIndex];
      game = answerQuestion(game, value > .5 ? "yes" : value < -.5 ? "no" : "sometimes", KNOWLEDGE);
    }
    assert.equal(game.guess, item.name, "Missed " + item.name);
  }
});
