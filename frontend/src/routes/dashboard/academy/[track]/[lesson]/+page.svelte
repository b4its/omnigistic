<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import { getLesson, trackLessons } from "$lib/academy/curriculum";
  import { academy, lessonKey, type AcademyState } from "$lib/stores/academy-progress";

  const trackSlug = $derived(String(page.params.track ?? ""));
  const lessonSlug = $derived(String(page.params.lesson ?? ""));
  const found = $derived(getLesson(trackSlug, lessonSlug));

  let progress: AcademyState = $state({ completed: [], scores: {}, lastActivity: null });
  onMount(() => {
    const unsub = academy.subscribe((s) => (progress = s));
    academy.init();
    return unsub;
  });

  const key = $derived(lessonKey(trackSlug, lessonSlug));
  const completed = $derived(progress.completed.includes(key));
  const savedScore = $derived(progress.scores[key]);

  // ── Kuis state ──
  let answers = $state<Record<string, number>>({});
  let submitted = $state(false);

  const questions = $derived(found?.lesson.quiz ?? []);
  const allAnswered = $derived(questions.length > 0 && questions.every((q) => answers[q.id] !== undefined));

  function choose(qid: string, idx: number) {
    if (submitted) return;
    answers = { ...answers, [qid]: idx };
  }

  function submitQuiz() {
    if (!found || !allAnswered) return;
    const correctCount = questions.filter((q) => q.options[answers[q.id]]?.correct).length;
    const score = questions.length ? correctCount / questions.length : 0;
    academy.recordScore(key, score);
    submitted = true;
    window.dispatchEvent(
      new CustomEvent("omnigistic-toast", {
        detail: score === 1 ? "Kuis sempurna! Pelajaran ditandai selesai" : `Skor ${Math.round(score * 100)}% — pelajaran ditandai selesai`
      })
    );
  }

  function retryQuiz() {
    answers = {};
    submitted = false;
  }

  function markComplete() {
    academy.complete(key);
    window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: "Pelajaran ditandai selesai" }));
  }

  function unmarkComplete() {
    academy.uncomplete(key);
  }

  /** Navigasi next/prev dalam track. */
  const flat = $derived(found ? trackLessons(found.track) : []);
  const idx = $derived(found ? flat.findIndex((l) => l.slug === lessonSlug) : -1);
  const prev = $derived(idx > 0 ? flat[idx - 1] : null);
  const next = $derived(idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null);

  const quizScore = $derived(
    submitted ? (questions.length ? questions.filter((q) => q.options[answers[q.id]]?.correct).length / questions.length : 0) : 0
  );
</script>

