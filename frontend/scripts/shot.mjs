import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { launchOptions } from "./_browser.mjs";

mkdirSync("/tmp/opencode/shots", { recursive: true });
const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3077";
const pages = (process.env.SHOT_PAGES || "/dashboard/hub/load-balance").split(",");
const tag = process.env.SHOT_TAG || "shot";

const b = await chromium.launch({ ...launchOptions(), executablePath: process.env.PLAYWRIGHT_CHROMIUM || launchOptions().executablePath });
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("JS: " + String(e.message).slice(0, 160)));
p.on("console", (m) => { if (m.type() === "error") errs.push("CON: " + m.text().slice(0, 160)); });

for (const path of pages) {
  await p.goto(BASE + path, { waitUntil: "networkidle", timeout: 40000 }).catch((e) => errs.push("NAV " + path + ": " + e.message.slice(0, 80)));
  await p.waitForTimeout(2500);
  const name = tag + "-" + path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  await p.screenshot({ path: `/tmp/opencode/shots/${name}.png`, fullPage: false });
  console.log("shot", name);
}
if (errs.length) console.log("ERRORS:\n" + errs.join("\n"));
else console.log("no page errors");
await b.close();
