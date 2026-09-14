<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub, type Insights } from "$lib/api";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";

  let hubs = $state<Hub[]>([]);
  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);

  onMount(async () => {
    try {
      hubs = await api.hubs();
    } catch {
      hubs = [];
    }
    try {
      const ins = await api.insights("HUB");
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* ignore */
    }
    loaded = true;
  });

  const bdg = $derived(hubs.find((h) => h.name === "Bandung") ?? hubs[0]);
  const javaAvg = $derived(
    hubs.length
      ? Math.round((hubs.filter((h) => h.region === "Java").reduce((s, h) => s + h.utilizationPct, 0) / Math.max(1, hubs.filter((h) => h.region === "Java").length)) * 10) / 10
      : 0
  );
  const rank = $derived(
    hubs.length ? [...hubs].sort((a, b) => b.utilizationPct - a.utilizationPct).findIndex((h) => h.name === bdg?.name) + 1 : 0
  );

  const kpi = $derived(
    hubs.length
      ? [
          { label: "Utilization Anda", value: `${bdg.utilizationPct}%`, sub: bdg.name, accent: bdg.utilizationPct > 65 ? "var(--color-destructive-foreground)" : "var(--color-success-foreground)" },
          { label: "Rata-rata Jawa", value: `${javaAvg}%`, sub: "8 hub" },
          { label: "Peringkat", value: `#${rank}`, sub: "dari 23 hub" },
          { label: "Kapasitas", value: `${bdg.capacityM}M`, sub: `${bdg.outlets} outlet` }
        ]
      : []
  );
</script>

{#if loaded && hubs.length}
  <RoleOverview role="HUB" kpi={kpi} greeting={greeting} insights={insights}>
    {#snippet chart()}
      <EChart
        option={barChart(
          hubs.map((h) => h.name),
          [{
            name: "Utilisasi",
            data: hubs.map((h) => h.utilizationPct),
            radius: [4, 4, 0, 0]
          }]
        )}
        height={230}
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