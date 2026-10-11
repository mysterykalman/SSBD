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
 for(const name of ["connected:true","supportedAnswers","startGame","getNextQuestion","submitAnswer","makeGuess","keepAsking","getProgress","getGuess","confirmGuess","resetGame"])assert.ok(adapter.includes(name),"missing "+name);
 assert.doesNotMatch(adapter,/engine not connected/i);
});
test("Mom Mode is a live five-answer guessing game with a hunch choice",async()=>{
 const html=await read("index.html");
 assert.doesNotMatch(html,/DESIGN PREVIEW|Answers here do not affect Pam/);
 assert.match(html,/aria-live="polite"/);
 for(const answer of ["yes","probably","unknown","probably_not","no"])assert.ok(html.includes('data-answer="'+answer+'"'));
 for(const id of ["pam-score","pam-streak","pam-best","hunch-actions","guess-now-btn","keep-asking-btn","rules-title"])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(html,/20 questions\. One guess\./);
 assert.match(html,/Every question is worth a point\./);
 assert.match(html,/Push your luck\./);
 assert.match(html,/YOUR MOM SCORE/);
 assert.doesNotMatch(html,/A little about Pam|Your Pam Score keeps growing/);
 const image=await stat(new URL("pam.webp",root));
 assert.ok(image.size>1000);
});
test("Mom has a point of view, conversational hunches, callbacks, and one-guess rules",async()=>{
 const copy=await read("copy.js");
 for(const term of ["bio:","intro:","early:","middle:","close:","surprise:","hunch:","hunchAside:","guess:","correct:","stumped:","uncertain:","milestones:","callbacks:","rare:","I’ll know","This is very you","one guess"])assert.ok(copy.includes(term),term);
 assert.doesNotMatch(copy,/Save room for dinner|Okay\. Recalculating|Think of a common/);
});
test("Mom progression stays inside Mom Mode and persists locally",async()=>{
 const app=await read("app.js");
 assert.match(app,/ssbd:mom-progress:v1/);
 assert.match(app,/localStorage\.setItem/);
 assert.match(app,/Look at You/);
 assert.match(app,/Okay, Sweetie/);
 assert.match(app,/You’re Getting Good at This/);
 assert.match(app,/Alright, Now You’re Showing Off/);
 assert.match(app,/I’m Very Proud\. Also Annoyed\./);
 assert.match(app,/This Is Getting Personal, Honey/);
 assert.match(app,/Fine\. You’re the Favourite/);
 assert.match(app,/bestStreak/);
 assert.match(app,/Next rank:/);
});
