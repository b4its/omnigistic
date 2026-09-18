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
  R(/Legenda peta/i.test(text), "kurir/pudo: judul legenda peta tampil");
  R(/PUDO mitra/i.test(text), "kurir/pudo: legenda 'PUDO mitra' tampil");
  R(/Hub asal/i.test(text) && /Tujuan/i.test(text), "kurir/pudo: legenda penanda hub & tujuan rinci");
  R(/OpenStreetMap/i.test(text), "kurir/pudo: legenda mencantumkan sumber OpenStreetMap");
  // Legenda collapsible: tombol tutup eksplisit → pil 'Buka legenda' muncul → buka lagi.
  const legendClose = page.getByRole("button", { name: "Tutup legenda peta" }).first();
  R((await legendClose.count()) > 0, "kurir/pudo: tombol tutup legenda tersedia");
  await legendClose.click();
  await page.waitForTimeout(300);
  const legendOpenBtn = page.getByRole("button", { name: "Buka legenda peta" }).first();
  R((await legendOpenBtn.count()) > 0, "kurir/pudo: legenda tertutup → tombol 'Buka legenda peta' muncul");
  await legendOpenBtn.click();
  await page.waitForTimeout(300);
  R((await page.getByRole("button", { name: "Tutup legenda peta" }).count()) > 0, "kurir/pudo: legenda bisa dibuka kembali");
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

  // ── 3. pusat/utilization: HubMap dengan overlay PUDO + interaktif ──
  await goto("/dashboard/pusat/utilization");
  text = await page.locator("body").innerText();
  R((await page.locator(".leaflet-container").count()) >= 1, "pusat/utilization: peta hub tampil");
  R(/PUDO mitra per region/i.test(text) || /PUDO mitra/i.test(text), "pusat/utilization: legenda PUDO mitra tampil");
  // Legenda sebaran PUDO per-region — jumlah titik dibaca dinamis (bukan angka usang).
  const hubLegend = await page.locator("#hub-legend").innerText().catch(() => "");
  R(/PUDO mitra per region/i.test(hubLegend), "pusat/utilization: legenda sebaran per-region tampil");
  const legendCount = Number((hubLegend.match(/(\d+)\s*titik/i) || [])[1] || 0);
  // Jumlah per-region (Java · 32, dst) bila dijumlahkan harus = total titik pada header legenda.
  const regionNums = [...hubLegend.matchAll(/·\s*(\d+)/g)].map((m) => Number(m[1]));
  const regionSum = regionNums.reduce((s, n) => s + n, 0);
  R(legendCount > 0 && legendCount === regionSum, "pusat/utilization: jumlah titik PUDO di legenda = total per-region", `total=${legendCount} sum=${regionSum}`);
  R(/Java/.test(hubLegend) && /Maluku & Papua/.test(hubLegend) && /Kalimantan/.test(hubLegend), "pusat/utilization: 6 region tercantum di legenda");
  const shapesHub = await leafletShapeCount();
  R(shapesHub >= 30, "pusat/utilization: marker hub + PUDO (nasional) tergambar", `shapes=${shapesHub}`);

  // ── 3b. Interaktivitas peta hub: daftar, pilih, filter, sort, reset-view ──
  const listRows = page.locator("#hub-list li button");
  const totalRows = await listRows.count();
  R(totalRows >= 20, "pusat/utilization: panel daftar hub terisi", `rows=${totalRows}`);
  // Klik baris daftar → hub terpilih (aria-pressed) + kartu detail muncul.
  await listRows.nth(2).click();
  await page.waitForTimeout(500);
  R((await page.locator('#hub-list li button[aria-pressed="true"]').count()) === 1, "pusat/utilization: klik daftar menandai hub terpilih");
  const bodyAfterPick = await page.locator("body").innerText();
  R(/Peringkat/i.test(bodyAfterPick) && /Pangsa nasional/i.test(bodyAfterPick), "pusat/utilization: kartu detail hub menampilkan peringkat & pangsa nasional");
  // Filter tier overload menyaring daftar (jumlah baris berkurang) + insight defisit.
  await page.getByRole("button", { name: /Overload/ }).first().click();
  await page.waitForTimeout(400);
  const overloaded = await page.locator("#hub-list li button").count();
  R(overloaded >= 1 && overloaded < totalRows, "pusat/utilization: filter overload menyaring daftar", `rows=${overloaded} < ${totalRows}`);
  R(/hub overload/i.test(await page.locator("body").innerText()), "pusat/utilization: insight defisit beban tampil");
  // Sort daftar: ubah ke Nama → baris tersaring urut alfabetis (naik).
  const sortSel = page.getByRole("combobox", { name: "Urutkan daftar hub" });
  R((await sortSel.count()) > 0, "pusat/utilization: kontrol urut daftar tersedia");
  if (await sortSel.count()) {
    await sortSel.selectOption("name");
    await page.waitForTimeout(300);
    const names = await page.locator("#hub-list li button span.truncate").allInnerTexts();
    const sortedOk = names.every((n, i) => i === 0 || names[i - 1].localeCompare(n, "id") <= 0);
    R(names.length > 1 && sortedOk, "pusat/utilization: urut nama mengurutkan daftar alfabetis", `n=${names.length} top=${names[0]}`);
  }
  // Reset filter → tombol "Semua hub" mengembalikan tampilan nasional (tanpa error).
  const resetBtn = page.getByRole("button", { name: "Reset" }).first();
  if (await resetBtn.count()) {
    await resetBtn.click();
    await page.waitForTimeout(300);
  }
  R((await page.locator("#hub-list li button").count()) === totalRows, "pusat/utilization: reset filter memulihkan seluruh daftar");
  const fitAllBtn = page.getByRole("button", { name: /Lihat semua hub/ }).first();
  R((await fitAllBtn.count()) > 0, "pusat/utilization: tombol 'Semua hub' (reset view) tersedia");
  if (await fitAllBtn.count()) {
    await fitAllBtn.click();
    await page.waitForTimeout(500);
    R((await page.locator(".leaflet-container").count()) >= 1, "pusat/utilization: reset view tetap menampilkan peta (tanpa error)");
  }

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
