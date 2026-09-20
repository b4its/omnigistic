/**
 * E2E: state error/retry saat backend offline.
 *
 * Memblokir semua request ke API (:8000) lalu memastikan halaman menampilkan
 * pesan error + tombol "Coba lagi" (bukan skeleton selamanya).
 */
import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
/**
 * Prefix locale untuk uji: asersi skrip ini berbahasa Indonesia,
 * jadi default-nya halaman /id. Set E2E_LANG=en untuk uji asap versi Inggris.
 */
const LANG_PREFIX = process.env.E2E_LANG === "en" ? "" : "/id";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });

const PAGES = [
  "/dashboard/pusat/executive",
  "/dashboard/pusat/utilization",
  "/dashboard/pusat/network",
  "/dashboard/hub/dashboard",
  "/dashboard/hub/capacity",
  "/dashboard/data/complaint",
  "/dashboard/data/ev-sites",
  "/dashboard/data/fleet"
];

let browser;
try {
  browser = await chromium.launch(launchOptions());
  for (const path of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    const page = await ctx.newPage();
    // Blokir request ke backend API saja. Port API pernah pindah (8000 → 8077),
    // jadi kedua port diterima. JANGAN mencocokkan path "/api/" polos: di dev,
    // modul klien `src/lib/api/index.ts` juga memuat "/api/" sehingga ikut
    // terblokir dan halaman gagal render (500) alih-alih menampilkan error state.
    await page.route(/127\.0\.0\.1:(8000|8077)\//, (r) => r.abort());
    await page.goto(BASE + LANG_PREFIX + path, { waitUntil: "load", timeout: 40000 });
    await page.waitForTimeout(2500);
    const txt = await page.locator("body").innerText();
    const hasError = /coba lagi/i.test(txt);
    const hasSkeleton = (await page.locator(".animate-pulse").count()) > 0;
    R(hasError, `${path.split("/").pop()}: tampil error + Coba lagi`, hasError ? "" : hasSkeleton ? "masih skeleton" : "tak ada pesan");
    await ctx.close();
  }
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 160));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== OFFLINE STATE ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
process.exit(fail.length ? 1 : 0);
