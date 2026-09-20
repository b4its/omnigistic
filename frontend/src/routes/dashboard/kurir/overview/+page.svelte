<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type Insights } from "$lib/api";
  import { notify } from "$lib/toast";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { shop, codAtRiskCandidates, type Order } from "$lib/stores/shop";
  import { formatRupiah } from "$lib/shop/catalog";
  import { numId } from "$lib/utils";
  import RoleHubLinks from "$lib/components/RoleHubLinks.svelte";

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
    if (userTriggered) notify({ message: m.ko2t1(), type: "info", title: m.kv2t1() });
    try {
      [routes, { greeting, insights }] = await Promise.all([
        api.routes().catch(() => []),
        api.insights(m.ko2t2()).catch(() => ({ greeting: "", insights: [] }))
      ]);
      if (userTriggered) notify({ message: "Ringkasan dimuat ulang", type: "success", title: m.ko2t3() });
    } catch {
      failed = true;
      if (userTriggered) notify({ message: m.ko2t4(), type: "error", title: m.ko2t3() });
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
          { label: m.ko2t5(), value: String(active), sub: `${delivered} terkirim · ${orders.length} total`, accent: "var(--color-primary)" },
          { label: "Tunai COD tertagih", value: formatRupiah(cashDue), sub: m.ko2t6(), accent: "var(--color-destructive-foreground)" },
          { label: m.ko2t7(), value: String(pendingSlots), sub: m.ko2t8(), accent: "var(--color-warning-foreground)" },
          { label: "Kandidat PUDO", value: String(toPudo), sub: "COD berisiko", accent: "var(--color-chart-4)" }
        ]
      : routes.length
        ? [
            { label: "Rute Kunjungan COD", value: cod ? `${cod.durationMin} menit` : "—", sub: m.kv2t2(), accent: "var(--color-destructive-foreground)" },
            { label: "Rute Non-COD", value: nonCod ? `${nonCod.durationMin} menit` : "—", sub: m.kv2t2(), accent: "var(--color-success-foreground)" },
            // Produktivitas & hambatan DITURUNKAN dari data kasus (bukan hardcode).
            { label: m.ko3t3(), value: cod ? m.ko3t1({ v: numId(cod.productivity, 2) }) : "—", sub: nonCod ? m.ko3t2b({ v: numId(nonCod.productivity, 2) }) : "—" },
            { label: "Hambatan", value: cod && nonCod && nonCod.durationMin ? `+${numId((cod.durationMin / nonCod.durationMin - 1) * 100, 0)}%` : "—", sub: m.kv2t3() }
          ]
        : []
  );
</script>

{#if loaded && (routes.length || hasReal || failed)}
  <RoleOverview role={m.ko2t2()} kpi={kpi} greeting={greeting} insights={insights}>
    {#snippet chart()}
      {#if hasReal}
        <div class="space-y-3">
          <p class="text-sm font-medium">{m.ok01()}</p>
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
    <p class="text-sm font-semibold text-foreground">{m.ok02()}</p>
    <p class="mt-1 text-xs text-muted-foreground">{m.ok03()}</p>
    <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">{m.ok04()}</button>
  </div>
{:else}
  <div class="space-y-5">
    <div class="h-24 animate-pulse rounded-2xl border border-border bg-card/60"></div>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}
    </div>
  </div>
{/if}

<RoleHubLinks
  links={[
    { label: m.hbl_tasks(), href: "/dashboard/kurir/tasks", icon: "map", desc: m.hbk01() },
    { label: "Route Clustering", href: "/dashboard/kurir/routes", icon: "compass", desc: m.hbk02() },
    { label: "Predictive COD", href: "/dashboard/kurir/cod-risk", icon: "currency", desc: m.hbk03() },
    { label: "COD Intelligence", href: "/dashboard/kurir/cod-intel", icon: "trend", desc: m.hbk04() },
    { label: "COD Cash Risk", href: "/dashboard/kurir/cod-cash", icon: "wallet", desc: m.hbk05() },
    { label: m.hbl_buyer(), href: "/dashboard/predictive-cod", icon: "users", desc: m.hbk06() },
    { label: m.ko2t9(), href: "/dashboard/kurir/slot", icon: "bell", desc: m.hbk07() },
    { label: "Digital Payment", href: "/dashboard/kurir/payment", icon: "shield", desc: m.hbk08() },
    { label: "PUDO Network", href: "/dashboard/kurir/pudo", icon: "map", desc: m.hbk09() },
    { label: "Nigi AI", href: "/dashboard/kurir/assistant", icon: "chat", desc: m.hbk10() }
  ]}
/>
