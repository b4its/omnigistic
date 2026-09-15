import { resolve } from "$app/paths";

/** `resolve` dengan signature longgar (runtime hanya menggabungkan base path). */
const resolvePath = resolve as unknown as (path: string) => string;

/** Ringkas: gabung class Tailwind. (cn sederhana tanpa dependensi clsx) */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Bungkus path internal dengan `resolve()` SvelteKit (menghormati `paths.base`).
 * Anchor (#...) dan URL absolut dibiarkan apa adanya agar aman untuk nav campuran.
 */
export function resolveHref(path: string): string {
  if (!path || path.startsWith("#") || /^[a-z]+:|^\/\//i.test(path)) return path;
  return resolvePath(path);
}

export function formatId(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function regionUtil(hubs: Array<{ region: string; utilizationPct: number }>, region: string): number {
  const hs = hubs.filter((h) => h.region === region);
  return hs.length
    ? Math.round((hs.reduce((s, h) => s + h.utilizationPct, 0) / hs.length) * 10) / 10
    : 0;
}

export function regionCapacity(hubs: Array<{ region: string; capacityM: number }>, region: string): number {
  return hubs.filter((h) => h.region === region).reduce((s, h) => s + h.capacityM, 0);
}

export function greetingByTime(label?: string): string {
  if (typeof window === "undefined") return label ? `Selamat datang, ${label}` : "Selamat datang";
  const hour = new Date().getHours();
  let t: string;
  if (hour >= 5 && hour < 12) t = "Selamat pagi";
  else if (hour >= 12 && hour < 15) t = "Selamat siang";
  else if (hour >= 15 && hour < 18) t = "Selamat sore";
  else t = "Selamat malam";
  return label ? `${t}, ${label}` : t;
}

export const priorityCls: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-success text-success-foreground"
};