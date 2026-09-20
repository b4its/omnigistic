/**
 * Uji paritas i18n: memastikan kedua bahasa menampilkan ANGKA yang sama.
 *
 * Angka & istilah kasus tidak boleh diterjemahkan. Skrip ini merender tiap
 * halaman kanonik di locale EN (tanpa prefix) dan ID (/id), mengekstrak seluruh
 * token numerik dari teks yang terlihat, lalu membandingkannya setelah
 * menormalkan pemisah desimal/ribuan (ID "1.110,5" ≡ EN "1,110.5").
 *
 * Prasyarat: frontend dev jalan di E2E_BASE (default http://127.0.0.1:3077).
 * Jalankan: node scripts/i18n-parity.mjs
 */
import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
const PAGES = [
  "pusat/digital-twin",
  "pusat/expansion",
  "pusat/pnl",
  "hub/surge",
  "kurir/cod-intel",
  "pusat/ev-bca"
];

/** Normalisasi token angka ke bentuk kanonik: buang pemisah, titik desimal. */
function canon(token) {
  let t = token.replace(/\s/g, "");
  const hasComma = t.includes(",");
  const hasDot = t.includes(".");
  if (hasComma && hasDot) {
    // pemisah ribuan = simbol yang muncul lebih dulu
    const thousands = t.indexOf(",") < t.indexOf(".") ? "," : ".";
    const decimal = thousands === "," ? "." : ",";
    t = t.split(thousands).join("");
    t = t.replace(decimal, ".");
  } else if (hasComma) {
    // "1,110" (EN ribuan) vs "17,25" (ID desimal)
    const parts = t.split(",");
    t = parts.length === 2 && parts[1].length === 2 ? parts.join(".") : parts.join("");
  } else if (hasDot) {
    const parts = t.split(".");
    t = parts.length === 2 && parts[1].length === 2 ? parts.join(".") : parts.join("");
  }
  return t;
}

function numbers(text) {
  const set = new Set();
  for (const m of text.matchAll(/\d[\d.,]*/g)) {
    // buang tanda baca akhir kalimat yang ikut tertangkap (mis. "2,000." di akhir kalimat)
    const c = canon(m[0].replace(/[.,]+$/, ""));
    if (c.replace(/\D/g, "").length >= 2) set.add(c);
  }
  return set;
}

const browser = await chromium.launch(launchOptions());
let failures = 0;
for (const path of PAGES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const grab = async (url) => {
    await page.goto(url, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(2500);
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 800) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(600);
    return numbers(await page.locator("body").innerText());
  };
  const en = await grab(`${BASE}/dashboard/${path}`);
  const id = await grab(`${BASE}/id/dashboard/${path}`);
  const onlyEn = [...en].filter((n) => !id.has(n));
  const onlyId = [...id].filter((n) => !en.has(n));
  const ok = onlyEn.length === 0 && onlyId.length === 0;
  if (!ok) failures++;
  console.log(
    `${ok ? "✅" : "❌"} ${path.padEnd(20)} EN=${en.size} ID=${id.size}` +
      (ok ? "" : `  EN-only=[${onlyEn.slice(0, 6)}] ID-only=[${onlyId.slice(0, 6)}]`)
  );
  await page.close();
}
await browser.close();
console.log(failures === 0 ? "\n===== I18N PARITY: ANGKA IDENTIK DI SEMUA HALAMAN =====" : `\n===== I18N PARITY: ${failures} halaman berbeda =====`);
process.exit(failures === 0 ? 0 : 1);
