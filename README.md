# Omnigistic — SvelteKit + FastAPI (Local-only)

**ISCEA Global Case Competition 2026** — proposed "Delivering Promises" solution (GC Logistics).
This is a **full 1:1 migration** from Next.js → **SvelteKit 2 (full-stack server adapter-node) + FastAPI (Python 3.14 + ML)**.

**No deploy.** Everything runs at `localhost` for recording a **≤15-minute video** submission (judges only see video, not the server). The frontend + backend + optional Postgres all work offline; API falls back to `data-kas.json` if Postgres/Neon is unreachable.

---

## What runs locally

| Service | Command | URL |
|---|---|---|
| FastAPI backend | `cd backend && .venv/bin/uvicorn app.main:app --port 8000` | http://127.0.0.1:8000 |
| Swagger "API evidence" | (same process, open docs) | **http://127.0.0.1:8000/docs** |
| SvelteKit frontend node build | `cd frontend && node build/index.js` (env `PORT=3102`) | http://127.0.0.1:3102 |

First time / on changes: `cd frontend && npm run build` (uses vite).

---

## Cara pakai Docker (paling enak — 2 container, tinggal up)

**Default `docker compose up -d` = mode DEV + HOT RELOAD.** Source di-bind-mount dari host:
edit file di `frontend/src` atau `backend/app` → browser/API reload otomatis tanpa rebuild.

```bash
# 1) Tanpa DB sama sekali (mode default — fallback JSON). Browser buka port host.
docker compose up -d
# FE: http://127.0.0.1:3000 (vite dev + HMR)   API: http://127.0.0.1:8000 (uvicorn --reload)
# Swagger/bukti: http://127.0.0.1:8000/docs

# 2) Postgres LOKAL + backend benar2 pakai DB (profile db):
docker compose --profile db up -d --build
#   → db(:5433) + db-seed jalan, backend SKIP_DB=0 connected; chat/qa dari baris DB.
#   Tanpa profile ini default = SKIP_DB=1 (semua /api dari shared/data-kas.json — nol dependensi, paling aman utk demo).

# 3) Neon asli (bukan lokal):
SKIP_DB=0 DATABASE_URL="postgres://user:pass@ep-xxx.aws.neon.tech/db?sslmode=require" docker compose up -d
# auto init table.

# 4) PROD (image build, tanpa bind mount):
docker compose --profile prod up -d --build

# Hentikan + bersihin:
docker compose down -v     # (-v = hapus volume db + data)
```

**API base buat browser** = `PUBLIC_API_BASE_URL` (default `http://127.0.0.1:8000`) supaya client-side fetch ke container backend via port host. Untuk akses dari jaringan lain, ubah `PUBLIC_API_BASE_URL` → `docker compose up -d` (dev) atau `docker compose --profile prod up -d --build` (prod).

| File | Untuk apa |
|---|---|
| `docker-compose.yml` | default `backend`+`frontend` **dev (hot reload)**; profile `prod` utk image produksi; profile `db` utk postgres+seeder |
| `backend/Dockerfile.dev` | python:3.12-slim + deps; `uvicorn --reload` (bind-mount `backend/app`) |
| `backend/Dockerfile` | python:3.12-slim multi-stage (deps→runtime slim) — **prod** |
| `frontend/Dockerfile.dev` | node:22-slim + `npm ci`; `vite dev` (bind-mount `frontend`, node_modules dari image) — **dev** |
| `frontend/Dockerfile` | node:22-slim multi-stage (`npm ci`→`vite build`→run `build/index.js`) — **prod** |
| `.dockerignore` | context = repo root; exclude Next lama/venv/build agar image ramping |

## Cara pakai lokal klasik (tanpa Docker, sama seperti sebelumnya)

| Service | Command | URL |
|---|---|---|
| FastAPI backend | `cd backend && SKIP_DB=1 .venv/bin/uvicorn app.main:app --port 8000` | http://127.0.0.1:8000 |
| SvelteKit frontend node build | `cd frontend && npm run build && PORT=3102 HOST=127.0.0.1 node build/index.js` | http://127.0.0.1:3102 |

