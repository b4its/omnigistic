# Riset Sebaran Titik PUDO (Pick-Up Drop-Off) — 2026-09-08

## 1. Ringkasan

Sebaran titik PUDO mitra Omnigistic diperluas dari **13 titik** (Jabodetabek +
Bandung + Surabaya) menjadi **33 titik di seluruh 6 region kasus** (Table 1),
seluruh koordinat & alamat **diverifikasi dari OpenStreetMap** (bukan angka karangan).

## 2. Metode riset (multi-sumber)

- **Sumber utama:** OpenStreetMap **Nominatim** (`https://nominatim.openstreetmap.org`),
  data © OpenStreetMap contributors (ODbL).
- **Pencarian:** `shop=convenience` + "Indomaret" per kota (gerai ritel mitra nyata).
- **Verifikasi balik:** tiap koordinat di-*reverse geocode* → dipastikan mendarat
  tepat di gerai (mis. `3.5916,98.6644` → *"Halte Indomaret Gatot Subroto, Medan"*;
  `-3.6994,128.1758` → *"Indomaret Jl. Sultan Babullah, Ambon"*).
- **Referensi logistik:** PUDO meniru model ambil/bayar paket di gerai ritel
  (seperti layanan Indomaret/Alfamart pick-up point untuk ekspedisi).

## 3. Sebaran hasil (33 titik, 6 region)

| Region | Jumlah | Kota (contoh) |
|--------|--------|---------------|
| Java | 20 | Jakarta (5), Bekasi-Karawang, Depok (2), Tangerang (2), Bogor (2), Bandung (2), Semarang, Yogyakarta, Solo, Surabaya (2), Malang |
| Sumatra | 4 | Medan, Pekanbaru, Palembang, Padang |
| Kalimantan | 3 | Banjarmasin, Balikpapan, Pontianak |
| Sulawesi | 2 | Makassar, Manado |
| Bali & Nusa Tenggara | 2 | Denpasar, Mataram |
| Maluku & Papua | 2 | Ambon, Jayapura |

## 4. Contoh koordinat terverifikasi (OSM)

| ID | Gerai | Koordinat | Alamat (OSM) |
|----|-------|-----------|--------------|
| PUDO-JKT-04 | Indomaret Thamrin | -6.1923296, 106.8234170 | Jl. M.H. Thamrin, Gondangdia, Menteng |
| PUDO-SMG-01 | Indomaret Jurnatan | -6.9696286, 110.4301847 | Komp. Pertokoan Jurnatan, Semarang Tengah |
| PUDO-YOG-01 | Indomaret Malioboro | -7.7905184, 110.3658910 | Jl. Malioboro, Danurejan |
| PUDO-MDN-01 | Indomaret Gatot Subroto | 3.5915758, 98.6643667 | Jl. Jend. Gatot Subroto, Petisah Tengah, Medan |
| PUDO-MKS-01 | Indomaret Kapasa Raya | -5.1094537, 119.4952554 | Jl. Kapasa Raya, Tamalanrea, Makassar |
| PUDO-DPS-01 | Indomaret Teuku Umar | -8.6731445, 115.2084389 | Jl. Teuku Umar, Dauh Puri Kelod, Denpasar |
| PUDO-AMQ-01 | Indomaret Sultan Babullah | -3.6993578, 128.1758155 | Jl. Sultan Babullah, Waihaong, Ambon |
| PUDO-DJJ-01 | Indomaret Doyo Baru | -2.5415456, 140.4686787 | Jl. Raya Doyo Baru, Sentani, Jayapura |

## 5. Implementasi peta

- `PudoPoint` diperkaya: `region`, `address`, `source` (`"osm"`/`"asim"`); `city`
  jadi string (nama hub) — helper `pudosForRegion()` & `pudoCountByRegion()`.
- **HubMap** (peta nasional): marker PUDO di-*warna per region*; legenda menampilkan
  **ringkasan sebaran** (jumlah per region); popup = alamat + region + sumber OSM.
- **DeliveryMap** & **AddressMap**: legenda lengkap (collapsible), popup rinci,
  footer mencantumkan skala jaringan (33 titik / 6 region) + attribution OSM.
- 3 peta punya atribusi OpenStreetMap + catatan "jam/kapasitas = asumsi tim".

## 6. Uji

| Suite | Hasil |
|-------|-------|
| Backend | 205/205 |
| E2E utama | 52/52 |
| E2E pudo (baru: sebaran per-region) | 23/23 |
| E2E engines/sims/case/route/widgets | 18/36/25/9/9 |
| E2E sidebar/orders/offline | 15/31/8 |
| svelte-check · eslint | 0 error · 0 masalah |

## 7. Batasan (jujur)

- **Koordinat & alamat = nyata** (OpenStreetMap, ODbL).
- **Jam layanan, kapasitas harian, tingkat kepadatan, tarif/biaya = asumsi tim**
  (dokumen kasus tidak memuat data operasional ini), selalu dilabel.
- Gerai "Agen GC" (jika ada) bersifat fiktif; ditempatkan di koordinat lokasi nyata
  terdekat agar tetap realistis. Model tetap prototipe presentasi.
