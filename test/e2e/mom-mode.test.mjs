import test from "node:test";
import assert from "node:assert/strict";
import {startServer,launch} from "./helpers.mjs";

let server,browser;
test.before(async()=>{server=await startServer({database:false});browser=await launch();});
test.after(async()=>{await browser?.close();await server?.stop();});

async function reachDecision(page){
 for(let i=0;i<20;i++){
  if(await page.locator('#guess-actions:not([hidden])').count())return 'guess';
  if(await page.locator('#result-actions:not([hidden])').count())return 'result';
  await page.click('[data-answer="no"]');
 }
 if(await page.locator('#guess-actions:not([hidden])').count())return 'guess';
 await page.waitForSelector('#result-actions:not([hidden])');
 return 'result';
}

test("Mom Mode loads, advances, uses one guess, scores outcomes, replays, exits, and fits mobile",async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(`${server.url}/mom/`);
 await page.waitForSelector('#start-btn');
 assert.equal(await page.locator('.portrait').evaluate(img=>img.naturalWidth>0),true);
 await page.click('#start-btn');
 await page.waitForSelector('#answer-actions:not([hidden])');
 const aside=page.locator('#pam-aside');
 assert.equal(await aside.locator('button').count(),0);
 const first=await reachDecision(page);
 if(first==='guess'){
  await page.click('#correct-btn');
  await page.waitForSelector('#result-actions:not([hidden])');
  assert.match(await page.locator('#pam-question').textContent(),/You were thinking of/i);
 }else{
  assert.match(await page.locator('#pam-question').textContent(),/20 questions/i);
 }
 assert.match(await page.locator('#pam-aside').textContent(),/points/i);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 assert.equal(overflow,false);
 await page.click('#again-btn');
 await page.waitForSelector('#start-btn');
 await page.click('#start-btn');
 const second=await reachDecision(page);
 if(second==='guess'){
  await page.click('#wrong-btn');
  await page.waitForSelector('#result-actions:not([hidden])');
  assert.match(await page.locator('#pam-question').textContent(),/was wrong/i);
  assert.equal(await page.locator('#answer-actions:not([hidden])').count(),0);
  assert.equal(await page.locator('#guess-actions:not([hidden])').count(),0);
 }else{
  assert.match(await page.locator('#pam-question').textContent(),/20 questions/i);
 }
 assert.match(await page.locator('#pam-aside').textContent(),/points/i);
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
