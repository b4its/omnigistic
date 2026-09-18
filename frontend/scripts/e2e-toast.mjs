/**
 * E2E: notifikasi (toast) pada setiap aksi.
 *
 * Memverifikasi bahwa aksi pengguna memunculkan alert notifikasi yang sesuai
 * jenisnya (success/info/warn/error). Menjalankan aksi nyata di UI lalu memastikan
 * elemen [data-testid="toast"] muncul dengan pesan & tipe yang diharapkan.
 *
 * Prasyarat: frontend dev jalan di E2E_BASE (default http://127.0.0.1:3000).
 */
import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });

let browser, page;

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
  // Toast di-batch dalam memori; tunggu toast sebelumnya pudar agar hitungan bersih.
  await page.waitForTimeout(200);
}

/** Ambil semua toast yang sedang tampil. */
async function toasts() {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="toast"]')].map((el) => ({
      text: el.innerText.replace(/\s+/g, " ").trim(),
      type: el.getAttribute("data-toast-type"),
    }))
  );
}

async function clickAndRead(locator, label, expectType) {
  const before = (await toasts()).length;
  await locator.click();
  await page.waitForTimeout(400);
  const t = await toasts();
  const added = t.slice(before);
  const toast = added[added.length - 1];
  R(!!toast, `${label}: memunculkan notifikasi`, toast ? `"${toast.text.slice(0, 50)}"` : "tidak ada toast");
  if (toast && expectType) R(toast.type === expectType, `${label}: tipe=${expectType}`, `tipe=${toast.type}`);
}

try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  page = await ctx.newPage();

  // ── Customer: overview (tema, tambah keranjang, filter, urutkan, hapus cari) ──
  await goto("/dashboard/customer/overview");

  await clickAndRead(page.locator('button[title="Beralih tema"]').first(), "tema: ganti mode", "info");

  const addBtn = page.getByRole("button", { name: /^Keranjang$/ }).first();
  await clickAndRead(addBtn, "belanja: tambah ke keranjang", "success");

  await clickAndRead(page.getByRole("button", { name: "Elektronik" }).first(), "belanja: filter kategori", "info");

  // urutkan via select (pakai selectOption agar event change terpicu)
  {
    const before = (await toasts()).length;
    await page.locator('select[aria-label="Urutkan produk"]').selectOption("murah");
    await page.waitForTimeout(400);
    const added = (await toasts()).slice(before);
    R(added.length >= 1, "belanja: ubah urutan (select) memunculkan notifikasi", added.length ? `"${added[added.length-1].text.slice(0,40)}"` : "");
  }

  // ── Customer: cart (qty +/-, hapus, kosongkan) ──
  await goto("/dashboard/customer/cart");
  const plusBtn = page.getByRole("button", { name: "Tambah jumlah" }).first();
  if (await plusBtn.count()) await clickAndRead(plusBtn, "keranjang: tambah qty", "info");
  else R(false, "keranjang: tambah qty", "keranjang kosong (seed tak jalan)");

  // ── Customer: checkout (pilih bayar, buat pesanan) — butuh item keranjang ──
  await goto("/dashboard/customer/overview");
  const add2 = page.getByRole("button", { name: /^Keranjang$/ }).first();
  await add2.click().catch(()=>{});
  await page.goto(BASE + "/dashboard/customer/cart", { waitUntil: "networkidle" });
  const checkoutLink = page.getByRole("link", { name: /Checkout|Lanjut/i }).first();
  if (await checkoutLink.count()) { await checkoutLink.click(); await page.waitForTimeout(800); }
  else await goto("/dashboard/customer/checkout");

  const isCheckout = (await page.locator("text=Checkout").count()) > 0;
  if (isCheckout) {
    // pilih Transfer untuk menghindari kebutuhan skor COD
    const transferBtn = page.getByRole("button", { name: /Transfer/i }).first();
    if (await transferBtn.count()) await clickAndRead(transferBtn, "checkout: pilih Transfer", "info");
  } else {
    R(false, "checkout: form tampil", "tidak sampai ke checkout");
  }

  // ── Kurir: tasks tanpa pesanan (state kosong tetap ada), lalu retry di overview ──
  await goto("/dashboard/kurir/overview");
  const retry = page.getByRole("button", { name: /Coba lagi/i }).first();
  if (await retry.count()) await clickAndRead(retry, "kurir/overview: tombol coba lagi", "info");

  // ── Hub: load-balance slider + tombol "Jalankan optimizer" → toast ──
  // Desain halaman: geser ambang lalu KLIK tombol (bukan auto-jalan tiap geser),
  // agar tiap perubahan endpoint dapat dibatalkan/dikonfirmasi. Jadi aksi yang
  // memicu notifikasi = klik tombol, bukan event 'input' mentah.
  await goto("/dashboard/hub/load-balance");
  {
    const slider = page.locator('input[type="range"]').first();
    const runBtn = page.getByRole("button", { name: /Jalankan optimizer/i }).first();
    if ((await slider.count()) && (await runBtn.count())) {
      await slider.evaluate((el) => { el.value = "30"; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
      await page.waitForTimeout(300);
      const before = (await toasts()).length;
      await runBtn.click();
      await page.waitForTimeout(600);
      const added = (await toasts()).slice(before);
      R(added.length >= 1, "load-balance: jalankan optimizer memunculkan notifikasi", added.length ? `"${added[added.length-1].text.slice(0,40)}"` : "");
    }
  }

  // ── Academy: tandai pelajaran selesai → toast success, lalu reset → toast warn ──
  await goto("/dashboard/academy");
  // Buka track pertama → pelajaran pertama.
  const firstTrack = page.locator('a[href*="/dashboard/academy/"]').first();
  if (await firstTrack.count()) {
    await firstTrack.click();
    await page.waitForTimeout(600);
    const firstLesson = page.locator('a[href*="/dashboard/academy/"]').filter({ hasNotText: /sertifikat|Academy/i }).first();
    if (await firstLesson.count()) {
      await firstLesson.click();
      await page.waitForTimeout(600);
      const markBtn = page.getByRole("button", { name: /Tandai selesai/i }).first();
      if (await markBtn.count()) await clickAndRead(markBtn, "academy: tandai selesai", "success");
      else R(false, "academy: tandai selesai", "tombol tidak ditemukan");
    }
  }
  await goto("/dashboard/academy");
  const resetBtn = page.getByRole("button", { name: /Reset progres/i }).first();
  if (await resetBtn.count()) await clickAndRead(resetBtn, "academy: reset progres", "warn");
  else R(false, "academy: reset progres", "tombol reset tidak muncul");

  // ── Seller: ubah urutan produk (select) ──
  await goto("/dashboard/seller/products");
  {
    const before = (await toasts()).length;
    await page.locator('select[aria-label="Urutkan produk"]').selectOption("margin");
    await page.waitForTimeout(400);
    const added = (await toasts()).slice(before);
    R(added.length >= 1, "seller/products: ubah urutan memunculkan notifikasi", added.length ? `"${added[added.length-1].text.slice(0,40)}"` : "");
  }
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 200));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== E2E TOAST ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
