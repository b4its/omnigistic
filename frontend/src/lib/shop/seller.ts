/**
 * Data penjual (role SELLER) — profil toko, HPP/margin produk, riwayat penjualan,
 * dan basis pelanggan untuk analisis berbasis skor.
 *
 * Semua angka adalah DEMO presentasi (bukan data studi kasus), konsisten dengan
 * katalog produk di `catalog.ts`. Tujuannya memberi dashboard analitik yang hidup:
 * laba/rugi, margin, tren penjualan, dan skor pelanggan.
 */
import { PRODUCTS, type Product } from "$lib/shop/catalog";

/** Produk yang dijual penjual ini (subset katalog, dengan HPP + stok). */
export interface SellerProduct {
  product: Product;
  /** Harga pokok penjualan per unit (Rupiah). */
  cost: number;
  /** Stok tersedia. */
  stock: number;
  /** Unit terjual 30 hari terakhir. */
  sold30: number;
  /** Jumlah retur/refund 30 hari terakhir. */
  returns30: number;
}

/** Riwayat penjualan harian (14 hari) untuk grafik tren. */
export interface DailySales {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Pendapatan kotor hari itu. */
  revenue: number;
  /** Laba kotor hari itu (setelah HPP). */
  profit: number;
  /** Jumlah pesanan. */
  orders: number;
}

/** Pelanggan dengan basis analisis skor. */
export interface CustomerRecord {
  id: string;
  name: string;
  city: string;
  /** Hari sejak pembelian terakhir (recency). */
  daysSinceLast: number;
  /** Jumlah pesanan (frequency). */
  orders: number;
  /** Total nilai belanja (monetary). */
  spend: number;
  /** Tingkat paket gagal antar (0..1). */
  failedRate: number;
  /** Metode bayar dominan. */
  payMethod: "COD" | "Transfer" | "Campuran";
}

/** Profil penjual. */
export const SELLER = {
  id: "ST-001",
  name: "Rina Kartika",
  store: "Toko Gadget & Gaya",
  city: "Bandung",
  since: 2021,
  rating: 4.8,
} as const;

/** HPP per produk (≈62–78% harga jual → margin sehat tapi realistis). */
const COST_RATIO: Record<string, number> = {
  "P-EL-01": 0.66,
  "P-EL-02": 0.68,
  "P-EL-03": 0.72,
  "P-EL-04": 0.7,
  "P-FA-01": 0.6,
  "P-FA-02": 0.64,
  "P-FA-03": 0.62,
  "P-RT-01": 0.66,
  "P-RT-02": 0.7,
  "P-RT-03": 0.74,
  "P-KS-01": 0.62,
  "P-KS-02": 0.68,
  "P-OR-01": 0.72,
  "P-OR-02": 0.76,
  "P-HB-01": 0.7,
  "P-HB-02": 0.66,
  "P-HB-03": 0.78,
};

/** Produk milik penjual: 12 dari katalog (bukan semuanya). */
const OWNED = [
  "P-EL-01",
  "P-EL-02",
  "P-EL-03",
  "P-EL-04",
  "P-FA-01",
  "P-FA-03",
  "P-RT-01",
  "P-RT-02",
  "P-KS-01",
  "P-KS-02",
  "P-HB-01",
  "P-HB-02",
];

/** Angka penjualan demo per produk (deterministik). */
const SOLD30: Record<string, number> = {
  "P-EL-01": 412,
  "P-EL-02": 189,
  "P-EL-03": 356,
  "P-EL-04": 640,
  "P-FA-01": 275,
  "P-FA-03": 198,
  "P-RT-01": 521,
  "P-RT-02": 143,
  "P-KS-01": 688,
  "P-KS-02": 905,
  "P-HB-01": 76,
  "P-HB-02": 164,
};

