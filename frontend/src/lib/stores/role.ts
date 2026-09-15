import { writable } from "svelte/store";

export type Role = "PUSAT" | "HUB" | "KURIR" | "DATA" | "CUSTOMER" | "SELLER";
const ROLES: Role[] = ["PUSAT", "HUB", "KURIR", "DATA", "CUSTOMER", "SELLER"];

export function roleFromPath(path: string): Role | null {
  const seg = path.split("/")[2]?.toUpperCase();
  return ROLES.includes(seg as Role) ? (seg as Role) : null;
}

/** Persist ke cookie (SSR bisa baca → shell nav ikut tanpa CLS 256px) + simpan untuk restore. */
function createRole() {
  const { subscribe, set } = writable<Role | null>(null);
  return {
    subscribe,
    set(r: Role | null) {
      set(r);
      try {
        if (r) document.cookie = `omnigistic-role=${r}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
        else document.cookie = "omnigistic-role=; path=/; max-age=0";
      } catch {
        /* SSR-safe */
      }
    },
    init(path: string, cookieRole?: string | null): Role | null {
      const fromUrl = roleFromPath(path);
      const stored = (cookieRole ?? "").toUpperCase();
      const chosen = fromUrl ?? (ROLES.includes(stored as Role) ? (stored as Role) : null);
      set(chosen);
      return chosen;
    },
    /** dari SSR load data saja (tanpa DOM) */
    fromLoad: (r?: string | null): Role | null => {
      const t = (r ?? "").toUpperCase();
      return ROLES.includes(t as Role) ? (t as Role) : null;
    }
  };
}

export const roleStore = createRole();
export { ROLES };
