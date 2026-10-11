import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
import {Script} from "node:vm";
const root=new URL("../src/client/mom-mode/",import.meta.url);
const read=name=>readFile(new URL(name,root),"utf8");
test("Mom Mode scripts parse and keep the engine isolated",async()=>{
 for(const name of ["knowledge.js","engine.js","copy.js","adapter.js","app.js"]){
  const source=await read(name);
  assert.doesNotThrow(()=>new Script(source,{filename:name}));
 }
 const adapter=await read("adapter.js");
 for(const name of ["connected:true","supportedAnswers","startGame","getNextQuestion","submitAnswer","getProgress","getGuess","confirmGuess","resetGame"])assert.ok(adapter.includes(name),"missing "+name);
 assert.doesNotMatch(adapter,/engine not connected/i);
});
test("Mom Mode is a live five-answer guessing game",async()=>{
 const html=await read("index.html");
 assert.doesNotMatch(html,/DESIGN PREVIEW|Answers here do not affect Pam/);
 assert.match(html,/aria-live="polite"/);
 for(const answer of ["yes","probably","unknown","probably_not","no"])assert.ok(html.includes('data-answer="'+answer+'"'));
 const image=await stat(new URL("pam.webp",root));
 assert.ok(image.size>1000);
});
test("Pam has a point of view, conversational states, and callbacks",async()=>{
 const copy=await read("copy.js");
 for(const term of ["bio:","intro:","early:","middle:","close:","surprise:","guess:","correct:","wrongGuess:","uncertain:","callbacks:","rare:","I’ll know","This is very you"])assert.ok(copy.includes(term),term);
 assert.doesNotMatch(copy,/Save room for dinner|Okay\. Recalculating/);
});