First time / on changes: `cd frontend && npm run build` (uses vite).

## Project structure (monorepo)

```
omnigistic/
├── shared/data-kas.json         ← Single source of truth (48 QA · 41 suggested · 23 hub · 6 root-causes)
├── backend/                     ← FastAPI (Python 3.14), uvicorn app.main:app:8000
│   ├── app/
│   │   ├── main.py              ← FastAPI + Swagger /docs
│   │   ├── api/                 ← /api (chat, qa, insights, data, ml-routes)
│   │   ├── ml/                  ← forecast.py (musiman+tren OLS), cod_risk.py (sklearn), address_parse.py (rapidfuzz),
│   │   │                          optimize.py (Network Optimization Engine), cod_intel.py (COD per-shift), metrics.py (turunan+rekonsiliasi)
│   │   ├── security/            ← OWASP-aligned guard/port, port formatter.ts (scrub AI), port quota.ts, prompts (anonim)
│   │   └── db/                  ← loader.py + seed.py + SQLModel (opsional — fallback JSON)
│   ├── tests/run_tests.py       ← harness uji backend tanpa pytest (217 assert, TestClient)
│   └── requirements.txt
├── frontend/                    ← SvelteKit 2 (Svelte 5 runes), adapter-node
│   ├── src/
│   │   ├── app.css              ← Tailwind v4 + token sistem "Bitcoin DeFi" (dark+light, glow/grid/glass)
│   │   ├── routes/              ← landing, login/**; dashboard (M3+role), 13+3 halaman + 3 shared
│   │   └── lib/                 ← components (M3Nav, nigi-ai, role, drawer, chat, map), stores, charts (ECharts), api
│   │   ├── lib/map/             ← Leaflet AddressMap (offline-tile fallback, kurir-animated)
│   │   └── lib/charts/options.ts ← token-aware ECharts helpers
│   └── tsconfig, svelte.config, vite
├── docs/                        ← audit laporan (angka + audit codebase 2026-09-08)
├── scripts/                     ← harness lokal: e2e.mjs, shot-audit/chat-evidence, redteam, ai-security-test
├── docker-compose.yml + .dockerignore   ← dev container lokal (fe :3000, be :8000, profil db opsional)
└── .gitignore                   ← + venv, node_modules, build, __pycache__
```

## Architecture

- **Data flow**: `shared/data-kas.json` → FastAPI `/api/*` + `/ml/*` (read-only JSON fallback, if Neon up, seed) → SvelteKit `onMount` `fetch(API_BASE)/data-kas.json`
- **Nigi AI (AI)**: LLM via env `AI_API_{BASE_URL,KEY,MODEL}`; tanpa key → fallback (54 QA/insights) → non-crash
- **ML (3 model dasar)**: forecast (seasonal-index sentris + tren OLS + event-flags, backtest MAPE ~1,3%), COD-risk (sklearn LogisticRegression + data sintetik), address-parse (rapidfuzz fuzzy); label "prototipe presentasi". `/ml/sim/digital-twin` + `cod-impact` ported from TS.
- **Mesin analitik baru** (semua punya **kontrol interaktif** — bukan preset statis):
  - `GET|POST /ml/optimize/load-balance` — Network Optimization Engine (transportation heuristic greedy cheapest-link-first): alihkan overflow hub >65% ke hub <50% dengan kendala headroom, lantai aman 60%, maks 35%. **POST** menerima `critical`/`safe_floor`/`max_divert_frac` → pengguna menggeser ambang & rencana dihitung ulang. Output: moves, util sebelum/sesudah per hub, agregat timur.
  - `POST /ml/cod-intel` + `GET /ml/cod-intel/scenarios` — COD Decision Intelligence: dampak per-shift kurir dari Figure 2 (138 vs 75 mnt), 4 intervensi digital, hemat menit/paket/rupiah/CO₂. Slider porsi COD & paket + checkbox intervensi.
  - `GET|POST /ml/forecast` — Demand forecast (seasonal-index sentris + tren OLS + event-flags). **POST** menerima `horizon` + `event_scale` → simulasi "bagaimana jika" (matikan/perkuat Harbolnas atau shock TikTok).
  - `GET /ml/metrics/{regions,financial,demand,fleet,audit}` — metrik turunan + rekonsiliasi (temuan dokumen: e-commerce Tabel 4 tertulis 641 vs hasil jumlah baris 651).
  - `GET|POST /ml/sponsor/compare` + `GET /ml/sponsor/sensitivity` — **Direct-vs-Sponsor Comparator** (Pertanyaan 1): unit cost nasional dari Tabel 3 & 4 (Rp89.676/paket), model Direct vs Sponsor per region (capex exposure, laba HQ, skor kontrol), parameter ekuitas/biaya interaktif + uji sensitivitas.
  - `GET|POST /ml/modalshift/optimize` + `GET /ml/modalshift/levers` — **Modal-Shift & Cost-Lever Optimizer** (Pertanyaan 6): pilih moda (darat/laut/udara) per 11 koridor dengan objektif berbobot (biaya/emisi/SLA), hemat ~16,7% biaya & ~18,4% emisi; portofolio 6 tuas pengurangan biaya + dampak sustainability.
