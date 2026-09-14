<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";

  let route = $state<Array<{ type: string; packages: number; distanceKm: number; durationMin: number; productivity: number }>>([]);
  let quotes = $state<Array<{ city: string; quote: string }>>([]);
  let loaded = $state(false);

  onMount(async () => {
    try {
      [route, quotes] = await Promise.all([api.routes(), api.courierQuotes()]);
    } catch {
      route = [];
      quotes = [];
    }
    loaded = true;
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Route Clustering</h1>
    <span class="hub-label text-muted-foreground">KURIR · Baits</span>
  </div>

  {#if loaded && route.length}
    <div class="grid gap-6 sm:grid-cols-2">
      {#each route as t (t.type)}
        <div class="rounded-2xl border border-border bg-card p-5 {t.type === 'COD' ? 'border-l-4 border-l-chart-4' : ''}">
          <p class="hub-label text-xs text-muted-foreground">{t.type}</p>
          <p class="kpi-value mt-2 text-3xl">{t.durationMin} min</p>
          <p class="mt-1 text-sm text-muted-foreground">{t.packages} paket · {t.distanceKm} km</p>
          <p class="kpi-value mt-2 text-lg text-primary">{t.productivity}/jam</p>
        </div>
      {/each}
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-sm font-medium">COD vs Non-COD, selisih</p>
      <EChart
        option={barChart(
          route.map((r) => r.type),
          [{ name: "Durasi (menit)", data: route.map((r) => r.durationMin) }]
        )}
        height={200}
      />
    </div>

    <div class="space-y-3">
      {#each quotes as q (q.city)}
        <blockquote class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm italic">
          &ldquo;{q.quote}&rdquo;
          <span class="mt-1 block text-xs not-italic text-muted-foreground">dari Kurir {q.city}</span>
        </blockquote>
      {/each}
    </div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>