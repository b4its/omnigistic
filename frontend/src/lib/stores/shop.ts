/**
 * Store marketplace customer — keranjang, alamat pengiriman, dan pesanan.
 * Persist ke localStorage (SSR-safe). Mengikuti pola `academy-progress.ts`.
 */
import { browser } from "$app/environment";
import { writable, derived, type Readable } from "svelte/store";
import { getProduct, type Product } from "$lib/shop/catalog";
import { DEFAULT_PERSONA_ID, getPersona, computeReputation, type Reputation } from "$lib/shop/reputation";

export interface CartItem {
  productId: string;
  qty: number;
}

export interface Address {
  recipient: string;
  phone: string;
  street: string;
  city: string;
}

export type PaymentMethod = "COD" | "Transfer";
export type OrderStatus = "dikemas" | "dijemput" | "transit" | "dikirim" | "terkirim";

export interface OrderItem {
  productId: string;
  name: string;
  emoji: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  createdAt: number;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  address: Address;
  payment: PaymentMethod;
  /** Skor risiko COD dari model Predictive (0..1); null bila transfer. */
  codScore: number | null;
  /** Keputusan model: antar-normal | pudo | pre-payment; null bila transfer. */
  codDecision: string | null;
  status: OrderStatus;
}

export interface ShopState {
  cart: CartItem[];
  address: Address | null;
  orders: Order[];
  /** Persona pembeli aktif (menentukan kelayakan COD). */
  buyerId: string;
}

const STORAGE_KEY = "omnigistic-shop-v1";

const EMPTY: ShopState = { cart: [], address: null, orders: [], buyerId: DEFAULT_PERSONA_ID };

function load(): ShopState {
  if (!browser) return { cart: [], address: null, orders: [], buyerId: DEFAULT_PERSONA_ID };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cart: [], address: null, orders: [], buyerId: DEFAULT_PERSONA_ID };
    const parsed = JSON.parse(raw) as Partial<ShopState>;
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      address: parsed.address ?? null,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      buyerId: typeof parsed.buyerId === "string" ? parsed.buyerId : DEFAULT_PERSONA_ID,
    };
  } catch {
    return { cart: [], address: null, orders: [], buyerId: DEFAULT_PERSONA_ID };
  }
}

function persist(state: ShopState): void {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage penuh/diblokir → abaikan; sesi tetap jalan di memori */
  }
}

let seq = 0;
function newOrderId(): string {
  seq += 1;
  return `ORD-${Date.now().toString(36).toUpperCase()}-${seq}`;
}

function createShop() {
  const { subscribe, set, update } = writable<ShopState>({ ...EMPTY });
  let started = false;

  return {
    subscribe,
    /** Hidrasi dari localStorage sekali (dipanggil onMount). */
    init() {
      if (started) return;
      started = true;
      set(load());
    },
    /** Tambah produk ke keranjang (menambah qty bila sudah ada). */
    addToCart(productId: string, qty = 1) {
      update((s) => {
        const existing = s.cart.find((c) => c.productId === productId);
        const cart = existing
          ? s.cart.map((c) => (c.productId === productId ? { ...c, qty: c.qty + qty } : c))
          : [...s.cart, { productId, qty }];
        const next = { ...s, cart };
        persist(next);
        return next;
      });
    },
    /** Ubah jumlah item; qty <= 0 menghapus item. */
    setQty(productId: string, qty: number) {
      update((s) => {
        const cart = qty <= 0 ? s.cart.filter((c) => c.productId !== productId) : s.cart.map((c) => (c.productId === productId ? { ...c, qty } : c));
        const next = { ...s, cart };
        persist(next);
        return next;
      });
    },
    removeFromCart(productId: string) {
      update((s) => {
        const next = { ...s, cart: s.cart.filter((c) => c.productId !== productId) };
        persist(next);
        return next;
      });
    },
    clearCart() {
      update((s) => {
        const next = { ...s, cart: [] };
        persist(next);
        return next;
      });
    },
    saveAddress(address: Address) {
      update((s) => {
        const next = { ...s, address };
        persist(next);
        return next;
      });
    },
    /** Simpan pesanan baru; kembalikan id pesanan. */
    placeOrder(order: Omit<Order, "id" | "createdAt" | "status">): string {
      const id = newOrderId();
      update((s) => {
        const full: Order = { ...order, id, createdAt: Date.now(), status: "dikemas" };
        const next = { ...s, orders: [full, ...s.orders], cart: [] };
        persist(next);
        return next;
      });
      return id;
    },
    /** Majukan status pengantaran sebuah pesanan. */
    advanceStatus(orderId: string) {
      const flow: OrderStatus[] = ["dikemas", "dijemput", "transit", "dikirim", "terkirim"];
      update((s) => {
        const orders = s.orders.map((o) => {
          if (o.id !== orderId) return o;
          const i = flow.indexOf(o.status);
          return { ...o, status: flow[Math.min(i + 1, flow.length - 1)] };
        });
        const next = { ...s, orders };
        persist(next);
        return next;
      });
    },
    /** Ganti persona pembeli aktif (menentukan kelayakan COD). */
    setBuyer(buyerId: string) {
      update((s) => {
        const next = { ...s, buyerId };
        persist(next);
        return next;
      });
    },
    reset() {
      const next: ShopState = { cart: [], address: null, orders: [], buyerId: DEFAULT_PERSONA_ID };
      persist(next);
      set(next);
    },
  };
}

export const shop = createShop();

/** Kunci item produk dalam keranjang → Produk lengkap (dengan qty). */
export interface ResolvedCartItem {
  product: Product;
  qty: number;
  lineTotal: number;
}

/** Derived: item keranjang yang sudah di-resolve ke produk + subtotal. */
export const cartDetail: Readable<{ items: ResolvedCartItem[]; subtotal: number; count: number }> = derived(shop, (s) => {
  const items: ResolvedCartItem[] = [];
  for (const c of s.cart) {
    const product = getProduct(c.productId);
    if (product) items.push({ product, qty: c.qty, lineTotal: product.price * c.qty });
  }
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);
  return { items, subtotal, count };
});

/** Derived: jumlah item di keranjang (untuk badge). */
export const cartCount: Readable<number> = derived(cartDetail, (d) => d.count);

/** Derived: jumlah pesanan aktif. */
export const orderCount: Readable<number> = derived(shop, (s) => s.orders.length);

/** Derived: reputasi persona pembeli aktif (menentukan kelayakan COD). */
export const buyerReputation: Readable<Reputation> = derived(shop, (s) => computeReputation(getPersona(s.buyerId)));

/** Hitung ongkir sederhana: basis per-kota + berat total. */
export function shippingCost(items: ResolvedCartItem[], city: string): number {
  const base: Record<string, number> = {
    Jakarta: 12000,
    Depok: 14000,
    Tangerang: 14000,
    Bogor: 15000,
    Bandung: 18000,
    Surabaya: 25000,
  };
  const flat = base[city.trim()] ?? 20000;
  const weight = items.reduce((w, i) => w + i.product.weightKg * i.qty, 0);
  return Math.round(flat + weight * 2000);
}

export const ORDER_STATUS_FLOW: OrderStatus[] = ["dikemas", "dijemput", "transit", "dikirim", "terkirim"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  dikemas: "Dikemas",
  dijemput: "Dijemput kurir",
  transit: "Transit hub",
  dikirim: "Dalam pengantaran",
  terkirim: "Terkirim",
};
