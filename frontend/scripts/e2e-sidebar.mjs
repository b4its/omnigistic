import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3077";
const PATH = process.env.SHOT_PATH || "/dashboard/pusat/executive";

const b = await chromium.launch({ ...launchOptions(), executablePath: process.env.PLAYWRIGHT_CHROMIUM || launchOptions().executablePath });
let pass = 0, fail = 0;
const R = (ok, name, info = "") => { if (ok) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name} ${info}`); } };

// ---- 1. Expanded (desktop): toggle collapse/expand + persist ----
{
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(BASE + PATH, { waitUntil: "load" });
  await p.waitForTimeout(2000);
  const aside = p.locator('aside[aria-label="Sections"]');
  R(await aside.count() === 1, "desktop: sidebar ada");
  const w1 = await aside.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  R(w1 === 256, "desktop: lebar terbuka 256px", String(w1));
  await p.locator('button[aria-label="Tutup sidebar"]').first().click();
  await p.waitForTimeout(400);
  const w2 = await aside.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  R(w2 === 88, "desktop: lebar tertutup 88px (rail)", String(w2));
  R(await p.locator('button[aria-label="Buka sidebar"]').count() >= 1, "desktop: tombol buka muncul saat tertutup");
  R(await p.evaluate(() => localStorage.getItem("omnigistic-sidebar-open")) === "0", "desktop: preferensi tutup tersimpan");
  await p.locator('button[aria-label="Buka sidebar"]').first().click();
  await p.waitForTimeout(400);
  const w3 = await aside.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  R(w3 === 256, "desktop: buka kembali 256px", String(w3));

  // persist antar-reload
  await p.locator('button[aria-label="Tutup sidebar"]').first().click();
  await p.waitForTimeout(300);
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(2000);
  const w4 = await aside.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  R(w4 === 88, "desktop: preferensi tutup bertahan setelah reload", String(w4));
  await ctx.close();
}

// ---- 2. Medium (tablet): rail 256 → collapse, toggle ada ----
{
  const ctx = await b.newContext({ viewport: { width: 768, height: 1000 } });
  const p = await ctx.newPage();
  await p.goto(BASE + PATH, { waitUntil: "load" });
  await p.waitForTimeout(2000);
  const aside = p.locator('aside[aria-label="Primary"]');
  R(await aside.count() === 1, "tablet: rail medium ada");
  const w1 = await aside.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  R(w1 === 256, "tablet: rail terbuka 256px", String(w1));
  R(await p.locator('button[aria-label="Tutup sidebar"]').count() >= 1, "tablet: tombol tutup ada");
  await ctx.close();
}

// ---- 3. Compact (phone): bottom bar, no sidebar toggle ----
{
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p.goto(BASE + PATH, { waitUntil: "load" });
  await p.waitForTimeout(2000);
  R(await p.locator('nav[aria-label="Primary"]').count() === 1, "phone: bottom nav ada");
  R(await p.locator('aside[aria-label="Sections"]').count() === 0, "phone: sidebar tidak dirender");
  R(await p.locator('button[aria-label="Tutup sidebar"], button[aria-label="Buka sidebar"]').count() === 0, "phone: toggle sidebar disembunyikan");
  R(await p.locator('nav[aria-label="Primary"] button[aria-label="Menu lainnya"]').count() >= 1, "phone: menu 'Lainnya' ada");
}

// ---- 4. Keyboard shortcut Ctrl+B di desktop ----
{
  const ctx = await b.newContext({ viewport: { width: 1366, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(BASE + PATH, { waitUntil: "load" });
  await p.waitForTimeout(2000);
  const aside = p.locator('aside[aria-label="Sections"]');
  const before = await aside.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  await p.keyboard.press("Control+b");
  await p.waitForTimeout(400);
  const after = await aside.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  R(before !== after, "desktop: Ctrl+B buka/tutup sidebar", `${before}->${after}`);
  await ctx.close();
}

console.log(`\n===== SIDEBAR ${pass}/${pass + fail} PASS =====`);
await b.close();
process.exit(fail ? 1 : 0);
