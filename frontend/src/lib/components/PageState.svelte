<script lang="ts">
  import Icon from "./Icon.svelte";

  /**
   * State seragam untuk halaman data: loading (skeleton), error (+ coba lagi),
   * atau kosong. Dipakai agar perilaku offline konsisten di seluruh aplikasi.
   */
  interface Props {
    /** true saat data masih dimuat. */
    loading: boolean;
    /** true bila pemuatan gagal. */
    error?: boolean;
    /** Judul pesan error. */
    errorTitle?: string;
    /** Keterangan pesan error. */
    errorHint?: string;
    /** Callback tombol "Coba lagi". */
    onretry?: () => void;
    /** Jumlah kartu skeleton (mode loading). */
    skeletonCards?: number;
    /** Tinggi blok skeleton utama (px). */
    skeletonHeight?: number;
  }
  let {
    loading,
    error = false,
    errorTitle = "Gagal memuat data",
    errorHint = "Backend offline. Muat ulang setelah backend aktif.",
    onretry,
    skeletonCards = 4,
    skeletonHeight = 288
  }: Props = $props();
</script>

{#if error}
  <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
    <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/50 bg-destructive/10 text-destructive-foreground shadow-[0_0_20px_-8px_var(--glow)]"><Icon name="warn" cls="h-6 w-6" /></span>
    <p class="mt-3 font-heading text-sm font-semibold text-foreground">{errorTitle}</p>
    <p class="mt-1 text-xs text-muted-foreground">{errorHint}</p>
    {#if onretry}
      <button type="button" onclick={onretry} class="mt-3 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_-5px_var(--glow)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_-5px_var(--glow)]">Coba lagi</button>
    {/if}
  </div>
{:else if loading}
  <div class="space-y-4">
    {#if skeletonCards > 0}
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#each Array(Math.min(skeletonCards, 4)) as _, i (i)}
          <div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>
        {/each}
      </div>
    {/if}
    <div class="animate-pulse rounded-2xl border border-border bg-card/60" style="height:{skeletonHeight}px"></div>
  </div>
{/if}
