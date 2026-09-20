<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import { api, type DemandSummary } from "$lib/api";
  import { notify } from "$lib/toast";

  // Angka kasus (2023): 5,5 komplain per juta paket (dari narasi studi kasus).
  const RATE_2023 = 5.5;
  const TARGET_RATE = 3.0; // target Omnigistic: di bawah 3 per juta paket

  let demand = $state<DemandSummary | null>(null);
  let loaded = $state(false);
  let failed = $state(false);

  // Simulasi: pengurangan komplain dari Address Intelligence (geotag + fuzzy match).
  let geotagCoverage = $state(60); // % alamat ter-geotag presisi
  let rootCoverage = $state(70); // % alamat ambigu yang diselesaikan di hulu

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: m.dc2t1(), type: "info", title: "Complaint Monitor" });
    try {
      demand = await api.metricDemand();
      if (userTriggered) notify({ message: "Metrik dimuat", type: "success", title: "Complaint Monitor" });
    } catch {
      demand = null;
      failed = true;
      if (userTriggered) notify({ message: m.dc2t2(), type: "error", title: "Complaint Monitor" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const totalVolumeM = $derived(demand?.totalM ?? 1110);
  const baselineCases = $derived(Math.round(totalVolumeM * RATE_2023));

  // Model simulasi: komplain turun sebanding cakupan solusi hulu.
  // Asumsi: alamat ambigu penyebab utama (~2/3 komplain alamat-terkait).
  const projectedRate = $derived.by(() => {
    const alleviated = (geotagCoverage / 100) * (rootCoverage / 100);
    const reduction = 0.55 * alleviated; // maks 55% komplain hilang bila cakupan penuh
    return Math.max(0, RATE_2023 * (1 - reduction));
  });
  const projectedCases = $derived(Math.round(totalVolumeM * projectedRate));
  const casesAvoided = $derived(baselineCases - projectedCases);
  const targetReached = $derived(projectedRate < TARGET_RATE);

  const fmtInt = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));
  const fmtRate = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.dc01()}</h1>
    <span class="hub-label text-muted-foreground">{m.dc02()}</span>
  </div>

  {#if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">{m.dc03()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.dc04()}</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">{m.dc05()}</button>
    </div>
  {:else if loaded}
    <div class="grid gap-4 sm:grid-cols-3">
      <MetricCard label={m.dc2t3()} value={m.dc3t1({ rate: fmtRate(RATE_2023) })} sub={m.dc2t4()} />
      <MetricCard label={m.dc2t5()} value={fmtInt(baselineCases)} sub={m.dc3t2({ volume: fmtInt(totalVolumeM) })} />
      <MetricCard label={m.dc2t6()} value={m.dc2t7()} sub={m.dc2t8()} accent />
    </div>

    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-base font-semibold">{m.dc06()}</p>
      <p class="text-[13.5px] text-muted-foreground">
        {m.dc07()}
      </p>
      <div class="mt-4 grid gap-5 sm:grid-cols-2">
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>{m.dc08()}</span><span class="kpi-value text-primary">{geotagCoverage}%</span></span>
          <input type="range" min="0" max="100" step="5" value={geotagCoverage} oninput={(e) => (geotagCoverage = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => notify({ message: `Cakupan geotag ${geotagCoverage}%`, type: "info", title: "Complaint Monitor" })} aria-label="Cakupan geotag presisi" class="mt-2 w-full accent-[var(--color-primary)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>{m.dc09()}</span><span class="kpi-value text-primary">{rootCoverage}%</span></span>
          <input type="range" min="0" max="100" step="5" value={rootCoverage} oninput={(e) => (rootCoverage = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => notify({ message: `Solusi hulu ${rootCoverage}%`, type: "info", title: "Complaint Monitor" })} aria-label="Cakupan solusi hulu" class="mt-2 w-full accent-[var(--color-primary)]" />
        </label>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border bg-background/40 p-4 text-center">
          <p class="text-xs text-muted-foreground">{m.dc10()}</p>
          <p class="kpi-value text-2xl {targetReached ? 'text-success-foreground' : 'text-destructive-foreground'}">{fmtRate(projectedRate)}<span class="text-sm text-muted-foreground"> {m.dc11()}</span></p>
        </div>
        <div class="rounded-xl border bg-background/40 p-4 text-center">
          <p class="text-xs text-muted-foreground">{m.dc12()}</p>
          <p class="kpi-value text-2xl text-primary">{fmtInt(casesAvoided)}</p>
        </div>
        <div class="rounded-xl border bg-background/40 p-4 text-center">
          <p class="text-xs text-muted-foreground">{m.dc13()}</p>
          <p class="kpi-value text-2xl {targetReached ? 'text-success-foreground' : 'text-muted-foreground'}">{targetReached ? "Tercapai" : "Belum"}</p>
        </div>
      </div>
    </section>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-2 text-sm font-medium">{m.dc14()}</p>
      <ul class="space-y-2 text-sm text-muted-foreground">
        <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"></span><span><span class="font-medium text-foreground">{m.dc15()}</span> {m.dc16()}</span></li>
        <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"></span><span><span class="font-medium text-foreground">{m.dc17()}</span> {m.dc18()}</span></li>
        <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"></span><span><span class="font-medium text-foreground">{m.dc19()}</span> {m.dc20()}</span></li>
      </ul>
    </div>

    <div class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm">
      <span class="font-medium">{m.dc21()}</span> ~{fmtInt(baselineCases)} {m.dc3f1()} {fmtInt(totalVolumeM)} {m.dc3f2()}
      {m.dc3f3()} <span class="font-medium">{m.dc22()}</span>{m.dc23()}
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-3">{#each Array(3) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}</div>
    <div class="h-56 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
