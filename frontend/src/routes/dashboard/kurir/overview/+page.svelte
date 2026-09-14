<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Insights } from "$lib/api";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";

  let routes = $state<Array<{ type: string; durationMin: number; productivity: number }>>([]);
  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);

  onMount(async () => {
    try {
      routes = await api.routes();
    } catch {
      routes = [];
    }
    try {
      const ins = await api.insights("KURIR");
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* ignore */
    }
    loaded = true;
  });

  const cod = $derived(routes.find((r) => r.type === "COD"));
  const nonCod = $derived(routes.find((r) => r.type === "Non-COD"));

  const kpi = $derived(
    routes.length
      ? [
          { label: "Rute Kunjungan COD", value: cod ? `${cod.durationMin} menit` : "138 menit", sub: "8 paket, 5,3 km", accent: "var(--color-destructive-foreground)" },
          { label: "Rute Non-COD", value: nonCod ? `${nonCod.durationMin} menit` : "75 menit", sub: "8 paket, 5,3 km", accent: "var(--color-success-foreground)" },
          { label: "Produktivitas COD", value: "3,48/jam", sub: "vs 6,4 non-COD" },
          { label: "Hambatan", value: "+84%", sub: "COD lebih lama dari non-COD" }
        ]
      : []
  );
</script>

{#if loaded && routes.length}
  <RoleOverview role="KURIR" kpi={kpi} greeting={greeting} insights={insights}>
    {#snippet chart()}
      <EChart
        option={barChart(
          routes.map((r) => r.type),
          [{ name: "Durasi (menit)", data: routes.map((r) => r.durationMin) }]
        )}
        height={220}
      />
    {/snippet}
  </RoleOverview>
{:else}
  <div class="space-y-5">
    <div class="h-24 animate-pulse rounded-2xl border border-border bg-card/60"></div>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}
    </div>
  </div>
{/if}