- **Mesin solusi tantangan kasus (baru)** — semua berbasis data kasus Table 1–4/Figure 1–2:
  - `GET|POST /ml/sim/surge` — **Peak-Surge Stress-Test** (Pertanyaan 2): beban puncak (amplifikasi ×basis harian 3,04jt) didistribusi per pangsa beban hub → breach, spillover ke hub headroom, backlog & waktu pemulihan. Puncak musiman 1,15× → 1 hub breach (persis "Jakarta 1 overload"); Double 12 3× → 21 hub.
  - `POST /ml/cod-cash/risk` + `GET /ml/cod-cash/scenarios` — **COD Cash-Reconciliation Risk** (Pertanyaan 3): uang kas beredar, laju human-error, biaya selisih, waktu rekonsiliasi; 4 intervensi digital → risiko turun ~80%.
  - `GET|POST /ml/expansion/roi` — **Market-Expansion ROI** (Pertanyaan 5): kelayakan ekspansi per 23 hub (headroom × tarikan permintaan × unit-economics Table 3); ROI & payback portofolio.
  - `GET /ml/pnl/waterfall` — **Unified Cost-Waterfall & P&L** (Pertanyaan 6): 7 tuas biaya disatukan → waterfall 99,54T → 90,9T (hemat 8,7%), cost-to-sales 31,3%→28,6%, EBIT proxy +4%.
  - `GET|POST /ml/route/plan` — **Route Intelligence** (navigasi kurir, Pertanyaan 2/3): kandidat jalur (arteri/tol/alternatif) dgn profil kepadatan berbeda; waktu tempuh memakai kurva BPR (`delay ∝ a·(v/c)^b`) → jalur tercepat & jalur terefisien (skor waktu 55% + biaya 20% + emisi 15% + keandalan 10%). POST menerima `distance_km`/`density_override`/`base_speed_kmh`.
