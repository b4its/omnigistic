import { m } from "$lib/paraglide/messages";
/**
 * Katalog produk marketplace Omnigistic (role CUSTOMER).
 *
 * Data demo untuk alur belanja end-to-end: katalog → search → keranjang →
 * checkout (alamat + metode bayar) → Predictive COD → pengantaran.
 *
 * Harga dalam Rupiah. `codEligible` menandai produk yang boleh dibayar di tempat
 * (dipakai sebagai fitur input ke model Predictive COD).
 */

import type { IconName } from "$lib/icon-names";

export interface Product {
  id: string;
  name: string;
  /** Kategori untuk filter. */
  category: string;
  /** Harga dalam Rupiah. */
  price: number;
  /** Harga sebelum diskon (untuk badge). Opsional. */
  strikePrice?: number;
  /** Rating 0–5. */
  rating: number;
  /** Jumlah ulasan. */
  sold: number;
  /** Kota penjual (asal paket). */
  store: string;
  /** Berat per unit (kg) — memengaruhi ongkir. */
  weightKg: number;
  /** Boleh dibayar di tempat? */
  codEligible: boolean;
  /** Ikon tema (bukan emoji) untuk visual kartu. */
  icon: IconName;
  /** Warna aksen kartu (CSS token). */
  accent: string;
  /** Deskripsi singkat. */
  desc: string;
  /** Label/lencana. */
  tags?: string[];
}

export const CATEGORIES = ["Semua", "Elektronik", "Fashion", "Rumah Tangga", "Kesehatan", "Olahraga", "Hobi"] as const;

