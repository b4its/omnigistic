/**
 * E2E: accordion "Pesanan terbaru" pada Dashboard Customer.
 *
 * Menguji permintaan: daftar pesanan pada dashboard pembeli dapat dibuka/ditutup,
 * default SEMUA tertutup, dan hanya pesanan terakhir yang SEDANG DALAM PENGANTARAN
 * (status "dikirim") yang terbuka otomatis.
 *
 * Alur uji (deterministik, seed store lewat localStorage):
 *  1. Seed 3 pesanan: #1 dikemas (terbaru), #2 dikirim (sedang diantar), #3 terkirim.
 *  2. Buka /dashboard/customer/dashboard.
 *  3. Pastikan hanya pesanan #2 (dikirim) yang panel detailnya terbuka.
 *  4. Klik pesanan lain → terbuka; klik lagi → tertutup (toggle berfungsi).
 *  5. aria-expanded konsisten dengan status buka/tutup.
 *
 * Prasyarat: frontend dev jalan di E2E_BASE (default http://127.0.0.1:3077).
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
/** Prefix locale uji: asersi berbahasa Indonesia → default /id (E2E_LANG=en untuk Inggris). */
const LANG_PREFIX = process.env.E2E_LANG === "en" ? "" : "/id";
const STORAGE_KEY = "omnigistic-shop-v1";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });
mkdirSync("/tmp/opencode/shots", { recursive: true });

const NOW = Date.now();
const base = (id, status, note, createdAt) => ({
  id,
  createdAt,
  items: [{ productId: "P-EL-01", name: "TWS Bluetooth Earbuds Pro", emoji: "🎧", price: 189000, qty: 1 }],
  subtotal: 189000,
  shipping: 14000,
  total: 203000,
  address: { recipient: "Sari Wulandari", phone: "081234567890", street: "Jl. Raya Jakarta-Bogor No.12", city: "Jakarta" },
  payment: "Transfer",
  codScore: null,
  codDecision: null,
  status,
  statusNote: note,
  courier: status === "dikirim" ? "Kurir Baits · JKT-04" : null,
  updatedAt: createdAt,
  slot: null,
  codCollected: false,
  routedToPudo: false,
  events: [{ at: createdAt, status, note, actor: "Sistem" }]
});

// Terbaru-di-depan (unshift): index 0 = terbaru.
const seededOrders = [
  base("ORD-AAA-1", "dikemas", "Pesanan diterima & sedang dikemas di hub.", NOW),
  base("ORD-BBB-2", "dikirim", "Paket dalam perjalanan menuju alamat penerima.", NOW - 60000),
  base("ORD-CCC-3", "terkirim", "Paket diterima penerima.", NOW - 120000)
];
const seededState = { cart: [], address: null, buyerId: "BUY-GOOD", orders: seededOrders };

