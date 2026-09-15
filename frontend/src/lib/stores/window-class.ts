import { writable } from "svelte/store";

export type M3Window = "compact" | "medium" | "expanded";

function createWindowClass() {
  const { subscribe, set } = writable<M3Window>("expanded");
  let active = false;

  function compute(): M3Window {
    if (typeof window === "undefined") return "expanded";
    const w = window.innerWidth;
    if (w < 600) return "compact";
    if (w < 840) return "medium";
    return "expanded";
  }

  function init() {
    if (active || typeof window === "undefined") return;
    active = true;
    set(compute());
    const onResize = () => set(compute());
    window.addEventListener("resize", onResize);
  }

  return { subscribe, init };
}

export const windowClass = createWindowClass();