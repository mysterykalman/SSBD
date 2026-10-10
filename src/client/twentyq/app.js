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
