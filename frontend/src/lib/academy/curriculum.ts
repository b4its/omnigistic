/**
 * Kurikulum Nigi Academy — data terpusat (single source of truth) untuk platform
 * pembelajaran end-to-end. Setiap track → module → lesson; lesson bisa punya kuis.
 *
 * Prinsip isi mengikuti studi kasus ISCEA 2026 (GC Logistics): tiap angka operasional
 * berasal dari Table 1-4 / Figure 1-2, sedangkan ilustrasi simulasi berlabel "prototipe".
 */

export type Role = "PUSAT" | "HUB" | "KURIR" | "DATA";

export interface QuizOption {
  /** Teks jawaban. */
  label: string;
  /** Bila true, ini jawaban benar. */
  correct?: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  /** Penjelasan singkat muncul setelah dijawab. */
  explain: string;
}

export interface Lesson {
  slug: string;
  title: string;
  /** Estimasi menit baca. */
  minutes: number;
  /** Ringkas 1 baris untuk kartu. */
  summary: string;
  /** Poin utama sebagai bullet. */
  points: string[];
  /** Studi kasus / contoh konkret. */
  caseNote?: string;
  /** Kuis opsional di akhir pelajaran. */
  quiz?: QuizQuestion[];
}

export interface Module {
  slug: string;
  title: string;
  summary: string;
  lessons: Lesson[];
}

export interface Track {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  /** Role utama yang relevan; "ALL" untuk semua. */
  audience: Role | "ALL";
  level: "Dasar" | "Menengah" | "Lanjut";
  icon: string;
  /** Nama piktogram warna (token CSS) untuk aksen kartu. */
  accent: string;
  /** Akar masalah studi kasus yang dilatih (RC1..RC6) — untuk penautan ke Methodology. */
  rootCauses: string[];
  outcomes: string[];
  modules: Module[];
}

