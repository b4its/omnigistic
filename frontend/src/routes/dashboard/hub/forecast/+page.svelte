<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { notify } from "$lib/toast";
  import EChart from "$lib/components/EChart.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import { lineChart } from "$lib/charts/options";

  interface ForecastMonth {
    month: string;
    label: string;
    totalM: number;
    events: string[];
  }

  interface ForecastEvent { label: string; months: string[]; boost: number }
  interface ForecastResp {
    model: string;
    note: string;
    dataPoints: number;
    eventCatalog?: ForecastEvent[];
    projection: ForecastMonth[];
    peak: { month: string; label: string; totalM: number };
    trough: { month: string; label: string; totalM: number };
    fluctuationPct: number;
    inSampleFit?: { mapePct: number; method: string; isHoldout: boolean };
  }

  let forecast = $state<ForecastResp | null>(null);
  let actual = $state<{ rows: Array<{ month: string; totalM: number; ecommerceM: number; events: string[] }> } | null>(null);
  let loaded = $state(false);
  let failed = $state(false);

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat ulang forecast…", type: "info", title: "Demand Forecast" });
    try {
      [forecast, actual] = await Promise.all([api.forecast(), api.demandActual()]);
      initScales();
      if (userTriggered) notify({ message: "Forecast dimuat ulang", type: "success", title: "Demand Forecast" });
    } catch {
      forecast = null;
      actual = null;
      failed = true;
      if (userTriggered) notify({ message: m.hf2t1(), type: "error", title: "Demand Forecast" });
    }
    loaded = true;
  }

  onMount(() => void load());

  // Simulasi event interaktif: skala boost per label (1.0 = kasus apa adanya, 0 = off).
  let scales = $state<Record<string, number>>({});
  let simulating = $state(false);

  function initScales() {
    if (!forecast?.eventCatalog) return;
    const s: Record<string, number> = {};
    for (const e of forecast.eventCatalog) s[e.label] = scales[e.label] ?? 1.0;
    scales = s;
  }

  async function applySim() {
    if (!forecast?.eventCatalog) return;
    simulating = true;
    try {
      forecast = await api.forecastCustom({ event_scale: { ...scales } });
      notify({ message: "Proyeksi diperbarui sesuai skenario event", type: "success", title: "Demand Forecast" });
    } catch {
      notify({ message: m.hf2t2(), type: "error", title: "Demand Forecast" });
    } finally {
      simulating = false;
    }
  }

  function resetSim() {
    if (!forecast?.eventCatalog) return;
    const s: Record<string, number> = {};
    for (const e of forecast.eventCatalog) s[e.label] = 1.0;
    scales = s;
    void applySim();
  }

  const chart = $derived.by(() => {
    if (!forecast || !actual) return null;
    return lineChart(
      [...actual.rows.map((r) => r.month), ...forecast.projection.map((p) => p.label.split(" ")[0] + "*")],
      [
        { name: "Aktual 2023", data: actual.rows.map((r) => r.totalM), color: "var(--color-primary)", area: true },
        { name: "Proyeksi 2024", data: [...Array(actual.rows.length).fill(null), ...forecast.projection.map((p) => p.totalM)], color: "var(--color-chart-2)", smooth: true }
      ]
    );
  });
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.hf01()}</h1>
    {#if forecast}
      <span class="hub-label text-muted-foreground">{forecast.model}</span>
    {/if}
  </div>

  {#if loaded && forecast && actual}
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Peak 2024" value={String(forecast.peak.totalM)} delta={forecast.peak.month} deltaTone="warn" sub="puncak proyeksi" />
      <MetricCard label="Trough 2024" value={String(forecast.trough.totalM)} delta={forecast.trough.month} deltaTone="up" sub="lembah proyeksi" />
      <MetricCard label="Fluktuasi" value={`${forecast.fluctuationPct}%`} sub="2024 proyeksi (2023: 34,6%)" />
      <MetricCard label="Model" value="Event-flags" delta="ETS" sub="12 titik 2023 + kalender promo" />
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-sm font-medium">{m.hf02()}</p>
      {#if chart}
        <EChart option={chart} height={300} />
      {/if}
    </div>

    {#if forecast.eventCatalog?.length}
      <div class="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">{m.hf03()}</p>
            <p class="mt-1 text-xs text-muted-foreground">{m.hf04()}</p>
          </div>
          <button type="button" onclick={resetSim} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold hover:border-primary/40">{m.hf05()}</button>
        </div>
        <div class="mt-4 grid gap-5 sm:grid-cols-3">
          {#each forecast.eventCatalog as e (e.label)}
            <label class="block">
              <span class="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>{e.label} <span class="text-muted-foreground">({e.months.join(", ")})</span></span>
                <span class="kpi-value text-foreground">{((scales[e.label] ?? 1) * 100).toFixed(0)}%</span>
              </span>
              <input
                type="range" min="0" max="200" step="10"
                bind:value={scales[e.label]}
                aria-label="Skala event {e.label}"
                class="mt-2 w-full accent-[var(--color-primary)]"
              />
            </label>
          {/each}
        </div>
        <button
          type="button"
          onclick={applySim}
          disabled={simulating}
          class="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px active:translate-y-0 disabled:opacity-60"
        >{simulating ? "Menghitung…" : "Terapkan skenario"}</button>
      </div>
    {/if}

    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">{m.hf06()}</h2>
        <ul class="mt-3 space-y-2 text-sm">
          {#each forecast.projection.filter((p) => p.events.length > 0) as p (p.label)}
            <li class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span>{p.label}</span>
              <span class="flex gap-1.5">
                {#each p.events as ev (ev)}
                  <span class="rounded-md bg-warning px-2 py-0.5 text-[13px] font-semibold text-warning-foreground">{ev}</span>
                {/each}
              </span>
            </li>
          {/each}
        </ul>
      </div>
      <div class="rounded-2xl border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">{m.hf07()}</h2>
        <p class="mt-2 text-[15px] leading-relaxed text-muted-foreground">{forecast.note}</p>
        {#if forecast.inSampleFit}
          <p class="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            {m.hf08()} <span class="font-semibold text-foreground">{m.hf09()}</span>, bukan backtest hold-out: MAPE {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(forecast.inSampleFit.mapePct)}{m.hf3f1()} <span class="italic">{m.hf10()}</span>
          </p>
        {/if}
      </div>
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">{m.hf11()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.hf12()}</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">{m.hf13()}</button>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">{m.hf14()}</div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>