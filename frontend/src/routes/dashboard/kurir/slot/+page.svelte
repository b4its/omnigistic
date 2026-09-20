<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import { api } from "$lib/api";
  import { shop, orderStatusLabel, progressForStatus, type Order } from "$lib/stores/shop";
  import { COURIER, remainingEtaMin, buildSlot } from "$lib/logistics";
  import { notify, type ToastType as TxType } from "$lib/toast";

  const stages = [
    { step: "H-1", desc: m.sw2t1(), en: "Notify" },
    { step: "30 sampai 60 menit", desc: "Estimasi tiba + konfirmasi kesiapan", en: "Estimate" },
    { step: "Arrival", desc: m.sl2t1(), en: "Confirm" }
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

  /** Sisa ETA (menit) yang jujur: memperhitungkan progres kurir dari status. */
  function etaLeft(o: Order): number {
    return remainingEtaMin(o.address.city, progressForStatus(o.status));
  }

  function toast(message: string, type: TxType = "success") {
    notify({ message, type, title: m.sl2t2() });
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
  <h1 class="font-heading text-xl font-semibold tracking-tight">{m.ks01()}</h1>
  <p class="text-sm text-muted-foreground">{m.ks02()}</p>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each stages as s, i (s.step)}
      <div class="rounded-2xl border bg-card p-5">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">{i + 1}</span>
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
        <p class="text-base font-semibold">{m.ks03()}</p>
        <p class="text-[13.5px] text-muted-foreground">{m.ks04()}</p>
      </div>
      <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">{m.ks05()}</a>
    </div>

    {#if pending.length === 0 && confirmed.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p class="text-sm font-semibold text-foreground">{m.ks06()}</p>
        <p class="mt-1 text-xs text-muted-foreground">{m.ks07()}</p>
      </div>
    {:else}
      {#if pending.length > 0}
        <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.ks08()}</p>
        <ul class="mt-2 space-y-2">
          {#each pending as o (o.id)}
            <li class="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3">
              <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
              <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city} · ETA sisa ± {etaLeft(o)} menit</span>
              <div class="flex items-center gap-2">
                <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {m.ks09()}
                  <input
                    type="time"
                    bind:value={slotDraft[o.id].start}
                    aria-label={m.sw4t1({ id: o.id })}
                    class="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                  />
                </label>
                <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {m.ks10()}
                  <input
                    type="time"
                    bind:value={slotDraft[o.id].end}
                    aria-label={`Jam selesai slot ${o.id}`}
                    class="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                  />
                </label>
                <button type="button" onclick={() => confirm(o)} class="rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent">{m.ks11()}</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}

      {#if confirmed.length > 0}
        <p class="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.ks12()}</p>
        <ul class="mt-2 space-y-2">
          {#each confirmed as o (o.id)}
            <li class="flex flex-wrap items-center gap-3 rounded-xl border border-success/40 bg-success/5 px-4 py-3">
              <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
              <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city}</span>
              <span class="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">{o.slot}</span>
              <span class="text-[11px] text-muted-foreground">{orderStatusLabel(o.status)}</span>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </section>

  <div class="rounded-2xl border-l-4 border-chart-2 bg-muted/30 p-4 text-sm">
    {m.ks13()}
  </div>

  <div class="space-y-3">
    {#each quotes as q (q.city)}
      <blockquote class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm italic">
        &ldquo;{q.quote}&rdquo;
        <span class="mt-1 block text-xs not-italic text-muted-foreground">{m.sw3f1()} {q.city}</span>
      </blockquote>
    {/each}
    {#if quotesLoaded && quotes.length === 0}
      <p class="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">{m.ks14()}</p>
    {/if}
  </div>
</div>
