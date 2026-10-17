// Comprehensive evidence capture. Run: node scripts/audit-full-gameplay.mjs
// Requires an already running local SSBD server. Never writes to production.
import {chromium} from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import {execFileSync} from "node:child_process";

const origin = process.env.SSBD_AUDIT_URL || "http://localhost:8787";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(origin)) throw Error("Audit requires a local server. Set SSBD_AUDIT_URL to localhost.");
const viewports = [
  [320,568],[360,640],[375,667],[390,844],[393,852],[414,896],[430,932],
  [768,1024],[820,1180],[1024,1366],[667,375],[844,390],[932,430],[1024,768],
  [1280,720],[1440,900],[1920,1080]
];
const sha = (()=>{try{return execFileSync("git",["rev-parse","--short","HEAD"],{encoding:"utf8"}).trim();}catch{return"unknown";}})();
const out = path.join("artifacts","full-audit",new Date().toISOString().replace(/[:.]/g,"-")+"-"+sha);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined});
const report=[];
let serial=0;
const safe=s=>String(s).replace(/[^a-z0-9-]+/gi,"-").slice(0,65);
async function capture(page,mode,scenario,step,notes=""){
  const viewport=page.viewportSize();
  const label=`${String(++serial).padStart(4,"0")}-${safe(mode)}-${safe(scenario)}-${safe(step)}-${viewport.width}x${viewport.height}`;
  const file=label+".png";
  await page.screenshot({path:path.join(out,file),fullPage:true,animations:"disabled",timeout:12000});
  const issues=await page.evaluate(()=>{
    const w=document.documentElement.clientWidth;
    const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return r.width>0&&r.height>0&&s.visibility!=="hidden"&&s.display!=="none"&&!el.closest("[hidden],[inert]");};
    const els=[...document.querySelectorAll('button,a,input,textarea,[role="button"]')].filter(visible);
    const offscreen=els.filter(e=>{const r=e.getBoundingClientRect();return r.left < -2||r.right>w+2}).map(e=>e.id||e.textContent?.trim().slice(0,28)).slice(0,12);
    const overlaps=[];
    for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){
      const a=els[i],b=els[j];if(a.contains(b)||b.contains(a))continue;
      const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
      if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>5&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>5)
        overlaps.push([a.id||a.textContent?.trim().slice(0,15),b.id||b.textContent?.trim().slice(0,15)]);
      if(overlaps.length>=12)break;
    }
    const brokenImages=[...document.images].filter(i=>visible(i)&&i.complete&&i.naturalWidth===0).map(i=>i.src.slice(-90));
    return {overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)>w+2,offscreen,overlaps:overlaps.slice(0,12),brokenImages};
  });
  const status=issues.overflow||issues.offscreen.length||issues.overlaps.length||issues.brokenImages.length?"FAIL":"PASS";
  report.push({mode,scenario,step,viewport,status,notes,screenshot:file,issues});
}
async function run(mode,scenario,viewport,fn){
  const context=await browser.newContext({viewport:{width:viewport[0],height:viewport[1]},reducedMotion:"reduce"});
  await context.addInitScript(()=>{localStorage.setItem("ssbd_gary_met","1");localStorage.setItem("ssbd_milo_met","1");window.__garyRandom=()=>0.99;});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=500)errors.push(`HTTP ${r.status()} ${r.url()}`);});
  page.setDefaultTimeout(6000);
  try{
    await page.goto(origin,{waitUntil:"domcontentloaded",timeout:15000});
    // The welcome dialog is intentionally modal. Capture it once per viewport, then
    // dismiss through the actual UI before testing underlying game controls.
    const intro=page.locator("#audioIntroWelcome[open]");
    if(await intro.count()){
      if(mode==="together")await capture(page,"global","welcome","intro-open");
      await page.locator("#audioIntroSkip").click();
      await intro.waitFor({state:"detached",timeout:4000});
    }
    await fn(page);
  }
  catch(e){report.push({mode,scenario,viewport:{width:viewport[0],height:viewport[1]},status:"BLOCKED",error:e.message.slice(0,350)});try{await capture(page,mode,scenario,"blocked");}catch{}}
  if(errors.length)report.push({mode,scenario,viewport,status:"FAIL",errors});
  await context.close();
}
async function pam(page){
  await page.goto(new URL("/mom/",origin).href);
  if(await page.locator("#pam-intro-dialog[open]").count())await page.locator("#pam-intro-play").click();
  await capture(page,"pam","round","setup");
  await page.locator("#secret-word").fill("chair");
  await page.locator("#start-btn").click();
  await capture(page,"pam","round","category");
  await page.locator('#category-actions [data-answer="other"]').click();
  for(let i=0;i<24;i++){
    const stage=await page.locator(".game-card").getAttribute("data-stage");
    await capture(page,"pam","round",stage+"-"+i);
    if(stage==="question")await page.locator('#answer-actions [data-answer="'+(["yes","probably","maybe","unknown","doubtful","no"][i%6])+'"]').click();
    else if(stage==="category")await page.locator('#category-actions [data-answer="other"]').click();
    else if(stage==="hunch")await page.locator("#guess-now-btn").click();
    else if(stage==="guess"){await page.locator("#wrong-btn").click();await capture(page,"pam","round","result");await page.locator("#again-btn").click();await capture(page,"pam","round","replay");return;}
    else if(stage==="result"){await capture(page,"pam","round","result");return;}
    else throw Error("Unknown Pam stage "+stage);
  }
  throw Error("Pam did not reach a result within 24 steps");
}
async function solo(page,character){
  await page.locator("#startSolo").click();
  await page.locator("#characterPicker[open]").waitFor();
  await capture(page,"solo",character,"picker");
  await page.locator('#characterPicker label[data-character="'+character+'"]').click();
  await page.locator("#startCharacter").click();
  await page.locator("#word").waitFor();
  await capture(page,"solo",character,"move-1");
  const bot=await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem("ssbd.store"));const id=location.pathname.split("/").pop();return d.solo[id].moves.at(-1).hidden?.b;});
  if(!bot)throw Error("No locked bot word; cannot prove a real win");
  await page.locator("#word").fill(bot);
  await page.locator("#lockBtn").click();
  await capture(page,"solo",character,"reveal-or-win");
  if(await page.locator("#revealContinue").count())await page.locator("#revealContinue").click();
  await page.locator(".end.win").waitFor();
  await capture(page,"solo",character,"win");
  await page.locator("#newGameBtn").click();
  await capture(page,"solo",character,"replay");
}
async function odd(page,tier){
  const launch=page.locator('[data-mode="connections"] button').first();
  await launch.waitFor({timeout:8000});
  await launch.click();
  await capture(page,"odd-one-in","tier-"+tier,"picker");
  await page.locator(".conn-tier").nth(tier-1).click();
  await page.locator(".conn-tile").first().waitFor();
  await capture(page,"odd-one-in","tier-"+tier,"board");
  for(let n=0;n<4;n++)await page.locator(".conn-tile").nth(n).click();
  await capture(page,"odd-one-in","tier-"+tier,"four-selected");
  await page.getByRole("button",{name:"Submit"}).click();
  await capture(page,"odd-one-in","tier-"+tier,"submitted");
  // No test-only puzzle solution exposure: do not falsely label this as solved.
  if(await page.getByRole("button",{name:"Deselect all"}).isEnabled())await page.getByRole("button",{name:"Deselect all"}).click();
  await capture(page,"odd-one-in","tier-"+tier,"after-selection");
}
async function together(page){
  await capture(page,"together","entry","home");
  await page.locator("#createFamily").click();
  await capture(page,"together","entry","name-dialog");
  await page.locator("#nameInput").fill("Audit Host");
  await page.locator('dialog button[type="submit"]').click();
  await page.locator("#joinCode").waitFor({timeout:7000});
  await capture(page,"together","entry","waiting-for-friend");
  // Two-player interaction requires a working local database/API; report blocked if absent.
}
try{
  const response=await fetch(origin);
  if(!response.ok)throw Error(`Local server returned HTTP ${response.status}`);
  for(const viewport of viewports){
    await run("pam","complete-round",viewport,pam);
    for(const character of ["gary","milo"])await run("solo",character,viewport,p=>solo(p,character));
    for(let tier=1;tier<=4;tier++)await run("odd-one-in","tier-"+tier,viewport,p=>odd(p,tier));
    await run("together","room-creation",viewport,together);
    console.log(`Completed ${viewport.join("x")}`);
  }
}finally{await browser.close();}
await fs.writeFile(path.join(out,"report.json"),JSON.stringify({origin,sha,generatedAt:new Date().toISOString(),results:report},null,2));
const totals=Object.fromEntries(["PASS","FAIL","BLOCKED"].map(k=>[k,report.filter(x=>x.status===k).length]));
const escape=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const cards=report.map(x=>`<article class="${x.status.toLowerCase()}"><h3>${escape(x.mode)} / ${escape(x.scenario)} / ${escape(x.step||"error")}</h3><p>${escape(x.status)} · ${x.viewport.width}×${x.viewport.height}</p>${x.screenshot?`<a href="${escape(x.screenshot)}"><img loading="lazy" src="${escape(x.screenshot)}"></a>`:""}<pre>${escape(JSON.stringify(x.issues||x.error||x.errors||{},null,2))}</pre></article>`).join("");
await fs.writeFile(path.join(out,"index.html"),`<!doctype html><html><meta charset="utf-8"><title>SSBD full audit</title><style>body{font:15px system-ui;background:#eee;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}article{background:white;padding:12px;border-radius:12px;min-width:0}img{width:100%}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}.fail{border:3px solid #c44}.blocked{border:3px solid #d90}</style><h1>SSBD audit ${escape(sha)}</h1><p>${escape(JSON.stringify(totals))}</p><main>${cards}</main></html>`);
console.log("Audit evidence:",out,totals);
if(totals.FAIL||totals.BLOCKED)process.exitCode=1;
