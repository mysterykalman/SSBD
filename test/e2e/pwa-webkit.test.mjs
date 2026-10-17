import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {webkit} from "playwright";
import {startServer} from "./helpers.mjs";

let server,browser;
before(async()=>{server=await startServer({database:false});browser=await webkit.launch({headless:true});});
after(async()=>{await browser?.close();await server?.stop();});

const devices=[
  {name:"iPhone portrait",width:390,height:844,isMobile:true,ua:"Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1"},
  {name:"iPhone landscape",width:844,height:390,isMobile:true,ua:"Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1"},
  {name:"iPad portrait",width:820,height:1180,isMobile:true,ua:"Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1"},
  {name:"iPad landscape",width:1180,height:820,isMobile:true,ua:"Mozilla/5.0 (iPad; CPU OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1"},
  {name:"Mac Safari",width:1280,height:820,isMobile:false,ua:"Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15"}
];

test("WebKit install sheet, phone/tablet/desktop navigation and rotation layouts",async()=>{
 for(const device of devices){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.isMobile,hasTouch:device.isMobile,userAgent:device.ua});
  const page=await context.newPage();
  const exceptions=[];
  page.on("pageerror",error=>exceptions.push(error.message));
  for(const route of ["/","/mom/"]){
    await page.goto(server.url+route,{waitUntil:"domcontentloaded"});
    await page.waitForSelector("#pwaInstallBtn");
    await page.evaluate(()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close()));
    const geometry=await page.evaluate(()=>({
      width:window.innerWidth,
      content:document.documentElement.scrollWidth,
      actions:document.querySelector(".top-actions").getBoundingClientRect().right,
      action:document.querySelector("#pwaInstallBtn").getBoundingClientRect().right
    }));
    assert.ok(geometry.content<=geometry.width,device.name+" "+route+" overflow");
    assert.ok(geometry.actions<=geometry.width+1,device.name+" "+route+" clipped actions");
    assert.ok(geometry.action<=geometry.width+1,device.name+" "+route+" clipped install");
    await page.locator("#pwaInstallBtn").click();
    const sheet=page.locator(".pwa-install-dialog");
    assert.equal(await sheet.isVisible(),true,device.name+" "+route);
    const copy=await sheet.innerText();
    if(device.name.startsWith("iP")) assert.match(copy,/Open as Web App/);
    else assert.match(copy,/Dock/);
    await page.keyboard.press("Escape");
    assert.equal(await sheet.isVisible(),false,device.name+" "+route+" dismiss");
  }
  assert.deepEqual(exceptions,[],device.name+" JS errors");
  await context.close();
 }
});

test("WebKit installed mode opens with no install action on Home or Pam",async()=>{
 for(const route of ["/","/mom/"]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,
    userAgent:devices[0].ua});
  await context.addInitScript(()=>Object.defineProperty(navigator,"standalone",{configurable:true,value:true}));
  const page=await context.newPage();
  await page.goto(server.url+route,{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("#pwaInstallBtn").isHidden(),true,route);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route);
  await context.close();
 }
});
