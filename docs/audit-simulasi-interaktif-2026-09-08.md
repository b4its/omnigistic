# Sesi penyempurnaan fitur — simulasi interaktif & perbaikan bug (2026-09-08, lanjutan)

Latar: audit menyeluruh menemukan beberapa halaman simulasi yang masih
statis/preset (label kosong) dan beberapa bug nyata di mesin ML/API. Sesi ini
menutupnya dengan perubahan **atomik** (satu commit per unit).

## 1. Bug nyata yang diperbaiki

| # | Temuan | Dampak | Fix | Verifikasi |
|---|--------|--------|-----|------------|
| 1 | `simulations.calculate_cod_impact` **mengabaikan** argumen `cod_packets` | 8 vs 80 paket → output identik (selain `packagesFreed`); durasi/produktivitas di-hardcode 138/3,48 | Durasi diturunkan dari tempo kasus Figure 2 (75 mnt non-COD / 138 mnt COD per 8 pkg) + waiting dipangkas `prob_digital` | 8 pkg 0% digital = 138 mnt/3,48 per jam (invarian kasus) |
| 2 | `guard.sanitize_input` pakai `str.replace("U+E0000-U+E007F")` (literal, bukan rentang) | Unicode Tags (vektor sembunyi prompt) lolos; memicu false-positive obfuscation | Ganti ke regex `_STRIP_RE` atas rentang tag + NUL | Tag dibuang, keputusan `ok` |
| 3 | `formatter._identity_re` cache regex **sekali** | Ubah env (`AI_MODEL`/base URL) setelah panggilan pertama tak memperbarui scrub | Cache di-key ke `(AI_MODEL, AI_API_BASE_URL)` + `_reset_cache()` | Scrub ikut env |
| 4 | `cod_risk` klaim simpan `cod_risk.pkl` padahal tak pernah; `_fitted` dead var | Over-claim | Implementasi `_save_model`/`_load_model` (joblib), hapus dead var | `.pkl` tertulis (927 B) & reload |
| 5 | `chat` selalu `mode="chat"` walau jalur fallback/offline; komentar "bank QA 48" (asli 54) | Field menyesatkan + komentar basi | `mode` mencerminkan jalur nyata; komentar dikoreksi | mode ∈ {fallback, llm, offline} |
| 6 | `/api/suggested` balas `[]` bisu untuk halaman tak dikenal | Sulit didiagnosis | 404 eksplisit | 200 vs 404 |
| 7 | `data/overview` hardcode KPI & armada (dan **salah**: 8 overloaded/7 underutilized) | Melanggar klaim "satu sumber kebenaran"; angka keliru | Hitung dari `/api/hubs` (5 & 9) + `/api/fleet` | 5 overloaded / 9 underutilized |
| 8 | `demand_actual_tiktok` menandai Sep–Des "Pasca-TikTok-Suspension" | Menyesatkan (suspensi = Oktober) | Okt = `TikTok-Suspension`, Nov/Des = `Pemulihan pasca-shock` | Label Okt benar |
| 9 | `models.py` klaim "11 model inti" (nyata 4 tabel) | Over-claim | Docstring dikoreksi | — |

## 2. Celah fitur yang ditutup (simulasi interaktif nyata)

| Halaman | Sebelum | Sesudah |
|---------|---------|---------|
| `hub/capacity` | 3 tombol level **dead-result** (nilai 78M/92,5M/105M+ tak masuk hitungan) | Level men-skala volume hub → jumlah menembus ambang & overflow dihitung ulang (Lembah 1 → Puncak 11 hub) |
| `hub/load-balance` | hanya tombol "Jalankan ulang" (param sama) | 3 slider ambang (`critical`/`safe_floor`/`max_divert_frac`) + `POST /ml/optimize/load-balance` |
| `hub/forecast` | proyeksi statis | 3 slider kekuatan event (what-if) + `POST /ml/forecast` (`horizon`, `event_scale`) |
| `pusat/roi` | 3 skenario hardcoded | 4 slider tuas kustom → ROI/capex/payback real-time |
| `data/fleet` | donut + roadmap statis | slider adopsi EV → bauran + penurunan emisi proxy |
| `data/address` | query hardcoded, tanpa input | input alamat bebas → fuzzy-match + ETA; engine jujur saat no-match (`best=null`) |

## 3. Pengujian

| Suite | Sebelum | Sesudah |
|-------|---------|---------|
| Backend `tests/run_tests.py` | 77 | **105** |
| E2E utama `e2e.mjs` | 52 | 52 |
| E2E simulasi baru `e2e-sims.mjs` | — | **36** |
| E2E engines / sidebar | 18 / 15 | 18 / 15 |
| `svelte-check` | 0 err | 0 err |
| Overflow 320px (7 halaman diubah) | — | 0 overflow |
| Kontrol tanpa label a11y (6 halaman) | — | 0 |

## 4. Batasan (jujur, berlabel)

- Faktor emisi EV, tarif moda, porsi intervensi, koefisien dampak digital-twin,
  dan estimasi ROI = **asumsi tim** (dokumen kasus tidak memuatnya), selalu
  dilabel di UI/endpoint.
- Model tetap **prototipe presentasi**, bukan sistem produksi.
- Angka kasus (Tabel 1–4, Figure 1–2) tidak diubah; rekonsiliasi tetap di
  `/ml/metrics/audit`.
