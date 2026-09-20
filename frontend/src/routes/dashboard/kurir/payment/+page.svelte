<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { resolveHref } from "$lib/utils";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, type Order } from "$lib/stores/shop";
  import { COURIER } from "$lib/logistics";
  import { notify } from "$lib/toast";

  const flow = [
    m.py2t1(),
    "QRIS / digital",
    m.py2t2(),
    "Settlement merchant"
  ];

  /** Rekap tunai COD dari pesanan NYATA pembeli. */
  let orders = $state<Order[]>([]);
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    return unsub;
  });

  const codOrders = $derived(orders.filter((o) => o.payment === "COD"));
  const outstanding = $derived(codOrders.filter((o) => !o.codCollected));
  const collected = $derived(codOrders.filter((o) => o.codCollected));
  const outstandingTotal = $derived(outstanding.reduce((s, o) => s + o.total, 0));
  const collectedTotal = $derived(collected.reduce((s, o) => s + o.total, 0));
  const progressPct = $derived(codOrders.length ? Math.round((collected.length / codOrders.length) * 100) : 0);

  const digitalOrders = $derived(orders.filter((o) => o.payment === "Transfer"));

  function collect(o: Order) {
    shop.collectCod(o.id, COURIER.actor);
    notify({ message: `Tunai ${o.id} (${formatRupiah(o.total)}) diterima`, type: "success", title: "Pembayaran COD" });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.kpy01()}</h1>
    <span class="hub-label text-muted-foreground">{m.kpy02()}</span>
  </div>

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-[15px] text-muted-foreground">
    <span class="font-medium text-foreground">{m.kpy03()}</span> {m.kpy19()}
  </div>

  <!-- Rekap tunai COD nyata -->
  <section class="grid gap-4 sm:grid-cols-3">
    <div class="rounded-2xl border border-warning/40 bg-warning/5 p-5">
      <p class="text-xs font-semibold text-warning-foreground">{m.kpy04()}</p>
      <p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatRupiah(outstandingTotal)}</p>
      <p class="mt-0.5 text-xs text-muted-foreground">{m.kpy22({ count: outstanding.length })}</p>
    </div>
    <div class="rounded-2xl border border-success/40 bg-success/5 p-5">
      <p class="text-xs font-semibold text-success-foreground">{m.kpy05()}</p>
      <p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatRupiah(collectedTotal)}</p>
      <p class="mt-0.5 text-xs text-muted-foreground">{m.kpy22({ count: collected.length })}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-semibold text-muted-foreground">{m.kpy06()}</p>
      <p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{progressPct}%</p>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct} aria-label={m.kpy21()}>
        <div class="h-full rounded-full bg-[var(--primary)]" style="width:{progressPct}%"></div>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">{m.kpy20({ count: digitalOrders.length })}</p>
    </div>
  </section>

  <!-- Daftar tagihan tunai -->
  <section class="rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p class="text-base font-semibold">{m.kpy07()}</p>
        <p class="text-[13.5px] text-muted-foreground">{m.kpy08()}</p>
      </div>
      <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">{m.kpy09()}</a>
    </div>
    {#if codOrders.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p class="text-sm font-semibold text-foreground">{m.kpy10()}</p>
        <p class="mt-1 text-xs text-muted-foreground">{m.kpy11()}</p>
      </div>
    {:else}
      <ul class="mt-4 space-y-2">
        {#each codOrders as o (o.id)}
          <li class="flex flex-wrap items-center gap-3 rounded-xl border border-border {o.codCollected ? 'bg-success/5' : 'bg-muted/20'} px-4 py-3">
            <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city}</span>
            <span class="text-sm font-semibold tabular-nums text-foreground">{formatRupiah(o.total)}</span>
            {#if o.codCollected}
              <span class="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground"><Icon name="check" cls="h-3 w-3" weight="bold" /> {m.kpy12()}</span>
            {:else}
              <button type="button" onclick={() => collect(o)} class="rounded-lg border border-success/50 px-3 py-1.5 text-xs font-semibold text-success-foreground transition-colors hover:bg-success/10">{m.kpy13()}</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-2 text-xs font-semibold text-destructive-foreground">{m.kpy14()}</p>
      <p class="text-sm leading-relaxed text-muted-foreground">
        {m.kpy15()}
      </p>
    </div>
    <div class="rounded-2xl border border-chart-2 bg-card p-5">
      <p class="mb-2 text-xs font-semibold text-chart-2">{m.kpy16()}</p>
      <p class="text-sm leading-relaxed text-muted-foreground">
        {m.kpy17()}
      </p>
    </div>
  </div>

  <div class="rounded-2xl border border-border bg-card p-5">
    <p class="mb-3 text-sm font-medium">{m.kpy18()}</p>
    <div class="flex flex-wrap items-center gap-2">
      {#each flow as s, i (s)}
        <div class="flex items-center gap-2">
          <span class="rounded-md bg-muted px-3 py-1.5 text-sm">{s}</span>
          {#if i < flow.length - 1}
            <span class="text-muted-foreground">→</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
