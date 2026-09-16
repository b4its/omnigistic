# Sesi penyempurnaan simulasi & perbaikan bug (2026-09-08, lanjutan)

Latar: audit menyeluruh atas 54 halaman frontend + 29 modul backend menemukan
cacat perilaku (input diabaikan, output non-monotonic, false-affordance) dan
inkonsistensi "satu metrik, dua nilai". Sesi ini memperbaikinya dengan
perubahan **atomik**; semua masih **simulasi/prototipe** (asumsi tim dilabel).

## 1. Bug perilaku diperbaiki (backend)

| # | Temuan | Dampak | Fix |
|---|--------|--------|-----|
| B1 | `calculate_cod_impact` kasus-khusus `cod_packets==8` | n=8 → 138 mnt tapi n=9 → 127 mnt (lebih banyak paket = lebih cepat) | Satu model; `cod_share_pct` jadi parameter (default 100%). Monotonic 1..24; default mereproduksi Figure 2 |
| B2 | `optimize` target penerima hardcode `<50` | kriteria sumber (`>critical`) & tujuan (hardcode) tumpang tindih saat critical diturunkan → hasil kontradiktif | `warn_util` param (default 50) dijepit `< critical`, diekspos |
| B3 | `calculate_digital_twin` tanpa clamp | share negatif → capex negatif; >100% → utilisasi 116% | Clamp 0..100; util ≤ 100; konstanta bernama; set region timur konsisten |
| I3 | `cod_intel` tanpa validasi | share -10 → paket COD -4; share 150 → non-COD -20 | Clamp share 0..100, packages ≥ 0, intervensi disaring |
| I4 | `modalshift` tanpa validasi | SLA negatif tetap "hemat 87%"; filter ngawur jatuh ke semua moda; bobot negatif | SLA dijepit 1..240; SLA tak-terpenuhi dilaporkan; filter tak sah ditolak; bobot negatif dijepit |
| I5 | skor sponsor maks ≈0,45 | tier "Sponsor penuh" (≥0,6) mustahil; Maluku (kandidat utama) hanya "bertahap" | Normalisasi komponen ke maks teoretis; bobot util dominan → Maluku "penuh", Java "Direct" |

## 2. Inkonsistensi "satu metrik, dua nilai" diperbaiki

| Temuan | Fix |
|--------|-----|
| Address parser menyalin manual 3 alamat dari `data-kas.json` (drift) | `load()["ambiguousAddresses"]` (satu sumber) |
| Address parser false-positive (input ngawur → matched True) | Ambang `_MATCH_MIN_SCORE=0.5`; matched False bila di bawah |
| ETA peta 75 / logistics 96 / route 36 (tiga nilai) | Ambil dari `logistics.CITY_ROUTES` (SOT); hapus konstanta mati |
| Ongkir cart hardcode "Jakarta" vs checkout pakai kota alamat | Cart pakai `savedAddress.city` (subscribe store) |
| `cost-to-sales` delta hardcode "+0,4pt" | Dihitung dari data (31,3% vs 30,9% 2020) |
| Ambang util 50/65 didefinisikan 3× (metrics tak dipakai) | `metrics.py` jadi sumber kanonik; optimize & sponsor impor |

## 3. False affordance & state hilang diperbaiki

- **Topbar dropdown "rentang waktu"** menampilkan centang + toast tetapi tak ada
  halaman yang memakainya → diganti label jujur "Data kasus 2023".
- **`/dashboard/kpi`**: gagal muat → "Loading…" selamanya + array duplikat →
  kini loading/error/retry via PageState.
- **`/dashboard/data/overview`**: fetch fleet/hubs senyap (KPI jadi 0) → banner
  "Coba lagi"; label porsi motor dihitung.
- **`/dashboard/pusat/roi`**: fallback senyap → ditandai "backend offline".

## 4. Dead code dihapus

`actions/reveal.ts` (14 baris), `charts.radialGauge()`, `_shift_math()`,
`ROUTE_DURATION_MIN`/`ROUTE_DISTANCE_KM`, `UTIL_THRESHOLD` yang tak dipakai.

## 5. Pengujian

| Suite | Sebelum | Sesudah |
|-------|---------|---------|
| Backend `run_tests.py` | 105 | **138** |
| E2E utama | 52 | 52 |
| E2E sims / engines / widgets | 36 / 18 / 9 | 36 / 18 / 9 |
| E2E sidebar / orders / accordion / offline | 15 / 31 / 15 / 8 | 15 / 31 / 15 / 8 |
| `svelte-check` | 0 err | 0 err |
| `npm run build` | hijau | hijau |

## 6. Batasan (tetap jujur)

- Semua tetap **prototipe presentasi**; koefisien/tarif/emisi = asumsi tim.
- Angka kasus (Tabel 1–4, Figure 1–2) tak diubah.
- Filter rentang waktu sengaja TIDAK ada (data = dataset kasus tetap).
