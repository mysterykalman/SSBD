import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {launch, startServer} from "./helpers.mjs";

let server, browser;
before(async () => { server = await startServer({database: false}); browser = await launch(); });
after(async () => { await browser?.close(); server?.stop(); });

test("20Q works on a phone-sized browser without touching the existing home page", async () => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(server.url + "/20Q");
  assert.match(await page.locator("main").innerText(), /Twenty questions/);
  await page.getByRole("button", {name: /I'm thinking/}).click();
  assert.match(await page.locator(".eyebrow").innerText(), /QUESTION 1 OF 20/);
  assert.equal(await page.locator(".answers button").count(), 4);
  await page.getByRole("button", {name: "Yes", exact: true}).click();
  assert.match(await page.locator(".eyebrow").innerText(), /QUESTION 2 OF 20|MY FINAL ANSWER/);
  await page.goto(server.url + "/");
  assert.equal(await page.title(), "Same Same but Different");
  assert.deepEqual(errors, []);
  await context.close();
});
