<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type FinRow, type Insights } from "$lib/api";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import { lineChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";
  import RoleHubLinks from "$lib/components/RoleHubLinks.svelte";

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
            { label: "Net Sales", value: `Rp${latest.netSalesT} ${m.ro4t2()}`, sub: `+${salesG}% vs 2020`, spark: fin.map((f) => f.netSalesT) },
            { label: "Fulfilment Expense", value: `Rp${latest.fulfilmentT} ${m.ro4t2()}`, sub: `+${fulfilG}% vs 2020`, accent: "var(--color-destructive-foreground)", spark: fin.map((f) => f.fulfilmentT) },
            { label: "Cost-to-Sales", value: `${numId(ratio, 1)}%`, sub: "fulfilment+shipping / sales" },
            // Angka kasus (bukan turunan JSON) → label sumber agar tak tampak "live".
            { label: "Market Share", value: "20,6%", sub: m.po2t1() }
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
  <PageState loading={!loaded && !failed} error={failed} errorTitle={m.po2t2()} onretry={load} />
{/if}

<RoleHubLinks
  links={[
    { label: "Executive Dashboard", href: "/dashboard/pusat/executive", icon: "grid", desc: m.hbp01() },
    { label: "Digital Twin", href: "/dashboard/pusat/digital-twin", icon: "compass", desc: m.hbp02() },
    { label: "Utilization Map", href: "/dashboard/pusat/utilization", icon: "chart", desc: m.hbp03() },
    { label: "Network Expansion", href: "/dashboard/pusat/network", icon: "stack", desc: m.hbp04() },
    { label: "Market-Expansion ROI", href: "/dashboard/pusat/expansion", icon: "target", desc: m.hbp05() },
    { label: "EV Fleet BCA", href: "/dashboard/pusat/ev-bca", icon: "chart", desc: m.hbp06() },
    { label: "ROI & BCA", href: "/dashboard/pusat/roi", icon: "currency", desc: m.hbp07() },
    { label: "Cost-Waterfall P&L", href: "/dashboard/pusat/pnl", icon: "coins", desc: m.hbp08() },
    { label: "Nigi AI", href: "/dashboard/pusat/assistant", icon: "chat", desc: m.hbp09() }
  ]}
/>
