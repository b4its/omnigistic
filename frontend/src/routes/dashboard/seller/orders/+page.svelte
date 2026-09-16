<script lang="ts">
  import { onMount } from "svelte";
  import type { IconName } from "$lib/icon-names";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import { SELLER_PRODUCTS } from "$lib/shop/seller";
  import { shop, ORDER_STATUS_LABEL, type Order } from "$lib/stores/shop";
  import { COD_DECISION_LABEL } from "$lib/logistics";

  const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  const ownedIds = new Set(SELLER_PRODUCTS.map((sp) => sp.product.id));

  let orders = $state<Order[]>([]);
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    return unsub;
  });

  // Pesanan yang memuat minimal satu produk milik penjual ini.
  const myOrders = $derived(
    orders
      .map((o) => ({ order: o, items: o.items.filter((it) => ownedIds.has(it.productId)) }))
      .filter((x) => x.items.length > 0)
  );

  const revenue = $derived(myOrders.reduce((s, x) => s + x.items.reduce((t, it) => t + it.price * it.qty, 0), 0));
  const codOrders = $derived(myOrders.filter((x) => x.order.payment === "COD").length);

  const statusTone: Record<string, string> = {
    dikemas: "bg-muted text-muted-foreground",
    dijemput: "bg-primary/10 text-primary",
    transit: "bg-primary/10 text-primary",
    dikirim: "bg-warning/15 text-warning-foreground",
    terkirim: "bg-success/15 text-success-foreground"
  };
</script>

<div class="space-y-6">
  <header class="space-y-1">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Pesanan Masuk</h1>
    <p class="text-sm text-muted-foreground">Pesanan yang memuat produkmu, dari pemesanan hingga sampai ke pembeli.</p>
  </header>

  <section class="grid gap-4 sm:grid-cols-3">
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Pesanan produk saya</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{myOrders.length}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Nilai penjualan</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-success-foreground">{rupiah(revenue)}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Pesanan COD</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{codOrders}</p>
    </div>
  </section>

  {#if myOrders.length === 0}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="globe" cls="h-7 w-7" /></span>
      <p class="mt-4 text-base font-semibold text-foreground">Belum ada pesanan masuk</p>
      <p class="mt-1 text-sm text-muted-foreground">Pesanan dari pembeli (portal Customer) yang memuat produkmu akan tampil di sini.</p>
      <a href={resolveHref("/dashboard/seller/products")} class="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px">
        <Icon name="stack" cls="h-4 w-4" /> Lihat produk saya
      </a>
    </div>
  {:else}
    <ul class="space-y-3">
      {#each myOrders as x (x.order.id)}
        <li class="rounded-2xl border border-border bg-card p-5">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div class="flex items-center gap-3">
              <span class="font-mono text-sm font-semibold text-foreground">{x.order.id}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold {statusTone[x.order.status] ?? 'bg-muted text-muted-foreground'}">{ORDER_STATUS_LABEL[x.order.status]}</span>
              <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{x.order.payment}</span>
            </div>
            <span class="text-xs text-muted-foreground">{x.order.address.recipient} · {x.order.address.city}</span>
          </div>
          <ul class="mt-3 space-y-1.5">
            {#each x.items as it (it.productId)}
              <li class="flex items-center gap-3 text-sm">
                <Icon name={it.icon as IconName} cls="h-4.5 w-4.5 text-[var(--bitcoin)]" />
                <span class="min-w-0 flex-1 truncate text-muted-foreground">{it.name} × {it.qty}</span>
                <span class="shrink-0 font-medium tabular-nums text-foreground">{rupiah(it.price * it.qty)}</span>
              </li>
            {/each}
          </ul>
          {#if x.order.payment === "COD" && x.order.codScore !== null}
            <p class="mt-3 text-xs text-muted-foreground">Kesiapan bayar COD pembeli: <span class="font-semibold text-foreground">{(x.order.codScore * 100).toFixed(0)}%</span> ({COD_DECISION_LABEL[x.order.codDecision ?? ""] ?? x.order.codDecision})</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
