import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";
import { mkdirSync } from "node:fs";

/**
 * Screenshot responsif: memotret satu halaman di banyak ukuran viewport
 * (mewakili ponsel kecil, ponsel besar, tablet, laptop, desktop, ultrawide).
 * Pemakaian: SHOT_PATH=... SHOT_TAG=... [SHOT_BASE=...] node scripts/responsive-shot.mjs
 */
mkdirSync("/tmp/opencode/shots", { recursive: true });

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3000";
const path = process.env.SHOT_PATH || "/dashboard/pusat/executive";
const tag = process.env.SHOT_TAG || "resp";

const VIEWPORTS = [
  { name: "iphone-se", w: 320, h: 568 },
  { name: "iphone-14", w: 390, h: 844 },
  { name: "phone-landscape", w: 740, h: 360 },
  { name: "tablet", w: 768, h: 1024 },
  { name: "tablet-lands", w: 1024, h: 768 },
  { name: "laptop", w: 1366, h: 768 },
  { name: "desktop", w: 1920, h: 1080 },
  { name: "ultrawide", w: 2560, h: 1080 }
];

const b = await chromium.launch({ ...launchOptions(), executablePath: process.env.PLAYWRIGHT_CHROMIUM || launchOptions().executablePath });

for (const vp of VIEWPORTS) {
  const ctx = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  await p.goto(BASE + path, { waitUntil: "load", timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(1800);
  const out = `/tmp/opencode/shots/${tag}-${vp.name}.png`;
  await p.screenshot({ path: out, fullPage: false });
  // Deteksi overflow horizontal (konten lebih lebar dari viewport)
  const overflow = await p.evaluate(() => {
    const de = document.documentElement;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, over: de.scrollWidth > de.clientWidth + 1 };
  });
  console.log(`${vp.name.padEnd(16)} ${String(vp.w).padStart(4)}px  overflow=${overflow.over ? "YES(" + overflow.scrollW + ">" + overflow.clientW + ")" : "no"}${errs.length ? "  ERR:" + errs[0] : ""}`);
  await ctx.close();
}
await b.close();
