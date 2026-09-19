# Tantangan 1: Bandingkan Model Logistik. Haruskah Direct Operation Dialihkan ke Regional Sponsored Model?

## APA

**Tidak dialihkan menyeluruh. Yang tepat adalah model hibrida tiga tingkat.**

GC mempertahankan Direct Operation di 11 dari 23 hub yang memuat 73,6% volume. Sisanya, 12 hub yang hanya memuat 26,4% volume, dialihkan ke kemitraan: 8 hub lewat Joint Venture dan 4 hub lewat Regional Sponsor penuh. Estimasi manfaat sekitar Rp 5,04 triliun per tahun pada basis pendapatan 2023, dan Rp 6,12 triliun pada basis pendapatan proyeksi 24 bulan. Angka ini bergantung pada asumsi fee mitra dan belum berupa hasil kontrak.

## BAGAIMANA

**Langkah 1. Bandingkan kedua model.**

| Aspek | Direct Operation (kondisi sekarang) | Regional Sponsored Model |
| --- | --- | --- |
| Struktur | Terpusat, HQ memiliki dan mengelola outlet, hub, line-haul | Kemitraan lokal dengan ekuitas dan kemandirian operasional |
| Keunggulan | Standar dan SLA seragam, kendali harga, data terpusat, kepadatan jaringan | Modal ringan, penskalaan cepat, pengetahuan pasar lokal |
| Kelemahan | Padat modal, biaya tetap besar, jaringan makin kompleks | HQ sulit mengatur harga, akuisisi pelanggan, dan operasi lokal; standar layanan bisa tidak konsisten |
| Biaya transisi | Tidak ada | Perlu redesain puluhan proses dan arsitektur jaringan (menurut kasus) |
| Cocok untuk | Hub padat dan matang | Hub tipis, jauh, dan berbiaya tetap tinggi |

Kedua model tidak saling mengalahkan mutlak. Masing-masing unggul pada kondisi berbeda, jadi pertanyaan yang tepat adalah di hub mana model mana yang lebih menguntungkan.

**Langkah 2. Tetapkan aturan keputusan.** Sponsor menguntungkan bila fee mitra lebih rendah daripada biaya GC mengoperasikan sendiri. Biaya GC saat ini 31,34% dari penjualan (Rp 99,54 T ÷ Rp 317,63 T dari Tabel 3). Asumsi fee mitra: 26% untuk JV dan 22% untuk sponsor penuh. Selisihnya 5,34 dan 9,34 poin persentase. Selisih ini hanya nyata di hub yang biaya sendirinya tinggi. Di hub padat, biaya GC sudah lebih rendah, sehingga fee mitra justru bisa lebih mahal.

**Langkah 3. Petakan 23 hub.** Volume per hub = kapasitas × utilisasi (Tabel 1). Total permintaan 3,153 juta paket per hari.

| Tingkat | Model | Hub | Pangsa volume |
| --- | --- | --- | --- |
| A | Own & Operate | 11 hub: Jakarta, Surabaya, Bekasi-Karawang, Bandung, Semarang, Medan, Denpasar, Makassar, Malang, Yogyakarta, Solo | 73,6% |
| B | Joint Venture | 8 hub: Palembang, Pekanbaru, Bandar Lampung, Banjarmasin, Padang, Balikpapan, Pontianak, Mataram | 22,1% |
| C | Regional Sponsor | 4 hub: Banda Aceh, Manado, Ambon, Jayapura | 4,4% |

Empat hub Tingkat C adalah empat hub dengan utilisasi terendah dari 23 hub: 40,5%, 41,2%, 32,1%, dan 28,1%.

**Langkah 4. Hitung nilainya.**

| Tingkat | Pendapatan terkait | Selisih fee | Penghematan per tahun |
| --- | --- | --- | --- |
| B | Rp 70,07 T | 5,34 pp | Rp 3,74 T |
| C | Rp 13,91 T | 9,34 pp | Rp 1,30 T |
| **Total** | **Rp 83,98 T** |  | **Rp 5,04 T** |

