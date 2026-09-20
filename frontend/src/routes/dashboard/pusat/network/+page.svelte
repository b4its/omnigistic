<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type NetworkRow } from "$lib/api";
  import EChart from "$lib/components/EChart.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import { barChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let growth = $state<NetworkRow[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load() {
    failed = false;
    loaded = false;
    try {
      growth = await api.network();
    } catch {
      growth = [];
      failed = true;
    }
    loaded = true;
  }

  onMount(() => void load());

  const rows = $derived(
    growth.map((g) => ({
      item: g.item,
      v1: g.value2020 ?? g.v2020,
      v2: g.value2023 ?? g.v2023
    }))
  );
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">{m.pnw01()}</h1>
  <p class="text-sm text-muted-foreground">{m.pnw02()}</p>

  {#if loaded && rows.length}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each rows as g (g.item)}
        <div class="rounded-2xl border bg-card p-4">
          <p class="text-xs text-muted-foreground">{g.item}</p>
          <p class="mt-1 text-xs">
            <span class="kpi-value text-lg">{g.v1}</span>
            <span class="mx-2 text-muted-foreground">→</span>
            <span class="kpi-value text-lg text-primary">{g.v2}</span>
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">{g.v1 > 0 ? `${numId(g.v2 / g.v1, 1)}x lipat` : `${g.v2} units added`}</p>
        </div>
      {/each}
    </div>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-3 text-sm font-medium">{m.pnw03()}</p>
      <EChart
        option={barChart(
          rows.map((g) => g.item),
          [
            { name: "Akhir 2020", data: rows.map((g) => g.v1), color: "var(--color-muted-foreground)" },
            { name: "Akhir 2023", data: rows.map((g) => g.v2), color: "var(--color-primary)" }
          ]
        )}
        height={280}
      />
    </div>

    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm text-muted-foreground">
      <span class="font-medium text-foreground">{m.pnw04()}</span> {m.pnw05()}
    </div>
  {:else}
    <PageState loading={!loaded && !failed} error={failed} errorTitle={m.nw2t1()} onretry={load} skeletonCards={0} skeletonHeight={240} />
  {/if}
</div>