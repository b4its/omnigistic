/**
 * E2E: "Tambah widget" benar-benar menambah widget ke dashboard (simulasi).
 *
 * Memverifikasi alur nyata (bukan lagi fake affordance):
 *  1. Buka drawer "Tambah widget" dari Topbar.
 *  2. Pilih 2 widget → tombol "Tambah ke dashboard".
 *  3. Widget muncul sebagai kartu di strip "Widget dashboard".
 *  4. Tersimpan di localStorage & bertahan setelah reload.
 *  5. Lepas satu widget → berkurang; "Bersihkan" → hilang semua.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
/** Prefix locale uji: asersi berbahasa Indonesia → default /id (E2E_LANG=en untuk Inggris). */
const LANG_PREFIX = process.env.E2E_LANG === "en" ? "" : "/id";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });
mkdirSync("/tmp/opencode/shots", { recursive: true });

let browser;
try {
  browser = await chromium.launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));

  await page.goto(BASE + LANG_PREFIX + "/dashboard/pusat/executive", { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(2000);

  R((await page.locator('section[aria-label="Widget dashboard"]').count()) === 0, "awal: belum ada strip widget");

  // Buka drawer & pilih 2 widget.
  await page.locator('button:has-text("Tambah widget")').first().click();
  await page.waitForTimeout(400);
  R(await page.locator('div[role="dialog"][aria-label="Tambah widget"]').isVisible(), "drawer terbuka");
  const cards = page.locator('div[role="dialog"] .flex.gap-3');
  await cards.nth(0).locator("button").click();
  await page.waitForTimeout(150);
  await cards.nth(1).locator("button").click();
  await page.waitForTimeout(150);
  R(/(\d+) dipilih/.exec(await page.locator('div[role="dialog"]').innerText())?.[1] === "2", "2 widget dipilih");
  await page.locator('div[role="dialog"] button:has-text("Tambah ke dashboard")').click();
  await page.waitForTimeout(800);

  const links = await page.locator('section[aria-label="Widget dashboard"] a').count();
  R(links === 2, "2 widget muncul di dashboard", `links=${links}`);
  const ls = await page.evaluate(() => localStorage.getItem("omnigistic-widgets-v1"));
  R(!!ls && JSON.parse(ls).length === 2, "tersimpan di localStorage", String(ls));

  // Bertahan setelah reload.
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(2000);
  R((await page.locator('section[aria-label="Widget dashboard"] a').count()) === 2, "widget bertahan setelah reload");

  // Lepas satu.
  await page.locator('button[aria-label^="Lepas widget"]').first().click();
  await page.waitForTimeout(500);
  R((await page.locator('section[aria-label="Widget dashboard"] a').count()) === 1, "lepas 1 widget → tersisa 1");

  // Bersihkan.
  await page.locator('button:has-text("Bersihkan")').click();
  await page.waitForTimeout(500);
  R((await page.locator('section[aria-label="Widget dashboard"]').count()) === 0, "bersihkan → strip hilang");

  R(errs.length === 0, "tanpa error JS", errs.join(" | "));
  await page.screenshot({ path: "/tmp/opencode/shots/widgets.png" });
  await ctx.close();
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 160));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== WIDGETS ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
process.exit(fail.length ? 1 : 0);
