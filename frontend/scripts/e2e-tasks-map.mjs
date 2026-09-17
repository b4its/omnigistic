/**
 * E2E: peta lengkap di halaman TUGAS PENGANTARAN kurir.
 *
 * Memverifikasi pada /dashboard/kurir/tasks (order ter-seed "dikirim"):
 *  1. Peta terbuka OTOMATIS untuk paket yang sedang diantar (tanpa klik).
 *  2. Peta lengkap tampil: container Leaflet + legenda rinci + panel "Jalur tercepat".
 *  3. Tombol "Lihat peta lengkap / Sembunyikan peta lengkap" bisa buka/tutup map.
 *  4. Marker rute (hub → kurir → tujuan) + PUDO rekomendasi tergambar.
 *  5. Tanpa error JS (khususnya 'Map container is already initialized').
 *
 * Prasyarat: backend :8000 + frontend dev :3000.
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
/** Dua pesanan: satu "dikirim" (peta auto-buka), satu "terkirim" (peta tertutup). */
const seededState = {
  cart: [],
  address: null,
  buyerId: "BUY-GOOD",
  orders: [
    {
      id: "ORD-E2E-TASKMAP-1",
      createdAt: NOW,
      items: [{ productId: "P-EL-01", name: "TWS Bluetooth Earbuds Pro", icon: "box", price: 189000, qty: 1 }],
      subtotal: 189000,
      shipping: 14000,
      total: 203000,
      address: { recipient: "Sari Wulandari", phone: "081234567890", street: "Jl. Raya Jakarta-Bogor No.12", city: "Bogor" },
      payment: "COD",
      codScore: 0.42,
      codDecision: "pudo",
      status: "dikirim",
      statusNote: "Paket dalam perjalanan menuju alamat penerima.",
      courier: "Kurir Baits · JKT-04",
      updatedAt: NOW,
      slot: null,
      codCollected: false,
      routedToPudo: false,
      presenceStatus: null,
      presenceAt: null,
      events: [{ at: NOW, status: "dikirim", note: "Paket dalam perjalanan.", actor: "Kurir Baits · JKT-04" }],
    },
    {
      id: "ORD-E2E-TASKMAP-2",
      createdAt: NOW - 1000,
      items: [{ productId: "P-EL-01", name: "TWS Bluetooth Earbuds Pro", icon: "box", price: 189000, qty: 1 }],
      subtotal: 189000,
      shipping: 14000,
      total: 203000,
      address: { recipient: "Budi Santoso", phone: "081298765432", street: "Jl. Melati No.5", city: "Depok" },
      payment: "Transfer",
      codScore: null,
      codDecision: null,
      status: "terkirim",
      statusNote: "Paket diterima penerima.",
      courier: "Kurir Baits · JKT-04",
      updatedAt: NOW - 1000,
      slot: null,
      codCollected: false,
      routedToPudo: false,
      presenceStatus: null,
      presenceAt: null,
      events: [{ at: NOW - 1000, status: "terkirim", note: "Paket diterima.", actor: "Kurir Baits · JKT-04" }],
    },
  ],
};

let browser;

/** Jumlah marker/polyline interaktif di dalam container Leaflet. */
async function leafletShapeCount(page) {
  return page.evaluate(() => {
    const c = document.querySelector(".leaflet-container");
    return c ? c.querySelectorAll("path.leaflet-interactive").length : 0;
  });
}

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(seededState)]);

  await page.goto(BASE + "/dashboard/kurir/tasks", { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(3400);

  const txt = await page.locator("body").innerText();
  R(/Tugas Pengantaran/.test(txt), "tasks-map: halaman tugas pengantaran tampil");

  // ── 1. Peta terbuka OTOMATIS untuk paket yang sedang diantar ──
  R((await page.locator(".leaflet-container").count()) >= 1, "tasks-map: peta terbuka otomatis (tanpa klik)");

  // ── 2. Peta lengkap: legenda + panel jalur tercepat ──
  R(/Legenda peta/i.test(txt), "tasks-map: legenda peta lengkap tampil");
  R(/Hub asal/i.test(txt) && /Tujuan/i.test(txt), "tasks-map: legenda penanda hub & tujuan rinci");
  R(/OpenStreetMap/i.test(txt), "tasks-map: legenda mencantumkan sumber OpenStreetMap");
  R(/Jalur tercepat/i.test(txt), "tasks-map: panel 'Jalur tercepat' (route intelligence) tampil");
  R(/Titik drop paket rekomendasi/i.test(txt), "tasks-map: badge rekomendasi drop kurir tampil");

  // ── 3. Marker rute + PUDO tergambar ──
  const shapes = await leafletShapeCount(page);
  R(shapes >= 5, "tasks-map: marker rute (hub/kurir/tujuan) + PUDO tergambar", `shapes=${shapes}`);

  // ── 4. Tombol toggle "peta lengkap" bisa buka/tutup ──
  const toggle = page.getByRole("button", { name: /Sembunyikan peta lengkap/i }).first();
  R((await toggle.count()) > 0, "tasks-map: tombol 'Sembunyikan peta lengkap' tampil (map terbuka)");
  await toggle.click();
  await page.waitForTimeout(500);
  R((await page.locator(".leaflet-container").count()) === 0, "tasks-map: klik → peta tertutup");
  R((await page.getByRole("button", { name: /Lihat peta lengkap/i }).count()) > 0, "tasks-map: tombol berubah jadi 'Lihat peta lengkap'");
  await page.getByRole("button", { name: /Lihat peta lengkap/i }).first().click();
  await page.waitForTimeout(1600);
  R((await page.locator(".leaflet-container").count()) >= 1, "tasks-map: klik lagi → peta terbuka kembali");

  R(errs.length === 0, "tasks-map: tanpa error JS (peta tak 'already initialized')", errs.join(" | "));
  await page.screenshot({ path: "/tmp/opencode/shots/e2e-tasks-map.png" });
  await ctx.close();
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 180));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== TASKS MAP ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
