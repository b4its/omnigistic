<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { api, type SponsorResult, type SponsorSensitivity } from "$lib/api";
  import { notify } from "$lib/toast";
  import { numId } from "$lib/utils";

  let res = $state<SponsorResult | null>(null);
  let sens = $state<SponsorSensitivity | null>(null);
  let loaded = $state(false);
  let failed = $state(false);
  let busy = $state(false);

  // Parameter interaktif (Digital Twin nyata)
  let hqEquity = $state(30);   // %
  let fixedShare = $state(45); // %
  let localMargin = $state(14); // %

  async function recompute() {
    if (!res) return;
    busy = true;
    try {
      res = await api.sponsorCompare({ hq_equity: hqEquity / 100, fixed_share: fixedShare / 100, local_margin: localMargin / 100 });
    } catch {
      notify({ message: m.dt2t1(), type: "error", title: "Digital Twin" });
    }
    busy = false;
  }

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat komparator model…", type: "info", title: "Digital Twin" });
    try {
      [res, sens] = await Promise.all([api.sponsorCompare(), api.sponsorSensitivity()]);
      if (res) {
        hqEquity = Math.round(res.assumptions.hqEquity * 100);
        fixedShare = Math.round(res.assumptions.fixedShare * 100);
        localMargin = Math.round(res.assumptions.localMargin * 100);
      }
      if (userTriggered) notify({ message: "Komparator dimuat", type: "success", title: "Digital Twin" });
    } catch {
      res = null;
      sens = null;
      failed = true;
      if (userTriggered) notify({ message: m.dt2t2(), type: "error", title: "Digital Twin" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const rp = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(n));
  const rpShort = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e12) return `Rp${numId(n / 1e12, 1)} triliun`;
    if (abs >= 1e9) return `Rp${numId(n / 1e9, 1)}M`;
    if (abs >= 1e6) return `Rp${numId(n / 1e6, 1)}jt`;
    return rp(n);
  };

  // Grafik: exposure capex Direct vs Sponsor per region.
  const capexChart = $derived(
    res
      ? barChart(
          res.regions.map((r) => r.region.replace(" & Nusa Tenggara", "")),
          [
            { name: m.dt2t3(), data: res.regions.map((r) => Math.round(r.direct.capexExposurePerDayIdr / 1e6)), color: "var(--color-muted-foreground)" },
            { name: m.dt2t4(), data: res.regions.map((r) => Math.round(r.sponsor.capexExposurePerDayIdr / 1e6)), color: "var(--color-primary)" }
          ],
          { rotate: 20 }
        )
      : null
  );

  // Grafik sensitivitas: jumlah region sponsor vs porsi ekuitas HQ.
  const sensChart = $derived(
    sens
      ? barChart(
          sens.sweep.map((s) => `${Math.round(s.hqEquity * 100)}%`),
          [{ name: "Region Sponsor", data: sens.sweep.map((s) => s.recommendSponsor), color: "var(--color-primary)" }],
          { hideLegend: true, maxBarWidth: 40 }
        )
      : null
  );

  const tone: Record<string, string> = {
    "Sponsor penuh": "bg-primary/10 text-primary",
    "Sponsor bertahap": "bg-warning/15 text-warning-foreground",
    "Direct (pertahankan)": "bg-muted text-muted-foreground"
  };
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">{m.dt01()}</h1>
      <p class="text-sm text-muted-foreground">
        {m.dt02()}
      </p>
    </div>
    <span class="hub-label text-muted-foreground">{m.dt03()}</span>
  </div>

  {#if loaded && res}
    <!-- Rencana kanonik (analisis tim) -->
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-sm font-medium">{m.dt04()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.dt3f1()} {res.tierPlan.strategicNote}</p>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        {#each res.tierPlan.tiers as t (t.tier)}
          <div class="rounded-xl border border-border p-3">
            <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Tingkat {t.tier}</p>
            <p class="mt-1 text-sm font-medium">{t.model}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {t.hubCount} {m.dt3f2()} {numId(t.volumeSharePct, 1)}%{#if t.feePct !== null} · fee {numId(t.feePct, 0)}%{/if}
            </p>
            {#if t.savingT > 0}
              <p class="mt-1 text-xs">{m.dt05()} <span class="font-medium text-success-foreground">Rp{numId(t.savingT, 2)} T</span>{m.dt06()}</p>
            {/if}
          </div>
        {/each}
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-4">
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{m.dt07()}</p>
          <p class="kpi-value text-lg">Rp{numId(res.tierPlan.summary.saving2023T, 2)} T</p>
        </div>
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{m.dt08()}</p>
          <p class="kpi-value text-lg">Rp{numId(res.tierPlan.summary.savingProjectedT, 2)} T</p>
        </div>
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{m.dt09()}</p>
          <p class="kpi-value text-lg">{numId(res.tierPlan.summary.ratioEffectPp, 2)} pp</p>
        </div>
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{m.dt10()}</p>
          <p class="kpi-value text-lg text-[var(--bitcoin)]">{numId(res.tierPlan.summary.costToSalesAfterSponsorPct, 2)}%</p>
        </div>
      </div>

      <div class="mt-4">
        <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.dt11()}</p>
        <ul class="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          {#each res.tierPlan.guardrails as g (g.guardrail)}
            <li><span class="font-medium">{g.guardrail}:</span> {g.provision}</li>
          {/each}
        </ul>
      </div>
      <p class="mt-3 text-xs text-muted-foreground">{m.dt3f3()} {numId(res.tierPlan.gcCostRatioPct, 2)}% · pertumbuhan volume {numId(res.tierPlan.volumeGrowthPct, 1)}%.</p>
    </div>

    <!-- Basis & ringkasan -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Unit Cost Nasional" value={rp(res.nationalBasis.unitCostIdr)} sub={m.dt3t1({ trillion: res.nationalBasis.totalCostT, million: res.nationalBasis.parcelsM })} accent />
      <MetricCard label="Rekomendasi Sponsor" value={`${res.summary.recommendSponsor} region`} sub={res.summary.sponsorRegions.join(", ") || "—"} />
      <MetricCard label="Pertahankan Direct" value={`${res.summary.recommendDirect} region`} sub={res.summary.directRegions.join(", ") || "—"} />
      <MetricCard label={m.dt4t1()} value={rpShort(res.summary.totalCapexSavingPerDayIdr)} sub={m.dt2t5()} />
    </div>

    <!-- Kontrol parameter -->
    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-base font-semibold">{m.dt12()}</p>
      <p class="text-[13.5px] text-muted-foreground">{m.dt13()}</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-3">
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>{m.dt14()}</span><span class="kpi-value text-primary">{hqEquity}%</span></span>
          <input type="range" min="10" max="90" step="5" value={hqEquity} oninput={(e) => (hqEquity = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Porsi ekuitas HQ" class="mt-2 w-full accent-[var(--color-primary)]" />
          <span class="text-xs text-muted-foreground">{m.dt15()}</span>
        </label>
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>{m.dt16()}</span><span class="kpi-value text-primary">{fixedShare}%</span></span>
          <input type="range" min="20" max="80" step="5" value={fixedShare} oninput={(e) => (fixedShare = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label={m.ax23()} class="mt-2 w-full accent-[var(--color-primary)]" />
          <span class="text-xs text-muted-foreground">{m.dt17()}</span>
        </label>
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>{m.dt18()}</span><span class="kpi-value text-primary">{localMargin}%</span></span>
          <input type="range" min="5" max="30" step="1" value={localMargin} oninput={(e) => (localMargin = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Margin operasional lokal" class="mt-2 w-full accent-[var(--color-primary)]" />
          <span class="text-xs text-muted-foreground">{m.dt19()}</span>
        </label>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-2" class:opacity-60={busy}>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">{m.dt20()}</p>
        {#if capexChart}<EChart option={capexChart} height={300} label={m.dt2t6()} />{/if}
      </div>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">{m.dt21()}</p>
        {#if sensChart}<EChart option={sensChart} height={300} label={m.dt2t7()} />{/if}
        <p class="mt-2 text-xs text-muted-foreground">
          {m.dt22()}
        </p>
      </div>
    </div>

    <!-- Tabel perbandingan per region -->
    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full min-w-[860px] text-sm">
        <caption class="sr-only">{m.dt23()}</caption>
        <thead class="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th class="px-4 py-2.5 text-left font-medium">{m.dt24()}</th>
            <th class="px-4 py-2.5 text-right font-medium">{m.dt25()}</th>
            <th class="px-4 py-2.5 text-right font-medium">{m.dt26()}</th>
            <th class="px-4 py-2.5 text-right font-medium">{m.dt27()}</th>
            <th class="px-4 py-2.5 text-right font-medium">{m.dt28()}</th>
            <th class="px-4 py-2.5 text-right font-medium">{m.dt29()}</th>
            <th class="px-4 py-2.5 text-right font-medium">{m.dt30()}</th>
            <th class="px-4 py-2.5 text-left font-medium">{m.dt31()}</th>
          </tr>
        </thead>
        <tbody>
          {#each res.regions as r (r.region)}
            <tr class="border-t border-border/60">
              <td class="px-4 py-2 font-medium">{r.region}</td>
              <td class="px-4 py-2 text-right tabular-nums">{r.avgUtilizationPct}%</td>
              <td class="px-4 py-2 text-right tabular-nums">{rp(r.unitCostIdr)}</td>
              <td class="px-4 py-2 text-right tabular-nums">{rpShort(r.direct.profitPerDayIdr)}</td>
              <td class="px-4 py-2 text-right tabular-nums">{rpShort(r.sponsor.profitPerDayIdr)}</td>
              <td class="px-4 py-2 text-right tabular-nums text-primary">{rpShort(r.delta.capexSavingPerDayIdr)}</td>
              <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">−{r.delta.controlLossPts}</td>
              <td class="px-4 py-2">
                <span class="inline-block rounded-md px-2 py-0.5 text-[12.5px] font-semibold {tone[r.recommendation] ?? 'bg-muted'}">{r.recommendation}</span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
      <span class="font-medium">{m.dt32()}</span> {m.dt33()} <strong>{m.dt34()}</strong>{m.dt35()} <strong>{m.dt36()}</strong> {m.dt37()}
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <Icon name="warn" cls="mx-auto h-6 w-6" />
      <p class="mt-2 text-sm font-semibold text-foreground">{m.dt38()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.dt39()}</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">{m.dt40()}</button>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-4">{#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}</div>
    <div class="h-72 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
