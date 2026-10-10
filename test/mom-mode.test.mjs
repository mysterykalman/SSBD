import test from "node:test";
import assert from "node:assert/strict";
import {readFile,stat} from "node:fs/promises";
import {Script} from "node:vm";
const root=new URL("../src/client/mom-mode/",import.meta.url);
const read=name=>readFile(new URL(name,root),"utf8");
test("Mom Mode scripts parse and keep the engine isolated",async()=>{
 for(const name of ["copy.js","adapter.js","app.js"])assert.doesNotThrow(()=>new Script(await read(name),{filename:name}));
 const adapter=await read("adapter.js");
 for(const name of ["connected","supportedAnswers","start()","answer()","confirm()","reset()"])assert.ok(adapter.includes(name),"missing "+name);
 assert.match(adapter,/engine not connected/);
});
test("Mom Mode is clearly a preview, not a guessing engine",async()=>{
 const html=await read("index.html");
 assert.match(html,/DESIGN PREVIEW/);
 assert.match(html,/Answers here do not affect Pam/);
 assert.match(html,/aria-live="polite"/);
 for(const answer of ["yes","no","probably","unknown"])assert.ok(html.includes('data-answer="'+answer+'"'));
 const image=await stat(new URL("pam.webp",root));
 assert.ok(image.size>1000);
});
test("Pam has complete character states",async()=>{
 const copy=await read("copy.js");
 for(const term of ["bio:","intro:","early:","middle:","close:","guess:","correct:","incorrect:","replay:","exit:","Janice"])assert.ok(copy.includes(term),term);
});
