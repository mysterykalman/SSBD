import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
import {Script} from "node:vm";
const root=new URL("../src/client/mom-mode/",import.meta.url);
const read=name=>readFile(new URL(name,root),"utf8");
test("Mom Mode scripts parse and keep the engine isolated",async()=>{
 for(const name of ["knowledge.js","engine.js","copy.js","adapter.js","app.js"]){const source=await read(name);assert.doesNotThrow(()=>new Script(source,{filename:name}));}
 const adapter=await read("adapter.js");
 for(const name of ["connected:true","supportedAnswers","startGame","getNextQuestion","submitAnswer","makeGuess","keepAsking","getProgress","getGuess","confirmGuess","resetGame"])assert.ok(adapter.includes(name),"missing "+name);
 assert.doesNotMatch(adapter,/engine not connected/i);
});
test("Mom Mode keeps the game surface compact and moves rules into help",async()=>{
 const html=await read("index.html");
 assert.match(html,/aria-live="polite"/);
 for(const answer of ["yes","probably","unknown","probably_not","no"])assert.ok(html.includes('data-answer="'+answer+'"'));
 for(const id of ["pam-score","pam-streak","pam-best","hunch-actions","guess-now-btn","keep-asking-btn","rules-btn","rules-dialog","rules-title","result-points"])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(html,/20 questions\. One guess\./);
 assert.match(html,/Every question is worth a point\./);
 assert.match(html,/Push your luck\./);
 assert.match(html,/>SCORE</);
 assert.doesNotMatch(html,/YOUR MOM SCORE|rules-card|round-score|Try to stump Mom again|Make Mom guess|MOM'S KITCHEN TABLE/);
 const image=await stat(new URL("pam.webp",root));assert.ok(image.size>1000);
});
test("character copy stays conversational without over-labelling the mode",async()=>{
 const copy=await read("copy.js");
 for(const term of ["bio:","intro:","early:","middle:","close:","surprise:","hunch:","hunchAside:","guess:","correct:","stumped:","uncertain:","milestones:","callbacks:","rare:","I’ll know","This is very you","one guess"])assert.ok(copy.includes(term),term);
 assert.doesNotMatch(copy,/Save room for dinner|Okay\. Recalculating|Think of a common|A wrong guess is still a wrong guess|Mom knows\./);
});
test("progression and game-state labels use the approved ladder and gamey wording",async()=>{
 const app=await read("app.js");
 assert.match(app,/ssbd:mom-progress:v1/);assert.match(app,/localStorage\.setItem/);
 for(const rank of ["Look at You","Okay, Sweetie","You’re Getting Good at This","Alright, Now You’re Showing Off","I’m Very Proud. Also Annoyed.","This Is Getting Personal, Honey","Fine. You’re the Favourite"])assert.ok(app.includes(rank),rank);
 for(const label of ["ROUND SETUP","THINKING","NARROWING IT DOWN","GETTING CLOSE","STRONG HUNCH","FINAL GUESS","ROUND WON","ROUND LOST"])assert.ok(app.includes(label),label);
 assert.match(app,/She guessed \$\{state\.guess\}\. Wrong\./);assert.match(app,/She got it: \$\{state\.guess\}\./);assert.match(app,/Next rank:/);
});