- **Halaman simulasi interaktif** (menggerakkan angka nyata, bukan label kosong):
  - `/dashboard/hub/surge` — **Peak-Surge Stress-Test** (Q2): slider amplifikasi puncak & kapasitas elastis + preset (Musiman/Festival/Double 12) → breach, spillover, pemulihan.
  - `/dashboard/kurir/cod-cash` — **COD Cash-Reconciliation Risk** (Q3): slider porsi COD + 4 intervensi digital → risiko & penghematan kas.
  - `/dashboard/pusat/expansion` — **Market-Expansion ROI** (Q5): slider capex & target util → prioritas, ROI, payback 23 hub.
  - `/dashboard/pusat/pnl` — **Cost-Waterfall & P&L** (Q6): toggle sustainability → waterfall 7 tuas & dampak margin.
  - `/dashboard/kurir/tasks` & `/dashboard/kurir/pudo` — **Route Intelligence** (navigasi): peta menampilkan 3 kandidat jalur berwarna sesuai kepadatan; slider kepadatan (jam sibuk) + pemilih jalur (badge tercepat/efisien) → waktu tempuh, biaya, emisi, & skor dihitung ulang.
  - `/dashboard/hub/capacity` — level permintaan (Lembah/Normal/Puncak) men-skala volume → jumlah hub menembus ambang & overflow dihitung ulang.
  - `/dashboard/hub/load-balance` — 3 slider ambang (kritis/lantai/maks porsi) → POST & rencana ulang.
  - `/dashboard/hub/forecast` — 3 slider kekuatan event → proyeksi & fluktuasi ulang.
  - `/dashboard/pusat/roi` — 4 slider tuas (COD/EV/BBM/komplain) → ROI, capex, payback real-time.
  - `/dashboard/data/fleet` — slider adopsi EV → bauran armada & penurunan emisi (faktor = asumsi tim, dilabel).
  - `/dashboard/data/address` — input alamat bebas → fuzzy-match 3 kandidat + ETA.
  - `/dashboard/data/multimodal`, `/dashboard/pusat/digital-twin`, `/dashboard/kurir/cod-intel`, `/dashboard/data/complaint`, `/dashboard/data/ev-sites` — sudah interaktif sebelumnya.
- **Material 3 + sidebar kolaps**: bottom Navigation Bar (compact <600px) / Navigation Rail (medium 600–840px) / Sidebar penuh (expanded ≥840px). Sidebar bisa **dibuka/ditutup** (w-64 ⇄ rail ikon w-22) lewat tombol di header sidebar, hamburger di Topbar, atau pintasan **Ctrl/Cmd+B**; preferensi dipersist ke localStorage. Responsif penuh 320px–ultrawide, 0 overflow horizontal.
- **Map**: Leaflet + 3 kandidat ambigu, path animasi + ETA menit ("Jl. Raya Jakarta-Bogor No.12") dengan Nigi AI saran. **Legenda peta lengkap & rinci** (collapsible) di 3 peta (DeliveryMap/AddressMap/HubMap): penanda, garis rute, warna jalur (kepadatan), sumber data. **Sebaran 33 titik PUDO mitra ber-koordinat & alamat NYATA di 6 region** dari OpenStreetMap (Indomaret terdekat per kota, data © OSM/ODbL) — di-*warna per region* + ringkasan sebaran di legenda HubMap + Route Intelligence (lihat atas). Popup PUDO menampilkan alamat, region, jam, kapasitas & sumber koordinat.
- **Alur pesanan lintas-peran (simulasi localStorage)**: Customer checkout → Kurir kelola (status: dikemas→dijemput→transit→**dalam pengantaran**→terkirim), slot, tunai COD, PUDO → Customer lacak. Saat **dalam pengantaran**: **pembeli memberi tahu kurir apakah ia di rumah/tidak** (pemberitahuan sebelum kurir tiba) & **kurir mencatat status kehadiran** saat tiba — saling terlihat (mencegah kurir menunggu tanpa kepastian, akar masalah COD kasus).

## Sistem Desain — "Bitcoin DeFi"

Seluruh UI memakai satu sistem desain yang **dipusatkan di token** (`frontend/src/app.css`),
dengan **dua tema lengkap** (terang + gelap) lewat toggle.

- **Palet (gelap)**: True Void `#030304` · Bitcoin Orange `#F7931A` · Burnt Orange `#EA580C` · Digital Gold `#FFD600` · Stardust `#94A3B8`; border ultra-tipis `rgba(255,255,255,.1)`; bayangan **berwarna** (orange/gold), bukan hitam. Terang = permukaan hampir putih + aksen orange/gold yang sama (toggle tetap bermakna).
- **Tipografi**: Space Grotesk (heading) · Inter (body) · JetBrains Mono (data/label teknis, uppercase).
- **Utility khas** (`app.css`): `glow-orange`/`glow-gold`, `glass`, `bg-grid`/`bg-grid-sm`, `text-gradient`, `ambient-glow`, `animate-float`/`animate-pulse-glow`, `spin-slow`, `btn-primary`.
- **Komponen reusable** (`lib/components/ui/`): `Button` (primary/gold/outline/ghost/link), `Card` (solid/glass/outline), `Input` (border-b menyala) — memakai `cn()` + `$props()` mengikuti pola repo, **tanpa dependensi baru**.
- **Ikon**: `Icon.svelte` internal (36+ ikon berbasis nama, stroke teknis) — **tanpa emoji** di seluruh UI.
- **Tekstur void global**: satu layer grid blockchain + ambient glow di `dashboard/+layout` sehingga seluruh halaman mewarisi estetika tanpa duplikasi.
- **Tema**: toggle pill sun/moon (`ThemeToggle`) — set/restore via `localStorage` + `prefers-color-scheme`, anti-flash di `app.html`; `prefers-reduced-motion` dihormati.

