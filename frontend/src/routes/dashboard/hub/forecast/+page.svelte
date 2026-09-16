<script lang="ts">
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

  interface ForecastResp {
    model: string;
    note: string;
    dataPoints: number;
    projection: ForecastMonth[];
    peak: { month: string; label: string; totalM: number };
    trough: { month: string; label: string; totalM: number };
    fluctuationPct: number;
    backtest?: { mapePct: number; method: string };
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
      if (userTriggered) notify({ message: "Forecast dimuat ulang", type: "success", title: "Demand Forecast" });
    } catch {
      forecast = null;
      actual = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat forecast", type: "error", title: "Demand Forecast" });
    }
    loaded = true;
  }

  onMount(() => void load());

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
    <h1 class="font-heading text-xl font-semibold tracking-tight">Demand Forecast</h1>
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
      <p class="mb-3 text-sm font-medium">Demand bulanan (juta paket) · actual 2023 &amp; proyeksi 2024</p>
      {#if chart}
        <EChart option={chart} height={300} />
      {/if}
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">Event flags terpasang</h2>
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
        <h2 class="text-sm font-semibold">Catatan jujur model</h2>
        <p class="mt-2 text-[15px] leading-relaxed text-muted-foreground">{forecast.note}</p>
        {#if forecast.backtest}
          <p class="mt-2 text-[15px] leading-relaxed text-muted-foreground">
            Backtest in-sample ({forecast.backtest.method}): <span class="font-semibold text-foreground">MAPE {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(forecast.backtest.mapePct)}%</span> — model mereproduksi pola 2023 dengan galat rendah, namun hanya tersedia 12 titik sehingga validasi hold-out belum dimungkinkan.
          </p>
        {/if}
      </div>
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat forecast demand</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Coba lagi setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Coba lagi</button>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Data forecast tidak tersedia.</div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>