Dampaknya: efek sponsor = 1,59 poin persentase dari pendapatan (invariant terhadap skala volume), sehingga cost-to-sales 28,35% turun ke 26,8%. Basis: Rp 5,04 T dihitung pada pendapatan 2023 (Rp 317,63 T); pada basis proyeksi 24 bulan (Rp 385,60 T) nilainya Rp 6,12 T, dengan efek rasio yang sama (1,59 pp). Catatan kehati-hatian: fee adalah asumsi, pendapatan dialokasikan menurut volume, dan pendapatan Rp 317,63 T dalam kasus tidak cocok dengan volume paket (terhitung sekitar Rp 286 ribu per paket), sehingga kemungkinan angka konsolidasi grup. Baca angka ini sebagai orde besaran, dan validasi lewat pilot di 4 hub Tingkat C dulu.

**Langkah 5. Kunci risiko lewat kontrak.**

| Guardrail | Ketentuan |
| --- | --- |
| SLA on-time | Di atas 92%, bila gagal fee ditahan dan takeover 30 hari |
| Data | Kirim ke GCMS harian tanpa pengecualian |
| Tarif pelanggan | Maksimal tarif HQ +5% |
| Kapasitas cadangan | +30% dengan pemberitahuan 48 jam saat puncak |
| Standar outlet | Audit triwulanan |
| Takeover dan buyback | Formula valuasi disepakati sebelum konversi |

## MENGAPA

Pertama, menyerahkan semua hub berarti menjual keunggulan sendiri. Sebelas hub inti memuat 73,6% volume, tempat kepadatan menurunkan biaya per paket. Kedua, sponsor tidak menyelesaikan masalah utama. Utilisasi 61,8% dan timpang (Jakarta 90,4%, Jayapura 28,1%) tidak berubah hanya karena pemilik hub berganti. Ketiga, diagnosis biaya tidak membenarkan restrukturisasi besar. Cost-to-sales memburuk 2020 sampai 2022 (30,94% ke 32,79%) tetapi membaik ke 31,34% di 2023, jadi yang rusak di 2023 adalah volume akibat syok TikTok Shop. Keempat, risiko eksekusi harus sebanding: kasus mengakui perubahan butuh redesain puluhan proses, jadi 12 konversi bertahap lebih aman daripada 23 sekaligus. Kelima, sponsor memberi lindung nilai: sebagian biaya tetap menjadi biaya kontrak yang ditanggung mitra saat volume jatuh.

---

# Tantangan 2: Bagaimana Menangani Fluktuasi Permintaan yang Dramatis?

## APA

**Kelola fluktuasi dengan sistem lima lapis, dengan tuas terbesar berupa load balancing antar-hub, bukan penambahan kapasitas.**

Load balancing berbiaya sekitar Rp 90 per paket, jauh di bawah capex hub baru yang diasumsikan Rp 500 miliar. Sistem ini juga mencakup playbook untuk penurunan volume, karena kasus menceritakan keruntuhan Q4 2023, bukan hanya lonjakan.

## BAGAIMANA

**Langkah 1. Uji di mana jaringan pecah.** Sebuah hub melewati kapasitas bila utilisasi dasar × amplifikasi lebih dari 100%.

| Amplifikasi permintaan | Hub yang pecah |
| --- | --- |
| 1,15× dan 1,30× | 1 hub (Jakarta) |
| 1,45× (setara Ramadan dan Lebaran) | 3 hub (Jakarta, Surabaya, Bekasi-Karawang) |
| 2,00× | 14 hub |
| 3,00× | 21 hub |

Pada 1,45×, utilisasi nasional baru sekitar 89,6%, dan Ambon serta Jayapura tidak pecah bahkan pada 3×. Jadi masalahnya kapasitas ada di tempat yang salah, bukan kurang secara total.

**Langkah 2. Sistem lima lapis.**

| Lapis | Isi |
| --- | --- |
| 1. Peramalan dua arah | Fitur kalender musiman (dari Tabel 4), kalender platform, dan kalender regulasi. Target MAPE out-of-sample 5 sampai 8% dengan validasi walk-forward |
| 2. Base fleet | Armada tetap di persentil-70 permintaan bulanan, bukan puncak |
| 3. Kapasitas fleksibel | Mitra wajib +30% dengan notifikasi 48 jam, dibayar saat dipakai; kurir on-demand; PUDO saat hub di atas 85% |
| 4. Load balancing | Hub pengirim di atas 78% memindahkan ke hub penerima di bawah 55%, lantai aman 60% di penerima, maksimal 35% beban dialihkan |
| 5. Playbook penurunan | Pemicu volume −12% tiga minggu berturut-turut |

