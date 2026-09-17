/**
 * E2E: peta modal layar-penuh + legenda collapsible (halaman tugas pengantaran kurir).
 *
 * Memverifikasi pada /dashboard/kurir/tasks (order ter-seed "dikirim"):
 *  1. Tombol "Perbesar" membuka peta modal layar-penuh (role=dialog, aria-modal).
 *  2. Modal menampilkan peta Leaflet kedua (instance terpisah, tak rekursif) &
 *     instance inline TETAP ada (bukan dipindah).
 *  3. Legenda bawaan (inline) bisa ditutup/buka (aria-expanded berubah).
 *  4. Di modal: tombol "Sembunyikan/Tampilkan legenda" mengubah panel legenda modal.
 *  5. Escape menutup modal; tombol X juga menutup modal.
 *  6. Tanpa error JS.
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
const seededState = {
  cart: [],
  address: null,
  buyerId: "BUY-GOOD",
  orders: [
    {
      id: "ORD-E2E-MODAL-1",
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
  ],
};

let browser;

/** Dialog modal peta (bedakan dari drawer widget tersembunyi). */
const mapDialog = (page) => page.locator('[role="dialog"][aria-label^="Peta layar penuh"]');
const containers = (page) => page.locator(".leaflet-container");

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(seededState)]);

  await page.goto(BASE + "/dashboard/kurir/tasks", { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(3400);

  // ── 1. Tombol perbesar ada & modal awalnya tertutup ──
  const expandBtn = page.getByRole("button", { name: /Perbesar peta ke layar penuh/i }).first();
  R((await expandBtn.count()) > 0, "modal: tombol 'Perbesar' tersedia");
  R((await mapDialog(page).count()) === 0, "modal: peta layar penuh awalnya tertutup");
  R((await containers(page).count()) === 1, "modal: satu peta inline sebelum dibuka");

  // ── 1b. Legenda inline bisa dibuka/tutup (sebelum modal) ──
  // Gulir agar legenda peta masuk viewport (peta ada di bawah daftar tugas).
  await page.locator(".leaflet-container").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const legendClose = page.getByRole("button", { name: "Tutup legenda peta" }).first();
  R((await legendClose.count()) > 0, "modal: tombol tutup legenda inline tersedia");
  await legendClose.click();
  await page.waitForTimeout(300);
  const legendOpenBtn = page.getByRole("button", { name: "Buka legenda peta" }).first();
  R((await legendOpenBtn.count()) > 0, "modal: legenda inline tertutup → tombol buka muncul");
  await legendOpenBtn.click();
  await page.waitForTimeout(300);
  R((await page.getByRole("button", { name: "Tutup legenda peta" }).count()) > 0, "modal: legenda inline bisa dibuka kembali");
  await page.locator(".leaflet-container").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // ── 2. Buka modal → peta kedua muncul, inline tetap ada ──
  await expandBtn.click();
  await page.waitForTimeout(2200);
  R((await mapDialog(page).count()) === 1, "modal: peta layar penuh terbuka (role=dialog)");
  R((await containers(page).count()) >= 2, "modal: peta kedua (layar penuh) tergambar", `containers=${await containers(page).count()}`);
  const txt = await page.locator("body").innerText();
  R(/Peta pengantaran — layar penuh/i.test(txt), "modal: judul modal tampil");

  // ── 4. Di modal: toggle legenda modal (panel aside) ──
  const fsLegend = page.getByRole("button", { name: /Sembunyikan legenda|Tampilkan legenda/i }).first();
  R((await fsLegend.count()) > 0, "modal: tombol toggle legenda layar-penuh ada");
  const fsAsideBefore = await page.locator("aside").count();
  await fsLegend.click();
  await page.waitForTimeout(400);
  const fsAsideAfter = await page.locator("aside").count();
  R(fsAsideBefore !== fsAsideAfter, "modal: panel legenda layar-penuh bisa ditutup", `aside ${fsAsideBefore}->${fsAsideAfter}`);
  await fsLegend.click();
  await page.waitForTimeout(400);

  // ── 5a. Escape menutup modal ──
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  R((await mapDialog(page).count()) === 0, "modal: Escape menutup peta layar penuh");

  // ── 5b. Tombol X menutup modal ──
  await expandBtn.click();
  await page.waitForTimeout(1600);
  R((await mapDialog(page).count()) === 1, "modal: buka lagi untuk uji tombol X");
  await page.getByRole("button", { name: /Tutup peta layar penuh/i }).first().click();
  await page.waitForTimeout(700);
  R((await mapDialog(page).count()) === 0, "modal: tombol X menutup peta layar penuh");
  R((await containers(page).count()) === 1, "modal: kembali ke satu peta inline setelah ditutup");

  R(errs.length === 0, "modal: tanpa error JS", errs.join(" | "));
  await page.screenshot({ path: "/tmp/opencode/shots/e2e-map-modal.png" });
  await ctx.close();
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 180));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== MAP MODAL ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
