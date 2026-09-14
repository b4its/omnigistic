<script lang="ts">
  import { page } from "$app/state";
  const status = $derived(page.status);
  const message = $derived(page.error?.message ?? "");
</script>

<svelte:head><title>Halaman tidak ditemukan · Omnigistic</title></svelte:head>

<main class="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
  <p class="hub-label text-muted-foreground">Omnigistic · ISCEA 2026</p>
  <h1 class="font-serif text-6xl font-light tracking-tight text-foreground">{status ?? 404}</h1>
  <p class="text-sm text-muted-foreground">{message ?? "Rute ini tidak ada di aplikasi."}</p>
  <div class="flex flex-wrap justify-center gap-3 pt-2">
    <a href="/login" class="rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-primary/85">Ke portal peran</a>
    <a href="/" class="rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary/60">Halaman utama</a>
    <a href="/dashboard/methodology" class="rounded-full border border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">Methodology</a>
  </div>
</main>