export const PRODUCTS: Product[] = [
  {
    id: "P-EL-01",
    name: "TWS Bluetooth Earbuds Pro",
    category: "Elektronik",
    price: 189000,
    strikePrice: 299000,
    rating: 4.8,
    sold: 12430,
    store: "Jakarta",
    weightKg: 0.2,
    codEligible: true,
    icon: "activity",
    accent: "var(--color-chart-1)",
    desc: "Earbuds TWS Active Noise Cancelling, baterai 36 jam, cocok untuk kerja & olahraga.",
    tags: ["Terlaris", "COD"],
  },
  {
    id: "P-EL-02",
    name: "Smartwatch Fitness S2",
    category: "Elektronik",
    price: 349000,
    strikePrice: 549000,
    rating: 4.6,
    sold: 8210,
    store: "Bandung",
    weightKg: 0.35,
    codEligible: true,
    icon: "clock",
    accent: "var(--color-chart-2)",
    desc: "Jam pintar dengan monitor detak jantung, SpO2, 100+ mode olahraga, tahan air IP68.",
    tags: ["COD"],
  },
  {
    id: "P-EL-03",
    name: "Power Bank 20.000 mAh",
    category: "Elektronik",
    price: 165000,
    rating: 4.7,
    sold: 15220,
    store: "Surabaya",
    weightKg: 0.45,
    codEligible: true,
    icon: "zap",
    accent: "var(--color-chart-3)",
    desc: "Fast charging 22.5W, 3 output, aman untuk perjalanan jauh.",
  },
  {
    id: "P-EL-04",
    name: "Kipas Angin Mini USB",
    category: "Elektronik",
    price: 45000,
    strikePrice: 79000,
    rating: 4.4,
    sold: 24890,
    store: "Bekasi-Karawang",
    weightKg: 0.3,
    codEligible: true,
    icon: "activity",
    accent: "var(--color-chart-4)",
    desc: "Kipas portabel 3 kecepatan, bisa diisi ulang, hemat daya.",
    tags: ["Hemat"],
  },
  {
    id: "P-FA-01",
    name: "Kemeja Flanel Oversize",
    category: "Fashion",
    price: 129000,
    strikePrice: 199000,
    rating: 4.5,
    sold: 9830,
    store: "Bandung",
    weightKg: 0.4,
    codEligible: true,
    icon: "box",
    accent: "var(--color-chart-1)",
    desc: "Bahan katun flanel, unisex, tersedia banyak motif. Nyaman untuk cuaca tropis.",
    tags: ["COD"],
  },
  {
    id: "P-FA-02",
    name: "Sneakers Running Airflex",
    category: "Fashion",
    price: 289000,
    strikePrice: 459000,
    rating: 4.7,
    sold: 6120,
    store: "Jakarta",
    weightKg: 0.8,
    codEligible: true,
    icon: "route",
    accent: "var(--color-chart-5)",
    desc: "Sepatu lari ringan dengan bantalan responsif, outsole anti-slip.",
    tags: ["COD"],
  },
  {
    id: "P-FA-03",
    name: "Tas Ransel Anti Air 25 liter",
    category: "Fashion",
    price: 179000,
    rating: 4.6,
    sold: 7440,
    store: "Surabaya",
    weightKg: 0.7,
    codEligible: true,
    icon: "box",
    accent: "var(--color-chart-2)",
    desc: "Ransel laptop 15,6\", bahan polyester anti air, banyak kompartemen.",
  },
  {
    id: "P-RT-01",
    name: "Tumbler Stainless 500ml",
    category: "Rumah Tangga",
    price: 89000,
    strikePrice: 129000,
    rating: 4.5,
    sold: 18760,
    store: "Bandung",
    weightKg: 0.4,
    codEligible: true,
    icon: "cube",
    accent: "var(--color-chart-3)",
    desc: "Botol minum tahan panas/dingin 12 jam, bebas BPA.",
    tags: ["Hemat", "COD"],
  },
  {
    id: "P-RT-02",
    name: "Lampu Meja LED Touch",
    category: "Rumah Tangga",
    price: 119000,
    rating: 4.4,
    sold: 5310,
    store: "Bekasi-Karawang",
    weightKg: 0.6,
    codEligible: true,
    icon: "zap",
    accent: "var(--color-chart-4)",
    desc: "Lampu baca 3 mode warna, kontrol sentuh, adaptor USB.",
  },
  {
    id: "P-RT-03",
    name: "Rak Dapur Serbaguna 3 Tingkat",
    category: "Rumah Tangga",
    price: 159000,
    strikePrice: 229000,
    rating: 4.3,
    sold: 4120,
    store: "Surabaya",
    weightKg: 1.8,
    codEligible: false,
    icon: "box",
    accent: "var(--color-chart-5)",
    desc: "Rak besi kokoh untuk dapur/kamar mandi, perakitan mudah.",
    tags: ["Berat"],
  },
  {
    id: "P-KS-01",
    name: "Vitamin C 1000mg (60 tablet)",
    category: "Kesehatan",
    price: 69000,
    strikePrice: 99000,
    rating: 4.8,
    sold: 21540,
    store: "Jakarta",
    weightKg: 0.15,
    codEligible: true,
    icon: "shield",
    accent: "var(--color-chart-1)",
    desc: "Suplemen daya tahan tubuh, kemasan 60 tablet, BPOM.",
    tags: ["COD"],
  },
  {
    id: "P-KS-02",
    name: "Masker KN95 (isi 20)",
    category: "Kesehatan",
    price: 35000,
    rating: 4.6,
    sold: 32100,
    store: "Bekasi-Karawang",
    weightKg: 0.1,
    codEligible: true,
    icon: "shield",
    accent: "var(--color-chart-2)",
    desc: "Masker 5 lapis, perlindungan partikel halus, nyaman dipakai harian.",
    tags: ["Hemat"],
  },
  {
    id: "P-OR-01",
    name: "Matras Yoga Anti Slip 8mm",
    category: "Olahraga",
    price: 99000,
    strikePrice: 149000,
    rating: 4.5,
    sold: 6780,
    store: "Bandung",
    weightKg: 1.5,
    codEligible: false,
    icon: "target",
    accent: "var(--color-chart-3)",
    desc: "Matras tebal nyaman, permukaan anti slip, mudah digulung.",
    tags: ["Berat"],
  },
  {
    id: "P-OR-02",
    name: "Dumbbell Set 10kg Adjustable",
    category: "Olahraga",
    price: 249000,
    rating: 4.4,
    sold: 3240,
    store: "Surabaya",
    weightKg: 10.0,
    codEligible: false,
    icon: "gauge",
    accent: "var(--color-chart-4)",
    desc: "Set angkat beban rumahan, plat dapat dilepas, gagang bertekstur.",
    tags: ["Berat"],
  },
  {
    id: "P-HB-01",
    name: "Action Figure Koleksi Limited",
    category: "Hobi",
    price: 219000,
    strikePrice: 329000,
    rating: 4.9,
    sold: 2870,
    store: "Jakarta",
    weightKg: 0.5,
    codEligible: true,
    icon: "sparkles",
    accent: "var(--color-chart-5)",
    desc: "Figur edisi terbatas, detail tinggi, box eksklusif untuk kolektor.",
    tags: ["Kolektor", "COD"],
  },
  {
    id: "P-HB-02",
    name: "Set Lego Bricks 500 pcs",
    category: "Hobi",
    price: 159000,
    rating: 4.7,
    sold: 5930,
    store: "Bandung",
    weightKg: 0.9,
    codEligible: true,
    icon: "cube",
    accent: "var(--color-chart-1)",
    desc: "Mainan edukatif balok susun, melatih kreativitas anak.",
  },
  {
    id: "P-HB-03",
    name: "Kamera Instan Mini",
    category: "Hobi",
    price: 899000,
    strikePrice: 1199000,
    rating: 4.8,
    sold: 1140,
    store: "Jakarta",
    weightKg: 0.6,
    codEligible: true,
    icon: "eye",
    accent: "var(--color-chart-2)",
    desc: "Kamera cetak instan, hasil foto langsung jadi, cocok untuk hadiah.",
    tags: ["Premium", "COD"],
  },
];

