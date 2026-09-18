<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import Icon from "$lib/components/Icon.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { shop, ORDER_STATUS_LABEL, type Order } from "$lib/stores/shop";
  import { COURIER, CITIES, HUB_LABEL, etaForCity, distanceForCity, type City } from "$lib/logistics";
  import DeliveryMap from "$lib/map/DeliveryMap.svelte";
  import { notify } from "$lib/toast";

  let route = $state<Array<{ type: string; packages: number; distanceKm: number; durationMin: number; productivity: number }>>([]);
  let quotes = $state<Array<{ city: string; quote: string }>>([]);
  let loaded = $state(false);
  let failed = $state(false);
  let selectedCity = $state<City>("Bogor");
  let showRouteMapSection = $state(true);


  /** Aktivitas pengantaran nyata (cluster kurir dari pesanan aktual). */
  let orders = $state<Order[]>([]);

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    void load();
    return unsub;
  });

  async function load(userTriggered = false) {
    failed = false;
    if (userTriggered) notify({ message: "Memuat ulang data rute…", type: "info", title: "Route Clustering" });
    try {
      [route, quotes] = await Promise.all([api.routes(), api.courierQuotes()]);
      if (userTriggered) notify({ message: "Data rute dimuat ulang", type: "success", title: "Route Clustering" });
    } catch {
      route = [];
      quotes = [];
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat data rute", type: "error", title: "Route Clustering" });
    }
    loaded = true;
  }

  // Cluster nyata: kelompokkan pesanan aktif per status menjadi "rute" kurir.
  const active = $derived(orders.filter((o) => o.status !== "terkirim"));
  const STAGE_KEYS: Array<{ k: Order["status"]; l: string }> = [
    { k: "dikemas", l: ORDER_STATUS_LABEL.dikemas },
    { k: "dijemput", l: ORDER_STATUS_LABEL.dijemput },
    { k: "transit", l: ORDER_STATUS_LABEL.transit },
    { k: "dikirim", l: ORDER_STATUS_LABEL.dikirim }
  ];
  const byStatus = $derived(
    STAGE_KEYS.map((s) => ({ type: s.l, n: active.filter((o) => o.status === s.k).length })).filter((x) => x.n > 0)
  );
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Route Clustering</h1>
    <span class="hub-label text-muted-foreground">KURIR · {COURIER.name}</span>
  </div>

  <!-- Cluster pengantaran nyata -->
  {#if byStatus.length > 0}
    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-base font-semibold">Cluster pengantaran aktif (nyata)</p>
      <p class="text-[13.5px] text-muted-foreground">Pesanan yang sedang kamu tangani, dikelompokkan per tahap rute.</p>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {#each byStatus as b (b.type)}
          <div class="rounded-xl border border-border bg-background/40 p-4">
            <p class="hub-label text-xs text-muted-foreground">{b.type}</p>
            <p class="kpi-value mt-1 text-2xl">{b.n}</p>
            <p class="text-xs text-muted-foreground">paket</p>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Peta Rute Lapangan & Simulasi Pengantaran Kurir -->
  <section class="space-y-4 rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <p class="text-base font-semibold">Peta Rute &amp; Simulasi Pengantaran Kurir</p>
          <span class="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
            Klaster {selectedCity}
          </span>
        </div>
        <p class="text-[13.5px] text-muted-foreground">
          Eksplorasi koridor pengantaran last-mile per wilayah. Jalankan simulasi untuk menganalisis waktu tempuh, kepadatan jalan, dan titik PUDO.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Tab Kota Klaster -->
        <div class="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          {#each CITIES as c}
            <button
              type="button"
              onclick={() => (selectedCity = c)}
              aria-pressed={selectedCity === c}
              class="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors {selectedCity === c ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
            >
              {c}
            </button>
          {/each}
        </div>

        <!-- Tombol Buka/Tutup Seluruh Peta Rute & Simulasi -->
        <button
          type="button"
          onclick={() => (showRouteMapSection = !showRouteMapSection)}
          aria-expanded={showRouteMapSection}
          aria-label={showRouteMapSection ? "Tutup Peta Rute & Simulasi" : "Buka Peta Rute & Simulasi"}
          class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" />
          <span>{showRouteMapSection ? "Tutup Peta Rute" : "Buka Peta Rute"}</span>
        </button>
      </div>
    </div>

    {#if showRouteMapSection}
      <!-- Peta DeliveryMap dengan Kanvas Bersih & Widget Eksternal -->
      <DeliveryMap
        progress={0.35}
        city={selectedCity}
        originLabel={HUB_LABEL}
        destLabel={`Klaster ${selectedCity}`}
        etaMin={etaForCity(selectedCity)}
        height={400}
        role="KURIR"
        routeIntel
        showSimulation={true}
        compact={false}
      />
      <p class="text-[11px] text-muted-foreground">
        Rute {HUB_LABEL} → {selectedCity} ({distanceForCity(selectedCity)} km · perkiraan waktu tempuh normal {etaForCity(selectedCity)} menit).
        Bilah simulasi, analisis rute, dan legenda dapat dibuka-tutup secara mandiri di bawah peta.
      </p>
    {/if}
  </section>

  {#if failed && !route.length}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat data rute studi kasus</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Cluster pengantaran nyata di atas tetap tampil bila ada pesanan.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">Coba lagi</button>
    </div>
  {:else if loaded && route.length}
    <div class="grid gap-6 sm:grid-cols-2">
      {#each route as t (t.type)}
        <div class="rounded-2xl border border-border bg-card p-5 {t.type === 'COD' ? 'border-l-4 border-l-chart-4' : ''}">
          <p class="hub-label text-xs text-muted-foreground">{t.type} · studi kasus</p>
          <p class="kpi-value mt-2 text-3xl">{t.durationMin} min</p>
          <p class="mt-1 text-sm text-muted-foreground">{t.packages} paket · {t.distanceKm} km</p>
          <p class="kpi-value mt-2 text-lg text-primary">{t.productivity}/jam</p>
        </div>
      {/each}
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-sm font-medium">COD vs Non-COD, selisih (studi kasus)</p>
      <EChart
        option={barChart(
          route.map((r) => r.type),
          [{ name: "Durasi (menit)", data: route.map((r) => r.durationMin) }]
        )}
        height={200}
        label="Perbandingan durasi rute COD dan Non-COD"
      />
    </div>
  {:else if !failed}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}

  <div class="space-y-3">
    {#each quotes as q (q.city)}
      <blockquote class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm italic">
        &ldquo;{q.quote}&rdquo;
        <span class="mt-1 block text-xs not-italic text-muted-foreground">dari Kurir {q.city}</span>
      </blockquote>
    {/each}
    {#if loaded && quotes.length === 0}
      <p class="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground"><Icon name="bell" cls="h-4 w-4" /> Kutipan kurir tidak tersedia (backend offline).</p>
    {/if}
  </div>
</div>