**Langkah 3. Hitung biaya load balancing.** Truk 8 ton berkapasitas sekitar 4.000 paket, jarak 120 km, biaya Rp 3.000 per km: (120 × Rp 3.000) ÷ 4.000 = Rp 90 per paket. Angka kapasitas truk dan biaya per km adalah asumsi.

**Langkah 4. Contoh Jakarta.** Mengalihkan sekitar 0,10 juta paket per hari ke Bekasi-Karawang (0,05), Bandung (0,03), dan Yogyakarta (0,02) menurunkan utilisasi Jakarta dari 90,4% menjadi sekitar 81,5%, sementara hub penerima naik ke kisaran 73 sampai 81%.

**Langkah 5. Playbook penurunan.**

| Waktu | Aksi |
| --- | --- |
| H+7 | Hentikan kontrak fleksibel, alihkan volume ke hub berbiaya variabel terendah, bekukan rekrutmen |
| H+14 | Ubah kontrak line-haul dari minimum volume ke per-trip, tunda capex non-kritis |
| H+30 | Aktifkan portofolio non-e-commerce (B2B, dokumen, cold chain) |

## MENGAPA

Pertama, kasus sendiri menunjukkan solusinya sudah pernah berhasil: saat Double 12 tahun 2022, Jakarta mengalihkan sebagian paket ke hub lain. Sistem ini hanya memformalkannya. Kedua, load balancing jauh lebih murah daripada membangun hub baru dan menunda capex 2 sampai 3 tahun. Ketiga, e-commerce sekitar 58% volume dan sangat rentan. Tabel 4 menunjukkan e-commerce jatuh dari 57 juta (September) ke 40 juta (Oktober 2023). Syok sebesar −30% pada segmen ini menurunkan volume total sekitar 17,4%, sedangkan biaya hanya turun sekitar 11,3% karena porsi biaya tetap (asumsi 35%), sehingga biaya per paket naik sekitar 7,4%. Solusi yang hanya menyiapkan cadangan lonjakan menjawab separuh persoalan. Keempat, target akurasi dibuat realistis karena data mengandung guncangan kebijakan, dan klaim akurasi yang terlalu rendah biasanya hasil pengukuran in-sample.

---

# Tantangan 3: Analisis Sistem COD

## APA

**Masalah COD adalah kegagalan insentif, bukan sekadar masalah proses.**

Kurir dengan bayaran flat per paket kehilangan sekitar Rp 40.900 sampai Rp 45.256 per hari setiap kali mengantar COD dengan benar. Solusinya tiga lapis: perbaiki insentif, tambahkan empat intervensi digital, dan lakukan rekonsiliasi kas tiga arah. Targetnya waktu per paket COD turun dari 17,25 menjadi 12,0 menit, dengan nilai sekitar Rp 1,95 triliun per tahun.

## BAGAIMANA

**Langkah 1. Ukur selisih dari Figure 2 kasus.**

| Metrik | Non-COD | COD |
| --- | --- | --- |
| Waktu 8 paket | 75 menit | 138 menit |
| Waktu per paket | 9,375 menit | 17,25 menit |
| Paket per kurir per 420 menit produktif | 44,8 | 24,3 |

Selisihnya (138 − 75) ÷ 8 = 7,875 menit per paket. Produktivitas turun sekitar 45,7%.

**Langkah 2. Bandingkan proses penugasan kurir.**

| Tahap | Non-COD | COD |
| --- | --- | --- |
| Seleksi | KTP, SIM, kontak | Ditambah rekam jejak kas, jaminan, pelatihan |
| Ikatan finansial | Tidak ada | Deposit atau setoran harian |
| Persiapan pra-kedatangan | Tidak kritis | Kritis, tetapi tidak ada mekanisme konfirmasi |
| Waktu di titik | Singkat | Lebih lama (verifikasi, menunggu, menghitung uang) |
| Kegagalan | Coba ulang atau titip | Harus retur |
| Rekonsiliasi | Tidak ada | Harian, manual, rawan salah |
| Insentif | Flat per paket | Flat juga, tanpa kompensasi waktu dan risiko kas |
| Risiko | Paket hilang atau rusak | Ditambah kas hilang dan penipuan |

