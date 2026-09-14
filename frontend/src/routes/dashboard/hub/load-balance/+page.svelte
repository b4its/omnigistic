<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub } from "$lib/api";

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

  // Preset Double 12: overflow Jakarta 25% → Bekasi-Karawang
  const overflowPct = 25;
  const jkt = $derived(hubs.find((h) => h.name === "Jakarta") ?? hubs[0]);
  const target = $derived(hubs.find((h) => h.name === "Bekasi-Karawang") ?? hubs[1]);

  const overflowM = $derived(jkt ? Math.round(jkt.capacityM * (overflowPct / 100) * 1000) / 1000 : 0);
  const jktAfter = $derived(jkt && overflowM ? Math.max(0, jkt.utilizationPct - (overflowM / jkt.capacityM) * 100).toFixed(1) : "0");
  const tgtAfter = $derived(target && overflowM ? Math.min(100, target.utilizationPct + (overflowM / target.capacityM) * 100).toFixed(1) : "0");
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">Load Balancing</h1>
  <p class="text-sm text-muted-foreground">Simulasi pengalihan overflow Double 12 2022 · preset {overflowPct}% (auto, non-interaktif)</p>

  {#if loaded && jkt && target}
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <p class="text-xs font-medium">Overflow dari Jakarta ({overflowPct}% · kasus Double 12)</p>
          <div class="mt-2 flex items-center gap-3">
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full bg-primary" style="width: {overflowPct}%"></div>
            </div>
            <span class="kpi-value text-sm">{overflowM}M/day</span>
          </div>
        </div>
        <div class="rounded-lg bg-muted p-4 text-sm">
          <p><span class="text-muted-foreground">Volume dialihkan:</span> <span class="kpi-value">{overflowM}M/day</span></p>
          <p class="mt-1"><span class="text-muted-foreground">Jakarta after:</span> <span class="kpi-value text-primary">{jktAfter}%</span> <span class="text-muted-foreground">(dari {jkt.utilizationPct}%)</span></p>
          <p class="mt-1"><span class="text-muted-foreground">{target.name} {target.utilizationPct}% →</span> <span class="kpi-value text-chart-3">{tgtAfter}%</span></p>
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Kasus Nyata, Double 12 2022</p>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Hub Jakarta 1 dialihkan sebagian paket ke hub lain karena kapasitas penuh. Omnigistic mencegah pengalihan mendadak ini lewat forecast + kapasitas elastis.
        </p>
        <div class="mt-4 space-y-2">
          {#each hubs.filter((h) => h.name !== "Jakarta" && h.utilizationPct < 80).slice(0, 5) as h (h.name)}
            <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span>{h.name} ({h.code})</span>
              <span class="kpi-value text-chart-3">{h.utilizationPct}%</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>