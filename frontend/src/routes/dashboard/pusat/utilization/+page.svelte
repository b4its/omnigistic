<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type Hub } from "$lib/api";
  import { UTIL_THRESHOLD } from "$lib/logistics";
  import EChart from "$lib/components/EChart.svelte";
  import HubMap from "$lib/map/HubMap.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import { horizontalBar } from "$lib/charts/options";

  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load() {
    failed = false;
    loaded = false;
    try {
      hubs = await api.hubs();
    } catch {
      hubs = [];
      failed = true;
    }
    loaded = true;
  }

  onMount(() => void load());

  const sorted = $derived([...hubs].sort((a, b) => b.utilizationPct - a.utilizationPct));
  const top = $derived(sorted[0]);
  const low = $derived(sorted[sorted.length - 1]);
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.pu01()}</h1>
    <span class="hub-label text-muted-foreground">ambang overload &gt; {UTIL_THRESHOLD.critical}%</span>
  </div>

  {#if loaded && hubs.length}
    <section class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p class="text-base font-semibold">{m.pu02()}</p>
          <p class="text-[13.5px] text-muted-foreground">{m.uz3f1()} {UTIL_THRESHOLD.warn}%, kuning {UTIL_THRESHOLD.warn}-{UTIL_THRESHOLD.critical}%, merah &gt; {UTIL_THRESHOLD.critical}{m.uz3f2()}</p>
        </div>
        <span class="rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground">{hubs.length} hub</span>
      </div>
      <HubMap hubs={hubs} height={560} />
    </section>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-2xl border border-destructive/30 bg-card p-4">
        <p class="text-[13.5px] text-muted-foreground">Tertinggi · {top.name} ({top.code})</p>
        <p class="kpi-value text-2xl text-destructive-foreground">{top.utilizationPct}%</p>
        <p class="text-[13.5px] text-muted-foreground">{top.capacityM} {m.uz3f3()} {top.outlets} outlet</p>
      </div>
      <div class="rounded-2xl border border-success/40 bg-card p-4">
        <p class="text-[13.5px] text-muted-foreground">Terendah · {low.name} ({low.code})</p>
        <p class="kpi-value text-2xl text-success-foreground">{low.utilizationPct}%</p>
        <p class="text-[13.5px] text-muted-foreground">{low.capacityM} {m.uz3f3()} {low.outlets} outlet</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-base font-semibold">{m.pu03()}</p>
      <EChart
        option={horizontalBar(
          sorted.map((h) => h.name),
          sorted.map((h) => ({
            name: h.name,
            value: h.utilizationPct,
            color: h.utilizationPct > UTIL_THRESHOLD.critical ? "var(--color-chart-4)" : h.utilizationPct > UTIL_THRESHOLD.warn ? "var(--color-chart-3)" : "var(--color-chart-2)"
          }))
        )}
        height={Math.max(320, sorted.length * 24)}
      />
    </div>
  {:else}
    <PageState loading={!loaded && !failed} error={failed} errorTitle={m.uz2t1()} onretry={load} skeletonCards={0} skeletonHeight={320} />
  {/if}
</div>
