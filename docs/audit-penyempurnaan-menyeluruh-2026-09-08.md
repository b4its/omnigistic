# Audit & penyempurnaan menyeluruh — 2026-09-08 (sesi lanjutan)

Audit seluruh basis kode (backend 15 mesin + 49 modul; frontend 55 halaman + 106
file) dengan 2 agen paralel + verifikasi dinamis. Semua perbaikan = perubahan
nyata (bukan kosmetik), tetap **simulasi/prototipe** (asumsi tim dilabel).
Atomic commit per unit.

## 1. Temuan yang DIPERBAIKI

| # | Temuan | Dampak | Fix |
|---|--------|--------|-----|
| B1 | `/ml/cod-risk` satu-satunya mesin **tanpa clamp** | `value=1e9` → skor tepat 1,0; `zone=99` → 1,0; NaN/None → 500 | clamp semua fitur ke rentang data latih (value 10..500 rb); NaN-safe → 0,374 |
| B3 | `cost_levers` (multimodal) vs `cost_waterfall` (P&L) **berbeda 2,4×** | total 20,4% vs 8,7%; "Modal shift" 18% vs 4,5% — 2 UI bertentangan | SATU tabel kanonik `pnl.LEVERS` (7 tuas); modalshift mengimpor → keduanya 8,7% |
| B2 | forecast `backtest` = in-sample (tautologis) | mengklaim "backtest" padahal rekonstruksi | rename `inSampleFit` + `isHoldout:false` + label UI jujur; hapus param mati |
| B5 | `expansion` ambang ajaib 0.90/0.55/0.45 | divergen dari ambang kanonik 50/65 | pakai `metrics.UTIL_WARN/UTIL_CRITICAL` |
| C2 | AOV/revenue-per-parcel disalin **3-4×** | drift risk | satu helper `metrics.unit_economics()` |
| Guard | `filter_output(None)` → **TypeError 500**; baris ber-indent dibuang | crash + kehilangan teks sah | None-safe + pertahankan baris indentasi |
| C5 | ambang utilisasi 65/50 di-inline 5+ tempat; `UTIL_THRESHOLD` defined tapi tak diimpor | drift | semua konsumen impor `UTIL_THRESHOLD` (HubMap/overview/capacity/utilization) |
| FE | `kurir/overview` & `data/fleet` hardcode fallback (3,48/jam, +84%, 93,7%) | drift dari API | diturunkan dari data (numId/rasio) |
| FE | `AddressMap` import mati `api` + `void api;` | dead code | dihapus |
| BE | `sensitivity(base)` param mati | — | dihapus |

## 2. False-positive yang diverifikasi

- **`bg-chart-2/15` "invalid"** — audit mengira tak valid. Verifikasi runtime
  (Playwright getComputedStyle) membuktikan **VALID** (Tailwind v4 menghasilkan
  dari `--color-chart-*`; = `oklab(...)/0.15`). **Tidak diubah** (reverted).

## 3. Cakupan uji baru (sebelumnya tanpa uji)

- `GET /api/insights` (200 + 400) · `filter_output` (None/tabel/indentasi) ·
  `wrap_untrusted` · rate-limit burst + batas bucket (anti-DoS) · `inSampleFit
  isHoldout=false` · kesepakatan `cost_levers`↔`cost_waterfall`.

## 4. Pengujian

| Suite | Sebelum | Sesudah |
|-------|---------|---------|
| Backend `run_tests.py` | 205 | **217** |
| ruff (select repo) | bersih | bersih |
| svelte-check · eslint · build | hijau | hijau |
| E2E (11 suite) | hijau | hijau |

## 5. Batasan (jujur)

Semua mesin tetap **prototipe presentasi**; koefisien non-kasus = asumsi tim
(dilabel). Angka kasus (Table 1–4, Figure 1–2) tak diubah.
