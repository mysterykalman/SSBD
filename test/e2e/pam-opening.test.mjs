import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer,launch} from './helpers.mjs';

const choices=['person','place','animal_plant','object','entertainment','other'];
let server,browser;
test.before(async()=>{server=await startServer({database:false});browser=await launch();});
test.after(async()=>{await browser?.close();await server?.stop();});

for(const width of [320,390,1280]){
 test(`Pam's six opening choices work on ${width}px with a two-column, three-row keyboard-accessible grid`,async()=>{
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  for(const answer of choices){
   await page.goto(server.url+'/mom/');
   if(await page.locator('#pam-intro-dialog[open]').count())await page.click('#pam-intro-play');
   await page.locator('#secret-word').fill('an imaginary test subject');
   await page.locator('#start-btn').click();
   await page.locator('#category-actions:not([hidden])').waitFor();
   const buttons=page.locator('#category-actions button[data-answer]');
   assert.equal(await buttons.count(),6);
   assert.equal(await page.locator('#pam-question').textContent(),'What kind of thing are you thinking of?');
   const cells=await buttons.evaluateAll(nodes=>nodes.map(node=>{
    const r=node.getBoundingClientRect();
    return{x:r.x,y:r.y,width:r.width,height:r.height,label:node.textContent.trim()};
   }));
   assert.deepEqual(cells.map(x=>x.label),['Person','Place','Animal or Plant','Object','Entertainment','Other']);
   for(let row=0;row<3;row++){
    assert.ok(Math.abs(cells[row*2].y-cells[row*2+1].y)<3);
    assert.ok(cells[row*2+1].x>cells[row*2].x);
    assert.ok(cells[row*2].width>=100&&cells[row*2].height>=40);
    if(row)assert.ok(cells[row*2].y>cells[(row-1)*2].y);
   }
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
   assert.equal(overflow,false,'Opening must not create horizontal scrolling');
   await page.locator(`#category-actions [data-answer="${answer}"]`).focus();
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('#category-actions:not([hidden])').count(),0);
   assert.ok(await page.locator('#answer-actions:not([hidden]),#hunch-actions:not([hidden]),#guess-actions:not([hidden])').count());
   assert.equal(await page.locator('#question-counter').textContent(),'1 / 20');
  }
  assert.deepEqual(errors,[]);
  await page.close();
 });
}
