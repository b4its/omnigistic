<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import EChart from "$lib/components/EChart.svelte";
  import { donutChart } from "$lib/charts/options";

  let fleet = $state<Record<string, number>>({});
  let loaded = $state(false);

  onMount(async () => {
    try {
      fleet = await api.fleet();
    } catch {
      fleet = {};
    }
    loaded = true;
  });

  const pieData = $derived([
    { name: "Motor", value: fleet.motorcycles ?? 12500, color: "var(--color-chart-1)" },
    { name: "Van", value: fleet.vans ?? 280, color: "var(--color-chart-3)" },
    { name: "Truck", value: fleet.trucks ?? 560, color: "var(--color-chart-5)" }
  ]);

  const total = $derived(pieData.reduce((s, d) => s + d.value, 0));
  // Basis total aset = line-haul 840 + motor 12.500 + van 280 + truk 560 = 14.180
  const totalAll = $derived((fleet.lineHaul ?? 840) + total);
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Fleet &amp; Emissions</h1>
    <span class="hub-label text-muted-foreground">DATA · motor dominan 93,7%</span>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-2xl border bg-card p-4 text-center">
      <p class="kpi-value text-2xl">{totalAll}</p>
      <p class="text-xs text-muted-foreground">Total unit (line-haul + last-mile)</p>
    </div>
    <div class="rounded-2xl border border-primary/30 bg-card p-4 text-center">
      <p class="kpi-value text-2xl text-primary">{(fleet.motorcycleSharePct ?? 93.7)}%</p>
      <p class="text-xs text-muted-foreground">Motor (dari {total} last-mile)</p>
    </div>
    <div class="rounded-2xl border border-chart-3 bg-card p-4 text-center">
      <p class="kpi-value text-2xl text-chart-3">{fleet.lastMileMotorPct ?? 70}%</p>
      <p class="text-xs text-muted-foreground">last-mile motor</p>
    </div>
    <div class="rounded-2xl border border-destructive/30 bg-card p-4 text-center">
      <p class="kpi-value text-2xl text-destructive-foreground">200</p>
      <p class="text-xs text-muted-foreground">target EV 2026</p>
    </div>
  </div>

  <div class="rounded-2xl border bg-card p-5">
    <p class="mb-3 text-sm font-medium">Armada composition (motor dominan)</p>
    {#if loaded}
      <EChart option={donutChart(pieData)} height={220} />
    {/if}
  </div>

  <div class="rounded-2xl border bg-card p-5">
    <p class="mb-3 text-sm font-medium">Roadmap 3 Fase</p>
    <ol class="space-y-3">
      <li class="rounded-md bg-muted/50 p-3 text-sm"><span class="font-semibold">Fase 1</span> (2024-25): 50 EV pilot di rute urban Jawa. <span class="text-muted-foreground">Baseline emisi + reusable bags.</span></li>
      <li class="rounded-md bg-muted/50 p-3 text-sm"><span class="font-semibold">Fase 2</span> (2025-26): 200 EV + infrastruktur charging. <span class="text-muted-foreground">Kemasan degradable penuh.</span></li>
      <li class="rounded-md bg-muted/50 p-3 text-sm"><span class="font-semibold">Fase 3</span> (2026+): Ekspansi van/truk + replacement policy 8 tahun. <span class="text-muted-foreground">Emisi/paket -20%/2027.</span></li>
    </ol>
  </div>

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
    Motor 93,7% armada (12.500 unit). Target 200 EV ≈ 1,4% dari 14.180 unit. Perlu kebijakan penyusutan 8 tahun untuk transisi alami tanpa lonjakan capex.
  </div>
</div>