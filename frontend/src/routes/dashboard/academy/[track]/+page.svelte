<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import ProgressRing from "$lib/components/ProgressRing.svelte";
  import { getTrack, trackLessons, trackMinutes, type Lesson } from "$lib/academy/curriculum";
  import { academy, lessonKey, trackProgress, isTrackComplete, type AcademyState } from "$lib/stores/academy-progress";

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

  const audienceLabel: Record<string, string> = { ALL: "Semua peran", PUSAT: "Manajer Pusat", HUB: "Manajer Hub", KURIR: "Kurir", DATA: "Data & IT", CUSTOMER: "Pembeli" };

  function isDone(lesson: Lesson): boolean {
    return progress.completed.includes(lessonKey(slug, lesson.slug));
  }
</script>

{#if !track}
  <div class="space-y-4">
    <a href={resolveHref("/dashboard/academy")} class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
      <Icon name="arrow-left" cls="h-4 w-4" /> Nigi Academy
    </a>
    <p class="text-sm text-muted-foreground">Track tidak ditemukan.</p>
  </div>
{:else}
  <div class="space-y-8">
    <a href={resolveHref("/dashboard/academy")} class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
      <Icon name="arrow-left" cls="h-4 w-4" /> Nigi Academy
    </a>

    <!-- Header track -->
    <header class="overflow-hidden rounded-2xl border bg-card">
      <div class="h-1.5 w-full" style="background:{track.accent}"></div>
      <div class="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white" style="background:{track.accent}">
          <Icon name={track.icon as never} cls="h-7 w-7" weight="bold" />
        </span>
        <div class="min-w-0 flex-1 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{track.level}</span>
            <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{audienceLabel[track.audience]}</span>
            {#if done}<span class="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success-foreground"><Icon name="check" cls="h-3 w-3" weight="bold" /> Track selesai</span>{/if}
          </div>
          <h1 class="font-heading text-xl font-semibold tracking-tight">{track.title}</h1>
          <p class="text-sm leading-relaxed text-muted-foreground">{track.description}</p>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span class="inline-flex items-center gap-1"><Icon name="book" cls="h-3.5 w-3.5" /> {trackLessons(track).length} pelajaran</span>
            <span class="inline-flex items-center gap-1"><Icon name="calendar" cls="h-3.5 w-3.5" /> {trackMinutes(track)} menit</span>
            <span class="inline-flex items-center gap-1"><Icon name="compass" cls="h-3.5 w-3.5" /> Akar: {track.rootCauses.join(", ")}</span>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-4">
          <ProgressRing pct={prog.pct} size={80} stroke={8} color={track.accent} label={`Progres ${track.title} ${prog.pct}%`} />
        </div>
      </div>
    </header>

    <!-- Hasil pembelajaran -->
    <section class="rounded-2xl border border-border bg-card p-5">
      <h2 class="text-sm font-semibold">Setelah menyelesaikan track ini</h2>
      <ul class="mt-3 grid gap-2 text-[15px] text-muted-foreground sm:grid-cols-2">
        {#each track.outcomes as o (o)}
          <li class="flex gap-2"><Icon name="check" cls="h-4 w-4 shrink-0 text-success-foreground" weight="bold" /> {o}</li>
        {/each}
      </ul>
    </section>

    <!-- Modul & pelajaran -->
    <section class="space-y-4">
      <h2 class="text-sm font-semibold text-muted-foreground">Kurikulum</h2>
      {#each track.modules as mod, mi (mod.slug)}
        <div class="rounded-2xl border border-border bg-card">
          <div class="flex items-center gap-3 border-b border-border px-5 py-4">
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{mi + 1}</span>
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-foreground">Modul {mi + 1} · {mod.title}</h3>
              <p class="text-xs text-muted-foreground">{mod.summary}</p>
            </div>
          </div>
          <ul>
            {#each mod.lessons as lesson (lesson.slug)}
              {@const completed = isDone(lesson)}
              <li class="border-b border-border last:border-0">
                <a
                  href={resolveHref(`/dashboard/academy/${track.slug}/${lesson.slug}`)}
                  class="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/40"
                >
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border {completed ? 'border-success bg-success text-success-foreground' : 'border-border text-muted-foreground'}">
                    {#if completed}<Icon name="check" cls="h-3.5 w-3.5" weight="bold" />{:else}<span class="text-[11px] font-semibold">{lesson.quiz ? "?" : "›"}</span>{/if}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-foreground">{lesson.title}</p>
                    <p class="truncate text-xs text-muted-foreground">{lesson.summary}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {#if lesson.quiz}<span class="rounded bg-muted px-1.5 py-0.5 font-medium">Kuis</span>{/if}
                    <span class="inline-flex items-center gap-1"><Icon name="calendar" cls="h-3 w-3" /> {lesson.minutes}m</span>
                    <Icon name="arrow-up-right" cls="h-4 w-4" />
                  </div>
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>

    <!-- Sertifikat -->
    {#if done}
      <section class="flex flex-col items-start gap-4 rounded-2xl border border-success/40 bg-success/5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-3">
          <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-success text-success-foreground"><Icon name="grad" cls="h-6 w-6" /></span>
          <div>
            <p class="text-sm font-semibold text-foreground">Track tuntas — sertifikat tersedia</p>
            <p class="text-xs text-muted-foreground">Semua {prog.total} pelajaran {track.title} telah diselesaikan.</p>
          </div>
        </div>
        <a
          href={resolveHref(`/dashboard/academy/${track.slug}/sertifikat`)}
          class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
        >
          <Icon name="grad" cls="h-4 w-4" /> Lihat sertifikat
        </a>
      </section>
    {/if}
  </div>
{/if}
