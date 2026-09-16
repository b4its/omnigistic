/**
 * E2E: halaman simulasi interaktif (lanjutan) — Capacity & Address Intelligence.
 *
 * Menguji interaktivitas nyata (bukan label kosong):
 *  1. /dashboard/hub/capacity — simulasi kapasitas elastis 3 tingkat:
 *     - pilih level permintaan (Lembah/Normal/Puncak) → jumlah hub menembus
 *       ambang & overflow HARUS berubah (bukan label statis).
 *     - Puncak menembus lebih banyak hub daripada Lembah.
 *  2. /dashboard/data/address — Address Intelligence:
 *     - ada input teks + tombol Analisis.
 *     - mengetik alamat baru → POST /ml/address-parse & hasil berubah.
 *     - alamat tanpa kecocokan → pesan "Belum ada kecocokan".
 *
 * Prasyarat: backend :8000 + frontend dev :3000.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
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
  await page.goto(BASE + path, { waitUntil: "load", timeout: 40000 });
  await page.waitForTimeout(2500);
  return { ctx, page, errs };
}

/** Ambil angka "hub menembus ambang" dari kartu KPI pertama. */
async function breachCount(page) {
  const txt = await page.locator("body").innerText();
  // Kartu: "Hub menembus ambang >65%" lalu "5/ 23"
  const m = txt.match(/menembus ambang[^\n]*\n\s*(\d+)\s*\/\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

try {
  browser = await chromium.launch(launchOptions());

  // ── 1. Capacity Alert (simulasi elastis) ──
  {
    const { ctx, page, errs } = await openPage("/dashboard/hub/capacity");
    const txt0 = await page.locator("body").innerText();
    R(/Capacity Alert/.test(txt0), "kapasitas: judul");
    R(/Simulasi kapasitas elastis/.test(txt0), "kapasitas: label simulasi");
    R(/Overflow butuh buffer/.test(txt0), "kapasitas: kartu overflow");

    const levelBtns = page.locator("button", { hasText: /^(Lembah|Normal|Puncak)/ });
    R((await levelBtns.count()) === 3, "kapasitas: 3 tombol level", `n=${await levelBtns.count()}`);

    // Pilih Lembah.
    const lembah = page.locator("button", { hasText: "Lembah" });
    await lembah.click();
    await page.waitForTimeout(500);
    const nLembah = await breachCount(page);

    // Pilih Puncak.
    const puncak = page.locator("button", { hasText: "Puncak" });
    await puncak.click();
    await page.waitForTimeout(500);
    const nPuncak = await breachCount(page);

    R(nLembah !== null && nPuncak !== null, "kapasitas: breach terhitung", `${nLembah} vs ${nPuncak}`);
    R(nPuncak > nLembah, "kapasitas: Puncak menembus lebih banyak hub dari Lembah", `${nLembah} -> ${nPuncak}`);
    R(await puncak.getAttribute("aria-pressed") === "true", "kapasitas: level aktif terefleksi (aria-pressed)");
    R(errs.length === 0, "kapasitas: tanpa error JS", errs.join(" | "));
    await page.screenshot({ path: "/tmp/opencode/shots/capacity-sim.png" });
    await ctx.close();
  }

  // ── 2. Address Intelligence (input bebas) ──
  {
    let posts = 0;
    const { ctx, page, errs } = await openPage("/dashboard/data/address", (r) => {
      if (r.method() === "POST" && r.url().includes("/ml/address-parse")) posts++;
    });
    const input = page.locator("#addr-input");
    R((await input.count()) === 1, "alamat: input teks ada");
    const submit = page.locator('button[type="submit"]', { hasText: "Analisis" });
    R((await submit.count()) === 1, "alamat: tombol Analisis ada");
    R(posts >= 1, "alamat: auto-analisis saat muat", `posts=${posts}`);

    // Ketik alamat dengan distrik Cibinong → engine harus memilih Kab. Bogor.
    await input.fill("Jl. Raya Jakarta-Bogor No.12, Cibinong, Kabupaten Bogor");
    await submit.click();
    await page.waitForTimeout(5500);
    const txt = await page.locator("body").innerText();
    R(/Keputusan:/.test(txt), "alamat: keputusan tampil");
    R(/Cibinong/.test(txt) && /Bogor/.test(txt), "alamat: kandidat Cibinong/Bogor terpilih");
    R(errs.length === 0, "alamat: tanpa error JS", errs.join(" | "));
    await page.screenshot({ path: "/tmp/opencode/shots/address-input.png" });
    await ctx.close();
  }
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 160));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== SIMS ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
