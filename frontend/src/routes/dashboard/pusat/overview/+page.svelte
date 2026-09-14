<script lang="ts">
  import { onMount } from "svelte";
  import { api, type FinRow, type Insights } from "$lib/api";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { lineChart } from "$lib/charts/options";

  let fin = $state<FinRow[]>([]);
  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);

  onMount(async () => {
    try {
      fin = await api.financial();
    } catch {
      fin = [];
    }
    try {
      const ins = await api.insights("PUSAT");
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* ignore */
    }
    loaded = true;
  });

  const kpi = $derived(
    fin.length
      ? (() => {
          const latest = fin[fin.length - 1];
          const first = fin[0];
          const salesG = ((latest.netSalesT / first.netSalesT - 1) * 100).toFixed(1);
          const fulfilG = ((latest.fulfilmentT / first.fulfilmentT - 1) * 100).toFixed(1);
          const ratio = ((latest.fulfilmentT + latest.shippingT) / latest.netSalesT) * 100;
          return [
            { label: "Net Sales", value: `Rp${latest.netSalesT}T`, sub: `${salesG}% vs 2020`, spark: fin.map((f) => f.netSalesT) },
            { label: "Fulfilment Expense", value: `Rp${latest.fulfilmentT}T`, sub: `${fulfilG}% vs 2020`, accent: "var(--color-destructive-foreground)", spark: fin.map((f) => f.fulfilmentT) },
            { label: "Cost-to-Sales", value: `${ratio.toFixed(1)}%`, sub: "fulfilment+shipping / sales" },
            { label: "Market Share", value: "20,6%", sub: "pemimpin 5 tahun" }
          ];
        })()
      : []
  );

  const chartData = $derived(
    fin.map((f) => ({
      y: String(f.year),
      s: f.netSalesT,
      f: f.fulfilmentT
    }))
  );
</script>

{#if loaded}
  <RoleOverview
    role="PUSAT"
    kpi={kpi}
    greeting={greeting}
    insights={insights}
  >
    {#snippet chart()}
      <EChart
        option={lineChart(
          chartData.map((d) => d.y),
          [
            { name: "Net Sales", data: chartData.map((d) => d.s), color: "var(--color-primary)", area: true },
            { name: "Fulfilment", data: chartData.map((d) => d.f), color: "var(--color-chart-5)" }
          ]
        )}
        height={230}
      />
    {/snippet}
  </RoleOverview>
{:else}
  <div class="space-y-5">
    <div class="h-24 w-full animate-pulse rounded-2xl border border-border bg-card/60"></div>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(4) as _, i (i)}
        <div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>
      {/each}
    </div>
    <div class="h-64 w-full animate-pulse rounded-2xl border border-border bg-card/60"></div>
  </div>
{/if}
