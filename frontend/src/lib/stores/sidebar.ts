import { browser } from "$app/environment";
import { writable } from "svelte/store";

/**
 * Status buka/tutup sidebar (rail navigasi kiri).
 *
 * - `desktopOpen` : preferensi pengguna untuk mode `expanded` (≥840px).
 * - `drawerOpen`  : status drawer overlay pada layar kecil (rail sebagai laci).
 * - Preferensi `desktopOpen` dipersist ke localStorage agar tahan reload.
 *
 * SSR-safe: tidak menyentuh `window`/`localStorage` saat server render.
 */
export type SidebarState = {
  desktopOpen: boolean;
  drawerOpen: boolean;
};

function createSidebar() {
  const { subscribe, set, update } = writable<SidebarState>({ desktopOpen: true, drawerOpen: false });

  function persist(open: boolean) {
    if (!browser) return;
    try {
      localStorage.setItem("omnigistic-sidebar-open", open ? "1" : "0");
    } catch {
      /* ignore (mode privat / storage penuh) */
    }
  }

  return {
    subscribe,
    /** Muat preferensi tersimpan (dipanggil sekali di onMount layout). */
    restore() {
      if (!browser) return;
      let open = true;
      try {
        const saved = localStorage.getItem("omnigistic-sidebar-open");
        if (saved === "0") open = false;
        else if (saved === "1") open = true;
      } catch {
        /* ignore */
      }
      // Drawer selalu mulai tertutup; preferensi desktop dipulihkan.
      set({ desktopOpen: open, drawerOpen: false });
    },
    toggleDesktop() {
      update((s) => {
        const next = { ...s, desktopOpen: !s.desktopOpen };
        persist(next.desktopOpen);
        return next;
      });
    },
    setDesktop(open: boolean) {
      persist(open);
      update((s) => ({ ...s, desktopOpen: open }));
    },
    openDrawer() {
      update((s) => ({ ...s, drawerOpen: true }));
    },
    closeDrawer() {
      update((s) => ({ ...s, drawerOpen: false }));
    },
    toggleDrawer() {
      update((s) => ({ ...s, drawerOpen: !s.drawerOpen }));
    }
  };
}

export const sidebarStore = createSidebar();
