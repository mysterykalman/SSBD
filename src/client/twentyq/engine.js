// Browser-only adaptive Twenty Questions engine. No networking or persistent state.
// Original knowledge values are adapted from FergusGriggs/20q (MIT); see LICENSE-FergusGriggs.txt.
export const MAX_QUESTIONS = 20;
export const ANSWERS = ["yes", "no", "sometimes", "unknown"];

/** Smoothed likelihood: -1 is "no", +1 is "yes", zero is uncertain. */
export function answerLikelihood(value, answer) {
  if (answer === "unknown") return 1;
  if (answer === "yes") return 0.06 + 0.88 * (value + 1) / 2;
  if (answer === "no") return 0.06 + 0.88 * (1 - value) / 2;
  if (answer === "sometimes") return 0.08 + 0.84 * (1 - Math.abs(value));
  throw new Error("Invalid answer");
}

/** Normalized candidate probabilities using a smoothed naïve-Bayes score. */
export function rankCandidates(knowledge, history) {
  const scores = knowledge.items.map((item, index) => {
    let log = Math.log1p(item.samples) * 0.15;
    for (const {index: questionIndex, answer} of history) {
      log += Math.log(answerLikelihood(item.values[questionIndex], answer));
    }
    return {index, name: item.name, log};
  });
  const max = Math.max(...scores.map(candidate => candidate.log));
  const exps = scores.map(candidate => Math.exp(candidate.log - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return scores.map((candidate, i) => ({
    index: candidate.index, name: candidate.name, probability: exps[i] / total
  })).sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));
}

function binaryEntropy(p) {
  return p <= 0 || p >= 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/** Pick the unused question with the highest expected information gain. */
export function nextQuestion(knowledge, history, ranked = rankCandidates(knowledge, history)) {
  const used = new Set(history.map(answer => answer.index));
  let best = -1;
  let bestScore = -1;
  for (let q = 0; q < knowledge.questions.length; q++) {
    if (used.has(q)) continue;
    let mean = 0;
    let entropy = 0;
    for (const candidate of ranked) {
      const p = 0.06 + 0.88 * (knowledge.items[candidate.index].values[q] + 1) / 2;
      mean += candidate.probability * p;
      entropy += candidate.probability * binaryEntropy(p);
    }
    const score = binaryEntropy(mean) - entropy;
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}

/** Pure transitions keep the game testable and isolated from the main SSBD app. */
export function createGame(knowledge) {
  return {
    history: [],
    questionIndex: nextQuestion(knowledge, []),
    status: "asking",
    guess: null
  };
}

export function answerQuestion(game, answer, knowledge) {
  if (game.status !== "asking") throw new Error("Game is not asking a question");
  if (!ANSWERS.includes(answer)) throw new Error("Invalid answer");
  const history = [...game.history, {index: game.questionIndex, answer}];
  const ranked = rankCandidates(knowledge, history);
  const next = nextQuestion(knowledge, history, ranked);
  const meaningful = history.filter(entry => entry.answer !== "unknown").length;
  const top = ranked[0];
  const runnerUp = ranked[1];
  const confident = history.length >= 7 && meaningful >= 6 &&
    top.probability >= 0.96 && (!runnerUp || top.probability - runnerUp.probability >= 0.6);
  const ready = history.length >= MAX_QUESTIONS || next < 0 || confident;
  return {
    history,
    questionIndex: ready ? null : next,
    status: ready ? "guessing" : "asking",
    guess: ready ? top.name : null
  };
}

export function finishGame(game, correct, knowledge) {
  if (game.status !== "guessing") throw new Error("No guess to confirm");
  return {
    ...game,
    status: correct ? "won" : "lost",
    alternatives: correct ? [] : rankCandidates(knowledge, game.history)
      .filter(candidate => candidate.name !== game.guess)
      .slice(0, 3).map(candidate => candidate.name)
  };
}
