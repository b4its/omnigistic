import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";
const B = await chromium.launch(launchOptions());
const p = await (await B.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const logs = [];
p.on("console", (m) => logs.push(m.type() + ":" + m.text().slice(0, 140)));
p.on("pageerror", (e) => logs.push("PAGEERR:" + String(e.message).slice(0, 140)));
await p.goto("http://127.0.0.1:3000/dashboard/pusat/roi", { waitUntil: "load" });
await p.waitForTimeout(2500);
const cards = await p.evaluate(() => {
  const grids = [...document.querySelectorAll("main .grid")];
  return grids.slice(0, 2).map((g) =>
    [...g.children].map((c) => (c.textContent || "").replace(/\s+/g, " ").slice(0, 150))
  );
});
console.log(JSON.stringify({ logCount: logs.length, logSample: logs.slice(0, 8), cards }, null, 1));
await B.close();