**Langkah 3. Temukan akar masalah.** Kurir dibayar sekitar Rp 2.000 sampai Rp 2.213 per paket (data eksternal, perlu dicek ulang). Mengantar COD dengan benar membuat kurir kehilangan sekitar 20,45 pengantaran per hari, atau Rp 40.900 sampai Rp 45.256 per hari.

**Langkah 4. Rekomendasi.**

A. Insentif berbasis output: tarif dasar, bonus COD per paket, bonus pembayaran nontunai, perlindungan untuk COD bernilai tinggi. Dikaitkan ke paket per hari, bukan kehadiran.

B. Empat intervensi digital:

| Intervensi | Potensi hemat waktu |
| --- | --- |
| QRIS on Delivery | 3,5 menit |
| Konfirmasi pra-kedatangan | 2,5 menit |
| Skor risiko dan rute dua-objektif | 1,0 menit |
| PUDO atau loker untuk COD kecil | 0,5 menit |
| Total teoretis | 7,5 menit |

C. Rekonsiliasi kas tiga arah antara bukti serah-terima, mutasi dompet kurir, dan catatan merchant.

**Langkah 5. Dampak.** Dengan realisasi 70% dari potensi (asumsi, rentang 50 sampai 90%):

| Metrik | Baseline | Target |
| --- | --- | --- |
| Waktu per paket COD | 17,25 menit | 12,0 menit |
| Produktivitas COD | 24,3 per hari | 35 per hari (+44%) |
| Retur COD | 10% | 6,5% |
| Selisih rekonsiliasi kas | 0,10% | 0,02% |
| Nilai tahunan |  | sekitar Rp 1,95 T |

Retur 10%, selisih kas 0,10%, dan bauran COD 35% adalah asumsi tim (tidak ada di kasus). Nilai Rp 1,95 T harus disajikan sebagai rentang mengikuti bauran COD 25 sampai 45%.

## MENGAPA

Kurir menjawab sesuai insentifnya. Bila COD membuat pendapatan hariannya turun hampir setengah, perilaku rasional adalah menghindari COD, mengurangi verifikasi, atau menolak di tempat. Perilaku terakhir itulah yang melahirkan retur. Tiga kutipan kurir di kasus (Jakarta, Surabaya, Bandung) menyatakan hal yang sama: menunggu dan menagih membuat rute berikutnya terlambat. Karena itu pelatihan atau SOP baru tanpa perubahan insentif akan gagal dengan cara yang sama. Empat intervensi digital menyerang sumber waktu yang hilang (menghitung uang, menunggu penerima, rute tidak sadar nilai COD), dan rekonsiliasi tiga arah menyerang risiko kas yang terkonsentrasi pada satu orang, yang selama ini menjadi alasan deposit menghambat rekrutmen. Satu catatan penting: penghematan proses COD harus dipisahkan dari penghematan kendaraan (Tantangan 4) agar tidak dihitung dua kali.

---

# Tantangan 4: Roadmap dan Benefit-Cost Analysis Sustainability

## APA

**Mulai dengan pilot 350 motor listrik, tunda armada berat, dan pasang solar sebelum mengelektrifikasi truk.**

Pilot membandingkan 350 Honda Scoopy Fashion (bensin) dengan 350 Smoot Zuzu (listrik, sistem tukar baterai) pada siklus penggantian kendaraan. Hasil perhitungan: net benefit operasional sekitar Rp 2,55 miliar per tahun, arus kas Tahun-0 positif sekitar Rp 1,15 miliar, dan penurunan emisi sekitar 266 ton CO₂ per tahun. Penskalaan dilakukan hanya bila lolos syarat pilot. Program ini adalah pilot pembuktian, bukan penggerak laba utama.

## BAGAIMANA

**Langkah 1. Tetapkan parameter.** Satu kendaraan bensin dibandingkan dengan satu kendaraan listrik, tanpa rata-rata antar merek, dan tanpa subsidi maupun pembebasan pajak.

| Parameter | Nilai | Sifat |
| --- | --- | --- |
| Jumlah unit | 350 (2,8% dari 12.500) | Pilihan tim |
| Jarak | 80 km per hari, 365 hari | Asumsi |
| Harga Scoopy Fashion | Rp 23.376.000 | Eksternal, cek ulang |
| Harga Smoot Zuzu | Rp 19.900.000 | Eksternal, cek ulang |
| Harga Pertamax (rata-rata provinsi) | Rp 16.253,95 per liter | Eksternal, cek ulang |
| Konsumsi Scoopy (pabrikan) | 59,0 km per liter | Eksternal, cek ulang |
| Tambahan idle | 3 menit per paket, 45 paket, 0,20 liter per jam | Asumsi |
| Tarif swap | Rp 175 per km (prudent Rp 200) | Eksternal, cek ulang |
| Pemeliharaan Scoopy / Zuzu | Rp 2,88 juta / Rp 1,20 juta per unit per tahun | Asumsi |

