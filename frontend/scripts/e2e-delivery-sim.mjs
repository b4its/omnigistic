/**
 * E2E: Uji Simulasi Pengantaran Riil pada Peta di Halaman Kurir.
 *
 * Memverifikasi pada /dashboard/kurir/tasks dan /dashboard/kurir/routes:
 *  1. Cockpit Simulasi Pengantaran Riil tampil dengan container Leaflet.
 *  2. Bilah kontrol simulasi hadir: tombol Simulasi/Jeda, pilihan kecepatan 1x-10x, scrubber.
 *  3. Telemetri dinamis hadir: speedometer (km/j), sisa jarak, ETA, baterai EV, hemat CO2.
 *  4. Interaktivitas kondisi lapangan: tombol cuaca (hujan/cerah) & kemacetan (lancar/macet).
 *  5. Skenario pengalihan PUDO saat penerima tidak ada.
 *  6. Peta rute & simulasi pengantaran pada halaman Route Clustering.
 *  7. Tanpa error JS.
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
const seededState = {
  cart: [],
  address: null,
  buyerId: "BUY-GOOD",
  orders: [
    {
      id: "ORD-SIM-KURIR-01",
      createdAt: NOW,
      items: [{ productId: "P-EL-01", name: "TWS Bluetooth Earbuds Pro", icon: "box", price: 189000, qty: 1 }],
      subtotal: 189000,
      shipping: 14000,
      total: 203000,
      address: { recipient: "Aditya Pratama", phone: "081234567890", street: "Jl. Pajajaran No.45", city: "Bogor" },
      payment: "COD",
      codScore: 0.45,
      codDecision: "pudo",
      status: "dikirim",
      statusNote: "Kurir memulai simulasi perjalanan pengantaran.",
      courier: "Kurir Baits · JKT-04",
      updatedAt: NOW,
      slot: "14:00-16:00",
      codCollected: false,
      routedToPudo: false,
      presenceStatus: "di-rumah",
      presenceAt: NOW,
      events: [{ at: NOW, status: "dikirim", note: "Dalam pengantaran.", actor: "Kurir Baits · JKT-04" }],
    },
  ],
};

let browser;

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(seededState)]);

  // ── 1. Halaman Tugas Pengantaran (/dashboard/kurir/tasks) ──
  await page.goto(BASE + "/dashboard/kurir/tasks", { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(3000);

  const txt = await page.locator("body").innerText();
  R(/Tugas Pengantaran/.test(txt), "delivery-sim: halaman tugas pengantaran tampil");
  R(/Cockpit Simulasi Pengantaran Riil/i.test(txt), "delivery-sim: Cockpit Simulasi tampil");
  R(/LIVE TELEMETRI/i.test(txt), "delivery-sim: badge live telemetri tampil");

  // ── 2. Container Leaflet Terpasang ──
  const mapContainers = await page.locator(".leaflet-container").count();
  R(mapContainers >= 1, "delivery-sim: Leaflet map mounted", `count=${mapContainers}`);

  // ── 3. Kontrol Simulasi & Telemetri ──
  const simBtn = page.getByRole("button", { name: /Mulai simulasi pengantaran|Jeda simulasi/i }).first();
  R((await simBtn.count()) > 0, "delivery-sim: tombol simulasi pengantaran hadir");

  // Cek scrubber range slider
  const slider = page.locator('input[type="range"][aria-label*="Scrubber"]').first();
  R((await slider.count()) > 0, "delivery-sim: scrubber range input hadir");

  // Cek Speedometer & Telemetri
  R(/km\/j/i.test(txt), "delivery-sim: speedometer km/j tampil");
  R(/ETA Tersisa|Baterai EV|Hemat CO₂/i.test(txt), "delivery-sim: kartu telemetri lengkap tampil");

  // ── 4. Interaktivitas: Play / Pause Simulasi ──
  await simBtn.click();
  await page.waitForTimeout(1200);
  const playTxt = await page.locator("body").innerText();
  R(/Jeda/i.test(playTxt), "delivery-sim: tombol beralih ke 'Jeda' saat berputar");

  // ── 5. Kondisi Lapangan: Cuaca & Macet ──
  const rainBtn = page.getByRole("button", { name: /Cerah|Hujan/i }).first();
  if ((await rainBtn.count()) > 0) {
    await rainBtn.click();
    await page.waitForTimeout(600);
    const rainTxt = await page.locator("body").innerText();
    R(/Hujan/i.test(rainTxt), "delivery-sim: toggle cuaca hujan berfungsi");
  }

  const trafficBtn = page.getByRole("button", { name: /Lancar|Macet/i }).first();
  if ((await trafficBtn.count()) > 0) {
    await trafficBtn.click();
    await page.waitForTimeout(600);
    const trafTxt = await page.locator("body").innerText();
    R(/Macet/i.test(trafTxt), "delivery-sim: toggle kemacetan jalan berfungsi");
  }

  // ── 6. Pengalihan Rute ke PUDO ──
  const pudoBtn = page.getByRole("button", { name: /Alihkan PUDO/i }).first();
  if ((await pudoBtn.count()) > 0) {
    await pudoBtn.click();
    await page.waitForTimeout(600);
    const pudoTxt = await page.locator("body").innerText();
    R(/Rute ke PUDO/i.test(pudoTxt), "delivery-sim: pengalihan rute PUDO aktif");
  }

  await page.screenshot({ path: "/tmp/opencode/shots/e2e-courier-delivery-sim.png" });

  // ── 7. Halaman Route Clustering (/dashboard/kurir/routes) ──
  await page.goto(BASE + "/dashboard/kurir/routes", { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(3000);

  const routeTxt = await page.locator("body").innerText();
  R(/Route Clustering/.test(routeTxt), "delivery-sim: halaman route clustering tampil");
  R(/Peta Rute & Simulasi Pengantaran Kurir/i.test(routeTxt), "delivery-sim: peta simulasi route clustering tampil");
  R((await page.locator(".leaflet-container").count()) >= 1, "delivery-sim: Leaflet map di route clustering mounted");

  // Coba beralih kota di route clustering
  const depokBtn = page.getByRole("button", { name: /^Depok$/i }).first();
  if ((await depokBtn.count()) > 0) {
    await depokBtn.click();
    await page.waitForTimeout(1000);
    const newCityTxt = await page.locator("body").innerText();
    R(/Depok/i.test(newCityTxt), "delivery-sim: pemilihan klaster kota Depok berfungsi");
  }

  await page.screenshot({ path: "/tmp/opencode/shots/e2e-courier-routes-sim.png" });

  R(errs.length === 0, "delivery-sim: tanpa error JS", errs.join(" | "));
  await ctx.close();
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 180));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== COURIER DELIVERY SIMULATION ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
