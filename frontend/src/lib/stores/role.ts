import { deLocalizedPath } from "$lib/utils";

export type Role = "PUSAT" | "HUB" | "KURIR" | "DATA" | "CUSTOMER" | "SELLER";
const ROLES: Role[] = ["PUSAT", "HUB", "KURIR", "DATA", "CUSTOMER", "SELLER"];

/**
 * Ambil role dari segmen path ke-3 (`/dashboard/<role>/...`).
 * Prefix locale dibuang lebih dulu, sehingga `/id/dashboard/pusat/...` tetap terbaca.
 */
export function roleFromPath(path: string): Role | null {
  const seg = deLocalizedPath(path).split("/")[2]?.toUpperCase();
  return ROLES.includes(seg as Role) ? (seg as Role) : null;
}

/** Normalisasi string menjadi Role bila valid, kalau tidak → null. */
export function roleFromValue(value?: string | null): Role | null {
  const t = (value ?? "").toUpperCase();
  return ROLES.includes(t as Role) ? (t as Role) : null;
}

/**
 * Persist role terakhir ke cookie agar SSR bisa membaca shell nav tanpa CLS.
 * (SSR-safe: diabaikan bila `document` tidak tersedia.)
 */
export function setRoleCookie(r: Role | null): void {
  try {
    if (r) document.cookie = `omnigistic-role=${r}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
    else document.cookie = "omnigistic-role=; path=/; max-age=0";
  } catch {
    /* SSR-safe */
  }
}

export { ROLES };
