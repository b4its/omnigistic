/**
 * E2E: regresi audit menyeluruh — memverifikasi perbaikan lintas-fitur
 * (semua tetap simulasi/prototipe) tidak kambuh.
 *
 * Cakupan:
 *  - ev-bca: baris "Total" arus kas tidak lagi menggandakan investasi awal
 *    (kolom Kumulatif = totalNetIdr, sama dgn baris terakhir).
 *  - hub/overview: label KPI memakai jumlah dari data ("dari 23 hub", "8 hub"),
 *    ambang alert = UTIL_THRESHOLD kanonik (bukan angka beku).
 *  - hub/dashboard: ambang alert memakai UTIL_THRESHOLD (65).
 *  - Topbar: wording jujur "Pembaruan"/"item" (bukan "belum dibaca"/"baru").
 *  - landing: tidak ada lagi elipsis palsu (…) pada kartu diagnosis.
 *  - Icon: dirender di seluruh halaman (komponen runes tetap bekerja).
 *
 * Prasyarat: FE dev jalan di E2E_BASE, backend di E2E_API.
 */
import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });

let browser;
async function goto(page, path, wait = 2600) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 40000 });
  await page.waitForTimeout(wait);
}

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();

  // ── 1. ev-bca: tidak ada penggandaan investasi awal di baris Total ──
  await goto(page, "/dashboard/pusat/ev-bca", 3200);
  // Buka tab arus kas.
  const cfTab = page.getByRole("button", { name: /Arus Kas|Cashflow|Cash Flow/i }).first();
  if (await cfTab.count()) {
    await cfTab.click();
    await page.waitForTimeout(800);
  }
  const evText = await page.locator("body").innerText();
  const hasCashflow = /Kumulatif/i.test(evText);
  R(hasCashflow, "ev-bca: tabel arus kas tampil", hasCashflow ? "" : "tab arus kas tak ditemukan");
  if (hasCashflow) {
    // Ambil baris terakhir (Y-n) & baris Total, bandingkan kolom Kumulatif.
    const nums = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("tbody tr")];
      const parse = (s) => Number(String(s).replace(/[^0-9-]/g, "")) || 0;
      const dataRows = rows.filter((r) => /^Y\d+/.test((r.querySelector("td")?.innerText || "").trim()));
      const totalRow = rows.find((r) => /^Total/.test((r.querySelector("td")?.innerText || "").trim()));
      const lastData = dataRows[dataRows.length - 1];
      const cumOf = (r) => parse(r?.querySelectorAll("td")[3]?.innerText || "");
      return { lastCum: cumOf(lastData), totalCum: cumOf(totalRow), totalCells: totalRow ? totalRow.querySelectorAll("td").length : 0 };
    });
    R(
      nums.totalCum === nums.lastCum && nums.lastCum !== 0,
      "ev-bca: Total Kumulatif = baris terakhir (tanpa ganda investasi)",
      `last=${nums.lastCum} total=${nums.totalCum}`
    );
  }

  // ── 2. hub/overview: KPI dari data + ambang kanonik ──
  await goto(page, "/dashboard/hub/overview");
  const hovText = await page.locator("body").innerText();
  R(/dari\s*23\s*hub/i.test(hovText), "hub/overview: label 'dari 23 hub' dari data");
  R(/8\s*hub/i.test(hovText), "hub/overview: label '8 hub' (Jawa) dari data");

  // ── 3. hub/dashboard: ambang alert = 65% ──
  await goto(page, "/dashboard/hub/dashboard");
  const hdbText = await page.locator("body").innerText();
  R(/65%/.test(hdbText) && /ambang alert/i.test(hdbText), "hub/dashboard: ambang alert 65% tampil");

  // ── 4. Topbar: wording jujur ──
  const notifBtn = page.locator('button[aria-label*="Pembaruan"], button[aria-label="Pembaruan"]').first();
  R((await notifBtn.count()) > 0, "topbar: tombol 'Pembaruan' ada (wording jujur)", "");
  if (await notifBtn.count()) {
    await notifBtn.click();
    await page.waitForTimeout(400);
    const popText = await page.locator("body").innerText();
    R(/Pembaruan/i.test(popText) && /item/i.test(popText), "topbar: panel memakai 'Pembaruan' + 'item'");
    R(!/belum dibaca/i.test(popText), "topbar: TIDAK lagi mengklaim 'belum dibaca'");
    await page.keyboard.press("Escape");
  }

  // ── 5. landing: tidak ada elipsis palsu di kartu diagnosis ──
  await goto(page, "/", 2200);
  // Gulir sampai bawah agar animasi reveal menampilkan seluruh konten.
  const landH = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < landH; y += 800) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(600);
  const symCounts = await page.evaluate(() => {
    // Kartu diagnosis: cari elemen teks yang memuat "Gejala:".
    const ps = [...document.querySelectorAll("p")].filter((p) => /Gejala:/i.test((p.innerText || "").trim()));
    let withEllipsis = 0;
    for (const p of ps) if (/…$/u.test((p.innerText || "").trim())) withEllipsis++;
    return { total: ps.length, withEllipsis };
  });
  R(symCounts.total > 0, "landing: kartu diagnosis tampil", `n=${symCounts.total}`);
  R(symCounts.withEllipsis === 0, "landing: tidak ada elipsis palsu di kartu diagnosis", `ellipsis=${symCounts.withEllipsis}/${symCounts.total}`);

  // ── 6. Icon runes: ikon ter-render (svg dengan aria-hidden) di beberapa halaman ──
  await goto(page, "/dashboard/pusat/overview");
  const svgCount = await page.locator("svg[aria-hidden='true']").count();
  R(svgCount > 0, "Icon: svg ikon ter-render di halaman", `n=${svgCount}`);
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 220));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== E2E AUDIT FIXES ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