**Langkah 2. Hitung berurutan.**

| # | Langkah | Hasil |
| --- | --- | --- |
| 1 | Jarak: 350 × 80 × 365 | 10.220.000 km per tahun |
| 2 | Konsumsi efektif Scoopy: 80 ÷ (80/59,0 + 0,45) | 44,2985 km per liter |
| 3 | Biaya BBM per km: 16.253,95 ÷ 44,2985 | Rp 366,92 |
| 4 | Biaya BBM tahunan | Rp 3.749.913.679 |
| 5 | Biaya swap tahunan: 10.220.000 × 175 | Rp 1.788.500.000 |
| 6 | Hemat energi | Rp 1.961.413.679 |
| 7 | Hemat pemeliharaan | Rp 588.000.000 |
| 8 | **Net benefit operasional per tahun** | **Rp 2.549.413.679** |
| 9 | Hemat harga beli: 350 × Rp 3.476.000 | Rp 1.216.600.000 |
| 10 | Biaya pelatihan | Rp 66.848.553 |
| 11 | **Arus kas Tahun-0** | **+Rp 1.149.751.447** |
| 12 | Total 5 tahun: (8 × 5) + 11 | Rp 13.896.819.842 |

**Langkah 3. Uji skenario.**

| Skenario | Net benefit per tahun | Arus kas Tahun-0 |
| --- | --- | --- |
| Base: swap Rp 175 per km, tanpa pajak | Rp 2,55 M | +Rp 1,15 M |
| Prudent: swap Rp 200 per km | Rp 2,29 M | +Rp 1,15 M |
| Upside: bila bebas PKB dan BBNKB | Rp 2,66 M | +Rp 1,81 M |

Angka BCR TCO (sekitar 1,77) dan NPV (sekitar Rp 10,8 miliar) belum bisa saya kunci karena dokumen sumber tidak menyediakan tabel arus kas tahunan dan TCO. Keduanya harus dihitung di spreadsheet sebelum ditampilkan di slide.

**Langkah 4. Uji ketahanan pilihan merek.** Terhadap Honda BeAT (pembanding termurah), arus kas Tahun-0 justru negatif sekitar Rp 249 juta karena EV lebih mahal dibeli, tetapi balik modal sekitar 1 sampai 2 bulan operasi. Terhadap Genio, Vario, dan PCX hasilnya positif.

**Langkah 5. Hitung titik kritis.**

| Pertanyaan | Jawaban |
| --- | --- |
| Tarif swap saat biaya energi EV sama dengan biaya bensin | Rp 366,92 per km (naik 2,10× dari Rp 175) |
| Tarif swap saat net operasional nol | Sekitar Rp 424,45 per km |
| Harga Pertamax saat energi Scoopy sama dengan swap Rp 175 | Sekitar Rp 7.752 per liter |

**Langkah 6. Hitung emisi.** Scoopy: 2,31 ÷ 44,2985 = 0,05215 kg CO₂ per km. Zuzu: (0,027 ÷ 0,90) × 0,87 = 0,02610 kg CO₂ per km. Penurunan sekitar 49,9%, atau sekitar 266 ton CO₂ per tahun untuk 350 unit.

**Langkah 7. Roadmap.**

| Fase | Periode | Isi | Syarat |
| --- | --- | --- | --- |
| 1. Pilot | Q4 2026 sampai Q1 2027 | 350 Zuzu, dengan 350 Scoopy sebagai pembanding | Evaluasi 90 dan 180 hari |
| 2. Keputusan skala | Q3 2027 | Menuju 3.000 unit | Lolos syarat di bawah |
| 3. Solar rooftop | 2028 | Hub dengan beban siang tinggi | Lolos batas payback |
| 4. Van listrik | 2029 | Skema sewa | Batasi risiko teknologi |
| 5. Armada berat | 2030 sampai 2031 | Truk listrik setelah listrik lebih bersih | Sebelumnya: modal shift, backhaul, eco-driving |