/** Cari produk berdasarkan kata kunci (nama, kategori, store, deskripsi). */

/* ── Lapisan lokalisasi tampilan ─────────────────────────────────────────
   Data katalog sengaja tetap statis (id, harga, stok) agar logika filter dan
   turunan penjual tidak ikut berubah. Hanya teks yang dilihat pengguna yang
   diselesaikan saat render, memakai id produk sebagai kunci stabil.
   ──────────────────────────────────────────────────────────────────────── */
const NAME_BY_ID: Record<string, () => string> = {
  "P-EL-01": () => m.prdn01(),
  "P-EL-02": () => m.prdn02(),
  "P-EL-03": () => m.prdn03(),
  "P-EL-04": () => m.prdn04(),
  "P-FA-01": () => m.prdn05(),
  "P-FA-02": () => m.prdn06(),
  "P-FA-03": () => m.prdn07(),
  "P-RT-01": () => m.prdn08(),
  "P-RT-02": () => m.prdn09(),
  "P-RT-03": () => m.prdn10(),
  "P-KS-01": () => m.prdn11(),
  "P-KS-02": () => m.prdn12(),
  "P-OR-01": () => m.prdn13(),
  "P-OR-02": () => m.prdn14(),
  "P-HB-01": () => m.prdn15(),
  "P-HB-02": () => m.prdn16(),
  "P-HB-03": () => m.prdn17()
};

const DESC_BY_ID: Record<string, () => string> = {
  "P-EL-01": () => m.prdd01(),
  "P-EL-02": () => m.prdd02(),
  "P-EL-03": () => m.prdd03(),
  "P-EL-04": () => m.prdd04(),
  "P-FA-01": () => m.prdd05(),
  "P-FA-02": () => m.prdd06(),
  "P-FA-03": () => m.prdd07(),
  "P-RT-01": () => m.prdd08(),
  "P-RT-02": () => m.prdd09(),
  "P-RT-03": () => m.prdd10(),
  "P-KS-01": () => m.prdd11(),
  "P-KS-02": () => m.prdd12(),
  "P-OR-01": () => m.prdd13(),
  "P-OR-02": () => m.prdd14(),
  "P-HB-01": () => m.prdd15(),
  "P-HB-02": () => m.prdd16(),
  "P-HB-03": () => m.prdd17()
};

const TAG_LABEL: Record<string, () => string> = {
  Terlaris: () => m.tg01(),
  COD: () => m.tg02(),
  Hemat: () => m.tg03(),
  Berat: () => m.tg04(),
  Kolektor: () => m.tg05(),
  Premium: () => m.tg06()
};

const CATEGORY_LABEL: Record<string, () => string> = {
  Semua: () => m.ct01(),
  Elektronik: () => m.ct02(),
  Fashion: () => m.ct03(),
  "Rumah Tangga": () => m.ct04(),
  Kesehatan: () => m.ct05(),
  Olahraga: () => m.ct06(),
  Hobi: () => m.ct07()
};

/** Nama produk sesuai locale; `fallback` dipakai untuk produk di luar katalog. */
export function productName(id: string, fallback = ""): string {
  return NAME_BY_ID[id]?.() ?? fallback;
}

/** Deskripsi produk sesuai locale. */
export function productDesc(id: string, fallback = ""): string {
  return DESC_BY_ID[id]?.() ?? fallback;
}

/** Label tag produk sesuai locale (nilai tag tetap sebagai ID data). */
export function tagLabel(tag: string): string {
  return TAG_LABEL[tag]?.() ?? tag;
}

/** Label kategori sesuai locale (nilai kategori tetap sebagai ID data). */
export function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category]?.() ?? category;
}

export function searchProducts(query: string, category: string = "Semua"): Product[] {
  const q = query.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    const inCat = category === "Semua" || p.category === category;
    if (!inCat) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.store.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q)
    );
  });
}

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Format harga Rupiah. */
export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