## Env (backend/.env or .env.local di repo root, di-ignore)

```
DATABASE_URL=postgresql://user:pass@... (Neon, optional)
AI_API_BASE_URL=https://api.provider/v1
AI_API_KEY=...
AI_MODEL=omnigistic-model
```

## Verifikasi angka → studi kasus

- Table 1 (23 hub), Table 2 (network), Table 3 (expenses), Table 4 (demand), Figure 2 (COD), Figure 1 (alamat), 6 akar 13 gejala + KPI, QA: **100% identik**.
- **Fixes**: Sumatra region average **53,2%** (computed, bukan hardcoded 54,5), label KPI DB (bukan duplikat target), **14.180 basis / 1,41%** konsisten, QA +suggested (PUDO/EV/ROI).
- **Temuan rekonsiliasi**: total e-commerce Tabel 4 pada dokumen tertulis **641** juta, tetapi baris dijumlahkan = **651** juta (selisih 10). Nilai kanonik = hitung baris; selisih dilaporkan via `/ml/metrics/audit` dan halaman Methodology. Total demand (1.110 juta) cocok.
- Semua angka turunan kini dihitung oleh `backend/app/ml/metrics.py` (bukan hardcode FE) → satu sumber kebenaran.

## Testing

```bash
# Backend (217 assert, tanpa pytest)
cd backend && SKIP_DB=1 .venv/bin/python tests/run_tests.py

# Frontend E2E (52 assert; butuh backend :8000 + frontend dev :3000)
cd frontend
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 E2E_API=http://127.0.0.1:8000 node scripts/e2e.mjs

# Uji sidebar (15) + audit overflow responsif (8 viewport)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium node scripts/e2e-sidebar.mjs
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium SHOT_PATH=/dashboard/pusat/executive node scripts/responsive-shot.mjs

# Uji accordion pesanan customer (15) + koherensi lintas role (31)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-customer-accordion.mjs
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-orders.mjs

# Uji pemberitahuan kehadiran penerima dua arah saat dalam pengantaran (12)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-arrival.mjs

# Uji mesin analitik interaktif (18) + widget dashboard (9)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-engines.mjs
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-widgets.mjs

# Uji halaman simulasi interaktif — capacity/load-balance/forecast/roi/fleet/address (36)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-sims.mjs

# Uji solusi tantangan kasus — surge/cod-cash/expansion/pnl (25)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-case.mjs

# Uji Route Intelligence — jalur tercepat kurir (kepadatan + efisiensi) (9)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-route.mjs

# Uji PUDO & legenda peta — koordinat asli + sebaran per-region (23)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-pudo.mjs

# Uji peta lengkap halaman tugas pengantaran kurir (auto-buka + toggle + marker) (13)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-tasks-map.mjs

# Uji konsistensi triase COD lintas halaman kurir (predikat & ambang tunggal) (13)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-cod-triage.mjs

# Uji peta modal layar-penuh + legenda collapsible (open/close) (15)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-map-modal.mjs

# Uji state error saat backend offline — 8 halaman (8)
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium E2E_BASE=http://127.0.0.1:3000 node scripts/e2e-offline.mjs
```

Laporan audit detail: `docs/angka-audit-2026-09-07.md`, `docs/audit-penutupan-celah-2026-09-08.md`.