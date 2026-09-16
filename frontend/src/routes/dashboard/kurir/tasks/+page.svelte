<script lang="ts">
  /**
   * Tugas Pengantaran (KURIR) — halaman aksi kurir untuk pesanan NYATA pembeli.
   *
   * Kurir melihat paket yang harus ditangani (dari checkout Customer) dan
   * memperbarui kondisi terkini: memajukan status (jemput → transit → antar →
   * terkirim) serta menulis keterangan kondisi paket. Setiap aksi tercatat
   * sebagai event bertimestamp sehingga halaman pembeli menampilkan status &
   * riwayat yang sama (satu store lintas role: `$lib/stores/shop`).
   */
  import { onMount } from "svelte";
  import type { IconName } from "$lib/icon-names";
  import Icon from "$lib/components/Icon.svelte";
  import DeliveryMap from "$lib/map/DeliveryMap.svelte";
  import { resolveHref } from "$lib/utils";
  import { formatRupiah } from "$lib/shop/catalog";
  import {
    shop,
    ORDER_STATUS_FLOW,
    ORDER_STATUS_LABEL,
    DEFAULT_COURIER_NOTE,
    COURIER_TASK,
    nextStatus,
    progressForStatus,
    type Order
  } from "$lib/stores/shop";
  import { COURIER, HUB_LABEL, etaForCity, buildSlot, COD_DECISION_LABEL } from "$lib/logistics";
  import { notify, type ToastType as TxType } from "$lib/toast";

  /** Identitas kurir — satu sumber (logistics.ts) agar konsisten dgn Topbar. */
  const actor = (): string => COURIER.actor;

  let orders = $state<Order[]>([]);
  let openMapId = $state<string | null>(null);
  /** Draf keterangan kondisi per pesanan (dipetakan ke id pesanan). */
  let noteDraft = $state<Record<string, string>>({});
  /** Draf slot pengantaran per pesanan (jam mulai & selesai terpisah). */
  let slotDraft = $state<Record<string, { start: string; end: string }>>({});

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => {
      orders = s.orders;
      ensureSlotDrafts(s.orders);
    });
    return unsub;
  });

  /** Pastikan tiap pesanan punya draf slot {start,end} agar bind:value aman. */
  function ensureSlotDrafts(list: Order[]) {
    const next = { ...slotDraft };
    let changed = false;
    for (const o of list) {
      if (!next[o.id]) {
        next[o.id] = { start: "", end: "" };
        changed = true;
      }
    }
    if (changed) slotDraft = next;
  }

  const statusIndex = (s: Order["status"]) => ORDER_STATUS_FLOW.indexOf(s);

  /** Pesanan yang butuh aksi lebih dulu (belum terkirim), lalu yang selesai. */
  const tasks = $derived(
    [...orders].sort((a, b) => {
      const aDone = a.status === "terkirim" ? 1 : 0;
      const bDone = b.status === "terkirim" ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return b.updatedAt - a.updatedAt;
    })
  );
  const activeCount = $derived(orders.filter((o) => o.status !== "terkirim").length);
  const doneCount = $derived(orders.filter((o) => o.status === "terkirim").length);
  /** Total tunai COD yang harus ditagih (belum terkumpul). */
  const cashDue = $derived(orders.filter((o) => o.payment === "COD" && !o.codCollected).reduce((s, o) => s + o.total, 0));

  /** Notifikasi aksi kurir (dengan jenis: sukses/info/peringatan). */
  function toast(message: string, type: TxType = "success") {
    notify({ message, type, title: "Tugas Pengantaran" });
  }

  /** Kurir memajukan paket ke tahap berikutnya, memakai draf keterangan bila ada. */
  function advance(o: Order) {
    const next = nextStatus(o.status);
    if (!next) return;
    const draft = noteDraft[o.id]?.trim();
    const applied = shop.courierAdvance(o.id, actor(), draft || undefined) ?? next;
    noteDraft = { ...noteDraft, [o.id]: "" };
    toast(`Paket ${o.id} → ${ORDER_STATUS_LABEL[applied]}`);
  }

  /** Kurir hanya memperbarui keterangan kondisi tanpa mengubah status. */
  function writeNote(o: Order) {
    const clean = noteDraft[o.id]?.trim();
    if (!clean) {
      toast("Tulis keterangan kondisi paket dulu", "warn");
      return;
    }
    shop.courierNote(o.id, actor(), clean);
    noteDraft = { ...noteDraft, [o.id]: "" };
    toast(`Kondisi ${o.id} diperbarui`);
  }

  /** Kurir konfirmasi slot pengantaran (dua input jam: mulai & selesai). */
  function confirmSlot(o: Order) {
    const d = slotDraft[o.id];
    const slot = buildSlot(d?.start ?? "", d?.end ?? "");
    const err = shop.confirmSlot(o.id, actor(), slot);
    if (err) {
      toast(err, "warn");
      return;
    }
    slotDraft = { ...slotDraft, [o.id]: { start: "", end: "" } };
    toast(`Slot ${o.id} dikonfirmasi`);
  }

  /** Kurir tandai tunai COD sudah diterima. */
  function collect(o: Order) {
    shop.collectCod(o.id, actor());
    toast(`Tunai ${o.id} diterima`);
  }

  /** Kurir alihkan paket ke PUDO. */
  function toPudo(o: Order) {
    shop.routeToPudo(o.id, actor());
    toast(`Paket ${o.id} dialihkan ke PUDO`, "info");
  }

  function reset() {
    shop.reset();
    toast("Riwayat pesanan dihapus", "warn");
  }

  function toggleMap(id: string) {
    openMapId = openMapId === id ? null : id;
    toast(openMapId ? `Rute pengantaran ${id} ditampilkan` : `Rute ${id} disembunyikan`, "info");
  }

  const decisionTone: Record<string, string> = {
    "antar-normal": "bg-success/15 text-success-foreground",
    pudo: "bg-warning/15 text-warning-foreground",
    "pre-payment": "bg-destructive/15 text-destructive-foreground"
  };
