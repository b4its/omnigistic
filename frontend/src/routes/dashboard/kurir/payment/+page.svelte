<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { resolveHref } from "$lib/utils";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, type Order } from "$lib/stores/shop";
  import { COURIER } from "$lib/logistics";

  const flow = [
    "Kurir serah tunai",
    "QRIS / digital",
    "Hub rekonsiliasi",
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

  function toast(detail: string) {
    window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail }));
  }
  function collect(o: Order) {
    shop.collectCod(o.id, COURIER.actor);
    toast(`Tunai ${o.id} diterima`);
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Digital Payment</h1>
    <span class="hub-label text-muted-foreground">COD settlement</span>
  </div>

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-[15px] text-muted-foreground">
    <span class="font-medium text-foreground">Ilustrasi proses.</span> Angka di bawah diambil dari pesanan nyata pembeli (simulasi); alur rekonsiliasi bersifat ilustratif, bukan integrasi pembayaran live.
  </div>

  <!-- Rekap tunai COD nyata -->
  <section class="grid gap-4 sm:grid-cols-3">
    <div class="rounded-2xl border border-warning/40 bg-warning/5 p-5">
      <p class="text-xs font-semibold text-warning-foreground">Tunai belum ditagih</p>
      <p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatRupiah(outstandingTotal)}</p>
      <p class="mt-0.5 text-xs text-muted-foreground">{outstanding.length} pesanan COD</p>
    </div>
    <div class="rounded-2xl border border-success/40 bg-success/5 p-5">
      <p class="text-xs font-semibold text-success-foreground">Tunai terkumpul</p>
      <p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatRupiah(collectedTotal)}</p>
      <p class="mt-0.5 text-xs text-muted-foreground">{collected.length} pesanan COD</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-semibold text-muted-foreground">Rekonsiliasi COD</p>
      <p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{progressPct}%</p>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct} aria-label="Progres rekonsiliasi tunai COD">
        <div class="h-full rounded-full bg-primary" style="width:{progressPct}%"></div>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">{digitalOrders.length} pesanan digital (bukan tunai)</p>
    </div>
  </section>

  <!-- Daftar tagihan tunai -->
  <section class="rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p class="text-base font-semibold">Tagihan tunai per pesanan</p>
        <p class="text-[13.5px] text-muted-foreground">Tandai tunai yang sudah kamu terima agar rekap &amp; halaman pembeli ikut terbarui.</p>
      </div>
      <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">Buka tugas pengantaran</a>
    </div>
    {#if codOrders.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p class="text-sm font-semibold text-foreground">Belum ada pesanan COD</p>
        <p class="mt-1 text-xs text-muted-foreground">Pesanan COD dari pembeli akan tampil di sini untuk penagihan &amp; rekonsiliasi.</p>
      </div>
    {:else}
      <ul class="mt-4 space-y-2">
        {#each codOrders as o (o.id)}
          <li class="flex flex-wrap items-center gap-3 rounded-xl border border-border {o.codCollected ? 'bg-success/5' : 'bg-muted/20'} px-4 py-3">
            <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city}</span>
            <span class="text-sm font-semibold tabular-nums text-foreground">{formatRupiah(o.total)}</span>
            {#if o.codCollected}
              <span class="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground"><Icon name="check" cls="h-3 w-3" weight="bold" /> Tunai diterima</span>
            {:else}
              <button type="button" onclick={() => collect(o)} class="rounded-lg border border-success/50 px-3 py-1.5 text-xs font-semibold text-success-foreground transition-colors hover:bg-success/10">Terima tunai</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-2 text-xs font-semibold text-destructive-foreground">Saat ini · manual</p>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Kurir kumpulkan tunai, dicatat &amp; direkonsiliasi sebelum settlement ke merchant. Kompleks, memakan waktu, rawan human error.
      </p>
    </div>
    <div class="rounded-2xl border border-chart-2 bg-card p-5">
      <p class="mb-2 text-xs font-semibold text-chart-2">Omnigistic · digital</p>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Rekonsiliasi otomatis via hub, digital settlement ke merchant. Human error turun -80%, tunai fisik di rute berkurang.
      </p>
    </div>
  </div>

  <div class="rounded-2xl border border-border bg-card p-5">
    <p class="mb-3 text-sm font-medium">Alur settlement</p>
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
