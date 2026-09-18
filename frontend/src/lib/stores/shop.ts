/**
 * Store marketplace customer — keranjang, alamat pengiriman, dan pesanan.
 * Persist ke localStorage (SSR-safe). Mengikuti pola `academy-progress.ts`.
 */
import { browser } from "$app/environment";
import { writable, derived, type Readable } from "svelte/store";
import { getProduct, type Product } from "$lib/shop/catalog";
import { DEFAULT_PERSONA_ID, getPersona, computeReputation, type Reputation } from "$lib/shop/reputation";
import { parseSlot, validateSlot } from "$lib/logistics";

export interface CartItem {
  productId: string;
  qty: number;
}

export interface Address {
  recipient: string;
  phone: string;
  street: string;
  city: string;
  lat?: number;
  lng?: number;
}

export type PaymentMethod = "COD" | "Transfer";
export type OrderStatus = "dikemas" | "dijemput" | "transit" | "dikirim" | "terkirim";
/**
 * Pemberitahuan PENERIMA (customer) ke kurir: apakah ia ada di rumah saat paket
 * sedang diantar. INISIATIF customer sebelum kurir tiba, agar kurir bisa
 * menyesuaikan rute (langsung antar / tawarkan PUDO / jadwalkan ulang).
 */
export type PresenceStatus = "di-rumah" | "tidak-di-rumah";

export interface OrderItem {
  productId: string;
  name: string;
  /** Nama ikon tema (bukan emoji). */
  icon: string;
  price: number;
  qty: number;
}

/** Satu entri riwayat perjalanan paket (ditulis oleh aksi kurir). */
export interface OrderEvent {
  at: number;
  status: OrderStatus;
  /** Kondisi/keterangan terkini saat itu. */
  note: string;
  /** Siapa yang menulis (mis. "Kurir Baits · JKT-04"). */
  actor: string;
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
  /** Keterangan kondisi paket terkini (ditulis kurir / sistem). */
  statusNote: string;
  /** Kurir yang menangani (nama · kode tugas). */
  courier: string | null;
  /** Terakhir diperbarui (ms). */
  updatedAt: number;
  /** Riwayat perjalanan paket, terbaru di depan. */
  events: OrderEvent[];
  /** Slot pengantaran terkonfirmasi (mis. "14:00-16:00"); null bila belum. */
  slot: string | null;
  /** Tunai COD sudah diterima kurir? (hanya relevan bila payment === "COD"). */
  codCollected: boolean;
  /** Paket dialihkan ke PUDO (mitra ritel) alih-alih antar ke alamat? */
  routedToPudo: boolean;
  /**
   * Pemberitahuan CUSTOMER: apakah ia ada di rumah (diisi pembeli saat paket
   * "dalam pengantaran"). Dilihat kurir sebelum tiba agar bisa menyesuaikan rute.
   * null = belum diberitahukan.
   */
  presenceStatus: PresenceStatus | null;
  /** Waktu customer memberitahukan kehadiran (ms); null bila belum. */
  presenceAt: number | null;
}

export interface ShopState {
  cart: CartItem[];
  address: Address | null;
  orders: Order[];
  /** Persona pembeli aktif (menentukan kelayakan COD). */
  buyerId: string;
}