export const TRACKS: Track[] = [
  {
    slug: "fondasi-omnigistic",
    title: "Fondasi Omnigistic",
    tagline: "Kenali sistem, aktor, dan alur operasi last-mile.",
    description:
      "Track pembuka untuk semua peran. Memahami rantai Collect–Sort–Transport–Deliver, enam akar masalah GC Logistics, dan bagaimana Omnigistic merespons tiap akar dengan modul data + ML.",
    audience: "ALL",
    level: "Dasar",
    icon: "compass",
    accent: "var(--color-chart-1)",
    rootCauses: ["RC1", "RC2"],
    outcomes: [
      "Menjelaskan alur operasi Collect → Sort → Transport → Deliver",
      "Memetakan enam akar masalah ke solusi dan KPI-nya",
      "Membaca angka kunci studi kasus (23 hub, 90,4% Jakarta, COD 138 menit)",
    ],
    modules: [
      {
        slug: "peta-sistem",
        title: "Peta Sistem",
        summary: "Bagaimana paket bergerak dan di mana nilai bocor.",
        lessons: [
          {
            slug: "alur-last-mile",
            title: "Alur Last-Mile dalam 4 Tahap",
            minutes: 6,
            summary: "Collect, Sort, Transport, Deliver — dan bottleneck di tiap tahap.",
            points: [
              "Collect: paket dijemput dari merchant/individu; 62% alamat dari merchant, 38% individu.",
              "Sort: penyortiran di 23 hub; Jakarta sudah 90,4% utilisasi (kapasitas 0,563 juta/hari).",
              "Transport: 840 line-haul menghubungkan hub; 2 dari 3 moda masih lewat pihak ketiga.",
              "Deliver: last-mile 70% di kota besar memakai motor dari 14.180 unit armada.",
            ],
            caseNote:
              "Rute COD menempuh 8 paket dalam 138 menit, non-COD hanya 75 menit untuk jarak 5,3 km yang sama.",
            quiz: [
              {
                id: "q1",
                prompt: "Tahap mana yang menampung bottleneck utilisasi Jakarta 90,4%?",
                options: [
                  { label: "Collect" },
                  { label: "Sort", correct: true },
                  { label: "Transport" },
                  { label: "Deliver" },
                ],
                explain: "Titik penyortiran di hub Jakarta lah yang berutilisasi 90,4% — di atas ambang 65%.",
              },
            ],
          },
          {
            slug: "enam-akar",
            title: "Enam Akar Masalah",
            minutes: 8,
            summary: "Gejala → akar → solusi → KPI, kerangka problem-first.",
            points: [
              "RC1 Ekspansi tanpa keselarasan kapasitas-demand → hibrida Direct vs Regional Sponsor.",
              "RC2 Kapasitas fixed vs demand fluktuatif → kapasitas elastis 3 tingkat + forecast.",
              "RC3 Last-mile manual & cash-based → Predictive COD + clustering + PUDO.",
              "RC4 Data tidak terstandar & buta multimoda → Address Intelligence + Control Tower.",
              "RC5 Kapabilitas tertinggal → Nigi Academy + tim data internal + Digital Twin.",
              "RC6 Keberlanjutan sebagai pembelian → roadmap EV + penyusutan 8 tahun.",
            ],
            quiz: [
              {
                id: "q2",
                prompt: "Akar mana yang langsung ditangani oleh Nigi Academy?",
                options: [
                  { label: "RC2 — kapasitas fixed" },
                  { label: "RC5 — kapabilitas tertinggal", correct: true },
                  { label: "RC6 — keberlanjutan" },
                ],
                explain: "Nigi Academy menutup akar RC5 (kapabilitas) lewat sertifikasi SDM 18 bulan.",
              },
            ],
          },
        ],
      },
      {
        slug: "angka-kunci",
        title: "Angka Kunci Studi Kasus",
        summary: "Hafalkan angka yang selalu dikutip saat presentasi.",
        lessons: [
          {
            slug: "angka-operasional",
            title: "Angka Operasional & Finansial",
            minutes: 7,
            summary: "Pangsa pasar, volume, jaringan, dan biaya.",
            points: [
              "Pangsa pasar 20,6% (2024), pemimpin lima tahun berturut-turut.",
              "Volume naik dari 1,14 miliar (2023) ke 1,46 miliar paket (2024), +28%.",
              "Jaringan 2020→2023: hub 10→23, outlet 750→2.500, line-haul 545→840.",
              "Fulfilment 32,34→50,08 T (+54,9%) lebih cepat dari net sales 213,64→317,63 T (+48,7%).",
              "Selisih 6,2 poin inilah gejala profitabilitas: biaya tumbuh lebih cepat dari pendapatan.",
            ],
            caseNote: "Complaint rate 5,5 per juta paket (2023) ≈ 6.105 kasus dari 1.110 juta paket.",
          },
        ],
      },
    ],
  },
  {
    slug: "operasi-hub",
    title: "Operasi Hub & Kapasitas",
    tagline: "Kelola utilisasi, forecast, dan load balancing 23 hub.",
    description:
      "Track untuk Manajer Hub. Mempelajari cara membaca utilisasi hub, memprediksi demand, menyeimbangkan beban antar-hub, dan merespons capacity alert sebelum overload.",
    audience: "HUB",
    level: "Menengah",
    icon: "globe",
    accent: "var(--color-chart-2)",
    rootCauses: ["RC2"],
    outcomes: [
      "Membaca utilisasi hub relatif terhadap ambang 65%",
      "Membaca forecast demand dan event promo/regulasi",
      "Menerapkan load balancing antar-hub",
      "Merespons capacity alert secara tepat",
    ],
    modules: [
      {
        slug: "utilisasi",
        title: "Utilisasi & Kapasitas",
        summary: "Mengetahui kapan hub aman, siaga, atau overload.",
        lessons: [
          {
            slug: "membaca-utilisasi",
            title: "Membaca Utilisasi Hub",
            minutes: 6,
            summary: "Ambang 65% dan selisih timur-barat.",
            points: [
              "Bandung 68,9% — 3,9 poin di atas ambang; masuk kategori 'siaga'.",
              "Jakarta 90,4% — overload; kapasitas 0,563 juta/hari, 420 outlet.",
              "Jayapura 28,1% — underutilized; kapasitas 0,082 juta/hari, 55 outlet.",
              "Selisih timur-barat mencapai 62,3 poin; rata-rata hub timur di bawah 50%.",
            ],
            quiz: [
              {
                id: "q1",
                prompt: "Hub Bandung 68,9% termasuk kategori apa?",
                options: [
                  { label: "Aman (<50%)" },
                  { label: "Siaga (65–80%)", correct: true },
                  { label: "Overload (>80%)" },
                ],
                explain: "65–80% = siaga: perlu perhatian sebelum menembus overload.",
              },
            ],
          },
          {
            slug: "demand-forecast",
            title: "Forecast & Kalender Event",
            minutes: 7,
            summary: "Membaca pola musiman dan guncangan platform.",
            points: [
              "Demand 2023 bergerak 78→105 juta paket/bulan, total 1.110 juta.",
              "Suspensi TikTok Shop Okt 2023 → e-commerce turun 29,8% dari Sep ke Okt.",
              "Harbolnas Nov memberi lonjakan; pemulihan berlanjut Nov–Des.",
              "Forecast memakai seasonal-index + trend + event-flag (bukan black-box).",
            ],
            caseNote: "Guncangan platform menegaskan pentingnya diversifikasi kanal dan buffer kapasitas.",
          },
        ],
      },
      {
        slug: "load-balancing",
        title: "Load Balancing",
        summary: "Memindahkan beban dari hub padat ke hub longgar.",
        lessons: [
          {
            slug: "prinsip-balancing",
            title: "Prinsip Load Balancing",
            minutes: 6,
            summary: "Menyeimbangkan utilisasi tanpa menambah capex.",
            points: [
              "Utamakan hub dengan utilisasi <65% sebagai penyerap beban.",
              "Pertimbangkan jarak & biaya line-haul saat memindahkan volume.",
              "Digital Twin menguji skenario realokasi beban sebelum eksekusi nyata.",
            ],
            quiz: [
              {
                id: "q1",
                prompt: "Skenario beban dipindahkan ke hub dengan utilisasi...",
                options: [
                  { label: "Tertinggi dulu" },
                  { label: "Terendah dulu", correct: true },
                  { label: "Acak" },
                ],
                explain: "Hub berutilisasi rendah punya kapasitas longgar untuk menyerap beban.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "last-mile-cod",
    title: "Last-Mile & Predictive COD",
    tagline: "Percepat pengantaran berbasis tunai dengan data.",
    description:
      "Track untuk Kurir. Mempelajari mengapa rute COD lebih lambat, bagaimana risk scoring bekerja, dan cara memakai PUDO serta slot confirmation untuk menekan waktu antar.",
    audience: "KURIR",
    level: "Menengah",
    icon: "currency",
    accent: "var(--color-chart-4)",
    rootCauses: ["RC3"],
    outcomes: [
      "Menjelaskan penyebab COD lebih lambat (138 vs 75 menit)",
      "Membaca skor risiko COD per paket",
      "Menerapkan taktik slot confirmation & PUDO",
      "Menghitung dampak kapasitas dari pembayaran digital",
    ],
    modules: [
      {
        slug: "anatomi-cod",
        title: "Anatomi COD",
        summary: "Mengapa tunai memperlambat kurir.",
        lessons: [
          {
            slug: "cod-vs-non-cod",
            title: "COD vs Non-COD",
            minutes: 7,
            summary: "Angka produktivitas dan waktu per upaya.",
            points: [
              "8 paket COD = 138 menit; non-COD = 75 menit untuk 5,3 km yang sama.",
              "Produktivitas 3,48 vs 6,4 paket/jam — hampir separuh.",
              "Setiap upaya gagal menambah tunggu 10–20 menit.",
              "COD membuat kurir jadi 'kasir berjalan': verifikasi identitas, tunggu uang siap.",
            ],
            quiz: [
              {
                id: "q1",
                prompt: "Berapa produktivitas COD vs non-COD?",
                options: [
                  { label: "3,48 vs 6,4 paket/jam", correct: true },
                  { label: "5,0 vs 6,0 paket/jam" },
                  { label: "6,4 vs 3,48 paket/jam" },
                ],
                explain: "COD 3,48; non-COD 6,4 paket/jam — COD hampir setengah produktivitas.",
              },
            ],
          },
          {
            slug: "risk-scoring",
            title: "Predictive COD Risk Scoring",
            minutes: 8,
            summary: "Skor 0–1 untuk memutuskan antar normal, PUDO, atau pre-payment.",
            points: [
              "Model Logistic Regression dilatih pada data sintetik ber-logika kasus (prototipe).",
              "Fitur: utilisasi hub, nilai paket, jam antar, alamat ambigu, zona sulit.",
              "Skor <0,35 → antar normal; 0,35–0,65 → konfirmasi/PUDO; ≥0,65 → PUDO/pre-payment.",
              "Setiap keputusan transparan: ada kontribusi tiap fitur (why & how).",
            ],
            caseNote: "Contoh: paket nilai 320rb, jam 19, alamat ambigu, zona sulit → skor tinggi → dialihkan.",
          },
        ],
      },
      {
        slug: "taktik-lapangan",
        title: "Taktik Lapangan",
        summary: "Slot, PUDO, dan pembayaran digital.",
        lessons: [
          {
            slug: "slot-pudo",
            title: "Slot Confirmation & PUDO",
            minutes: 6,
            summary: "Konfirmasi kesiapan penerima sebelum berangkat.",
            points: [
              "H-1 beri tahu; 30–60 menit sebelum tiba minta konfirmasi kesiapan.",
              "Bila belum siap → arahkan ke PUDO terdekat alih-alih menunggu.",
              "PUDO memutus siklus 'kurir menunggu penerima'.",
            ],
          },
          {
            slug: "digital-payment",
            title: "Dampak Pembayaran Digital",
            minutes: 6,
            summary: "Menghitung kapasitas yang dibebaskan.",
            points: [
              "Pembayaran digital memotong waktu verifikasi kas di depan pintu.",
              "Simulasi: pada 60% beralih digital, waktu rute turun dari 138→~100 menit.",
              "Kapasitas per jam naik ~30% tanpa menambah kurir.",
            ],
            quiz: [
              {
                id: "q1",
                prompt: "Tujuan utama PUDO adalah...",
                options: [
                  { label: "Menambah jumlah paket" },
                  { label: "Mengurangi waktu kurir menunggu", correct: true },
                  { label: "Menaikkan biaya" },
                ],
                explain: "PUDO memindahkan titik temu sehingga kurir tidak menunggu di depan pintu.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "data-intelegensi",
    title: "Data & Address Intelligence",
    tagline: "Standarkan data, bongkar alamat ambigu.",
    description:
      "Track untuk tim Data & IT. Mempelajari resolusi alamat ambigu, monitoring komplain, control tower multimoda, serta pelacakan armada dan emisi.",
    audience: "DATA",
    level: "Lanjut",
    icon: "map",
    accent: "var(--color-chart-3)",
    rootCauses: ["RC4", "RC6"],
    outcomes: [
      "Menjelaskan mengapa satu alamat bisa ambigu (kandidat berjauhan)",
      "Membaca complaint rate dan targetnya",
      "Memahami peran Control Tower multimoda",
      "Menghitung basis emisi armada",
    ],
    modules: [
      {
        slug: "alamat",
        title: "Address Intelligence",
        summary: "Fuzzy matching & skor kandidat lokasi.",
        lessons: [
          {
            slug: "alamat-ambigu",
            title: "Mengapa Alamat Bisa Ambigu",
            minutes: 7,
            summary: "Satu nama jalan, tiga kota.",
            points: [
              "'Jl. Raya Jakarta-Bogor No.12' muncul di Cibinong, Depok, dan Tangsel — berjarak puluhan km.",
              "Resolver memberi skor tiap kandidat + ETA, bukan menebak diam-diam.",
              "Geotag wajib saat checkout memangkas ambiguitas di sumber.",
              "Target: geotag ≥95%, komplain <3 per juta paket.",
            ],
            quiz: [
              {
                id: "q1",
                prompt: "Berapa complaint rate 2023 yang jadi baseline?",
                options: [
                  { label: "5,5 per juta paket", correct: true },
                  { label: "3 per juta paket" },
                  { label: "10 per juta paket" },
                ],
                explain: "Baseline 5,5/juta (≈6.105 kasus); target <3/juta.",
              },
            ],
          },
        ],
      },
      {
        slug: "control-tower",
        title: "Control Tower & Fleet",
        summary: "Visibilitas multimoda dan jejak karbon.",
        lessons: [
          {
            slug: "tower-multimoda",
            title: "Control Tower Multimoda",
            minutes: 6,
            summary: "Mengawasi perpindahan antar moda.",
            points: [
              "Dua dari tiga moda berjalan lewat pihak ketiga; visibilitas kunci.",
              "Modal shift memindahkan volume ke jalur yang lebih efisien.",
              "Control Tower menyatukan status sort → transport → deliver.",
            ],
          },
          {
            slug: "fleet-emisi",
            title: "Armada & Emisi",
            minutes: 7,
            summary: "Basis 14.180 unit dan target EV.",
            points: [
              "Armada: 12.500 motor, 280 van, 560 truk, 840 line-haul = 14.180 unit.",
              "Motor 93,7% armada; 70% last-mile kota besar via motor.",
              "Target 200 kendaraan bersih akhir 2026 ≈ 1,4% armada (asumsi tim).",
              "Roadmap 3 fase + penyusutan 8 tahun menghindari lonjakan capex.",
            ],
            quiz: [
              {
                id: "q1",
                prompt: "Berapa total unit armada?",
                options: [
                  { label: "12.500" },
                  { label: "14.180", correct: true },
                  { label: "840" },
                ],
                explain: "12.500 + 280 + 560 + 840 = 14.180 unit.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "strategi-pusat",
    title: "Strategi & Digital Twin",
    tagline: "Uji keputusan strategis sebelum dieksekusi.",
    description:
      "Track untuk Manajer Pusat. Mempelajari analisis finansial, digital twin untuk skenario sponsor regional, dan ROI manfaat-biaya.",
    audience: "PUSAT",
    level: "Lanjut",
    icon: "chart",
    accent: "var(--color-chart-5)",
    rootCauses: ["RC1", "RC5"],
    outcomes: [
      "Membaca tren cost-to-sales",
      "Menjalankan skenario Digital Twin",
      "Menilai ROI manfaat-biaya",
    ],
    modules: [
      {
        slug: "finansial",
        title: "Membaca Finansial",
        summary: "Cost-to-sales dan titik balik EBIT.",
        lessons: [
          {
            slug: "cost-to-sales",
            title: "Cost-to-Sales",
            minutes: 7,
            summary: "Rasio biaya fulfillment+shipping terhadap penjualan.",
            points: [
              "2023: (fulfilment 50,08 + shipping 49,46) / net sales 317,63 ≈ 31,3%.",
              "Fulfilment tumbuh 54,9%, lebih cepat dari sales 48,7%.",
              "Rugi 2023, EBIT positif 2024 → tiap poin cost-to-sales berdampak besar.",
            ],
            quiz: [
              {
                id: "q1",
                prompt: "Berapa kira-kira cost-to-sales 2023?",
                options: [
                  { label: "31,3%", correct: true },
                  { label: "20,6%" },
                  { label: "48,7%" },
                ],
                explain: "(50,08 + 49,46) / 317,63 ≈ 31,3%.",
              },
            ],
          },
        ],
      },
      {
        slug: "digital-twin",
        title: "Digital Twin",
        summary: "Skenario sponsor regional vs direct.",
        lessons: [
          {
            slug: "skenario-sponsor",
            title: "Skenario Regional Sponsor",
            minutes: 8,
            summary: "Menguji hibrida Direct vs Sponsor per region.",
            points: [
              "Direct = Omnigistic kelola langsung; Sponsor = mitra lokal kelola dengan standar Omnigistic.",
              "Skenario 'Semua Region Sponsor Penuh' mengangkat utilisasi timur ~51,5%.",
              "Capex saving bergantung porsi sponsor dan fulfilment tahunan.",
              "Alat uji keputusan — bukan ramalan, tapi pembanding skenario.",
            ],
            quiz: [
              {
                id: "q1",
                prompt: "Digital Twin terutama dipakai untuk...",
                options: [
                  { label: "Memberi hasil pasti" },
                  { label: "Membandingkan skenario", correct: true },
                  { label: "Mengganti kasir" },
                ],
                explain: "Digital Twin adalah alat uji keputusan untuk membandingkan skenario.",
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getTrack(slug: string): Track | undefined {
  return TRACKS.find((t) => t.slug === slug);
}

/**
 * Slug yang dipakai segmen route statis di bawah `[track]/` (mis. halaman sertifikat).
 * Segmen statis menang atas `[lesson]`, jadi slug pelajaran tidak boleh bernilai ini.
 */
export const RESERVED_LESSON_SLUGS = ["sertifikat"] as const;

export function getLesson(trackSlug: string, lessonSlug: string): { track: Track; module: Module; lesson: Lesson } | undefined {
  const track = getTrack(trackSlug);
  if (!track) return undefined;
  // Slug pelajaran wajib unik dalam satu track (dipakai langsung sebagai segmen URL).
  for (const m of track.modules) {
    const lesson = m.lessons.find((l) => l.slug === lessonSlug);
    if (lesson) return { track, module: m, lesson };
  }
  return undefined;
}

/** Semua pelajaran sebuah track dalam urutan tampil (untuk progress & navigasi next/prev). */
export function trackLessons(track: Track): Lesson[] {
  return track.modules.flatMap((m) => m.lessons);
}

/** Total menit sebuah track. */
export function trackMinutes(track: Track): number {
  return trackLessons(track).reduce((s, l) => s + l.minutes, 0);
}
