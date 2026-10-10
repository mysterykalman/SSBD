import {KNOWLEDGE} from "./knowledge.js";
import {MAX_QUESTIONS, createGame, answerQuestion, finishGame} from "./engine.js";

const root = document.getElementById("twentyq-root");
let game;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function add(parent, tag, className, text) {
  const node = el(tag, className, text);
  parent.append(node);
  return node;
}
function action(parent, text, className, onClick) {
  const node = add(parent, "button", className, text);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}
function screen() {
  const section = el("section", "card");
  root.replaceChildren(section);
  return section;
}
function start() {
  game = createGame(KNOWLEDGE);
  render();
}
function renderStart() {
  const box = screen();
  box.classList.add("intro");
  add(box, "p", "eyebrow", "YOU THINK IT. I GUESS IT.");
  add(box, "div", "twenty-mark", "20?");
  add(box, "h1", "title", "Twenty questions. One very nosy machine.");
  add(box, "p", "lede", "Think of an everyday object, food, or animal. Keep it a secret. I'll ask up to 20 questions and try to guess.");
  action(box, "I'm thinking of something →", "primary", start);
  add(box, "p", "fineprint", "Experimental starter brain: " + KNOWLEDGE.items.length + " possible things. It might guess spectacularly wrong.");
}
function renderQuestion() {
  const box = screen();
  box.classList.add("question-card");
  const number = game.history.length + 1;
  add(box, "p", "eyebrow", "QUESTION " + number + " OF " + MAX_QUESTIONS);
  const bar = add(box, "div", "progress");
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-valuenow", String(game.history.length));
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", String(MAX_QUESTIONS));
  bar.setAttribute("aria-label", "Questions answered");
  const fill = add(bar, "span", "progress-fill");
  fill.style.width = (100 * game.history.length / MAX_QUESTIONS) + "%";
  add(box, "p", "question-intro", "Okay, tell me this…");
  add(box, "h1", "question", KNOWLEDGE.questions[game.questionIndex]);
  add(box, "p", "hint", "Go with your first instinct.");
  const buttons = add(box, "div", "answers");
  buttons.setAttribute("role", "group");
  buttons.setAttribute("aria-label", "Your answer");
  for (const [answer, label] of [["yes", "Yes"], ["no", "No"], ["sometimes", "Sometimes"], ["unknown", "Don't know"]]) {
    action(buttons, label, "answer " + answer, () => {
      game = answerQuestion(game, answer, KNOWLEDGE);
      render();
    });
  }
  action(box, "Start over", "text-button", renderStart);
}
function renderGuess() {
  const box = screen();
  box.classList.add("result-card");
  add(box, "p", "eyebrow", "MY FINAL ANSWER");
  add(box, "div", "result-icon", "?");
  add(box, "p", "question-intro", "After " + game.history.length + " questions, I'm going with…");
  const name = game.guess;
  add(box, "h1", "guess", name[0].toUpperCase() + name.slice(1));
  add(box, "p", "hint", "Did I get it right?");
  const actions = add(box, "div", "guess-actions");
  action(actions, "Nailed it!", "primary", () => { game = finishGame(game, true, KNOWLEDGE); render(); });
  action(actions, "Nope, try harder", "secondary", () => { game = finishGame(game, false, KNOWLEDGE); render(); });
}
function renderResult() {
  const won = game.status === "won";
  const box = screen();
  box.classList.add("result-card");
  add(box, "p", "eyebrow", won ? "MIND READING: SUCCESSFUL" : "MIND READING: QUESTIONABLE");
  add(box, "div", "result-icon " + (won ? "success" : "failure"), won ? "★" : "!");
  add(box, "h1", "title", won ? "I knew it. Obviously." : "Well, that's embarrassing.");
  add(box, "p", "lede", won
    ? "Got it in " + game.history.length + " questions. Don't worry, I won't let it go to my head."
    : "This little brain only knows a limited set of things. You may have stumped it fair and square.");
  if (!won && game.alternatives.length) add(box, "p", "alternatives", "Other things I considered: " + game.alternatives.join(", ") + ".");
  action(box, "Play another round →", "primary", start);
  const link = add(box, "a", "text-button home-link", "Back to Same Same but Different");
  link.href = "/";
}
function render() {
  if (!game) return renderStart();
  if (game.status === "asking") return renderQuestion();
  if (game.status === "guessing") return renderGuess();
  return renderResult();
}
render();
