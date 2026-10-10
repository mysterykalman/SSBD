import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
import {Script} from "node:vm";
const root=new URL("../src/client/mom-mode/",import.meta.url);
const read=name=>readFile(new URL(name,root),"utf8");

test("Mom Mode scripts parse and keep the engine isolated",async()=>{
 for(const name of ["knowledge.generated.js","knowledge.js","engine.js","copy.js","adapter.js","app.js"]){
  const source=await read(name);
  assert.doesNotThrow(()=>new Script(source,{filename:name}));
 }
 const adapter=await read("adapter.js");
 for(const name of ["connected:true","supportedAnswers","startGame","getNextQuestion","submitAnswer","getProgress","getGuess","confirmGuess","resetGame","knowledgeMeta"])assert.ok(adapter.includes(name),"missing "+name);
 assert.doesNotMatch(adapter,/engine not connected/i);
});

test("Stump Mom is a live five-answer challenge with a persistent scoreboard",async()=>{
 const html=await read("index.html");
 assert.match(html,/Can you stump Mom\?/i);
 assert.match(html,/score-you/);
 assert.match(html,/score-pam/);
 assert.match(html,/20 turns/i);
 assert.match(html,/knowledge\.generated\.js/);
 assert.match(html,/aria-live="polite"/);
 for(const answer of ["yes","probably","unknown","probably_not","no"])assert.ok(html.includes('data-answer="'+answer+'"'));
 const app=await read("app.js");
 assert.match(app,/localStorage/);
 assert.match(app,/winner==="player"/);
 const image=await stat(new URL("pam.webp",root));
 assert.ok(image.size>1000);
});

test("Pam has competitive win, miss, and stumped character states",async()=>{
 const copy=await read("copy.js");
 for(const term of ["bio:","intro:","early:","middle:","close:","surprise:","guess:","correct:","wrongGuess:","stumped:","stumpedAsides:","Janice"])assert.ok(copy.includes(term),term);
});

test("generated knowledge ships a meaningful offline expansion",async()=>{
 const source=await read("knowledge.generated.js");
 assert.match(source,/Taylor Swift/);
 assert.match(source,/Mickey Mouse/);
 assert.match(source,/Eiffel Tower/);
 assert.match(source,/seedObjects":200/);
});
