/**
 * E2E: Route Intelligence — pendeteksi jalur tercepat (kepadatan + efisiensi).
 *
 * Memverifikasi pada /dashboard/kurir/pudo (peta selalu tampil, roleIntel aktif):
 *  1. Panel "Jalur tercepat" tampil dengan 3 kandidat jalur.
 *  2. Badge "tercepat" & "efisien" ada (jalur direkomendasikan).
 *  3. Memilih jalur lain mengubah teks "Dipilih: …" + peta tetap sehat.
 *  4. Menggeser slider kepadatan mengubah waktu tempuh (traffic-aware).
 *  5. Tidak ada error JS (khususnya 'Map container is already initialized').
 *
 * Prasyarat: backend :8077 + frontend dev :3077.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });
mkdirSync("/tmp/opencode/shots", { recursive: true });

let browser;

/** Ambil waktu tempuh (mnt) kandidat pertama yang tampil di panel. */
async function firstTime(page) {
  const t = await page.locator("body").innerText();
  const m = t.match(/(\d+(?:[.,]\d+)?) mnt ·/);
  return m ? m[1] : null;
}

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 140)));

  await page.goto(BASE + "/dashboard/kurir/pudo", { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(3200);

  const txt = await page.locator("body").innerText();
  R(/Jalur tercepat/.test(txt), "route: panel 'Jalur tercepat' tampil");
  R(/Arteri utama/.test(txt) && /Jalan tol/.test(txt) && /Jalur alternatif/.test(txt), "route: 3 kandidat jalur");
  R(/tercepat/i.test(txt), "route: badge 'tercepat' ada");
  R(/efisien/i.test(txt), "route: badge 'efisien' ada");
  R(/skor/i.test(txt), "route: skor efisiensi tampil");

  // Pilih jalur alternatif → teks "Dipilih" berubah.
  await page.locator('button:has-text("Jalur alternatif")').click();
  await page.waitForTimeout(900);
  const afterSel = await page.locator("text=/Dipilih: Jalur alternatif/").count();
  R(afterSel > 0, "route: pilih jalur alternatif → 'Dipilih' berubah");

  // Geser kepadatan → waktu tempuh berubah (traffic-aware).
  const before = await firstTime(page);
  const slider = page.locator('input[aria-label="Tingkat kepadatan jalur"]');
  R((await slider.count()) === 1, "route: slider kepadatan ada");
  await slider.fill("0.9");
  await slider.dispatchEvent("input");
  await page.waitForTimeout(1400);
  const after = await firstTime(page);
  R(before !== null && after !== null && before !== after, "route: kepadatan mengubah waktu tempuh", `${before} -> ${after}`);

  R(errs.length === 0, "route: tanpa error JS (peta tak 'already initialized')", errs.join(" | "));
  await page.screenshot({ path: "/tmp/opencode/shots/e2e-route-intel.png" });
  await ctx.close();
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 160));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== ROUTE INTELLIGENCE ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
