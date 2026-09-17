/**
 * "Order book" — jembatan antara pesanan nyata pembeli (store `shop`, hasil
 * checkout di portal Customer) dan dashboard penjual. Semua turunan di sini
 * dihitung dari pesanan nyata sehingga demo terasa nyambung lintas role.
 *
 * Catatan: masih simulasi — pesanan hidup di localStorage; tidak ada backend.
 */
import type { Order } from "$lib/stores/shop";
import { SELLER_PRODUCTS, type CustomerRecord } from "$lib/shop/seller";

export interface LiveOrderLine {
  orderId: string;
  createdAt: number;
  status: Order["status"];
  payment: Order["payment"];
  city: string;
  recipient: string;
  codScore: number | null;
  codDecision: string | null;
  /** Hanya item yang merupakan produk penjual ini. */
  items: Array<{ productId: string; name: string; icon: string; price: number; qty: number }>;
  /** Nilai item milik penjual ini. */
  sellerValue: number;
  /** Laba kotor item milik penjual ini (harga − HPP). */
  sellerProfit: number;
}

const COST_BY_ID = new Map(SELLER_PRODUCTS.map((sp) => [sp.product.id, sp.cost]));

/** Ambil pesanan yang memuat minimal satu produk milik penjual, dengan turunan nilai. */
export function liveOrders(orders: Order[]): LiveOrderLine[] {
  return orders
    .map((o) => {
      const items = o.items.filter((it) => COST_BY_ID.has(it.productId));
      const sellerValue = items.reduce((s, it) => s + it.price * it.qty, 0);
      const sellerProfit = items.reduce((s, it) => s + (it.price - (COST_BY_ID.get(it.productId) ?? 0)) * it.qty, 0);
      return {
        orderId: o.id,
        createdAt: o.createdAt,
        status: o.status,
        payment: o.payment,
        city: o.address.city,
        recipient: o.address.recipient,
        codScore: o.codScore,
        codDecision: o.codDecision,
        items,
        sellerValue,
        sellerProfit,
      };
    })
    .filter((x) => x.items.length > 0);
}

export interface LiveSummary {
  orders: LiveOrderLine[];
  orderCount: number;
  revenue: number;
  profit: number;
  codRevenue: number;
  digitalRevenue: number;
  deliveredCount: number;
  activeCount: number;
}

/** Ringkasan pesanan nyata untuk penjual. */
export function liveSummary(orders: Order[]): LiveSummary {
  const lines = liveOrders(orders);
  const revenue = lines.reduce((s, l) => s + l.sellerValue, 0);
  const profit = lines.reduce((s, l) => s + l.sellerProfit, 0);
  const codRevenue = lines.filter((l) => l.payment === "COD").reduce((s, l) => s + l.sellerValue, 0);
  const deliveredCount = lines.filter((l) => l.status === "terkirim").length;
  return {
    orders: lines,
    orderCount: lines.length,
    revenue,
    profit,
    codRevenue,
    digitalRevenue: revenue - codRevenue,
    deliveredCount,
    activeCount: lines.length - deliveredCount,
  };
}

/**
 * Pelanggan nyata (dari pesanan) sebagai CustomerRecord (dedupe nama+kota) untuk
 * analisis RFM/distribusi segmen.
 */
export function liveCustomers(orders: Order[]): CustomerRecord[] {
  const lines = liveOrders(orders);
  const byKey = new Map<string, CustomerRecord>();
  // Akumulator: rata-rata sebenarnya skor COD (failedRate) + waktu pesanan terbaru.
  const codAgg = new Map<string, { sum: number; n: number }>();
  const lastAt = new Map<string, number>();
  const now = Date.now();
  for (const l of lines) {
    const key = `${l.recipient.toLowerCase()}|${l.city.toLowerCase()}`;
    const prev = byKey.get(key);
    const daysSinceLast = Math.max(0, Math.round((now - l.createdAt) / 86_400_000));
    if (l.codScore !== null) {
      const agg = codAgg.get(key) ?? { sum: 0, n: 0 };
      agg.sum += l.codScore;
      agg.n += 1;
      codAgg.set(key, agg);
    }
    if (prev) {
      prev.orders += 1;
      prev.spend += l.sellerValue;
      prev.daysSinceLast = Math.min(prev.daysSinceLast, daysSinceLast);
      // Metode bayar mengikuti pesanan TERBARU.
      if (l.createdAt >= (lastAt.get(key) ?? 0)) {
        prev.payMethod = l.payment;
        lastAt.set(key, l.createdAt);
      }
      const agg = codAgg.get(key);
      if (agg && agg.n > 0) prev.failedRate = agg.sum / agg.n;
    } else {
      byKey.set(key, {
        id: `LIVE-${byKey.size + 1}`,
        name: l.recipient,
        city: l.city,
        daysSinceLast,
        orders: 1,
        spend: l.sellerValue,
        failedRate: l.codScore ?? 0.05,
        payMethod: l.payment,
      });
      lastAt.set(key, l.createdAt);
    }
  }
  return [...byKey.values()];
}
