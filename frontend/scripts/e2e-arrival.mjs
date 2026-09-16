/**
 * E2E: status kehadiran penerima saat paket DALAM PENGANTARAN (Customer ⇄ Kurir).
 *
 * Menguji fitur: kurir mencatat apakah penerima ADA DI RUMAH saat paket sedang
 * diantar ("dikirim"); customer langsung melihat status itu di pelacakan.
 *
 * Alur (deterministik, seed store lewat localStorage):
 *  1. Seed 1 pesanan berstatus "dikirim" (dalam pengantaran).
 *  2. KURIR buka /dashboard/kurir/tasks → tombol "Ada di rumah / Minta tunggu /
 *     Tidak di rumah" muncul (hanya saat status dikirim).
 *  3. KURIR klik "Tidak di rumah" → status tercatat.
 *  4. CUSTOMER buka /dashboard/customer/orders → melihat "Penerima tidak di rumah".
 *  5. CUSTOMER buka /dashboard/customer/dashboard → status kehadiran tampil.
 *  6. Guard: tombol kehadiran TIDAK muncul saat status bukan "dikirim".
 *
 * Prasyarat: frontend dev jalan di E2E_BASE (default http://127.0.0.1:3000).
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const STORAGE_KEY = "omnigistic-shop-v1";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });
mkdirSync("/tmp/opencode/shots", { recursive: true });

const NOW = Date.now();
const DELIVERY_ID = "ORD-E2E-ARRIVAL-1";
const PICKUP_ID = "ORD-E2E-ARRIVAL-2";

function order(id, status, note) {
  return {
    id,
    createdAt: NOW,
    items: [{ productId: "P-EL-01", name: "TWS Bluetooth Earbuds Pro", icon: "box", price: 189000, qty: 1 }],
    subtotal: 189000,
    shipping: 14000,
    total: 203000,
    address: { recipient: "Sari Wulandari", phone: "081234567890", street: "Jl. Raya Jakarta-Bogor No.12", city: "Jakarta" },
    payment: "COD",
    codScore: 0.22,
    codDecision: "antar-normal",
    status,
    statusNote: note,
    courier: "Kurir Baits · JKT-04",
    updatedAt: NOW,
    slot: null,
    codCollected: false,
    routedToPudo: false,
    arrivalStatus: null,
    arrivalAt: null,
    events: [{ at: NOW, status, note, actor: "Sistem" }],
  };
}

const seededState = {
  cart: [],
  address: null,
  buyerId: "BUY-GOOD",
  orders: [
    order(DELIVERY_ID, "dikirim", "Paket dalam perjalanan menuju alamat penerima."),
    order(PICKUP_ID, "transit", "Paket tiba di hub transit, menunggu keberangkatan."),
  ],
};

let browser;

async function goto(page, path, wait = 2200) {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(wait);
}

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  // Seed HANYA sekali (addInitScript jalan tiap navigasi → jangan timpa perubahan
  // yang ditulis kurir). Pakai flag agar tidak re-seed.
  await page.addInitScript(
    ([k, v]) => {
      if (!sessionStorage.getItem("__arrival_seeded")) {
        localStorage.setItem(k, v);
        sessionStorage.setItem("__arrival_seeded", "1");
      }
    },
    [STORAGE_KEY, JSON.stringify(seededState)]
  );

  // ── 1. KURIR: tombol kehadiran muncul hanya untuk paket "dikirim" ──
  await goto(page, "/dashboard/kurir/tasks");
  let txt = await page.locator("body").innerText();
  R(/Status kehadiran penerima/i.test(txt), "kurir: panel status kehadiran tampil");
  R(/Ada di rumah/i.test(txt) && /Tidak di rumah/i.test(txt), "kurir: 3 tombol kehadiran ada");

  // Guard: hitung panel kehadiran == jumlah pesanan berstatus "dikirim" (1), bukan 2.
  const panels = await page.locator('text=Status kehadiran penerima').count();
  R(panels === 1, "kurir: panel hanya utk pesanan 'dalam pengantaran' (guard)", `panels=${panels}`);

  // ── 2. KURIR klik "Tidak di rumah" utk order DELIVERY_ID ──
  const row = page.locator("li", { hasText: DELIVERY_ID }).first();
  await row.getByRole("button", { name: /Tidak di rumah/i }).click();
  await page.waitForTimeout(900);
  txt = await page.locator("body").innerText();
  R(/Penerima tidak di rumah/i.test(txt), "kurir: status 'tidak di rumah' tercatat");

  // ── 3. CUSTOMER/orders: melihat status kehadiran ──
  await goto(page, "/dashboard/customer/orders");
  txt = await page.locator("body").innerText();
  R(/Kurir sudah tiba di lokasi/i.test(txt), "customer/orders: blok kehadiran tampil");
  R(/Penerima tidak di rumah/i.test(txt), "customer/orders: status 'tidak di rumah' terlihat");
  R(/PUDO terdekat|dijadwalkan ulang/i.test(txt), "customer/orders: tip tindak lanjut tampil");

  // ── 4. CUSTOMER/dashboard: status kehadiran tampil ──
  await goto(page, "/dashboard/customer/dashboard");
  txt = await page.locator("body").innerText();
  R(/Kurir sudah tiba/i.test(txt) && /Penerima tidak di rumah/i.test(txt), "customer/dashboard: status kehadiran tampil");

  R(errs.length === 0, "tanpa error JS", errs.join(" | "));
  await page.screenshot({ path: "/tmp/opencode/shots/e2e-arrival.png" });
  await ctx.close();
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 180));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== ARRIVAL STATUS ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