export const DEFAULT_ORDERS: Order[] = [
  {
    id: "ORD-BDO-101",
    createdAt: Date.now() - 3600000,
    items: [
      { productId: "P-EL-01", name: "TWS Bluetooth Earbuds Pro", icon: "box", price: 189000, qty: 1 },
      { productId: "P-CA-01", name: "Kopi Arabika Gunung Tilu 250g", icon: "box", price: 65000, qty: 2 }
    ],
    subtotal: 319000,
    shipping: 18000,
    total: 337000,
    address: {
      recipient: "Rian Hidayat",
      phone: "081223344556",
      street: "Jl. Braga No. 45, Sumur Bandung",
      city: "Bandung",
      lat: -6.91746,
      lng: 107.61912
    },
    payment: "COD",
    codScore: 0.35,
    codDecision: "antar-normal",
    status: "dikirim",
    statusNote: "Kurir dalam perjalanan melintasi koridor Dago-Braga.",
    courier: "Kurir Baits · BDO-02",
    updatedAt: Date.now() - 1800000,
    events: [
      { at: Date.now() - 3600000, status: "dikemas", note: "Pesanan dikemas di Hub Bandung.", actor: "Sistem" },
      { at: Date.now() - 2700000, status: "transit", note: "Sortir rute last-mile Bandung.", actor: "Kurir Baits · BDO-02" },
      { at: Date.now() - 1800000, status: "dikirim", note: "Kurir dalam perjalanan melintasi koridor Dago-Braga.", actor: "Kurir Baits · BDO-02" }
    ],
    slot: "13:00-15:00",
    codCollected: false,
    routedToPudo: false,
    presenceStatus: "di-rumah",
    presenceAt: Date.now() - 1500000
  },
  {
    id: "ORD-BGR-102",
    createdAt: Date.now() - 7200000,
    items: [
      { productId: "P-EL-02", name: "Smartwatch Fitness Tracker", icon: "box", price: 245000, qty: 1 }
    ],
    subtotal: 245000,
    shipping: 15000,
    total: 260000,
    address: {
      recipient: "Sari Wulandari",
      phone: "081234567890",
      street: "Jl. Raya Pajajaran No. 12, Bogor Tengah",
      city: "Bogor",
      lat: -6.5971,
      lng: 106.8060
    },
    payment: "COD",
    codScore: 0.42,
    codDecision: "pudo",
    status: "transit",
    statusNote: "Menunggu pemberangkatan ke titik klaster Bogor.",
    courier: "Kurir Baits · JKT-04",
    updatedAt: Date.now() - 3600000,
    events: [
      { at: Date.now() - 7200000, status: "dikemas", note: "Pesanan dikemas di Hub Jakarta.", actor: "Sistem" },
      { at: Date.now() - 3600000, status: "transit", note: "Menunggu pemberangkatan ke titik klaster Bogor.", actor: "Kurir Baits · JKT-04" }
    ],
    slot: "15:00-17:00",
    codCollected: false,
    routedToPudo: false,
    presenceStatus: null,
    presenceAt: null
  }
];

const STORAGE_KEY = "omnigistic-shop-v1";

const EMPTY: ShopState = { cart: [], address: null, orders: [], buyerId: DEFAULT_PERSONA_ID };

function load(): ShopState {
  if (!browser) return { cart: [], address: null, orders: DEFAULT_ORDERS, buyerId: DEFAULT_PERSONA_ID };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cart: [], address: null, orders: DEFAULT_ORDERS, buyerId: DEFAULT_PERSONA_ID };
    const parsed = JSON.parse(raw) as Partial<ShopState>;
    const orders = Array.isArray(parsed.orders) ? parsed.orders.map(normalizeOrder) : DEFAULT_ORDERS;
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      address: parsed.address ?? null,
      orders,
      buyerId: typeof parsed.buyerId === "string" ? parsed.buyerId : DEFAULT_PERSONA_ID,
    };
  } catch {
    return { cart: [], address: null, orders: DEFAULT_ORDERS, buyerId: DEFAULT_PERSONA_ID };
  }
}

/**
 * Normalisasi pesanan dari localStorage agar kompatibel dengan skema lama
 * (sebelum ada slot/codCollected/routedToPudo/events/lat/lng).
 */
