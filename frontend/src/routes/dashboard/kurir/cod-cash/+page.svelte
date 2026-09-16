<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { api, type CodCashResult } from "$lib/api";
  import { notify } from "$lib/toast";
  import Icon from "$lib/components/Icon.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let res = $state<CodCashResult | null>(null);
  let loaded = $state(false);
  let failed = $state(false);

  let codShare = $state(45);
  let active = new SvelteSet<string>();
  let busy = $state(false);

  async function run(userTriggered = false) {
    busy = true;
    if (userTriggered) notify({ message: "Menghitung risiko kas COD…", type: "info", title: "COD Cash" });
    failed = false;
    try {
      res = await api.codCash({ cod_share_pct: codShare, interventions: [...active] });
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal menghitung risiko", type: "error", title: "COD Cash" });
    }
    loaded = true;
    busy = false;
  }

  onMount(() => void run());

  function toggle(key: string) {
    if (active.has(key)) active.delete(key);
    else active.add(key);
    void run(true);
  }

  const rpT = (n: number) => "Rp" + numId(n / 1e12, 1) + "T";
  const rpM = (n: number) => "Rp" + numId(n / 1e9, 1) + "M";

  const riskChart = $derived(
    res
      ? barChart(
          ["Manual", "Aktif"],
          [
            { name: "Selisih kas/hari", data: [Math.round(res.risk.discrepanciesPerDayBefore), Math.round(res.risk.discrepanciesPerDayAfter)] },
            { name: "Biaya selisih (×juta Rp)", data: [Math.round(res.risk.discrepancyCostIdrBefore / 1e6), Math.round(res.risk.discrepancyCostIdrAfter / 1e6)] }
          ],
          { maxBarWidth: 60 }
        )
      : null
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">COD Cash-Reconciliation Risk</h1>
      <p class="text-sm text-muted-foreground">
        Risiko rekonsiliasi kas COD: uang beredar, human-error, waktu &amp; biaya. Kasus: proses "complex, time-consuming, prone to human error".
      </p>
    </div>
    <button type="button" onclick={() => run(true)} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
      <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Hitung ulang"}
    </button>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle="Gagal menghitung risiko kas COD" errorHint="Backend offline. Coba lagi setelah backend aktif." onretry={() => run(true)} />
  {:else if loaded && res}
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <p class="text-sm font-semibold">Simulasi intervensi digital</p>
      <p class="mt-1 text-xs text-muted-foreground">Atur porsi COD lalu aktifkan intervensi — engine menghitung ulang risiko & penghematan.</p>
      <label class="mt-4 block max-w-md">
        <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Porsi paket COD</span><span class="kpi-value text-foreground">{codShare}%</span></span>
        <input type="range" min="0" max="100" step="1" bind:value={codShare} oninput={() => run()} aria-label="Porsi paket COD persen" class="mt-2 w-full accent-[var(--bitcoin)]" />
      </label>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        {#each res.interventionCatalog as it (it.key)}
          <button type="button" onclick={() => toggle(it.key)} aria-pressed={active.has(it.key)} class="flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all {active.has(it.key) ? 'border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_12%,transparent)]' : 'border-border hover:border-[color-mix(in_oklab,var(--bitcoin)_40%,transparent)]'}">
            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border {active.has(it.key) ? 'border-transparent bg-gradient-to-br from-[var(--bitcoin-deep)] to-[var(--bitcoin)] text-white' : 'border-border'}">
              {#if active.has(it.key)}<Icon name="check" cls="h-3 w-3" weight="bold" />{/if}
            </span>
            <span class="min-w-0">
              <span class="block text-sm font-medium text-foreground">{it.label}</span>
              <span class="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">−{it.errCutPct}% error · −{it.timeCutPct}% waktu</span>
            </span>
          </button>
        {/each}
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Uang kas beredar</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{rpT(res.cashFloatIdr)}</p>
        <p class="mt-1 text-xs text-muted-foreground">COD {numId(res.basis.codDailyM, 2)}jt paket/hari</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Selisih kas / hari</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.risk.discrepanciesPerDayAfter, 0)}</p>
        <p class="mt-1 text-xs text-muted-foreground">dari {numId(res.risk.discrepanciesPerDayBefore, 0)} (sebelum)</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Penghematan biaya selisih</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-success-foreground">{rpM(res.risk.discrepancyCostSavedIdr)}</p>
        <p class="mt-1 text-xs text-muted-foreground">per hari (investigasi + koreksi)</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Penurunan risiko</p>
        <p class="kpi-value mt-2 font-heading text-2xl text-[var(--bitcoin)]">−{numId(res.risk.riskReductionPct, 1)}%</p>
        <p class="mt-1 text-xs text-muted-foreground">{numId(res.risk.reconHoursSavedPerDay, 0)} jam rekonsiliasi/hari dihemat</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-sm font-medium">Risiko sebelum vs sesudah intervensi</p>
      {#if riskChart}<EChart option={riskChart} height={260} label="Risiko kas COD sebelum dan sesudah" />{/if}
    </div>

    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
      <span class="font-medium">Insight:</span> dengan <strong>{codShare}%</strong> paket COD, sekitar <strong>{rpT(res.cashFloatIdr)}</strong> kas beredar setiap hari. Rekonsiliasi otomatis + settlement e-wallet memangkas risiko human-error <strong>{numId(res.risk.riskReductionPct, 0)}%</strong>. AOV Rp{numId(res.basis.avgOrderValueIdr, 0)} dari Table 3 &amp; 4. {res.note}
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={260} />
  {/if}
</div>
