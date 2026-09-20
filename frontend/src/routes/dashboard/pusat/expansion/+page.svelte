<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type ExpansionResult } from "$lib/api";
  import { notify } from "$lib/toast";
  import Icon from "$lib/components/Icon.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let res = $state<ExpansionResult | null>(null);
  let loaded = $state(false);
  let failed = $state(false);

  // Kontrol: capex/hub (Rp miliar) & target utilisasi pasca-ekspansi.
  let capexB = $state(50);
  let targetUtil = $state(75);
  let busy = $state(false);

  async function run(userTriggered = false) {
    busy = true;
    if (userTriggered) notify({ message: "Menghitung kelayakan ekspansi…", type: "info", title: "Market Expansion" });
    failed = false;
    try {
      res = await api.expansion({ capex_per_hub_idr: capexB * 1e9, target_util: targetUtil / 100 });
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: m.ex3t1(), type: "error", title: "Market Expansion" });
    }
    loaded = true;
    busy = false;
  }

  onMount(() => void run());

  const rpT = (n: number) => "Rp" + numId(n / 1e12, 1) + "T";
  const rpM = (n: number) => "Rp" + numId(n / 1e9, 0) + "M";

  const priority = $derived(res ? res.hubs.filter((h) => h.priority === "Ekspansi prioritas").slice(0, 10) : []);
  const roiChart = $derived(
    priority.length
      ? barChart(
          priority.map((h) => h.code),
          [{ name: "ROI (×)", data: priority.map((h) => h.roiX) }],
          { maxBarWidth: 40 }
        )
      : null
  );

  /** Label prioritas dari backend (Indonesia) diterjemahkan saat render. */
  const PRIORITY_LABEL: Record<string, () => string> = {
    "Ekspansi prioritas": () => m.pr01(),
    "Perluas kapasitas": () => m.pr02(),
    "Nurture permintaan": () => m.pr03(),
    "Optimalkan dulu": () => m.pr04()
  };
  const priorityLabel = (p: string) => PRIORITY_LABEL[p]?.() ?? p;

  const prioCls: Record<string, string> = {
    "Ekspansi prioritas": "bg-success text-success-foreground",
    "Perluas kapasitas": "bg-destructive text-destructive-foreground",
    "Nurture permintaan": "bg-warning text-warning-foreground",
    "Optimalkan dulu": "bg-muted text-muted-foreground"
  };
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">{m.ex01()}</h1>
      <p class="text-sm text-muted-foreground">
        {m.ex02()}
      </p>
    </div>
    <button type="button" onclick={() => run(true)} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
      <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Hitung ulang"}
    </button>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle={m.ex3t3()} errorHint={m.ex3t4()} onretry={() => run(true)} />
  {:else if loaded && res}
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <p class="text-sm font-semibold">{m.ex03()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.ex04()}</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-2">
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.ex05()}</span><span class="kpi-value text-foreground">Rp{capexB}M</span></span>
          <input type="range" min="10" max="150" step="5" bind:value={capexB} oninput={() => run()} aria-label={m.ax25()} class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.ex06()}</span><span class="kpi-value text-foreground">{targetUtil}%</span></span>
          <input type="range" min="55" max="95" step="5" bind:value={targetUtil} oninput={() => run()} aria-label={m.ax26()} class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.ex07()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-success-foreground">{res.summary.priorityHubs}<span class="text-sm text-muted-foreground"> / 23</span></p>
        <p class="mt-1 text-xs text-muted-foreground">{m.ex08()}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.ex09()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.totalRealizedAnnualM, 1)}<span class="text-sm text-muted-foreground"> {m.ex10()}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">potensi {numId(res.summary.totalAddAnnualM, 1)}jt · tangkap {numId((res.inputs.captureRatePerYear ?? 0) * 100, 0)}%/th</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.ex11()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-[var(--bitcoin)]">{numId(res.summary.portfolioRoiX, 1)}×</p>
        <p class="mt-1 text-xs text-muted-foreground">payback {numId(res.summary.paybackYears, 2)} thn</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.ex12()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{rpT(res.summary.totalAddMarginIdrPerYear)}</p>
        <p class="mt-1 text-xs text-muted-foreground">capex total {rpT(res.summary.totalCapexIdr)}</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-1 text-sm font-medium">{m.ex13()}</p>
      <p class="mb-4 text-xs text-muted-foreground">{m.ex14()}</p>
      <div class="grid gap-3 sm:grid-cols-5">
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">{m.ex15()}</p><p class="kpi-value text-lg">{rpM(res.unitEconomics.revenuePerParcelIdr)}</p></div>
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">{m.ex16()}</p><p class="kpi-value text-lg">{rpM(res.unitEconomics.costPerParcelIdr)}</p></div>
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">{m.ex17()}</p><p class="kpi-value text-lg">{rpM(res.unitEconomics.variableCostPerParcelIdr)}</p></div>
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">{m.ex18()}</p><p class="kpi-value text-lg">{rpM(res.unitEconomics.grossMarginPerParcelIdr)}</p></div>
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">{m.ex19()}</p><p class="kpi-value text-lg text-[var(--bitcoin)]">{rpM(res.unitEconomics.contributionMarginPerParcelIdr)}</p></div>
      </div>
    </div>

    <!-- Rencana kanonik (analisis tim) -->
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-sm font-medium">{m.ex20()}</p>
      <p class="mt-1 text-xs text-muted-foreground">
        {m.ex21()} <span class="font-medium text-foreground">{m.ex22()}</span>
        {m.ex23()}
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{m.ex24()}</p>
          <p class="kpi-value text-lg">{numId(res.plan.headroom.basis2024M, 0)} {m.ex5f1()}</p>
        </div>
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{m.ex25()}</p>
          <p class="kpi-value text-lg">{numId(res.plan.headroom.basisTable1M, 0)} {m.ex5f1()}</p>
        </div>
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{m.ex26()}</p>
          <p class="kpi-value text-lg text-[var(--bitcoin)]">{rpM(res.plan.contribution.perParcelIdr)}</p>
        </div>
      </div>

      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <caption class="sr-only">{m.ex27()}</caption>
          <thead>
            <tr class="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <th class="py-2">{m.ex28()}</th>
              <th class="py-2 text-right">{m.ex29()}</th>
              <th class="py-2 text-right">{m.ex30()}</th>
            </tr>
          </thead>
          <tbody>
            {#each res.plan.fillScenarios as f (f.fillPct)}
              <tr class="border-b border-border/60 last:border-0">
                <td class="py-2">{f.fillPct}%</td>
                <td class="py-2 text-right tabular-nums">{numId(f.volumeM, 1)} {m.ex5f1()}</td>
                <td class="py-2 text-right tabular-nums font-medium text-success-foreground">{rpT(f.valueIdr)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        {#each res.plan.pathways as pw (pw.path)}
          <div class="rounded-xl border border-border p-3">
            <p class="text-xs font-medium">{pw.path}</p>
            <p class="mt-1 text-xs text-muted-foreground">payback {pw.paybackYears} tahun · {pw.decision}</p>
          </div>
        {/each}
      </div>

      <div class="mt-4">
        <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.ex31()}</p>
        <ul class="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          {#each res.plan.newHubGates as g (g.gate)}
            <li><span class="font-medium">{g.gate}:</span> {g.threshold}</li>
          {/each}
        </ul>
      </div>

      <p class="mt-4 text-xs text-muted-foreground">
        {m.ex5f2()}
        {#each Object.entries(res.plan.outletProductivityPerDay) as [k, v] (k)}
          {k} {numId(v, 0)}{" · "}
        {/each}
        {res.plan.tariffStress.note}
      </p>
    </div>

    {#if roiChart}
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">{m.ex32()}</p>
        <EChart option={roiChart} height={Math.max(220, priority.length * 34)} label={m.ex3t5()} />
      </div>
    {/if}

    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full text-sm">
        <caption class="sr-only">{m.ex33()}</caption>
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th class="px-4 py-2.5">{m.ex34()}</th>
            <th class="px-4 py-2.5 text-right">{m.ex35()}</th>
            <th class="px-4 py-2.5 text-right">{m.ex36()}</th>
            <th class="px-4 py-2.5 text-right">{m.ex37()}</th>
            <th class="px-4 py-2.5 text-right">{m.ex38()}</th>
            <th class="px-4 py-2.5">{m.ex39()}</th>
          </tr>
        </thead>
        <tbody>
          {#each res.hubs as h (h.code)}
            <tr class="border-b border-border/60 last:border-0">
              <td class="px-4 py-2">{h.hub} <span class="font-mono text-[11px] text-muted-foreground">{h.code}</span></td>
              <td class="px-4 py-2 text-right tabular-nums">{numId(h.utilizationPct, 1)}%</td>
              <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">{numId(h.headroomM, 3)}M</td>
              <td class="px-4 py-2 text-right tabular-nums">{numId(h.realizedAnnualM, 1)}jt</td>
              <td class="px-4 py-2 text-right tabular-nums font-medium">{h.roiX > 0 ? numId(h.roiX, 1) + "×" : "—"}</td>
              <td class="px-4 py-2"><span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold {prioCls[h.priority] ?? 'bg-muted text-muted-foreground'}">{priorityLabel(h.priority)}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
      <span class="font-medium">{m.ex40()}</span> {m.ex41()} <strong>{m.ex42()}</strong> {m.ex43()} <strong>{m.ex44()}</strong> (Jakarta 90,4% ≈ jenuh). ROI portofolio {numId(res.summary.portfolioRoiX, 1)}{m.ex5f3({ value: rpM(res.unitEconomics.contributionMarginPerParcelIdr) })}. {res.note}
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={280} />
  {/if}
</div>
