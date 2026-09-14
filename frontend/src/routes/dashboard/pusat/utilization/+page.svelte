<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub } from "$lib/api";
  import EChart from "$lib/components/EChart.svelte";
  import HubMap from "$lib/map/HubMap.svelte";
  import { horizontalBar } from "$lib/charts/options";

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

  const sorted = $derived([...hubs].sort((a, b) => b.utilizationPct - a.utilizationPct));
  const top = $derived(sorted[0]);
  const low = $derived(sorted[sorted.length - 1]);
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Utilization Map · 23 Hub</h1>
    <span class="hub-label text-muted-foreground">ambang overload &gt; 65%</span>
  </div>

  {#if loaded && hubs.length}
    <section class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p class="text-base font-semibold">Peta 23 hub · utilisasi</p>
          <p class="text-[13.5px] text-muted-foreground">Warna menandai utilisasi: hijau &lt; 50%, kuning 50-65%, merah &gt; 65%. Ukuran bulatan = kapasitas. Klik hub untuk detail.</p>
        </div>
        <span class="rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground">{hubs.length} hub</span>
      </div>
      <HubMap hubs={hubs} height={560} />
    </section>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-2xl border border-destructive/30 bg-card p-4">
        <p class="text-[13.5px] text-muted-foreground">Tertinggi · {top.name} ({top.code})</p>
        <p class="kpi-value text-2xl text-destructive-foreground">{top.utilizationPct}%</p>
        <p class="text-[13.5px] text-muted-foreground">{top.capacityM} juta/hari · {top.outlets} outlet</p>
      </div>
      <div class="rounded-2xl border border-success/40 bg-card p-4">
        <p class="text-[13.5px] text-muted-foreground">Terendah · {low.name} ({low.code})</p>
        <p class="kpi-value text-2xl text-success-foreground">{low.utilizationPct}%</p>
        <p class="text-[13.5px] text-muted-foreground">{low.capacityM} juta/hari · {low.outlets} outlet</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-base font-semibold">Utilisasi per hub (% urut menurun)</p>
      <EChart
        option={horizontalBar(
          sorted.map((h) => h.name),
          sorted.map((h) => ({
            name: h.name,
            value: h.utilizationPct,
            color: h.utilizationPct > 65 ? "var(--color-chart-4)" : h.utilizationPct > 50 ? "var(--color-chart-3)" : "var(--color-chart-2)"
          }))
        )}
        height={Math.max(320, sorted.length * 24)}
      />
    </div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border bg-card/60"></div>
  {/if}
</div>
