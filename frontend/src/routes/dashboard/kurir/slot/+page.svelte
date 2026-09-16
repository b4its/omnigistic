<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import { api } from "$lib/api";
  import { shop, ORDER_STATUS_LABEL, type Order } from "$lib/stores/shop";
  import { COURIER, etaForCity, buildSlot } from "$lib/logistics";
  import { notify, type ToastType as TxType } from "$lib/toast";

  const stages = [
    { step: "H-1", desc: "Pemberitahuan paket akan diantar besok", en: "Notify" },
    { step: "30-60 min", desc: "Estimasi tiba + konfirmasi kesiapan", en: "Estimate" },
    { step: "Arrival", desc: "Penerima siap → kurir tidak menunggu", en: "Confirm" }
  ];

  let quotes = $state<Array<{ city: string; quote: string }>>([]);
  let quotesLoaded = $state(false);

  /** Pesanan nyata yang menunggu konfirmasi slot. */
  let orders = $state<Order[]>([]);
  let slotDraft = $state<Record<string, { start: string; end: string }>>({});

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => {
      orders = s.orders;
      ensureSlotDrafts(s.orders);
    });
    void loadQuotes();
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

  async function loadQuotes() {
    try {
      quotes = await api.courierQuotes();
    } catch {
      quotes = [];
    }
    quotesLoaded = true;
  }

  /** Pesanan aktif yang belum punya slot (butuh konfirmasi). */
  const pending = $derived(orders.filter((o) => o.status !== "terkirim" && !o.slot));
  const confirmed = $derived(
    orders.filter((o) => o.status !== "terkirim" && o.slot).sort((a, b) => (a.slot ?? "").localeCompare(b.slot ?? ""))
  );

  // Pastikan tiap pesanan punya draf slot {start,end} agar bind:value aman.

  function toast(message: string, type: TxType = "success") {
    notify({ message, type, title: "Slot Pengantaran" });
  }
  function confirm(o: Order) {
    const d = slotDraft[o.id];
    const slot = buildSlot(d?.start ?? "", d?.end ?? "");
    const err = shop.confirmSlot(o.id, COURIER.actor, slot);
    if (err) {
      toast(err, "warn");
      return;
    }
    slotDraft = { ...slotDraft, [o.id]: { start: "", end: "" } };
    toast(`Slot ${o.id} dikonfirmasi`);
  }
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">Slot Confirmation</h1>
  <p class="text-sm text-muted-foreground">Notifikasi 3 tahap kurangi waktu tunggu</p>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each stages as s, i (s.step)}
      <div class="rounded-2xl border bg-card p-5">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] text-xs font-semibold text-white">{i + 1}</span>
          <span class="hub-label text-xs text-muted-foreground">{s.en}</span>
        </div>
        <p class="kpi-value mt-3 text-sm">{s.step}</p>
        <p class="mt-1 text-xs text-muted-foreground">{s.desc}</p>
      </div>
    {/each}
  </div>

  <!-- Konfirmasi slot untuk pesanan nyata -->
  <section class="rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p class="text-base font-semibold">Slot pengantaran pesanan (nyata)</p>
        <p class="text-[13.5px] text-muted-foreground">Tetapkan jendela waktu antar; pembeli melihat slot terkonfirmasi di halaman pesanannya.</p>
      </div>
      <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">Buka tugas pengantaran</a>
    </div>

    {#if pending.length === 0 && confirmed.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p class="text-sm font-semibold text-foreground">Belum ada pesanan aktif</p>
        <p class="mt-1 text-xs text-muted-foreground">Pesanan dari checkout pembeli akan muncul di sini untuk dikonfirmasi slotnya.</p>
      </div>
    {:else}
      {#if pending.length > 0}
        <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Menunggu slot</p>
        <ul class="mt-2 space-y-2">
          {#each pending as o (o.id)}
            <li class="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3">
              <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
              <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city} · ETA ± {etaForCity(o.address.city)} mnt</span>
              <div class="flex items-center gap-2">
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
                <button type="button" onclick={() => confirm(o)} class="rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent">Konfirmasi</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}

      {#if confirmed.length > 0}
        <p class="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Slot terkonfirmasi</p>
        <ul class="mt-2 space-y-2">
          {#each confirmed as o (o.id)}
            <li class="flex flex-wrap items-center gap-3 rounded-xl border border-success/40 bg-success/5 px-4 py-3">
              <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
              <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city}</span>
              <span class="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">{o.slot}</span>
              <span class="text-[11px] text-muted-foreground">{ORDER_STATUS_LABEL[o.status]}</span>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </section>

  <div class="rounded-2xl border-l-4 border-chart-2 bg-muted/30 p-4 text-sm">
    Individual attempt makan 10-20 menit saat akses sulit; percobaan gagal berarti paket kembali ke titik drop. Slot confirmation + notifikasi bertahap menaikkan first-attempt success rate.
  </div>

  <div class="space-y-3">
    {#each quotes as q (q.city)}
      <blockquote class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm italic">
        &ldquo;{q.quote}&rdquo;
        <span class="mt-1 block text-xs not-italic text-muted-foreground">dari Kurir {q.city}</span>
      </blockquote>
    {/each}
    {#if quotesLoaded && quotes.length === 0}
      <p class="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">Kutipan kurir tidak tersedia (backend offline).</p>
    {/if}
  </div>
</div>
