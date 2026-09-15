/**
 * Progress belajar Nigi Academy — persist ke localStorage (SSR-safe).
 *
 * State: set slug pelajaran yang sudah selesai + skor kuis terakhir per pelajaran.
 * Menyediakan helper turunan (per-track) tanpa menyimpan data duplikat.
 */
import { browser } from "$app/environment";
import { writable, derived, type Readable } from "svelte/store";
import { TRACKS, trackLessons, type Track } from "$lib/academy/curriculum";

export interface AcademyState {
  /** slug pelajaran yang sudah diselesaikan. */
  completed: string[];
  /** skor kuis per pelajaran (0..1) — kuis terakhir yang diambil. */
  scores: Record<string, number>;
  /** timestamp penyelesaian terakhir (untuk sertifikat). */
  lastActivity: number | null;
}

const STORAGE_KEY = "omnigistic-academy-v1";

const EMPTY: AcademyState = { completed: [], scores: {}, lastActivity: null };

function load(): AcademyState {
  if (!browser) return { ...EMPTY };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<AcademyState>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      scores: parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {},
      lastActivity: typeof parsed.lastActivity === "number" ? parsed.lastActivity : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

function persist(state: AcademyState): void {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage penuh / diblokir → abaikan, sesi tetap jalan di memori */
  }
}

function createAcademy() {
  const { subscribe, set, update } = writable<AcademyState>({ ...EMPTY });
  let started = false;

  return {
    subscribe,
    /** Hidrasi dari localStorage sekali (dipanggil onMount). */
    init() {
      if (started) return;
      started = true;
      set(load());
    },
    /** Tandai pelajaran selesai (idempotent). */
    complete(lessonKey: string) {
      update((s) => {
        if (s.completed.includes(lessonKey)) return s;
        const next: AcademyState = {
          ...s,
          completed: [...s.completed, lessonKey],
          lastActivity: Date.now(),
        };
        persist(next);
        return next;
      });
    },
    /** Batalkan penyelesaian sebuah pelajaran. */
    uncomplete(lessonKey: string) {
      update((s) => {
        if (!s.completed.includes(lessonKey)) return s;
        const next: AcademyState = {
          ...s,
          completed: s.completed.filter((k) => k !== lessonKey),
          lastActivity: Date.now(),
        };
        persist(next);
        return next;
      });
    },
    /** Catat skor kuis (0..1) sekaligus tandai selesai. */
    recordScore(lessonKey: string, score: number) {
      update((s) => {
        const next: AcademyState = {
          ...s,
          scores: { ...s.scores, [lessonKey]: score },
          completed: s.completed.includes(lessonKey) ? s.completed : [...s.completed, lessonKey],
          lastActivity: Date.now(),
        };
        persist(next);
        return next;
      });
    },
    reset() {
      const next = { ...EMPTY, completed: [], scores: {}, lastActivity: null };
      persist(next);
      set(next);
    },
  };
}

export const academy = createAcademy();

/** Kunci unik pelajaran lintas track: `track/lesson`. */
export function lessonKey(trackSlug: string, lessonSlug: string): string {
  return `${trackSlug}/${lessonSlug}`;
}

/** Progres satu track: {done, total, pct}. */
export function trackProgress(trackSlug: string, state: AcademyState): { done: number; total: number; pct: number } {
  const track = TRACKS.find((t) => t.slug === trackSlug);
  if (!track) return { done: 0, total: 0, pct: 0 };
  const lessons = trackLessons(track);
  const done = lessons.filter((l) => state.completed.includes(lessonKey(trackSlug, l.slug))).length;
  const total = lessons.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Apakah track tuntas (semua pelajaran selesai). */
export function isTrackComplete(track: Track, state: AcademyState): boolean {
  const p = trackProgress(track.slug, state);
  return p.total > 0 && p.done === p.total;
}

/** Derived: total pelajaran selesai dari seluruh track. */
export const totalCompleted: Readable<number> = derived(academy, (s) => s.completed.length);

/** Derived: total pelajaran yang tersedia. */
export const totalLessons: Readable<number> = derived(academy, () => TRACKS.reduce((sum, t) => sum + trackLessons(t).length, 0));

/** Persentase keseluruhan (0–100). */
export const overallPct: Readable<number> = derived([totalCompleted, totalLessons], ([done, total]) => (total ? Math.round((done / total) * 100) : 0));
