# Solusi Mutakhir 6 Tantangan Kasus ISCEA 2026 (2026-09-08)

Analisis menyeluruh atas `studycase/studycase.pdf` (8 halaman), `studycase.txt`
(406 baris), dan 11 gambar. Solusi dibangun **berbasis data aktual kasus**
(Table 1–4, Figure 1–2) dan berjalan sebagai simulasi/prototipe (asumsi tim dilabel).

## 1. Data kasus yang dipakai (terverifikasi dari PDF)

| Sumber | Isi | Dipakai oleh |
|--------|-----|--------------|
| Table 1 | 23 hub (kapasitas M/hari, utilisasi, outlets) | surge, optimize, expansion |
| Table 2 | Pertumbuhan jaringan 2020→2023 | metrics, network |
| Table 3 | Fulfilment/Shipping/Net Sales 2020–2023 | sponsor, pnl, expansion |
| Table 4 | Demand bulanan 2023 (1.110jt; e-commerce 641jt tertulis) | forecast, surge, cod-cash, expansion |
| Figure 1 | 3 alamat ambigu (Cibinong/Sukamaju/Rempoa) | address-parse |
| Figure 2 | COD 138 mnt vs non-COD 75 mnt / 8 pkt / 5,3 km | cod-intel, simulations |
| Narasi | Double 12 2022 "Jakarta 1 overload", puncak >3jt/hari, komplain 5,5/juta | surge, metrics |

## 2. Empat mesin solusi baru (semua berbasis data kasus)

### Q2 — Peak-Surge Stress-Test (`ml/surge.py`)
Memodelkan fluktuasi demand dramatis: beban puncak (basis harian 3,04jt ×
amplifikasi) didistribusi per **pangsa beban normal** hub (kapasitas×utilisasi),
sehingga hub padat menyerap surge terbesar. Hasil:
- **Musiman 1,15×** (puncak bulanan Table 4) → **1 hub breach** = persis peristiwa
  "Jakarta 1 overload" Double 12 2022.
- **Festival 2×** → 13 hub breach; **Double 12 3×** → 21 hub breach, backlog 3,9 hari.
- Spillover greedy ke hub headroom (Jayapura/Ambon). Endpoint `GET|POST /ml/sim/surge`.

### Q3 — COD Cash-Reconciliation Risk (`ml/cod_cash.py`)
Kasus: proses kas COD "complex, time-consuming, prone to human error". Engine
menghitung: uang kas beredar (Rp391T/hari pada 45% COD), 16.421 selisih/hari
(1,2% error), biaya selisih Rp410M/hari. 4 intervensi digital:
- Rekonsiliasi otomatis, settlement e-wallet, escrow/pre-pay, batas kas kurir.
- Paket lengkap → **risiko turun 80%**, hemat Rp328M/hari + 20.527 jam rekonsiliasi/hari.
- Endpoint `POST /ml/cod-cash/risk` + `GET /ml/cod-cash/scenarios`.

### Q5 — Market-Expansion ROI (`ml/expansion.py`)
Menjawab "apakah ekspansi menguntungkan?": headroom kapasitas × tarikan permintaan
(outlets×utilisasi) × unit-economics Table 3. Hasil:
- **11 hub prioritas** (Medan, Palembang, Pekanbaru, Denpasar...) — Sumatra/Bali
  ber-headroom + permintaan sehat. Java (Jakarta 90,4%) justru **perlu tambah kapasitas**.
- ROI portofolio & payback dari margin kontribusi (Rp58,9k/paket). Endpoint `GET|POST /ml/expansion/roi`.

### Q6 — Unified Cost-Waterfall & P&L (`ml/pnl.py`)
Menyatukan 7 tuas biaya (modal shift, COD digital, address, load-balance, EV,
kemasan, konsolidasi line-haul) → waterfall dari Table 3:
- Biaya **99,54T → 90,9T** (hemat **8,7%** = Rp8,64T), cost-to-sales **31,3% → 28,6%**,
  EBIT proxy **+4%** tanpa menurunkan revenue. Endpoint `GET /ml/pnl/waterfall`.

## 3. Halaman frontend (sistem desain Bitcoin DeFi)

| Halaman | Peran | Interaksi |
|---------|-------|-----------|
| `/dashboard/hub/surge` | HUB | slider amplifikasi + preset, tabel 23 hub, grafik util, spillover |
| `/dashboard/kurir/cod-cash` | KURIR | slider porsi COD + 4 checkbox intervensi, grafik risiko |
| `/dashboard/pusat/expansion` | PUSAT | slider capex & target util, ranking 23 hub, grafik ROI |
| `/dashboard/pusat/pnl` | PUSAT | toggle sustainability, waterfall 7 tuas, tabel |

## 4. Perbaikan & pembersihan

- **API mati dihapus**: wrapper `digitalTwin`/`codImpact` tak dipakai UI (halaman
  Digital Twin memakai komparator `sponsor.py`) → hilangkan risiko dua implementasi.
- **E2E baru** `scripts/e2e-case.mjs` (25 assert): membuktikan interaktivitas nyata
  (surge 1→21 breach, expansion 111→274jt, pnl 7→5 tuas).

## 5. Pengujian

| Suite | Hasil |
|-------|-------|
| Backend `run_tests.py` | **166/166** (dari 138; +28) |
| E2E case solutions (baru) | **25/25** |
| E2E utama / engines / sims / widgets | 52 / 18 / 36 / 9 |
| E2E sidebar / orders / accordion / offline | 15 / 31 / 15 / 8 |
| `svelte-check` · `npm run build` | 0 error · sukses |

## 6. Batasan (jujur, berlabel)

- Koefisien non-kasus (amplifikasi puncak, laju error kas, capex ekspansi, porsi
  tuas) = **asumsi tim**, dilabel di UI & endpoint.
- Angka kasus (Table 1–4, Figure 1–2) tak diubah; rekonsiliasi (e-commerce 641
  tertulis vs 651 baris) tetap dilaporkan di `/ml/metrics/audit`.
- Semua tetap **prototipe presentasi**, bukan sistem produksi.
