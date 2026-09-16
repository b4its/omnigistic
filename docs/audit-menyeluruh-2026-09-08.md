# Audit menyeluruh baris kode + perbaikan (2026-09-08)

Analisis seluruh baris kode (32 file Python backend + 106 file frontend) dengan
pemeriksaan otomatis (`ruff`, `svelte-check`, `eslint`, 184 assert backend, 10
suite E2E) dan dua agen audit bug paralel. Semua temuan nyata diperbaiki dengan
commit atomik.

## 1. Bug keamanan (CRITICAL)

| ID | Temuan | Perbaikan |
|----|--------|-----------|
| C1 | Kunci rate-limit dari header `X-Forwarded-For` (bisa dipalsukan) → bypass rate-limit LLM (OWASP LLM10) | Default pakai IP peer TCP (`req.client.host`); XFF hanya bila `TRUST_PROXY=1` |
| C2 | `_bucket` rate-limit tak pernah dibuang → banjir key = OOM DoS | `_evict_stale()`: buang bucket penuh, batas `_MAX_BUCKETS=10.000` + fallback buang tertua |

## 2. Bug logika / angka material

| ID | Temuan | Perbaikan |
|----|--------|-----------|
| H2 | `expansion` margin kontribusi = `(rev−cost)×0,3` (menyia-nyiakan 70% LABA) | `rev − cost×0,7` (biaya variabel). 58.943 → 223.380/paket |
| H2b | ROI ekspansi 45×, payback 0,02 thn (headroom dianggap terisi instan) | Tambah laju tangkap thn-1 (12%) → ROI 5,4×, payback 0,18 thn |
| H3 | `sponsor.capex_score` bagi-ganda `fixed_share` → KONSTAN 1,0 (nol diferensiasi) | Rumus eksposur capex benar (HQ = ekuitas × tetap) → capex_score = 1−ekuitas; ambang tier dikalibrasi ulang |
| M3 | `sponsor` mengarang laba positif saat margin struktur negatif | Floor margin lokal hanya bila struktur tetap positif |
| H4 | Cek audit `e-commerce-total` selalu `ok=false` (padahal itu temuan dokumen) | `ok=true` (kanonik 651) + flag `finding` terpisah |
| M4 | `match_chat_qa` jalur DB case-sensitive pada role → divergen dari JSON | Normalisasi `role.upper()` di kedua jalur |
| M2 | Clamp `min/max` tidak aman-NaN → NaN lolos ke JSON (tak valid) | Helper bersama `metrics.clamp()` (None/NaN/inf/tipe salah → default) di 9 mesin |

## 3. Bug frontend

| ID | Temuan | Perbaikan |
|----|--------|-----------|
| FE-1 | `DeliveryMap` dibangun sekali di onMount → ganti kota = geometri/viewport kota lama | `buildMap()`/`teardownMap()` + `$effect` rebuild saat identitas rute berubah |
| FE-2 | `ThemeToggle`: langganan bocor + pesan toast TERBALIK | Subscribe di onMount (unsub) + baca nilai lama sebelum toggle |
| FE-3 | `MetricCard`: `$effect` self-dependent → animasi count-up restart tiap frame | Baca `shown` via `untrack()` |
| FE-4 | `seller.ts` `DAY_WEIGHT` diindeks `getDay()` (0=Minggu) vs array (0=Senin) → hari bergeser | `(dow+6)%7` |
| FE-5 | `methodology` gagal-ambil → skeleton animate-pulse SELAMANYA | Flag loading/failed + error state "Coba lagi" |
| FE-6 | `checkout` `pickupWaitMin` opsional → "undefined menit" | Dijaga `#if != null` |
| FE-7 | `load-balance` delta hardcode '-' → "--3" bila overload naik | Tanda mengikuti arah delta |
| FE-8 | Kelas Tailwind invalid `shadow-[...]/10` (3 badge polos) | Gaya badge valid (border + bg orange 10%) |
| FE-9 | `shop.ts` komentar migrasi emoji→icon keliru | Komentar diklarifikasi + guard tipe |
| FE-10 | label "93,7% armada" (sebenarnya pangsa last-mile) | "93,7% dari armada last-mile" |
| FE-11 | `{#each}` key berpotensi tabrakan (address/multimodal) | Tambah indeks pada key |

## 4. Pembersihan

- `eslint.config.js`: abaikan `build_*/**` (build_old_root/ membanjiri 5416 error → kini lint source-only bersih).
- Hapus kode mati: `forecast._moving_average`, `surge._CRITICAL`, helper `rp` tak terpakai, tipe API `digitalTwin`/`codImpact`.

## 5. Hasil pengujian

| Suite | Hasil |
|-------|-------|
| Backend `run_tests.py` | **184/184** (dari 166) |
| `ruff` (select repo) | bersih |
| `svelte-check` | 0 error, 0 warning |
| `eslint` | 0 masalah (exit 0) |
| `npm run build` | sukses |
| E2E utama | 52/52 |
| E2E engines/sims/case/widgets | 18/36/25/9 |
| E2E sidebar/orders/accordion/offline | 15/31/15/8 |

## 6. Catatan

- Tetap **simulasi/prototipe presentasi**; koefisien non-kasus = asumsi tim (dilabel).
- Angka kasus (Table 1–4, Figure 1–2) tak diubah; rekonsiliasi tetap dilaporkan.