Syarat lolos penskalaan: uptime di atas 95%, biaya energi aktual maksimal Rp 200 per km, SLA tidak turun, jaringan swap mencakup rute, net benefit aktual minimal 80% model, dan minimal dua vendor swap per kota.

## MENGAPA

Pertama, program ini disebut pilot karena 350 unit hanya 2,8% armada dan net benefit Rp 2,55 miliar sekitar 0,0026% dari biaya logistik Rp 99,54 triliun. Nilainya membuktikan unit economics dan risiko swap sebelum berinvestasi besar. Kedua, motor listrik didahulukan karena keunggulannya berdiri tanpa subsidi: harga beli lebih murah, biaya energi per kilometer lebih rendah, dan emisi turun hampir setengah. Ketiga, Zuzu dipilih bukan karena energinya paling murah (swap justru lebih mahal daripada mengisi daya di depot), tetapi karena jangkauan 80 km sama dengan jarak harian dan tukar baterai hanya beberapa detik, sehingga tidak ada waktu produktif hilang. Keempat, armada berat ditunda karena pada grid listrik yang masih intensif karbon (0,87 kg CO₂ per kWh), truk listrik diperkirakan sekitar 19% lebih emisif daripada diesel. Perhitungan ini perlu dicek ulang sebelum dipakai. Kelima, risiko terbesar program ini bukan teknologi motor, melainkan ketergantungan pada satu operator swap. Karena itu kontrak dibuat berbasis rupiah per kilometer dengan batas kenaikan harga dan minimal dua vendor per kota.

---

# Tantangan 5: Justifikasi Strategi Ekspansi Pasar. Apakah Menguntungkan?

## APA

**Ya, ekspansi menguntungkan, tetapi bukan dengan membuka kota baru lebih dulu.**

Ekspansi yang paling menguntungkan adalah mengisi 401 sampai 710 juta slot paket yang kosong di 23 hub yang sudah ada. Modal tambahan mendekati nol dan balik modal kurang dari 1,5 tahun. Hub baru hanya dipertimbangkan setelah syarat kapasitas terpenuhi.

## BAGAIMANA

**Langkah 1. Hitung ruang kosong.**

| Basis | Permintaan | Kapasitas | Utilisasi | Ruang kosong per tahun |
| --- | --- | --- | --- | --- |
| Tabel 1 | 3,153 juta per hari | 5,098 juta per hari | 61,8% | 710 juta paket |
| Volume 2024 (1,46 miliar) | 4,000 juta per hari | 5,098 juta per hari | 78,4% | 401 juta paket |

Keputusan investasi memakai basis konservatif 401 juta.

**Langkah 2. Bandingkan tiga jalur.**

| Jalur | Payback | Keputusan |
| --- | --- | --- |
| Isi ruang kosong hub eksisting | Di bawah 1,5 tahun | Prioritas utama |
| Sponsor atau JV di kota tier-2 dan tier-3 | 2 sampai 3 tahun | Jalankan paralel |
| Kota baru model Direct | 3 sampai 5 tahun | Tunda |

Angka payback ini adalah estimasi tim, bukan data kasus.

**Langkah 3. Hitung potensi mengisi ruang kosong.** Dengan kontribusi Rp 3.000 per paket (asumsi, rentang Rp 2.000 sampai Rp 6.000) dan basis 401 juta paket:

| Ruang kosong terisi | Volume tambahan | Kontribusi per tahun |
| --- | --- | --- |
| 10% | 40,1 juta paket | Rp 120 miliar |
| 20% | 80,2 juta paket | Rp 241 miliar |
| 35% | 140,4 juta paket | Rp 421 miliar |

**Langkah 4. Tetapkan syarat pembangunan hub baru.** Semua harus terpenuhi:

| Syarat | Ambang |
| --- | --- |
| Utilisasi hub | 78% atau lebih selama tiga bulan berturut-turut |
| Load balancing | Sudah dijalankan |
| SLA on-time | Di atas 90% |
| Konsentrasi pelanggan | Tidak ada pelanggan di atas 35% volume |
| Pertumbuhan pasar | Minimal 8% per tahun |

## MENGAPA

