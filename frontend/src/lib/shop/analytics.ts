import { m } from "$lib/paraglide/messages";
/**
 * Analitik penjual (role SELLER) — turunan dari `seller.ts`.
 *
 * Menghitung laba/rugi, margin, kontribusi produk, dan SKOR PELANGGAN berbasis
 * RFM (Recency–Frequency–Monetary) + risiko gagal antar. Semua pure function
 * sehingga mudah diuji dan dipakai di beberapa halaman.
 */
import { SELLER_PRODUCTS, DAILY_SALES, CUSTOMERS, type SellerProduct, type DailySales, type CustomerRecord } from "$lib/shop/seller";

/** Ringkasan laba/rugi periode 30 hari. */
export interface PnlSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  returnsCost: number;
  netProfit: number;
  netMarginPct: number;
  orders: number;
  unitsSold: number;
  avgOrderValue: number;
}

/** Metrik per produk untuk tabel & kontribusi. */
export interface ProductMetric {
  sp: SellerProduct;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  returnValue: number;
  returnRatePct: number;
  netProfit: number;
  stockValue: number;
  /** kontribusi terhadap total laba kotor (%). */
  profitSharePct: number;
}

/** Skor pelanggan (0–100) + segmen. */
export interface CustomerScore {
  record: CustomerRecord;
  /** 0–100 skor gabungan. */
  score: number;
  /** komponen 0–100. */
  recency: number;
  frequency: number;
  monetary: number;
  /** penalti risiko 0–100 (gagal antar tinggi → skor turun). */
  risk: number;
  segment: "Champion" | "Loyal" | "Potensial" | "Berisiko" | "Pasif";
  /** rekomendasi aksi untuk penjual. */
  action: string;
}

/** ≥ harga jual → margin; HPP = cost. */
export function pnlSummary(): PnlSummary {
  const revenue = SELLER_PRODUCTS.reduce((s, sp) => s + sp.product.price * sp.sold30, 0);
  const cogs = SELLER_PRODUCTS.reduce((s, sp) => s + sp.cost * sp.sold30, 0);
  const grossProfit = revenue - cogs;
  const returnsCost = SELLER_PRODUCTS.reduce((s, sp) => s + sp.cost * sp.returns30, 0);
  const netProfit = grossProfit - returnsCost;
  const unitsSold = SELLER_PRODUCTS.reduce((s, sp) => s + sp.sold30, 0);
  const orders = Math.round(unitsSold / 1.6); // rata-rata 1,6 item/pesanan
  return {
    revenue,
    cogs,
    grossProfit,
    grossMarginPct: revenue ? round1((grossProfit / revenue) * 100) : 0,
    returnsCost,
    netProfit,
    netMarginPct: revenue ? round1((netProfit / revenue) * 100) : 0,
    orders,
    unitsSold,
    avgOrderValue: orders ? Math.round(revenue / orders) : 0,
  };
}

/** Metrik per produk, terurut laba kotor menurun. */
export function productMetrics(): ProductMetric[] {
  const totalGross = SELLER_PRODUCTS.reduce((s, sp) => s + (sp.product.price - sp.cost) * sp.sold30, 0);
  return SELLER_PRODUCTS.map((sp) => {
    const revenue = sp.product.price * sp.sold30;
    const cogs = sp.cost * sp.sold30;
    const grossProfit = revenue - cogs;
    const returnValue = sp.product.price * sp.returns30;
    const netProfit = grossProfit - sp.cost * sp.returns30;
    return {
      sp,
      revenue,
      cogs,
      grossProfit,
      marginPct: revenue ? round1((grossProfit / revenue) * 100) : 0,
      returnValue,
      returnRatePct: sp.sold30 ? round1((sp.returns30 / sp.sold30) * 100) : 0,
      netProfit,
      stockValue: sp.cost * sp.stock,
      profitSharePct: totalGross ? round1((grossProfit / totalGross) * 100) : 0,
    };
  }).sort((a, b) => b.grossProfit - a.grossProfit);
}

/** Produk yang perlu perhatian: margin rendah atau retur tinggi. */
export function flaggedProducts(): ProductMetric[] {
  return productMetrics().filter((m) => m.marginPct < 34 || m.returnRatePct > 3);
}

