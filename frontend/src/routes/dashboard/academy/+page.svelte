<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import ProgressRing from "$lib/components/ProgressRing.svelte";
  import { TRACKS, trackLessons, trackMinutes, type Role } from "$lib/academy/curriculum";
  import { academy, trackProgress, isTrackComplete, totalCompleted, totalLessons, overallPct, type AcademyState } from "$lib/stores/academy-progress";
  import { notify } from "$lib/toast";

  let { data }: { data?: { cookieRole?: string | null } } = $props();

  // Progress state reaktif (di-hidrasi onMount dari localStorage).
  let progress: AcademyState = $state({ completed: [], scores: {}, lastActivity: null });

  onMount(() => {
    const unsub = academy.subscribe((s) => (progress = s));
    academy.init();
    return unsub;
  });

  const role = $derived((data?.cookieRole ?? "").toUpperCase() as Role | "");
  const roleLabel: Record<string, string> = { PUSAT: "Manajer Pusat", HUB: "Manajer Hub", KURIR: "Kurir", DATA: "Data & IT", CUSTOMER: "Pembeli", SELLER: "Penjual" };

  // Urutkan: track relevan role lebih dulu, lalu sisa sesuai urutan kurikulum.
  const ordered = $derived(
    [...TRACKS].sort((a, b) => {
      const ra = a.audience === role || a.audience === "ALL" ? 0 : 1;
      const rb = b.audience === role || b.audience === "ALL" ? 0 : 1;
      return ra - rb;
    })
  );

  // Ringkasan progres — diambil dari derived store terpusat (satu sumber logika).
  const totalDone = $derived($totalCompleted);
  const totalAll = $derived($totalLessons);
  const overall = $derived($overallPct);
  const certificates = $derived(TRACKS.filter((t) => isTrackComplete(t, progress)).length);

  const audienceLabel: Record<string, string> = {
    ALL: "Semua peran",
    PUSAT: "Manajer Pusat",
    HUB: "Manajer Hub",
    KURIR: "Kurir",
    DATA: "Data & IT",
    CUSTOMER: "Pembeli",
    SELLER: "Penjual"
  };

  const levelTone: Record<string, string> = {
    Dasar: "bg-success/15 text-success-foreground",
    Menengah: "bg-warning/15 text-warning-foreground",
    Lanjut: "bg-destructive/15 text-destructive-foreground"
  };

  function resetProgress() {
    academy.reset();
    notify({ message: "Progres Nigi Academy direset", type: "warn", title: "Nigi Academy" });
  }
</script>

<div class="space-y-8">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Nigi Academy</h1>
      <p class="text-sm text-muted-foreground">Platform pembelajaran end-to-end · kurikulum, kuis, dan sertifikat operasi Omnigistic.</p>
    </div>
    <span class="hub-label self-start text-muted-foreground sm:self-auto">Akar 5 · Kapabilitas</span>
  </header>

  <!-- Ringkasan progres -->
  <section class="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-center">
    <ProgressRing pct={overall} size={84} stroke={8} label={`Progres keseluruhan ${overall}%`} />
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p class="text-2xl font-bold tabular-nums text-foreground">{totalDone}<span class="text-base font-medium text-muted-foreground">/{totalAll}</span></p>
          <p class="text-xs text-muted-foreground">Pelajaran selesai</p>
        </div>
        <div>
          <p class="text-2xl font-bold tabular-nums text-foreground">{certificates}<span class="text-base font-medium text-muted-foreground">/{TRACKS.length}</span></p>
          <p class="text-xs text-muted-foreground">Sertifikat track</p>
        </div>
        <div>
          <p class="text-2xl font-bold tabular-nums text-foreground">{roleLabel[role] ?? "Semua"}</p>
          <p class="text-xs text-muted-foreground">Fokus peran</p>
        </div>
      </div>
      {#if totalDone > 0}
        <button
          type="button"
          onclick={resetProgress}
          class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive-foreground"
        >
          <Icon name="trash" cls="h-3.5 w-3.5" /> Reset progres
        </button>
      {/if}
    </div>
  </section>

  <p class="text-sm leading-relaxed text-muted-foreground">
    Diakui dalam kasus: &ldquo;lacked deep operational expertise, management experience, and technical knowledge&rdquo;.
    Nigi Academy menutup akar <strong class="font-semibold text-foreground">RC5 (Kapabilitas)</strong> lewat jalur belajar berjenjang,
    kuis tervalidasi, dan sertifikat track yang menandai kompetensi operasi &amp; data.
  </p>

  <!-- Katalog track -->
  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-muted-foreground">Jalur pembelajaran</h2>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each ordered as track (track.slug)}
        {@const prog = trackProgress(track.slug, progress)}
        {@const done = isTrackComplete(track, progress)}
        {@const relevant = track.audience === role || track.audience === "ALL"}
        <a
          href={resolveHref(`/dashboard/academy/${track.slug}`)}
          class="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style="background:{track.accent}">
              <Icon name={track.icon as never} cls="h-5 w-5" weight="bold" />
            </span>
            <div class="flex flex-col items-end gap-1">
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide {levelTone[track.level]}">{track.level}</span>
              {#if done}<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-success-foreground"><Icon name="check" cls="h-3 w-3" weight="bold" /> Selesai</span>{/if}
            </div>
          </div>

          <div class="min-w-0 flex-1 space-y-1.5">
            <h3 class="text-base font-semibold tracking-tight text-foreground">{track.title}</h3>
            <p class="text-xs leading-relaxed text-muted-foreground">{track.tagline}</p>
          </div>

          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span class="inline-flex items-center gap-1"><Icon name="users" cls="h-3 w-3" /> {audienceLabel[track.audience]}</span>
            <span class="inline-flex items-center gap-1"><Icon name="book" cls="h-3 w-3" /> {trackLessons(track).length} pelajaran</span>
            <span class="inline-flex items-center gap-1"><Icon name="calendar" cls="h-3 w-3" /> {trackMinutes(track)} menit</span>
            {#if relevant}<span class="rounded bg-accent px-1.5 py-0.5 font-semibold text-accent-foreground">Untuk peran Anda</span>{/if}
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
              <span>{prog.done}/{prog.total} selesai</span>
              <span>{prog.pct}%</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full transition-all duration-500" style="width:{prog.pct}%;background:{track.accent}"></div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <section class="rounded-2xl border border-border bg-card p-5">
    <h2 class="text-sm font-semibold">Cara belajar</h2>
    <ul class="mt-3 grid gap-2 text-[15px] text-muted-foreground sm:grid-cols-3">
      <li class="flex gap-2"><Icon name="book" cls="h-4 w-4 shrink-0 text-primary" /> Baca pelajaran singkat dengan angka studi kasus.</li>
      <li class="flex gap-2"><Icon name="check" cls="h-4 w-4 shrink-0 text-primary" weight="bold" /> Kerjakan kuis untuk mengunci pemahaman.</li>
      <li class="flex gap-2"><Icon name="grad" cls="h-4 w-4 shrink-0 text-primary" /> Selesaikan semua pelajaran track untuk sertifikat.</li>
    </ul>
  </section>
</div>
