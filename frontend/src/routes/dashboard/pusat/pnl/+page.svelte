<script lang="ts">
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
    if (userTriggered) notify({ message: "Menghitung waterfall biaya…", type: "info", title: "Cost-Waterfall" });
    failed = false;
    try {
      res = await api.pnlWaterfall(sustain);
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal menghitung waterfall", type: "error", title: "Cost-Waterfall" });
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

  // Waterfall: bar biaya berurutan dari basis → tiap tuas → teroptimasi.
  const wfChart = $derived.by(() => {
    if (!res) return null;
    const labels = ["Biaya awal", ...res.waterfall.map((s) => s.lever.split(" ")[0] + "…"), "Teroptimasi"];
    const values = [res.basis.costT, ...res.waterfall.map((s) => -s.savingT), res.summary.optimizedCostT];
    return barChart(labels, [{ name: "Biaya (T)", data: values }], { maxBarWidth: 30 });
  });
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">Unified Cost-Waterfall &amp; P&amp;L</h1>
      <p class="text-sm text-muted-foreground">
        Semua tuas pengurangan biaya disatukan dari Table 3 → waterfall biaya &amp; dampak margin. Menjawab Pertanyaan 6.
      </p>
    </div>
    <button type="button" onclick={() => run(true)} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
      <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Hitung ulang"}
    </button>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle="Gagal memuat waterfall biaya" errorHint="Backend offline. Coba lagi setelah backend aktif." onretry={() => run(true)} />
  {:else if loaded && res}
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold">Cakupan tuas</p>
          <p class="mt-1 text-xs text-muted-foreground">Aktifkan/nonaktifkan tuas sustainability (EV &amp; kemasan) → waterfall dihitung ulang.</p>
        </div>
        <button type="button" onclick={toggleSustain} role="switch" aria-checked={sustain} class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold">
          <span class="h-4 w-8 rounded-full p-0.5 transition-colors {sustain ? 'bg-[var(--bitcoin)]' : 'bg-muted'}">
            <span class="block h-3 w-3 rounded-full bg-white transition-transform" style="transform: translateX({sustain ? '14px' : '0'})"></span>
          </span>
          Sustainability aktif
        </button>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Biaya logistik 2023</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{rpT(res.basis.costT)}</p>
        <p class="mt-1 text-xs text-muted-foreground">fulfilment {rpT(res.basis.fulfilmentT)} + shipping {rpT(res.basis.shippingT)}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Total hemat</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-success-foreground">{rpT(res.summary.totalSavingT)}</p>
        <p class="mt-1 text-xs text-muted-foreground">−{numId(res.summary.totalSavingPct, 1)}% dari biaya</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Cost-to-Sales</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.costToSalesBeforePct, 1)}%<span class="text-sm text-muted-foreground"> → {numId(res.summary.costToSalesAfterPct, 1)}%</span></p>
        <p class="mt-1 text-xs text-muted-foreground">turun {numId(res.summary.costToSalesBeforePct - res.summary.costToSalesAfterPct, 1)}pt</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">EBIT proxy</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-[var(--bitcoin)]">+{numId(res.summary.ebitProxyUpliftPct, 1)}%</p>
        <p class="mt-1 text-xs text-muted-foreground">{rpT(res.summary.ebitProxyBeforeT)} → {rpT(res.summary.ebitProxyAfterT)}</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-sm font-medium">Waterfall biaya (Rp triliun)</p>
      {#if wfChart}<EChart option={wfChart} height={300} label="Waterfall pengurangan biaya" />{/if}
      <p class="mt-2 text-xs text-muted-foreground">Bar positif = biaya; bar negatif = penghematan per tuas. Nominal negatif menandakan pengurangan biaya.</p>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full text-sm">
        <caption class="sr-only">Waterfall pengurangan biaya per tuas</caption>
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th class="px-4 py-2.5">Tuas</th>
            <th class="px-4 py-2.5">Dimensi</th>
            <th class="px-4 py-2.5 text-right">Hemat %</th>
            <th class="px-4 py-2.5 text-right">Hemat (T)</th>
            <th class="px-4 py-2.5 text-right">Biaya sesudah</th>
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
            <td class="px-4 py-2.5" colspan="3">Total</td>
            <td class="px-4 py-2.5 text-right tabular-nums text-success-foreground">−{numId(res.summary.totalSavingT, 3)}</td>
            <td class="px-4 py-2.5 text-right tabular-nums">{numId(res.summary.optimizedCostT, 3)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
      <span class="font-medium">Insight:</span> tujuh tuas menurunkan biaya logistik <strong>{rpT(res.summary.totalSavingT)}</strong> ({numId(res.summary.totalSavingPct, 1)}%), menggeser cost-to-sales dari <strong>{numId(res.summary.costToSalesBeforePct, 1)}%</strong> ke <strong>{numId(res.summary.costToSalesAfterPct, 1)}%</strong> — tanpa menurunkan revenue. {res.note}
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={300} />
  {/if}
</div>
