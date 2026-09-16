# Sistem Desain "Bitcoin DeFi" — Penerapan (2026-09-08)

## 1. Ringkasan

Menerapkan sistem desain **"Bitcoin DeFi"** ke seluruh aplikasi Omnigistic
(SvelteKit 2 + Tailwind v4), menggantikan estetika editorial (cream/terracotta)
lama. Sistem di-**pusatkan pada token** sehingga 50+ halaman konsisten tanpa
gaya one-off. **Dua tema lengkap** (terang + gelap) dipertahankan agar toggle
tetap bermakna.

## 2. Keputusan arsitektur

| Aspek | Keputusan | Alasan |
|-------|-----------|--------|
| Token | Pertahankan **nama token lama** (`--primary`, `--card`, …), ubah nilainya | Semua halaman lama langsung "naik kelas" tanpa rewrite; nol risiko regresi → 0 error svelte-check |
| Tema gelap | "True Void" `#030304` + Bitcoin Fire | Signature design system |
| Tema terang | Permukaan hampir putih + aksen orange/gold sama | Toggle tetap bermakna (design system asli = dark-only) |
| Tipografi | Space Grotesk (heading) · Inter (body) · JetBrains Mono (data) | Sesuai spesifikasi; fontur self-hosted `@fontsource-variable` |
| Ikon | Perluas `Icon.svelte` internal (36+ ikon) | Design system menyebut lucide-react (React) — dipadankan tanpa dependensi baru |
| Emoji | **Dihapus semua** → ikon tema | Larangan eksplisit design system |

## 3. Token (ringkas)

```
--bitcoin: #F7931A   --bitcoin-deep: #EA580C   --gold: #FFD600
--glow: rgba(247,147,26,.5)   --glow-gold: rgba(255,214,0,.3)
```

Gelap: `--background #030304`, `--card #0F1115`, `--foreground #FFF`,
`--muted-foreground #94A3B8`, `--border rgba(255,255,255,.1)`.
Terang: `--background #FAF8F4`, `--card #FFF`, `--primary #EA580C`.

Utility khas: `glow-orange`/`glow-gold`, `glass`, `bg-grid`/`bg-grid-sm`,
`text-gradient`, `ambient-glow`, `animate-float`/`animate-pulse-glow`,
`spin-slow`, `btn-primary`.

## 4. Komponen

- **Primitif reusable** (`lib/components/ui/`): `Button` (primary/gold/outline/
  ghost/link; pill, min-height 44px), `Card` (solid/glass/outline; lift+glow),
  `Input` (border-b menyala orange saat fokus). Memakai `cn()` + `$props()`
  mengikuti pola repo — **tanpa cva/dependensi baru**.
- **Icon.svelte**: +19 ikon (zap, lock, layers, coins, gauge, wallet, cube, node,
  activity, sparkles, dll) + prop `style` untuk ikon ber-accent.
- **ThemeToggle**: pill sun/moon, knob gradien + glow, `role="switch"`.
- **Shell**: Topbar (nama persona Space Grotesk, status live mono pulse, CTA
  gradien), M3Nav (logo gradien, item aktif = bar aksen orange→gold + dot gold,
  label seksi mono), dashboard layout (grid + ambient glow global = "textured void").

## 5. Cakupan (halaman)

- Entry: landing (hero grid + teks gradien), login, portal `/dashboard`,
  `+error`, `/analisis`.
- AI: `AiCard`, `NigiAssistant` (badge, tombol kirim gradien), chat.
- Shop: katalog customer, cart, checkout, orders, dashboard → **emoji produk
  diganti ikon** (18 produk), order lama (localStorage) dinormalisasi.
- Semua halaman analitik/dashboard mewarisi token + tekstur void global.

## 6. Verifikasi

| Suite | Hasil |
|-------|-------|
| `svelte-check` | **0 error, 0 warning** |
| `npm run build` | **sukses** (exit 0) |
| Backend `run_tests.py` | **105/105** |
| E2E utama `e2e.mjs` | **52/52** |
| E2E engines / sims / widgets / sidebar | 18/18 · 36/36 · 9/9 · 15/15 |
| E2E orders / customer-accordion / offline | 31/31 · 15/15 · 8/8 |
| Emoji di `src/` | **0** (scan regex) |
| Overflow horizontal @320px (halaman uji) | 0 |
| Toggle tema | set → localStorage `dark` → bertahan setelah reload ✓ |

## 7. Catatan

- Beberapa assertion E2E disesuaikan jadi case-insensitive karena label mono kini
  di-uppercase via CSS (`innerText` ikut berubah) — fungsional tak berubah.
- Semua warna teks utama memenuhi kontras tinggi (putih di void = 21:1 AA/AAA).
- Fokus keyboard: ring `--ring` (bitcoin) di semua kontrol interaktif.
