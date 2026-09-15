<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import DeliveryMap from "$lib/map/DeliveryMap.svelte";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, type Order, type OrderStatus } from "$lib/stores/shop";
  import { ROUTE_DISTANCE_KM } from "$lib/map/route";

  let orders = $state<Order[]>([]);
  let openMapId = $state<string | null>(null);

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    return unsub;
  });

  const statusIndex = (s: OrderStatus) => ORDER_STATUS_FLOW.indexOf(s);

  /** Fraksi perjalanan kurir (0..1) diturunkan dari status pengantaran. */
  function progressFor(status: OrderStatus): number {
    switch (status) {
      case "dikemas":
        return 0;
      case "dijemput":
        return 0.15;
      case "transit":
        return 0.45;
      case "dikirim":
        return 0.75;
      case "terkirim":
        return 1;
      default:
        return 0;
    }
  }

  const decisionTone: Record<string, string> = {
    "antar-normal": "bg-success/15 text-success-foreground",
    pudo: "bg-warning/15 text-warning-foreground",
    "pre-payment": "bg-destructive/15 text-destructive-foreground"
  };

  function advance(o: Order) {
    shop.advanceStatus(o.id);
    const flow = ORDER_STATUS_FLOW;
    const nextStatus = flow[Math.min(flow.indexOf(o.status) + 1, flow.length - 1)];
    window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: `Pesanan ${o.id} → ${ORDER_STATUS_LABEL[nextStatus]}` }));
  }

  function clearOrders() {
    shop.reset();
    window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: "Riwayat pesanan dihapus" }));
  }
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Pesanan Saya</h1>
      <p class="text-sm text-muted-foreground">Lacak pengantaran dari hub hingga ke tanganmu.</p>
    </div>
    {#if orders.length > 0}
      <button type="button" onclick={clearOrders} class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive-foreground">
        <Icon name="trash" cls="h-3.5 w-3.5" /> Hapus riwayat
      </button>
    {/if}
  </header>

  {#if orders.length === 0}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="map" cls="h-7 w-7" /></span>
      <p class="mt-4 text-base font-semibold text-foreground">Belum ada pesanan</p>
      <p class="mt-1 text-sm text-muted-foreground">Pesanan yang kamu buat akan muncul di sini untuk dilacak.</p>
      <a href={resolveHref("/dashboard/customer/overview")} class="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px">
        <Icon name="search" cls="h-4 w-4" /> Mulai belanja
      </a>
    </div>
  {:else}
    <ul class="space-y-4">
      {#each orders as o (o.id)}
        {@const idx = statusIndex(o.status)}
        {@const delivered = o.status === "terkirim"}
        <li class="overflow-hidden rounded-2xl border border-border bg-card">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div class="flex items-center gap-3">
              <span class="font-mono text-sm font-semibold text-foreground">{o.id}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold {delivered ? 'bg-success/15 text-success-foreground' : 'bg-primary/10 text-primary'}">{ORDER_STATUS_LABEL[o.status]}</span>
              <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{o.payment === "COD" ? "COD" : "Transfer"}</span>
            </div>
            <span class="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          <div class="space-y-4 p-5">
            <!-- Timeline pengantaran -->
            <ol class="flex items-center gap-1" aria-label="Status pengantaran">
              {#each ORDER_STATUS_FLOW as step, i (step)}
                {@const done = i <= idx}
                <li class="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <span class="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold {done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
                    {#if i < idx}<Icon name="check" cls="h-3.5 w-3.5" weight="bold" />{:else}{i + 1}{/if}
                  </span>
                  <span class="text-[10.5px] leading-tight {done ? 'font-semibold text-foreground' : 'text-muted-foreground'}">{ORDER_STATUS_LABEL[step]}</span>
                </li>
                {#if i < ORDER_STATUS_FLOW.length - 1}
                  <span class="mb-4 h-0.5 flex-1 rounded-full {i < idx ? 'bg-primary' : 'bg-muted'}" aria-hidden="true"></span>
                {/if}
              {/each}
            </ol>

            <!-- Pelacakan lokasi terkini (peta) -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <p class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Icon name="map" cls="h-3.5 w-3.5" /> Lokasi terkini
                </p>
                <button
                  type="button"
                  onclick={() => (openMapId = openMapId === o.id ? null : o.id)}
                  class="text-xs font-semibold text-primary hover:underline"
                >
                  {openMapId === o.id ? "Sembunyikan peta" : "Lihat peta"}
                </button>
              </div>
              {#if openMapId === o.id}
                <DeliveryMap
                  progress={progressFor(o.status)}
                  originLabel="Hub Jakarta"
                  destLabel={`${o.address.city} · ${o.address.recipient}`}
                  etaMin={Math.max(20, Math.round(ROUTE_DISTANCE_KM * 1.6))}
                  height={300}
                />
                <p class="mt-2 text-[11px] text-muted-foreground">
                  Garis hijau = jalur kurir yang sudah ditempuh; garis putus-putus = sisa rute menuju alamatmu. Data peta © OpenStreetMap.
                </p>
              {:else}
                <button
                  type="button"
                  onclick={() => (openMapId = o.id)}
                  class="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon name="map" cls="h-4 w-4" /></span>
                  <span class="min-w-0">
                    <span class="block text-sm font-medium text-foreground">Buka peta pelacakan</span>
                    <span class="block text-xs text-muted-foreground">Titik awal (hub) → posisi kurir → {o.address.city}, {delivered ? "sudah tiba" : "sedang menuju"}.</span>
                  </span>
                </button>
              {/if}
            </div>

            <!-- Item + COD -->
            <div class="grid gap-4 lg:grid-cols-[1fr_260px]">
              <ul class="space-y-2">
                {#each o.items as it (it.productId)}
                  <li class="flex items-center gap-3 text-sm">
                    <span class="text-lg" aria-hidden="true">{it.emoji}</span>
                    <span class="min-w-0 flex-1 truncate text-muted-foreground">{it.name} × {it.qty}</span>
                    <span class="shrink-0 font-medium tabular-nums text-foreground">{formatRupiah(it.price * it.qty)}</span>
                  </li>
                {/each}
              </ul>
              <div class="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <div class="text-xs text-muted-foreground">
                  <p class="font-semibold text-foreground">{o.address.recipient}</p>
                  <p>{o.address.phone}</p>
                  <p class="mt-1">{o.address.street}, {o.address.city}</p>
                </div>
                {#if o.payment === "COD" && o.codScore !== null}
                  {@const tone = decisionTone[o.codDecision ?? ""] ?? "bg-muted text-foreground"}
                  <div class="rounded-lg {tone} px-3 py-2 text-xs">
                    <p class="font-semibold">Skor risiko COD {(o.codScore * 100).toFixed(0)}%</p>
                    <p class="opacity-90">{o.codDecision}</p>
                  </div>
                {/if}
                <div class="flex justify-between border-t border-border pt-2 text-sm">
                  <span class="text-muted-foreground">Total</span>
                  <span class="font-bold tabular-nums text-foreground">{formatRupiah(o.total)}</span>
                </div>
              </div>
            </div>

            {#if !delivered}
              <button
                type="button"
                onclick={() => advance(o)}
                class="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent"
              >
                <Icon name="arrow-up-right" cls="h-4 w-4" weight="bold" /> Simulasikan progres pengantaran
              </button>
            {:else}
              <p class="inline-flex items-center gap-2 text-sm font-semibold text-success-foreground"><Icon name="check" cls="h-4 w-4" weight="bold" /> Paket telah sampai ke tanganmu</p>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
