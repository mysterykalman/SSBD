import test from "node:test";
import assert from "node:assert/strict";
import {startServer,launch} from "./helpers.mjs";

let server,browser;
test.before(async()=>{server=await startServer({database:false});browser=await launch();});
test.after(async()=>{await browser?.close();await server?.stop();});

async function reachDecision(page){
 for(let i=0;i<24;i++){
  if(await page.locator('#hunch-actions:not([hidden])').count()){
   await page.click('#guess-now-btn');
   await page.waitForSelector('#guess-actions:not([hidden])');
   return 'guess';
  }
  if(await page.locator('#guess-actions:not([hidden])').count())return 'guess';
  if(await page.locator('#result-actions:not([hidden])').count())return 'result';
  if(await page.locator('#answer-actions:not([hidden])').count())await page.click('[data-answer="no"]');
  else await page.waitForTimeout(20);
 }
 if(await page.locator('#result-actions:not([hidden])').count())return 'result';
 throw new Error('Mom Mode did not reach a guess or result');
}

test("Mom Mode loads, scores outcomes, persists progression, replays, exits, and fits mobile",async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(`${server.url}/mom/`);
 await page.waitForSelector('#start-btn');
 assert.equal(await page.locator('.portrait').evaluate(img=>img.naturalWidth>0),true);
 assert.equal(await page.locator('#pam-score').textContent(),'0');
 assert.ok(await page.locator('#rules-title').count());
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
 assert.equal(await page.locator('#round-score:not([hidden])').count(),1);
 const scoreAfterFirst=Number((await page.locator('#pam-score').textContent()).replace(/,/g,''));
 assert.ok(scoreAfterFirst>=0);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('ssbd:mom-progress:v1')));
 assert.equal(stored.totalPoints,scoreAfterFirst);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 assert.equal(overflow,false);
 await page.click('#again-btn');
 await page.waitForSelector('#start-btn');
 assert.equal(Number((await page.locator('#pam-score').textContent()).replace(/,/g,'')),scoreAfterFirst);
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
 assert.ok(Number(await page.locator('#pam-streak').textContent())>=1);
 await page.click('#result-actions a[href="/"]');
 await page.waitForSelector('#startSolo');
 await page.close();
});

test("Mom Mode exposes the push-your-luck controls when a hunch is shown",async()=>{
 const page=await browser.newPage();
 await page.goto(`${server.url}/mom/`);
 assert.ok(await page.locator('#guess-now-btn').count());
 assert.ok(await page.locator('#keep-asking-btn').count());
 assert.match(await page.locator('#keep-asking-btn').textContent(),/costs 2 pts/i);
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
