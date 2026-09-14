import { chromium } from "playwright-core";
const B = await chromium.launch({ executablePath: "/home/sleepy/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome", args: ["--no-sandbox"] });
const p = await (await B.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on("pageerror", e => errs.push(e.message.slice(0, 100)));
const pages = [["/dashboard/pusat/roi","r-roi"], ["/dashboard/hub/capacity","r-capacity"], ["/dashboard/kurir/pudo","r-pudo"], ["/dashboard/data/fleet","r-fleet"], ["/dashboard/pusat/digital-twin","r-twin"], ["/dashboard/kpi","r-kpi"], ["/dashboard/methodology","r-method"], ["/", "r-landing"]];
for (const [path, name] of pages) {
  await p.goto("http://127.0.0.1:3000" + path, { waitUntil: "load" });
  await p.waitForTimeout(name==="r-landing"?2200:2600);
  await p.screenshot({ path: `/tmp/shots2/${name}.png` });
}
console.log("errors:", errs.length ? errs.join(" | ") : "NONE");
await B.close();
