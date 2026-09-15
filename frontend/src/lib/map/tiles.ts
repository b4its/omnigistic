/**
 * Konfigurasi tile peta — SATU sumber untuk semua peta di aplikasi.
 *
 * Tile default: **OpenStreetMap** (open data, lisensi ODbL) — gratis, open-source,
 * lengkap (nama jalan, POI, bangunan), tanpa biaya dan tanpa API key. Sesuai
 * kebijakan pemakaian OSM: atribusi wajib ditampilkan (lihat `attribution`).
 *
 * Mode gelap: TIDAK memakai penyedia pihak ketiga berbayar/berbatas. Alih-alih,
 * tile OSM yang sama di-filter gelap via CSS (lihat `darkFilterClass`), sehingga
 * tetap sepenuhnya gratis & terbuka.
 */

export interface TileSpec {
  url: string;
  attribution: string;
  maxZoom: number;
}

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/** Tile OpenStreetMap standar (default, gratis & lengkap). */
export const OSM_TILE: TileSpec = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: OSM_ATTRIBUTION,
  maxZoom: 19
};

/**
 * Kelas CSS untuk membuat tile OSM tampak gelap di mode malam, tanpa penyedia
 * tile tambahan (hemat & tetap open). Dipakai pada container peta.
 */
export const DARK_TILE_FILTER = "invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9)";

/** Atribusi ringkas untuk ditampilkan di legenda kustom (bila perlu). */
export const OSM_SHORT = "© OpenStreetMap";
