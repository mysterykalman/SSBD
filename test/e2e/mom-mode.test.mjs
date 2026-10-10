import test from "node:test";
import assert from "node:assert/strict";
import {startServer,launch} from "./helpers.mjs";

let server,browser;
test.before(async()=>{server=await startServer({database:false});browser=await launch();});
test.after(async()=>{await browser?.close();await server?.stop();});

async function advance(page){
 if(await page.locator('#guess-actions:not([hidden])').count())await page.click('#wrong-btn');
 else if(await page.locator('#answer-actions:not([hidden])').count())await page.click('[data-answer="no"]');
}
async function reachGuess(page){
 for(let i=0;i<20;i++){
  if(await page.locator('#guess-actions:not([hidden])').count())return;
  if(await page.locator('#result-actions:not([hidden])').count())return;
  await page.click('[data-answer="no"]');
 }
}
async function playUntilResult(page){
 for(let i=0;i<24;i++){
  if(await page.locator('#result-actions:not([hidden])').count())return;
  await advance(page);
 }
 await page.waitForSelector('#result-actions:not([hidden])');
}

test("Stump Mom supports Pam wins, player wins, scorekeeping, replay, and mobile layout",async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(`${server.url}/mom/`);
 await page.waitForSelector('#start-btn');
 assert.equal(await page.locator('.portrait').evaluate(img=>img.naturalWidth>0),true);
 assert.equal((await page.locator('#score-you').textContent()).trim(),"0");
 assert.equal((await page.locator('#score-pam').textContent()).trim(),"0");

 // Pam win.
 await page.click('#start-btn');
 await page.waitForSelector('#answer-actions:not([hidden])');
 await reachGuess(page);
 await page.waitForSelector('#guess-actions:not([hidden])');
 await page.click('#correct-btn');
 await page.waitForSelector('#result-actions:not([hidden])');
 assert.match(await page.locator('#pam-question').textContent(),/You were thinking of/i);
 assert.equal((await page.locator('#score-pam').textContent()).trim(),"1");

 // Player win by rejecting guesses / answering until Pam uses all 20 turns.
 await page.click('#again-btn');
 await page.waitForSelector('#start-btn');
 await page.click('#start-btn');
 await playUntilResult(page);
 assert.match(await page.locator('#pam-question').textContent(),/You stumped Mom/i);
 assert.equal((await page.locator('#score-you').textContent()).trim(),"1");

 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 assert.equal(overflow,false);
 await page.click('#result-actions a[href="/"]');
 await page.waitForSelector('#startSolo');
 await page.close();
});

test("existing home still exposes Solo and Together plus live Mom Mode",async()=>{
 const page=await browser.newPage();
 await page.goto(server.url);
 await page.waitForSelector('#startSolo');
 assert.ok(await page.locator('#createFamily').count());
 await page.waitForSelector('.mom-card a.btn');
 assert.equal(await page.locator('.mom-card a.btn').getAttribute('href'),'/mom/');
 assert.match(await page.locator('.mom-card a.btn').textContent(),/stump Pam/i);
 await page.close();
});
