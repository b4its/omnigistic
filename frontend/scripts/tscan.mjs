import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";
const B = await chromium.launch(launchOptions());
for (const path of ["/", "/login", "/dashboard/pusat/executive", "/dashboard/kurir/cod-risk"]) {
  const p = await (await B.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto("http://127.0.0.1:3000" + path, { waitUntil: "load" });
  await p.waitForTimeout(1200);
  const stats = await p.evaluate(() => {
    const all = [...document.querySelectorAll("body *")];
    const sizes = {};
    let tiny = 0, tinySamples = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      const fs = Math.round(parseFloat(cs.fontSize) * 10) / 10;
      const txt = (el.textContent || "").trim();
      if (!txt || el.children.length) continue; // leaf only
      sizes[fs] = (sizes[fs] || 0) + 1;
      if (fs < 11.6) { tiny++; if (tinySamples.length < 4) tinySamples.push({ fs, txt: txt.slice(0, 28), tag: el.tagName, ls: cs.letterSpacing }); }
    }
    // clipping check: descender rect vs container
    let clip = null;
    const li = document.querySelector(".line-inner");
    if (li) { const wrap = li.parentElement.getBoundingClientRect(), inner = li.getBoundingClientRect(); clip = { wrapBottom: wrap.bottom, innerBottom: inner.bottom, clipped: inner.bottom > wrap.bottom + 0.5 }; }
    return { tiny, min: Math.min(...Object.keys(sizes).map(Number)), sizes, tinySamples, clip };
  });
  console.log(path, "=> tiny(<11.5px):", stats.tiny, "| min:", stats.min, "| clip-line:", JSON.stringify(stats.clip), "| samples:", JSON.stringify(stats.tinySamples));
  await p.context().close();
}
await B.close();
