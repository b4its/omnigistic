# Audit & Pengembangan Mesin Analitik — 2026-09-08

## 1. Ringkasan

Penambahan solusi mutakhir untuk 6 pertanyaan strategis studi kasus ISCEA 2026
("Delivering Promises") berbasis **data aktual** dari dokumen, dengan penekanan
pada angka yang dapat ditelusur dan diuji. Semua dijalankan lokal (FE SvelteKit,
BE FastAPI, fallback JSON).

## 2. Perbaikan (Fix)

| # | Temuan | Perbaikan | Verifikasi |
|---|--------|-----------|------------|
| 1 | Forecast: indeks musiman = nilai mentah/mean; proyeksi mulai bulan ke-(i+1)%12 (meleset 1 bulan); tren = konstanta ajaib 1.012; fluktuasi dihitung dari nilai SEBELUM event | Dekomposisi sentris + tren OLS; bulan ke-(i%12); fluktuasi final; tambah backtest MAPE | 12 titik Jan–Des, MAPE in-sample 1,3%, peak Agt, trough Okt (TikTok shock) |
| 2 | Test E2E chat pakai selector stale `Buka/Pesan Nigi AI` (komponen pakai `Nigi Chat`) → FATAL | Samakan selector; tunggu hidrasi + scrollIntoView; `waitFor(visible)` untuk panel ber-transisi | E2E 51/51 PASS (sebelumnya 35/36 + FATAL) |
| 3 | Angka turunan (rasio biaya, agregat region, share EV) tersebar/hardcode di FE | Pusatkan di `ml/metrics.py`, konsumsi via API | 57 assert backend |
| 4 | Konflik nama rune `$derived` vs variabel lokal `derived` di `/analisis` | Rename `derivedMetrics` + `buildQuestions()` | svelte-check 0 error/0 warning |

## 3. Temuan Rekonsiliasi Angka (penting untuk juri)

- **Tabel 4 total e-commerce**: dokumen menulis **641** juta; jumlah baris = **651** juta → **selisih 10 unit pada dokumen kasus**.
- Total demand (1.110 juta) cocok. Sep 98 → Okt 82 (total, −16,3%); e-commerce Sep 57 → Okt 40 (−29,8%, shock TikTok Shop).
- Nilai kanonik = **hasil hitung baris** (row-level truth); selisih dilaporkan apa adanya via `GET /ml/metrics/audit` dan halaman Methodology.

## 4. Fitur Baru (mutakhir)

### 4.1 Network Optimization Engine (`backend/app/ml/optimize.py`)
- Formalisasi pengalihan overflow (kasus Double 12 2022) sebagai masalah transportasi.
- Sumber util > 65% → tujuan util < 50%; kendala headroom, lantai aman 60%, maks 35% dialihkan.
- Solver greedy cheapest-link-first (biaya = indeks relatif antar-region, proxy prototipe).
- Hasil: ~0,31M paket/hari dialihkan; utilisasi timur **41,5% → 63,6%**; konservasi volume diuji (in==out).
- Endpoint: `GET /ml/optimize/load-balance`. Halaman: `/dashboard/hub/load-balance`.

### 4.2 COD Decision Intelligence (`backend/app/ml/cod_intel.py`)
- Dampak COD per shift kurir dari Figure 2 (138 vs 75 mnt / 8 paket / 5,3 km).
- 4 intervensi digital (pre-payment −55%, PUDO −75%, slot −35%, clustering −20%); pemangkasan pakai max (konservatif).
- Hasil (40 paket, 60% COD, semua intervensi): shift 564 → 422 mnt; hemat 142 mnt; +13,4 paket; kapasitas +33,5%.
- Endpoint: `POST /ml/cod-intel`, `GET /ml/cod-intel/scenarios`. Halaman: `/dashboard/kurir/cod-intel`.

### 4.3 Metrik & Audit (`backend/app/ml/metrics.py`)
- `GET /ml/metrics/{regions,financial,demand,fleet,audit}` — semua turunan + checklist telusur.

### 4.4 UI
- Halaman Load Balancing: optimizer nyata (KPI, grafik sebelum/sesudah, tabel 23 hub).
- Halaman COD Intelligence: simulator interaktif (slider porsi COD & paket, checkbox intervensi).
- Methodology: seksi Audit & Rekonsiliasi Angka (checklist + agregat region + temuan).
- `/analisis`: seksi **Enam Pertanyaan Strategis** — verdict + bukti live + deep-link.
- Executive Dashboard: strip "Mesin Analitik" (4 tautan kapabilitas).

## 5. Pengujian

| Suite | Cakupan | Hasil |
|-------|---------|-------|
| `backend/tests/run_tests.py` | 21 endpoint, ML lama+baru, chat, OWASP, invarian angka, konservasi volume | **57/57 PASS** |
| `frontend/scripts/e2e.mjs` | landing, 20+ halaman, optimizer, COD-intel, audit, 6 pertanyaan, chat POST, mobile M3 | **51/51 PASS** |
| `svelte-check` | seluruh frontend | **0 error, 0 warning** |
| `ruff` | file baru/ubah | **bersih** (baseline repo 56 → 13 error tersisa di file pra-ada) |

## 6. Batasan (jujur, berlabel)

- Biaya relatif antar-region, upah kurir, CO₂ idle, porsi pemangkasan intervensi = **asumsi tim** (tidak ada di dokumen), selalu dilabel.
- Model tetap **prototipe presentasi**, bukan sistem produksi.
- Angka rekonsiliasi mencerminkan dokumen kasus; tidak diubah agar tetap dapat diaudit.

## 7. Commit (atomic)

Lihat `git log --oneline` — 12 commit atomik: fix forecast, feat metrics/optimize/cod-intel,
feat endpoints+tests, feat 3 halaman FE, feat analisis 6 pertanyaan, test e2e, docs.