{#if !found}
  <div class="space-y-4">
    <a href={resolveHref("/dashboard/academy")} class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
      <Icon name="arrow-left" cls="h-4 w-4" /> Nigi Academy
    </a>
    <p class="text-sm text-muted-foreground">Pelajaran tidak ditemukan.</p>
  </div>
{:else}
  {@const { track, module, lesson } = found}
  <div class="mx-auto max-w-3xl space-y-7">
    <!-- Breadcrumb -->
    <nav class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
      <a href={resolveHref("/dashboard/academy")} class="hover:text-foreground">Nigi Academy</a>
      <span aria-hidden="true">/</span>
      <a href={resolveHref(`/dashboard/academy/${track.slug}`)} class="hover:text-foreground">{track.title}</a>
      <span aria-hidden="true">/</span>
      <span class="text-foreground">{module.title}</span>
    </nav>

    <!-- Header pelajaran -->
    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{track.level}</span>
        <span class="inline-flex items-center gap-1 text-xs text-muted-foreground"><Icon name="calendar" cls="h-3.5 w-3.5" /> {lesson.minutes} menit</span>
        {#if completed}<span class="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success-foreground"><Icon name="check" cls="h-3 w-3" weight="bold" /> Selesai</span>{/if}
      </div>
      <h1 class="font-heading text-2xl font-semibold tracking-tight">{lesson.title}</h1>
      <p class="text-base leading-relaxed text-muted-foreground">{lesson.summary}</p>
    </header>

    <!-- Poin utama -->
    <section class="rounded-2xl border border-border bg-card p-6">
      <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Poin utama</h2>
      <ul class="space-y-3">
        {#each lesson.points as p, i (i)}
          <li class="flex gap-3 text-[15.5px] leading-relaxed text-foreground">
            <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style="background:{track.accent}"></span>
            <span>{p}</span>
          </li>
        {/each}
      </ul>
    </section>

    {#if lesson.caseNote}
      <aside class="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p class="flex items-start gap-2 text-[15px] leading-relaxed text-foreground">
          <Icon name="chat" cls="h-4 w-4 mt-1 shrink-0 text-primary" />
          <span><strong class="font-semibold">Studi kasus.</strong> {lesson.caseNote}</span>
        </p>
      </aside>
    {/if}

    <!-- Kuis -->
    {#if questions.length > 0}
      <section class="rounded-2xl border border-border bg-card p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kuis · {questions.length} pertanyaan</h2>
          {#if savedScore !== undefined}<span class="text-xs text-muted-foreground">Skor terakhir: {Math.round(savedScore * 100)}%</span>{/if}
        </div>

        <div class="space-y-6">
          {#each questions as q, qi (q.id)}
            {@const selected = answers[q.id]}
            <fieldset class="space-y-3">
              <legend class="text-[15.5px] font-medium text-foreground">{qi + 1}. {q.prompt}</legend>
              <div class="space-y-2">
                {#each q.options as opt, oi (oi)}
                  {@const isSel = selected === oi}
                  {@const isCorrect = !!opt.correct}
                  <button
                    type="button"
                    onclick={() => choose(q.id, oi)}
                    disabled={submitted}
                    aria-pressed={isSel}
                    class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors
                      {submitted
                        ? isCorrect
                          ? 'border-success bg-success/10 text-foreground'
                          : isSel
                            ? 'border-destructive bg-destructive/10 text-foreground'
                            : 'border-border text-muted-foreground'
                        : isSel
                          ? 'border-primary bg-accent text-foreground'
                          : 'border-border text-foreground hover:border-primary/40 hover:bg-accent/40'}"
                  >
                    <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border {isSel ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}">
                      {#if submitted && isCorrect}<Icon name="check" cls="h-3 w-3" weight="bold" />
                      {:else if submitted && isSel && !isCorrect}<Icon name="x" cls="h-3 w-3" weight="bold" />
                      {:else if isSel}<span class="h-1.5 w-1.5 rounded-full bg-primary-foreground"></span>{/if}
                    </span>
                    <span class="flex-1">{opt.label}</span>
                  </button>
                {/each}
              </div>
              {#if submitted}
                <p class="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">{q.explain}</p>
              {/if}
            </fieldset>
          {/each}
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          {#if !submitted}
            <button
              type="button"
              onclick={submitQuiz}
              disabled={!allAnswered}
              class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="check" cls="h-4 w-4" weight="bold" /> Periksa jawaban
            </button>
            {#if !allAnswered}<span class="text-xs text-muted-foreground">Jawab semua pertanyaan dulu.</span>{/if}
          {:else}
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold {quizScore === 1 ? 'bg-success/15 text-success-foreground' : 'bg-warning/15 text-warning-foreground'}">
                Skor {Math.round(quizScore * 100)}%
              </span>
              <button type="button" onclick={retryQuiz} class="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
                <Icon name="arrow-left" cls="h-4 w-4" /> Ulangi
              </button>
            </div>
          {/if}
        </div>
      </section>
    {/if}

    <!-- Aksi selesai -->
    <section class="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-5">
      {#if completed}
        <span class="inline-flex items-center gap-2 text-sm font-semibold text-success-foreground"><Icon name="check" cls="h-4 w-4" weight="bold" /> Pelajaran selesai</span>
        <button type="button" onclick={unmarkComplete} class="ml-auto text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Tandai belum selesai</button>
      {:else}
        <button
          type="button"
          onclick={markComplete}
          class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px"
        >
          <Icon name="check" cls="h-4 w-4" weight="bold" /> Tandai selesai
        </button>
      {/if}
    </section>

    <!-- Navigasi prev/next -->
    <nav class="flex items-stretch gap-3" aria-label="Navigasi pelajaran">
      {#if prev}
        <a href={resolveHref(`/dashboard/academy/${track.slug}/${prev.slug}`)} class="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
          <Icon name="arrow-left" cls="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0"><span class="block text-[11px] uppercase tracking-wide text-muted-foreground">Sebelumnya</span><span class="block truncate text-sm font-medium text-foreground">{prev.title}</span></span>
        </a>
      {:else}<span class="flex-1"></span>{/if}
      {#if next}
        <a href={resolveHref(`/dashboard/academy/${track.slug}/${next.slug}`)} class="flex flex-1 items-center justify-end gap-3 rounded-2xl border border-border bg-card p-4 text-right transition-colors hover:border-primary/40 hover:bg-accent/40">
          <span class="min-w-0"><span class="block text-[11px] uppercase tracking-wide text-muted-foreground">Berikutnya</span><span class="block truncate text-sm font-medium text-foreground">{next.title}</span></span>
          <Icon name="arrow-up-right" cls="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
      {/if}
    </nav>
  </div>
{/if}
