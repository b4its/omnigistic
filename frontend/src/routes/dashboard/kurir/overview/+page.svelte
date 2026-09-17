<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Insights } from "$lib/api";
  import { notify } from "$lib/toast";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { shop, codAtRiskCandidates, type Order } from "$lib/stores/shop";
  import { formatRupiah } from "$lib/shop/catalog";
  import { numId } from "$lib/utils";

  let routes = $state<Array<{ type: string; durationMin: number; productivity: number }>>([]);
  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  /** Pesanan NYATA yang ditangani kurir (dari store bersama). */
  let orders = $state<Order[]>([]);

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    void load();
    return unsub;
  });

  async function load(userTriggered = false) {
    failed = false;
    if (userTriggered) notify({ message: "Memuat ulang ringkasan kurir…", type: "info", title: "Ringkasan Kurir" });
    try {
      [routes, { greeting, insights }] = await Promise.all([
        api.routes().catch(() => []),
        api.insights("KURIR").catch(() => ({ greeting: "", insights: [] }))
      ]);
      if (userTriggered) notify({ message: "Ringkasan dimuat ulang", type: "success", title: "Ringkasan Kurir" });
    } catch {
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat ringkasan kurir", type: "error", title: "Ringkasan Kurir" });
    }
    loaded = true;
  }

  const cod = $derived(routes.find((r) => r.type === "COD"));
  const nonCod = $derived(routes.find((r) => r.type === "Non-COD"));

  // ── KPI dari pesanan nyata (aksi kurir) ──
  const active = $derived(orders.filter((o) => o.status !== "terkirim").length);
  const delivered = $derived(orders.filter((o) => o.status === "terkirim").length);
  const pendingSlots = $derived(orders.filter((o) => o.status !== "terkirim" && !o.slot).length);
  const cashDue = $derived(orders.filter((o) => o.payment === "COD" && !o.codCollected).reduce((s, o) => s + o.total, 0));
  const toPudo = $derived(codAtRiskCandidates(orders).length);
  const hasReal = $derived(orders.length > 0);

  const kpi = $derived(
    hasReal
      ? [
          { label: "Tugas aktif", value: String(active), sub: `${delivered} terkirim · ${orders.length} total`, accent: "var(--color-primary)" },
          { label: "Tunai COD tertagih", value: formatRupiah(cashDue), sub: "belum diterima", accent: "var(--color-destructive-foreground)" },
          { label: "Slot belum dikonfirmasi", value: String(pendingSlots), sub: "pesanan aktif", accent: "var(--color-warning-foreground)" },
          { label: "Kandidat PUDO", value: String(toPudo), sub: "COD berisiko", accent: "var(--color-chart-4)" }
        ]
      : routes.length
        ? [
            { label: "Rute Kunjungan COD", value: cod ? `${cod.durationMin} menit` : "—", sub: "8 paket, studi kasus", accent: "var(--color-destructive-foreground)" },
            { label: "Rute Non-COD", value: nonCod ? `${nonCod.durationMin} menit` : "—", sub: "8 paket, studi kasus", accent: "var(--color-success-foreground)" },
            // Produktivitas & hambatan DITURUNKAN dari data kasus (bukan hardcode).
            { label: "Produktivitas COD", value: cod ? `${numId(cod.productivity, 2)}/jam` : "—", sub: nonCod ? `vs ${numId(nonCod.productivity, 2)} non-COD` : "—" },
            { label: "Hambatan", value: cod && nonCod && nonCod.durationMin ? `+${numId((cod.durationMin / nonCod.durationMin - 1) * 100, 0)}%` : "—", sub: "COD lebih lama dari non-COD" }
          ]
        : []
  );
</script>

{#if loaded && (routes.length || hasReal || failed)}
  <RoleOverview role="KURIR" kpi={kpi} greeting={greeting} insights={insights}>
    {#snippet chart()}
      {#if hasReal}
        <div class="space-y-3">
          <p class="text-sm font-medium">Status pesanan aktif (data nyata)</p>
          <div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            {#each [
              { k: "dikemas", l: "Dikemas" },
              { k: "dijemput", l: "Dijemput" },
              { k: "transit", l: "Transit" },
              { k: "dikirim", l: "Diantar" },
              { k: "terkirim", l: "Terkirim" }
            ] as s (s.k)}
              <div class="rounded-xl border border-border bg-background/40 p-3 text-center">
                <p class="text-lg font-bold tabular-nums text-foreground">{orders.filter((o) => o.status === s.k).length}</p>
                <p class="text-[11px] text-muted-foreground">{s.l}</p>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <EChart
          option={barChart(
            routes.map((r) => r.type),
            [{ name: "Durasi (menit)", data: routes.map((r) => r.durationMin) }]
          )}
          height={220}
          label="Perbandingan durasi rute COD vs Non-COD"
        />
      {/if}
    {/snippet}
  </RoleOverview>
{:else if failed && !hasReal}
  <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
    <p class="text-sm font-semibold text-foreground">Gagal memuat ringkasan kurir</p>
    <p class="mt-1 text-xs text-muted-foreground">Backend offline. Buat pesanan dari portal Customer atau coba lagi.</p>
    <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">Coba lagi</button>
  </div>
{:else}
  <div class="space-y-5">
    <div class="h-24 animate-pulse rounded-2xl border border-border bg-card/60"></div>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}
    </div>
  </div>
{/if}
