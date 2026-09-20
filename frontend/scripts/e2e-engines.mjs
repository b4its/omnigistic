/**
 * E2E: mesin analitik baru — Direct-vs-Sponsor Comparator & Modal-Shift Optimizer.
 *
 * Menguji halaman interaktif:
 *  1. /dashboard/pusat/digital-twin — komparator Direct vs Sponsor:
 *     - memuat unit cost nasional dari kasus, tabel region, grafik.
 *     - slider ekuitas HQ memicu POST /ml/sponsor/compare & mengubah hasil.
 *  2. /dashboard/data/multimodal — Modal-Shift Optimizer:
 *     - memuat ringkasan penghematan & koridor.
 *     - slider bobot/SLA memicu POST /ml/modalshift/optimize.
 *     - portofolio 6 tuas biaya tampil.
 *
 * Prasyarat: backend :8077 + frontend dev :3077.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
/**
 * Prefix locale untuk uji: asersi skrip ini berbahasa Indonesia,
 * jadi default-nya halaman /id. Set E2E_LANG=en untuk uji asap versi Inggris.
 */
const LANG_PREFIX = process.env.E2E_LANG === "en" ? "" : "/id";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });
mkdirSync("/tmp/opencode/shots", { recursive: true });

let browser;

async function openPage(path, onRequest) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
  if (onRequest) page.on("request", onRequest);
  await page.goto(BASE + LANG_PREFIX + path, { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(2500);
  return { ctx, page, errs };
}

try {
  browser = await chromium.launch(launchOptions());

  // ── 1. Digital Twin (comparator) ──
  {
    let posts = 0;
    const { ctx, page, errs } = await openPage("/dashboard/pusat/digital-twin", (r) => {
      if (r.method() === "POST" && r.url().includes("/ml/sponsor/compare")) posts++;
    });
    const txt = await page.locator("body").innerText();
    R(/Direct vs Regional Sponsor/.test(txt), "twin: judul komparator");
    R(/unit cost nasional/i.test(txt), "twin: unit cost nasional");
    R(/rekomendasi sponsor/i.test(txt), "twin: ringkasan rekomendasi");
    R(/Sensitivitas/.test(txt), "twin: panel sensitivitas");
    R(/Java/.test(txt) && /Maluku/.test(txt), "twin: region dibandingkan");
    // Interaksi: geser slider ekuitas → POST terpanggil.
    const slider = page.locator('input[aria-label="Porsi ekuitas HQ"]');
    R((await slider.count()) === 1, "twin: slider ekuitas ada");
    await slider.fill("80");
    await slider.dispatchEvent("change");
    await page.waitForTimeout(1500);
    R(posts >= 1, "twin: slider memicu POST /ml/sponsor/compare", `posts=${posts}`);
    R(/80%/.test(await page.locator("body").innerText()), "twin: nilai kontrol ter-update (80%)");
    R(errs.length === 0, "twin: tanpa error JS", errs.join(" | "));
    await page.screenshot({ path: "/tmp/opencode/shots/twin-comparator.png" });
    await ctx.close();
  }

  // ── 2. Modal-Shift (Control Tower) ──
  {
    let posts = 0;
    const { ctx, page, errs } = await openPage("/dashboard/data/multimodal", (r) => {
      if (r.method() === "POST" && r.url().includes("/ml/modalshift/optimize")) posts++;
    });
    const txt = await page.locator("body").innerText();
    R(/Optimizer modal-shift|Modal-Shift|modal-shift/i.test(txt), "modal: judul optimizer");
    R(/penghematan biaya/i.test(txt), "modal: KPI hemat biaya");
    R(/penghematan emisi/i.test(txt), "modal: KPI hemat emisi");
    R(/Portofolio tuas/.test(txt), "modal: portofolio tuas biaya");
    R(/Bauran moda/.test(txt), "modal: bauran moda");
    // Interaksi: ubah SLA → POST terpanggil.
    const sla = page.locator('input[aria-label="Batas SLA jam"]');
    R((await sla.count()) === 1, "modal: slider SLA ada");
    await sla.fill("24");
    await sla.dispatchEvent("change");
    await page.waitForTimeout(1500);
    R(posts >= 1, "modal: SLA memicu POST /ml/modalshift/optimize", `posts=${posts}`);
    R(/24 jam/.test(await page.locator("body").innerText()), "modal: SLA ter-update (24 jam)");
    R(errs.length === 0, "modal: tanpa error JS", errs.join(" | "));
    await page.screenshot({ path: "/tmp/opencode/shots/modal-shift.png" });
    await ctx.close();
  }
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 160));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== ENGINES ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
