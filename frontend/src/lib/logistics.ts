/**
 * Konstanta & helper logistik — SATU sumber kebenaran untuk seluruh simulasi
 * pengantaran lintas role (Customer & Kurir).
 *
 * Sebelumnya setiap halaman menulis ulang jarak/ETA/koordinat sendiri sehingga
 * saling bertentangan (mis. rute selalu Jakarta→Cibinong walau kota tujuan
 * Surabaya; ETA 45/61/75 menit untuk rute yang sama). Modul ini menyatukan:
 *   - Hub asal (Jakarta) + titik tujuan per kota.
 *   - Geometri rute sederhana (hub → via → tujuan) agar garis mengikuti arah jalan.
 *   - Jarak (km) & estimasi waktu (menit) konsisten per kota.
 *   - Ambang utilisasi/biaya bersama.
 *   - Identitas kurir tunggal.
 *
 * Semua angka bersifat simulasi/prototipe presentasi (bukan data operasional live).
 */

export type City = "Jakarta" | "Depok" | "Tangerang" | "Bogor" | "Bandung" | "Surabaya";

/** Kota yang bisa dipilih pembeli saat checkout (urutan = tampilan). */
export const CITIES: City[] = ["Jakarta", "Depok", "Tangerang", "Bogor", "Bandung", "Surabaya"];

export interface CityRoute {
  /** Titik tujuan (lat, lng) — perkiraan pusat kota. */
  dest: [number, number];
  /** Titik perantara agar geometri terlihat mengikuti jalan. */
  via: [number, number][];
  /** Jarak tempuh (km) — angka kasus/prototipe yang konsisten dgn peta. */
  distanceKm: number;
  /** Estimasi waktu tempuh (menit). */
  durationMin: number;
}

/** Hub asal pengiriman (semua rute berangkat dari sini). */
export const HUB_ORIGIN: [number, number] = [-6.20864, 106.84566];
export const HUB_LABEL = "Hub Jakarta";

/** Rute hub → kota tujuan. Koordinat perkiraan untuk visualisasi peta simulasi. */
export const CITY_ROUTES: Record<City, CityRoute> = {
  Jakarta: {
    dest: [-6.17511, 106.82715],
    via: [[-6.19600, 106.82300], [-6.18500, 106.82500]],
    distanceKm: 9.4,
    durationMin: 28,
  },
  Depok: {
    dest: [-6.40248, 106.79424],
    via: [[-6.29000, 106.83000], [-6.36000, 106.81000]],
    distanceKm: 24.6,
    durationMin: 62,
  },
  Tangerang: {
    dest: [-6.17806, 106.63000],
    via: [[-6.19000, 106.74000], [-6.18200, 106.68000]],
    distanceKm: 27.8,
    durationMin: 58,
  },
  Bogor: {
    dest: [-6.48246, 106.85467],
    via: [[-6.29843, 106.88259], [-6.40275, 106.89822]],
    distanceKm: 38.4,
    durationMin: 96,
  },
  Bandung: {
    dest: [-6.91746, 107.61912],
    via: [[-6.55000, 107.15000], [-6.75000, 107.40000]],
    distanceKm: 148.0,
    durationMin: 195,
  },
  Surabaya: {
    dest: [-7.25747, 112.75209],
    via: [[-6.75000, 108.55000], [-7.00000, 110.50000]],
    distanceKm: 782.0,
    durationMin: 660,
  },
};

/** Jarak & ETA untuk sebuah kota (fallback toleran bila kota tak dikenal). */
export function routeForCity(city: string): CityRoute {
  return CITY_ROUTES[city.trim() as City] ?? CITY_ROUTES.Bogor;
}

/** Geometri rute lengkap hub → tujuan untuk sebuah kota. */
export function coordsForCity(city: string): [number, number][] {
  const r = routeForCity(city);
  return [HUB_ORIGIN, ...r.via, r.dest];
}

/** Jarak km rute ke kota tujuan. */
export function distanceForCity(city: string): number {
  return routeForCity(city).distanceKm;
}

/** ETA (menit) rute ke kota tujuan. */
export function etaForCity(city: string): number {
  return routeForCity(city).durationMin;
}

/** Sisa jarak (km) berdasar fraksi progres 0..1. */
export function remainingKm(city: string, progress: number): number {
  const frac = Math.max(0, Math.min(1, progress));
  return Math.round(distanceForCity(city) * (1 - frac) * 10) / 10;
}

