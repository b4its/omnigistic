<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { productMetrics } from "$lib/shop/analytics";
  import { shop, type Order } from "$lib/stores/shop";

  const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  const metrics = productMetrics();
  let sortKey = $state<"profit" | "margin" | "revenue" | "return">("profit");

  /** Pesanan nyata → qty terjual per produk (live). */
  let orders = $state<Order[]>([]);
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    return unsub;
  });
  const liveSold = $derived.by(() => {
    const m: Record<string, number> = {};
    for (const o of orders) for (const it of o.items) m[it.productId] = (m[it.productId] ?? 0) + it.qty;
    return m;
  });
  const liveTotalSold = $derived(Object.values(liveSold).reduce((s, n) => s + n, 0));

  const sorted = $derived.by(() => {
    const rows = [...metrics];
    switch (sortKey) {
      case "margin":
        rows.sort((a, b) => b.marginPct - a.marginPct);
        break;
      case "revenue":
        rows.sort((a, b) => b.revenue - a.revenue);
        break;
      case "return":
        rows.sort((a, b) => b.returnRatePct - a.returnRatePct);
        break;
      default:
        rows.sort((a, b) => b.grossProfit - a.grossProfit);
    }
    return rows;
  });

  const totals = $derived({
    revenue: metrics.reduce((s, m) => s + m.revenue, 0),
    profit: metrics.reduce((s, m) => s + m.grossProfit, 0),
    stock: metrics.reduce((s, m) => s + m.stockValue, 0)
  });
</script>

<div class="space-y-6">
  <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Produk Saya</h1>
      <p class="text-sm text-muted-foreground">Analisis keuntungan &amp; kerugian per produk (30 hari terakhir).</p>
    </div>
    <label class="flex items-center gap-2 text-sm text-muted-foreground">
      <span class="shrink-0">Urutkan</span>
      <select bind:value={sortKey} aria-label="Urutkan produk" class="rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50">
        <option value="profit">Laba kotor</option>
        <option value="margin">Margin (%)</option>
        <option value="revenue">Pendapatan</option>
        <option value="return">Retur (%)</option>
      </select>
    </label>
  </header>

  <section class="grid gap-4 sm:grid-cols-3">
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Total pendapatan</p>
      <p class="mt-2 text-xl font-bold tabular-nums text-foreground">{rupiah(totals.revenue)}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Total laba kotor</p>
      <p class="mt-2 text-xl font-bold tabular-nums text-success-foreground">{rupiah(totals.profit)}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Nilai stok</p>
      <p class="mt-2 text-xl font-bold tabular-nums text-foreground">{rupiah(totals.stock)}</p>
    </div>
  </section>

  <!-- Tabel -->
  <div class="overflow-x-auto rounded-2xl border border-border bg-card">
    <table class="w-full min-w-[820px] text-sm">
      <caption class="sr-only">Analitik laba rugi per produk</caption>
      <thead>
        <tr class="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
          <th scope="col" class="px-4 py-3">Produk</th>
          <th scope="col" class="px-3 py-3 text-right">Harga</th>
          <th scope="col" class="px-3 py-3 text-right">HPP</th>
          <th scope="col" class="px-3 py-3 text-right">Terjual</th>
          <th scope="col" class="px-3 py-3 text-right">Terjual (live)</th>
          <th scope="col" class="px-3 py-3 text-right">Pendapatan</th>
          <th scope="col" class="px-3 py-3 text-right">Laba kotor</th>
          <th scope="col" class="px-3 py-3 text-right">Margin</th>
          <th scope="col" class="px-3 py-3 text-right">Retur</th>
          <th scope="col" class="px-3 py-3 text-right">Stok</th>
        </tr>
      </thead>
      <tbody>
        {#each sorted as m (m.sp.product.id)}
          <tr class="border-b border-border last:border-0">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <span class="text-lg" aria-hidden="true">{m.sp.product.emoji}</span>
                <div class="min-w-0">
                  <p class="truncate font-medium text-foreground">{m.sp.product.name}</p>
                  <p class="text-xs text-muted-foreground">{m.sp.product.category} · {m.sp.product.store}</p>
                </div>
              </div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums text-foreground">{rupiah(m.sp.product.price)}</td>
            <td class="px-3 py-3 text-right tabular-nums text-muted-foreground">{rupiah(m.sp.cost)}</td>
            <td class="px-3 py-3 text-right tabular-nums text-foreground">{m.sp.sold30}</td>
            <td class="px-3 py-3 text-right tabular-nums {liveSold[m.sp.product.id] ? 'font-semibold text-primary' : 'text-muted-foreground'}">{liveSold[m.sp.product.id] ?? 0}</td>
            <td class="px-3 py-3 text-right tabular-nums text-foreground">{rupiah(m.revenue)}</td>
            <td class="px-3 py-3 text-right tabular-nums font-semibold text-foreground">{rupiah(m.grossProfit)}</td>
            <td class="px-3 py-3 text-right">
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold {m.marginPct >= 38 ? 'bg-success/15 text-success-foreground' : m.marginPct >= 30 ? 'bg-warning/15 text-warning-foreground' : 'bg-destructive/15 text-destructive-foreground'}">{m.marginPct}%</span>
            </td>
            <td class="px-3 py-3 text-right tabular-nums {m.returnRatePct > 3 ? 'font-semibold text-destructive-foreground' : 'text-muted-foreground'}">{m.returnRatePct}%</td>
            <td class="px-3 py-3 text-right tabular-nums text-foreground">{m.sp.stock}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <p class="flex items-start gap-2 text-xs text-muted-foreground">
    <Icon name="warn" cls="h-4 w-4 mt-0.5 shrink-0 text-warning-foreground" />
    Margin tipis (&lt;34%) atau retur tinggi (&gt;3%) ditandai. Pertimbangkan penyesuaian harga, bundling, atau mengarahkan pembeli COD berisiko ke titik PUDO.
  </p>

  <p class="text-[11px] text-muted-foreground">
    Kolom <span class="font-semibold text-foreground">Terjual</span> = estimasi katalog 30 hari (studi kasus). Kolom <span class="font-semibold text-primary">Terjual (live)</span> = unit dari pesanan nyata pembeli ({liveTotalSold} unit total saat ini).
  </p>
</div>
