import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {launch,startServer} from "./helpers.mjs";
let server,browser;
before(async()=>{server=await startServer({database:false});browser=await launch();});
after(async()=>{await browser?.close();await server?.stop();});
test("standalone manifest and Apple installation metadata exist in both shells",async()=>{
 const context=await browser.newContext();const page=await context.newPage();
 const response=await page.request.get(server.url+"/manifest.webmanifest");
 assert.equal(response.status(),200);
 const m=await response.json();assert.equal(m.display,"standalone");assert.equal(m.short_name,"SSBD");
 for(const path of ["/","/mom/","/mom-mode/"]){
  await page.goto(server.url+path);
  assert.equal(await page.locator("link[rel=manifest]").getAttribute("href"),"/manifest.webmanifest");
  assert.equal(await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute("content"),"yes");
  assert.equal(await page.locator("#pwaInstallBtn").count(),1);
 }
 await context.close();
});
test("install instructions open, close and support Escape",async()=>{
 const c=await browser.newContext();const p=await c.newPage();await p.goto(server.url);
 await p.evaluate(() => document.querySelector("#audioIntroWelcome")?.close());
 await p.locator("#pwaInstallBtn").click();
 assert.equal(await p.locator(".pwa-install-dialog").isVisible(),true);
 await p.getByRole("button",{name:"Got it"}).click();
 assert.equal(await p.locator(".pwa-install-dialog").isVisible(),false);
 await p.locator("#pwaInstallBtn").click();await p.keyboard.press("Escape");
 assert.equal(await p.locator(".pwa-install-dialog").isVisible(),false);
 await c.close();
});
test("installed apps do not display the install action",async()=>{
 const c=await browser.newContext();
 await c.addInitScript(()=>Object.defineProperty(navigator,"standalone",{value:true,configurable:true}));
 const p=await c.newPage();await p.goto(server.url);
 assert.equal(await p.locator("#pwaInstallBtn").isHidden(),true);await c.close();
});
test("offline app retains installation help without caching API",async()=>{
 const c=await browser.newContext();const p=await c.newPage();await p.goto(server.url);
 await p.evaluate(async()=>navigator.serviceWorker.ready);
 await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const paths=await p.evaluate(async()=>{
  const name=(await caches.keys()).find(k=>k.startsWith("shell-"));
  return (await (await caches.open(name)).keys()).map(r=>new URL(r.url).pathname);
 });
 for(const path of ["/manifest.webmanifest","/pwa-install.js","/pwa-install.css"])assert.ok(paths.includes(path));
 assert.equal(paths.some(path=>path.startsWith("/api/")),false);
 await c.setOffline(true);await p.reload();await p.locator("#pwaInstallBtn").click();
 assert.equal(await p.locator(".pwa-install-dialog").isVisible(),true);await c.close();
});

test("native install event is used rather than showing manual instructions",async()=>{
 const c=await browser.newContext();const p=await c.newPage();await p.goto(server.url);
 await p.evaluate(()=>{
   document.querySelector("#audioIntroWelcome")?.close();
   const event=new Event("beforeinstallprompt",{cancelable:true});
   event.prompt=async()=>{window.__pwaPromptWasUsed=true;};
   event.userChoice=Promise.resolve({outcome:"accepted"});
   window.dispatchEvent(event);
 });
 await p.locator("#pwaInstallBtn").click();
 assert.equal(await p.evaluate(()=>window.__pwaPromptWasUsed),true);
 assert.equal(await p.locator(".pwa-install-dialog").count(),0);
 await c.close();
});
test("five device profiles receive correct guidance without horizontal overflow",async()=>{
 const profiles=[
  {name:"iPhone",ua:"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",width:375,expected:/Safari/},
  {name:"iPad",ua:"Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",width:820,expected:/Safari/},
  {name:"Android phone",ua:"Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/155.0.0.0 Mobile Safari/537.36",width:360,expected:/Chrome/},
  {name:"Android tablet",ua:"Mozilla/5.0 (Linux; Android 15; Tablet) AppleWebKit/537.36 Chrome/155.0.0.0 Safari/537.36",width:800,expected:/Chrome/},
  {name:"Mac",ua:"Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",width:1280,expected:/Dock/}
 ];
 for(const profile of profiles){
   const c=await browser.newContext({viewport:{width:profile.width,height:850},userAgent:profile.ua});
   const p=await c.newPage();await p.goto(server.url);
   await p.evaluate(()=>document.querySelector("#audioIntroWelcome")?.close());
   await p.locator("#pwaInstallBtn").click();
   assert.match(await p.locator(".pwa-install-panel").innerText(),profile.expected,profile.name);
   const dimensions=await p.evaluate(()=>({inner:window.innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dimensions.scroll<=dimensions.inner,profile.name+" overflow");
   await c.close();
 }
});
