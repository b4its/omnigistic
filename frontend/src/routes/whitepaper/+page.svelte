<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  // ============================================================================
  // Whitepaper — Benefit-Cost Analysis Armada Listrik (GC Logistics · ISCEA 2026).
  // Gaya: "editorial technical whitepaper" (dark, tenang, premium). Statis —
  // seluruh angka tertulis di halaman (tanpa dependensi API) agar selalu dapat
  // dirender untuk perekaman video. Angka = model kanonik
  // Angka kanonik: 350 unit, dua model (analisis tim, Pertanyaan 4).
  // ============================================================================
  import { resolveHref } from "$lib/utils";
  import EditorialNav from "$lib/components/EditorialNav.svelte";
  import HeroTexture from "$lib/components/HeroTexture.svelte";
  import { whitepaperContent } from "$lib/i18n/content";

  const c = $derived(whitepaperContent());
  const navLinks = $derived(c.navLinks);
  const meta = $derived(c.meta);
  const headline = $derived(c.headline);
  const pasar = $derived(c.pasar);
  const paramA = $derived(c.paramA);
  const paramB = $derived(c.paramB);
  const chainA = $derived(c.chainA);
  const tcoA = $derived(c.tcoA);
  const scenA = $derived(c.scenA);
  const kelasB = $derived(c.kelasB);
  const hematB = $derived(c.hematB);
  const kpiB = $derived(c.kpiB);
  const kritisA = $derived(c.kritisA);
  const kritisB = $derived(c.kritisB);
  const co2 = $derived(c.co2);
  const references = $derived(c.references);
</script>

<svelte:head>
  <title>{c.t.whTitle}</title>
  <meta
    name="description"
    content={m.wp2t1()}
  />
</svelte:head>