Pertama, kapasitas kosong sudah dibayar. Mengisinya menghasilkan kontribusi tanpa modal infrastruktur baru, sedangkan hub baru butuh modal besar dan baru menghasilkan di tahun ketiga sampai kelima. Kedua, jangkauan bukan masalahnya. Paket per outlet hampir sama antar wilayah (Jawa 1.449, Maluku & Papua 1.400), sehingga yang timpang adalah utilisasi hub. Membuka kota baru berarti menambah outlet di jaringan yang sudah merata sambil membangun hub di tempat yang belum membutuhkannya. Ketiga, ekspansi harus bisa dihentikan. Kasus menunjukkan syok regulasi (TikTok Shop) bisa menjatuhkan volume dalam satu kuartal, sehingga model sponsor dan JV yang tidak mengunci modal GC lebih aman. Keempat, ada tiga peringatan yang harus dijaga: perang harga (tarif turun 10% memotong kontribusi Rp 3.000 menjadi sekitar Rp 2.000), konsentrasi pada beberapa platform, dan syok regulasi. Satu catatan jujur: seluruh perhitungan kontribusi bergantung pada asumsi Rp 3.000 per paket, dan nilai payback hub baru adalah estimasi yang perlu divalidasi dengan data biaya GC.

---

# Tantangan 6: Strategi Lain untuk Menurunkan Biaya Sambil Menjaga Pendapatan, dengan Aspek Keberlanjutan

## APA

**Gabungkan tujuh tuas efisiensi dengan absorpsi biaya tetap dari pertumbuhan volume, dan tambahkan tiga sumber pendapatan dari aset yang sudah dimiliki.**

Hasilnya cost-to-sales turun dari 31,34% menjadi 28,35%, atau 26,8% bila sponsor selektif (Tantangan 1) berhasil. Biaya yang dihindarkan sekitar Rp 11,53 triliun, dan sekitar 65% di antaranya berasal dari volume, bukan dari pemotongan.

## BAGAIMANA

**Langkah 1. Tujuh tuas biaya.** Basis biaya variabel Rp 64,70 T (65% dari Rp 99,54 T, dengan asumsi porsi biaya tetap 35%).

| # | Tuas | Dampak biaya variabel | Catatan |
| --- | --- | --- | --- |
| 1 | Produktivitas last-mile dan COD | −3,0% | Berjangkar hitungan Tantangan 3 |
| 2 | Modal shift darat ke laut untuk paket tidak mendesak | −1,0% | Estimasi |
| 3 | Kualitas alamat dan gagal antar | −1,0% | Estimasi |
| 4 | Right-size packaging | −0,5% | Estimasi |
| 5 | Backhaul dan berbagi aset | −0,4% | Estimasi |
| 6 | PUDO dan loker | −0,2% | Estimasi |
| 7 | Transisi energi armada | −0,1% | Hanya bila armada listrik diskalakan. Pilot 350 unit hanya sekitar 0,004% |
|  | Subtotal | −6,2% |  |
|  | Koreksi tumpang tindih | +1,0 poin |  |
|  | **Net** | **−5,2% (Rp 4,08 T)** |  |

**Langkah 2. Hitung absorpsi biaya tetap.** Ini efek struktural dari pertumbuhan volume, bukan tuas biaya.

| Langkah | Nilai |
| --- | --- |
| Volume: 1.110 juta menjadi 1.347,5 juta paket (+21,4%, setara utilisasi 61,8% ke 75%) |  |
| Biaya bila struktur lama ikut naik: 99,54 × 1,214 | Rp 120,84 T |
| Biaya bila biaya tetap konstan: 34,84 + (64,70 × 1,214) | Rp 113,39 T |
| **Manfaat absorpsi** | **Rp 7,45 T** |

**Langkah 3. Susun jembatan cost-to-sales.**

| Tahap | Total biaya | Cost-to-sales |
| --- | --- | --- |
| Baseline 2023 | Rp 99,54 T | 31,34% |
| Setelah absorpsi volume | Rp 113,39 T | 29,40% |
| Setelah tujuh tuas | Rp 109,31 T | 28,35% |
| Konversi 12 hub: biaya operasi GC keluar | −Rp 31,95 T |  |
| Konversi 12 hub: fee mitra masuk | +Rp 25,83 T |  |
| Setelah sponsor selektif (net Rp 6,12 T) | Rp 103,19 T | 26,8% |

