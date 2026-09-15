import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const pages = (process.env.CHECK_PAGES || "/dashboard/kurir/cod-intel").split(",");
// Needles wajib ada di teks halaman (dipisah "|" per halaman bila perlu).
const needles = (process.env.CHECK_NEEDLES || "").split(",").filter(Boolean);

const b = await chromium.launch({ ...launchOptions(), executablePath: process.env.PLAYWRIGHT_CHROMIUM || launchOptions().executablePath });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
let pass = 0, fail = 0;
const errs = [];
p.on("pageerror", (e) => errs.push("JS: " + String(e.message).slice(0, 120)));
p.on("console", (m) => { if (m.type() === "error") errs.push("CON: " + m.text().slice(0, 120)); });

for (const path of pages) {
  await p.goto(BASE + path, { waitUntil: "load", timeout: 40000 });
  await p.waitForTimeout(2000);
  // Scroll bertahap agar aksi gsapReveal (autoAlpha:0) memicu semua section.
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 700) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(180);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(800);
  const text = await p.locator("body").innerText();
  for (const n of needles) {
    if (text.includes(n)) { pass++; console.log(`  ✅ "${n}"`); }
    else { fail++; console.log(`  ❌ MISSING "${n}"`); }
  }
}
console.log(`\n===== DOM CHECK ${pass}/${pass + fail} PASS =====`);
if (errs.length) { console.log("PAGE ERRORS:\n" + errs.join("\n")); }
await b.close();
process.exit(fail ? 1 : 0);
