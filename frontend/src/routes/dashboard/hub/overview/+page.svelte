<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type Hub, type Insights } from "$lib/api";
  import { UTIL_THRESHOLD } from "$lib/logistics";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import RoleHubLinks from "$lib/components/RoleHubLinks.svelte";
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
      const ins = await api.insights(m.hw2t1());
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* insights opsional */
    }
    loaded = true;
  }

  onMount(() => void load());

  const bdg = $derived(hubs.find((h) => h.name === "Bandung") ?? hubs[0]);
  const javaHubs = $derived(hubs.filter((h) => h.region === "Java"));
  const javaAvg = $derived(
    javaHubs.length
      ? Math.round((javaHubs.reduce((s, h) => s + h.utilizationPct, 0) / Math.max(1, javaHubs.length)) * 10) / 10
      : 0
  );
  const rank = $derived(
    hubs.length ? [...hubs].sort((a, b) => b.utilizationPct - a.utilizationPct).findIndex((h) => h.name === bdg?.name) + 1 : 0
  );

  const kpi = $derived(
    hubs.length
      ? [
          { label: "Utilization Anda", value: `${bdg.utilizationPct}%`, sub: bdg.name, accent: bdg.utilizationPct > UTIL_THRESHOLD.critical ? "var(--color-destructive-foreground)" : "var(--color-success-foreground)" },
          { label: m.ho2t1(), value: `${javaAvg}%`, sub: `${javaHubs.length} hub` },
          { label: "Peringkat", value: `#${rank}`, sub: m.ho3t1({ n: hubs.length }) },
          { label: m.ho2t2(), value: `${bdg.capacityM}M`, sub: `${bdg.outlets} outlet` }
        ]
      : []
  );
</script>

{#if loaded && hubs.length}
  <RoleOverview role={m.hw2t1()} kpi={kpi} greeting={greeting} insights={insights}>
    {#snippet chart()}
      <EChart
        option={barChart(
          hubs.map((h) => h.name),
          [{
            name: m.ho2t3(),
            data: hubs.map((h) => h.utilizationPct),
            radius: [4, 4, 0, 0]
          }]
        )}
        height={230}
      />
    {/snippet}
  </RoleOverview>
{:else}
  <PageState loading={!loaded && !failed} error={failed} errorTitle={m.ho2t4()} onretry={load} />
{/if}

<RoleHubLinks
  links={[
    { label: m.ho2t5(), href: "/dashboard/hub/dashboard", icon: "globe", desc: m.hbh01() },
    { label: "Demand Forecast", href: "/dashboard/hub/forecast", icon: "chart", desc: m.hbh02() },
    { label: "Load Balancing", href: "/dashboard/hub/load-balance", icon: "compass", desc: m.hbh03() },
    { label: "Capacity Alert", href: "/dashboard/hub/capacity", icon: "bell", desc: m.hbh04() },
    { label: "Peak-Surge Test", href: "/dashboard/hub/surge", icon: "activity", desc: m.hbh05() },
    { label: "Nigi AI", href: "/dashboard/hub/assistant", icon: "chat", desc: m.hbh06() }
  ]}
/>