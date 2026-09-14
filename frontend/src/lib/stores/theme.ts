import { browser } from "$app/environment";
import { writable } from "svelte/store";

type Theme = "light" | "dark";

function createTheme() {
  const { subscribe, set } = writable<Theme>("light");

  function apply(t: Theme) {
    set(t);
    if (browser) {
      document.documentElement.classList.toggle("dark", t === "dark");
      try {
        localStorage.setItem("omnigistic-theme", t);
      } catch {
        /* ignore */
      }
    }
  }

  return {
    subscribe,
    set: (t: Theme) => apply(t),
    toggle: () => {
      let cur: Theme = "light";
      // read current
      if (browser) {
        cur = document.documentElement.classList.contains("dark") ? "dark" : "light";
      }
      apply(cur === "light" ? "dark" : "light");
    },
    restore: () => {
      if (!browser) return;
      let t: Theme = "light";
      try {
        const saved = localStorage.getItem("omnigistic-theme");
        if (saved === "dark" || saved === "light") t = saved;
      } catch {
        /* ignore */
      }
      apply(t);
    }
  };
}

export const themeStore = createTheme();