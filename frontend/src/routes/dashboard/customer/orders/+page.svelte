<script lang="ts">
  import { onMount } from "svelte";
  import type { IconName } from "$lib/icon-names";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import DeliveryMap from "$lib/map/DeliveryMap.svelte";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, ORDER_STATUS_FLOW, ORDER_STATUS_LABEL, PRESENCE_LABEL, progressForStatus, type Order, type OrderStatus, type PresenceStatus } from "$lib/stores/shop";
  import { HUB_LABEL, etaForCity, COD_DECISION_LABEL, codDecisionTone } from "$lib/logistics";
  import { notify } from "$lib/toast";

  let orders = $state<Order[]>([]);
  let openMapId = $state<string | null>(null);

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    return unsub;
  });
  const statusIndex = (s: OrderStatus) => ORDER_STATUS_FLOW.indexOf(s);

  /** Fraksi perjalanan kurir (0..1) diturunkan dari status pengantaran nyata. */
  const progressFor = progressForStatus;

  function clearOrders() {
    shop.reset();
    notify({ message: "Riwayat pesanan dihapus (termasuk tugas kurir)", type: "warn", title: "Pesanan" });
  }

  function toggleMap(id: string) {
    openMapId = openMapId === id ? null : id;
    notify({ message: openMapId ? `Peta pelacakan ${id} dibuka` : `Peta ${id} ditutup`, type: "info", title: "Pelacakan" });
  }

  /** Customer beri tahu kurir apakah ia ada di rumah (saat paket dalam pengantaran). */
  function tellPresence(o: Order, presence: PresenceStatus) {
    const err = shop.setPresence(o.id, presence);
    if (err) {
      notify({ message: err, type: "warn", title: "Kehadiran" });
      return;
    }
    notify({
      message: `Kurir diberi tahu: ${PRESENCE_LABEL[presence]}`,
      type: presence === "di-rumah" ? "success" : "info",
      title: "Kehadiran"
    });
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
        <Icon name="trash" cls="h-3.5 w-3.5" /> Hapus riwayat (demo)
      </button>
    {/if}
  </header>

  {#if orders.length === 0}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="map" cls="h-7 w-7" /></span>
      <p class="mt-4 text-base font-semibold text-foreground">Belum ada pesanan</p>
      <p class="mt-1 text-sm text-muted-foreground">Pesanan yang kamu buat akan muncul di sini untuk dilacak.</p>
      <a href={resolveHref("/dashboard/customer/overview")} class="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px">
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

            <!-- Kondisi paket terkini (dari aksi kurir) -->
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border {delivered ? 'border-success/40 bg-success/5' : 'border-primary/30 bg-accent/40'} px-4 py-3">
              <div class="flex items-start gap-3">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg {delivered ? 'bg-success text-success-foreground' : 'bg-primary text-primary-foreground'}">
                  <Icon name={delivered ? "check" : "compass"} cls="h-4 w-4" weight={delivered ? "bold" : "regular"} />
                </span>
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kondisi paket terkini</p>
                  <p class="text-sm font-medium text-foreground">{o.statusNote}</p>
                  <p class="mt-0.5 text-[11px] text-muted-foreground">
                    Diperbarui {new Date(o.updatedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {#if o.courier} · {o.courier}{/if}
                  </p>
                </div>
              </div>
            </div>

            <!-- Pemberitahuan kehadiran: customer beri tahu kurir (packet dalam pengantaran) -->
            {#if o.status === "dikirim"}
              <div class="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p class="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Icon name="users" cls="h-3.5 w-3.5" /> Beri tahu kurir apakah kamu di rumah
                </p>
                <p class="mt-1 text-[11px] text-muted-foreground">Paketmu sedang diantar. Kabari kurir sekarang supaya ia bisa langsung mengantar atau menyesuaikan rute.</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onclick={() => tellPresence(o, "di-rumah")}
                    aria-pressed={o.presenceStatus === "di-rumah"}
                    class="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors {o.presenceStatus === 'di-rumah' ? 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]' : 'border-success/50 text-success-foreground hover:bg-success/10'}"
                  >
                    <Icon name="check" cls="h-3.5 w-3.5" weight="bold" /> Saya ada di rumah
                  </button>
                  <button
                    type="button"
                    onclick={() => tellPresence(o, "tidak-di-rumah")}
                    aria-pressed={o.presenceStatus === "tidak-di-rumah"}
                    class="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors {o.presenceStatus === 'tidak-di-rumah' ? 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]' : 'border-warning/50 text-warning-foreground hover:bg-warning/10'}"
                  >
                    <Icon name="warn" cls="h-3.5 w-3.5" /> Saya tidak di rumah
                  </button>
                </div>
                {#if o.presenceStatus}
                  <p class="mt-2 text-[11px] text-muted-foreground">
                    Terkirim ke kurir: <span class="font-medium text-foreground">{PRESENCE_LABEL[o.presenceStatus]}</span>{#if o.presenceAt} · {new Date(o.presenceAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{/if}
                  </p>
                {/if}
              </div>
            {/if}


            <!-- Pelacakan lokasi terkini (peta) -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <p class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Icon name="map" cls="h-3.5 w-3.5" /> Lokasi terkini
                </p>
                <button
                  type="button"
                  onclick={() => toggleMap(o.id)}
                  class="text-xs font-semibold text-primary hover:underline"
                >
                  {openMapId === o.id ? "Sembunyikan peta" : "Lihat peta"}
                </button>
              </div>
              {#if openMapId === o.id}
                <DeliveryMap
                  progress={progressFor(o.status)}
                  city={o.address.city}
                  originLabel={HUB_LABEL}
                  destLabel={`${o.address.city} · ${o.address.recipient}`}
                  etaMin={etaForCity(o.address.city)}
                  height={300}
                  role="CUSTOMER"
                />
                <p class="mt-2 text-[11px] text-muted-foreground">
                  Garis hijau = jalur kurir yang sudah ditempuh; garis putus-putus = sisa rute menuju alamatmu. Data peta © OpenStreetMap.
                </p>
              {:else}
                <button
                  type="button"
                  onclick={() => toggleMap(o.id)}
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
                    <Icon name={(it.icon ?? "box") as IconName} cls="h-4.5 w-4.5 text-[var(--bitcoin)]" />
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
                  <div class="rounded-lg {codDecisionTone(o.codDecision)} px-3 py-2 text-xs">
                    <p class="font-semibold">Kesiapan bayar COD {(o.codScore * 100).toFixed(0)}%</p>
                    <p class="opacity-90">{o.codCollected ? "Tunai sudah diterima kurir" : COD_DECISION_LABEL[o.codDecision ?? ""] ?? o.codDecision}</p>
                  </div>
                {/if}
                {#if o.slot}
                  <p class="text-xs text-muted-foreground"><span class="font-medium text-foreground">Slot pengantaran:</span> {o.slot}</p>
                {/if}
                {#if o.routedToPudo}
                  <p class="text-xs font-medium text-warning-foreground">Dialihkan ke PUDO — ambil di gerai mitra terdekat.</p>
                {/if}
                <div class="flex justify-between border-t border-border pt-2 text-sm">
                  <span class="text-muted-foreground">Total</span>
                  <span class="font-bold tabular-nums text-foreground">{formatRupiah(o.total)}</span>
                </div>
              </div>
            </div>

            <!-- Riwayat kondisi paket (aksi nyata kurir) -->
            <div class="rounded-xl border border-border bg-muted/20 p-4">
              <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Icon name="trend" cls="h-3.5 w-3.5" /> Riwayat perjalanan paket
              </p>
              <ol class="space-y-2.5">
                {#each o.events as ev, i (ev.at + "-" + i)}
                  <li class="flex gap-3">
                    <span class="mt-1 flex h-2 w-2 shrink-0 rounded-full {i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}"></span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm text-foreground">{ev.note}</p>
                      <p class="text-[11px] text-muted-foreground">
                        {ORDER_STATUS_LABEL[ev.status]} · {new Date(ev.at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {ev.actor}
                      </p>
                    </div>
                  </li>
                {/each}
              </ol>
            </div>

            {#if delivered}
              <p class="inline-flex items-center gap-2 text-sm font-semibold text-success-foreground"><Icon name="check" cls="h-4 w-4" weight="bold" /> Paket telah sampai ke tanganmu</p>
            {:else}
              <p class="inline-flex items-center gap-2 text-sm text-muted-foreground"><Icon name="compass" cls="h-4 w-4" /> Kurir akan memperbarui status setiap tahap pengantaran.</p>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