let browser, page;

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  page = await ctx.newPage();
  const jsErrs = [];
  page.on("pageerror", (e) => jsErrs.push(String(e.message).slice(0, 140)));
  await page.addInitScript(
    ([key, val]) => {
      window.localStorage.setItem(key, val);
    },
    [STORAGE_KEY, JSON.stringify(seededState)]
  );
  await page.goto(BASE + LANG_PREFIX + "/dashboard/customer/dashboard", { waitUntil: "networkidle", timeout: 40000 });
  await page.waitForTimeout(2500);

  const focusBtn = page.locator('button[aria-controls="pesanan-detail-ORD-BBB-2"]');
  const otherBtn = page.locator('button[aria-controls="pesanan-detail-ORD-AAA-1"]');
  const deliveredBtn = page.locator('button[aria-controls="pesanan-detail-ORD-CCC-3"]');

  R((await focusBtn.count()) === 1, "accordion: baris pesanan dirender");
  // Default: hanya pesanan 'dikirim' (sedang diantar) yang terbuka.
  R((await focusBtn.getAttribute("aria-expanded")) === "true", "default: pesanan 'dikirim' TERBUKA", await focusBtn.getAttribute("aria-expanded"));
  R((await otherBtn.getAttribute("aria-expanded")) === "false", "default: pesanan 'dikemas' TERTUTUP");
  R((await deliveredBtn.getAttribute("aria-expanded")) === "false", "default: pesanan 'terkirim' TERTUTUP");
  R((await page.locator("#pesanan-detail-ORD-BBB-2").count()) === 1, "detail focus order terlihat di DOM");
  R((await page.locator("#pesanan-detail-ORD-AAA-1").count()) === 0, "detail pesanan lain TIDAK dirender saat tertutup");
  await page.screenshot({ path: "/tmp/opencode/shots/cust-accordion-default.png" });

  // Toggle: buka pesanan lain
  await otherBtn.click();
  await page.waitForTimeout(300);
  R((await otherBtn.getAttribute("aria-expanded")) === "true", "toggle: klik membuka pesanan lain");
  R((await page.locator("#pesanan-detail-ORD-AAA-1").count()) === 1, "toggle: detail pesanan lain muncul");

  // Toggle: tutup kembali
  await otherBtn.click();
  await page.waitForTimeout(300);
  R((await otherBtn.getAttribute("aria-expanded")) === "false", "toggle: klik lagi menutup pesanan");

  // Tutup pesanan focus, lalu buka lagi
  await focusBtn.click();
  await page.waitForTimeout(300);
  R((await focusBtn.getAttribute("aria-expanded")) === "false", "toggle: pesanan focus bisa ditutup");
  await focusBtn.click();
  await page.waitForTimeout(300);
  R((await focusBtn.getAttribute("aria-expanded")) === "true", "toggle: pesanan focus bisa dibuka lagi");

  R(jsErrs.length === 0, "tidak ada error JS", jsErrs.join(" | "));

  // ── Fallback: tak ada pesanan 'dikirim' → pesanan aktif terbaru yang terbuka ──
  const seeded2 = {
    cart: [],
    address: null,
    buyerId: "BUY-GOOD",
    orders: [
      base("ORD-DDD-4", "transit", "Paket tiba di hub transit.", NOW),
      base("ORD-EEE-5", "terkirim", "Paket diterima penerima.", NOW - 60000)
    ]
  };
  const ctx2 = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  const p2 = await ctx2.newPage();
  await p2.addInitScript(([key, val]) => window.localStorage.setItem(key, val), [STORAGE_KEY, JSON.stringify(seeded2)]);
  await p2.goto(BASE + LANG_PREFIX + "/dashboard/customer/dashboard", { waitUntil: "networkidle", timeout: 40000 });
  await p2.waitForTimeout(2200);
  const transitBtn = p2.locator('button[aria-controls="pesanan-detail-ORD-DDD-4"]');
  const doneBtn = p2.locator('button[aria-controls="pesanan-detail-ORD-EEE-5"]');
  R((await transitBtn.getAttribute("aria-expanded")) === "true", "fallback: pesanan aktif terbaru terbuka bila tak ada 'dikirim'");
  R((await doneBtn.getAttribute("aria-expanded")) === "false", "fallback: pesanan terkirim tetap tertutup");
  await ctx2.close();

  // ── Semua terkirim → semua tertutup ──
  const seeded3 = {
    cart: [],
    address: null,
    buyerId: "BUY-GOOD",
    orders: [base("ORD-FFF-6", "terkirim", "Paket diterima penerima.", NOW)]
  };
  const ctx3 = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  const p3 = await ctx3.newPage();
  await p3.addInitScript(([key, val]) => window.localStorage.setItem(key, val), [STORAGE_KEY, JSON.stringify(seeded3)]);
  await p3.goto(BASE + LANG_PREFIX + "/dashboard/customer/dashboard", { waitUntil: "networkidle", timeout: 40000 });
  await p3.waitForTimeout(2200);
  const onlyBtn = p3.locator('button[aria-controls="pesanan-detail-ORD-FFF-6"]');
  R((await onlyBtn.getAttribute("aria-expanded")) === "false", "semua terkirim: semua panel tertutup");
  await ctx3.close();
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 160));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== CUSTOMER ACCORDION ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