const RETURNS30: Record<string, number> = {
  "P-EL-01": 14,
  "P-EL-02": 11,
  "P-EL-03": 9,
  "P-EL-04": 21,
  "P-FA-01": 18,
  "P-FA-03": 13,
  "P-RT-01": 17,
  "P-RT-02": 8,
  "P-KS-01": 12,
  "P-KS-02": 19,
  "P-HB-01": 6,
  "P-HB-02": 7,
};

const STOCK: Record<string, number> = {
  "P-EL-01": 120,
  "P-EL-02": 45,
  "P-EL-03": 210,
  "P-EL-04": 480,
  "P-FA-01": 96,
  "P-FA-03": 72,
  "P-RT-01": 340,
  "P-RT-02": 58,
  "P-KS-01": 500,
  "P-KS-02": 720,
  "P-HB-01": 24,
  "P-HB-02": 88,
};

export const SELLER_PRODUCTS: SellerProduct[] = OWNED.flatMap((id) => {
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return [];
  return [
    {
      product,
      cost: Math.round(product.price * (COST_RATIO[id] ?? 0.7)),
      stock: STOCK[id] ?? 0,
      sold30: SOLD30[id] ?? 0,
      returns30: RETURNS30[id] ?? 0,
    },
  ];
});

/** Rentang tanggal 14 hari terakhir sebagai ISO (tanpa jam). */
function last14Days(): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Pola mingguan indeks 0=Senin..6=Minggu. getDay() JS = 0=Minggu..6=Sabtu,
// jadi indeks harus dikonversi dgn (dow + 6) % 7 agar hari tak bergeser.
const DAY_WEIGHT = [0.82, 0.91, 1.0, 1.08, 1.02, 1.24, 1.31]; // Senin..Minggu

/** Riwayat penjualan harian demo (14 hari, deterministik dari jumlah terjual). */
export const DAILY_SALES: DailySales[] = (() => {
  const days = last14Days();
  return days.map((date, i) => {
    const dow = new Date(date + "T00:00:00").getDay(); // 0=Min..6=Sab
    const weight = DAY_WEIGHT[(dow + 6) % 7]; // → indeks 0=Senin..6=Minggu
    const orders = Math.round(58 * weight + (i % 3));
    const revenue = Math.round(orders * 168000);
    const profit = Math.round(revenue * 0.31);
    return { date, revenue, profit, orders };
  });
})();

/** Basis pelanggan demo untuk analisis skor. */
export const CUSTOMERS: CustomerRecord[] = [
  { id: "C-001", name: "Sari Wulandari", city: "Jakarta", daysSinceLast: 3, orders: 14, spend: 4820000, failedRate: 0.04, payMethod: "Transfer" },
  { id: "C-002", name: "Budi Santoso", city: "Depok", daysSinceLast: 41, orders: 6, spend: 1740000, failedRate: 0.22, payMethod: "COD" },
  { id: "C-003", name: "Maya Lestari", city: "Bandung", daysSinceLast: 8, orders: 9, spend: 3150000, failedRate: 0.1, payMethod: "COD" },
  { id: "C-004", name: "Agus Pratama", city: "Tangerang", daysSinceLast: 2, orders: 21, spend: 7350000, failedRate: 0.02, payMethod: "Transfer" },
  { id: "C-005", name: "Nadia Putri", city: "Bogor", daysSinceLast: 19, orders: 4, spend: 980000, failedRate: 0.18, payMethod: "Campuran" },
  { id: "C-006", name: "Rizky Hidayat", city: "Surabaya", daysSinceLast: 6, orders: 11, spend: 2660000, failedRate: 0.09, payMethod: "COD" },
  { id: "C-007", name: "Intan Permata", city: "Jakarta", daysSinceLast: 55, orders: 3, spend: 640000, failedRate: 0.31, payMethod: "COD" },
  { id: "C-008", name: "Fajar Nugroho", city: "Depok", daysSinceLast: 12, orders: 7, spend: 1890000, failedRate: 0.14, payMethod: "Campuran" },
];
