import test from "node:test";
import assert from "node:assert/strict";
import {startServer,launch} from "./helpers.mjs";

let server,browser;
test.before(async()=>{server=await startServer({database:false});browser=await launch();});
test.after(async()=>{await browser?.close();await server?.stop();});

async function reachGuess(page){
 for(let i=0;i<20;i++){
  if(await page.locator('#guess-actions:not([hidden])').count())return;
  await page.click('[data-answer="no"]');
 }
 await page.waitForSelector('#guess-actions:not([hidden])');
}

test("Mom Mode loads, advances, confirms both result paths, replays, exits, and fits mobile",async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(`${server.url}/mom/`);
 await page.waitForSelector('#start-btn');
 assert.equal(await page.locator('.portrait').evaluate(img=>img.naturalWidth>0),true);
 await page.click('#start-btn');
 await page.waitForSelector('#answer-actions:not([hidden])');
 const aside=page.locator('#pam-aside');
 assert.equal(await aside.locator('button').count(),0);
 await reachGuess(page);
 await page.click('#correct-btn');
 await page.waitForSelector('#result-actions:not([hidden])');
 assert.match(await page.locator('#pam-question').textContent(),/You were thinking of/i);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 assert.equal(overflow,false);
 await page.click('#again-btn');
 await page.waitForSelector('#start-btn');
 await page.click('#start-btn');
 await reachGuess(page);
 await page.click('#wrong-btn');
 await page.waitForSelector('#result-actions:not([hidden])');
 assert.match(await page.locator('#pam-question').textContent(),/I missed/i);
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
 assert.match(await page.locator('.mom-card a.btn').textContent(),/Play Mom Mode/);
 await page.close();
});
