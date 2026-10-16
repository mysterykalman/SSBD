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
  if(await page.locator('#category-actions:not([hidden])').count())await page.click('#category-actions [data-answer="other"]');
  else if(await page.locator('#answer-actions:not([hidden])').count())await page.click('#answer-actions [data-answer="no"]');
  else await page.waitForTimeout(20);
 }
 if(await page.locator('#result-actions:not([hidden])').count())return 'result';
 throw new Error('Mom Mode did not reach a guess or result');
}

function assertMomRuntimeAssets(scriptPaths){
 assert.ok(scriptPaths.some(path=>/^\/mom\/assets\/knowledge\.generated\.[a-f0-9]{10}\.js$/.test(path)));
 assert.ok(scriptPaths.some(path=>/^\/mom\/assets\/engine\.[a-f0-9]{10}\.js$/.test(path)));
 assert.equal(scriptPaths.some(path=>path==='/mom/knowledge.generated.js'),false);
 assert.ok(scriptPaths.some(path=>/^\/mom\/assets\/debug\.[a-f0-9]{10}\.js$/.test(path)));
}

test("Mom Mode loads the frozen offline runtime, richer answers, portrait and rules, persists progression, replays, exits, and fits mobile",async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto(`${server.url}/mom/`);
 await page.waitForSelector('#start-btn');
 const scriptPaths=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(node=>new URL(node.src).pathname));
 assertMomRuntimeAssets(scriptPaths);
 const stylePaths=await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(node=>new URL(node.href).pathname));
 assert.ok(stylePaths.some(path=>/^\/mom\/assets\/styles\.[a-f0-9]{10}\.css$/.test(path)));
 assert.ok(stylePaths.some(path=>/^\/mom\/assets\/character\.[a-f0-9]{10}\.css$/.test(path)));
 assert.equal(await page.locator('.portrait').evaluate(img=>img.naturalWidth>0),true);
 assert.match(await page.locator('#rules-btn').textContent(),/How to play/i);
 await page.click('#rules-btn');
 await page.waitForSelector('#rules-dialog[open]');
 assert.match(await page.locator('#rules-dialog').textContent(),/20 questions\. One guess\./i);
 assert.match(await page.locator('#rules-dialog').textContent(),/Animal.*vegetable.*mineral/is);
 await page.click('#rules-close');
 assert.equal(await page.locator('#rules-dialog[open]').count(),0);
 assert.equal(await page.locator('#pam-score').textContent(),'0');
 assert.match(await page.locator('.score-label').textContent(),/^SCORE$/i);
 await page.fill('#secret-word','chair');
 await page.click('#start-btn');
 await page.waitForSelector('#category-actions:not([hidden])');
 assert.equal(await page.locator('#category-actions [data-answer]').count(),4);
 await page.click('#category-actions [data-answer="other"]');
 await page.waitForSelector('#answer-actions:not([hidden])');
 assert.equal(await page.locator('#answer-actions [data-answer]').count(),6);
 for(const answer of ['yes','probably','maybe','unknown','doubtful','no'])assert.equal(await page.locator(`#answer-actions [data-answer="${answer}"]`).count(),1);
 const aside=page.locator('#pam-aside');
 assert.equal(await aside.locator('button').count(),0);
 const first=await reachDecision(page);
 if(first==='guess'){
  await page.click('#correct-btn');
  await page.waitForSelector('#result-actions:not([hidden])');
  assert.match(await page.locator('#pam-question').textContent(),/She got it:/i);
 }
 assert.match(await page.locator('#result-points').textContent(),/points/i);
 const scoreAfterFirst=Number((await page.locator('#pam-score').textContent()).replace(/,/g,''));
 assert.ok(scoreAfterFirst>=0);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('ssbd:mom-progress:v1')));
 assert.equal(stored.totalPoints,scoreAfterFirst);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
 assert.equal(overflow,false);
 await page.click('#again-btn');
 await page.waitForSelector('#start-btn');
 assert.equal(Number((await page.locator('#pam-score').textContent()).replace(/,/g,'')),scoreAfterFirst);
 await page.fill('#secret-word','lamp');
 await page.click('#start-btn');
 const second=await reachDecision(page);
 if(second==='guess'){
  await page.click('#wrong-btn');
  await page.waitForSelector('#result-actions:not([hidden])');
  assert.match(await page.locator('#pam-question').textContent(),/She guessed .*\. Wrong\./i);
  assert.equal(await page.locator('#answer-actions:not([hidden])').count(),0);
  assert.equal(await page.locator('#guess-actions:not([hidden])').count(),0);
 }
 assert.match(await page.locator('#result-points').textContent(),/points/i);
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
 assert.match(await page.locator('#guess-now-btn').textContent(),/Make her guess/i);
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
 assert.match(await page.locator('.mom-card a.btn').textContent(),/^Stump Pam$/);
 assert.equal(await page.locator('.mom-card-art').evaluate(img=>img.naturalWidth>0),true);
 await page.close();
});
