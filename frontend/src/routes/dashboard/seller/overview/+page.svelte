<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref, numId } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { lineChart, donutChart } from "$lib/charts/options";
  import { SELLER } from "$lib/shop/seller";
  import { pnlSummary, productMetrics, avgCustomerScore, segmentCounts, salesTrend, trendTotals, momentumPct } from "$lib/shop/analytics";
  import { shop, type Order } from "$lib/stores/shop";
  import { liveSummary, liveCustomers } from "$lib/shop/orderbook";

  const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  const compact = (n: number) => {
    if (Math.abs(n) >= 1e9) return `Rp${numId(n / 1e9, 2)} M`;
    if (Math.abs(n) >= 1e6) return `Rp${numId(n / 1e6, 1)} jt`;
    if (Math.abs(n) >= 1e3) return `Rp${numId(n / 1e3, 0)} rb`;
    return rupiah(n);
  };

  // Pesanan nyata dari portal Customer (localStorage) → membuat dashboard hidup.
  let live = $state(liveSummary([]));
  let liveRecs = $state(liveCustomers([]));
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s: { orders: Order[] }) => {
      live = liveSummary(s.orders);
      liveRecs = liveCustomers(s.orders);
    });
    return unsub;
  });

  const pnl = pnlSummary();
  const metrics = productMetrics();
  const trend = salesTrend();
  const totals = trendTotals();
  const momentum = momentumPct();
  const segments = $derived(segmentCounts(liveRecs));
  const avgScore = $derived(avgCustomerScore(liveRecs));

  const segmentRows = $derived([
    { name: "Champion", count: segments.Champion, color: "var(--color-chart-1)" },
    { name: "Loyal", count: segments.Loyal, color: "var(--color-chart-2)" },
    { name: "Potensial", count: segments.Potensial, color: "var(--color-chart-3)" },
    { name: "Berisiko", count: segments.Berisiko, color: "var(--color-chart-5)" },
    { name: "Pasif", count: segments.Pasif, color: "var(--color-muted-foreground)" }
  ]);

  const topProfit = $derived(metrics.slice(0, 5));
  const danger = $derived(metrics.filter((m) => m.marginPct < 34 || m.returnRatePct > 3).slice(0, 4));

  const trendChart = $derived(
    lineChart(
      trend.map((d) => d.date.slice(5)),
      [
        { name: "Pendapatan", data: trend.map((d) => d.revenue), color: "var(--color-primary)", area: true },
        { name: "Laba kotor", data: trend.map((d) => d.profit), color: "var(--color-chart-4)" }
      ],
      { rotate: 0 }
    )
  );

  const segmentChart = $derived(
    donutChart([
      { name: "Champion", value: segments.Champion, color: "var(--color-chart-1)" },
      { name: "Loyal", value: segments.Loyal, color: "var(--color-chart-2)" },
      { name: "Potensial", value: segments.Potensial, color: "var(--color-chart-3)" },
      { name: "Berisiko", value: segments.Berisiko, color: "var(--color-chart-5)" },
      { name: "Pasif", value: segments.Pasif, color: "var(--color-muted-foreground)" }
    ])
  );

  const topProfitChart = $derived(
    lineChart(
      topProfit.map((m) => m.sp.product.name.length > 16 ? m.sp.product.name.slice(0, 15) + "…" : m.sp.product.name),
      [{ name: "Laba kotor", data: topProfit.map((m) => m.grossProfit), color: "var(--color-chart-2)", area: true }]
    )
  );

  const kpis = $derived([
    { label: "Pendapatan 30 hari", value: compact(pnl.revenue), sub: `${pnl.orders} pesanan`, accent: "var(--color-primary)" },
    { label: "Laba kotor", value: compact(pnl.grossProfit), sub: `margin ${pnl.grossMarginPct}%`, accent: "var(--color-chart-2)" },
    { label: "Laba bersih", value: compact(pnl.netProfit), sub: `setelah retur · ${pnl.netMarginPct}%`, accent: pnl.netProfit >= 0 ? "var(--color-success)" : "var(--color-destructive)" },
    { label: "Rata-rata nilai pesanan", value: compact(pnl.avgOrderValue), sub: `${pnl.unitsSold} unit terjual`, accent: "var(--color-chart-4)" }
  ]);