Asumsi: fee mitra menggantikan penuh biaya operasi hub terkait, tanpa biaya transisi atau koordinasi sisa. Fee dihitung dari pendapatan proyeksi (B Rp 85,06 T × 26% + C Rp 16,89 T × 22% = Rp 25,83 T); biaya GC yang keluar memakai rasio nasional 31,34% (hub timur sebenarnya berbiaya tetap lebih tinggi, sehingga estimasi ini konservatif).

Total biaya dihindarkan tanpa sponsor: Rp 7,45 T + Rp 4,08 T = Rp 11,53 T.

**Langkah 4. Tambahkan tiga sumber pendapatan dari aset yang sudah ada.**

| Sumber | Isi |
| --- | --- |
| Monetisasi kapasitas idle | Jual ruang hub kosong ke seller B2B, operator lain, dan brand untuk fulfillment |
| COD-as-a-Service | Tawarkan kemampuan COD dan penagihan ke merchant offline dan distributor |
| Kolaborasi kapasitas antar-operator | Isi line-haul yang kosong saat perjalanan balik lewat perjanjian kapasitas timbal balik |

Potensi gabungan Rp 0,3 sampai 0,9 T per tahun (titik tengah Rp 0,6 T). Ini asumsi, dan tidak dimasukkan ke jembatan utama karena kontribusinya hanya sekitar 16 bps (15,6 bps pada titik tengah).

**Langkah 5. Aspek keberlanjutan.** Keberlanjutan masuk lewat tuas 4 (kemasan lebih efisien), tuas 5 (berbagi aset dan backhaul mengurangi perjalanan kosong), tuas 2 (modal shift ke laut), tuas 7 (armada listrik dan solar), serta kemasan yang dapat dipakai ulang. Kemasan reusable dan right-size packaging tidak boleh dihitung dua kali. Pembagian tugasnya: Tantangan 4 mengukur modal, karbon, dan premi hijau, sedangkan Tantangan 6 mengukur biaya operasional per paket.

## MENGAPA

Pertama, mesin utama perbaikan adalah volume. Biaya tetap sebesar Rp 34,84 T sudah dibayar. Saat volume naik 21,4%, biaya per paket turun tanpa pemotongan apa pun. Tim yang hanya memotong biaya akan salah saat volume turun, karena biaya tetap tetap harus dibayar. Kedua, sensitivitas mendukung ini. Penurunan utilisasi 10 poin (61,8% ke 51,8%) menaikkan biaya per paket sekitar 6,8% pada porsi biaya tetap 35%. GC adalah bisnis skala, bukan bisnis efisiensi murni: yang menentukan biaya per paket adalah utilisasi, bukan harga input. Ketiga, angka dibuat bisa direkonsiliasi. Absorpsi dipisahkan dari tuas agar efek volume tidak dihitung dua kali, dan tuas transisi energi diberi syarat skala. Keempat, pendapatan dijaga karena tiga sumber baru berasal dari aset yang sudah dibayar, bukan dari tarif yang dinaikkan. Satu peringatan: seluruh argumen ini bergantung pada asumsi porsi biaya tetap 35%. Bila sebenarnya 25%, manfaat absorpsi Rp 5,33 T dan cost-to-sales akhir 28,74%; bila 45%, manfaat Rp 9,59 T dan cost-to-sales 27,96%. Rentang ini harus disajikan terbuka di slide.

---

## Penutup: Satu Tesis, Dua Angka

Keenam jawaban berakar pada satu diagnosis: GC punya aset yang sudah dibayar tetapi belum terpakai merata. Karena itu keputusannya adalah menyeimbangkan jaringan sebelum memperbesarnya, memperbaiki insentif COD sebelum menambah SOP, memakai sponsor hanya di hub yang tidak padat, mengelektrifikasi berdasarkan bukti pilot, dan menjual kapasitas kosong sebagai produk.

Dua angka penutup pada horizon 24 bulan:

| Metrik | Baseline 2023 | Target |
| --- | --- | --- |
| Utilisasi jaringan tertimbang | 61,8% | 75,0% |
| Cost-to-sales | 31,34% | 28,35%, atau 26,8% dengan sponsor selektif |

Sebelum dipakai untuk slide, tiga hal wajib dikerjakan: kunci BCR TCO dan NPV lewat spreadsheet arus kas dan TCO, verifikasi ulang seluruh angka pasar eksternal, dan hitung ulang tabel sensitivitas porsi biaya tetap.