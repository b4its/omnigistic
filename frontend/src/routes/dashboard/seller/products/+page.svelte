<script lang="ts">
  import { m as msg } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { productName } from "$lib/shop/catalog";
  import Icon from "$lib/components/Icon.svelte";
  import { productMetrics } from "$lib/shop/analytics";
  import { shop, type Order } from "$lib/stores/shop";
  import { notify } from "$lib/toast";

  const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  const metrics = productMetrics();
  let sortKey = $state<"profit" | "margin" | "revenue" | "return">("profit");

  function setSortKey(k: typeof sortKey) {
    sortKey = k;
    const label: Record<typeof k, string> = { profit: "Laba kotor", margin: "Margin (%)", revenue: "Pendapatan", return: "Retur (%)" };
    notify({ message: `Urutkan produk: ${label[k]}`, type: "info", title: "Produk" });
  }

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
      <h1 class="font-heading text-xl font-semibold tracking-tight">{msg.sp01()}</h1>
      <p class="text-sm text-muted-foreground">{msg.sp02()}</p>
    </div>
    <label class="flex items-center gap-2 text-sm text-muted-foreground">
      <span class="shrink-0">{msg.sp03()}</span>
      <select value={sortKey} onchange={(e) => setSortKey((e.currentTarget as HTMLSelectElement).value as typeof sortKey)} aria-label={msg.ax13()} class="rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50">
        <option value="profit">{msg.sp04()}</option>
        <option value="margin">{msg.sp05()}</option>
        <option value="revenue">{msg.sp06()}</option>
        <option value="return">{msg.sp07()}</option>
      </select>
    </label>
  </header>

  <section class="grid gap-4 sm:grid-cols-3">
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">{msg.sp08()}</p>
      <p class="mt-2 text-xl font-bold tabular-nums text-foreground">{rupiah(totals.revenue)}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">{msg.sp09()}</p>
      <p class="mt-2 text-xl font-bold tabular-nums text-success-foreground">{rupiah(totals.profit)}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">{msg.sp10()}</p>
      <p class="mt-2 text-xl font-bold tabular-nums text-foreground">{rupiah(totals.stock)}</p>
    </div>
  </section>

  <!-- Tabel -->
  <div class="overflow-x-auto rounded-2xl border border-border bg-card">
    <table class="w-full min-w-[820px] text-sm">
      <caption class="sr-only">{msg.sp11()}</caption>
      <thead>
        <tr class="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
          <th scope="col" class="px-4 py-3">{msg.sp12()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp13()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp14()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp15()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp16()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp17()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp18()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp19()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp20()}</th>
          <th scope="col" class="px-3 py-3 text-right">{msg.sp21()}</th>
        </tr>
      </thead>
      <tbody>
        {#each sorted as m (m.sp.product.id)}
          <tr class="border-b border-border last:border-0">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <Icon name={m.sp.product.icon} cls="h-5 w-5" style="color:{m.sp.product.accent}" />
                <div class="min-w-0">
                  <p class="truncate font-medium text-foreground">{productName(m.sp.product.id, m.sp.product.name)}</p>
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
    {msg.sp22()}
  </p>

  <p class="text-[11px] text-muted-foreground">
    {msg.sp23()} <span class="font-semibold text-foreground">{msg.sp24()}</span> {msg.sp25()} <span class="font-semibold text-primary">{msg.sp26()}</span> {msg.sp27({ total: liveTotalSold })}
  </p>
</div>
