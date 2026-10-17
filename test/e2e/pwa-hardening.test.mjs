import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer({database:false}); browser = await launch(); });
after(async () => { await browser?.close(); await server?.stop(); });

const routes = ["/", "/mom/", "/mom-mode/"];
const sizes = [320, 360, 375, 390, 430, 768, 820, 1024, 1280];

test("header controls remain on screen and never collide with the brand, at mobile, tablet and desktop widths", async () => {
  for (const width of sizes) {
    const context = await browser.newContext({viewport:{width,height:800},isMobile:width<820,hasTouch:width<820});
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(server.url + route);
      await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close()));
      await page.locator("#pwaInstallBtn").waitFor();
      const layout = await page.evaluate(() => {
        const rect = el => {
          const {left,right,top,bottom} = el.getBoundingClientRect();
          return {left,right,top,bottom};
        };
        const brand = rect(document.querySelector(".topbar .brand"));
        const actions = rect(document.querySelector(".topbar .top-actions"));
        const controls = [...document.querySelector(".topbar .top-actions").children]
          .filter(el => getComputedStyle(el).display !== "none" && !el.hidden)
          .map(el => ({id:el.id,rect:rect(el)}));
        return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,brand,actions,controls};
      });
      assert.ok(layout.scrollWidth <= layout.viewport, route+" "+width+" horizontal overflow");
      assert.ok(layout.actions.left >= 0 && layout.actions.right <= layout.viewport+1, route+" "+width+" action container");
      for (const item of layout.controls) {
        assert.ok(item.rect.left>=-1 && item.rect.right<=layout.viewport+1, route+" "+width+" clipped "+item.id);
        assert.ok(item.rect.bottom<=layout.actions.bottom+1, route+" "+width+" dropped control "+item.id);
      }
      const brandActionsSameRow = layout.actions.top < layout.brand.bottom-2;
      if (brandActionsSameRow) assert.ok(layout.actions.left >= layout.brand.right-1, route+" "+width+" brand collision");
    }
    await context.close();
  }
});

test("installed standalone headers stay compact and install action is removed", async () => {
  for (const route of routes) {
    const context = await browser.newContext({viewport:{width:320,height:640}});
    await context.addInitScript(() => Object.defineProperty(navigator,"standalone",{value:true,configurable:true}));
    const page = await context.newPage();
    await page.goto(server.url+route);
    assert.equal(await page.locator("#pwaInstallBtn").isHidden(),true);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),route);
    await context.close();
  }
});

test("Pam and Home expose valid app identity, icon resources, and a useful app shortcut", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const manifest = await (await page.request.get(server.url+"/manifest.webmanifest")).json();
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.id,"/");
  assert.equal(manifest.shortcuts[0].url,"/mom/");
  assert.ok(manifest.icons.some(icon=>icon.sizes==="512x512"));
  for (const icon of manifest.icons) {
    const response = await page.request.get(server.url + icon.src);
    assert.equal(response.status(),200,icon.src);
    assert.match(response.headers()["content-type"],/image\/png/,icon.src);
  }
  for (const route of routes) {
    await page.goto(server.url+route);
    const tags = await page.evaluate(()=>({
      version:document.querySelector('meta[name="app-version"]')?.content,
      manifest:document.querySelector('link[rel="manifest"]')?.href,
      icon:document.querySelector('link[rel="apple-touch-icon"]')?.href
    }));
    assert.match(tags.version,/^[a-f0-9]{10}$/,route);
    assert.ok(tags.manifest.endsWith("/manifest.webmanifest"));
    assert.ok(tags.icon.endsWith("/apple-touch-icon.png"));
  }
  await context.close();
});

test("offline music cache honours 206 byte ranges and never includes API responses", async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(server.url);
  await page.evaluate(async()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await page.evaluate(()=>navigator.serviceWorker.controller.postMessage({type:"CACHE_AUDIO",path:"/audio/intro.mp3"}));
  await page.waitForFunction(async()=>{
    const keys=await caches.keys();
    const key=keys.find(name=>name.startsWith("audio-"));
    return Boolean(key && await (await caches.open(key)).match("/audio/intro.mp3"));
  },null,{timeout:30000});
  await context.setOffline(true);
  const result=await page.evaluate(async()=>{
    const response=await fetch("/audio/intro.mp3",{headers:{Range:"bytes=64-191"}});
    return {status:response.status,range:response.headers.get("Content-Range"),
      length:(await response.arrayBuffer()).byteLength,
      cached:(await caches.keys()).filter(key=>key.startsWith("audio-")).length,
      apiCached:(await Promise.all((await caches.keys()).map(async key =>
        (await (await caches.open(key)).keys()).some(req=>new URL(req.url).pathname.startsWith("/api/"))))).some(Boolean)};
  });
  assert.equal(result.status,206);
  assert.equal(result.length,128);
  assert.match(result.range,/^bytes 64-191\/\d+$/);
  assert.equal(result.cached,1);
  assert.equal(result.apiCached,false);
  await context.close();
});

test("offline played audio can be requested fully, and invalid byte ranges fail cleanly",async()=>{
  const context=await browser.newContext();
  const page=await context.newPage();
  await page.goto(server.url);
  await page.evaluate(async()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.evaluate(()=>navigator.serviceWorker.controller.postMessage({type:"CACHE_AUDIO",path:"/audio/game-music.mp3"}));
  await page.waitForFunction(async()=>{
    const key=(await caches.keys()).find(name=>name.startsWith("audio-"));
    return !!(key && await (await caches.open(key)).match("/audio/game-music.mp3"));
  },null,{timeout:30000});
  await context.setOffline(true);
  const result=await page.evaluate(async()=>{
    const full=await fetch("/audio/game-music.mp3");
    const size=(await full.arrayBuffer()).byteLength;
    const invalid=await fetch("/audio/game-music.mp3",{headers:{Range:"bytes=999999999-"}});
    return {size,status:full.status,invalid:invalid.status,invalidRange:invalid.headers.get("Content-Range")};
  });
  assert.equal(result.status,200);
  assert.ok(result.size>1000000);
  assert.equal(result.invalid,416);
  assert.match(result.invalidRange,/^bytes \*\/\d+$/);
  await context.close();
});
