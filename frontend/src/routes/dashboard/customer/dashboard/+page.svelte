<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import DeliveryMap from "$lib/map/DeliveryMap.svelte";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, cartDetail, ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, COURIER_TASK, nextStatus, progressForStatus, type Order } from "$lib/stores/shop";
  import { HUB_LABEL, etaForCity, distanceForCity, remainingKm, remainingEtaMin } from "$lib/logistics";

  interface CartLine {
    name: string;
    emoji: string;
    qty: number;
    lineTotal: number;
  }

  let cartLines = $state<CartLine[]>([]);
  let cartSubtotal = $state(0);
  let cartCount = $state(0);
  let orders = $state<Order[]>([]);

  onMount(() => {
    shop.init();
    const unsubCart = cartDetail.subscribe((d) => {
      cartLines = d.items.map((i) => ({ name: i.product.name, emoji: i.product.emoji, qty: i.qty, lineTotal: i.lineTotal }));
      cartSubtotal = d.subtotal;
      cartCount = d.count;
    });
    const unsubOrders = shop.subscribe((s) => (orders = s.orders));
    return () => {
      unsubCart();
      unsubOrders();
    };
  });

  // ── Ringkasan biaya ──
  const totalOrders = $derived(orders.length);
  const totalSpend = $derived(orders.reduce((s, o) => s + o.total, 0));
  const totalCod = $derived(orders.filter((o) => o.payment === "COD").reduce((s, o) => s + o.total, 0));
  const totalDigital = $derived(orders.filter((o) => o.payment === "Transfer").reduce((s, o) => s + o.total, 0));
  const deliveredCount = $derived(orders.filter((o) => o.status === "terkirim").length);
  const activeCount = $derived(orders.length - deliveredCount);
  const codPct = $derived(totalSpend ? (totalCod / totalSpend) * 100 : 0);

  // Pesanan yang dilacak (bukan terkirim lebih dulu; fallback ke terbaru).
  const tracked = $derived(orders.find((o) => o.status !== "terkirim") ?? orders[0] ?? null);

  // ── Pelacakan realtime dari status NYATA (hasil aksi kurir) ──
  // Progres peta diturunkan langsung dari status pesanan; pembeli hanya
  // memantau, bukan menggerakkan. Satu sumber dengan portal kurir.
  const tripMinutes = $derived(tracked ? etaForCity(tracked.address.city) : 45);
  const tripKm = $derived(tracked ? distanceForCity(tracked.address.city) : 0);
  const progress = $derived(tracked ? progressForStatus(tracked.status) : 0);
  const reached = $derived(!!tracked && tracked.status === "terkirim");
  const reachLabel = $derived(tracked ? tracked.address.street.split(",")[0] : "Alamat penerima");
  const kmLeft = $derived(tracked ? remainingKm(tracked.address.city, progress) : 0);
  const etaLeft = $derived(tracked ? remainingEtaMin(tracked.address.city, progress) : 0);

  const steps = ORDER_STATUS_FLOW;
  const stepIndex = $derived(tracked ? steps.indexOf(tracked.status) : -1);
  const currentTask = $derived(tracked ? COURIER_TASK[tracked.status] : null);
  const upcomingStatus = $derived(tracked ? nextStatus(tracked.status) : null);
</script>