<div class="wp min-h-screen antialiased">
  <!-- ============================= NAV ============================= -->
  <EditorialNav
    section="WHITEPAPER"
    links={navLinks}
    cta={{ href: "/dashboard/pusat/ev-bca", label: m.wp2t2() }}
  />

  <!-- ============================= HERO ============================= -->
  <section class="wp-hero">
    <HeroTexture />
    <div class="wp-wrap pt-[clamp(3rem,8vw,6rem)] pb-[clamp(2.5rem,5vw,4rem)]">
      <span class="wp-pill">
        <span class="wp-dot" aria-hidden="true">●</span>
        {c.t.pill}
      </span>

      <h1 class="wp-hero-title mt-7">
        {c.t.h1a} <em class="wp-em">{c.t.h1em}</em>{c.t.h1b}
      </h1>

      <p class="wp-deck mt-7">
        {c.t.deck}
      </p>

      <!-- Meta bar 4 kolom -->
      <div class="wp-meta mt-12">
        {#each meta as m (m.k)}
          <div>
            <p class="wp-label">{m.k}</p>
            <p class="wp-meta-value mt-1.5">{m.v}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <main class="wp-wrap">
    <!-- =========================== ABSTRACT =========================== -->
    <section id="abstract" class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.abstractLabel}</p>
      <h2 class="wp-h2 mt-4 wp-prose">
        {c.t.abstractH}
      </h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          {c.t.abstractP1a} <span class="wp-accent">{c.t.unitEm}</span> {c.t.abstractP1b}
        </p>
        <p>
          {c.t.abstractP2a} <span class="wp-accent">{c.t.positiveEm}</span>{c.t.abstractP2b}
        </p>
      </div>

      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {#each headline as h (h.k)}
          <div class="border-t border-[var(--wp-line)] pt-4">
            <p class="wp-label">{h.k}</p>
            <p class="wp-stat mt-3">{h.v}</p>
          </div>
        {/each}
      </div>
      <p class="wp-muted mt-6 max-w-[68ch] text-[0.9375rem]">
        {c.t.headlineIs} <span class="wp-accent">{c.t.modelBEm}</span> {c.t.headlineNote}
      </p>
    </section>

    <!-- =========================== DATA PASAR =========================== -->
    <section id="pasar" class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.s1Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.s1H}</h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          {c.t.s1P1a} <span class="wp-accent">{c.t.priceEm}</span> {c.t.s1P1b}
        </p>
      </div>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capPasar}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thParam}</th>
              <th scope="col">{c.t.thValue}</th>
              <th scope="col">{c.t.thNote}</th>
            </tr>
          </thead>
          <tbody>
            {#each pasar as b (b.item)}
              <tr>
                <td>{b.item}</td>
                <td>{b.val}</td>
                <td>{b.src}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-note mt-6 max-w-[68ch]">
        {c.t.s1Note1} <span class="wp-accent">{c.t.swapRefEm}</span>
        {c.t.s1Note2}
      </div>
    </section>

    <!-- =========================== MODEL A =========================== -->
    <section id="modela" class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.s2Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.s2H}</h2>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capParamA}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thParam2}</th>
              <th scope="col">{c.t.thValue2}</th>
              <th scope="col">{c.t.thSifat}</th>
            </tr>
          </thead>
          <tbody>
            {#each paramA as row (row[0])}
              <tr>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capChainA}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thStep}</th>
              <th scope="col">{c.t.thResult}</th>
            </tr>
          </thead>
          <tbody>
            {#each chainA as row (row[0])}
              <tr data-emph={row[0].startsWith("Net") || row[0].startsWith("Arus") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mt-10 grid gap-6 lg:grid-cols-2">
        <div class="wp-table-wrap">
          <table class="wp-table">
            <caption>{c.t.capTco}</caption>
            <thead>
              <tr>
                <th scope="col">{c.t.thComp}</th>
                <th scope="col">{c.t.thIce}</th>
                <th scope="col">{c.t.thEv}</th>
              </tr>
            </thead>
            <tbody>
              {#each tcoA as row (row[0])}
                <tr data-emph={row[0].startsWith("TCO") ? "true" : "false"}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="wp-prose">
          <p class="wp-label">{c.t.bcrNpvTitle}</p>
          <p class="mt-3 wp-body">
            {c.t.bcrP1}
            <span class="wp-accent">{c.t.bcrEm}</span>{c.t.bcrP2} <span class="wp-accent">{c.t.npvEm}</span>.
          </p>
          <p class="mt-3 wp-body">
            <span class="wp-accent">{c.t.paybackA}</span> {c.t.paybackB}
          </p>
        </div>
      </div>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capScen}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thSwap}</th>
              <th scope="col">{c.t.thNetYear}</th>
              <th scope="col">{c.t.thNpv}</th>
            </tr>
          </thead>
          <tbody>
            {#each scenA as row (row[0])}
              <tr data-emph={row[0].includes("acuan") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        {c.t.scenNote}
      </p>
    </section>

    <!-- =========================== MODEL B =========================== -->
    <section id="modelb" class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.s3Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.s3H}</h2>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capParamB}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thParam3}</th>
              <th scope="col">{c.t.thValue3}</th>
              <th scope="col">{c.t.thSifat2}</th>
            </tr>
          </thead>
          <tbody>
            {#each paramB as row (row[0])}
              <tr>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capKelas}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thKelas}</th>
              <th scope="col">{c.t.thUnit}</th>
              <th scope="col">{c.t.thIceEv}</th>
              <th scope="col">{c.t.thMode}</th>
              <th scope="col">{c.t.thKonsumsi}</th>
              <th scope="col">{c.t.thBiayaEnergi}</th>
            </tr>
          </thead>
          <tbody>
            {#each kelasB as row (row[0])}
              <tr>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>{row[4]}</td>
                <td>{row[5]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capHemat}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thKelas2}</th>
              <th scope="col">{c.t.thEnergi}</th>
              <th scope="col">{c.t.thServis}</th>
              <th scope="col">{c.t.thPkb}</th>
              <th scope="col">{c.t.thCapex}</th>
              <th scope="col">{c.t.thEmisi}</th>
            </tr>
          </thead>
          <tbody>
            {#each hematB as row (row[0])}
              <tr data-emph={row[0] === m.wp2t3() ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
                <td>{row[4]}</td>
                <td>{row[5]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        {c.t.kelasNote}
      </p>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capKpiB}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thKpi}</th>
              <th scope="col">{c.t.thNilaiKpi}</th>
            </tr>
          </thead>
          <tbody>
            {#each kpiB as row (row[0])}
              <tr data-emph={row[0].startsWith("NPV") || row[0].startsWith("BCR") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="wp-note mt-6 max-w-[68ch]">
        {c.t.kpiNote}
      </div>
    </section>

    <!-- =========================== TITIK KRITIS =========================== -->
    <section id="kritis" class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.s4Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.s4H}</h2>

      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <div class="wp-table-wrap">
          <table class="wp-table">
            <caption>{c.t.capKritisA}</caption>
            <thead>
              <tr>
                <th scope="col">{c.t.thPertanyaan}</th>
                <th scope="col">{c.t.thJawaban}</th>
              </tr>
            </thead>
            <tbody>
              {#each kritisA as row (row[0])}
                <tr>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="wp-table-wrap">
          <table class="wp-table">
            <caption>{c.t.capKritisB}</caption>
            <thead>
              <tr>
                <th scope="col">{c.t.thKelas3}</th>
                <th scope="col">{c.t.thBatas}</th>
              </tr>
            </thead>
            <tbody>
              {#each kritisB as row (row[0])}
                <tr>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        {c.t.kritisNote}
      </p>
    </section>

    <!-- =========================== EMISI =========================== -->
    <section id="emisi" class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.s5Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.s5H}</h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          {c.t.s5P}
        </p>
      </div>
      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.capCo2}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thModel}</th>
              <th scope="col">{c.t.thEmisiKm}</th>
              <th scope="col">{c.t.thPenurunan}</th>
              <th scope="col">{c.t.thPerTahun}</th>
            </tr>
          </thead>
          <tbody>
            {#each co2 as row (row[0])}
              <tr data-emph={row[3].includes("291") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        {c.t.co2Note}
      </p>
    </section>

    <!-- =========================== CATATAN =========================== -->
    <section id="catatan" class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.s6Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.s6H}</h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          <span class="wp-accent">{c.t.scopeLabel}</span> {c.t.scopeP}
        </p>
        <p>
          <span class="wp-accent">{c.t.pilotLabel}</span> {c.t.pilotP}
        </p>
        <p>
          <span class="wp-accent">{c.t.heavyLabel}</span> {c.t.heavyP}
        </p>
        <p>
          <span class="wp-accent">{c.t.scaleLabel}</span> {c.t.scaleP}
        </p>
      </div>

      <blockquote class="wp-quote mt-10 max-w-[62ch]">
        {c.t.quoteA}
        <span class="wp-accent">{c.t.quoteEm}</span>
        {c.t.quoteB}
      </blockquote>
    </section>

    <!-- =========================== REFERENSI =========================== -->
    <section id="referensi" class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.refLabel}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.refH}</h2>
      <ol class="mt-8 space-y-3 wp-prose">
        {#each references as r (r.n)}
          <li class="wp-ref flex gap-3">
            <span class="wp-mono wp-accent">[{r.n}]</span>
            <a href={r.u} target="_blank" rel="noopener noreferrer">{r.t}</a>
          </li>
        {/each}
      </ol>
      <p class="wp-muted mt-8 max-w-[68ch] text-[0.8125rem]">
        {c.t.refNote}
      </p>
    </section>
  </main>

  <!-- =========================== FOOTER =========================== -->
  <footer class="border-t border-[var(--wp-line)]">
    <div class="wp-wrap flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
      <p class="wp-mono text-[0.75rem] tracking-[0.05em] wp-muted">
        {c.t.footBrand}
      </p>
      <div class="flex items-center gap-5">
        <a href={resolveHref("/analisis")} class="wp-nav-link">{c.t.footAnalisis}</a>
        <a href={resolveHref("/dashboard/pusat/ev-bca")} class="wp-nav-link">{c.t.footModel}</a>
      </div>
    </div>
  </footer>
</div>
