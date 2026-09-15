/**
 * Reputasi pembeli & aturan kelayakan COD.
 *
 * Dua kelas pembeli:
 *  - Reputasi BAIK  → COD tersedia.
 *  - Reputasi BURUK → COD TIDAK tersedia (wajib pre-payment / transfer).
 *
 * Skor reputasi (0–100) dihitung dari riwayat: tingkat gagal antar, pembayaran
 * tepat waktu, dan umur akun. Ambang kelayakan COD: `COD_MIN_SCORE`.
 *
 * PENTING: detail skor prediktif HANYA ditampilkan ke role internal
 * (PUSAT/HUB/KURIR/DATA/SELLER). Pembeli (CUSTOMER) hanya melihat status
 * "COD tersedia / tidak tersedia", bukan angka atau faktor internal.
 */

export interface BuyerProfile {
  id: string;
  name: string;
  city: string;
  /** Tingkat paket gagal antar sebelumnya (0..1) — bobot terbesar. */
  failedRate: number;
  /** Rasio pembayaran COD tepat waktu (0..1). */
  onTimeRate: number;
  /** Umur akun (bulan). */
  accountMonths: number;
  /** Jumlah pesanan sukses. */
  successOrders: number;
}

/** Skor reputasi + kelayakan COD. */
export interface Reputation {
  profile: BuyerProfile;
  /** 0–100. */
  score: number;
  tier: "baik" | "buruk";
  /** Boleh bayar di tempat? */
  codAllowed: boolean;
  /** Alasan singkat untuk pembeli (tanpa angka internal). */
  buyerNote: string;
}

/** Ambang minimum skor reputasi agar COD tersedia. */
export const COD_MIN_SCORE = 60;

/** Hitung skor reputasi dari riwayat pembeli (0–100). */
export function computeReputation(p: BuyerProfile): Reputation {
  // on-time tinggi → skor naik (bobot 45%); gagal antar rendah → skor naik (45%);
  // umur akun memberi kepercayaan tambahan (10%).
  const onTime = clamp01(p.onTimeRate) * 100 * 0.45;
  const failPenalty = (1 - clamp01(p.failedRate)) * 100 * 0.45;
  const tenure = Math.min(1, p.accountMonths / 24) * 100 * 0.1;
  const score = round1(onTime + failPenalty + tenure);
  return finalize(p, score);
}

function finalize(p: BuyerProfile, score: number): Reputation {
  const codAllowed = score >= COD_MIN_SCORE;
  return {
    profile: p,
    score: round1(score),
    tier: codAllowed ? "baik" : "buruk",
    codAllowed,
    buyerNote: codAllowed
      ? "Reputasimu baik — kamu bisa membayar di tempat (COD)."
      : "Reputasi akun belum memenuhi syarat COD. Selesaikan dengan transfer / bayar di muka."
  };
}

/**
 * Dua persona demo untuk portal Customer: satu berreputasi baik (COD tersedia),
 * satu berreputasi buruk (COD diblokir).
 */
export const BUYER_PERSONAS: BuyerProfile[] = [
  {
    id: "BUY-GOOD",
    name: "Sari Wulandari",
    city: "Jakarta",
    failedRate: 0.03,
    onTimeRate: 0.97,
    accountMonths: 30,
    successOrders: 28,
  },
  {
    id: "BUY-RISK",
    name: "Budi Santoso",
    city: "Depok",
    failedRate: 0.42,
    onTimeRate: 0.55,
    accountMonths: 4,
    successOrders: 2,
  },
];

export const DEFAULT_PERSONA_ID = "BUY-GOOD";

export function getPersona(id: string): BuyerProfile {
  return BUYER_PERSONAS.find((p) => p.id === id) ?? BUYER_PERSONAS[0];
}

/** Ringkas label tier untuk UI. */
export const TIER_LABEL: Record<Reputation["tier"], string> = { baik: "Reputasi baik", buruk: "Reputasi buruk" };

// ── util ──
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
