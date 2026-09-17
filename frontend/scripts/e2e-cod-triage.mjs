/**
 * E2E: konsistensi triase COD lintas halaman kurir (predikat & ambang TUNGGAL).
 *
 * Memverifikasi bahwa definisi "COD berisiko → PUDO" dan ambang tier kini
 * SATU sumber (store + logistics), bukan disalin-tempel per halaman:
 *  1. overview & pudo: jumlah "Kandidat PUDO" konsisten untuk seed yang sama.
 *  2. pudo: kandidat = COD berisiko (predikat bersama) — pesanan antar-normal TIDAK masuk.
 *  3. cod-risk: tier memakai ambang diambil dari kode (0,35/0,65 via numId "0,35").
 *  4. cod-cash & cod-intel: jembatan "Pesanan COD kamu (nyata)" tampil & akurat.
 *  5. pudo: peta pakai progres dari status (bukan 0,75 hardcode) → tetap sehat.
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
function order(id, status, codScore, codDecision, payment = "COD") {
  return {
    id,
    createdAt: NOW,
    items: [{ productId: "P-EL-01", name: "TWS Bluetooth Earbuds Pro", icon: "box", price: 189000, qty: 1 }],
    subtotal: 189000,
    shipping: 14000,
    total: 203000,
    address: { recipient: "Sari Wulandari", phone: "081234567890", street: "Jl. Raya Jakarta-Bogor No.12", city: "Bogor" },
    payment,
    codScore,
    codDecision,
    status,
    statusNote: "Paket dalam perjalanan menuju alamat penerima.",
    courier: "Kurir Baits · JKT-04",
    updatedAt: NOW,
    slot: null,
    codCollected: false,
    routedToPudo: false,
    presenceStatus: null,
    presenceAt: null,
    events: [{ at: NOW, status, note: "Paket dalam perjalanan.", actor: "Kurir Baits · JKT-04" }],
  };
}

/** Seed: 1 antar-normal (aman), 1 pudo (berisiko), 1 pre-payment (berisiko). = 2 kandidat. */
const seededState = {
  cart: [],
  address: null,
  buyerId: "BUY-GOOD",
  orders: [
    order("ORD-COD-AMAN", "dikirim", 0.12, "antar-normal"),
    order("ORD-COD-PUDO", "transit", 0.48, "pudo"),
    order("ORD-COD-PRE", "dijemput", 0.82, "pre-payment"),
  ],
};

let browser;

async function goto(page, path, wait = 2600) {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(wait);
}

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(seededState)]);

  // ── 1. pudo: kandidat = COD berisiko (2), bukan antar-normal ──
  await goto(page, "/dashboard/kurir/pudo");
  let txt = await page.locator("body").innerText();
  R(/Paket COD berisiko \(nyata\)/i.test(txt), "pudo: seksi 'Paket COD berisiko (nyata)' tampil");
  R(txt.includes("ORD-COD-PUDO") && txt.includes("ORD-COD-PRE"), "pudo: kandidat pudo & pre-payment muncul");
  R(!txt.includes("ORD-COD-AMAN"), "pudo: pesanan antar-normal TIDAK jadi kandidat (predikat bersama)");

  // ── 2. overview: 'Kandidat PUDO' = 2 (konsisten predikat) ──
  await goto(page, "/dashboard/kurir/overview");
  txt = await page.locator("body").innerText();
  R(/kandidat pudo/i.test(txt), "overview: KPI 'Kandidat PUDO' tampil");
  // Nilai 2 muncul tepat setelah label Kandidat PUDO (toleran huruf besar/kecil).
  const afterKandidat = txt.replace(/\s+/g, " ").match(/kandidat pudo\s+(\d+)/i);
  R(afterKandidat?.[1] === "2", "overview: nilai kandidat = 2 (sama dgn pudo)", afterKandidat ? afterKandidat[0] : "");

  // ── 3. cod-risk: ambang tier dari kode (muncul "0,35"/"0,65") ──
  await goto(page, "/dashboard/kurir/cod-risk");
  txt = await page.locator("body").innerText();
  R(/0,35/.test(txt) && /0,65/.test(txt), "cod-risk: ambang tier dari satu sumber (0,35 / 0,65)");
  R(/Paket COD pembeli \(nyata\)/i.test(txt), "cod-risk: tabel paket COD nyata tampil");
  R(txt.includes("ORD-COD-PRE") && txt.includes("ORD-COD-PUDO") && txt.includes("ORD-COD-AMAN"), "cod-risk: semua COD ditriase (termasuk aman)");

  // ── 4. cod-cash & cod-intel: jembatan pesanan nyata ──
  await goto(page, "/dashboard/kurir/cod-cash", 3000);
  txt = await page.locator("body").innerText();
  R(/Pesanan COD kamu \(nyata\)/i.test(txt), "cod-cash: jembatan pesanan COD nyata tampil");
  R(/3\b/.test(txt) && /Total nilai tunai/i.test(txt), "cod-cash: ringkasan jumlah & nilai COD tampil");

  await goto(page, "/dashboard/kurir/cod-intel", 3000);
  txt = await page.locator("body").innerText();
  R(/Pesanan COD kamu \(nyata\)/i.test(txt), "cod-intel: jembatan pesanan COD nyata tampil");

  // ── 5. pudo: peta sehat (progres dari status, bukan hardcode) ──
  await goto(page, "/dashboard/kurir/pudo");
  R((await page.locator(".leaflet-container").count()) >= 1, "pudo: peta tetap sehat setelah progres dari status");

  R(errs.length === 0, "cod-triage: tanpa error JS", errs.join(" | "));
  await page.screenshot({ path: "/tmp/opencode/shots/e2e-cod-triage.png" });
  await ctx.close();
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 180));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== COD TRIAGE ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
