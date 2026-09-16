<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub, type Insights } from "$lib/api";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import { barChart } from "$lib/charts/options";

  let hubs = $state<Hub[]>([]);
  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load() {
    loaded = false;
    failed = false;
    try {
      hubs = await api.hubs();
    } catch {
      hubs = [];
      failed = true;
    }
    try {
      const ins = await api.insights("HUB");
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* insights opsional */
    }
    loaded = true;
  }

  onMount(() => void load());

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
  <PageState loading={!loaded && !failed} error={failed} errorTitle="Gagal memuat ringkasan hub" onretry={load} />
{/if}