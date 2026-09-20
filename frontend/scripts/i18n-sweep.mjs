/**
 * Sapuan i18n menyeluruh: SEMUA rute halaman, kedua locale.
 *
 * Untuk tiap rute diperiksa:
 *   - HTTP 200
 *   - atribut <html lang> benar (en tanpa prefix, id pada /id)
 *   - tidak ada sisa literal kunci pesan (`m.kunci()`, `${`)
 *   - tidak ada entitas HTML ganda (`&amp;amp;`)
 *   - locale EN: tidak ada kebocoran kata fungsi Indonesia pada teks terlihat
 *
 * Mode: `node scripts/i18n-sweep.mjs` (HTTP/SSR, cepat) atau
 *       `node scripts/i18n-sweep.mjs --browser` (render penuh via Chromium,
 *       menangkap teks yang hanya muncul setelah data API termuat).
 */
import { readFileSync } from "node:fs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
const ROUTES = readFileSync(new URL("./_routes.txt", import.meta.url), "utf8")
  .split("\n").map((s) => s.trim()).filter(Boolean);
const USE_BROWSER = process.argv.includes("--browser");

const ID_WORDS = /\b(yang|dan|atau|untuk|dengan|tidak|adalah|berapa|kenapa|bagaimana|paket|kurir|biaya|alamat|kapasitas|utilisasi|komplain|armada|pengantaran|keranjang|pembeli|penjual|jumlah|hari|kota|dari|pada|juga|hanya)\b/gi;
const LEFTOVER = /m\.[a-z0-9_]+\(\)|\$\{/;
// Kata fungsi Inggris yang TIDAK muncul wajar di halaman Indonesia. Istilah kasus
// (hub, COD, P&L, Cost-Waterfall, Direct Operation, dll.) sengaja tidak termasuk.
// Hanya KATA FUNGSI Inggris: kata isi seperti "target", "risk", "customer",
// "cost" adalah loanword/istilah kasus yang lazim di teks Indonesia, sehingga
// memakainya sebagai penanda akan menghasilkan kebocoran palsu.
const EN_WORDS = /\b(the|and|or|with|not|is|are|was|were|this|that|these|those|from|your|you|we|they|their|will|should|would|could|has|have|been)\b/gi;
// Istilah kasus/nama produk yang MEMANG Inggris di kedua locale. Dibuang dulu
// sebelum menghitung, supaya detektor tidak melaporkan kebocoran palsu.
const CASE_TERMS = [
  "Digital Twin", "Market-Expansion ROI", "EV Fleet BCA", "Cost-Waterfall", "P&L", "Predictive COD",
  "Address Intelligence", "Demand Forecast", "Utilization Map", "Complaint Monitor", "Fleet & Emissions",
  "KPI Tracker", "Whitepaper", "Methodology", "Load Balancing", "Capacity Alert", "Route Clustering",
  "Digital Payment", "Slot Confirmation", "PUDO Network", "Hub Dashboard", "Executive Dashboard",
  "Network Expansion", "EV Site Selection", "Multimodal Control Tower", "COD Intelligence",
  "Direct Operation", "Regional Sponsor", "Joint Venture", "Modal Shift", "GC Logistics", "ISCEA",
  "NPV", "BCR", "ROI", "SLA", "MAPE", "COD", "PUDO", "Omnigistic", "Nigi AI", "GCMS"
];
function stripCaseTerms(text) {
  let out = text;
  for (const term of CASE_TERMS) out = out.split(term).join(" ");
  return out;
}
const strip = (h) => h
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/\s+/g, " ");

let problems = 0, checked = 0;
const report = (route, loc, msg) => { problems++; console.log(`  ❌ ${loc} ${route}: ${msg}`); };

async function httpPass(route, loc, url) {
  const res = await fetch(url, { redirect: "follow" });
  const html = await res.text();
  checked++;
  if (res.status !== 200) return report(route, loc, `HTTP ${res.status}`);
  const lang = (html.match(/<html[^>]*lang="([^"]*)"/) || [])[1];
  if (lang !== loc) report(route, loc, `lang="${lang}"`);
  if (LEFTOVER.test(html)) report(route, loc, "sisa literal kunci pesan");
  if (html.includes("&amp;amp;")) report(route, loc, "entitas HTML ganda");
  if (loc === "en") {
    const hits = strip(html).match(ID_WORDS) || [];
    if (hits.length > 2) report(route, loc, `kebocoran Indonesia: ${hits.length} (${[...new Set(hits)].slice(0, 4)})`);
  } else {
    const hits = stripCaseTerms(strip(html)).match(EN_WORDS) || [];
    if (hits.length > 3) report(route, loc, `kebocoran Inggris: ${hits.length} (${[...new Set(hits.map((h) => h.toLowerCase()))].slice(0, 5)})`);
  }
}

if (!USE_BROWSER) {
  console.log(`Sapuan HTTP (SSR): ${ROUTES.length} rute × 2 locale`);
  for (const r of ROUTES) {
    await httpPass(r, "en", BASE + r);
    await httpPass(r, "id", BASE + "/id" + r);
  }
} else {
  const { chromium } = await import("playwright-core");
  const { launchOptions } = await import("./_browser.mjs");
  const browser = await chromium.launch(launchOptions());
  console.log(`Sapuan browser (render penuh): ${ROUTES.length} rute`);
  for (const r of ROUTES) {
    // Konteks BARU per rute + jeda cukup: memakai satu page bersama membuat
    // pembacaan jatuh di DOM antar-navigasi sehingga muncul kebocoran palsu.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    await page.goto(BASE + r, { waitUntil: "load", timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(2600);
    const text = await page.locator("body").innerText().catch(() => "");
    const lang = await page.evaluate(() => document.documentElement.lang).catch(() => "?");
    checked++;
    if (lang !== "en") report(r, "en", `lang="${lang}"`);
    if (LEFTOVER.test(text)) report(r, "en", "sisa literal kunci pesan");
    const hits = text.match(ID_WORDS) || [];
    if (hits.length > 2) {
      // Konfirmasi ulang: di bawah beban (banyak rute berturut-turut) halaman
      // bisa belum selesai memuat sehingga terbaca setengah jadi. Ulangi sekali
      // dengan jeda lebih panjang sebelum dinyatakan bocor.
      const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const page2 = await ctx2.newPage();
      await page2.goto(BASE + r, { waitUntil: "load", timeout: 45000 }).catch(() => {});
      await page2.waitForTimeout(6000);
      const text2 = await page2.locator("body").innerText().catch(() => "");
      const hits2 = text2.match(ID_WORDS) || [];
      await ctx2.close();
      if (hits2.length > 2) report(r, "en", `kebocoran Indonesia: ${hits2.length} (${[...new Set(hits2)].slice(0, 4)})`);
    }
    await ctx.close();
  }
  await browser.close();
}
console.log(`\n===== I18N SWEEP: ${checked} pemeriksaan, ${problems} masalah =====`);
process.exit(problems === 0 ? 0 : 1);