/** Sisa ETA (menit) berdasar fraksi progres 0..1. */
export function remainingEtaMin(city: string, progress: number): number {
  const frac = Math.max(0, Math.min(1, progress));
  return Math.max(0, Math.round(etaForCity(city) * (1 - frac)));
}

/* ── PUDO (Pick-Up Drop-Off) — titik ambil/bayar paket mitra ─────────────── */

export interface PudoPoint {
  /** ID ringkas unik (mis. "PUDO-JKT-01"). */
  id: string;
  /** Nama gerai mitra (mis. "Indomaret Sudirman"). */
  name: string;
  /** Jenis/operator mitra (mis. "Indomaret", "Agen GC"). */
  partner: string;
  /** Kota tempat gerai berada. */
  city: City;
  /** Koordinat (lat, lng) untuk peta. */
  coord: [number, number];
  /** Jam layanan ringkas (mis. "07.00-22.00"). */
  hours: string;
  /** Kapasitas harian (jumlah paket) — prototipe. */
  capacityPerDay: number;
}

/**
 * Titik PUDO mitra per kota (simulasi presentasi). Koordinat perkiraan gerai
 * nyata di sekitar pusat kota masing-masing agar terlihat realistis di peta.
 */
export const PUDO_POINTS: PudoPoint[] = [
  // Jakarta
  { id: "PUDO-JKT-01", name: "Indomaret Sudirman", partner: "Indomaret", city: "Jakarta", coord: [-6.2085, 106.8218], hours: "24 jam", capacityPerDay: 120 },
  { id: "PUDO-JKT-02", name: "Agen GC Kebayoran", partner: "Agen GC", city: "Jakarta", coord: [-6.2415, 106.7991], hours: "08.00-21.00", capacityPerDay: 80 },
  { id: "PUDO-JKT-03", name: "Indomaret Cempaka Putih", partner: "Indomaret", city: "Jakarta", coord: [-6.1783, 106.8735], hours: "24 jam", capacityPerDay: 100 },
  // Depok
  { id: "PUDO-DPK-01", name: "Indomaret Margonda", partner: "Indomaret", city: "Depok", coord: [-6.3720, 106.8317], hours: "24 jam", capacityPerDay: 90 },
  { id: "PUDO-DPK-02", name: "Agen GC Cinere", partner: "Agen GC", city: "Depok", coord: [-6.3335, 106.8009], hours: "08.00-20.00", capacityPerDay: 60 },
  // Tangerang
  { id: "PUDO-TNG-01", name: "Indomaret Alam Sutera", partner: "Indomaret", city: "Tangerang", coord: [-6.2236, 106.6537], hours: "24 jam", capacityPerDay: 85 },
  { id: "PUDO-TNG-02", name: "Agen GC Ciledug", partner: "Agen GC", city: "Tangerang", coord: [-6.2336, 106.7060], hours: "08.00-21.00", capacityPerDay: 70 },
  // Bogor
  { id: "PUDO-BGR-01", name: "Indomaret Pajajaran", partner: "Indomaret", city: "Bogor", coord: [-6.5610, 106.8004], hours: "24 jam", capacityPerDay: 95 },
  { id: "PUDO-BGR-02", name: "Agen GC Cibinong", partner: "Agen GC", city: "Bogor", coord: [-6.4817, 106.8526], hours: "08.00-21.00", capacityPerDay: 75 },
  // Bandung
  { id: "PUDO-BDG-01", name: "Indomaret Asia Afrika", partner: "Indomaret", city: "Bandung", coord: [-6.9215, 107.6099], hours: "24 jam", capacityPerDay: 110 },
  { id: "PUDO-BDG-02", name: "Agen GC Dago", partner: "Agen GC", city: "Bandung", coord: [-6.8845, 107.6135], hours: "08.00-21.00", capacityPerDay: 70 },
  // Surabaya
  { id: "PUDO-SBY-01", name: "Indomaret Tunjungan", partner: "Indomaret", city: "Surabaya", coord: [-7.2576, 112.7378], hours: "24 jam", capacityPerDay: 115 },
  { id: "PUDO-SBY-02", name: "Agen GC Gubeng", partner: "Agen GC", city: "Surabaya", coord: [-7.2653, 112.7517], hours: "08.00-21.00", capacityPerDay: 80 },
];

/** Semua titik PUDO di sebuah kota. */
export function pudosForCity(city: string): PudoPoint[] {
  return PUDO_POINTS.filter((p) => p.city === city.trim());
}

