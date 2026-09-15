import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";
const B = await chromium.launch(launchOptions());
const ctx = await B.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const shots = [
  ["/", "01-landing-top"],
  ["/", "02-landing-charts", () => document.querySelector("#proyek")?.scrollIntoView(), 1200],
  ["/login", "03-login"],
  ["/dashboard/pusat/overview", "04-pusat-overview"],
  ["/dashboard/pusat/executive", "05-pusat-exec"],
  ["/dashboard/hub/dashboard", "06-hub-dash"],
  ["/dashboard/hub/forecast", "07-hub-forecast"],
  ["/dashboard/hub/capacity", "08-hub-capacity"],
  ["/dashboard/kurir/cod-risk", "09-kurir-cod"],
  ["/dashboard/kurir/pudo", "10-kurir-pudo"],
  ["/dashboard/data/address", "11-data-address", null, 5200],
  ["/dashboard/data/fleet", "12-data-fleet"],
  ["/dashboard/data/ev-sites", "13-data-ev"],
  ["/dashboard/pusat/roi", "14-pusat-roi"],
  ["/dashboard/pusat/digital-twin", "15-pusat-twin"],
  ["/dashboard/kpi", "16-kpi"],
  ["/dashboard/methodology", "17-method"],
  ["/dashboard/academy", "18-academy"]
];
const errs = [];
p.on("pageerror", e => errs.push(e.message.slice(0, 120)));
for (const [path, name, pre, extraWait] of shots) {
  await p.goto("http://127.0.0.1:3000" + path, { waitUntil: "load" });
  await p.waitForTimeout(extraWait || 2400);
  if (pre) await p.evaluate(pre);
  await p.screenshot({ path: `/tmp/shots2/${name}.png` });
}
console.log("pageerrors:", errs.length ? errs.join(" | ") : "NONE");
await B.close();