function normalizeOrder(o: Partial<Order>): Order {
  const now = Date.now();
  const status = (o.status ?? "dikemas") as OrderStatus;
  return {
    id: o.id ?? `ORD-${now.toString(36).toUpperCase()}`,
    createdAt: o.createdAt ?? now,
    // Order lama (sebelum migrasi emoji→ikon) tak punya field `icon` → default "box".
    // (Nilai `emoji` lama sengaja TIDAK dipetakan: emoji bukan nama `IconName` yang sah.)
    items: Array.isArray(o.items)
      ? o.items.map((it) => {
          const legacy = it as unknown as { icon?: string };
          return { ...it, icon: typeof legacy.icon === "string" && legacy.icon ? legacy.icon : "box" };
        })
      : [],
    subtotal: o.subtotal ?? 0,
    shipping: o.shipping ?? 0,
    total: o.total ?? 0,
    address: o.address
      ? {
          recipient: o.address.recipient ?? "-",
          phone: o.address.phone ?? "-",
          street: o.address.street ?? "-",
          city: o.address.city ?? "Jakarta",
          lat: typeof o.address.lat === "number" ? o.address.lat : undefined,
          lng: typeof o.address.lng === "number" ? o.address.lng : undefined,
        }
      : { recipient: "-", phone: "-", street: "-", city: "Jakarta" },
    payment: o.payment ?? "Transfer",
    codScore: o.codScore ?? null,
    codDecision: o.codDecision ?? null,
    status,
    statusNote: o.statusNote ?? DEFAULT_COURIER_NOTE[status] ?? "Pesanan diproses.",
    courier: o.courier ?? null,
    updatedAt: o.updatedAt ?? o.createdAt ?? now,
    events: Array.isArray(o.events) && o.events.length ? o.events : [{ at: o.createdAt ?? now, status, note: o.statusNote ?? "Pesanan diproses.", actor: "Sistem" }],
    slot: o.slot ?? null,
    codCollected: o.codCollected ?? false,
    routedToPudo: o.routedToPudo ?? false,
    presenceStatus: (o.presenceStatus ?? null) as PresenceStatus | null,
    presenceAt: o.presenceAt ?? null,
  };
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

/** Format rupiah ringkas untuk catatan event (tanpa impor katalog). */
function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
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
    placeOrder(order: Omit<Order, "id" | "createdAt" | "status" | "statusNote" | "courier" | "updatedAt" | "events" | "slot" | "codCollected" | "routedToPudo" | "presenceStatus" | "presenceAt">): string {
      const id = newOrderId();
      const now = Date.now();
      update((s) => {
        const full: Order = {
          ...order,
          id,
          createdAt: now,
          status: "dikemas",
          statusNote: "Pesanan diterima & sedang dikemas di hub.",
          courier: null,
          updatedAt: now,
          events: [{ at: now, status: "dikemas", note: "Pesanan diterima & sedang dikemas di hub.", actor: "Sistem" }],
          slot: null,
          codCollected: false,
          routedToPudo: false,
          presenceStatus: null,
          presenceAt: null,
        };
        const next = { ...s, orders: [full, ...s.orders], cart: [] };
        persist(next);
        return next;
      });
      return id;
    },

    /**
     * Aksi kurir: majukan status paket ke tahap berikutnya, catat aktor + kondisi.
     * Kembalikan status baru (atau null bila tak ada perubahan).
     */
    courierAdvance(orderId: string, actor: string, note?: string): OrderStatus | null {
      let result: OrderStatus | null = null;
      const flow = ORDER_STATUS_FLOW;
      update((s) => {
        const orders = s.orders.map((o) => {
          if (o.id !== orderId) return o;
          const i = flow.indexOf(o.status);
          if (i < 0 || i >= flow.length - 1) return o;
          const nextStatus = flow[i + 1];
          const now = Date.now();
          const mergedNote = note?.trim() ? note.trim() : DEFAULT_COURIER_NOTE[nextStatus];
          result = nextStatus;
          return {
            ...o,
            status: nextStatus,
            statusNote: mergedNote,
            courier: actor,
            updatedAt: now,
            events: [{ at: now, status: nextStatus, note: mergedNote, actor }, ...o.events],
          };
        });
        const next = { ...s, orders };
        persist(next);
        return next;
      });
      return result;
    },

    /**
     * Aksi CUSTOMER: beri tahu kurir apakah penerima ADA DI RUMAH. Hanya berlaku
     * saat paket "dalam pengantaran" ("dikirim") — inisiatif pembeli sebelum
     * kurir tiba, agar kurir bisa menyesuaikan rute (langsung antar / tawarkan
     * PUDO / jadwalkan ulang). Kembalikan pesan error (string) atau null.
     */
    setPresence(orderId: string, presence: PresenceStatus): string | null {
      if (!PRESENCE_LABEL[presence]) return "Status kehadiran tidak dikenal.";
      let err: string | null = null;
      update((s) => {
        const orders = s.orders.map((o) => {
          if (o.id !== orderId) return o;
          if (o.status !== "dikirim") {
            err = "Kamu hanya bisa memberi tahu kehadiran saat paket sedang diantar.";
            return o;
          }
          const now = Date.now();
          const note = `Pemberitahuan pembeli: ${PRESENCE_LABEL[presence]} ${PRESENCE_HINT[presence]}`;
          return {
            ...o,
            presenceStatus: presence,
            presenceAt: now,
            statusNote: note,
            updatedAt: now,
            events: [{ at: now, status: o.status, note, actor: "Pembeli" }, ...o.events],
          };
        });
        if (err) return s;
        const next = { ...s, orders };
        persist(next);
        return next;
      });
      return err;
    },

    /** Aksi kurir: perbarui keterangan kondisi tanpa mengubah status. */
    courierNote(orderId: string, actor: string, note: string) {
      const clean = note.trim();
      if (!clean) return;
      update((s) => {
        const orders = s.orders.map((o) => {
          if (o.id !== orderId) return o;
          const now = Date.now();
          return {
            ...o,
            statusNote: clean,
            courier: actor,
            updatedAt: now,
            events: [{ at: now, status: o.status, note: clean, actor }, ...o.events],
          };
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

    /**
     * Aksi kurir: konfirmasi slot pengantaran untuk sebuah pesanan.
     * Slot harus berformat rentang jam valid ("HH:MM-HH:MM") — kembalikan pesan
     * error bila tidak, sehingga UI dapat menampilkan alasan kegagalan.
     */
    confirmSlot(orderId: string, actor: string, slot: string): string | null {
      const clean = slot.trim();
      const parts = parseSlot(clean);
      const err = validateSlot(parts.start, parts.end);
      if (err) return err;
      let found = false;
      update((s) => {
        const orders = s.orders.map((o) => {
          if (o.id !== orderId) return o;
          found = true;
          const now = Date.now();
          const note = `Slot pengantaran dikonfirmasi: ${clean}.`;
          return {
            ...o,
            slot: clean,
            statusNote: note,
            courier: actor,
            updatedAt: now,
            events: [{ at: now, status: o.status, note, actor }, ...o.events],
          };
        });
        const next = { ...s, orders };
        persist(next);
        return next;
      });
      return found ? null : "Pesanan tidak ditemukan.";
    },

    /** Aksi kurir: tandai tunai COD sudah diterima (hanya bila payment COD). */
    collectCod(orderId: string, actor: string) {
      update((s) => {
        const orders = s.orders.map((o) => {
          if (o.id !== orderId || o.payment !== "COD" || o.codCollected) return o;
          const now = Date.now();
          const note = `Pembayaran COD diterima tunai ${formatIdr(o.total)}.`;
          return {
            ...o,
            codCollected: true,
            statusNote: note,
            courier: actor,
            updatedAt: now,
            events: [{ at: now, status: o.status, note, actor }, ...o.events],
          };
        });
        const next = { ...s, orders };
        persist(next);
        return next;
      });
    },

    /** Aksi kurir: alihkan paket ke PUDO (mitra ritel) alih-alih antar ke alamat. */
    routeToPudo(orderId: string, actor: string, partner = "Indomaret terdekat") {
      update((s) => {
        const orders = s.orders.map((o) => {
          if (o.id !== orderId || o.routedToPudo) return o;
          const now = Date.now();
          const note = `Paket dialihkan ke PUDO ${partner}; penerima mengambil di gerai.`;
          return {
            ...o,
            routedToPudo: true,
            statusNote: note,
            courier: actor,
            updatedAt: now,
            events: [{ at: now, status: o.status, note, actor }, ...o.events],
          };
        });
        const next = { ...s, orders };
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

/** Label pemberitahuan kehadiran dari CUSTOMER (dilihat kurir sebelum tiba). */
export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  "di-rumah": "Ada di rumah",
  "tidak-di-rumah": "Tidak di rumah",
};

/** Petunjuk tindak lanjut untuk kurir per pemberitahuan kehadiran pembeli. */
export const PRESENCE_HINT: Record<PresenceStatus, string> = {
  "di-rumah": "— kurir boleh langsung antar.",
  "tidak-di-rumah": "— kurir tawarkan PUDO atau jadwalkan ulang.",
};

/**
 * Catatan kondisi paket bawaan per status — dipakai bila kurir majukan status
 * tanpa menulis keterangan manual. Satu sumber kebenaran agar teks yang dilihat
 * pembeli konsisten dengan aksi kurir.
 */
export const DEFAULT_COURIER_NOTE: Record<OrderStatus, string> = {
  dikemas: "Pesanan diterima & sedang dikemas di hub.",
  dijemput: "Paket dijemput kurir dari hub.",
  transit: "Paket tiba di hub transit, menunggu keberangkatan.",
  dikirim: "Paket dalam perjalanan menuju alamat penerima.",
  terkirim: "Paket diterima penerima.",
};

/**
 * Tugas kurir saat ini per status paket — menjelaskan apa yang harus dilakukan
 * kurir pada tahap itu (dipakai halaman tugas pengantaran KURIR).
 */
export interface CourierTask {
  /** Judul singkat aksi kurir. */
  title: string;
  /** Keterangan tugas / instruksi. */
  detail: string;
  /** Ikon (nama dari Icon.svelte). */
  icon: string;
}

export const COURIER_TASK: Record<OrderStatus, CourierTask> = {
  dikemas: {
    title: "Jemput paket di hub",
    detail: "Ambil paket yang sudah dikemas dari rak hub, lalu verifikasi label alamat.",
    icon: "stack",
  },
  dijemput: {
    title: "Serahkan ke transit hub",
    detail: "Bawa paket ke hub transit untuk sortir rute pengantaran hari ini.",
    icon: "compass",
  },
  transit: {
    title: "Mulai pengantaran",
    detail: "Keluar dari hub transit dan menuju alamat penerima sesuai rute.",
    icon: "map",
  },
  dikirim: {
    title: "Konfirmasi paket tiba",
    detail: "Serahkan paket ke penerima. Untuk COD, terima pembayaran tunai sebelum selesai.",
    icon: "check",
  },
  terkirim: {
    title: "Tugas selesai",
    detail: "Paket sudah diterima penerima. Siap lanjut ke paket berikutnya.",
    icon: "check",
  },
};

/**
 * Fraksi perjalanan kurir (0..1) diturunkan dari status — satu sumber agar
 * semua peta pelacakan (customer & kurir) menunjukkan progres yang sama dengan
 * status paket terkini hasil aksi kurir.
 */
export function progressForStatus(status: OrderStatus): number {
  switch (status) {
    case "dikemas":
      return 0;
    case "dijemput":
      return 0.15;
    case "transit":
      return 0.45;
    case "dikirim":
      return 0.75;
    case "terkirim":
      return 1;
    default:
      return 0;
  }
}

/** Status berikutnya dalam alur, atau null bila sudah tahap akhir. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const i = ORDER_STATUS_FLOW.indexOf(status);
  return i >= 0 && i < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[i + 1] : null;
}

/* ── COD berisiko (PUDO) — SATU definisi lintas halaman ─────────────────── */

/**
 * Apakah pesanan COD ini "berisiko" → sebaiknya dialihkan ke PUDO alih-alih
 * diantar normal. Definisi TUNGGAL yang dipakai semua halaman kurir
 * (overview, pudo, tasks, cod-risk) agar triase konsisten.
 *
 * Berisiko bila: pesanan COD, keputusan model bukan "antar-normal", dan belum
 * dialihkan. Keputusan `null` (mis. scoring gagal) TIDAK dianggap berisiko di
 * sini, tetapi tetap muncul di daftar triase lewat `codTriageOrders`.
 */
export function isCodAtRisk(o: Order): boolean {
  return o.payment === "COD" && o.codDecision !== null && o.codDecision !== "antar-normal" && !o.routedToPudo;
}

/** Pesanan COD berisiko yang belum dialihkan (kandidat PUDO). */
export function codAtRiskCandidates(orders: Order[]): Order[] {
  return orders.filter(isCodAtRisk);
}

/**
 * Semua pesanan COD yang perlu ditriase kurir — termasuk yang belum ternilai
 * (codDecision null, mis. scoring gagal saat checkout) agar tak "menghilang"
 * dari triase. Diurutkan dari skor risiko tertinggi.
 */
export function codTriageOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.payment === "COD").sort((a, b) => (b.codScore ?? 0) - (a.codScore ?? 0));
}

/**
 * Pesanan yang "sedang dalam pengantaran" (status `dikirim`, kurir menuju alamat).
 * Dipakai dashboard pembeli untuk membuka otomatis pelacakan yang relevan.
 */
export function isOutForDelivery(status: OrderStatus): boolean {
  return status === "dikirim";
}

/**
 * Pesanan terakhir (paling baru) yang sedang dalam pengantaran — inilah satu-satunya
 * pesanan yang dibuka otomatis pada dashboard pembeli; sisanya tertutup default.
 *
 * Prioritas: (1) pesanan terbaru berstatus `dikirim`; (2) bila tak ada, pesanan
 * terbaru yang masih aktif (belum `terkirim`) agar pengguna tetap melihat progres.
 * Kembalikan null bila semua pesanan sudah terkirim / belum ada pesanan.
 */
export function lastOutForDeliveryOrder(orders: Order[]): Order | null {
  // orders selalu terbaru-di-depan (placeOrder unshift). Ambil yang cocok pertama.
  const delivering = orders.find((o) => isOutForDelivery(o.status));
  if (delivering) return delivering;
  return orders.find((o) => o.status !== "terkirim") ?? null;
}

/* ── Derivasi lintas-role (dipakai kurir & seller) ──────────────────────── */

/** Pesanan yang belum terkirim (masih butuh aksi kurir). */
export const activeOrders: Readable<Order[]> = derived(shop, (s) => s.orders.filter((o) => o.status !== "terkirim"));

/** Pesanan berstatus COD yang belum menerima tunai. */
export const codOutstanding: Readable<Order[]> = derived(shop, (s) =>
  s.orders.filter((o) => o.payment === "COD" && !o.codCollected)
);

/** Pesanan COD berisiko (keputusan model bukan antar-normal) — pakai SATU
 *  predikat kanonik `isCodAtRisk` (termasuk syarat belum dialihkan ke PUDO),
 *  agar store tak menghitung pesanan yang sudah dirutekan sebagai masih berisiko. */
export const codAtRisk: Readable<Order[]> = derived(shop, (s) => s.orders.filter(isCodAtRisk));

/** Pesanan yang dialihkan ke PUDO. */
export const pudoOrders: Readable<Order[]> = derived(shop, (s) => s.orders.filter((o) => o.routedToPudo));

/** Total tunai COD yang sudah terkumpul kurir. */
export const codCollectedTotal: Readable<number> = derived(shop, (s) =>
  s.orders.filter((o) => o.payment === "COD" && o.codCollected).reduce((sum, o) => sum + o.total, 0)
);
