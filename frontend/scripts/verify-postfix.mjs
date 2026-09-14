import { chromium } from "playwright-core";
const B = await chromium.launch({ executablePath: "/home/sleepy/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] });
const ctx = await B.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
// CLS measurement on dashboard first paint (cookie absent) — expect ~0 after reserved? measure
let cls = 0;
await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
const t0 = Date.now();
await page.goto("http://127.0.0.1:3000/dashboard/kurir/cod-risk", { waitUntil: "load" });
await page.waitForTimeout(1800);
const res = await page.evaluate(() => ({ cls: window.__cls, clsCss: document.documentElement.className, title: document.title, fonts: document.fonts.size }));
console.log("dashboard:", JSON.stringify(res), "nav-ms:", Date.now() - t0);
// dark toggle FOUC check: reload with dark saved
await page.evaluate(() => localStorage.setItem("omnigistic-theme", "dark"));
const t1 = Date.now();
await page.reload({ waitUntil: "commit" });
const earlyClass = await page.evaluate(() => document.documentElement.classList.contains("dark"));
console.log("FOUC dark early:", earlyClass);
await page.waitForTimeout(1000);
const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log("dark bodyBg:", bodyBg);
// presence offline honesty: kill backend? skip.
// chart color presence in dark: canvas terracotta count
await page.goto("http://127.0.0.1:3000/dashboard/hub/forecast", { waitUntil: "load" });
await page.waitForTimeout(1600);
const c = await page.evaluate(() => { const cv = document.querySelector("canvas"); const ctx2 = cv.getContext("2d"); const img = ctx2.getImageData(0,0,cv.width,200000).data; const seen={}; for (let i=0;i<img.length;i+=4){ if(img[i+3]>200){ const k=img[i]+','+img[i+1]+','+img[i+2]; seen[k]=(seen[k]||0)+1; } } return Object.entries(seen).sort((a,b)=>b[1]-a[1]).slice(0,4); });
console.log("dark chart colors:", JSON.stringify(c));
// chip click → jawaban (kirim) di Nigi AI via role DATA
await page.goto("http://127.0.0.1:3000/dashboard/data/overview", { waitUntil: "load" }); await page.waitForTimeout(800);
await page.click('button[aria-label="Buka Nigi AI"]'); await page.waitForTimeout(500);
const inSel='input[aria-label="Pesan untuk Nigi AI"]';
await page.fill(inSel, "alamat bisa ambigu");
await page.keyboard.press("Enter");
await page.waitForTimeout(1300);
const chatTxt = await page.locator("button[aria-label='Tutup Nigi AI']").locator("..").locator("..").innerText();
console.log("DATA chip QA-hit:", /Cibinong|Depok|Rempoa|3 lokasi/.test(chatTxt));
// Escape close & focus return
await page.keyboard.press("Escape"); await page.waitForTimeout(600);
const panelGone = await page.locator('[aria-label="Nigi AI"]').count();
console.log("esc closes panel:", panelGone === 0);
// compact bottom nav + safe overlay
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:3000/dashboard/hub/dashboard", { waitUntil: "load" }); await page.waitForTimeout(1500);
const bar = await page.locator('nav[aria-label="Primary"]').isVisible();
console.log("compact bar visible:", bar);
await B.close();
