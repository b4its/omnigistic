import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";

const BASE = process.env.AUDIT_BASE || "http://127.0.0.1:4250";

const paths = [
  "/",
  "/analisis",
  "/login",
  "/dashboard",
  "/dashboard/academy",
  "/dashboard/methodology",
  "/dashboard/kpi",
  "/dashboard/pusat/overview",
  "/dashboard/pusat/executive",
  "/dashboard/pusat/digital-twin",
  "/dashboard/pusat/utilization",
  "/dashboard/pusat/network",
  "/dashboard/pusat/roi",
  "/dashboard/hub/overview",
  "/dashboard/hub/dashboard",
  "/dashboard/hub/forecast",
  "/dashboard/hub/load-balance",
  "/dashboard/hub/capacity",
  "/dashboard/kurir/overview",
  "/dashboard/kurir/routes",
  "/dashboard/kurir/cod-risk",
  "/dashboard/kurir/slot",
  "/dashboard/kurir/payment",
  "/dashboard/kurir/pudo",
  "/dashboard/data/overview",
  "/dashboard/data/address",
  "/dashboard/data/complaint",
  "/dashboard/data/multimodal",
  "/dashboard/data/fleet",
  "/dashboard/data/ev-sites"
];

const browser = await chromium.launch(launchOptions());

async function audit(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const rows = [];
  for (const p of paths) {
    const errs = [];
    const onErr = (e) => errs.push(String(e.message).slice(0, 70));
    const onConsole = (m) => {
      if (m.type() === "error" && !/favicon|Failed to load resource|ERR_CONNECTION|net::|Failed to fetch/.test(m.text())) errs.push(m.text().slice(0, 70));
    };
    page.on("pageerror", onErr);
    page.on("console", onConsole);
    try {
      await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(500);
      const res = await page.evaluate(() => {
        const de = document.documentElement;
        const main = document.getElementById("omnigistic-main");
        const vw = window.innerWidth;
        const offenders = [];
        for (const el of document.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right - vw > 3 || r.left < -3)) {
            const cs = getComputedStyle(el);
            if (cs.position === "fixed" || el.closest("[aria-hidden='true']")) continue;
            offenders.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 54), right: Math.round(r.right) });
            if (offenders.length > 3) break;
          }
        }
        return {
          bodyOv: de.scrollWidth - de.clientWidth,
          mainOv: main ? main.scrollWidth - main.clientWidth : 0,
          offenders
        };
      });
      rows.push({ p, ...res, errs: errs.slice(0, 2) });
    } catch (e) {
      rows.push({ p, error: String(e.message).slice(0, 90) });
    }
    page.off("pageerror", onErr);
    page.off("console", onConsole);
  }
  await ctx.close();
  return rows;
}

for (const [label, w, h] of [["DESKTOP 1440", 1440, 900], ["MOBILE 390", 390, 844]]) {
  const rows = await audit(w, h);
  console.log("\n=== " + label + " ===");
  for (const r of rows) {
    const bad = r.error || r.bodyOv > 1 || r.mainOv > 1 || (r.errs && r.errs.length);
    const line = [
      bad ? "XX" : "ok",
      r.p.replace("/dashboard", "d").padEnd(34),
      "bodyOv=" + (r.bodyOv ?? "-"),
      "mainOv=" + (r.mainOv ?? "-"),
      r.errs && r.errs.length ? "errs=" + r.errs.join("; ") : "",
      r.offenders && r.offenders.length ? "off=" + JSON.stringify(r.offenders.slice(0, 2)) : ""
    ].join(" ");
    console.log(line);
  }
}

await browser.close();
