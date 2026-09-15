/**
 * E2E: koherensi status pesanan lintas role (Customer ⇄ Kurir).
 *
 * Menguji inti permintaan: status pesanan pembeli mengikuti KONDISI PAKET TERKINI
 * hasil aksi kurir nyata (bukan tombol simulasi di sisi pembeli).
 *
 * Alur uji (deterministik, seed store lewat localStorage):
 *  1. Seed 1 pesanan "dikemas" di store bersama (omnigistic-shop-v1).
 *  2. KURIR buka /dashboard/kurir/tasks → pesanan muncul sebagai tugas.
 *  3. KURIR jalankan aksi bertahap (jemput → transit → antar → terkirim),
 *     menulis keterangan kondisi; pastikan status & catatan berubah.
 *  4. CUSTOMER buka /dashboard/customer/orders → status & riwayat perjalanan
 *     mencerminkan aksi kurir tadi (terkirim + catatan terakhir).
 *  5. CUSTOMER buka /dashboard/customer/dashboard → kondisi terkini = aksi kurir.
 *
 * Prasyarat: frontend dev jalan di E2E_BASE (default http://127.0.0.1:3000).
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const STORAGE_KEY = "omnigistic-shop-v1";
const results = [];
const R = (ok, name, info = "") => results.push({ ok: !!ok, name, info });
mkdirSync("/tmp/opencode/shots", { recursive: true });

const NOW = Date.now();
const ORDER_ID = "ORD-E2E-TEST-1";
const NOTE_PICKUP = "Paket diambil dari hub, kondisi segel utuh.";
const NOTE_ARRIVE = "Diterima langsung oleh Sari, segel masih utuh.";

const seededState = {
  cart: [],
  address: null,
  buyerId: "BUY-GOOD",
  orders: [
    {
      id: ORDER_ID,
      createdAt: NOW,
      items: [{ productId: "p-kopi-1", name: "Kopi Arabika Gayo 250g", emoji: "☕", price: 65000, qty: 2 }],
      subtotal: 130000,
      shipping: 14000,
      total: 144000,
      address: { recipient: "Sari Wulandari", phone: "081234567890", street: "Jl. Raya Jakarta-Bogor No.12", city: "Jakarta" },
      payment: "COD",
      codScore: 0.22,
      codDecision: "antar-normal",
      status: "dikemas",
      statusNote: "Pesanan diterima & sedang dikemas di hub.",
      courier: null,
      updatedAt: NOW,
      events: [{ at: NOW, status: "dikemas", note: "Pesanan diterima & sedang dikemas di hub.", actor: "Sistem" }]
    }
  ]
};

let browser, page, ctx;

async function seedState(state) {
  // Seed SEKALI saja: addInitScript berjalan tiap navigasi, jadi lindungi dengan
  // flag agar aksi kurir yang sudah tersimpan tidak tertimpa saat pindah halaman.
  await page.addInitScript(
    ([key, val]) => {
      if (window.localStorage.getItem("__e2e_seeded__") === "1") return;
      window.localStorage.setItem(key, val);
      window.localStorage.setItem("__e2e_seeded__", "1");
    },
    [STORAGE_KEY, JSON.stringify(state)]
  );
}

async function goto(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 });
}

/** Baca status pesanan dari localStorage (sumber kebenaran lintas role). */
async function readOrderFromStorage() {
  return page.evaluate(
    ([key, id]) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const o = JSON.parse(raw).orders.find((x) => x.id === id);
      return o ? { status: o.status, statusNote: o.statusNote, courier: o.courier, events: o.events.length } : null;
    },
    [STORAGE_KEY, ORDER_ID]
  );
}

try {
  browser = await chromium.launch(launchOptions());
  ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  page = await ctx.newPage();

  // ── 1. KURIR: tugas muncul dari pesanan nyata ──
  await seedState(seededState);
  await goto("/dashboard/kurir/tasks");
  let body = await page.locator("body").innerText();
  R(body.includes(ORDER_ID), "kurir/tasks: pesanan pembeli muncul sebagai tugas", ORDER_ID);
  R(/Tugas saat ini|Jemput paket di hub/i.test(body), "kurir/tasks: tampilkan tugas saat ini (dikemas)", "");
  R(body.includes("Sari Wulandari"), "kurir/tasks: detail penerima tampil", "");

  // ── 2. KURIR: aksi bertahap dengan catatan kondisi ──
  const flow = [
    { btn: /Jemput paket di hub/i, expect: "dijemput", note: NOTE_PICKUP, label: "dijemput" },
    { btn: /Serahkan ke transit hub/i, expect: "transit", note: "", label: "transit" },
    { btn: /Mulai pengantaran/i, expect: "dikirim", note: "", label: "dikirim" },
    { btn: /Konfirmasi paket tiba/i, expect: "terkirim", note: NOTE_ARRIVE, label: "terkirim" }
  ];
  for (const step of flow) {
    if (step.note) {
      await page.locator(`textarea[aria-label="Keterangan kondisi paket ${ORDER_ID}"]`).fill(step.note);
    }
    await page.getByRole("button", { name: step.btn }).first().click();
    await page.waitForTimeout(500);
    const st = await readOrderFromStorage();
    R(st?.status === step.expect, `kurir: majukan → ${step.label}`, `status=${st?.status}`);
  }

  // ── 3. CUSTOMER: status & riwayat mengikuti aksi kurir ──
  await goto("/dashboard/customer/orders");
  body = await page.locator("body").innerText();
  R(/Terkirim/.test(body), "customer/orders: status akhir = Terkirim", "");
  R(body.includes(NOTE_ARRIVE), "customer/orders: kondisi terkini = catatan kurir terakhir", NOTE_ARRIVE.slice(0, 30));
  R(body.includes(NOTE_PICKUP), "customer/orders: riwayat memuat catatan kurir jemput", NOTE_PICKUP.slice(0, 30));
  R(/Riwayat perjalanan paket/.test(body), "customer/orders: blok riwayat perjalanan ada", "");
  R(/Kurir Baits/.test(body), "customer/orders: aktor kurir tercatat", "Kurir Baits");
  R(!/Simulasikan progres pengantaran/i.test(body), "customer/orders: tombol simulasi lama SUDAH HILANG", "");
  await page.screenshot({ path: "/tmp/opencode/shots/e2e-orders-customer.png" });

  // ── 4. CUSTOMER: dashboard melacak kondisi terkini (read-only) ──
  await goto("/dashboard/customer/dashboard");
  body = await page.locator("body").innerText();
  R(body.includes(NOTE_ARRIVE), "customer/dashboard: kondisi terkini = aksi kurir", NOTE_ARRIVE.slice(0, 30));
  R(!/Tandai terkirim/i.test(body), "customer/dashboard: tidak ada tombol ubah status", "");
  R(/Status pengantaran/i.test(body), "customer/dashboard: panel status (bukan simulasi manual)", "");

  // ── 5. KURIR: event log bertambah setiap aksi ──
  const ev = await readOrderFromStorage();
  R(ev?.events >= 5, "store: event riwayat bertambah tiap aksi kurir", `events=${ev?.events}`);
} catch (e) {
  R(false, "FATAL", String(e.message).slice(0, 200));
} finally {
  if (browser) await browser.close();
}

const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`\n===== E2E ORDERS ${pass}/${results.length} PASS =====`);
for (const r of results) console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.info ? " — " + r.info : ""}`);
if (fail.length) {
  console.log("\n--- FAILED ---");
  for (const f of fail) console.log(`  ${f.name} :: ${f.info}`);
}
process.exit(fail.length ? 1 : 0);
