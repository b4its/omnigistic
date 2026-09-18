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
    PRESENCE_LABEL,
    isOutForDelivery,
    nextStatus,
    progressForStatus,
    type Order
  } from "$lib/stores/shop";
  import { COURIER, HUB_LABEL, etaForCity, distanceForCity, buildSlot, COD_DECISION_LABEL, codDecisionTone } from "$lib/logistics";
  import { notify, type ToastType as TxType } from "$lib/toast";

  /** Identitas kurir — satu sumber (logistics.ts) agar konsisten dgn Topbar. */
  const actor = (): string => COURIER.actor;

  let orders = $state<Order[]>([]);
  /**
   * Pesanan yang petanya sedang dibuka. Default: pesanan yang sedang DIANTAR
   * (status `dikirim`) agar kurir langsung melihat peta rute lengkap tanpa klik —
   * mengikuti perilaku dashboard pembeli. Bisa dibuka/tutup manual per pesanan.
   */
  let openMapId = $state<string | null>(null);
  /** true bila peta pesanan ini pernah di-auto-buka (agar tidak menimpa aksi manual). */
  let mapAutoOpened = $state(false);
  /** Draf keterangan kondisi per pesanan (dipetakan ke id pesanan). */
  let noteDraft = $state<Record<string, string>>({});
  /** Draf slot pengantaran per pesanan (jam mulai & selesai terpisah). */
  let slotDraft = $state<Record<string, { start: string; end: string }>>({});

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => {
      orders = s.orders;
      ensureSlotDrafts(s.orders);
      autoOpenMap(s.orders);
    });
    return unsub;
  });

  /**
   * Buka peta pesanan yang sedang diantar secara otomatis SEKALI saat data pertama
   * tiba, sehingga kurir langsung melihat rute lengkap. Setelah itu aksi manual
   * kurir (buka/tutup) tidak ditimpa.
   */
  function autoOpenMap(list: Order[]) {
    if (mapAutoOpened || list.length === 0) return;
    const out = list.find((o) => isOutForDelivery(o.status)) ?? list.find((o) => o.status !== "terkirim") ?? list[0];
    openMapId = out.id;
    focusedOrderId = out.id;
    mapAutoOpened = true;
  }

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
  const activeTasks = $derived(orders.filter((o) => o.status !== "terkirim"));
  /** Total tunai COD yang harus ditagih (belum terkumpul). */
  const cashDue = $derived(orders.filter((o) => o.payment === "COD" && !o.codCollected).reduce((s, o) => s + o.total, 0));

  /** Pesanan yang sedang menjadi fokus simulasi pengantaran riil kurir. */
  let focusedOrderId = $state<string | null>(null);
  $effect(() => {
    if (!focusedOrderId && tasks.length > 0) {
      const out = tasks.find((o) => isOutForDelivery(o.status)) ?? tasks[0];
      focusedOrderId = out.id;
    }
  });

  const focusedOrder = $derived(
    orders.find((o) => o.id === (openMapId ?? focusedOrderId)) ??
    activeTasks.find((o) => isOutForDelivery(o.status)) ??
    activeTasks[0] ??
    tasks[0] ??
    null
  );

  function selectOrderForSim(id: string) {
    focusedOrderId = id;
    openMapId = id;
    toast(`Rute pesanan ${id} dipilih`, "info");
  }

  /** Notifikasi aksi kurir (dengan jenis: sukses/info/peringatan). */
  function toast(message: string, type: TxType = "success") {
    notify({ message, type, title: "Tugas Pengantaran" });
  }

  function handleOrderSimArrival(o: Order) {
    if (o.status !== "terkirim") {
      toast(`Kurir tiba di lokasi ${o.address.recipient} (${o.address.city}). Paket siap diserahterimakan.`, "info");
    }
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
    toast(openMapId ? `Peta lengkap rute ${id} ditampilkan` : `Peta rute ${id} disembunyikan`, "info");
  }
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
    <!-- ── Peta Rute & Simulasi Pengantaran Kurir (Sesuai Pesanan Customer) ── -->
    {#if tasks.length > 0 && focusedOrder}
      <section class="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-base font-semibold">Peta Rute &amp; Simulasi Pengantaran Kurir</p>
              <span class="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                Klaster {focusedOrder.address.city}
              </span>
              <span class="rounded-full bg-success/15 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-success-foreground">
                LIVE TELEMETRI
              </span>
            </div>
            <p class="text-[13.5px] text-muted-foreground">
              Eksplorasi koridor pengantaran last-mile per wilayah. Jalankan simulasi untuk menganalisis waktu tempuh, kepadatan jalan, dan titik PUDO (Cockpit Simulasi Pengantaran Riil).
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Pilihan Pesanan Customer / Klaster -->
            <div class="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
              {#each tasks as t (t.id)}
                <button
                  type="button"
                  onclick={() => selectOrderForSim(t.id)}
                  aria-pressed={focusedOrder.id === t.id}
                  class="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors {focusedOrder.id === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
                >
                  {t.id} · {t.address.city}
                </button>
              {/each}
            </div>

            <!-- Tombol Buka/Tutup Seluruh Peta Rute & Simulasi -->
            <button
              type="button"
              onclick={() => toggleMap(focusedOrder.id)}
              aria-expanded={openMapId !== null}
              aria-label={openMapId !== null ? "Sembunyikan peta lengkap" : "Lihat peta lengkap"}
              class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              <Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" />
              <span>{openMapId !== null ? "Sembunyikan peta lengkap" : "Lihat peta lengkap"}</span>
            </button>
          </div>
        </div>

        {#if openMapId !== null}
          <div class="space-y-3">
            <!-- Detail Penerima & Pesanan yang Sedang Disimulasikan -->
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-foreground">Pesanan Disimulasikan:</span>
                <span class="font-mono font-semibold text-primary">{focusedOrder.id}</span>
                <span class="text-muted-foreground">· Penerima:</span>
                <span class="font-medium text-foreground">{focusedOrder.address.recipient}</span>
                <span class="text-muted-foreground">({focusedOrder.address.street}, {focusedOrder.address.city})</span>
                {#if focusedOrder.address.lat && focusedOrder.address.lng}
                  <span class="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border">
                    📍 GPS {focusedOrder.address.lat.toFixed(4)}, {focusedOrder.address.lng.toFixed(4)}
                  </span>
                {/if}
              </div>
              <div class="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span>Status: <b class="text-foreground">{ORDER_STATUS_LABEL[focusedOrder.status]}</b></span>
                <span>·</span>
                <span>{focusedOrder.payment === "COD" ? `COD ${formatRupiah(focusedOrder.total)}` : "Non-COD"}</span>
              </div>
            </div>

            <!-- DeliveryMap dengan Kanvas Bersih, Jalur Tercepat, & Simulasi Riil -->
            <DeliveryMap
              progress={progressForStatus(focusedOrder.status)}
              city={focusedOrder.address.city}
              destCoord={focusedOrder.address.lat && focusedOrder.address.lng ? [focusedOrder.address.lat, focusedOrder.address.lng] : undefined}
              originLabel={HUB_LABEL}
              destLabel={`${focusedOrder.address.recipient} (${focusedOrder.address.street}, ${focusedOrder.address.city})`}
              etaMin={etaForCity(focusedOrder.address.city)}
              height={400}
              role="KURIR"
              routeIntel
              compact={false}
              showSimulation={true}
              onSimulationComplete={() => handleOrderSimArrival(focusedOrder!)}
              onSimulationDivertPudo={() => toPudo(focusedOrder!)}
            />

            <p class="text-[11px] text-muted-foreground">
              Rute {HUB_LABEL} → Klaster {focusedOrder.address.city} ({distanceForCity(focusedOrder.address.city)} km · perkiraan waktu tempuh normal {etaForCity(focusedOrder.address.city)} menit).
              Simulasi disesuaikan dengan pesanan <b>{focusedOrder.id}</b> untuk <b>{focusedOrder.address.recipient}</b>. Bilah simulasi, analisis rute, dan legenda dapat dibuka-tutup secara mandiri di bawah peta.
            </p>
          </div>
        {/if}
      </section>
    {/if}

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
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
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

              <!-- Pemberitahuan kehadiran dari PEMBELI (sebelum kurir tiba) -->
              {#if o.status === "dikirim" && o.presenceStatus}
                <div class="flex items-start gap-3 rounded-xl border {o.presenceStatus === 'di-rumah' ? 'border-success/40 bg-success/5' : 'border-warning/40 bg-warning/5'} p-4">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg {o.presenceStatus === 'di-rumah' ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}">
                    <Icon name={o.presenceStatus === "di-rumah" ? "check" : "warn"} cls="h-4 w-4" weight={o.presenceStatus === "di-rumah" ? "bold" : "regular"} />
                  </span>
                  <div class="min-w-0">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pemberitahuan pembeli</p>
                    <p class="text-sm font-semibold text-foreground">{PRESENCE_LABEL[o.presenceStatus]}</p>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      {o.presenceStatus === "di-rumah" ? "Boleh langsung antar ke alamat." : "Tawarkan PUDO / jadwalkan ulang sebelum menunggu."}
                    </p>
                  </div>
                </div>
              {/if}

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
                      class="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px"
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
                  <div class="rounded-lg {codDecisionTone(o.codDecision)} px-3 py-2 text-xs">
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
                aria-expanded={openMapId === o.id}
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <Icon name="map" cls="h-3.5 w-3.5" /> {openMapId === o.id ? "Sembunyikan peta lengkap" : "Lihat peta lengkap"}
              </button>
              {#if openMapId === o.id}
                <p class="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-[11px] leading-snug text-muted-foreground">
                  <span class="font-semibold text-foreground">Peta rute aktif di panel atas:</span> titik awal {HUB_LABEL} → tujuan {o.address.city} · {o.address.recipient}
                  ({distanceForCity(o.address.city)} km · ETA {etaForCity(o.address.city)} mnt).
                  Gunakan bilah kontrol simulasi di atas untuk menganalisis waktu tempuh, kepadatan jalan, dan titik PUDO.
                </p>
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
