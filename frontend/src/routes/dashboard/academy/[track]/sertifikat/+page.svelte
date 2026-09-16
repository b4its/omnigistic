<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import { getTrack, trackLessons, trackMinutes } from "$lib/academy/curriculum";
  import { academy, trackProgress, isTrackComplete, type AcademyState } from "$lib/stores/academy-progress";
  import { notify } from "$lib/toast";

  let { data }: { data?: { cookieRole?: string | null } } = $props();

  const slug = $derived(String(page.params.track ?? ""));
  const track = $derived(getTrack(slug));

  let progress: AcademyState = $state({ completed: [], scores: {}, lastActivity: null });
  onMount(() => {
    const unsub = academy.subscribe((s) => (progress = s));
    academy.init();
    return unsub;
  });

  const prog = $derived(track ? trackProgress(track.slug, progress) : { done: 0, total: 0, pct: 0 });
  const done = $derived(track ? isTrackComplete(track, progress) : false);

  const name = $derived((data?.cookieRole ?? "").toUpperCase());
  const roleName: Record<string, string> = { PUSAT: "Dalila", HUB: "Marwah", KURIR: "Baits", DATA: "Virgiawan", CUSTOMER: "Sari", SELLER: "Rina" };
  const roleLabel: Record<string, string> = { PUSAT: "Manajer Pusat", HUB: "Manajer Hub Bandung", KURIR: "Kurir Jakarta", DATA: "Data & IT", CUSTOMER: "Pembeli", SELLER: "Penjual" };

  // Timestamp terbit HARUS stabil (jangan Date.now() di $derived → ID/tanggal berubah tiap render).
  // Fallback 0 → tanggal "1 Januari 1970" hanya bila progres di-seed manual tanpa aktivitas.
  const issuedAt = $derived(progress.lastActivity ?? 0);
  const certId = $derived(track ? `NA-${track.slug.slice(0, 4).toUpperCase()}-${issuedAt.toString(36).toUpperCase().padStart(6, "0")}` : "");
  const dateStr = $derived(
    issuedAt
      ? new Date(issuedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "—"
  );

  function printCert() {
    notify({ message: "Menyiapkan cetak sertifikat…", type: "info", title: "Sertifikat" });
    window.print();
  }
</script>

{#if !track}
  <div class="space-y-4">
    <a href={resolveHref("/dashboard/academy")} class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><Icon name="arrow-left" cls="h-4 w-4" /> Nigi Academy</a>
    <p class="text-sm text-muted-foreground">Track tidak ditemukan.</p>
  </div>
{:else if !done}
  <div class="mx-auto max-w-xl space-y-5 py-10 text-center">
    <span class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="grad" cls="h-8 w-8" /></span>
    <h1 class="font-heading text-xl font-semibold">Sertifikat belum tersedia</h1>
    <p class="text-sm text-muted-foreground">Selesaikan seluruh {prog.total} pelajaran <strong class="font-semibold text-foreground">{track.title}</strong> untuk membuka sertifikat. Progres saat ini {prog.done}/{prog.total} ({prog.pct}%).</p>
    <a href={resolveHref(`/dashboard/academy/${track.slug}`)} class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px">
      <Icon name="book" cls="h-4 w-4" /> Lanjut belajar
    </a>
  </div>
{:else}
  <div class="space-y-6">
    <!-- Aksi (tidak tercetak) -->
    <div class="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <a href={resolveHref(`/dashboard/academy/${track.slug}`)} class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <Icon name="arrow-left" cls="h-4 w-4" /> Kembali ke track
      </a>
      <button
        type="button"
        onclick={printCert}
        class="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
      >
        <Icon name="download" cls="h-4 w-4" /> Cetak / simpan PDF
      </button>
    </div>

    <!-- Sertifikat -->
    <article class="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-card p-8 sm:p-12">
      <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-10" style="background:{track.accent}"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full opacity-10" style="background:var(--color-primary)"></div>

      <div class="relative space-y-8 text-center">
        <div class="flex items-center justify-center gap-3">
          <span class="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style="background:{track.accent}"><Icon name={track.icon as never} cls="h-6 w-6" weight="bold" /></span>
          <div class="text-left">
            <p class="font-heading text-lg font-semibold tracking-tight">Nigi Academy</p>
            <p class="text-xs text-muted-foreground">Omnigistic · ISCEA Global Case Competition 2026</p>
          </div>
        </div>

        <div class="space-y-1">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sertifikat Penyelesaian</p>
          <p class="font-heading text-3xl font-light tracking-tight">Certificate of Completion</p>
        </div>

        <div class="space-y-2">
          <p class="text-sm text-muted-foreground">Diberikan kepada</p>
          <p class="font-heading text-2xl font-semibold text-foreground">{name ? roleName[name] ?? name : "Peserta Nigi Academy"}</p>
          <p class="text-sm text-muted-foreground">{name ? roleLabel[name] ?? "" : ""}</p>
        </div>

        <p class="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
          atas keberhasilan menyelesaikan seluruh <strong class="font-semibold text-foreground">{prog.total} pelajaran</strong> ({trackMinutes(track)} menit)
          pada jalur <strong class="font-semibold text-foreground">{track.title}</strong>
          — tingkat {track.level.toLowerCase()} · akar {track.rootCauses.join(", ")}.
        </p>

        <ul class="mx-auto grid max-w-2xl gap-2 text-left text-[13.5px] text-muted-foreground sm:grid-cols-2">
          {#each track.modules as m, mi (m.slug)}
            <li class="flex items-center gap-2"><Icon name="check" cls="h-3.5 w-3.5 shrink-0 text-success-foreground" weight="bold" /> Modul {mi + 1}: {m.title}</li>
          {/each}
        </ul>

        <div class="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-left sm:flex-row">
          <div>
            <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Diterbitkan</p>
            <p class="text-sm font-medium text-foreground">{dateStr}</p>
          </div>
          <div class="text-center">
            <p class="text-[11px] uppercase tracking-wide text-muted-foreground">ID Sertifikat</p>
            <p class="font-mono text-sm font-semibold text-foreground">{certId}</p>
          </div>
          <div class="text-right">
            <p class="font-heading text-lg italic text-foreground">Nigi AI</p>
            <p class="text-[11px] uppercase tracking-wide text-muted-foreground">Platform Pembelajaran</p>
          </div>
        </div>
      </div>
    </article>

    <p class="text-center text-xs text-muted-foreground print:hidden">
      Sertifikat ini dihasilkan lokal dari progres belajar Anda (tersimpan di peramban). Total pelajaran track: {trackLessons(track).length}.
    </p>
  </div>
{/if}

<style>
  @media print {
    :global(body) { background: white; }
  }
</style>
