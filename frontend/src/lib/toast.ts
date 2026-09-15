/**
 * Notifikasi toast — SATU pintu untuk semua aksi aplikasi.
 *
 * Setiap aksi pengguna (tambah/hapus, simpan, filter, kirim, retry, dsb.)
 * memanggil `notify()` sehingga selalu ada umpan-balik visual. ToastStack
 * (di root layout) mendengarkan event `omnigistic-toast` dan menampilkannya.
 *
 * Aman SSR: bila `window` tak tersedia, panggilan menjadi no-op.
 */

export type ToastType = "success" | "info" | "warn" | "error";

export interface ToastDetail {
  /** Pesan utama yang ditampilkan. */
  message: string;
  /** Jenis notifikasi (menentukan ikon & warna). Default "success". */
  type?: ToastType;
  /** Judul opsional (mis. nama aksi). */
  title?: string;
}

/** Event yang didengarkan ToastStack. */
export const TOAST_EVENT = "omnigistic-toast";

/** Kirim notifikasi. Terima string (kompatibel lama) atau objek detail. */
export function notify(message: string, type?: ToastType, title?: string): void;
export function notify(detail: ToastDetail): void;
export function notify(detail: string | ToastDetail, type: ToastType = "success", title?: string): void {
  if (typeof window === "undefined") return;
  const payload: ToastDetail = typeof detail === "string" ? { message: detail, type, title } : detail;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: payload }));
}

/** Notifikasi sukses (default). */
export const toastSuccess = (message: string, title?: string) => notify(message, "success", title);
/** Notifikasi informasi netral. */
export const toastInfo = (message: string, title?: string) => notify(message, "info", title);
/** Notifikasi peringatan. */
export const toastWarn = (message: string, title?: string) => notify(message, "warn", title);
/** Notifikasi galat. */
export const toastError = (message: string, title?: string) => notify(message, "error", title);
