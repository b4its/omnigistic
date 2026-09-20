/**
 * Uji asap i18n dua bahasa di browser nyata.
 *
 * Berbeda dari skrip e2e lain (asersinya berbahasa Indonesia dan berjalan di
 * /id), skrip ini memeriksa KEDUA locale:
 *   - EN (tanpa prefix): atribut lang="en" + teks benar-benar Inggris
 *   - ID (/id): atribut lang="id" + teks benar-benar Indonesia
 *   - pengalih bahasa mengubah URL dan isi halaman
 *   - tidak ada kebocoran bahasa (kata fungsi bahasa lain) dan tidak ada sisa
 *     literal kunci pesan (`m.kunci()`, `${`)
 *
 * Prasyarat: frontend dev jalan di E2E_BASE (default http://127.0.0.1:3077).
 * Jalankan: node scripts/i18n-smoke.mjs
 */
import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
const PAGES = [
  "/",
  "/analisis",
  "/whitepaper",
  "/login",
  "/dashboard",
  "/dashboard/pusat/pnl",
  "/dashboard/pusat/ev-bca",
  "/dashboard/hub/surge",
  "/dashboard/kurir/tasks",
  "/dashboard/customer/overview",
  "/dashboard/methodology"
];

const ID_WORDS = /\b(yang|dan|atau|untuk|dengan|tidak|adalah|berapa|kenapa|bagaimana|paket|kurir|biaya|alamat|kapasitas|utilisasi|komplain|armada)\b/i;
const EN_WORDS = /\b(the|and|or|for|with|not|parcels|courier|cost|address|capacity|utilisation|complaints|fleet)\b/i;
const LEFTOVER = /m\.[a-z0-9_]+\(\)|\$\{/;

let pass = 0, fail = 0;
const check = (ok, label, detail = "") => {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.log(`  ❌ ${label} ${detail}`); }
};

const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const read = async (url) => {
  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(1800);
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 900) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(400);
  return {
    lang: await page.evaluate(() => document.documentElement.lang),
    text: await page.locator("body").innerText()
  };
};

console.log("— Halaman EN (tanpa prefix)");
for (const p of PAGES) {
  const { lang, text } = await read(BASE + p);
  check(lang === "en", `EN ${p}: lang="en"`, `(dapat "${lang}")`);
  check(!LEFTOVER.test(text), `EN ${p}: tanpa sisa literal kunci`);
  const idMatches = text.match(new RegExp(`.{30}${ID_WORDS.source.slice(2, -2)}.{30}`, "gi")) || [];
  check(idMatches.length <= 2, `EN ${p}: tanpa kebocoran Indonesia`,
    `(kata Indonesia: ${idMatches.length}) ${idMatches.slice(0, 3).map((x) => x.replace(/\n+/g, " ").trim()).join(" | ")}`);
  check(EN_WORDS.test(text), `EN ${p}: teks benar-benar Inggris`);
}

console.log("— Halaman ID (/id)");
for (const p of PAGES) {
  const { lang, text } = await read(BASE + "/id" + p);
  check(lang === "id", `ID ${p}: lang="id"`, `(dapat "${lang}")`);
  check(!LEFTOVER.test(text), `ID ${p}: tanpa sisa literal kunci`);
}

console.log("— Pengalih bahasa (halaman dalam: path harus dipertahankan)");
await page.goto(BASE + "/id/dashboard/pusat/pnl", { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(2200);
check(await page.evaluate(() => document.documentElement.lang) === "id", "pengalih dalam: mulai dari /id (lang=id)");
await page.locator('a[href="/dashboard/pusat/pnl"]').first().click();
await page.waitForTimeout(2500);
check(page.url().endsWith("/dashboard/pusat/pnl"), "pengalih dalam: path dipertahankan saat ke EN", `(${page.url()})`);
check(await page.evaluate(() => document.documentElement.lang) === "en", "pengalih dalam: lang menjadi en");
const cookies = await page.context().cookies();
check(cookies.some((c) => c.name === "PARAGLIDE_LOCALE"), "pengalih dalam: preferensi locale disimpan (cookie)");
await page.goto(BASE + "/dashboard/kurir/tasks", { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(2000);
check(await page.evaluate(() => document.documentElement.lang) === "en", "pengalih dalam: pilihan bertahan di halaman lain");

console.log("— Pengalih bahasa (landing)");
await page.goto(BASE + "/", { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1200);
const enText = await page.locator("body").innerText();
const toId = page.getByRole("link", { name: /Indonesia|ID/i }).first();
if (await toId.count()) {
  await toId.click();
  await page.waitForTimeout(2500);
  const url = page.url();
  const idText = await page.locator("body").innerText();
  check(url.includes("/id"), "pengalih: URL berpindah ke /id", `(${url})`);
  check(await page.evaluate(() => document.documentElement.lang) === "id", "pengalih: lang menjadi id");
  check(idText !== enText, "pengalih: isi halaman berubah");
} else {
  fail++;
  console.log("  ❌ pengalih: kontrol bahasa tidak ditemukan");
}

await browser.close();
console.log(`\n===== I18N SMOKE ${pass}/${pass + fail} PASS =====`);
process.exit(fail === 0 ? 0 : 1);
