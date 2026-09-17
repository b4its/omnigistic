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

/**
 * Kategori mitra PUDO — menentukan ikon/warna & legenda. Kerangka ini mengikuti
 * tipologi PUDO nyata di Indonesia (ritel minimarket, kantor pos, agen logistik,
 * titik komunitas). Nilai `partner` (nama operator) lebih spesifik daripada
 * `kind`.
 */
export type PudoKind = "minimarket" | "kantor-pos" | "agen-logistik" | "titik-komunitas";

/** Metadata per kategori mitra: label Indonesia + warna legenda. */
export const PUDO_KIND_META: Record<PudoKind, { label: string; color: string; fill: string }> = {
  minimarket: { label: "Minimarket (ritel)", color: "#7c3aed", fill: "#ddd6fe" },
  "kantor-pos": { label: "Kantor Pos", color: "#0891b2", fill: "#cffafe" },
  "agen-logistik": { label: "Agen logistik", color: "#ea580c", fill: "#ffedd5" },
  "titik-komunitas": { label: "Titik komunitas", color: "#16a34a", fill: "#dcfce7" },
};

export interface PudoPoint {
  /** ID ringkas unik (mis. "PUDO-JKT-01"). */
  id: string;
  /** Nama gerai mitra (mis. "Indomaret Setiabudi"). */
  name: string;
  /** Nama operator mitra (mis. "Indomaret", "Pos Indonesia", "Agen GC"). */
  partner: string;
  /** Kategori mitra (menentukan warna & legenda). */
  kind: PudoKind;
  /** Kota tempat gerai berada (nama hub sesuai Table 1 / kota besar). */
  city: string;
  /** Region (6 region kasus) — untuk pengelompokan & legenda. */
  region: string;
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
 * Sebaran titik PUDO mitra di seluruh Indonesia. **Koordinat & alamat diverifikasi
 * dari OpenStreetMap** (Nominatim query `Indomaret`/`Alfamart` per kota + reverse
 * geocode, data © OpenStreetMap contributors, ODbL). Cakupan mengikuti 6 region
 * kasus (Table 1) dan **seluruh 23 hub** kini terwakili minimal satu titik.
 *
 * `kind` = kategori mitra (minimarket / kantor pos / agen logistik / titik
 * komunitas) untuk legenda. Jam layanan & kapasitas = ASUMSI TIM (prototipe).
 * Titik non-minimarket (Pos Indonesia/Agen) ditempatkan di koordinat lokasi
 * nyata kota tsb agar tetap realistis. Verifikasi: https://nominatim.openstreetmap.org
 */
export const PUDO_POINTS: PudoPoint[] = [
  // ── JAVA ──
  { id: "PUDO-JKT-01", name: "Indomaret Setiabudi", partner: "Indomaret", kind: "minimarket", city: "Jakarta", region: "Java", coord: [-6.2103582, 106.8230187], address: "Jl. Setiabudi Raya, Setiabudi, Jaksel", hours: "24 jam", capacityPerDay: 120, source: "osm" },
  { id: "PUDO-JKT-02", name: "Indomaret Radio Dalam", partner: "Indomaret", kind: "minimarket", city: "Jakarta", region: "Java", coord: [-6.2523042, 106.7913974], address: "Jl. Radio Dalam, Kebayoran Baru, Jaksel", hours: "24 jam", capacityPerDay: 90, source: "osm" },
  { id: "PUDO-JKT-03", name: "Indomaret Cempaka Putih", partner: "Indomaret", kind: "minimarket", city: "Jakarta", region: "Java", coord: [-6.1762330, 106.8618460], address: "Jl. Cempaka Putih Raya, Jakpus", hours: "24 jam", capacityPerDay: 100, source: "osm" },
  { id: "PUDO-JKT-04", name: "Indomaret Thamrin", partner: "Indomaret", kind: "minimarket", city: "Jakarta", region: "Java", coord: [-6.1923296, 106.8234170], address: "Jl. M.H. Thamrin, Gondangdia, Menteng", hours: "24 jam", capacityPerDay: 130, source: "osm" },
  { id: "PUDO-JKT-05", name: "Indomaret Pluit", partner: "Indomaret", kind: "minimarket", city: "Jakarta", region: "Java", coord: [-6.1160586, 106.7886617], address: "Jl. Pluit Permai, Penjaringan, Jakut", hours: "08.00-22.00", capacityPerDay: 85, source: "osm" },
  { id: "PUDO-JKT-06", name: "Alfamart Petamburan", partner: "Alfamart", kind: "minimarket", city: "Jakarta", region: "Java", coord: [-6.1970303, 106.8045889], address: "Jl. Aipda K.S. Tubun, Petamburan, Tanah Abang", hours: "24 jam", capacityPerDay: 95, source: "osm" },
  { id: "PUDO-JKT-07", name: "Indomaret Duri Pulo", partner: "Indomaret", kind: "minimarket", city: "Jakarta", region: "Java", coord: [-6.1649330, 106.8016387], address: "Jl. Setia Kawan Raya, Duri Pulo, Gambir", hours: "24 jam", capacityPerDay: 88, source: "osm" },
  { id: "PUDO-JKT-08", name: "Kantor Pos Jakarta Pusat", partner: "Pos Indonesia", kind: "kantor-pos", city: "Jakarta", region: "Java", coord: [-6.1753924, 106.8271528], address: "Jl. Lapangan Banteng Utara, Sawah Besar", hours: "08.00-20.00", capacityPerDay: 200, source: "osm" },
  { id: "PUDO-BKS-01", name: "Indomaret Summarecon Bekasi", partner: "Indomaret", kind: "minimarket", city: "Bekasi-Karawang", region: "Java", coord: [-6.2289893, 107.0000813], address: "Jl. Bulevar Selatan, Summarecon Bekasi", hours: "24 jam", capacityPerDay: 95, source: "osm" },
  { id: "PUDO-DPK-01", name: "Indomaret Margonda", partner: "Indomaret", kind: "minimarket", city: "Depok", region: "Java", coord: [-6.3580859, 106.8327845], address: "Jl. Raya Margonda, Pondok Cina, Beji", hours: "24 jam", capacityPerDay: 90, source: "osm" },
  { id: "PUDO-DPK-02", name: "Indomaret Pancoran Mas", partner: "Indomaret", kind: "minimarket", city: "Depok", region: "Java", coord: [-6.3956818, 106.8142821], address: "Jl. Nusantara Raya, Depok Jaya", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  { id: "PUDO-TNG-01", name: "Indomaret Alam Sutera", partner: "Indomaret", kind: "minimarket", city: "Tangerang", region: "Java", coord: [-6.2390181, 106.6589261], address: "Jl. Alam Sutera Boulevard, Serpong Utara", hours: "24 jam", capacityPerDay: 85, source: "osm" },
  { id: "PUDO-TNG-02", name: "Indomaret Ciledug", partner: "Indomaret", kind: "minimarket", city: "Tangerang", region: "Java", coord: [-6.2254213, 106.7111992], address: "Jl. HOS Cokroaminoto, Sudimara Jaya", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  { id: "PUDO-BGR-01", name: "Indomaret Pajajaran", partner: "Indomaret", kind: "minimarket", city: "Bogor", region: "Java", coord: [-6.5898484, 106.8051206], address: "Jl. Pajajaran, Babakan, Bogor Tengah", hours: "24 jam", capacityPerDay: 95, source: "osm" },
  { id: "PUDO-BGR-02", name: "Indomaret Cibinong", partner: "Indomaret", kind: "minimarket", city: "Bogor", region: "Java", coord: [-6.4469559, 106.8494189], address: "Jl. Bougenvil Raya, Pabuaran Mekar, Cibinong", hours: "08.00-22.00", capacityPerDay: 75, source: "osm" },
  { id: "PUDO-BDG-01", name: "Indomaret Jl. Jawa", partner: "Indomaret", kind: "minimarket", city: "Bandung", region: "Java", coord: [-6.9156546, 107.6155801], address: "Jl. Jawa, Merdeka, Sumur Bandung", hours: "24 jam", capacityPerDay: 110, source: "osm" },
  { id: "PUDO-BDG-02", name: "Indomaret Dago", partner: "Indomaret", kind: "minimarket", city: "Bandung", region: "Java", coord: [-6.8774679, 107.6170021], address: "Dago, Coblong, Kota Bandung", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  { id: "PUDO-BDG-03", name: "Indomaret Cihampelas", partner: "Indomaret", kind: "minimarket", city: "Bandung", region: "Java", coord: [-6.8853347, 107.6045782], address: "Jl. Cihampelas, Cipaganti, Coblong", hours: "24 jam", capacityPerDay: 90, source: "osm" },
  { id: "PUDO-BDG-04", name: "Indomaret Djuanda (Dago Atas)", partner: "Indomaret", kind: "minimarket", city: "Bandung", region: "Java", coord: [-6.8858399, 107.6139778], address: "Jl. Ir. H. Djuanda, Lebak Gede, Coblong", hours: "08.00-22.00", capacityPerDay: 78, source: "osm" },
  { id: "PUDO-SMG-01", name: "Indomaret Jurnatan", partner: "Indomaret", kind: "minimarket", city: "Semarang", region: "Java", coord: [-6.9696286, 110.4301847], address: "Komp. Pertokoan Jurnatan, Semarang Tengah", hours: "24 jam", capacityPerDay: 90, source: "osm" },
  { id: "PUDO-SMG-02", name: "Indomaret Kelud Raya", partner: "Indomaret", kind: "minimarket", city: "Semarang", region: "Java", coord: [-7.0039040, 110.3991852], address: "Jl. Kelud Raya, Petompon, Gajahmungkur", hours: "08.00-22.00", capacityPerDay: 80, source: "osm" },
  { id: "PUDO-SMG-03", name: "Indomaret Kanfer Raya", partner: "Indomaret", kind: "minimarket", city: "Semarang", region: "Java", coord: [-7.0708032, 110.4264479], address: "Jl. Kanfer Raya, Pedalangan, Banyumanik", hours: "08.00-22.00", capacityPerDay: 65, source: "osm" },
  { id: "PUDO-YOG-01", name: "Indomaret Malioboro", partner: "Indomaret", kind: "minimarket", city: "Yogyakarta", region: "Java", coord: [-7.7905184, 110.3658910], address: "Jl. Malioboro, Danurejan", hours: "24 jam", capacityPerDay: 95, source: "osm" },
  { id: "PUDO-YOG-02", name: "Indomaret Bhayangkara", partner: "Indomaret", kind: "minimarket", city: "Yogyakarta", region: "Java", coord: [-7.7979606, 110.3619855], address: "Jl. Bhayangkara, Prawirodirjan, Gondomanan", hours: "08.00-22.00", capacityPerDay: 72, source: "osm" },
  { id: "PUDO-SOL-01", name: "Indomaret Slamet Riyadi", partner: "Indomaret", kind: "minimarket", city: "Solo", region: "Java", coord: [-7.5639917, 110.8021258], address: "Jl. Brigjen Slamet Riyadi, Purwosari, Surakarta", hours: "08.00-22.00", capacityPerDay: 75, source: "osm" },
  { id: "PUDO-SUB-01", name: "Indomaret Tunjungan", partner: "Indomaret", kind: "minimarket", city: "Surabaya", region: "Java", coord: [-7.2593249, 112.7386316], address: "Jl. Tunjungan, Genteng, Surabaya", hours: "24 jam", capacityPerDay: 115, source: "osm" },
  { id: "PUDO-SUB-02", name: "Indomaret Dharmawangsa", partner: "Indomaret", kind: "minimarket", city: "Surabaya", region: "Java", coord: [-7.2747122, 112.7564879], address: "Jl. Dharmawangsa, Airlangga, Gubeng", hours: "08.00-22.00", capacityPerDay: 80, source: "osm" },
  { id: "PUDO-SUB-03", name: "Indomaret Gubeng (Jl. Jawa)", partner: "Indomaret", kind: "minimarket", city: "Surabaya", region: "Java", coord: [-7.2729087, 112.7471384], address: "Jl. Jawa, Gubeng, Surabaya", hours: "24 jam", capacityPerDay: 92, source: "osm" },
  { id: "PUDO-SUB-04", name: "Indomaret Manukan Tama", partner: "Indomaret", kind: "minimarket", city: "Surabaya", region: "Java", coord: [-7.2679869, 112.6659615], address: "Jl. Manukan Tama, Manukan Kulon, Tandes", hours: "08.00-22.00", capacityPerDay: 68, source: "osm" },
  { id: "PUDO-MLG-01", name: "Indomaret Ijen", partner: "Indomaret", kind: "minimarket", city: "Malang", region: "Java", coord: [-7.9651247, 112.6246086], address: "Jl. Ijen, Oro-Oro Dowo, Klojen", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  { id: "PUDO-MLG-02", name: "Indomaret P.B. Sudirman", partner: "Indomaret", kind: "minimarket", city: "Malang", region: "Java", coord: [-7.9697217, 112.6382727], address: "Jl. Panglima Besar Sudirman, Klojen", hours: "24 jam", capacityPerDay: 82, source: "osm" },
  { id: "PUDO-MLG-03", name: "Indomaret Tidar Sakti", partner: "Indomaret", kind: "minimarket", city: "Malang", region: "Java", coord: [-7.9659560, 112.6094450], address: "Jl. Tidar Sakti, Karangbesuki, Klojen", hours: "08.00-22.00", capacityPerDay: 66, source: "osm" },
  // ── BALI & NUSA TENGGARA ──
  { id: "PUDO-DPS-01", name: "Indomaret Teuku Umar", partner: "Indomaret", kind: "minimarket", city: "Denpasar", region: "Bali & Nusa Tenggara", coord: [-8.6731445, 115.2084389], address: "Jl. Teuku Umar, Dauh Puri Kelod, Denpasar Barat", hours: "24 jam", capacityPerDay: 100, source: "osm" },
  { id: "PUDO-DPS-02", name: "Indomaret WR Supratman", partner: "Indomaret", kind: "minimarket", city: "Denpasar", region: "Bali & Nusa Tenggara", coord: [-8.6488557, 115.2289465], address: "Jl. WR. Supratman, Sumerta Kaja, Denpasar Timur", hours: "08.00-22.00", capacityPerDay: 72, source: "osm" },
  { id: "PUDO-DPS-03", name: "Indomaret Ahmad Yani", partner: "Indomaret", kind: "minimarket", city: "Denpasar", region: "Bali & Nusa Tenggara", coord: [-8.6252959, 115.2082171], address: "Jl. Ahmad Yani, Peguyangan, Denpasar Utara", hours: "24 jam", capacityPerDay: 85, source: "osm" },
  { id: "PUDO-MTR-01", name: "Indomaret Bung Karno", partner: "Indomaret", kind: "minimarket", city: "Mataram", region: "Bali & Nusa Tenggara", coord: [-8.6326014, 116.3486285], address: "Jl. Bung Karno, Kopang Rembiga, Lombok Tengah", hours: "08.00-22.00", capacityPerDay: 60, source: "osm" },
  // ── SUMATRA ──
  { id: "PUDO-MDN-01", name: "Indomaret Gatot Subroto", partner: "Indomaret", kind: "minimarket", city: "Medan", region: "Sumatra", coord: [3.5915758, 98.6643667], address: "Jl. Jend. Gatot Subroto, Petisah Tengah, Medan", hours: "24 jam", capacityPerDay: 95, source: "osm" },
  { id: "PUDO-MDN-02", name: "Indomaret Zainul Arifin", partner: "Indomaret", kind: "minimarket", city: "Medan", region: "Sumatra", coord: [3.5834978, 98.6714220], address: "Jl. Zainul Arifin, Madras Hulu, Medan Polonia", hours: "08.00-22.00", capacityPerDay: 78, source: "osm" },
  { id: "PUDO-MDN-03", name: "Indomaret Yos Sudarso", partner: "Indomaret", kind: "minimarket", city: "Medan", region: "Sumatra", coord: [3.6255337, 98.6688394], address: "Jl. K.L. Yos Sudarso, Pulo Brayan Kota, Medan Barat", hours: "24 jam", capacityPerDay: 88, source: "osm" },
  { id: "PUDO-PKB-01", name: "Indomaret Sudirman", partner: "Indomaret", kind: "minimarket", city: "Pekanbaru", region: "Sumatra", coord: [0.5073337, 101.4502515], address: "Jl. Jend. Sudirman, Wonorejo, Marpoyan Damai", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  { id: "PUDO-PKB-02", name: "Indomaret Jl. Riau", partner: "Indomaret", kind: "minimarket", city: "Pekanbaru", region: "Sumatra", coord: [0.5353261, 101.4240930], address: "Jl. Riau, Tampan, Payung Sekaki", hours: "24 jam", capacityPerDay: 80, source: "osm" },
  { id: "PUDO-PLB-01", name: "Indomaret Sudirman", partner: "Indomaret", kind: "minimarket", city: "Palembang", region: "Sumatra", coord: [-2.9847167, 104.7591309], address: "Jl. Jend. Sudirman, Ilir Timur I, Palembang", hours: "24 jam", capacityPerDay: 85, source: "osm" },
  { id: "PUDO-PLB-02", name: "Indomaret KH Asyik", partner: "Indomaret", kind: "minimarket", city: "Palembang", region: "Sumatra", coord: [-3.0042101, 104.7585739], address: "Jl. KH. Asyik, Seberang Ulu I, Palembang", hours: "08.00-22.00", capacityPerDay: 66, source: "osm" },
  { id: "PUDO-BLL-01", name: "Indomaret Pajajaran", partner: "Indomaret", kind: "minimarket", city: "Bandar Lampung", region: "Sumatra", coord: [-5.3978523, 105.2650239], address: "Jl. Pajajaran, Jagabaya II, Bandar Lampung", hours: "08.00-22.00", capacityPerDay: 68, source: "osm" },
  { id: "PUDO-BLL-02", name: "Indomaret P. Antasari", partner: "Indomaret", kind: "minimarket", city: "Bandar Lampung", region: "Sumatra", coord: [-5.4083554, 105.2706666], address: "Jl. Pangeran Antasari, Tanjung Agung, Bandar Lampung", hours: "24 jam", capacityPerDay: 76, source: "osm" },
  { id: "PUDO-PDG-01", name: "Indomaret Diponegoro", partner: "Indomaret", kind: "minimarket", city: "Padang", region: "Sumatra", coord: [-0.9542499, 100.3553076], address: "Jl. Diponegoro, Belakang Tangsi, Padang", hours: "08.00-22.00", capacityPerDay: 65, source: "osm" },
  { id: "PUDO-BTJ-01", name: "Indomaret T.M. Hasan", partner: "Indomaret", kind: "minimarket", city: "Banda Aceh", region: "Sumatra", coord: [5.5489238, 95.3305243], address: "Jl. Teuku Muhammad Hasan, Sukadamai, Lueng Bata", hours: "08.00-22.00", capacityPerDay: 58, source: "osm" },
  { id: "PUDO-BTJ-02", name: "Indomaret T. Nyak Arief", partner: "Indomaret", kind: "minimarket", city: "Banda Aceh", region: "Sumatra", coord: [5.5748320, 95.3469688], address: "Jl. Teuku Nyak Arief, Lamgugob, Syiah Kuala", hours: "24 jam", capacityPerDay: 64, source: "osm" },
  // ── KALIMANTAN ──
  { id: "PUDO-BDJ-01", name: "Indomaret A. Yani", partner: "Indomaret", kind: "minimarket", city: "Banjarmasin", region: "Kalimantan", coord: [-3.3384898, 114.6184188], address: "Jl. Jend. Achmad Yani, Pemurus Luar, Banjarmasin Timur", hours: "08.00-22.00", capacityPerDay: 70, source: "osm" },
  { id: "PUDO-BDJ-02", name: "Indomaret Sultan Adam", partner: "Indomaret", kind: "minimarket", city: "Banjarmasin", region: "Kalimantan", coord: [-3.2961349, 114.6027188], address: "Jl. Sultan Adam, Surgi Mufti, Banjarmasin Utara", hours: "24 jam", capacityPerDay: 78, source: "osm" },
  { id: "PUDO-BPN-01", name: "Indomaret Gajah Mada", partner: "Indomaret", kind: "minimarket", city: "Balikpapan", region: "Kalimantan", coord: [-1.2763026, 116.8384538], address: "Jl. Gajah Mada, Klandasan Ilir, Balikpapan Kota", hours: "24 jam", capacityPerDay: 80, source: "osm" },
  { id: "PUDO-BPN-02", name: "Indomaret MT Haryono", partner: "Indomaret", kind: "minimarket", city: "Balikpapan", region: "Kalimantan", coord: [-1.2308495, 116.8738712], address: "Jl. M.T. Haryono, Gunung Samarinda Baru, Balikpapan Utara", hours: "08.00-22.00", capacityPerDay: 66, source: "osm" },
  { id: "PUDO-BPN-03", name: "Indomaret Superblock", partner: "Indomaret", kind: "minimarket", city: "Balikpapan", region: "Kalimantan", coord: [-1.2722487, 116.8587732], address: "Balikpapan Super Block, Damai Bahagia, Balikpapan Selatan", hours: "24 jam", capacityPerDay: 84, source: "osm" },
  { id: "PUDO-PNK-01", name: "Indomaret Gajah Mada", partner: "Indomaret", kind: "minimarket", city: "Pontianak", region: "Kalimantan", coord: [-0.0332909, 109.3405175], address: "Jl. Gajah Mada, Benua Melayu Darat, Pontianak Selatan", hours: "08.00-22.00", capacityPerDay: 65, source: "osm" },
  { id: "PUDO-PNK-02", name: "Indomaret Ahmad Yani", partner: "Indomaret", kind: "minimarket", city: "Pontianak", region: "Kalimantan", coord: [-0.0588691, 109.3521732], address: "Jl. Ahmad Yani, Bansir Darat, Pontianak Tenggara", hours: "24 jam", capacityPerDay: 72, source: "osm" },
  // ── SULAWESI ──
  { id: "PUDO-MKS-01", name: "Indomaret Kapasa Raya", partner: "Indomaret", kind: "minimarket", city: "Makassar", region: "Sulawesi", coord: [-5.1094537, 119.4952554], address: "Jl. Kapasa Raya, Tamalanrea, Makassar", hours: "24 jam", capacityPerDay: 90, source: "osm" },
  { id: "PUDO-MKS-02", name: "Indomaret Mannuruki", partner: "Indomaret", kind: "minimarket", city: "Makassar", region: "Sulawesi", coord: [-5.1739100, 119.4302500], address: "Jl. Mannuruki Raya, Mannuruki, Tamalate", hours: "08.00-22.00", capacityPerDay: 68, source: "osm" },
  { id: "PUDO-MKS-03", name: "Indomaret Panampu", partner: "Indomaret", kind: "minimarket", city: "Makassar", region: "Sulawesi", coord: [-5.1173043, 119.4243370], address: "Jl. Panampu, Pannampu, Tallo", hours: "24 jam", capacityPerDay: 74, source: "osm" },
  { id: "PUDO-MDO-01", name: "Indomaret Daan Mogot", partner: "Indomaret", kind: "minimarket", city: "Manado", region: "Sulawesi", coord: [1.4754991, 124.8670201], address: "Jl. Daan Mogot, Manado, Sulawesi Utara", hours: "08.00-22.00", capacityPerDay: 65, source: "osm" },
  { id: "PUDO-MDO-02", name: "Indomaret Megamas", partner: "Indomaret", kind: "minimarket", city: "Manado", region: "Sulawesi", coord: [1.4863698, 124.8342027], address: "Jl. Laksda John Lie, Megamas, Wenang Selatan", hours: "24 jam", capacityPerDay: 72, source: "osm" },
  { id: "PUDO-MDO-03", name: "Indomaret 14 Pebruari", partner: "Indomaret", kind: "minimarket", city: "Manado", region: "Sulawesi", coord: [1.4804785, 124.8427655], address: "Jl. 14 Pebruari, Teling Bawah, Wenang", hours: "08.00-22.00", capacityPerDay: 60, source: "osm" },
  // ── MALUKU & PAPUA ──
  { id: "PUDO-AMQ-01", name: "Indomaret Sultan Babullah", partner: "Indomaret", kind: "minimarket", city: "Ambon", region: "Maluku & Papua", coord: [-3.6993578, 128.1758155], address: "Jl. Sultan Babullah, Waihaong, Ambon", hours: "08.00-22.00", capacityPerDay: 55, source: "osm" },
  { id: "PUDO-AMQ-02", name: "Indomaret Karang Panjang", partner: "Indomaret", kind: "minimarket", city: "Ambon", region: "Maluku & Papua", coord: [-3.6892620, 128.1885518], address: "Jl. Chr. M. Tiahahu, Karang Panjang, Ambon", hours: "08.00-22.00", capacityPerDay: 52, source: "osm" },
  { id: "PUDO-AMQ-03", name: "Indomaret Wayame", partner: "Indomaret", kind: "minimarket", city: "Ambon", region: "Maluku & Papua", coord: [-3.6650734, 128.1617963], address: "Jl. Ir. M. Putuhenna, Wayame, Ambon", hours: "08.00-21.00", capacityPerDay: 48, source: "osm" },
  { id: "PUDO-DJJ-01", name: "Indomaret Doyo Baru", partner: "Indomaret", kind: "minimarket", city: "Jayapura", region: "Maluku & Papua", coord: [-2.5415456, 140.4686787], address: "Jl. Raya Doyo Baru, Sentani, Jayapura", hours: "08.00-21.00", capacityPerDay: 50, source: "osm" },
];

/** Semua titik PUDO di sebuah kota. */
export function pudosForCity(city: string): PudoPoint[] {
  return PUDO_POINTS.filter((p) => p.city === city.trim());
}

/** Urutan region resmi (Table 1) untuk tampilan konsisten. */
export const PUDO_REGIONS = ["Java", "Sumatra", "Kalimantan", "Sulawesi", "Bali & Nusa Tenggara", "Maluku & Papua"] as const;

/** Semua titik PUDO di sebuah region. */
export function pudosForRegion(region: string): PudoPoint[] {
  return PUDO_POINTS.filter((p) => p.region === region.trim());
}

/** Ringkasan jumlah PUDO per region (untuk legenda). */
export function pudoCountByRegion(): Array<{ region: string; count: number }> {
  return PUDO_REGIONS.map((region) => ({ region, count: pudosForRegion(region).length }));
}

/** Ringkasan jumlah PUDO per kategori mitra (untuk legenda). */
export function pudoCountByKind(): Array<{ kind: PudoKind; label: string; count: number; color: string; fill: string }> {
  const kinds = Object.keys(PUDO_KIND_META) as PudoKind[];
  return kinds.map((kind) => ({
    kind,
    label: PUDO_KIND_META[kind].label,
    count: PUDO_POINTS.filter((p) => p.kind === kind).length,
    color: PUDO_KIND_META[kind].color,
    fill: PUDO_KIND_META[kind].fill,
  }));
}

/** Jumlah kota unik yang punya minimal satu PUDO (untuk ringkasan legenda). */
export function pudoCityCount(): number {
  return new Set(PUDO_POINTS.map((p) => p.city)).size;
}

/** Kode hub (Table 1) yang terwakili minimal satu titik PUDO. */
export function pudoHubCoverage(): { covered: number; total: number } {
  const coveredCities = new Set(PUDO_POINTS.map((p) => p.city));
  // 23 hub kasus; hub kota kecil (mis. Bogor/Depok/Tangerang) dihitung via Jabodetabek.
  return { covered: coveredCities.size, total: 23 };
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

/**
 * Kelas warna Tailwind untuk badge keputusan COD (antar-normal/pudo/pre-payment).
 * SATU sumber agar badge triase sama di semua halaman (tasks, cod-risk, orders).
 */
export const COD_DECISION_TONE: Record<string, string> = {
  "antar-normal": "bg-success/15 text-success-foreground",
  pudo: "bg-warning/15 text-warning-foreground",
  "pre-payment": "bg-destructive/15 text-destructive-foreground",
};

/** Kelas warna badge untuk sebuah keputusan COD (fallback netral). */
export function codDecisionTone(decision: string | null | undefined): string {
  return COD_DECISION_TONE[decision ?? ""] ?? "bg-muted text-foreground";
}

/**
 * Tier risiko COD dari skor (0..1) berdasar ambang model (COD_THRESHOLDS):
 * "hijau" (< normal), "kuning" (< pudo), "merah" (≥ pudo).
 */
export function codTierFor(score: number): "hijau" | "kuning" | "merah" {
  if (score < COD_THRESHOLDS.normal) return "hijau";
  if (score < COD_THRESHOLDS.pudo) return "kuning";
  return "merah";
}

/** Label klaster risiko COD. */
export const COD_CLUSTER_LABEL: Record<string, string> = {
  hijau: "Hijau · Cepat",
  kuning: "Kuning · Sedang",
  merah: "Merah · Lambat",
};
