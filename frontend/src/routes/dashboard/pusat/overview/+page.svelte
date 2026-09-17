<script lang="ts">
  import { onMount } from "svelte";
  import { api, type FinRow, type Insights } from "$lib/api";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import { lineChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let fin = $state<FinRow[]>([]);
  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load() {
    loaded = false;
    failed = false;
    try {
      fin = await api.financial();
    } catch {
      fin = [];
      failed = true;
    }
    try {
      const ins = await api.insights("PUSAT");
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* insights opsional */
    }
    loaded = true;
  }

  onMount(() => void load());

  const kpi = $derived(
    fin.length
      ? (() => {
          const latest = fin[fin.length - 1];
          const first = fin[0];
          // Guard pembagian nol (jaga-jaga bila backend mengirim nilai 0).
          const pct = (a: number, b: number) => (b ? (a / b - 1) * 100 : 0);
          const salesG = numId(pct(latest.netSalesT, first.netSalesT), 1);
          const fulfilG = numId(pct(latest.fulfilmentT, first.fulfilmentT), 1);
          const ratio = latest.netSalesT ? ((latest.fulfilmentT + latest.shippingT) / latest.netSalesT) * 100 : 0;
          return [
            { label: "Net Sales", value: `Rp${latest.netSalesT}T`, sub: `+${salesG}% vs 2020`, spark: fin.map((f) => f.netSalesT) },
            { label: "Fulfilment Expense", value: `Rp${latest.fulfilmentT}T`, sub: `+${fulfilG}% vs 2020`, accent: "var(--color-destructive-foreground)", spark: fin.map((f) => f.fulfilmentT) },
            { label: "Cost-to-Sales", value: `${numId(ratio, 1)}%`, sub: "fulfilment+shipping / sales" },
            // Angka kasus (bukan turunan JSON) → label sumber agar tak tampak "live".
            { label: "Market Share", value: "20,6%", sub: "pemimpin 5 tahun (angka kasus)" }
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

{#if loaded && fin.length}
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
  <PageState loading={!loaded && !failed} error={failed} errorTitle="Gagal memuat ringkasan pusat" onretry={load} />
{/if}
