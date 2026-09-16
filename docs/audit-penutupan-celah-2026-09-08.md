# Audit Penutupan Celah Analitik — 2026-09-08 (sesi lanjutan)

## 1. Latar

Setelah audit cakupan 6 tantangan ISCEA 2026, ditemukan celah nyata (bukan
duplikasi): sebagian analisis masih berupa kartu preset/magic number atau
diklaim tetapi belum dibangun. Sesi ini menutup celah dengan **mesin nyata
berbasis data kasus**.

## 2. Celah yang Ditutup

| # | Tantangan | Sebelum | Sesudah |
|---|-----------|---------|---------|
| 1 | Direct vs Regional Sponsor | Kartu preset, magic number (+15, ×0.35, −3), non-interaktif | **Comparator ekonomi** dari Tabel 3&4, parameter interaktif + sensitivitas |
| 6 | Other cost-reduction + sustainability | "Ilustrasi proses" statis; optimizer moda diklaim tapi tak ada | **Modal-Shift Optimizer** + portofolio 6 tuas biaya |
| — | Cross-cutting sumber angka | `pusat/executive` hardcode regUtil & "JKT 90,4%" | Diambil dari `/ml/metrics/regions` & `/api/hubs` |

## 3. Mesin Baru

### 3.1 Direct-vs-Sponsor Comparator (`backend/app/ml/sponsor.py`)
- **Basis data kasus**: unit cost nasional = (fulfilment 50,08 + shipping 49,46)T ÷ 1.110 jt paket (Tabel 3 & 4) = **Rp89.676/paket**.
- Biaya per region disesuaikan utilisasi (biaya tetap tersebar ke volume); model 70% variabel + 30% tetap.
- Bandingkan per region: **Direct** (HQ tanggung semua cost+capex, margin penuh, kontrol 100) vs **Sponsor** (biaya tetap bergeser ke mitra, HQ dapat porsi laba sesuai ekuitas, kontrol turun).
- Skor komposit (capex saving, delta laba, util) → rekomendasi Direct/Sponsor bertahap/penuh.
- Hasil: Java → Direct; Sumatra/Kalimantan/Sulawesi/Bali/Maluku → Sponsor.
- Parameter ekuitas/fixed-share/margin + uji sensitivitas (sweep ekuitas).
- Endpoint: `GET|POST /ml/sponsor/compare`, `GET /ml/sponsor/sensitivity`.

### 3.2 Modal-Shift & Cost-Lever (`backend/app/ml/modalshift.py`)
- Profil 3 moda (darat/laut/udara): cost, emisi CO₂, kecepatan per pkg-km (asumsi tim, dilabel).
- 11 koridor antar-region; opsi moda dibatasi realistis (pulau tanpa darat).
- Optimizer: objektif berbobot (cost/emission/speed) min-max ternormalisasi + kendala SLA keras. Baseline = opsi tercepat (profil ekspres).
- Hasil: **hemat ~16,7% biaya & ~18,4% emisi**.
- `cost_levers()`: 6 tuas pengurangan biaya + dampak sustainability (sintesis dari modul COD, modal shift, address, load-balance, EV, kemasan).
- Endpoint: `GET|POST /ml/modalshift/optimize`, `GET /ml/modalshift/levers`.

## 4. UI

- `/dashboard/pusat/digital-twin` — komparator interaktif (3 slider, 2 grafik, tabel 6 region).
- `/dashboard/data/multimodal` — Modal-Shift Optimizer (slider bobot/SLA, pilih moda, daftar koridor, donut bauran, 6 tuas biaya).
- `/dashboard/pusat/executive` — utilisasi dari sumber tunggal (bukan hardcode).

## 5. Pengujian

| Suite | Hasil |
|-------|-------|
| Backend `tests/run_tests.py` | **77/77** (naik dari 57; +20 assert) |
| E2E utama `e2e.mjs` | **52/52** |
| E2E engines `e2e-engines.mjs` (baru) | **18/18** |
| E2E sidebar | **15/15** |
| E2E customer accordion | **15/15** |
| E2E cross-role orders | **31/31** |
| `svelte-check` | **0 error, 0 warning** |
| `ruff` (file baru) | bersih |
| Responsif (320–2560px) | 0 overflow pada halaman baru |

## 6. Batasan (jujur, berlabel)

- Tarif/emisi/kecepatan per moda, ekuitas HQ, porsi biaya tetap, margin lokal, dan potensi per tuas = **asumsi tim** (dokumen kasus tidak memuatnya), selalu dilabel.
- Angka kasus (Tabel 1–4, Figure 1–2) tidak diubah; rekonsiliasi tetap di `/ml/metrics/audit`.
- Model tetap **prototipe presentasi**, bukan sistem produksi.
