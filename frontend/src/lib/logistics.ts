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
