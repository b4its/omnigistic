/**
 * E2E: titik PUDO + rekomendasi drop di peta (semua halaman terkait).
 *
 * Memverifikasi:
 *  - Peta pengantaran (DeliveryMap) menampilkan titik PUDO + titik rekomendasi
 *    drop terdekat dengan label yang sesuai role (KURIR = aksi, lain = info).
 *  - Peta hub (HubMap, pusat/utilization) menampilkan overlay titik PUDO.
 *  - Peta alamat (AddressMap, data/address) menampilkan titik PUDO.
 *
 * Prasyarat: frontend dev jalan di E2E_BASE (default http://127.0.0.1:3000).
 */
import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });

let browser, page;

/** Seed satu pesanan agar peta pelacakan customer bisa dibuka. */
const SEED = {
  cart: [],
  address: null,
  buyerId: "BUY-GOOD",
  orders: [
    {
      id: "ORD-PUDO-1",
      createdAt: Date.now(),
      items: [{ productId: "P-EL-01", name: "TWS Bluetooth Earbuds Pro", emoji: "🎧", price: 189000, qty: 1 }],
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
      updatedAt: Date.now(),
      slot: null,
      codCollected: false,
      routedToPudo: false,
      events: [{ at: Date.now(), status: "dikirim", note: "Paket dalam perjalanan.", actor: "Kurir Baits · JKT-04" }],
    },
  ],
};

async function goto(path, wait = 2500) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(wait);
}

/** Jumlah marker/polyline interaktif di dalam container Leaflet. */
async function leafletShapeCount() {
  return page.evaluate(() => {
    const c = document.querySelector(".leaflet-container");
    return c ? c.querySelectorAll("path.leaflet-interactive").length : 0;
  });
}

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  page = await ctx.newPage();
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), ["omnigistic-shop-v1", JSON.stringify(SEED)]);

  // ── 1. kurir/pudo: peta dengan PUDO + rekomendasi drop (role KURIR) ──
  await goto("/dashboard/kurir/pudo");
  let text = await page.locator("body").innerText();
  R((await page.locator(".leaflet-container").count()) >= 1, "kurir/pudo: peta tampil");
  R(/Legenda peta/i.test(text), "kurir/pudo: tombol legenda peta tampil");
  R(/PUDO mitra/i.test(text), "kurir/pudo: legenda 'PUDO mitra' tampil");
  R(/Hub asal/i.test(text) && /Tujuan/i.test(text), "kurir/pudo: legenda penanda hub & tujuan rinci");
  R(/OpenStreetMap/i.test(text), "kurir/pudo: legenda mencantumkan sumber OpenStreetMap");
  // Legenda collapsible: klik toggle → konten menyembunyi/muncul.
  const legendBtn = page.locator('button:has-text("Legenda peta")').first();
  const openBefore = await legendBtn.getAttribute("aria-expanded");
  await legendBtn.click();
  await page.waitForTimeout(300);
  const openAfter = await legendBtn.getAttribute("aria-expanded");
  R(openBefore !== openAfter, "kurir/pudo: legenda bisa dibuka/tutup (aria-expanded berubah)", `${openBefore}->${openAfter}`);
  await legendBtn.click();
  await page.waitForTimeout(300);
  R(/Titik drop paket rekomendasi/i.test(await page.locator("body").innerText()), "kurir/pudo: badge rekomendasi drop (kurir) tampil", "");
  R(/Arahkan paket berisiko COD ke titik ini/i.test(text), "kurir/pudo: nada aksi untuk kurir", "");
  const shapesPudo = await leafletShapeCount();
  R(shapesPudo >= 5, "kurir/pudo: marker PUDO + rekomendasi tergambar", `shapes=${shapesPudo}`);

  // ── 2. customer/orders: peta dengan PUDO sebagai INFORMASI ──
  await goto("/dashboard/customer/orders");
  // buka peta order pertama
  const mapBtn = page.getByRole("button", { name: /Lihat peta|Buka peta pelacakan/i }).first();
  R(await mapBtn.count() > 0, "customer/orders: tombol buka peta tersedia (order ter-seed)", "");
  if (await mapBtn.count()) {
    await mapBtn.click();
    await page.waitForTimeout(2200);
    text = await page.locator("body").innerText();
    R(/PUDO mitra/i.test(text), "customer/orders: legenda PUDO tampil");
    R(/PUDO terdekat untuk penerima|PUDO terdekat/i.test(text), "customer/orders: label PUDO sebagai info (bukan aksi)", "");
    R(!/Titik drop paket rekomendasi/i.test(text), "customer/orders: TIDAK menampilkan label aksi kurir", "");
    R((await leafletShapeCount()) >= 5, "customer/orders: marker PUDO tergambar", `shapes=${await leafletShapeCount()}`);
  }

  // ── 3. pusat/utilization: HubMap dengan overlay PUDO ──
  await goto("/dashboard/pusat/utilization");
  text = await page.locator("body").innerText();
  R((await page.locator(".leaflet-container").count()) >= 1, "pusat/utilization: peta hub tampil");
  R(/PUDO mitra per region/i.test(text) || /PUDO mitra/i.test(text), "pusat/utilization: legenda PUDO mitra tampil");
  // Legenda sebaran PUDO per-region (33 titik, 6 region).
  const hubLegend = await page.locator("#hub-legend").innerText().catch(() => "");
  R(/PUDO mitra per region/i.test(hubLegend), "pusat/utilization: legenda sebaran per-region tampil");
  R(/33 titik/i.test(hubLegend), "pusat/utilization: total 33 titik PUDO", "");
  R(/Java/.test(hubLegend) && /Maluku & Papua/.test(hubLegend) && /Kalimantan/.test(hubLegend), "pusat/utilization: 6 region tercantum di legenda");
  const shapesHub = await leafletShapeCount();
  R(shapesHub >= 30, "pusat/utilization: marker hub + PUDO (nasional) tergambar", `shapes=${shapesHub}`);

  // ── 4. data/address: AddressMap dengan titik PUDO ──
  await goto("/dashboard/data/address", 3000);
  text = await page.locator("body").innerText();
  R((await page.locator(".leaflet-container").count()) >= 1, "data/address: peta tampil");
  R(/PUDO/.test(text), "data/address: legenda PUDO tampil", "");
  const shapesAddr = await leafletShapeCount();
  R(shapesAddr >= 3, "data/address: marker alamat + PUDO tergambar", `shapes=${shapesAddr}`);
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 200));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== E2E PUDO ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
