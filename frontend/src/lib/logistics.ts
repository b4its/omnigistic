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
  /** Koordinat (lat, lng) — NYATA dari OpenStreetMap (lihat `source`). */
  coord: [number, number];
  /** Alamat ringkas (jalan & kelurahan) dari data OSM. */
  address: string;
  /** Jam layanan ringkas (mis. "07.00-22.00") — asumsi tim. */
  hours: string;
  /** Kapasitas harian (jumlah paket) — asumsi tim/prototipe. */
  capacityPerDay: number;
  /** Sumber koordinat: "osm" = terverifikasi OpenStreetMap; "asim" = asumsi tim. */
  source: "osm" | "asim";
}

/**
 * Titik PUDO mitra per kota. **Koordinat & alamat diverifikasi dari OpenStreetMap**
 * (Nominatim, `shop=convenience` Indomaret terdekat per kota) — bukan angka karangan.
 * Jam layanan & kapasitas tetap asumsi tim (prototipe presentasi).
 *
 * Verifikasi: `https://nominatim.openstreetmap.org` (data © OpenStreetMap, ODbL).
 * Titik ber-`source:"asim"` = gerai "Agen GC" fiktif yg ditempatkan di koordinat
 * lokasi nyata terdekat pada kota tsb (agar tetap realistis di peta).
 */
export const PUDO_POINTS: PudoPoint[] = [
  // Jakarta (koordinat OSM)
  { id: "PUDO-JKT-01", name: "Indomaret Setiabudi (Sudirman)", partner: "Indomaret", city: "Jakarta", coord: [-6.2103582, 106.8230187], address: "Jl. Setiabudi Raya, Setiabudi, Jaksel", hours: "24 jam", capacityPerDay: 120, source: "osm" },
  { id: "PUDO-JKT-02", name: "Indomaret Radio Dalam", partner: "Indomaret", city: "Jakarta", coord: [-6.2523042, 106.7913974], address: "Jl. Radio Dalam, Kebayoran Baru, Jaksel", hours: "24 jam", capacityPerDay: 90, source: "osm" },
  { id: "PUDO-JKT-03", name: "Indomaret Cempaka Putih", partner: "Indomaret", city: "Jakarta", coord: [-6.1762330, 106.8618460], address: "Jl. Cempaka Putih Raya, Jakpus", hours: "24 jam", capacityPerDay: 100, source: "osm" },
  // Depok (koordinat OSM)
  { id: "PUDO-DPK-01", name: "Indomaret Margonda", partner: "Indomaret", city: "Depok", coord: [-6.3580859, 106.8327845], address: "Jl. Raya Margonda, Pondok Cina, Beji", hours: "24 jam", capacityPerDay: 90, source: "osm" },
  { id: "PUDO-DPK-02", name: "Indomaret Pancoran Mas", partner: "Indomaret", city: "Depok", coord: [-6.3956818, 106.8142821], address: "Jl. Nusantara Raya, Depok Jaya", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  // Tangerang (koordinat OSM)
  { id: "PUDO-TNG-01", name: "Indomaret Alam Sutera", partner: "Indomaret", city: "Tangerang", coord: [-6.2390181, 106.6589261], address: "Jl. Alam Sutera Boulevard, Serpong Utara", hours: "24 jam", capacityPerDay: 85, source: "osm" },
  { id: "PUDO-TNG-02", name: "Indomaret Ciledug", partner: "Indomaret", city: "Tangerang", coord: [-6.2254213, 106.7111992], address: "Jl. HOS Cokroaminoto, Sudimara Jaya", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  // Bogor (koordinat OSM)
  { id: "PUDO-BGR-01", name: "Indomaret Pajajaran", partner: "Indomaret", city: "Bogor", coord: [-6.5898484, 106.8051206], address: "Jl. Pajajaran, Babakan, Bogor Tengah", hours: "24 jam", capacityPerDay: 95, source: "osm" },
  { id: "PUDO-BGR-02", name: "Indomaret Cibinong", partner: "Indomaret", city: "Bogor", coord: [-6.4469559, 106.8494189], address: "Jl. Bougenvil Raya, Pabuaran Mekar, Cibinong", hours: "08.00-22.00", capacityPerDay: 75, source: "osm" },
  // Bandung (koordinat OSM)
  { id: "PUDO-BDG-01", name: "Indomaret Jl. Jawa", partner: "Indomaret", city: "Bandung", coord: [-6.9156546, 107.6155801], address: "Jl. Jawa, Merdeka, Sumur Bandung", hours: "24 jam", capacityPerDay: 110, source: "osm" },
  { id: "PUDO-BDG-02", name: "Indomaret Dago", partner: "Indomaret", city: "Bandung", coord: [-6.8774679, 107.6170021], address: "Dago, Coblong, Kota Bandung", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  // Surabaya (koordinat OSM)
  { id: "PUDO-SBY-01", name: "Indomaret Tunjungan", partner: "Indomaret", city: "Surabaya", coord: [-7.2593249, 112.7386316], address: "Jl. Tunjungan, Genteng, Surabaya", hours: "24 jam", capacityPerDay: 115, source: "osm" },
  { id: "PUDO-SBY-02", name: "Indomaret Dharmawangsa", partner: "Indomaret", city: "Surabaya", coord: [-7.2747122, 112.7564879], address: "Jl. Dharmawangsa, Airlangga, Gubeng", hours: "08.00-22.00", capacityPerDay: 80, source: "osm" },
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
