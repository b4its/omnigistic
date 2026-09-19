# Design Audit Report — Omnigistic (SvelteKit + FastAPI)

**Tanggal:** 2026-09-08 · post-migrasi Svelte + fase audit-visual & perbaikan
**Stack terdeteksi:** SvelteKit 2 (Svelte 5 runes) · Tailwind v4 `@theme` 50 token · dark mode · Leaflet + ECharts · tanpa component lib (custom) · M3 window-store 600/840
**Metode:** 11 sub-agent (color, typography, layout, component, a11y, interaction, psychology, visual-style, platform, ux-flow, performance-ux) + engine `uiux_audit_run` live (Puppeteer/Playwright) + Docker (FE :3077 / BE :8077)

## Score Card

**Overall: 7.7/10 "Good"** (baseline audit ini: **6.0** → +1.7)

| Dimensi | Sebelum | Sesudah | Δ |
|---|---|---|---|
| Color | 6.5 | 7.5 | +1.0 (token pastel dipakai sbg teks → di-sweep) |
| Typography | 5.5→(font CRITICAL) | 7.0 | **font kini loaded** (Times→Jakarta/Fraunces) |
| Layout | 6.5 | 7.5 | overlay-safe-area, grid 1→sm:2→xl:4, kartu radius |
| Components | 4.75 | 6.5 | XSS escape, ErrorState-parity, Icon fix, MetricCard |
| Accessibility | 5.5 | 8.0 | C1/C2/I1–I6 fixed (lihat bawah) |
| Hierarchy | 6.5 | 7.5 | h1 dedup, CTA single-primary per screen |
| Interaction | 4.5 | 7.0 | route transition {#key}+fade, panel fly, count-up, honest CSV |
| Responsive | 8 | 9.0 | h-dvh, viewport-fit + calc(env()), M3-nav tanpa CLS |
| Polish | 6.5 | 8.5 | grain, favicon, FOUC-guard, marquee sen, active:scale |
| Performance UX | 5.8 | 8.0 | CLS 0.178→0.0003, echarts −48% kB, cache/SWR |
| Information Architecture | 6 | 8.0 | role-sync+cookie-SSR, /dashboard hub, +error, cross-link |
| Platform | 7 | 8.5 | `<title>`, theme-color, skip-link dlm app? |

## Top 20 findings (dengan STATUS)

| # | Temuan (file) | Sev | STATUS |
|---|---|---|---|
| 1 | **ECharts canvas tidak resolve `var(--*)`** → semua chart hitam | critical | ✅ FIXED (resolver var→computed + re-render tema; canvas terracotta terverifikasi px) |
| 2 | **Font family tidak pernah dimuat** → seluruh app Times New Roman | critical | ✅ FIXED (`@fontsource-variable` 4 family, `document.fonts.size=15`) |
| 3 | `text-destructive/success/warning` = token **background** pastel dipakai sbg teks (KPI alert 1.16:1, 12 lokasi) | critical | ✅ SWEEP → `-foreground` |
| 4 | `.leaflet-control-attribution` 3.02:1 | critical | ✅ (sebelumnya) 12:1 |
| 5 | ChatMarkdown `{@html}` unescaped (LLM/DB) = stored XSS | critical | ✅ escape `& < > "` sebelum bold |
| 6 | `lnd-on-ink`/line tidak di-invert di dark panel → teks 1.0–1.3:1 | critical | ✅ flip token + color-mix header |
| 7 | Dobel `h1` (Topbar persona + halaman) | important | ✅ Topbar→p, sr-only `Portal X`; terverifikasi Playwright |
| 8 | Ganti-peran split-brain (Topbar/rail tak ikut navigasi) & sessionStorage tak pernah ditulis | critical flow | ✅ `role` **derived dari path** + persist **cookie** (juga perbaiki CLS) |
| 9 | `/dashboard` blank + back-link loop | important | ✅ hub 4 kartu peran |
| 10 | Tak ada 404 page (`+error.svelte`) | important | ✅ on-brand + 3 tautan |
| 11 | CLS 0.178 (shell nav muncul post-hydration 256px) | important | ✅ **0.0003** (derived role = SSR render langsung) |
| 12 | ECharts full-import 1,094KB (56% aset) | important | ✅ tree-shake `echarts/core` → **568KB** |
| 13 | Overflow "Lainnya" tak bisa Escape/outside-close; rail/expanded tanpa `aria-current` | important | ✅ |
| 14 | Nigi AI: fokus hilang, tanpa Esc, tanpa aria-live, chips 40px, input disabled | important | ✅ focus-mgr + `role=log` + readonly + Esc + min-h-11 |
| 15 | WidgetDrawer: tak focus-in saat buka (aria-modal), pill 30px | important | ✅ sebagian (inert+esc+return ada) |
| 16 | Export CSV & "Nwidget added" = klaim palsu | important (trust) | ✅ CSV nyata (Blob) + pesan jujur |
| 17 | Notif hardcoded 3 milik PUSAT untuk semua peran; angka 92% vs 90,4% | important | ✅ per-role, konsisten |
| 18 | Icon custom: path keluar viewBox (compass/shield), `duotone` no-op | important | ✅ path fix + multi-path `||` |
| 19 | Route hard-cut antar 29 halaman; reveal dead-code (`.rv`) | medium | ✅ `{#key}+fade` 120ms; `.rv` dihapus; `animate-rise` dipakai utk stagger hero |
| 20 | Tak ada `<title>`; favicon 404; FOUC dark; h-screen iOS; dup meta | medium | ✅ semua terpasang (title-map layout, static/favicon.svg, inline script, dvh) |

**Sisa (disiplin sadar, dokumen):** `h1 sr-only` per portal sudah ada tetapi engine masih "multiple h1" (heuristic, live-verified 1); token `--lnd-*` masih duplikan primitif `:root` (alias menyusul); `sm:grid` per breakpoint = desain M3 (engine buta JS-store); count-up baru di MetricCard, RoleOverview sudah ikut via refactor; type-scale token penuh (Minor Third) **belum** — sisa untuk pass polish berikutnya (rugi waktu, tak menghambat demo).

## Laws of UX Coverage

| Law | Violations (post-fix) | Catatan |
|---|---:|---|
| Jakob's Law | 3 | (sebelum 5) popover dismissal & aria-current dibereskan; label short masih di overflow |
| Fitts's | 2 | chips→44, pill drawer 44; beberapa CTA landing ≤44 tetap besar |
| Hick's | 1 | single-CTA overview (hapus duplikat chat) |
| Von Restorff | 1 | CTA chat 1x per layar; spin marquee sen |
| Miller's | 2 | token warna 43 (sebelum 52) & 98 arbitrary size — scale tooling sisa |
| Law of Similarity | 2 | login decorasi warna status → single accent; hijau-baselines → muted |
| Doherty | 0 | SPA nav <400ms (60–164ms) + skeleton |
| Peak-End | 1 | "Asumsi tim" tetap; tip CTA akhir (bukan 3 CTA) |
| Postel / Aesthetic | minor | chrome EN→ID sebagian ("Add widget", "Tanya apa saja" di Nigi AI placeholder sudah ID) |

## Prioritized Action Plan (sisa utk iterasi berikutnya)

**Quick (≤1j):** font token scale Minor Third + hapus `text-[9px]` sisa; alias `--lnd-*→:root`; `aria-expanded` notif; skeleton `+data-table` untuk 6 halaman; ThemeToggle size parity ✔.
**Medium:** ErrorState reusable per 10 halaman (catch → banner retry ala Nigi AI) — sekarang fallback diam. Container-query utk chart-card.
**Major (opsional):** SSE streaming Nigi AI; pre-load 2 font; profil "screenshot-to-issue" ulang utk video deck.

---
*Engine re-run final: 7.9 statik; angka 7.7 = gabungan judgement 11 agent terukur-live. Docker FE/BE ter-rebuild; E2E 41/41; pyright/ruff source green.*
