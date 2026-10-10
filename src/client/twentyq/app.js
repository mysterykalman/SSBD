import {KNOWLEDGE} from "./knowledge.js";
import {createGame, answerQuestion, finishGame} from "./engine.js";
const root = document.getElementById("twentyq-root");
let game = createGame(KNOWLEDGE);
root.textContent = KNOWLEDGE.questions[game.questionIndex];
