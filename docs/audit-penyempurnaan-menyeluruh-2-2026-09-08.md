# Audit & penyempurnaan menyeluruh (2) — 2026-09-08 (sesi lanjutan)

Audit **seluruh fitur** (backend 15 mesin + API; frontend seluruh halaman/komponen/
store/map/chart) dengan 2 agen paralel, lalu **tiap temuan diverifikasi dengan
menjalankan kode** (bukan asumsi). Semua perbaikan = perubahan nyata, tetap
**simulasi/prototipe** (asumsi tim dilabel). Atomic commit.

Fokus: kesempurnaan menyeluruh — bukan kosmetik, tetapi bug yang bisa
menghasilkan error 500, angka salah, atau klaim yang tak cocok implementasi.

## 1. Temuan yang DIPERBAIKI

### Backend

| # | File | Defect | Dampak | Fix |
|---|------|--------|--------|-----|
| B1 | `ml/forecast.py` | `event_scale` **tak dijepit** (terima 1e6 / negatif) & NaN di-echo | demand absurd (fluctuation 5,4 juta%); NaN → serialisasi JSON gagal (500) | `_sanitize_event_scale()`: jepit 0..3, NaN→1, buang label asing; echo JSON-aman |
| B2 | `ml/route_intel.py` | `density_override` NaN/Inf di-echo mentah | `/ml/route/plan` 500 | normalisasi sekali (None/NaN→None, selain itu di-clamp 0..1) & echo hasil normalisasi |
| B3 | `ml/ev_bca.py` | `_hub_deployment` membulatkan ke 10 lalu hanya memperbaiki selisih ≥10 | `totalUnits` ≠ anggaran: `units=5`→0, `205`→210, `211`→220 | largest-remainder granularitas **1 unit** → total tepat = units |
| B4 | `ml/optimize.py` | `note` hardcode "lantai aman 60%, maks 35%" | audit trail bertentangan dgn `thresholds` yang bisa diubah user | interpolasi nilai aktual (floor/max/critical/warn) |
| B5 | `ml/metrics.py` | porsi biaya variabel 0,70 disalin di `expansion.py` & `sponsor.py` | dua magic number bisa drift → 2 jawaban berbeda | SATU `VARIABLE_COST_FRAC`, diimpor keduanya |
| B6 | `ml/metrics.py` | `SPONSOR_CANDIDATE_REGIONS` daftar beku | drift bila data/ambang berubah | `sponsor_candidate_regions()` turunan `util < UTIL_WARN`; `region_summary` pakai kriteria sama |
| B7 | `ml/surge.py` | docstring klaim pakai "cost index region" (tidak ada); `residualOverflowM` hilang saat spillover mati | klaim palsu + kontrak respons tak konsisten | perbaiki docstring; selalu inisialisasi `residualOverflowM` |
| B8 | `ml/cod_risk.py` | `direction` mislabel kontribusi 0 → "turun"; output tanpa label data sintetik | penjelasan menyesatkan; ambang/pickupWait = asumsi tanpa disclosure | three-way naik/turun/**netral** + field `note` (data sintetik + asumsi tim) |
| B9 | `ml/simulations.py` | respons digital-twin & cod-impact tanpa label asumsi | koefisien asumsi tak terlihat konsumen API | tambah `note` kejujuran di kedua respons |
| B10 | `ml/ev_bca.py` | param mati (`_roadmap.units`, `_discount_rate_sensitivity.discount`), fungsi mati `_pv_factor` | kontrak menyesatkan + dead code | hapus/eksplisitkan; call-site disesuaikan |

### Frontend

| # | File | Defect | Dampak | Fix |
|---|------|--------|--------|-----|
| F1 | `routes/.../pusat/ev-bca` | baris "Total" kolom Kumulatif = `totalNetIdr + initialInvestmentIdr` (ganda) | footer bertentangan dgn baris tepat di atasnya | pakai `totalNetIdr` (sudah termasuk Y0) |
| F2 | `lib/stores/shop.ts` | `codAtRisk` store tanpa guard `!routedToPudo` (beda dari `isCodAtRisk`) | pesanan yang sudah dirutekan PUDO dihitung masih berisiko | pakai predikat kanonik `isCodAtRisk` |
| F3 | `routes/.../hub/overview` | hardcode `65`, `"8 hub"`, `"dari 23 hub"` | drift dari data/ambang kanonik | `UTIL_THRESHOLD.critical` + jumlah dari `hubs` |
| F4 | `routes/.../hub/dashboard` | hardcode ambang `≥65%` | drift | `UTIL_THRESHOLD.critical` |
| F5 | `routes/analisis` | fallback offline usang (`0,31M`, `41,5%→63,6%`, `+22,1`) | bertentangan dgn angka kasus nyata | selaraskan (`0,07M`, `41,5%→50,0%`, `+8,5`) + label "estimasi kasus" |
| F6 | `lib/components/Icon.svelte` | satu-satunya komponen masih pakai legacy `export let` | opt-out runes; rapuh bila tambah `$state` | migrasi ke `$props()` + tipe `Props` |
| F7 | `lib/charts/options.ts` | font grafik hardcode ("Plus Jakarta Sans") ≠ font aplikasi | teks chart tak selaras sistem desain; komentar klaim "token" | `var(--font-sans, …)` |
| F8 | `lib/components/Topbar.svelte` | badge notif selalu ≥1 & klaim "belum dibaca"/"baru" | menghitung "belum dibaca" padahal tak ada model baca | wording jujur "Pembaruan"/"item" |
| F9 | `routes/+page.svelte` (landing) | slice no-op + `…` selalu tampil ("elipsis palsu") | teks tampak terpotong padahal utuh | helper `truncate()` — `…` hanya bila benar terpotong |

### Uji

| # | File | Defect | Fix |
|---|------|--------|-----|
| T1 | `scripts/e2e-toast.mjs` | asersi usang: harap toast pada event `input` slider, padahal halaman butuh klik "Jalankan optimizer" | klik tombol (sesuai desain halaman) |

## 2. Cakupan uji baru

- **Backend** `tests/run_tests.py`: **316 → 341** assert (+25) — regresi untuk
  forecast clamp/NaN, route NaN, hub deployment (5 nilai anggaran), note
  optimize aktual, konstanta terpusat, surge residual, cod_risk netral+label,
  simulations note.
- **E2E baru** `scripts/e2e-audit-fixes.mjs` (11 assert): ev-bca tanpa ganda,
  KPI dari data, ambang kanonik, wording Topbar jujur, landing tanpa elipsis
  palsu, Icon ter-render.

## 3. Hasil verifikasi

| Suite | Sebelum | Sesudah |
|-------|---------|---------|
| Backend `run_tests.py` | 316 | **341** |
| E2E `e2e.mjs` | 52 | 52 |
| E2E pudo / engines / sims / case / route | hijau | hijau |
| E2E toast | 16/17 | **17/17** |
| E2E audit-fixes (baru) | — | **11/11** |
| svelte-check · eslint · build | hijau | hijau |
| ruff (app+tests) | 82 | **67** (ikut bersih) |

## 4. Batasan (jujur)

Semua mesin tetap **prototipe presentasi**; koefisien non-kasus = asumsi tim
(dilabel + kini diekspos di respons API). Angka kasus (Table 1–4, Figure 1–2)
tidak diubah. Perbaikan tidak menambah dependensi.