/** Skor pelanggan berbasis RFM + risiko. */
export function scoreCustomer(rec: CustomerRecord): CustomerScore {
  // Recency: makin baru makin tinggi (0–100). 0 hari=100, ≥60 hari=0.
  const recency = clamp(100 - (rec.daysSinceLast / 60) * 100);
  // Frequency: 1 pesanan=10, ≥20 pesanan=100.
  const frequency = clamp(((rec.orders - 1) / 19) * 100);
  // Monetary: 0–8 juta → 0–100.
  const monetary = clamp((rec.spend / 8_000_000) * 100);
  // Risiko: gagal antar tinggi menurunkan skor.
  const risk = clamp(rec.failedRate * 100);

  // Bobot: monetary & frequency paling menentukan loyalitas, risk sebagai penalti.
  const raw = recency * 0.25 + frequency * 0.25 + monetary * 0.35 - risk * 0.15;
  const score = clamp(raw);

  let segment: CustomerScore["segment"];
  let action: string;
  if (score >= 80) {
    segment = "Champion";
    action = m.sa01();
  } else if (score >= 65) {
    segment = "Loyal";
    action = m.sa02();
  } else if (score >= 45) {
    segment = "Potensial";
    action = m.sa03();
  } else if (rec.failedRate >= 0.2) {
    segment = "Berisiko";
    action = m.sa04();
  } else {
    segment = "Pasif";
    action = m.sa05();
  }
  return { record: rec, score: round1(score), recency: round1(recency), frequency: round1(frequency), monetary: round1(monetary), risk: round1(risk), segment, action };
}

/** Label segmen pelanggan sesuai locale (nilai segmen tetap sebagai ID data). */
export function segmentLabel(segment: CustomerScore["segment"]): string {
  const map: Record<CustomerScore["segment"], () => string> = {
    Champion: () => m.segl01(),
    Loyal: () => m.segl02(),
    Potensial: () => m.segl03(),
    Berisiko: () => m.segl04(),
    Pasif: () => m.segl05(),
  };
  return map[segment]();
}

/** Semua pelanggan (basis demo + pelanggan nyata opsional), skor menurun. */
export function customerScores(extra: CustomerRecord[] = []): CustomerScore[] {
  const seen = new Set(CUSTOMERS.map((c) => `${c.name.toLowerCase()}|${c.city.toLowerCase()}`));
  const merged = [...CUSTOMERS, ...extra.filter((c) => !seen.has(`${c.name.toLowerCase()}|${c.city.toLowerCase()}`))];
  return merged.map(scoreCustomer).sort((a, b) => b.score - a.score);
}

/** Distribusi segmen untuk ringkasan (boleh menyertakan pelanggan nyata). */
export function segmentCounts(extra: CustomerRecord[] = []): Record<CustomerScore["segment"], number> {
  const base: Record<CustomerScore["segment"], number> = { Champion: 0, Loyal: 0, Potensial: 0, Berisiko: 0, Pasif: 0 };
  for (const c of customerScores(extra)) base[c.segment]++;
  return base;
}

/** Rata-rata skor pelanggan (boleh menyertakan pelanggan nyata). */
export function avgCustomerScore(extra: CustomerRecord[] = []): number {
  const all = customerScores(extra);
  return all.length ? round1(all.reduce((s, c) => s + c.score, 0) / all.length) : 0;
}

/** Tren laba 14 hari (untuk grafik). */
export function salesTrend(): DailySales[] {
  return DAILY_SALES;
}

/** Total laba kotor 14 hari (tren). */
export function trendTotals(): { revenue: number; profit: number; orders: number } {
  return DAILY_SALES.reduce(
    (acc, d) => ({ revenue: acc.revenue + d.revenue, profit: acc.profit + d.profit, orders: acc.orders + d.orders }),
    { revenue: 0, profit: 0, orders: 0 }
  );
}

/** Perbandingan laba paruh awal vs akhir periode tren (momentum). */
export function momentumPct(): number {
  const half = Math.floor(DAILY_SALES.length / 2);
  const first = DAILY_SALES.slice(0, half).reduce((s, d) => s + d.profit, 0);
  const second = DAILY_SALES.slice(half).reduce((s, d) => s + d.profit, 0);
  return first ? round1(((second - first) / first) * 100) : 0;
}

// ── util ──
function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
