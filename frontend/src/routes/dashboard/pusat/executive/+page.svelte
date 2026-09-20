<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type FinRow, type RegionSummary, type Hub } from "$lib/api";
  import EChart from "$lib/components/EChart.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import { lineChart, barChart } from "$lib/charts/options";
  import { resolveHref, numId } from "$lib/utils";

  const engineLinks = [
    { title: "Network Optimization", desc: m.ex2t1(), href: "/dashboard/hub/load-balance", icon: "compass" as const },
    { title: "COD Decision Intelligence", desc: m.ex2t2(), href: "/dashboard/kurir/cod-intel", icon: "currency" as const },
    { title: "Digital Twin", desc: m.ex2t3(), href: "/dashboard/pusat/digital-twin", icon: "grid" as const },
    { title: "Audit Angka", desc: m.ex2t4(), href: "/dashboard/methodology", icon: "shield" as const }
  ];

  let fin = $state<FinRow[]>([]);
  let regions = $state<RegionSummary[]>([]);
  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load() {
    failed = false;
    loaded = false;
    try {
      [fin, regions, hubs] = await Promise.all([api.financial(), api.metricRegions(), api.hubs()]);
    } catch {
      fin = [];
      regions = [];
      hubs = [];
      failed = true;
    }
    loaded = true;
  }

  onMount(() => void load());

  const latest = $derived(fin[fin.length - 1]);
  const first = $derived(fin[0]);
  const salesG = $derived(latest && first ? numId((latest.netSalesT / first.netSalesT - 1) * 100, 1) : "0");
  const fulfilG = $derived(latest && first ? numId((latest.fulfilmentT / first.fulfilmentT - 1) * 100, 1) : "0");
  const costSales = $derived(latest ? ((latest.fulfilmentT + latest.shippingT) / latest.netSalesT) * 100 : 0);
  // Rasio biaya-thd-sales tahun pertama (2020) → delta dihitung, bukan hardcode.
  const costSalesFirst = $derived(first ? ((first.fulfilmentT + first.shippingT) / first.netSalesT) * 100 : 0);
  const costSalesDeltaPt = $derived(costSales - costSalesFirst);

  // Utilisasi per region dari SATU sumber kebenaran (/ml/metrics/regions), bukan hardcode.
  const regUtil = $derived(
    regions.map((r) => ({
      label: r.region.replace(" & Nusa Tenggara", "").replace("Maluku & ", ""),
      value: r.avgUtilizationPct
    }))
  );
  const highestUtil = $derived(regions.length ? regions.reduce((a, b) => (b.avgUtilizationPct > a.avgUtilizationPct ? b : a)) : null);
  const lowestUtil = $derived(regions.length ? regions.reduce((a, b) => (b.avgUtilizationPct < a.avgUtilizationPct ? b : a)) : null);
  // Hub paling padat & paling longgar langsung dari Table 1 (via /api/hubs).
  const busiestHub = $derived(hubs.length ? hubs.reduce((a, b) => (b.utilizationPct > a.utilizationPct ? b : a)) : null);
  const quietestHub = $derived(hubs.length ? hubs.reduce((a, b) => (b.utilizationPct < a.utilizationPct ? b : a)) : null);

  const finData = $derived(
    fin.map((f) => ({ y: String(f.year), s: f.netSalesT, f: f.fulfilmentT }))
  );
</script>

{#if loaded && fin.length}
  <div class="space-y-6">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.pe01()}</h1>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Net Sales 2023" value={latest ? `Rp${latest.netSalesT} triliun` : "-"} delta={`+${salesG}%`} deltaTone="up" sub="dibanding Rp213,64 triliun (2020)" />
      <MetricCard label="Fulfilment Expense" value={latest ? `Rp${latest.fulfilmentT} triliun` : "-"} delta={`+${fulfilG}%`} deltaTone="warn" sub={m.ee2t1()} />
      <MetricCard label="Cost-to-Sales Ratio" value={`${numId(costSales, 1)}%`} delta={m.ee3t1({ sign: costSalesDeltaPt >= 0 ? "+" : "", v: numId(costSalesDeltaPt, 1) })} deltaTone={costSalesDeltaPt >= 0 ? "warn" : "up"} sub={m.ee3t2({ pct: numId(costSalesFirst, 1) })} />
      <MetricCard label={m.ex2t5()} value={busiestHub ? `${busiestHub.code} ${busiestHub.utilizationPct}%` : "-"} delta={busiestHub ? `${busiestHub.utilizationPct}%` : ""} deltaTone="warn" sub={quietestHub ? `vs ${quietestHub.name} ${quietestHub.utilizationPct}%` : ""} />
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      <section class="rounded-2xl border border-border bg-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-muted-foreground">{m.pe02()}</h2>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-foreground">Rp{latest.netSalesT} triliun</span>
              <span class="rounded-md bg-success px-1.5 py-0.5 text-[13px] font-bold text-success-foreground">+{salesG}%</span>
            </div>
          </div>
        </div>
        <EChart
          option={lineChart(
            finData.map((d) => d.y),
            [
              { name: "NetSales", data: finData.map((d) => d.s), color: "var(--color-primary)", area: true },
              { name: "Fulfilment", data: finData.map((d) => d.f), color: "var(--color-chart-5)" }
            ]
          )}
          height={230}
        />
      </section>

      <section class="rounded-2xl border border-border bg-card p-4">
        <h2 class="text-sm font-semibold text-muted-foreground">{m.pe03()}</h2>
        <EChart
          option={barChart(
            regUtil.map((r) => r.label),
            [{ name: m.ex2t6(), data: regUtil.map((r) => r.value) }]
          )}
          height={230}
        />
        <p class="mt-1 text-[14px] text-muted-foreground">
          {m.ee3f1()} {highestUtil ? `${highestUtil.region} tertinggi (${highestUtil.avgUtilizationPct}%)` : ""}
          {lowestUtil ? `; ${lowestUtil.region} terendah (${lowestUtil.avgUtilizationPct}%) → kandidat Regional Sponsor.` : ""}
        </p>
      </section>
    </div>

    <section class="rounded-2xl border border-border bg-card p-4">
      <p class="mb-2 text-[13px] uppercase tracking-wider text-muted-foreground">{m.pe04()}</p>
      <p class="text-[16px] leading-relaxed text-foreground">{m.pe05()}</p>
      <p class="mt-3 text-[13px] italic text-muted-foreground">{m.pe06()}</p>
    </section>

    <section class="rounded-2xl border border-border bg-card p-4">
      <p class="mb-3 text-[13px] uppercase tracking-wider text-muted-foreground">{m.pe07()}</p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each engineLinks as e (e.href)}
          <a href={resolveHref(e.href)} class="group rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name={e.icon} cls="h-4.5 w-4.5" weight="fill" />
            </span>
            <p class="mt-3 text-sm font-semibold text-foreground">{e.title}</p>
            <p class="mt-1 text-[13px] leading-snug text-muted-foreground">{e.desc}</p>
            <span class="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">{m.pe08()} <Icon name="arrow-up-right" cls="h-3 w-3" weight="bold" /></span>
          </a>
        {/each}
      </div>
    </section>
  </div>
{:else}
  <div class="space-y-6">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.pe09()}</h1>
    <PageState loading={!loaded && !failed} error={failed} errorTitle={m.ex2t7()} onretry={load} />
  </div>
{/if}