# Audit Codebase Omnigistic (SvelteKit + FastAPI) — 2026-09-08

**Stack terdeteksi:** SvelteKit 2 / Svelte 5 runes · Tailwind v4 theme (50 token) · dark mode · Leaflet · ECharts · FastAPI + SQLModel + psycopg3 · ML (sklearn/statsmodels/rapidfuzz)
**Metode:** skill `design-audit` + engine `uiux_audit_run` + MCP `gt_audit` (source-only, tanpa artefak build) + verifikasi Playwright.
**Skor engine:** **8.1/10 "Strong"** — terendah: flows 5.0, typography 6.0, components 6.5, hierarchy 7.0.

## Temuan → status

### ✅ FIX NYATA (diterapkan + diverifikasi)

| # | Temuan | Sumber | Fix | Verifikasi |
|---|---|---|---|---|
| 1 | Kontras `.leaflet-control-attribution` **#fff di atas bg translucid = 3.02:1** | engine (located, confirmed) | `rgba(23,20,15,.82)` + `#eee6d8`, link `#ffd9c4` (≈12:1) | audit-address.png |
| 2 | **Dobel h1 per halaman dashboard** (Topbar `<h1>` persona + `<h1>` halaman) | engine hierarchy + gt | Topbar `<h1>`→`<p>`; RoleOverview +`<h1 class="sr-only">Portal {role}…`; executive +h1 visual | `main h1=1, header h1=0` (Playwright) |
| 3 | `document.querySelector("[data-topbar]")` — anti-idiom komponen | gt_audit HIGH | Svelte `bind:this={headerEl}` | svelte-check 0 err |
| 4 | `any` type di halaman address | gt_audit HIGH | interface `Cand` tertipe | svelte-check 0 err |
| 5 | `print()` di seed.py & main.py | gt_audit MEDIUM | `logging` (level INFO + formatter, `log.warning` utk DB-skip) | uvicorn boot ok |
| 6 | **CORS `allow_origins=["*"]` hardcode** | gt_audit MEDIUM (security) | default = daftar origin localhost dev; override `CORS_ORIGINS` env | boot test 200 |
| 7 | Tidak ada safety-net exception (24 handler tanpa try/catch) | gt_audit MEDIUM (api) | `@app.exception_handler` global → log + JSON 500 terstruktur, stack tak bocor ke client | e2e hijau |

### ⚪ FALSE-POSITIVE engine/audit (didokumentasikan, tak diubah)

| Temuan | Alasan FP |
|---|---|
| **CRITICAL eval/exec** `qa.py:39`, `seed.py:26` | itu `session.exec(select(...))` — **API resmi SQLModel/SQLAlchemy**, bukan builtin `exec()`. Argumen = objek `select()` tertipe, nol jalur input user. |
| "No responsive breakpoints" | responsif Svelte app ini pakai **M3 store JS** (`window-class.ts` 600/840) + class arbitrari (`min-[400px]`, `sm:`) — engine scan hanya CSS literal. Playwright 390px membuktikan navbar compact + tanpa overflow. |
| "No skip link" `hasSkipLink:false` | skip-link **ada**: `sr-only focus:not-sr-only` di `+page.svelte` (landing) & dashboard layout — engine cuma baca `app.html`. |
| `lang` HTML tidak diset | ada: `app.html` `lang="id"`. |
| "0.72px body text" | itu `0.72rem` (= 11.5px, utility `hub-label` utk label kecil) — mis-konversi unit. 10px pada eyebrow microcopy sadar; kontras pasangan token sudah ≥4.5 saat audit Next (lihat laporan Next). |
| "44 warna, tidak ada skala tipografi, cva/shadcn absent, icon lib absent" | heuristik **React/shadcn-spesifik**: Svelte pakai komponen `.svelte` custom + `Icon.svelte` internal; design tokens 50 via `@theme`; konsistensi dijaga via `cn()+class` & snippet. Bukan temuan. |
| "no zod/yup form validation" | satu-satunya form = chat input + search widget (client-side guard `trim/empty` cukup; OWASP guard ada di server). |
| console.log / barrel / sync-fs HIGH | semua di **`.svelte-kit/` & `build/` artefak generat** — dikecualikan dari audit (sudah saya exclude dengan run `gt_audit` per path sumber). |
| Toast reduced-motion | sudah ter-cover global `@media (prefers-reduced-motion)` di app.css. |

### 🧊 DITERIMA SEBAGAI CATATAN (tidak diubah — tradeoff sadar)

- `flows 5/10`: tidak ada *onboarding*/empty-state khusus & `z.error` UI page SvelteKit (`+error.svelte`) — untuk demo kompetisi 23-route, skeleton loading sudah ada; error boundary SvelteKit bawaan muncul when crash. **Rencana**: tambah `+error.svelte` akbar 1 file kalau ada waktu setelah gladi.
- Landing `text-[10px]` & `text-[9px]` micro-chip — sengaja (gaya editorial microcopy), tidak menanggung info wajib.
- `api/index.ts` = modul tunggal, bukan barrel (re-export per simbol ke 20 endpoint) — tree-shake tidak relevan (bundle kecil).

## Impact ke E2E

Setelah fix, `scripts/e2e.mjs` tetap **41/41 PASS** (landing, chat POST→API, OWASP hard-block, map, M3 compact). `npm run build` hijau; `svelte-check` 344 file **0 error** (5 warning inisial-prop = desain sadar). Ruff `--select E741,F821,F841,F401,E401` hijau; `docker compose config` valid.

## Kesimpulan

- Keamanan/standard backend: ** naik kelas** — logging, CORS eksplisit, global handler.
- Aksesibilitas: **dua fix nyata** (kontras atribusi peta + hierarki h1) — relevan buat WCAG & eye juri.
- Selebihnya heuristik mesin; keputusan sadar terdokumentasi = **codebase siap-demo**.