<div class="space-y-6">
  <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Dashboard Saya</h1>
      <p class="text-sm text-muted-foreground">Ringkasan belanja, pembayaran, dan pelacakan pengantaran realtime.</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <a href={resolveHref("/dashboard/customer/cart")} class="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
        <Icon name="stack" cls="h-4 w-4" /> Keranjang
        {#if cartCount > 0}<span class="rounded-full bg-muted px-1.5 text-xs tabular-nums">{cartCount}</span>{/if}
      </a>
      <a href={resolveHref("/dashboard/customer/orders")} class="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px">
        <Icon name="map" cls="h-4 w-4" /> Semua pesanan
      </a>
    </div>
  </header>

  <!-- KPI -->
  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="stack" cls="h-3.5 w-3.5" /> Keranjang</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{cartCount} <span class="text-base font-medium text-muted-foreground">item</span></p>
      <p class="mt-1 text-xs text-muted-foreground">{formatRupiah(cartSubtotal)}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="globe" cls="h-3.5 w-3.5" /> Pesanan</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{totalOrders}</p>
      <p class="mt-1 text-xs text-muted-foreground">{activeCount} aktif · {deliveredCount} terkirim</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="currency" cls="h-3.5 w-3.5" /> Total biaya</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{formatRupiah(totalSpend)}</p>
      <p class="mt-1 text-xs text-muted-foreground">seluruh pesanan</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon name="shield" cls="h-3.5 w-3.5" /> COD vs Digital</p>
      <p class="mt-2 text-base font-bold tabular-nums text-foreground">{formatRupiah(totalCod)}</p>
      <p class="text-base font-bold tabular-nums text-foreground">{formatRupiah(totalDigital)}</p>
      <div class="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
        <div class="h-full bg-primary" style="width:{codPct}%"></div>
        <div class="h-full bg-[var(--color-chart-4)]" style="width:{100 - codPct}%"></div>
      </div>
      <p class="mt-1 text-[11px] text-muted-foreground"><span class="text-primary">■</span> COD · <span class="text-[color:var(--color-chart-4)]">■</span> Digital</p>
    </div>
  </section>

  <!-- Pelacakan realtime -->
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-muted-foreground">Pelacakan pengantaran realtime</h2>
      {#if tracked}
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
          <Icon name={tracked.payment === "COD" ? "currency" : "shield"} cls="h-3.5 w-3.5" /> {tracked.payment === "COD" ? "COD" : "Digital"} · {ORDER_STATUS_LABEL[tracked.status]}
        </span>
      {/if}
    </div>

    {#if !tracked}
      <div class="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="map" cls="h-7 w-7" /></span>
        <p class="mt-4 text-base font-semibold text-foreground">Belum ada pesanan untuk dilacak</p>
        <p class="mt-1 text-sm text-muted-foreground">Buat pesanan dulu, lalu pantau kurir bergerak menuju alamatmu di sini.</p>
        <a href={resolveHref("/dashboard/customer/overview")} class="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px">
          <Icon name="search" cls="h-4 w-4" /> Mulai belanja
        </a>
      </div>
    {:else}
      <div class="grid gap-5 lg:grid-cols-[1fr_340px]">
        <!-- Peta -->
        <div class="space-y-3">
          <DeliveryMap progress={progress} city={tracked.address.city} originLabel={HUB_LABEL} destLabel={reachLabel} etaMin={tripMinutes} height={380} role="CUSTOMER" />

          <!-- Linimasa status -->
          <ol class="flex items-center gap-1" aria-label="Status pengantaran">
            {#each steps as step, i (step)}
              {@const done = i <= stepIndex}
              <li class="flex flex-1 flex-col items-center gap-1.5 text-center">
                <span class="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold {done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
                  {#if i < stepIndex}<Icon name="check" cls="h-3.5 w-3.5" weight="bold" />{:else}{i + 1}{/if}
                </span>
                <span class="text-[10.5px] leading-tight {done ? 'font-semibold text-foreground' : 'text-muted-foreground'}">{ORDER_STATUS_LABEL[step]}</span>
              </li>
              {#if i < steps.length - 1}
                <span class="mb-4 h-0.5 flex-1 rounded-full {i < stepIndex ? 'bg-primary' : 'bg-muted'}" aria-hidden="true"></span>
              {/if}
            {/each}
          </ol>
        </div>

        <!-- Status terkini (dari aksi kurir — hanya pantau) -->
        <aside class="space-y-4">
          <div class="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-foreground">Status pengantaran</h3>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold {reached ? 'bg-success/15 text-success-foreground' : 'bg-primary/10 text-primary'}">{reached ? "Tiba" : "Dalam perjalanan"}</span>
            </div>

            <!-- Kondisi paket terkini (ditulis kurir) -->
            <div class="rounded-xl border {reached ? 'border-success/40 bg-success/5' : 'border-primary/30 bg-accent/40'} p-3">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kondisi paket terkini</p>
              <p class="mt-1 text-sm font-medium text-foreground">{tracked.statusNote}</p>
              <p class="mt-0.5 text-[11px] text-muted-foreground">
                {new Date(tracked.updatedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {#if tracked.courier} · {tracked.courier}{/if}
              </p>
            </div>

            <!-- Progres bar (dari status nyata) -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>Progres</span>
                <span class="tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progres pengantaran">
                <div class="h-full rounded-full bg-primary transition-all" style="width:{Math.round(progress * 100)}%"></div>
              </div>
              <p class="text-[11px] text-muted-foreground">
                {#if reached}Paket sudah tiba di {tracked.address.city}.{:else}± {kmLeft} km · sisa ETA ± {etaLeft} menit menuju {tracked.address.city} (total {tripKm} km).{/if}
              </p>
            </div>

            <!-- Tugas kurir saat ini (transparansi status) -->
            {#if currentTask}
              <div class="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon name={currentTask.icon as never} cls="h-4 w-4" />
                </span>
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{reached ? "Selesai" : "Kurir saat ini"}</p>
                  <p class="text-sm font-semibold text-foreground">{currentTask.title}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">{currentTask.detail}</p>
                </div>
              </div>
            {/if}

            <p class="text-[11px] text-muted-foreground">
              {#if reached}
                Paket sudah kamu terima. Terima kasih!
              {:else if upcomingStatus}
                Menunggu pembaruan kurir: <span class="font-semibold text-foreground">{ORDER_STATUS_LABEL[upcomingStatus]}</span>.
              {:else}
                Status diperbarui otomatis oleh kurir.
              {/if}
            </p>
          </div>

          <!-- Detail tujuan -->
          <div class="space-y-2 rounded-2xl border border-border bg-card p-5 text-sm">
            <h3 class="text-sm font-semibold text-foreground">Detail pengantaran</h3>
            <p class="text-muted-foreground"><span class="font-medium text-foreground">Penerima:</span> {tracked.address.recipient}</p>
            <p class="text-muted-foreground"><span class="font-medium text-foreground">Alamat:</span> {tracked.address.street}, {tracked.address.city}</p>
            <p class="text-muted-foreground"><span class="font-medium text-foreground">Total:</span> {formatRupiah(tracked.total)}</p>
            {#if tracked.payment === "COD" && tracked.codScore !== null}
              <p class="text-muted-foreground"><span class="font-medium text-foreground">Pembayaran:</span> COD (bayar saat tiba)</p>
            {:else}
              <p class="text-muted-foreground"><span class="font-medium text-foreground">Pembayaran:</span> Digital / Transfer</p>
            {/if}
          </div>
        </aside>
      </div>
    {/if}
  </section>

  <!-- Item keranjang + pesanan terbaru -->
  <section class="grid gap-5 lg:grid-cols-2">
    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-foreground">Item di keranjang</h2>
        <a href={resolveHref("/dashboard/customer/cart")} class="text-xs font-semibold text-primary hover:underline">Kelola</a>
      </div>
      {#if cartLines.length === 0}
        <p class="py-6 text-center text-sm text-muted-foreground">Keranjang kosong.</p>
      {:else}
        <ul class="space-y-2">
          {#each cartLines as line (line.name)}
            <li class="flex items-center gap-3 text-sm">
              <span class="text-lg" aria-hidden="true">{line.emoji}</span>
              <span class="min-w-0 flex-1 truncate text-muted-foreground">{line.name} × {line.qty}</span>
              <span class="shrink-0 font-medium tabular-nums text-foreground">{formatRupiah(line.lineTotal)}</span>
            </li>
          {/each}
        </ul>
        <div class="mt-3 flex justify-between border-t border-border pt-3 text-sm">
          <span class="text-muted-foreground">Subtotal</span>
          <span class="font-bold tabular-nums text-foreground">{formatRupiah(cartSubtotal)}</span>
        </div>
      {/if}
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-foreground">Pesanan terbaru</h2>
        <a href={resolveHref("/dashboard/customer/orders")} class="text-xs font-semibold text-primary hover:underline">Semua</a>
      </div>
      {#if orders.length === 0}
        <p class="py-6 text-center text-sm text-muted-foreground">Belum ada pesanan.</p>
      {:else}
        <ul class="space-y-2">
          {#each orders.slice(0, 4) as o (o.id)}
            <li class="flex items-center gap-3 text-sm">
              <span class="font-mono text-xs text-muted-foreground">{o.id.split("-").slice(-1)}</span>
              <span class="min-w-0 flex-1 truncate text-muted-foreground">{ORDER_STATUS_LABEL[o.status]}</span>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold {o.payment === 'COD' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}">{o.payment}</span>
              <span class="shrink-0 font-medium tabular-nums text-foreground">{formatRupiah(o.total)}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </section>
</div>
