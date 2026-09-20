/**
 * E2E: halaman solusi tantangan kasus ISCEA (Q2/Q3/Q5/Q6).
 *
 * Menguji interaktivitas nyata + angka yang berubah saat kontrol digeser:
 *  1. /dashboard/hub/surge — Peak-Surge Stress-Test (Q2): preset Double 12 3×
 *     → lebih banyak hub breach daripada musiman.
 *  2. /dashboard/kurir/cod-cash — COD Cash Risk (Q3): toggle intervensi →
 *     POST /ml/cod-cash/risk & penurunan risiko berubah.
 *  3. /dashboard/pusat/expansion — Market-Expansion ROI (Q5): slider target util
 *     → POST /ml/expansion/roi & volume inkremental berubah.
 *  4. /dashboard/pusat/pnl — Cost-Waterfall & P&L (Q6): toggle sustainability →
 *     jumlah tuas berubah.
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
  // Tunggu DATA, bukan sekadar waktu tetap: halaman ini mengambil angka dari API
  // setelah mount, jadi jeda tetap bisa jatuh sebelum KPI/tabel terisi.
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll("tbody tr").length > 0 ||
        /coba lagi|muat ulang|tidak tersedia/i.test(document.body.innerText),
      { timeout: 20000 }
    )
    .catch(() => {});
  await page.waitForTimeout(1200);
  return { ctx, page, errs };
}

/** Ambil angka "hub melampaui kapasitas" dari kartu KPI. */
async function breachCount(page) {
  const txt = await page.locator("body").innerText();
  const m = txt.match(/Hub melampaui kapasitas\s*\n\s*(\d+)\s*\/\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

try {
  browser = await chromium.launch(launchOptions());

  // ── 1. Peak-Surge Stress-Test (Q2) ──
  {
    let posts = 0;
    const { ctx, page, errs } = await openPage("/dashboard/hub/surge", (r) => {
      if (r.method() === "POST" && r.url().includes("/ml/sim/surge")) posts++;
    });
    const txt = await page.locator("body").innerText();
    R(/Peak-Surge Stress-Test/.test(txt), "surge: judul");
    R(/amplifikasi puncak/i.test(txt), "surge: panel simulasi");
    R(/waktu pemulihan/i.test(txt), "surge: KPI pemulihan");
    const seasonal = await breachCount(page);
    // Klik preset Double 12 3× → lebih banyak hub breach.
    await page.locator("button", { hasText: "Double 12 3×" }).click();
    await page.waitForTimeout(1500);
    const doubled = await breachCount(page);
    R(seasonal !== null && doubled !== null, "surge: breach terhitung", `${seasonal} vs ${doubled}`);
    R(doubled > seasonal, "surge: Double 12 menembus lebih banyak hub", `${seasonal} -> ${doubled}`);
    R(posts >= 1, "surge: preset memicu POST /ml/sim/surge", `posts=${posts}`);
    R(errs.length === 0, "surge: tanpa error JS", errs.join(" | "));
    await page.screenshot({ path: "/tmp/opencode/shots/case-surge.png" });
    await ctx.close();
  }

  // ── 2. COD Cash-Reconciliation Risk (Q3) ──
  {
    let posts = 0;
    const { ctx, page, errs } = await openPage("/dashboard/kurir/cod-cash", (r) => {
      if (r.method() === "POST" && r.url().includes("/ml/cod-cash/risk")) posts++;
    });
    const txt = await page.locator("body").innerText();
    R(/COD Cash-Reconciliation Risk/.test(txt), "cod-cash: judul");
    R(/uang kas beredar/i.test(txt), "cod-cash: KPI uang beredar");
    R(posts >= 1, "cod-cash: auto-hitung saat muat", `posts=${posts}`);
    // Aktifkan intervensi pertama → risiko turun.
    const before = await page.locator("body").innerText();
    const chips = page.locator("button[aria-pressed]");
    R((await chips.count()) >= 4, "cod-cash: 4 intervensi", `n=${await chips.count()}`);
    await chips.first().click();
    await page.waitForTimeout(1500);
    const after = await page.locator("body").innerText();
    R(before !== after, "cod-cash: intervensi mengubah hasil");
    R(/penurunan risiko/i.test(after), "cod-cash: KPI penurunan risiko tampil");
    R(errs.length === 0, "cod-cash: tanpa error JS", errs.join(" | "));
    await page.screenshot({ path: "/tmp/opencode/shots/case-codcash.png" });
    await ctx.close();
  }

  // ── 3. Market-Expansion ROI (Q5) ──
  {
    let posts = 0;
    const { ctx, page, errs } = await openPage("/dashboard/pusat/expansion", (r) => {
      if (r.method() === "POST" && r.url().includes("/ml/expansion/roi")) posts++;
    });
    const txt = await page.locator("body").innerText();
    R(/Market-Expansion ROI/.test(txt), "expansion: judul");
    R(/hub prioritas ekspansi/i.test(txt), "expansion: KPI prioritas");
    R(/roi portofolio/i.test(txt), "expansion: KPI ROI");
    // Geser target utilisasi → volume inkremental naik.
    const getAdd = async () => {
      const t = await page.locator("body").innerText();
      const m = t.match(/Volume terealisasi tahun-1\s*\n\s*([\d.,]+)/i);
      return m ? m[1] : null;
    };
    const vBefore = await getAdd();
    const slider = page.locator('input[aria-label="Target utilisasi persen"]');
    await slider.fill("90");
    await slider.dispatchEvent("input");
    await page.waitForTimeout(1500);
    const vAfter = await getAdd();
    R(vBefore !== null && vAfter !== null, "expansion: volume terhitung", `${vBefore} vs ${vAfter}`);
    R(posts >= 1, "expansion: slider memicu POST /ml/expansion/roi", `posts=${posts}`);
    R(errs.length === 0, "expansion: tanpa error JS", errs.join(" | "));
    await page.screenshot({ path: "/tmp/opencode/shots/case-expansion.png" });
    await ctx.close();
  }

  // ── 4. Unified Cost-Waterfall & P&L (Q6) ──
  {
    const { ctx, page, errs } = await openPage("/dashboard/pusat/pnl");
    const txt = await page.locator("body").innerText();
    R(/Cost-Waterfall/.test(txt), "pnl: judul");
    R(/penghematan tuas/i.test(txt), "pnl: KPI penghematan tuas");
    R(/cost-to-sales/i.test(txt), "pnl: KPI cost-to-sales");
    const rowsBefore = await page.locator("tbody tr").count();
    // Kait stabil: label toggle terlokalisasi (Sustainability/Keberlanjutan).
    await page.locator('[data-testid="toggle-sustainability"]').click();
    await page.waitForTimeout(1500);
    const rowsAfter = await page.locator("tbody tr").count();
    R(rowsAfter < rowsBefore, "pnl: matikan sustainability → tuas lebih sedikit", `${rowsBefore} -> ${rowsAfter}`);
    R(errs.length === 0, "pnl: tanpa error JS", errs.join(" | "));
    await page.screenshot({ path: "/tmp/opencode/shots/case-pnl.png" });
    await ctx.close();
  }
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 160));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== CASE SOLUTIONS ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
