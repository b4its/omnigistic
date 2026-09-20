import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";
import { mkdirSync } from "node:fs";

/** Base & folder keluaran: env-override, artefak ke /tmp/opencode (bukan repo). */
const BASE = process.env.E2E_BASE || "http://127.0.0.1:3077";
const LANG_PREFIX = process.env.E2E_LANG === "en" ? "" : "/id";
const OUT = process.env.SHOT_DIR || "/tmp/opencode/shots";
mkdirSync(OUT, { recursive: true });
import fs from "node:fs";
fs.mkdirSync("images", { recursive: true });
const B = await chromium.launch(launchOptions());
const c = await B.newContext({ viewport: { width: 1400, height: 1000 } });
const p = await c.newPage();
p.on("pageerror", (e) => console.log("PAGEERR address:", String(e.message).slice(0, 100)));
await p.goto(BASE + LANG_PREFIX + "/dashboard/data/address", { waitUntil: "load" });
await p.waitForTimeout(5000);
await p.screenshot({ path: OUT + "/audit-address.png" });
console.log("address ok (map present:", (await p.locator(".leaflet-container").count()) + ")");

const p2 = await (await B.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await p2.goto(BASE + LANG_PREFIX + "/dashboard/pusat/executive", { waitUntil: "load" });
await p2.waitForTimeout(2500);
const mainH1 = await p2.locator("main h1").count();
const headH1 = await p2.locator("header h1").count();
console.log("executive h1: main=" + mainH1, "header=" + headH1);
await p2.screenshot({ path: OUT + "/audit-exec.png" });
await B.close();