</script>

<div class="space-y-6">
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Analitik Penjualan</h1>
      <p class="text-sm text-muted-foreground">{SELLER.store} · {SELLER.city} · ★ {SELLER.rating}</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <a href={resolveHref("/dashboard/seller/products")} class="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
        <Icon name="stack" cls="h-4 w-4" /> Produk
      </a>
      <a href={resolveHref("/dashboard/seller/customers")} class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-px">
        <Icon name="users" cls="h-4 w-4" /> Pelanggan
      </a>
    </div>
  </header>

  <!-- KPI -->
  <section class="space-y-2">
    <p class="text-[11px] text-muted-foreground">Ringkasan katalog (estimasi 30 hari, data studi kasus) · pesanan nyata pembeli tertera pada bagian “Pesanan masuk (live)”.</p>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each kpis as k (k.label)}
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-medium text-muted-foreground">{k.label}</p>
          <p class="mt-2 text-2xl font-bold tabular-nums" style="color:{k.accent}">{k.value}</p>
          <p class="mt-1 text-xs text-muted-foreground">{k.sub}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Pesanan masuk (live dari portal Customer) -->
  <section class="rounded-2xl border border-primary/30 bg-primary/5 p-5">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon name="globe" cls="h-4 w-4 text-primary" /> Pesanan masuk (live)
      </h2>
      <a href={resolveHref("/dashboard/seller/orders")} class="text-xs font-semibold text-primary hover:underline">Lihat semua →</a>
    </div>
    {#if live.orderCount === 0}
      <p class="text-sm text-muted-foreground">Belum ada pesanan dari pembeli. Buat pesanan di portal Customer untuk melihatnya masuk ke sini secara langsung.</p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-4">
        <div><p class="text-xs text-muted-foreground">Pesanan</p><p class="text-xl font-bold tabular-nums text-foreground">{live.orderCount}</p><p class="text-[11px] text-muted-foreground">{live.activeCount} aktif · {live.deliveredCount} terkirim</p></div>
        <div><p class="text-xs text-muted-foreground">Nilai penjualan</p><p class="text-xl font-bold tabular-nums text-success-foreground">{compact(live.revenue)}</p></div>
        <div><p class="text-xs text-muted-foreground">Laba kotor</p><p class="text-xl font-bold tabular-nums text-foreground">{compact(live.profit)}</p></div>
        <div><p class="text-xs text-muted-foreground">COD vs digital</p><p class="text-sm font-semibold tabular-nums text-foreground">{compact(live.codRevenue)} · {compact(live.digitalRevenue)}</p></div>
      </div>
    {/if}
  </section>

  <!-- Laba/rugi + tren -->
  <section class="grid gap-5 lg:grid-cols-[1fr_320px]">
    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-foreground">Tren 14 hari — pendapatan &amp; laba</h2>
        <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold {momentum >= 0 ? 'bg-success/15 text-success-foreground' : 'bg-destructive/15 text-destructive-foreground'}">
          <Icon name={momentum >= 0 ? "trend" : "warn"} cls="h-3.5 w-3.5" /> {momentum >= 0 ? "+" : ""}{momentum}% momentum
        </span>
      </div>
      <p class="mb-2 text-[11px] text-muted-foreground">Estimasi katalog (bukan pesanan live) — lihat bagian “Pesanan masuk (live)” di atas untuk angka nyata.</p>
      <EChart option={trendChart} height={250} label="Grafik tren pendapatan dan laba 14 hari" />
      <div class="mt-3 grid grid-cols-3 gap-3 text-center">
        <div><p class="text-xs text-muted-foreground">Pendapatan</p><p class="text-sm font-semibold tabular-nums text-foreground">{compact(totals.revenue)}</p></div>
        <div><p class="text-xs text-muted-foreground">Laba kotor</p><p class="text-sm font-semibold tabular-nums text-foreground">{compact(totals.profit)}</p></div>
        <div><p class="text-xs text-muted-foreground">Pesanan</p><p class="text-sm font-semibold tabular-nums text-foreground">{totals.orders}</p></div>
      </div>
    </div>

    <!-- Ringkasan P&L -->
    <div class="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 class="text-sm font-semibold text-foreground">Laba / rugi (30 hari)</h2>
      <dl class="space-y-2 text-sm">
        <div class="flex justify-between"><dt class="text-muted-foreground">Pendapatan</dt><dd class="font-medium tabular-nums text-foreground">{rupiah(pnl.revenue)}</dd></div>
        <div class="flex justify-between"><dt class="text-muted-foreground">HPP</dt><dd class="font-medium tabular-nums text-destructive-foreground">−{rupiah(pnl.cogs)}</dd></div>
        <div class="flex justify-between border-t border-border pt-2"><dt class="font-semibold text-foreground">Laba kotor</dt><dd class="font-semibold tabular-nums text-foreground">{rupiah(pnl.grossProfit)}</dd></div>
        <div class="flex justify-between"><dt class="text-muted-foreground">Biaya retur</dt><dd class="font-medium tabular-nums text-destructive-foreground">−{rupiah(pnl.returnsCost)}</dd></div>
        <div class="flex justify-between border-t border-border pt-2"><dt class="font-semibold text-foreground">Laba bersih</dt><dd class="font-bold tabular-nums {pnl.netProfit >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{rupiah(pnl.netProfit)}</dd></div>
        <div class="flex justify-between text-xs"><dt class="text-muted-foreground">Margin kotor</dt><dd class="font-semibold text-foreground">{pnl.grossMarginPct}%</dd></div>
        <div class="flex justify-between text-xs"><dt class="text-muted-foreground">Margin bersih</dt><dd class="font-semibold text-foreground">{pnl.netMarginPct}%</dd></div>
      </dl>
    </div>
  </section>

  <!-- Produk terlaris + pelanggan -->
  <section class="grid gap-5 lg:grid-cols-2">
    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-foreground">Produk penyumbang laba</h2>
        <a href={resolveHref("/dashboard/seller/products")} class="text-xs font-semibold text-primary hover:underline">Semua produk</a>
      </div>
      <EChart option={topProfitChart} height={220} label="Grafik laba kotor per produk" />
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-foreground">Segmen pelanggan</h2>
        <span class="text-xs text-muted-foreground">rata-rata skor <span class="font-bold text-foreground">{avgScore}</span>/100</span>
      </div>
      <div class="flex flex-col items-center gap-4 sm:flex-row">
        <EChart option={segmentChart} height={200} class="w-full sm:w-1/2" label="Donat segmen pelanggan" />
        <ul class="w-full space-y-1.5 text-sm sm:w-1/2">
          {#each segmentRows as row (row.name)}
            <li class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full" style="background:{row.color}"></span>
              <span class="flex-1 text-muted-foreground">{row.name}</span>
              <span class="font-semibold tabular-nums text-foreground">{row.count}</span>
            </li>
          {/each}
        </ul>
      </div>
      <a href={resolveHref("/dashboard/seller/customers")} class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
        Lihat analisis pelanggan <Icon name="arrow-up-right" cls="h-3.5 w-3.5" />
      </a>
    </div>
  </section>

  <!-- Perlu perhatian -->
  {#if danger.length > 0}
    <section class="rounded-2xl border border-warning/40 bg-warning/5 p-5">
      <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon name="warn" cls="h-4 w-4 text-warning-foreground" /> Perlu perhatian</h2>
      <ul class="mt-3 grid gap-2 sm:grid-cols-2">
        {#each danger as m (m.sp.product.id)}
          <li class="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <span class="min-w-0 truncate text-foreground">{m.sp.product.emoji} {m.sp.product.name}</span>
            <span class="shrink-0 text-xs font-semibold {m.marginPct < 34 ? 'text-destructive-foreground' : 'text-warning-foreground'}">
              {m.marginPct < 34 ? `margin ${m.marginPct}%` : `retur ${m.returnRatePct}%`}
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
