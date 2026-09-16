<script lang="ts">
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
      if (userTriggered) notify({ message: "Gagal menghitung ekspansi", type: "error", title: "Market Expansion" });
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
      <h1 class="font-heading text-xl font-semibold tracking-tight">Market-Expansion ROI</h1>
      <p class="text-sm text-muted-foreground">
        Kelayakan ekspansi per 23 hub: headroom × tarikan permintaan × unit-economics Table 3. Menjawab "apakah ekspansi menguntungkan?".
      </p>
    </div>
    <button type="button" onclick={() => run(true)} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
      <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Hitung ulang"}
    </button>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle="Gagal memuat analisis ekspansi" errorHint="Backend offline. Coba lagi setelah backend aktif." onretry={() => run(true)} />
  {:else if loaded && res}
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <p class="text-sm font-semibold">Simulasi ekspansi</p>
      <p class="mt-1 text-xs text-muted-foreground">Atur capex per hub & target utilisasi → ranking prioritas, ROI, dan payback dihitung ulang.</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-2">
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Capex per hub</span><span class="kpi-value text-foreground">Rp{capexB}M</span></span>
          <input type="range" min="10" max="150" step="5" bind:value={capexB} oninput={() => run()} aria-label="Capex per hub miliar rupiah" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Target utilisasi</span><span class="kpi-value text-foreground">{targetUtil}%</span></span>
          <input type="range" min="55" max="95" step="5" bind:value={targetUtil} oninput={() => run()} aria-label="Target utilisasi persen" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Hub prioritas ekspansi</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-success-foreground">{res.summary.priorityHubs}<span class="text-sm text-muted-foreground"> / 23</span></p>
        <p class="mt-1 text-xs text-muted-foreground">layak diperluas</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Volume terealisasi thn-1</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.totalRealizedAnnualM, 1)}<span class="text-sm text-muted-foreground"> jt/th</span></p>
        <p class="mt-1 text-xs text-muted-foreground">potensi {numId(res.summary.totalAddAnnualM, 1)}jt · tangkap {numId((res.inputs.captureRatePerYear ?? 0) * 100, 0)}%/th</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">ROI portofolio</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-[var(--bitcoin)]">{numId(res.summary.portfolioRoiX, 1)}×</p>
        <p class="mt-1 text-xs text-muted-foreground">payback {numId(res.summary.paybackYears, 2)} thn</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Laba inkremental</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{rpT(res.summary.totalAddMarginIdrPerYear)}</p>
        <p class="mt-1 text-xs text-muted-foreground">capex total {rpT(res.summary.totalCapexIdr)}</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-1 text-sm font-medium">Unit economics per paket (Table 3 &amp; 4)</p>
      <p class="mb-4 text-xs text-muted-foreground">Margin bruto = revenue − biaya logistik (sebelum COGS). Margin kontribusi = revenue − biaya variabel (fixed cost tak berubah saat volume naik).</p>
      <div class="grid gap-3 sm:grid-cols-5">
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">Revenue</p><p class="kpi-value text-lg">{rpM(res.unitEconomics.revenuePerParcelIdr)}</p></div>
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">Biaya logistik</p><p class="kpi-value text-lg">{rpM(res.unitEconomics.costPerParcelIdr)}</p></div>
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">Biaya variabel</p><p class="kpi-value text-lg">{rpM(res.unitEconomics.variableCostPerParcelIdr)}</p></div>
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">Margin bruto</p><p class="kpi-value text-lg">{rpM(res.unitEconomics.grossMarginPerParcelIdr)}</p></div>
        <div class="rounded-xl bg-muted/40 p-3"><p class="text-xs text-muted-foreground">Margin kontribusi</p><p class="kpi-value text-lg text-[var(--bitcoin)]">{rpM(res.unitEconomics.contributionMarginPerParcelIdr)}</p></div>
      </div>
    </div>

    {#if roiChart}
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">ROI hub prioritas (×)</p>
        <EChart option={roiChart} height={Math.max(220, priority.length * 34)} label="ROI per hub prioritas" />
      </div>
    {/if}

    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full text-sm">
        <caption class="sr-only">Skor kelayakan ekspansi per hub</caption>
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th class="px-4 py-2.5">Hub</th>
            <th class="px-4 py-2.5 text-right">Util</th>
            <th class="px-4 py-2.5 text-right">Headroom</th>
            <th class="px-4 py-2.5 text-right">+Volume thn-1</th>
            <th class="px-4 py-2.5 text-right">ROI</th>
            <th class="px-4 py-2.5">Prioritas</th>
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
              <td class="px-4 py-2"><span class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold {prioCls[h.priority] ?? 'bg-muted text-muted-foreground'}">{h.priority}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
      <span class="font-medium">Insight:</span> headroom kapasitas terbesar ada di <strong>Sumatra &amp; Bali</strong> (Medan, Palembang, Pekanbaru) — permintaan sehat, kapasitas belum jenuh. Java justru <strong>perlu menambah kapasitas</strong> (Jakarta 90,4% ≈ jenuh). ROI portofolio {numId(res.summary.portfolioRoiX, 1)}× dengan margin kontribusi {rpM(res.unitEconomics.contributionMarginPerParcelIdr)}/paket. {res.note}
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={280} />
  {/if}
</div>
