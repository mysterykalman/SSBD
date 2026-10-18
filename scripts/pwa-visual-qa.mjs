import {startServer,launch} from "../test/e2e/helpers.mjs";
import {mkdir} from "node:fs/promises";
const server=await startServer({database:false});
const browser=await launch();
await mkdir("docs",{recursive:true});
try{
  for(const scene of [
    {name:"phone-home",route:"/",width:390,height:844,mobile:true},
    {name:"phone-pam",route:"/mom/",width:390,height:844,mobile:true},
    {name:"desktop-home",route:"/",width:1250,height:850,mobile:false}
  ]){
    const context=await browser.newContext({viewport:{width:scene.width,height:scene.height},isMobile:scene.mobile,hasTouch:scene.mobile,deviceScaleFactor:1});
    const page=await context.newPage();
    await page.goto(server.url+scene.route,{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close()));
    await page.locator("#pwaInstallBtn").click();
    await page.locator(".pwa-install-dialog").waitFor({state:"visible"});
    await page.screenshot({path:"docs/pwa-preview-"+scene.name+".png"});
    const body=await page.evaluate(()=>({header:document.querySelector(".topbar")?.getBoundingClientRect().width,dialog:document.querySelector(".pwa-install-dialog")?.getBoundingClientRect().toJSON()}));
    console.log(scene.name,JSON.stringify(body));
    await context.close();
  }
}finally{await browser.close();await server.stop();}