</script>

<div class="space-y-6">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Tugas Pengantaran</h1>
      <p class="text-sm text-muted-foreground">
        Paket dari pembeli yang perlu kamu tangani. Perbarui status &amp; kondisi terkini — pembeli langsung melihatnya.
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground">
        <Icon name="stack" cls="h-3.5 w-3.5" /> {activeCount} aktif
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success-foreground">
        <Icon name="check" cls="h-3.5 w-3.5" weight="bold" /> {doneCount} selesai
      </span>
      {#if cashDue > 0}
        <a href={resolveHref("/dashboard/kurir/payment")} class="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/20">
          <Icon name="currency" cls="h-3.5 w-3.5" /> Tunai tertagih {formatRupiah(cashDue)}
        </a>
      {/if}
    </div>
  </header>

  {#if orders.length === 0}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="compass" cls="h-7 w-7" /></span>
      <p class="mt-4 text-base font-semibold text-foreground">Belum ada tugas pengantaran</p>
      <p class="mt-1 text-sm text-muted-foreground">
        Tugas muncul otomatis saat pembeli menyelesaikan checkout. Buka portal <span class="font-medium text-foreground">Customer</span> untuk membuat pesanan.
      </p>
    </div>
  {:else}
    <ul class="space-y-4">
      {#each tasks as o (o.id)}
        {@const idx = statusIndex(o.status)}
        {@const task = COURIER_TASK[o.status]}
        {@const next = nextStatus(o.status)}
        {@const done = o.status === "terkirim"}
        <li class="overflow-hidden rounded-2xl border border-border bg-card {done ? 'opacity-80' : ''}">
          <!-- Header tugas -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div class="flex items-center gap-3">
              <span class="font-mono text-sm font-semibold text-foreground">{o.id}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold {done ? 'bg-success/15 text-success-foreground' : 'bg-primary/10 text-primary'}">{ORDER_STATUS_LABEL[o.status]}</span>
              <span class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{o.payment === "COD" ? "COD" : "Transfer"}</span>
            </div>
            <span class="text-xs text-muted-foreground">Diperbarui {new Date(o.updatedAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          <div class="grid gap-4 p-5 lg:grid-cols-[1fr_300px]">
            <div class="space-y-4">
              <!-- Tugas kurir saat ini -->
              <div class="flex items-start gap-3 rounded-xl border border-primary/30 bg-accent/40 p-4">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_16px_-4px_var(--glow)] text-white">
                  <Icon name={task.icon as never} cls="h-5 w-5" />
                </span>
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tugas saat ini</p>
                  <p class="text-sm font-semibold text-foreground">{task.title}</p>
                  <p class="mt-0.5 text-xs text-muted-foreground">{task.detail}</p>
                </div>
              </div>

              <!-- Timeline status -->
              <ol class="flex items-center gap-1" aria-label="Status pengantaran">
                {#each ORDER_STATUS_FLOW as step, i (step)}
                  {@const stepDone = i <= idx}
                  <li class="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <span class="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold {stepDone ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
                      {#if i < idx}<Icon name="check" cls="h-3.5 w-3.5" weight="bold" />{:else}{i + 1}{/if}
                    </span>
                    <span class="text-[10.5px] leading-tight {stepDone ? 'font-semibold text-foreground' : 'text-muted-foreground'}">{ORDER_STATUS_LABEL[step]}</span>
                  </li>
                  {#if i < ORDER_STATUS_FLOW.length - 1}
                    <span class="mb-4 h-0.5 flex-1 rounded-full {i < idx ? 'bg-primary' : 'bg-muted'}" aria-hidden="true"></span>
                  {/if}
                {/each}
              </ol>

              <!-- Kondisi paket terkini -->
              <div class="rounded-xl border border-border bg-muted/30 p-4">
                <p class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Icon name="bell" cls="h-3.5 w-3.5" /> Kondisi paket terkini (dilihat pembeli)
                </p>
                <p class="mt-1 text-sm text-foreground">{o.statusNote}</p>
                {#if o.courier}<p class="mt-1 text-[11px] text-muted-foreground">Ditangani {o.courier}</p>{/if}
              </div>

              <!-- Aksi kurir -->
              {#if !done}
                <div class="space-y-2">
                  <textarea
                    rows="2"
                    bind:value={noteDraft[o.id]}
                    placeholder={DEFAULT_COURIER_NOTE[next ?? o.status]}
                    aria-label={`Keterangan kondisi paket ${o.id}`}
                    class="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
                  ></textarea>
                  <p class="text-[11px] text-muted-foreground">Kosongkan untuk memakai catatan bawaan. Kamu bisa klik “Perbarui kondisi” tanpa mengubah status.</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onclick={() => advance(o)}
                      class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-px"
                    >
                      <Icon name="arrow-up-right" cls="h-4 w-4" weight="bold" /> {task.title}
                    </button>
                    <button
                      type="button"
                      onclick={() => writeNote(o)}
                      class="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                    >
                      <Icon name="edit" cls="h-4 w-4" /> Perbarui kondisi
                    </button>
                  </div>

                  <!-- Aksi lanjutan: slot, tunai COD, PUDO -->
                  <div class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Mulai
                        <input
                          type="time"
                          bind:value={slotDraft[o.id].start}
                          aria-label={`Jam mulai slot ${o.id}`}
                          class="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                        />
                      </label>
                      <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Selesai
                        <input
                          type="time"
                          bind:value={slotDraft[o.id].end}
                          aria-label={`Jam selesai slot ${o.id}`}
                          class="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                        />
                      </label>
                      <button type="button" onclick={() => confirmSlot(o)} class="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent">
                        Konfirmasi slot
                      </button>
                    </div>
                    {#if o.payment === "COD"}
                      <button
                        type="button"
                        onclick={() => collect(o)}
                        disabled={o.codCollected}
                        class="rounded-lg border border-success/50 px-3 py-1.5 text-xs font-semibold text-success-foreground transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {o.codCollected ? "Tunai diterima" : `Terima tunai ${formatRupiah(o.total)}`}
                      </button>
                    {/if}
                    {#if !o.routedToPudo}
                      <button type="button" onclick={() => toPudo(o)} class="rounded-lg border border-warning/50 px-3 py-1.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/10">
                        Alihkan ke PUDO
                      </button>
                    {/if}
                  </div>
                </div>
              {:else}
                <p class="inline-flex items-center gap-2 text-sm font-semibold text-success-foreground"><Icon name="check" cls="h-4 w-4" weight="bold" /> Paket telah sampai ke penerima</p>
              {/if}
            </div>

            <!-- Detail penerima + peta -->
            <aside class="space-y-3">
              <div class="space-y-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
                <div class="text-xs text-muted-foreground">
                  <p class="text-sm font-semibold text-foreground">{o.address.recipient}</p>
                  <p>{o.address.phone}</p>
                  <p class="mt-1">{o.address.street}, {o.address.city}</p>
                </div>
                <ul class="space-y-1.5 border-t border-border pt-3">
                  {#each o.items as it (it.productId)}
                    <li class="flex items-center gap-2 text-xs">
                      <Icon name={it.icon as IconName} cls="h-4 w-4 text-[var(--bitcoin)]" />
                      <span class="min-w-0 flex-1 truncate text-muted-foreground">{it.name} × {it.qty}</span>
                    </li>
                  {/each}
                </ul>
                <div class="flex justify-between border-t border-border pt-2 text-sm">
                  <span class="text-muted-foreground">{o.payment === "COD" ? "Tagih tunai" : "Sudah dibayar"}</span>
                  <span class="font-bold tabular-nums text-foreground">{formatRupiah(o.total)}</span>
                </div>
                {#if o.payment === "COD" && o.codScore !== null}
                  {@const tone = decisionTone[o.codDecision ?? ""] ?? "bg-muted text-foreground"}
                  <div class="rounded-lg {tone} px-3 py-2 text-xs">
                    <p class="font-semibold">Kesiapan bayar COD {(o.codScore * 100).toFixed(0)}%</p>
                    <p class="opacity-90">{COD_DECISION_LABEL[o.codDecision ?? ""] ?? o.codDecision}</p>
                  </div>
                {/if}
                {#if o.slot}
                  <p class="text-xs text-muted-foreground">Slot: <span class="font-medium text-foreground">{o.slot}</span></p>
                {/if}
                {#if o.routedToPudo}
                  <p class="text-xs font-semibold text-warning-foreground">Sudah dialihkan ke PUDO</p>
                {/if}
                {#if o.payment === "COD"}
                  <p class="text-xs {o.codCollected ? 'font-semibold text-success-foreground' : 'text-muted-foreground'}">
                    {o.codCollected ? "Tunai sudah diterima" : "Tunai belum diterima"}
                  </p>
                {/if}
              </div>

              <button
                type="button"
                onclick={() => toggleMap(o.id)}
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <Icon name="map" cls="h-3.5 w-3.5" /> {openMapId === o.id ? "Sembunyikan rute" : "Lihat rute pengantaran"}
              </button>
              {#if openMapId === o.id}
                <DeliveryMap
                  progress={progressForStatus(o.status)}
                  city={o.address.city}
                  originLabel={HUB_LABEL}
                  destLabel={`${o.address.city} · ${o.address.recipient}`}
                  etaMin={etaForCity(o.address.city)}
                  height={220}
                  role="KURIR"
                />
              {/if}
            </aside>
          </div>
        </li>
      {/each}
    </ul>

    <div class="flex justify-end">
      <button type="button" onclick={reset} class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive-foreground">
        <Icon name="trash" cls="h-3.5 w-3.5" /> Hapus semua pesanan (demo)
      </button>
    </div>
  {/if}
</div>
