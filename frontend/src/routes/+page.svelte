<script lang="ts">
  import { roleLabel } from "$lib/i18n/labels";
  import { onMount } from "svelte";
  import { gsapReveal } from "$lib/actions/gsapReveal";
  import Icon from "$lib/components/Icon.svelte";
  import GlitterIcon from "$lib/components/ui/GlitterIcon.svelte";
  import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
  import { cn, resolveHref } from "$lib/utils";
  import { landingContent } from "$lib/i18n/content";

  /** Potong di batas kata; hanya tambah `…` bila teks BENAR-BENAR terpotong. */
  // Konten dua bahasa: dipilih saat render agar locale per-permintaan benar.
  const c = $derived(landingContent());

  const navLinks = $derived(c.nav);

  const rootCauses = $derived(c.rootCauses);

  const heroProjects = $derived(c.heroProjects);

  const roles = $derived(c.roles);

  let menuOpen = $state(false);
  let loaded = $state(false);

  onMount(() => {
    const raf = requestAnimationFrame(() => (loaded = true));
    return () => cancelAnimationFrame(raf);
  });

  let scrolled = $state(false);
  onMount(() => {
    const onScroll = () => (scrolled = window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });

  const surfaceGrowth = $derived(c.surfaceGrowth);
  const surfaceConcern = $derived(c.surfaceConcern);

  const approach = $derived(c.approach);

  const arch = $derived(c.arch);

  const phases = $derived(c.phases);

  const targets = $derived(c.targets);

  const answers = $derived(c.answers);

  const solutions = $derived(c.solutions);
  const impactRows = $derived(c.impactRows);
</script>

<div class={cn("landing min-h-screen antialiased", loaded && "loaded")} style="background: var(--lnd-bg); color: var(--lnd-ink)">
  <a href="#lnd-main" class="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-full focus:bg-[var(--lnd-ink)] focus:px-5 focus:py-2.5 focus:text-sm focus:text-[var(--lnd-bg)]">{c.t.skip}</a>

  <!-- Header -->
  <header class="fixed inset-x-0 top-0 z-50 border-b transition-all duration-300" style="background: {scrolled ? 'color-mix(in srgb, var(--lnd-bg) 86%, transparent)' : 'transparent'}; backdrop-filter: {scrolled ? 'blur(12px)' : 'none'}; border-color: {scrolled ? 'var(--lnd-line)' : 'transparent'}">
    <div class="mx-auto relative z-[51] flex h-[76px] max-w-[1520px] items-center gap-10 px-[clamp(1.25rem,4vw,4.5rem)]">
      <a href="#lnd-main" aria-label="Omnigistic, beranda" class="flex items-baseline gap-1 font-heading text-[21px] font-semibold tracking-[0.02em]">
        Omnigistic
      </a>
      <nav class="mx-auto hidden items-center gap-8 md:flex" aria-label="Navigasi utama">
        {#each navLinks as n (n.href)}
          <a href={resolveHref(n.href)} class="relative py-2 text-[14px] font-medium uppercase tracking-[0.07em] text-[var(--lnd-ink)] transition-colors hover:text-[color:var(--lnd-accent-ink)] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-[var(--lnd-accent)] after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100">{n.label}</a>
        {/each}
      </nav>
      <div class="ml-auto flex items-center gap-5 md:ml-0">
        <LanguageSwitcher variant="landing" class="hidden sm:flex" />
        <a href={resolveHref("/login")} class="hidden rounded-full bg-[var(--lnd-ink)] px-6 py-3 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-bg)] transition-colors hover:bg-[var(--lnd-accent)] sm:inline-flex">{c.t.login}</a>
        <button type="button" onclick={() => (menuOpen = !menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} class="flex h-11 w-11 flex-col items-center justify-center gap-[7px] rounded-lg p-2.5 md:hidden">
          <span class={cn("block h-[1.5px] w-6 transition-transform duration-300", menuOpen ? "translate-y-[4.5px] rotate-45" : "")}></span>
          <span class={cn("block h-[1.5px] w-6 transition-transform duration-300", menuOpen ? "-translate-y-[4.5px] -rotate-45" : "")}></span>
        </button>
      </div>
    </div>

    {#if menuOpen}
      <div class="fixed inset-0 z-40 flex flex-col justify-center bg-[var(--lnd-ink)] px-[clamp(1.5rem,6vw,3rem)] text-[var(--lnd-bg)] md:hidden" role="dialog" aria-modal="true" aria-label="Menu seluler">
        <nav aria-label="Menu seluler" class="flex flex-col gap-1">
          {#each navLinks as n, i (n.href)}
            <a href={resolveHref(n.href)} onclick={() => (menuOpen = false)} class="flex items-baseline gap-3 py-1 font-heading text-[clamp(2rem,8vw,3.2rem)] font-light leading-[1.15]">
              <span class="text-[14px] font-semibold tracking-[0.07em] text-[var(--lnd-accent)]">0{i + 1}</span>
              {n.label}
            </a>
          {/each}
        </nav>
      </div>
    {/if}
  </header>

  <main id="lnd-main" class="pt-[76px] scroll-mt-[76px]">
    <!-- HERO -->
    <section class="relative overflow-hidden px-[clamp(1.25rem,4vw,4.5rem)] pt-[clamp(5rem,11vh,8rem)] pb-[clamp(3rem,7vw,6rem)]">
      <div class="landing-grid" aria-hidden="true"></div>
      <div class="pointer-events-none absolute -left-40 -top-20 h-[36rem] w-[36rem] rounded-full opacity-[0.12] blur-[130px]" style="background: radial-gradient(circle, var(--lnd-accent), transparent 70%)" aria-hidden="true"></div>
      <div class="relative mx-auto max-w-[1720px]">
        <p class="eyebrow">{c.t.eyebrow}</p>
        <h1 class="mt-10 font-heading text-[clamp(3rem,10vw,8.5rem)] font-normal leading-[1.0] tracking-[-0.015em]">
          <span class="block overflow-hidden pb-[0.34em] -mb-[0.34em]"><span class="line-inner block">{c.t.heroLead1} <em class="font-medium italic">{c.t.heroEm}</em></span></span>
          <span class="block overflow-hidden"><span class="line-inner block pb-[0.06em]" style="animation-delay: 140ms">{c.t.heroLead2} <em class="accent-gradient font-semibold italic">{c.t.heroStrong}</em><span class="text-[var(--lnd-accent)]">.</span></span></span>
        </h1>

        <div class="mt-12 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-16">
          <div>
            <p class="max-w-[52ch] text-[1.05rem] leading-relaxed text-[var(--lnd-soft)]">
              <strong class="font-semibold text-[var(--lnd-ink)]">{c.t.heroMeta}</strong>
              {c.t.heroTail}
            </p>
            <div class="mt-8 flex flex-wrap gap-4">
              <a href="#jawaban" class="rounded-full bg-[var(--lnd-accent)] px-8 py-4 font-mono text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-bg)] transition-colors duration-300 hover:bg-[color-mix(in_oklab,var(--lnd-accent)_88%,black)] active:scale-[0.98]">
                {c.t.ctaAnswers} <Icon name="arrow-up-right" cls="ml-2 inline h-4 w-4" weight="bold" />
              </a>
              <a href="#arsitektur" class="rounded-full border border-[var(--lnd-ink)] px-8 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-ink)] transition-all hover:border-[var(--lnd-accent-ink)] hover:text-[color:var(--lnd-accent-ink)] active:scale-[0.98]">{c.t.ctaSystem}</a>
            </div>
          </div>

          <div class="animate-rise grid grid-cols-2 gap-3" style="animation-delay: 240ms">
            <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
              <p class="font-heading text-[clamp(1.8rem,3.4vw,3rem)] font-light tabular-nums leading-none">23</p>
              <p class="mt-2 text-[14px] font-medium text-[var(--lnd-ink)]">{c.t.statHub}</p>
              <p class="mt-0.5 text-[14px] text-[color:var(--lnd-soft)]">{c.t.statEra}</p>
            </div>
            <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
              <p class="font-heading text-[clamp(1.8rem,3.4vw,3rem)] font-light tabular-nums leading-none">{c.t.statParcel}</p>
              <p class="mt-2 text-[14px] font-medium text-[var(--lnd-ink)]">{c.t.statParcelLabel}</p>
              <p class="mt-0.5 text-[14px] text-[color:var(--lnd-soft)]">{c.t.statGrowth}</p>
            </div>
            <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
              <p class="font-heading text-[clamp(1.8rem,3.4vw,3rem)] font-light tabular-nums leading-none">{c.t.statShare}</p>
              <p class="mt-2 text-[14px] font-medium text-[var(--lnd-ink)]">{c.t.statShareLabel}</p>
              <p class="mt-0.5 text-[14px] text-[color:var(--lnd-soft)]">{c.t.statShareDelta}</p>
            </div>
            <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
              <p class="font-heading text-[clamp(1.8rem,3.4vw,3rem)] font-light tabular-nums leading-none">{c.t.statUtil}</p>
              <p class="mt-2 text-[14px] font-medium text-[var(--lnd-ink)]">{c.t.statUtilLabel}</p>
              <p class="mt-0.5 text-[14px] text-[color:var(--lnd-soft)]">{c.t.statUtilDelta}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ENAM JAWABAN -->
    <section use:gsapReveal id="jawaban" class="scroll-mt-[84px] border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <p class="eyebrow">{c.t.secAnswers}</p>
          <h2 class="mt-6 font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.hAnswersA} <em class="italic">{c.t.hAnswersEm}</em></h2>
          <p class="mt-4 max-w-[52ch] text-sm leading-relaxed text-[var(--lnd-soft)]">{c.t.hAnswersDesc}</p>
        </div>
        <ol class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-line)] sm:grid-cols-2 lg:grid-cols-3">
          {#each answers as a (a.n)}
            <li class="flex flex-col gap-3 bg-[var(--lnd-surface)] p-6 transition-colors hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-center justify-between">
                <span class="font-heading text-[15px] italic tabular-nums text-[var(--lnd-accent-ink)]">{a.n}</span>
                <span class="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--lnd-line)] text-[var(--lnd-accent)]">
                  <Icon name="arrow-up-right" cls="h-3.5 w-3.5" weight="bold" />
                </span>
              </div>
              <p class="text-[16px] font-semibold leading-snug tracking-tight text-[var(--lnd-ink)]">{a.q}</p>
              <p class="text-[15px] leading-relaxed text-[var(--lnd-soft)]">{a.a}</p>
              <ul class="flex flex-wrap gap-1.5">
                {#each a.metrics as m (m)}
                  <li class="rounded-full border border-[var(--lnd-line)] bg-[var(--lnd-bg-raise)] px-2.5 py-1 text-[13.5px] font-semibold text-[var(--lnd-ink)]">{m}</li>
                {/each}
              </ul>
              <div class="mt-auto flex flex-wrap gap-3 border-t border-dashed border-[var(--lnd-line-soft)] pt-3">
                {#each a.links as l (l.href)}
                  <a href={resolveHref(l.href)} class="inline-flex items-center gap-1 text-[13.5px] font-semibold uppercase tracking-[0.06em] text-[var(--lnd-accent-ink)] transition-colors hover:text-[var(--lnd-ink)]">
                    {l.label} <Icon name="arrow-up-right" cls="h-3 w-3" weight="bold" />
                  </a>
                {/each}
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </section>



    <!-- SURFACE STORY -->
    <section class="px-[clamp(1.25rem,4vw,4.5rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <h2 class="mt-6 max-w-3xl font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">
            {c.t.hDiagA} <em class="italic">{c.t.hDiagEm}</em>
          </h2>
        </div>
        <div class="mt-12 grid gap-8 lg:grid-cols-2">
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <div class="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--lnd-positive-on-ink)]">
              <Icon name="trend" cls="h-4 w-4" weight="bold" /> {c.t.posGrowth}
            </div>
            <div class="mt-5 space-y-3">
              {#each surfaceGrowth as g (g.label)}
                <div class="flex items-baseline justify-between rounded-xl bg-[var(--lnd-bg-raise)] px-4 py-3">
                  <span class="text-sm text-[var(--lnd-soft)]">{g.label}</span>
                  <span class="font-bold tabular-nums text-[var(--lnd-ink)]">{g.value}<span class="ml-2 text-[14px] font-semibold text-[color:var(--lnd-positive-on-ink)]">{g.delta}</span></span>
                </div>
              {/each}
            </div>
          </div>
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <div class="flex items-center gap-2 text-[15px] font-semibold text-[var(--lnd-late)]">
              <Icon name="warn" cls="h-4 w-4" weight="bold" /> {c.t.posConcern}
            </div>
            <div class="mt-5 space-y-3">
              {#each surfaceConcern as c (c.label)}
                <div class="flex items-baseline justify-between rounded-xl bg-[var(--lnd-bg-raise)] px-4 py-3">
                  <span class="text-sm text-[var(--lnd-soft)]">{c.label}</span>
                  <span class="font-bold tabular-nums text-[var(--lnd-ink)]">{c.value}<span class="ml-2 text-[14px] font-semibold text-[var(--lnd-late)]">{c.delta}</span></span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- DIAGNOSIS -->
    <section use:gsapReveal  id="diagnosis" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p class="eyebrow">{c.t.secDiagnosis}</p>
            <h2 class="mt-6 font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.diagCountA} <em class="text-[var(--lnd-accent-ink)] italic">{c.t.diagCountB}</em></h2>
          </div>
          <p class="max-w-sm text-sm leading-relaxed text-[var(--lnd-soft)]">{c.t.hDiagDesc}</p>
        </div>
        <ol class="my-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-line)] sm:grid-cols-2 lg:grid-cols-3">
          {#each rootCauses as rc (rc.code)}
            <li class="group relative flex flex-col gap-3 bg-[var(--lnd-surface)] p-6 transition-colors hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-start justify-between">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lnd-ink)] text-[var(--lnd-bg)] transition-colors group-hover:bg-[var(--lnd-accent)]">
                  <Icon name={rc.icon} cls="h-5 w-5" weight="duotone" />
                </span>
                <span class="font-heading text-[15px] italic tabular-nums text-[var(--lnd-accent-ink)]">{rc.code}</span>
              </div>
              <div>
                <p class="text-[16px] font-semibold leading-tight tracking-tight text-[var(--lnd-ink)]">{rc.title}</p>
                <p class="mt-1 font-heading text-[15px] italic text-[var(--lnd-soft)]">{rc.title}</p>
              </div>
              <p class="text-[15px] leading-relaxed text-[var(--lnd-soft)]"><span class="font-medium text-[var(--lnd-ink)]">{c.t.symptoms}</span> {rc.symptoms}</p>
              <div class="mt-auto rounded-xl border border-[var(--lnd-line)] bg-[var(--lnd-bg-raise)] p-3">
                <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-soft)]">{c.t.solutionLabel}</p>
                <p class="mt-1 text-[15px] leading-snug text-[var(--lnd-ink)]">{rc.solution}</p>
                <p class="mt-2 text-[14px] font-semibold text-[var(--lnd-accent-ink)]">{rc.kpi}</p>
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- SOLUSI -->
    <section use:gsapReveal id="solusi" class="scroll-mt-[84px] border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p class="eyebrow">{c.t.secSolutions}</p>
            <h2 class="mt-6 font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.hSolA} <em class="italic">{c.t.hSolEm}</em></h2>
          </div>
          <p class="max-w-sm text-sm leading-relaxed text-[var(--lnd-soft)]">{c.t.hSolDesc}</p>
        </div>

        <ol class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-line)] sm:grid-cols-2 lg:grid-cols-3">
          {#each solutions as s (s.n)}
            <li class="flex flex-col gap-3 bg-[var(--lnd-surface)] p-6 transition-colors hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-center justify-between">
                <span class="font-heading text-[15px] italic tabular-nums text-[var(--lnd-accent-ink)]">{s.n}</span>
                <span class="hub-label text-[13px] text-[var(--lnd-soft)]">{s.root}</span>
              </div>
              <p class="text-[16px] font-semibold leading-snug tracking-tight text-[var(--lnd-ink)]">{s.name}</p>
              <p class="text-[15px] leading-relaxed text-[var(--lnd-soft)]">{s.impact}</p>
              <p class="mt-auto border-t border-dashed border-[var(--lnd-line-soft)] pt-3 text-[14px] font-semibold text-[var(--lnd-accent-ink)]">{s.kpi}</p>
            </li>
          {/each}
        </ol>

        <div class="mt-6 grid gap-4 rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-ink)] p-8 text-[var(--lnd-bg)] sm:grid-cols-2 lg:grid-cols-4">
          {#each impactRows as [m, b, t] (m)}
            <div>
              <p class="text-[13.5px] uppercase tracking-wider text-[var(--lnd-on-ink)]">{m}</p>
              <p class="mt-2 font-heading text-[clamp(1.4rem,2.4vw,2rem)] font-light leading-none tabular-nums">{t}</p>
              <p class="mt-1 text-[14px] text-[var(--lnd-on-ink)] line-through">{b}</p>
            </div>
          {/each}
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-4">
          <a href={resolveHref("/analisis")} class="inline-flex items-center gap-2 rounded-full bg-[var(--lnd-ink)] px-8 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-bg)] transition-colors hover:bg-[var(--lnd-accent)]">
            {c.t.hEvA} <Icon name="arrow-up-right" cls="h-4 w-4" weight="bold" />
          </a>
          <span class="text-[14px] text-[var(--lnd-soft)]">{c.t.evDesc}</span>
        </div>
      </div>
    </section>

    <!-- INDEX PROYEK -->
    <section id="proyek" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] pt-2 pb-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <h2 class="font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.secTruth} <em class="italic">{c.t.truthEm}</em></h2>
        </div>
        <ol class="mt-10">
          {#each heroProjects as p (p.num)}
            <li>
              <a href={resolveHref(`/dashboard/${p.id}/overview`)} class="group grid w-full cursor-pointer grid-cols-[3rem_1fr] items-center gap-3 border-t border-[var(--lnd-line)] px-2 py-6 text-left transition-[background,padding] duration-300 hover:bg-[var(--lnd-ink)] hover:pl-6 hover:text-[var(--lnd-bg)] sm:grid-cols-[3rem_1fr_11rem] md:grid-cols-[3rem_1fr_auto_11rem_2rem]">
                <span class="font-heading text-[16px] italic tabular-nums text-[var(--lnd-accent-ink)]">{p.num}</span>
                <h3 class="font-heading text-[clamp(1.4rem,3vw,2.4rem)] font-light leading-tight tracking-tight transition-transform duration-300 group-hover:translate-x-2">{p.name}</h3>
                <span class="hidden text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-soft)] transition-colors md:block">{p.meta}</span>
                <span class="hidden text-right text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-soft)] transition-colors sm:block group-hover:text-[var(--lnd-on-ink)]">{p.desc.slice(0, 44)}</span>
                <span class="hidden justify-end text-[var(--lnd-accent)] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:flex">
                  <Icon name="arrow-up-right" cls="h-5 w-5" weight="bold" />
                </span>
              </a>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- PENDEKATAN -->
    <section use:gsapReveal  id="pendekatan" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <h2 class="font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.hTruthA} <em class="italic">{c.t.hTruthEm}</em></h2>
        </div>
        <ol class="mt-12 space-y-10">
          {#each approach as ap, i (ap.n)}
            <li class="border-t border-[var(--lnd-ink)] pt-5" style="margin-left: {i * 22}%">
              <span class="font-heading text-[16px] italic text-[var(--lnd-accent-ink)]">{ap.n}</span>
              <h3 class="mt-2 font-heading text-[clamp(1.5rem,2.8vw,2.1rem)] font-light leading-tight tracking-tight">{ap.t}</h3>
              <p class="mt-3 max-w-[46ch] leading-relaxed text-[var(--lnd-soft)]">{ap.d}</p>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- ARSITEKTUR -->
    <section use:gsapReveal  id="arsitektur" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <p class="eyebrow">{c.t.secArch}</p>
          <h2 class="mt-6 font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.hArchA} <em class="italic">Nigi AI</em></h2>
        </div>
        <ol class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-line)] sm:grid-cols-2 lg:grid-cols-3">
          {#each arch as a, i (a.layer)}
            <li class="group relative flex flex-col gap-3 bg-[var(--lnd-surface)] p-7 transition-colors hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-center gap-3">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lnd-ink)] text-sm font-bold text-[var(--lnd-bg)] transition-colors group-hover:bg-[var(--lnd-accent)]">{i + 1}</span>
                <p class="font-heading text-lg font-semibold tracking-tight">{a.layer}</p>
              </div>
              <p class="text-[16px] font-medium text-[var(--lnd-ink)]">{a.title}</p>
              <p class="text-[15px] leading-relaxed text-[var(--lnd-soft)]">{a.desc}</p>
            </li>
          {/each}
        </ol>
        <div class="mt-6 flex flex-col gap-6 rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-ink)] p-8 text-[var(--lnd-bg)] sm:flex-row sm:items-center">
          <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--lnd-accent)]">
            <GlitterIcon cls="h-6 w-6" />
          </span>
          <div class="min-w-0">
            <h3 class="font-heading text-2xl font-light tracking-tight">{c.t.aiTitle}</h3>
            <p class="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--lnd-on-ink)]">{c.t.aiDesc}</p>
          </div>
          <a href={resolveHref("/login")} class="ml-auto shrink-0 rounded-full border border-[var(--lnd-bg)] px-6 py-3 text-[14.5px] font-semibold uppercase tracking-[0.08em] transition-colors hover:border-[var(--lnd-accent-ink)] hover:bg-[var(--lnd-accent)]">
            {c.t.ctaPortal} <Icon name="arrow-up-right" cls="ml-2 inline h-4 w-4" weight="bold" />
          </a>
        </div>
      </div>
    </section>

    <!-- PERAN -->
    <section use:gsapReveal  id="roles" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <h2 class="font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.secPortals} <em class="italic">{c.t.hPortalEm}</em></h2>
        </div>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {#each roles as r (r.slug)}
            <a href={resolveHref(`/dashboard/${r.slug.toLowerCase()}/overview`)} class="group flex h-full flex-col gap-3 rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6 transition-colors hover:border-[var(--lnd-accent-ink)] hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-center gap-2">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lnd-ink)] text-xs font-bold text-[var(--lnd-bg)] transition-colors group-hover:bg-[var(--lnd-accent)]">{r.initials}</span>
                <span class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">{roleLabel(r.slug)}</span>
              </div>
              <p class="text-base font-semibold text-[var(--lnd-ink)]">{r.name}</p>
              <p class="text-[13px] uppercase tracking-wide text-[var(--lnd-soft)]">{r.role}</p>
              <p class="mt-auto pt-2 text-[15px] leading-relaxed text-[var(--lnd-soft)]">{r.desc}</p>
              <span class="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--lnd-accent-ink)] group-hover:underline">Buka portal <Icon name="arrow-up-right" cls="h-3.5 w-3.5" weight="bold" /></span>
            </a>
          {/each}
        </div>
      </div>
    </section>

    <!-- ROADMAP -->
    <section use:gsapReveal  id="roadmap" class="scroll-mt-[84px] border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <p class="eyebrow">Roadmap</p>
          <h2 class="mt-6 font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.hRoadA}<em class="italic">{c.t.hRoadEm}</em></h2>
        </div>
        <ol class="mt-12 grid gap-6 md:grid-cols-3">
          {#each phases as p (p.f)}
            <li class="flex h-full flex-col rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
              <div class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">{p.f}, {p.t}</div>
              <p class="mt-3 text-[15px] leading-relaxed text-[var(--lnd-ink)]">{p.w}</p>
              <p class="mt-3 border-t border-dashed border-[var(--lnd-line-soft)] pt-2 text-[14px] italic text-[var(--lnd-soft)]">{p.s}</p>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- TARGET -->
    <section class="border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px] rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-ink)] p-10 text-center">
        <h2 class="mt-3 font-heading text-[clamp(1.8rem,3.5vw,2.8rem)] font-light tracking-tight text-[var(--lnd-bg)]">{c.t.secTargets}</h2>
        <div class="mt-8 overflow-x-auto">
          <table class="mx-auto w-full max-w-3xl text-sm text-[var(--lnd-bg)]">
            <caption class="sr-only">{c.t.targetsCaption}</caption>
            <thead>
              <tr class="border-b border-[color:var(--lnd-line-on-ink)] text-[13px] uppercase tracking-wider text-[var(--lnd-on-ink)]">
                <th scope="col" class="py-3 text-left font-medium">{c.t.thMetric}</th>
                <th scope="col" class="py-3 text-right font-medium">{c.t.thToday}</th>
                <th scope="col" class="py-3 text-right font-medium">{c.t.thTarget}</th>
              </tr>
            </thead>
            <tbody>
              {#each targets as [m, b, t] (m)}
                <tr class="border-b border-[color:var(--lnd-line-on-ink)] last:border-0">
                  <td class="py-3 text-left font-medium text-[var(--lnd-bg)]">{m}</td>
                  <td class="py-3 text-right text-[var(--lnd-on-ink)] line-through">{b}</td>
                  <td class="py-3 text-right font-semibold text-[color:var(--lnd-positive-on-ink)]">{t}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <a href={resolveHref("/login")} class="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--lnd-accent-ink)] px-8 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-bg)] transition-colors hover:bg-[var(--lnd-bg)] hover:text-[var(--lnd-ink)]">
          {c.t.ctaExplore} <Icon name="arrow-up-right" cls="h-4 w-4" weight="bold" />
        </a>
        <div class="mt-4 text-[13px] uppercase tracking-[0.08em]">
          <a href={resolveHref("/dashboard/methodology")} class="text-[color:var(--lnd-on-ink)] underline-offset-4 hover:underline hover:text-[color:var(--lnd-accent-ink)]">{c.t.navMethodology}</a> ·
          <a href={resolveHref("/dashboard/kpi")} class="text-[color:var(--lnd-on-ink)] underline-offset-4 hover:underline hover:text-[color:var(--lnd-accent-ink)]">{c.t.navKpi}</a>
        </div>
      </div>
    </section>

    <!-- SUMBER & BATASAN -->
    <section class="border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <p class="eyebrow">{c.t.secSources}</p>
          <h2 class="mt-6 max-w-3xl font-heading text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">{c.t.hSrcA} <em class="italic">{c.t.hSrcEm}</em></h2>
        </div>
        <div class="mt-12 grid gap-6 lg:grid-cols-3">
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">{c.t.srcOfficial}</p>
            <p class="mt-3 text-[15.5px] leading-relaxed text-[var(--lnd-soft)]">{c.t.srcOfficialText}</p>
          </div>
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">{c.t.srcAssumption}</p>
            <p class="mt-3 text-[15.5px] leading-relaxed text-[var(--lnd-soft)]">{c.t.srcAssumptionText}</p>
          </div>
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">{c.t.srcProto}</p>
            <p class="mt-3 text-[15.5px] leading-relaxed text-[var(--lnd-soft)]">{c.t.srcProtoText}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="bg-[var(--lnd-ink)] px-[clamp(1.25rem,4vw,4.5rem)] pt-16 pb-8 text-[var(--lnd-bg)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p class="text-[14px] font-semibold uppercase tracking-wide text-[var(--lnd-on-ink)]">{c.t.contact}</p>
            <h2 class="mt-4 font-heading text-[clamp(2rem,6vw,4.5rem)] font-light leading-[1.05] tracking-[-0.02em]">{c.t.hCtaA} <em class="italic">{c.t.hCtaEm}</em><span class="text-[var(--lnd-accent)]">?</span></h2>
          </div>
          <a href={resolveHref("/login")} class="inline-flex items-center gap-3 border-b border-[color:var(--lnd-line-on-ink)] pb-1 font-heading text-[clamp(1.2rem,2.6vw,1.8rem)] transition-colors hover:border-[var(--lnd-accent-ink)]">
            {c.t.ctaDashboard} <Icon name="arrow-up-right" cls="h-5 w-5 text-[var(--lnd-accent)]" weight="bold" />
          </a>
        </div>
        <div class="mt-12 grid gap-10 border-t border-[color:var(--lnd-line-on-ink)] pt-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 class="text-[14px] font-semibold uppercase tracking-[0.09em] text-[var(--lnd-on-ink)]">Sistem</h3>
            <p class="mt-4 text-[16px] leading-relaxed">{c.t.footSystem}</p>
          </div>
          <div>
            <h3 class="text-[14px] font-semibold uppercase tracking-[0.09em] text-[var(--lnd-on-ink)]">{c.t.footNav}</h3>
            <div class="mt-4 space-y-2">
              {#each navLinks as n (n.href)}
                <a href={resolveHref(n.href)} class="block w-fit border-b border-transparent transition-colors hover:border-[var(--lnd-accent-ink)]">{n.label}</a>
              {/each}
            </div>
          </div>
          <div>
            <h3 class="text-[14px] font-semibold uppercase tracking-[0.09em] text-[var(--lnd-on-ink)]">{c.t.footTeam}</h3>
            <p class="mt-4 text-[16px] leading-relaxed">Dalila Syazwani · Virgiawan Prima Rizky<br />Baits Rika Saputra · Marwah Syakinah Indrawati</p>
          </div>
        </div>
        <div class="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--lnd-line-on-ink)] pt-6 text-[14px] uppercase tracking-[0.085em] text-[var(--lnd-on-ink)]">
          <span>{c.t.copyright}</span>
          <span>{c.t.footCase}</span>
        </div>
      </div>
    </footer>
  </main>
</div>