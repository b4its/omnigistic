<script lang="ts">
  import { onMount } from "svelte";
  import { api, type FinRow, type RegionSummary, type Hub } from "$lib/api";
  import EChart from "$lib/components/EChart.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { lineChart, barChart } from "$lib/charts/options";
  import { resolveHref } from "$lib/utils";

  const engineLinks = [
    { title: "Network Optimization", desc: "Alihkan overflow hub overload ke hub ber-headroom secara otomatis.", href: "/dashboard/hub/load-balance", icon: "compass" as const },
    { title: "COD Decision Intelligence", desc: "Dampak keputusan COD pada kapasitas kurir per shift.", href: "/dashboard/kurir/cod-intel", icon: "currency" as const },
    { title: "Digital Twin", desc: "Simulasi Direct vs Regional Sponsor per region.", href: "/dashboard/pusat/digital-twin", icon: "grid" as const },
    { title: "Audit Angka", desc: "Telusur & rekonsiliasi setiap angka ke dokumen kasus.", href: "/dashboard/methodology", icon: "shield" as const }
  ];

  let fin = $state<FinRow[]>([]);
  let regions = $state<RegionSummary[]>([]);
  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);

  onMount(async () => {
    try {
      [fin, regions, hubs] = await Promise.all([api.financial(), api.metricRegions(), api.hubs()]);
    } catch {
      fin = [];
      regions = [];
      hubs = [];
    }
    loaded = true;
  });

  const latest = $derived(fin[fin.length - 1]);
  const first = $derived(fin[0]);
  const salesG = $derived(latest && first ? ((latest.netSalesT / first.netSalesT - 1) * 100).toFixed(1) : "0");
  const fulfilG = $derived(latest && first ? ((latest.fulfilmentT / first.fulfilmentT - 1) * 100).toFixed(1) : "0");
  const costSales = $derived(latest ? ((latest.fulfilmentT + latest.shippingT) / latest.netSalesT) * 100 : 0);

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
    <h1 class="font-heading text-xl font-semibold tracking-tight">Executive Dashboard</h1>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Net Sales 2023" value={latest ? `Rp${latest.netSalesT}T` : "-"} delta={`+${salesG}%`} deltaTone="up" sub="vs Rp213,64T (2020)" />
      <MetricCard label="Fulfilment Expense" value={latest ? `Rp${latest.fulfilmentT}T` : "-"} delta={`+${fulfilG}%`} deltaTone="warn" sub="naik lebih cepat dari sales" />
      <MetricCard label="Cost-to-Sales Ratio" value={`${costSales.toFixed(1)}%`} delta="+0,4pt" deltaTone="warn" sub="dari 30,9% di 2020" />
      <MetricCard label="Utilisasi tertinggi" value={busiestHub ? `${busiestHub.code} ${busiestHub.utilizationPct}%` : "-"} delta={busiestHub ? `${busiestHub.utilizationPct}%` : ""} deltaTone="warn" sub={quietestHub ? `vs ${quietestHub.name} ${quietestHub.utilizationPct}%` : ""} />
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      <section class="rounded-2xl border border-border bg-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-muted-foreground">Total Net Sales vs Fulfilment</h2>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-2xl font-bold tracking-tight text-foreground">Rp{latest.netSalesT}T</span>
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
        <h2 class="text-sm font-semibold text-muted-foreground">Utilisasi per Region</h2>
        <EChart
          option={barChart(
            regUtil.map((r) => r.label),
            [{ name: "Utilisasi", data: regUtil.map((r) => r.value) }]
          )}
          height={230}
        />
        <p class="mt-1 text-[14px] text-muted-foreground">
          Threshold utilisasi 65% = ambang kritis. {highestUtil ? `${highestUtil.region} tertinggi (${highestUtil.avgUtilizationPct}%)` : ""}
          {lowestUtil ? `; ${lowestUtil.region} terendah (${lowestUtil.avgUtilizationPct}%) → kandidat Regional Sponsor.` : ""}
        </p>
      </section>
    </div>

    <section class="rounded-2xl border border-border bg-card p-4">
      <p class="mb-2 text-[13px] uppercase tracking-wider text-muted-foreground">Konteks dari Finance Manager</p>
      <p class="text-[16px] leading-relaxed text-foreground">&ldquo;On the surface, the growth looks very strong&hellip; But I&rsquo;m not sure the numbers tell the whole story.&rdquo;</p>
      <p class="mt-3 text-[13px] italic text-muted-foreground">Kutipan kasus ISCEA 2026</p>
    </section>

    <section class="rounded-2xl border border-border bg-card p-4">
      <p class="mb-3 text-[13px] uppercase tracking-wider text-muted-foreground">Mesin Analitik Omnigistic</p>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each engineLinks as e (e.href)}
          <a href={resolveHref(e.href)} class="group rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name={e.icon} cls="h-4.5 w-4.5" weight="fill" />
            </span>
            <p class="mt-3 text-sm font-semibold text-foreground">{e.title}</p>
            <p class="mt-1 text-[13px] leading-snug text-muted-foreground">{e.desc}</p>
            <span class="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">Buka <Icon name="arrow-up-right" cls="h-3 w-3" weight="bold" /></span>
          </a>
        {/each}
      </div>
    </section>
  </div>
{:else}
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}
    </div>
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  </div>
{/if}