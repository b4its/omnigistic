<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type PnlResult } from "$lib/api";
  import { notify } from "$lib/toast";
  import Icon from "$lib/components/Icon.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let res = $state<PnlResult | null>(null);
  let loaded = $state(false);
  let failed = $state(false);
  let sustain = $state(true);
  let busy = $state(false);

  async function run(userTriggered = false) {
    busy = true;
    if (userTriggered) notify({ message: m.pn2t1(), type: "info", title: "Cost-Waterfall" });
    failed = false;
    try {
      res = await api.pnlWaterfall(sustain);
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: m.pn2t2(), type: "error", title: "Cost-Waterfall" });
    }
    loaded = true;
    busy = false;
  }

  onMount(() => void run());

  function toggleSustain() {
    sustain = !sustain;
    void run(true);
  }

  const rpT = (n: number) => "Rp" + numId(n, 1) + "T";

  // Jembatan cost-to-sales: baseline 2023 → absorpsi volume → tujuh tuas → sponsor.
  const bridgeChart = $derived.by(() => {
    if (!res) return null;
    const short: Record<string, string> = {
      "Baseline 2023": "Baseline 2023",
      "Setelah absorpsi volume": "Absorpsi volume",
      "Setelah tujuh tuas": "Tujuh tuas",
      "Setelah sponsor selektif": "Sponsor selektif",
    };
    const labels = res.bridge.map((b) => short[b.stage] ?? b.stage);
    const values = res.bridge.map((b) => b.costToSalesPct);
    return barChart(labels, [{ name: "Cost-to-sales (%)", data: values }], { maxBarWidth: 56 });
  });
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">{m.pn01()}</h1>
      <p class="text-sm text-muted-foreground">
        {m.pn02()}
      </p>
    </div>
    <button type="button" onclick={() => run(true)} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
      <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Hitung ulang"}
    </button>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle={m.pn2t3()} errorHint={m.pn2t4()} onretry={() => run(true)} />
  {:else if loaded && res}
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold">{m.pn03()}</p>
          <p class="mt-1 text-xs text-muted-foreground">{m.pn04()}</p>
        </div>
        <button type="button" onclick={toggleSustain} role="switch" data-testid="toggle-sustainability" aria-checked={sustain} class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold">
          <span class="h-4 w-8 rounded-full p-0.5 transition-colors {sustain ? 'bg-[var(--bitcoin)]' : 'bg-muted'}">
            <span class="block h-3 w-3 rounded-full bg-white transition-transform" style="transform: translateX({sustain ? '14px' : '0'})"></span>
          </span>
          {m.pn05()}
        </button>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.pn06()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{rpT(res.basis.costT)}</p>
        <p class="mt-1 text-xs text-muted-foreground">fulfilment {rpT(res.basis.fulfilmentT)} + shipping {rpT(res.basis.shippingT)}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.pn07()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-success-foreground">{rpT(res.summary.absorptionBenefitT)}</p>
        <p class="mt-1 text-xs text-muted-foreground">volume +{numId(res.params.volumeGrowthPct, 1)}{m.pn3f1()} {rpT(res.absorption.fixedCostT)}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.pn08()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-success-foreground">{rpT(res.summary.leverNetT)}</p>
        <p class="mt-1 text-xs text-muted-foreground">{numId(res.summary.leverSavingPct, 1)}{m.pn3f2()} {rpT(res.absorption.variableGrownT)}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.pn09()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-success-foreground">{rpT(res.summary.sponsorSavingT)}</p>
        <p class="mt-1 text-xs text-muted-foreground">{m.pn10()}</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-sm font-medium">{m.pn11()}</p>
      {#if bridgeChart}<EChart option={bridgeChart} height={280} label="Jembatan cost-to-sales" />{/if}
      <p class="mt-2 text-xs text-muted-foreground">
        {m.pn3f3()} {numId(res.params.volumeGrowthPct, 1)}{m.pn3f4()} {rpT(res.absorption.costNoActionT)}{m.pn3f5()}
      </p>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full text-sm">
        <caption class="sr-only">{m.pn12()}</caption>
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th class="px-4 py-2.5">{m.pn13()}</th>
            <th class="px-4 py-2.5 text-right">{m.pn14()}</th>
            <th class="px-4 py-2.5 text-right">{m.pn15()}</th>
          </tr>
        </thead>
        <tbody>
          {#each res.bridge as b, i (i)}
            <tr class="border-b border-border/60 last:border-0">
              <td class="px-4 py-2">{b.stage}</td>
              <td class="px-4 py-2 text-right tabular-nums">{rpT(b.costT)}</td>
              <td class="px-4 py-2 text-right tabular-nums font-medium">{numId(b.costToSalesPct, 2)}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full text-sm">
        <caption class="sr-only">{m.pn16()}</caption>
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th class="px-4 py-2.5">{m.pn17()}</th>
            <th class="px-4 py-2.5">{m.pn18()}</th>
            <th class="px-4 py-2.5 text-right">{m.pn19()}</th>
            <th class="px-4 py-2.5 text-right">{m.pn20()}</th>
            <th class="px-4 py-2.5 text-right">{m.pn21()}</th>
          </tr>
        </thead>
        <tbody>
          {#each res.waterfall as s, i (i)}
            <tr class="border-b border-border/60 last:border-0">
              <td class="px-4 py-2">{s.lever}</td>
              <td class="px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{s.dimension}</td>
              <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">{numId(s.savingPct, 1)}%</td>
              <td class="px-4 py-2 text-right tabular-nums font-medium text-success-foreground">−{numId(s.savingT, 3)}</td>
              <td class="px-4 py-2 text-right tabular-nums">{numId(s.costAfterT, 3)}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr class="border-t border-border bg-muted/30 font-semibold">
            <td class="px-4 py-2.5" colspan="3">Total tujuh tuas (setelah koreksi tumpang tindih {numId(res.overlapCorrectionT, 2)}T)</td>
            <td class="px-4 py-2.5 text-right tabular-nums text-success-foreground">−{numId(res.summary.leverNetT, 3)}</td>
            <td class="px-4 py-2.5 text-right tabular-nums">{numId(res.bridge[2]?.costT ?? 0, 3)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
      <span class="font-medium">{m.pn22()}</span> {m.pn23()} <strong>{m.pn24()}</strong>{m.pn25()} <strong>{rpT(res.summary.absorptionBenefitT)}</strong>{m.pn26()} <strong>{rpT(res.summary.leverNetT)}</strong> ({numId(res.summary.leverSavingPct, 1)}{m.pn3f6()}{#if res.summary.sponsorSavingT > 0} {m.pn3f7()} <strong>{rpT(res.summary.sponsorSavingT)}</strong>{/if}{m.pn3f8()} <strong>{numId(res.summary.costToSalesBeforePct, 2)}%</strong> {m.pn27()} <strong>{numId(res.summary.costToSalesAfterPct, 2)}%</strong> {m.pn3f9()} {res.note}
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={300} />
  {/if}
</div>
