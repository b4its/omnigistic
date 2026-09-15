<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { customerScores, segmentCounts, avgCustomerScore, type CustomerScore } from "$lib/shop/analytics";
  import { shop, type Order } from "$lib/stores/shop";
  import { liveCustomers } from "$lib/shop/orderbook";

  const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  // Pelanggan nyata dari pesanan checkout digabung dengan basis demo.
  let liveRecs = $state<ReturnType<typeof liveCustomers>>([]);
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s: { orders: Order[] }) => (liveRecs = liveCustomers(s.orders)));
    return unsub;
  });

  const customers = $derived(customerScores(liveRecs));
  const segments = $derived(segmentCounts(liveRecs));
  const avgScore = $derived(avgCustomerScore(liveRecs));

  /** Komponen skor untuk satu pelanggan (dipakai di kartu). */
  const componentsFor = (c: CustomerScore) => [
    { label: "Recency", val: c.recency },
    { label: "Frequency", val: c.frequency },
    { label: "Monetary", val: c.monetary },
    { label: "Risiko", val: c.risk }
  ];

  const SEGMENTS = ["Champion", "Loyal", "Potensial", "Berisiko", "Pasif"] as const;
  let filter = $state<(typeof SEGMENTS)[number] | "Semua">("Semua");

  const filtered = $derived(filter === "Semua" ? customers : customers.filter((c) => c.segment === filter));

  const segmentTone: Record<CustomerScore["segment"], string> = {
    Champion: "bg-success/15 text-success-foreground",
    Loyal: "bg-chart-2/15 text-foreground",
    Potensial: "bg-warning/15 text-warning-foreground",
    Berisiko: "bg-destructive/15 text-destructive-foreground",
    Pasif: "bg-muted text-muted-foreground"
  };
  const segmentColor: Record<CustomerScore["segment"], string> = {
    Champion: "var(--color-chart-1)",
    Loyal: "var(--color-chart-2)",
    Potensial: "var(--color-chart-3)",
    Berisiko: "var(--color-chart-5)",
    Pasif: "var(--color-muted-foreground)"
  };
</script>

<div class="space-y-6">
  <header class="space-y-1">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Analisis Pelanggan</h1>
    <p class="text-sm text-muted-foreground">Skor 0–100 dari Recency, Frequency, Monetary, dan risiko gagal antar.</p>
  </header>

  <!-- Ringkasan -->
  <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Rata-rata skor</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{avgScore}<span class="text-base font-medium text-muted-foreground">/100</span></p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Total pelanggan</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{customers.length}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Champion + Loyal</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-success-foreground">{segments.Champion + segments.Loyal}</p>
    </div>
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-medium text-muted-foreground">Berisiko</p>
      <p class="mt-2 text-2xl font-bold tabular-nums text-destructive-foreground">{segments.Berisiko}</p>
    </div>
  </section>

  <!-- Filter segmen -->
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      onclick={() => (filter = "Semua")}
      aria-pressed={filter === "Semua"}
      class="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors {filter === 'Semua' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}"
    >Semua ({customers.length})</button>
    {#each SEGMENTS as s (s)}
      <button
        type="button"
        onclick={() => (filter = s)}
        aria-pressed={filter === s}
        class="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors {filter === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}"
      >{s} ({segments[s]})</button>
    {/each}
  </div>

  <!-- Daftar pelanggan -->
  {#if filtered.length === 0}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">Tidak ada pelanggan di segmen ini.</div>
  {:else}
    <ul class="space-y-3">
      {#each filtered as c (c.record.id)}
        {@const components = componentsFor(c)}
        <li class="rounded-2xl border border-border bg-card p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
            <!-- Identitas + skor -->
            <div class="flex flex-1 items-center gap-4">
              <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style="background:color-mix(in srgb, {segmentColor[c.segment]} 16%, var(--color-card))">
                <span class="text-lg font-bold" style="color:{segmentColor[c.segment]}">{c.score.toFixed(0)}</span>
              </div>
              <div class="min-w-0">
                <p class="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {c.record.name}
                  <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold {segmentTone[c.segment]}">{c.segment}</span>
                </p>
                <p class="text-xs text-muted-foreground">{c.record.city} · {c.record.orders} pesanan · {rupiah(c.record.spend)}</p>
                <p class="mt-1 text-xs text-muted-foreground">Terakhir belanja {c.record.daysSinceLast} hari lalu · bayar {c.record.payMethod}</p>
              </div>
            </div>

            <!-- Komponen skor -->
            <div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[360px]">
              {#each components as comp (comp.label)}
                <div class="rounded-xl border border-border bg-muted/30 p-2.5">
                  <p class="text-[10.5px] uppercase tracking-wide text-muted-foreground">{comp.label}</p>
                  <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full" style="width:{comp.val}%;background:{comp.label === 'Risiko' ? 'var(--color-destructive)' : 'var(--color-primary)'}"></div>
                  </div>
                  <p class="mt-1 text-[11px] font-semibold tabular-nums text-foreground">{comp.val.toFixed(0)}</p>
                </div>
              {/each}
            </div>
          </div>

          <!-- Rekomendasi aksi -->
          <div class="mt-4 flex items-start gap-2 rounded-xl bg-accent/50 px-4 py-3 text-sm">
            <Icon name="chat" cls="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span class="text-foreground"><strong class="font-semibold">Rekomendasi:</strong> {c.action}</span>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <p class="text-xs text-muted-foreground">
    Skor = 25% Recency + 25% Frequency + 35% Monetary − 15% risiko gagal antar. Data pelanggan bersifat demo untuk presentasi.
  </p>
</div>
