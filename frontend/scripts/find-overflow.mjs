import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const path = process.env.SHOT_PATH || "/analisis";
const width = Number(process.env.SHOT_W || 320);

const b = await chromium.launch({ ...launchOptions(), executablePath: process.env.PLAYWRIGHT_CHROMIUM || launchOptions().executablePath });
const ctx = await b.newContext({ viewport: { width, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE + path, { waitUntil: "load", timeout: 40000 });
await p.waitForTimeout(2000);
const offenders = await p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1 && r.right > vw + 1) {
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 90),
        w: Math.round(r.width),
        right: Math.round(r.right),
        text: (el.textContent || "").trim().slice(0, 40)
      });
    }
  });
  // dedupe by cls+tag, keep widest
  const map = new Map();
  for (const o of out) { const k = o.tag + "|" + o.cls; if (!map.has(k) || map.get(k).w < o.w) map.set(k, o); }
  return { vw, offenders: [...map.values()].sort((a, b) => b.w - a.w).slice(0, 12) };
});
console.log("viewport", offenders.vw);
for (const o of offenders.offenders) console.log(`  ${o.tag} w=${o.w} right=${o.right} :: "${o.text}" :: ${o.cls}`);
await b.close();
