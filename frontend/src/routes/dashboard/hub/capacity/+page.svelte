<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub } from "$lib/api";
  import { cn } from "$lib/utils";

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

  const atRisk = $derived(hubs.filter((h) => h.utilizationPct > 65));
  const bdg = $derived(hubs.find((h) => h.name === "Bandung"));
  const bufferActive = $derived(true); // auto-demo: buffer aktif
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Capacity Alert</h1>
    <span class="hub-label text-muted-foreground">Early warning &gt;65%</span>
  </div>

  {#if loaded && bdg}
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs text-muted-foreground">Hub Bandung, utilisasi</p>
      <p class="kpi-value text-3xl {bdg.utilizationPct > 65 ? 'text-destructive-foreground' : 'text-chart-3'}">{bdg.utilizationPct}%</p>
      <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div class="h-full {bdg.utilizationPct > 65 ? 'bg-destructive' : 'bg-chart-3'}" style="width: {bdg.utilizationPct}%"></div>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">{bdg.utilizationPct > 65 ? "Di atas ambang 65%, butuh perhatian" : "Dalam zona aman"}</p>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex items-center justify-between">
        <p class="text-sm font-medium">Hub di atas ambang (&gt;65%)</p>
        <span class={cn("rounded-md px-3 py-1.5 text-xs font-semibold", bufferActive ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")}>
          {bufferActive ? "Buffer kurir aktif" : "Buffer off"}
        </span>
      </div>
      <ul class="space-y-2">
        {#if atRisk.length === 0}
          <li class="text-sm text-muted-foreground">Tidak ada hub di atas ambang.</li>
        {/if}
        {#each atRisk as h (h.name)}
          <li class="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2 text-sm">
            <span>{h.name} <span class="hub-label text-muted-foreground">· {h.code}</span></span>
            <span class="kpi-value text-destructive-foreground">{h.utilizationPct}%</span>
          </li>
        {/each}
      </ul>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border bg-card p-4">
        <p class="hub-label text-xs text-muted-foreground">Lembah</p>
        <p class="kpi-value text-lg">78M</p>
        <p class="text-xs text-muted-foreground">kontrak kurir inti</p>
      </div>
      <div class="rounded-2xl border bg-card p-4 border-primary/30">
        <p class="hub-label text-xs text-muted-foreground">Normal</p>
        <p class="kpi-value text-lg">92,5M</p>
        <p class="text-xs text-muted-foreground">+ kurir musiman</p>
      </div>
      <div class="rounded-2xl border bg-card p-4">
        <p class="hub-label text-xs text-muted-foreground">Puncak</p>
        <p class="kpi-value text-lg">105M+</p>
        <p class="text-xs text-muted-foreground">+15% buffer armada sewa</p>
      </div>
    </div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>