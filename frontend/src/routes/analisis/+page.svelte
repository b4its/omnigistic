<script lang="ts">
  import { gsapReveal } from "$lib/actions/gsapReveal";
  import { resolveHref } from "$lib/utils";
  import EditorialNav from "$lib/components/EditorialNav.svelte";
  import HeroTexture from "$lib/components/HeroTexture.svelte";
  import { analisisContent } from "$lib/i18n/content";

  const c = $derived(analisisContent());
  const layers = $derived(c.layers);
  const order = $derived(c.order);
  const biz = $derived(c.biz);
  const fin = $derived(c.fin);
  const dataMap = $derived(c.dataMap);
  const derivedMetrics = $derived(c.derivedMetrics);
  const gaps = $derived(c.gaps);
  const sol = $derived(c.sol);
  const arch = $derived(c.arch);
  const phases = $derived(c.phases);

  /* ── Jawaban 6 pertanyaan strategis: angka kanonik dari analisis tim ─────── */
  const questions = $derived(c.questions);
</script>

<svelte:head><title>{c.t.pageTitle} · Omnigistic</title></svelte:head>

<div class="wp min-h-screen antialiased">
  <!-- ============================= NAV ============================= -->
  <EditorialNav
    section={c.t.section}
    links={[
      { href: "#kerangka", label: c.t.navKerangka },
      { href: "#bisnis", label: c.t.navBisnis },
      { href: "#data", label: c.t.navData },
      { href: "#pertanyaan", label: c.t.navPertanyaan },
      { href: "#solusi", label: c.t.navSolusi }
    ]}
    cta={{ href: "/whitepaper", label: c.t.cta }}
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
        {c.t.h1a}<em class="wp-em">{c.t.h1em}</em>.
      </h1>
      <p class="wp-deck mt-7">
        {c.t.deck}
      </p>
      <div class="wp-meta mt-12">
        {#each [
          { k: c.t.metaFramingK, v: c.t.metaFramingV },
          { k: c.t.metaMethodK, v: c.t.metaMethodV },
          { k: c.t.metaScopeK, v: c.t.metaScopeV },
          { k: c.t.metaCloseK, v: c.t.metaCloseV }
        ] as m (m.k)}
          <div>
            <p class="wp-label">{m.k}</p>
            <p class="wp-meta-value mt-1.5">{m.v}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <main class="wp-wrap">
    <!-- =========================== KERANGKA =========================== -->
    <section id="kerangka" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.sec1Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.sec1H}</h2>
      <p class="wp-deck mt-5">
        {c.t.sec1Deck}
      </p>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.cap1}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thLayer}</th>
              <th scope="col">{c.t.thName}</th>
              <th scope="col">{c.t.thTool}</th>
              <th scope="col">{c.t.thQuestion}</th>
            </tr>
          </thead>
          <tbody>
            {#each layers as r (r.l)}
              <tr>
                <td>{r.l}</td>
                <td>{r.n}</td>
                <td>{r.t}</td>
                <td>{r.q}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-grid wp-grid-3 mt-8">
        {#each order as [n, t, d] (n)}
          <div class="wp-card-line">
            <p class="wp-index">{n}</p>
            <p class="wp-h3 mt-2">{t}</p>
            <p class="wp-muted mt-1.5 text-[0.9375rem]">{d}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- =========================== BISNIS =========================== -->
    <section id="bisnis" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.sec2Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.sec2H}</h2>

      <div class="wp-grid wp-grid-3 mt-8">
        {#each biz as b (b.t)}
          <div class="wp-card">
            <p class="wp-h3">{b.t}</p>
            <p class="wp-muted mt-2 text-[0.9375rem] leading-relaxed">{b.d}</p>
          </div>
        {/each}
      </div>

      <div class="wp-table-wrap mt-6">
        <table class="wp-table">
          <caption>{c.t.cap2}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thCategory}</th>
              <th scope="col">{c.t.th2020}</th>
              <th scope="col">{c.t.th2023}</th>
              <th scope="col">{c.t.thChange}</th>
            </tr>
          </thead>
          <tbody>
            {#each fin as [k, a, b, c] (k)}
              <tr>
                <td>{k}</td>
                <td>{a}</td>
                <td>{b}</td>
                <td>{c}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        {c.t.note2}
      </p>
    </section>

    <!-- =========================== DATA =========================== -->
    <section id="data" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.sec3Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.sec3H}</h2>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.cap3}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thSource}</th>
              <th scope="col">{c.t.thContent}</th>
              <th scope="col">{c.t.thKeyFigure}</th>
              <th scope="col">{c.t.thRoot}</th>
            </tr>
          </thead>
          <tbody>
            {#each dataMap as [s, i, k, a] (s)}
              <tr>
                <td>{s}</td>
                <td>{i}</td>
                <td>{k}</td>
                <td>{a}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-grid wp-grid-2 mt-6" style="grid-template-columns: 1.2fr 1fr">
        <div class="wp-card">
          <p class="wp-label">{c.t.mlTitle}</p>
          <ul class="wp-list mt-3 space-y-2">
            {#each derivedMetrics as d (d)}<li>{d}</li>{/each}
          </ul>
        </div>
        <div class="wp-card wp-flag">
          <p class="wp-label">{c.t.gapsTitle}</p>
          <ul class="wp-list mt-3 space-y-2">
            {#each gaps as g (g)}<li>{g}</li>{/each}
          </ul>
        </div>
      </div>
    </section>

    <!-- =========================== PERTANYAAN =========================== -->
    <section id="pertanyaan" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.sec4Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.sec4H}</h2>
      <p class="wp-deck mt-5">
        {c.t.sec4Deck}
      </p>
      <p class="wp-muted mt-3 inline-flex items-center gap-2 text-[0.8125rem]">
        <span class="wp-dot" aria-hidden="true">●</span>
        {c.t.sec4Note}
      </p>

      <div class="wp-grid wp-grid-2 mt-8">
        {#each questions as q (q.no)}
          <article class="wp-card flex flex-col">
            <div class="flex items-start gap-3">
              <span class="wp-index">{q.no}</span>
              <h3 class="wp-h3 leading-snug">{q.q}</h3>
            </div>
            <p class="wp-verdict mt-3">{q.verdict}</p>
            <p class="wp-muted mt-3 text-[0.9375rem] leading-relaxed">{q.answer}</p>
            <ul class="wp-list mt-4 space-y-2 border-t border-[var(--wp-line)] pt-4">
              {#each q.evidence as e (e)}
                <li>{e}</li>
              {/each}
            </ul>
            <a href={resolveHref(q.link)} class="wp-cta mt-5">{q.linkLabel} <span aria-hidden="true">→</span></a>
          </article>
        {/each}
      </div>
    </section>

    <!-- =========================== SOLUSI =========================== -->
    <section id="solusi" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">{c.t.sec5Label}</p>
      <h2 class="wp-h2 mt-4 wp-prose">{c.t.sec5H}</h2>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>{c.t.cap5}</caption>
          <thead>
            <tr>
              <th scope="col">{c.t.thRoot}</th>
              <th scope="col">{c.t.thSolution}</th>
              <th scope="col">{c.t.thImpact}</th>
              <th scope="col">{c.t.thKpi}</th>
            </tr>
          </thead>
          <tbody>
            {#each sol as s (s.n)}
              <tr>
                <td>{s.n} · {s.root}</td>
                <td>{s.name}</td>
                <td>{s.impact}</td>
                <td>{s.kpi}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-grid wp-grid-3 mt-8">
        {#each arch as a (a.l)}
          <div class="wp-card">
            <p class="wp-h3">{a.l}</p>
            <p class="wp-muted mt-1 text-[0.9375rem]">{a.t}</p>
            <p class="wp-muted mt-2 text-[0.9375rem] leading-relaxed">{a.d}</p>
          </div>
        {/each}
      </div>

      <div class="wp-grid wp-grid-3 mt-6">
        {#each phases as p (p.f)}
          <div class="wp-card-line">
            <p class="wp-kicker">{p.f} · {p.t}</p>
            <p class="wp-body mt-3 text-[0.9375rem] leading-relaxed">{p.w}</p>
          </div>
        {/each}
      </div>

      <div class="wp-note mt-8 max-w-[68ch]">
        <span class="wp-label">{c.t.contLabel}</span>
        <p class="mt-2" style="color: var(--wp-fg)">
          {c.t.contText1}<a href={resolveHref("/whitepaper")} class="wp-link">{c.t.contLink}</a>{c.t.contText2}
        </p>
      </div>
    </section>
  </main>

  <!-- =========================== FOOTER =========================== -->
  <footer class="border-t border-[var(--wp-line)]">
    <div class="wp-wrap flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
      <p class="wp-mono text-[0.75rem] tracking-[0.05em] wp-muted">
        {c.t.footNote}
      </p>
      <div class="flex items-center gap-5">
        <a href={resolveHref("/")} class="wp-nav-link">{c.t.navHome} →</a>
        <a href={resolveHref("/dashboard/methodology")} class="wp-nav-link">{c.t.navMethodology} →</a>
        <a href={resolveHref("/login")} class="wp-nav-link">{c.t.navPortal} →</a>
      </div>
    </div>
  </footer>
</div>
