import { m } from "$lib/paraglide/messages";

/**
 * Label peran untuk tampilan. `slug` tetap dipakai sebagai ID data (rute,
 * store, filter), jadi terjemahan hanya terjadi saat render.
 */
const ROLE_LABEL: Record<string, () => string> = {
  PUSAT: () => m.rl01(),
  HUB: () => m.rl02(),
  KURIR: () => m.rl03(),
  DATA: () => m.rl04(),
  CUSTOMER: () => m.rl05(),
  SELLER: () => m.rl06()
};

/** Label peran sesuai locale (mis. KURIR → "Courier" di EN). */
export function roleLabel(slug: string): string {
  return ROLE_LABEL[slug.toUpperCase()]?.() ?? slug;
}

/** Label kartu portal ("Portal Pusat" / "Portal HQ"). */
export function portalLabel(slug: string): string {
  return m.rlPortal({ role: roleLabel(slug) });
}

const COURIER_PREFIX = /^Kurir\s+/;

/**
 * Label kurir dari data seed ("Kurir Baits · BDO-02") diterjemahkan saat render.
 * Data tetap menyimpan teks Indonesia; hanya kata "Kurir" yang mengikuti locale.
 */
export function courierLabel(text: string): string {
  return COURIER_PREFIX.test(text) ? `${m.ax31()} ${text.replace(COURIER_PREFIX, "")}` : text;
}

/** Aktor peristiwa dari data seed ("Sistem") mengikuti locale saat render. */
export function actorLabel(text: string): string {
  return text === "Sistem" ? m.ax32() : courierLabel(text);
}

/** Baris "Ditangani <kurir>" pada kartu tugas. */
export function handledBy(text: string): string {
  return m.ax33({ label: courierLabel(text) });
}