/** Jarak garis lurus (km) antara dua koordinat. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371.0;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

/**
 * PUDO terdekat dari sebuah titik (default: tujuan kota). Kembalikan titik +
 * jarak km. Bila kota tak punya PUDO, fallback ke titik PUDO di seluruh daftar.
 */
export function nearestPudo(from: [number, number], city?: string): { pudo: PudoPoint; distanceKm: number } {
  const pool = city && pudosForCity(city).length ? pudosForCity(city) : PUDO_POINTS;
  let best = pool[0];
  let bestD = haversineKm(from, pool[0].coord);
  for (const p of pool.slice(1)) {
    const d = haversineKm(from, p.coord);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return { pudo: best, distanceKm: bestD };
}

/**
 * Titik rekomendasi drop untuk kurir: PUDO terdekat dari tujuan pengantaran,
 * beserta geometri rute singkat dari tujuan ke PUDO & estimasi menit.
 */
export function pudoDropRecommendation(city: string): {
  pudo: PudoPoint;
  distanceKm: number;
  etaMin: number;
  from: [number, number];
  route: [number, number][];
} {
  const from = routeForCity(city).dest;
  const { pudo, distanceKm } = nearestPudo(from, city);
  // Rute sederhana tujuan → PUDO (dua titik, garis lurus) untuk visualisasi.
  const route: [number, number][] = [from, pudo.coord];
  const etaMin = Math.max(4, Math.round(distanceKm * 2.4)); // ~25 km/jam → menit
  return { pudo, distanceKm, etaMin, from, route };
}

/* ── Slot pengantaran (jam mulai–selesai) ───────────────────────────────── */

/** Rentang slot pengantaran yang sudah diurai ke jam "HH:MM". */
export interface SlotParts {
  /** Jam mulai "HH:MM" (mis. "14:00"). */
  start: string;
  /** Jam selesai "HH:MM" (mis. "16:00"). */
  end: string;
}

/** Ubah jam "HH:MM" menjadi menit sejak tengah malam (atau null bila tak valid). */
export function timeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Urai string slot ("14:00-16:00") → { start, end }. Mendukung pemisah "-" / "–". */
export function parseSlot(slot: string | null | undefined): SlotParts {
  if (!slot) return { start: "", end: "" };
  const parts = slot.split(/\s*[-–]\s*/);
  return { start: (parts[0] ?? "").trim(), end: (parts[1] ?? "").trim() };
}

/** Bangun string slot dari jam mulai & selesai; "" bila salah satu kosong. */
export function buildSlot(start: string, end: string): string {
  if (!start || !end) return "";
  return `${start}-${end}`;
}

/**
 * Validasi rentang slot: keduanya format jam valid DAN selesai > mulai.
 * Kembalikan pesan error (Indonesia) atau null bila valid.
 */
export function validateSlot(start: string, end: string): string | null {
  if (!start || !end) return "Isi jam mulai dan jam selesai.";
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === null || e === null) return "Format jam tidak valid.";
  if (e <= s) return "Jam selesai harus setelah jam mulai.";
  return null;
}

/* ── Ambang operasional bersama ─────────────────────────────────────────── */

/** Ambang utilisasi hub (persen). */
export const UTIL_THRESHOLD = { warn: 50, critical: 65 } as const;

/** Identitas kurir tunggal (dipakai Topbar, tugas, & pelacakan). */
export const COURIER = {
  name: "Baits",
  city: "Jakarta",
  code: "JKT-04",
  /** String aktor untuk event log (mis. "Kurir Baits · JKT-04"). */
  get actor(): string {
    return `Kurir ${this.name} · ${this.code}`;
  },
} as const;

/* ── Ambang skor risiko COD (samakan dgn backend cod_risk.py) ───────────── */

export const COD_THRESHOLDS = { normal: 0.35, pudo: 0.65 } as const;

/** Label keputusan COD untuk tampilan (samakan dgn model). */
export const COD_DECISION_LABEL: Record<string, string> = {
  "antar-normal": "Antar normal",
  pudo: "Arahkan PUDO",
  "pre-payment": "Pre-payment",
};

/** Label klaster risiko COD. */
export const COD_CLUSTER_LABEL: Record<string, string> = {
  hijau: "Hijau · Cepat",
  kuning: "Kuning · Sedang",
  merah: "Merah · Lambat",
};
