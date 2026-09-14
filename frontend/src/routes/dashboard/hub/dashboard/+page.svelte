<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub } from "$lib/api";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";

  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);

  onMount(async () => {
    try {
      hubs = await api.hubs();
    } catch {
      hubs = [];
    }
    loaded = true;
  });

  const bdg = $derived(hubs.find((h) => h.name === "Bandung") ?? hubs[0]);
  const javaAvg = $derived(
    hubs.length
      ? Math.round((hubs.filter((h) => h.region === "Java").reduce((s, h) => s + h.utilizationPct, 0) / Math.max(1, hubs.filter((h) => h.region === "Java").length)) * 10) / 10
      : 0
  );
  const rank = $derived(hubs.length ? [...hubs].sort((a, b) => b.utilizationPct - a.utilizationPct).findIndex((h) => h.name === bdg?.name) + 1 : 0);

  const bench = $derived(
    hubs
      .map((h) => ({ ...h, isBandung: h.name === "Bandung" }))
      .sort((a, b) => b.utilizationPct - a.utilizationPct)
  );
</script>

{#if loaded && hubs.length}
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Hub Dashboard</h1>
      <span class="hub-label text-muted-foreground">{bdg.code} · {bdg.region}</span>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs text-muted-foreground">Hub Anda, {bdg.name}</p>
      <div class="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><p class="kpi-value text-2xl">{bdg.utilizationPct}%</p><p class="text-xs text-muted-foreground">Utilisation</p></div>
        <div><p class="kpi-value text-2xl">{bdg.capacityM}M</p><p class="text-xs text-muted-foreground">Kapasitas/hari</p></div>
        <div><p class="kpi-value text-2xl">{bdg.outlets}</p><p class="text-xs text-muted-foreground">Outlet P/D</p></div>
        <div><p class="kpi-value text-2xl">#{rank}</p><p class="text-xs text-muted-foreground">dari {hubs.length} hub</p></div>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-sm font-medium">Benchmark, utilisation (%)</p>
      <EChart
        option={barChart(
          bench.map((h) => h.name),
          [{ name: "Utilisasi", data: bench.map((h) => h.utilizationPct) }]
        )}
        height={300}
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border bg-card p-4 text-center">
        <p class="kpi-value text-xl text-primary">{javaAvg}%</p><p class="text-xs text-muted-foreground">Rata-rata Jawa</p>
      </div>
      <div class="rounded-2xl border bg-card p-4 text-center">
        <p class="kpi-value text-xl text-chart-3">{(bdg.utilizationPct - javaAvg > 0 ? "+" : "")}{(bdg.utilizationPct - javaAvg).toFixed(1)} pts</p><p class="text-xs text-muted-foreground">vs rata-rata Jawa</p>
      </div>
      <div class="rounded-2xl border bg-card p-4 text-center">
        <p class="kpi-value text-xl text-destructive-foreground">&ge;65%</p><p class="text-xs text-muted-foreground">Ambang alert</p>
      </div>
    </div>
  </div>
{:else}
  <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
{/if}