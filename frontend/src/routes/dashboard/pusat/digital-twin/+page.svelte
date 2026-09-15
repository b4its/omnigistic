<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { api, type TwinResult } from "$lib/api";

  let results = $state<Record<string, TwinResult>>({});
  let loaded = $state(false);
  let failed = $state(false);

  async function load() {
    failed = false;
    loaded = false;
    try {
      results = await api.digitalTwin();
    } catch {
      results = {};
      failed = true;
    }
    loaded = true;
  }

  onMount(() => void load());

  const scenOrder = [
    "Jawa Direct + Sponsor Bertahap",
    "Semua Region Sponsor Penuh",
    "Timur-Only Fokus"
  ];

  /** Hanya skenario yang benar-benar ada di respons (hindari crash r=undefined). */
  const available = $derived(scenOrder.filter((n) => results[n]));
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">Digital Twin Simulation</h1>
  <p class="text-sm text-muted-foreground">Skenario preset: Direct Operation vs Regional Sponsor per region (otomatis, non-interaktif).</p>

  {#if loaded && available.length}
    <div class="grid gap-6 lg:grid-cols-3">
      {#each available as name (name)}
        {@const r = results[name]}
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="hub-label text-primary">{name}</p>
          <div class="mt-4 space-y-3">
            <div class="rounded-lg bg-muted/50 p-3 text-sm">
              <span class="text-muted-foreground">Regional sponsor difokuskan:</span>
              <p class="mt-1 font-semibold text-foreground">{r.regionalSponsorPct}% weighted</p>
            </div>
            <div class="grid grid-cols-2 gap-3 text-center">
              <div><p class="text-xs text-muted-foreground">Capex Saving</p><p class="kpi-value text-lg text-primary">Rp{r.totalCapexSavingT}T</p></div>
              <div><p class="text-xs text-muted-foreground">East Utilisation</p><p class="kpi-value text-lg">{r.eastUtilisationGain}%</p></div>
              <div><p class="text-xs text-muted-foreground">On-Time Impact</p><p class="kpi-value text-lg text-destructive-foreground">{r.onTimeImpactPct}%</p></div>
              <div><p class="text-xs text-muted-foreground">Capacity Freed</p><p class="kpi-value text-lg text-success-foreground">{r.directOpVolFreedM.toFixed(2)}M/day</p></div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
      <span class="font-medium">Rekomendasi:</span> Jawa tetap Direct Operation (volume padat, utilisasi &gt;65%), Kalimantan-Sulawesi sponsor bertahap di bawah ambang 50%, Maluku-Papua sponsor penuh. Digital Twin menguji dampak capex, utilisasi timur, dan on-time sebelum keputusan.
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive-foreground"><Icon name="warn" cls="h-6 w-6" /></span>
      <p class="mt-3 text-sm font-semibold text-foreground">Gagal memuat simulasi Digital Twin</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Coba lagi setelah backend aktif.</p>
      <button type="button" onclick={() => load()} class="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Coba lagi</button>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Skenario tidak tersedia.</div>
  {:else}
    <div class="grid gap-6 lg:grid-cols-3">
      {#each Array(3) as _, i (i)}<div class="h-56 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}
    </div>
  {/if}
</div>