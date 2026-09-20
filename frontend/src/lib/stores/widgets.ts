import { browser } from "$app/environment";
import { writable } from "svelte/store";
import { m } from "$lib/paraglide/messages";

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

/**
 * Katalog widget yang tersedia (satu sumber untuk drawer & strip dashboard).
 *
 * Sengaja berupa FUNGSI, bukan konstanta modul: teksnya harus dievaluasi saat
 * render agar mengikuti locale permintaan (konstanta modul akan membeku pada
 * locale permintaan pertama).
 */
export function widgetCatalog(): DashboardWidget[] {
  return [
    { id: "util-map", title: "Utilization Map", desc: m.wg01(), tag: m.wt01(), hue: "var(--color-chart-1)", metric: m.wg02() },
    { id: "forecast", title: "Demand Forecast", desc: m.wg03(), tag: m.wt02(), hue: "var(--color-chart-2)", metric: m.wg04() },
    { id: "cod-risk", title: "Predictive COD", desc: m.wg05(), tag: m.wt03(), hue: "var(--color-chart-4)", metric: m.wg06() },
    { id: "fleet", title: "Fleet & Emissions", desc: m.wg07(), tag: m.wt04(), hue: "var(--color-chart-3)", metric: m.wg08() },
    { id: "complain", title: "Complaint Monitor", desc: m.wg09(), tag: m.wt05(), hue: "var(--color-chart-5)", metric: m.wg10() },
    { id: "address", title: "Address Intelligence", desc: m.wg11(), tag: m.wt05(), hue: "var(--color-chart-1)", metric: m.wg12() }
  ];
}

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
