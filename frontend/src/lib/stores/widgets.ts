import { browser } from "$app/environment";
import { writable } from "svelte/store";

/**
 * Widget dashboard yang dipilih pengguna (simulasi "Tambah widget").
 * Dipertahankan ke localStorage dan dirender sebagai strip di atas konten
 * dashboard, sehingga aksi "Tambah ke dashboard" benar-benar berdampak.
 */
export interface DashboardWidget {
  id: string;
  title: string;
  desc: string;
  tag: string;
  hue: string;
  /** Teks metrik ringkas (simulasi) untuk ditampilkan pada kartu widget. */
  metric: string;
}

const STORAGE_KEY = "omnigistic-widgets-v1";

/** Katalog widget yang tersedia (satu sumber untuk drawer & strip dashboard). */
export const WIDGET_CATALOG: DashboardWidget[] = [
  { id: "util-map", title: "Utilization Map", desc: "23 hub utilisasi dgn threshold overload.", tag: "Network", hue: "var(--color-chart-1)", metric: "JKT 90,4%" },
  { id: "forecast", title: "Demand Forecast", desc: "Pola demand 2023 termasuk dampak TikTok.", tag: "Operations", hue: "var(--color-chart-2)", metric: "±105M/bln" },
  { id: "cod-risk", title: "Predictive COD", desc: "Simulasi probabilitas sukses COD per paket.", tag: "Strategy", hue: "var(--color-chart-4)", metric: "138→100 mnt" },
  { id: "fleet", title: "Fleet & Emissions", desc: "Komposisi armada & roadmap EV 3 fase.", tag: "Sustainability", hue: "var(--color-chart-3)", metric: "EV 1,41%" },
  { id: "complain", title: "Complaint Monitor", desc: "5,5 komplain per juta paket dgn penurunan target.", tag: "Quality", hue: "var(--color-chart-5)", metric: "5,5→<3/juta" },
  { id: "address", title: "Address Intelligence", desc: "3 alamat ambigu yang sama di kota beda.", tag: "Quality", hue: "var(--color-chart-1)", metric: "3 kandidat" }
];

function createWidgets() {
  const { subscribe, set, update } = writable<string[]>([]);

  function persist(ids: string[]) {
    if (!browser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }

  return {
    subscribe,
    /** Muat pilihan tersimpan (dipanggil onMount). */
    restore() {
      if (!browser) return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        set(Array.isArray(ids) ? ids : []);
      } catch {
        set([]);
      }
    },
    /** Set daftar widget aktif (dari drawer). */
    setActive(ids: string[]) {
      const clean = [...new Set(ids)];
      persist(clean);
      set(clean);
    },
    /** Lepas satu widget dari dashboard. */
    remove(id: string) {
      update((ids) => {
        const next = ids.filter((x) => x !== id);
        persist(next);
        return next;
      });
    },
    clear() {
      persist([]);
      set([]);
    }
  };
}

export const widgetsStore = createWidgets();
