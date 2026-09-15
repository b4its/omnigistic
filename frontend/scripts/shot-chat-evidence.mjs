import { chromium } from "playwright-core";
import { launchOptions } from "./_browser.mjs";
const BASE="http://127.0.0.1:3104";
const b=await chromium.launch(launchOptions());
const c=await b.newContext({viewport:{width:1440,height:900}});
const p=await c.newPage();
p.on("pageerror",(e)=>console.log("PE",String(e.message).slice(0,80))); 
// 1) Navigate: go kurir overview (has role + chat FAB + chat fetch)
await p.goto(BASE+"/dashboard/kurir/cod-risk",{waitUntil:"load",timeout:20000}); await p.waitForTimeout(2800);
await p.screenshot({path:"images/v7f-cod-risk.png"});
const fab=p.locator('button[aria-label="Buka Nigi AI"]').first(); if(await fab.isVisible()) await fab.click();
await p.waitForTimeout(600);
const inSel='input[aria-label="Pesan untuk Nigi AI"]';
try{ await p.waitForSelector(inSel,{state:"visible",timeout:5000}); await p.fill(inSel,"kenapa COD lebih lambat"); await p.keyboard.press("Enter"); await p.waitForTimeout(2200); console.log("CHAT OK");}catch(e){console.log("CHAT FAIL",String(e).slice(0,70));}
await p.screenshot({path:"images/v7f-chat-kurir.png"});
// 3) expanded drawer nav & topbar
await p.setViewportSize({width:1440,height:900}); await p.goto(BASE+"/dashboard/data/overview",{waitUntil:"load",timeout:15000}); await p.waitForTimeout(2000); await p.screenshot({path:"images/v7f-data-overview.png"});
// 2) map anim
await p.goto(BASE+"/dashboard/data/address",{waitUntil:"load",timeout:20000}); await p.waitForTimeout(5200); await p.screenshot({path:"images/v7f-address-mid.png"});
// 4) ROI
await p.goto(BASE+"/dashboard/pusat/roi",{waitUntil:"load",timeout:18000}); await p.waitForTimeout(2000); await p.screenshot({path:"images/v7f-roi.png"});
await b.close(); console.log("screenshots: "+["v7f-cod-risk","v7f-chat-kurir","v7f-data-overview","v7f-address-mid","v7f-roi"].join(","));
