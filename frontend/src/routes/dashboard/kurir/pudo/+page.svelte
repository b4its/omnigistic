<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import GlitterIcon from "$lib/components/ui/GlitterIcon.svelte";
  import DeliveryMap from "$lib/map/DeliveryMap.svelte";
  import { resolveHref } from "$lib/utils";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, codAtRiskCandidates, progressForStatus, type Order } from "$lib/stores/shop";
  import { COURIER, HUB_LABEL, COD_DECISION_LABEL, PUDO_POINTS, pudosForCity } from "$lib/logistics";
  import { notify } from "$lib/toast";

  const network = [
    { label: m.pd2t1(), value: m.pd4t3(), sub: m.pd4t4() },
    { label: m.pd4t5(), value: m.pd4t6(), sub: m.pd2t2() },
    { label: m.pd2t3(), value: m.pd4t7(), sub: m.pd4t8() }
  ];

  const kpi = [
    { kpi: m.pd2t4(), baseline: "138 menit", target: "≤100 menit" },
    { kpi: m.pd2t5(), baseline: m.pd2t6(), target: m.pd2t7() },
    { kpi: m.pd2t8(), baseline: "baseline", target: m.pd4t9() }
  ];

  const steps = [
    { n: 1, t: "Predictive COD memberi skor", d: m.pd2t9() },
    { n: 2, t: m.pd2t10(), d: m.pd4t10() },
    { n: 3, t: m.pd4t11(), d: m.pd2t11() }
  ];

  /** Pesanan NYATA yang dialihkan ke PUDO (dari store bersama). */
  let orders = $state<Order[]>([]);
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    return unsub;
  });

  const routed = $derived(orders.filter((o) => o.routedToPudo));
  /** Kandidat PUDO: COD berisiko belum dialihkan (predikat bersama di store). */
  const candidates = $derived(codAtRiskCandidates(orders));

  /** Kota contoh untuk peta: pesanan PUDO/kandidat pertama, atau Jakarta bila belum ada. */
  const focusOrder = $derived(routed[0] ?? candidates[0] ?? null);
  const mapCity = $derived(focusOrder?.address.city ?? "Jakarta");
  /** Progres kurir di peta diturunkan dari status pesanan fokus (bukan hardcode). */
  const mapProgress = $derived(focusOrder ? progressForStatus(focusOrder.status) : 0.75);

  function reroute(o: Order) {
    shop.routeToPudo(o.id, COURIER.actor);
    notify({ message: m.cr4t1({ id: o.id }), type: "info", title: "PUDO" });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.kp201()}</h1>
    <span class="hub-label text-muted-foreground">{m.kp202()}</span>
  </div>

  <!-- Peta titik PUDO + rekomendasi drop kurir -->
  <section class="space-y-3 rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p class="text-base font-semibold">{m.kp203()}</p>
        <p class="text-[13.5px] text-muted-foreground">
          {m.kp204()} <span class="font-semibold" style="color:#7c3aed">{m.kp205()}</span> {m.kp206()}
        </p>
      </div>
      <span class="rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground">{m.pd4t1({ n: PUDO_POINTS.length })}</span>
    </div>
    <DeliveryMap progress={mapProgress} city={mapCity} originLabel={HUB_LABEL} destLabel={m.pdm1({ city: mapCity })} height={380} role={m.pd2t12()} routeIntel />
    <p class="text-[11px] text-muted-foreground">{m.pd3f1()} {mapCity} ({pudosForCity(mapCity).length} PUDO). {m.pd4t2()}</p>
  </section>

  <!-- Paket nyata untuk PUDO -->
  <section class="rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p class="text-base font-semibold">{m.kp207()}</p>
        <p class="text-[13.5px] text-muted-foreground">{m.kp208()}</p>
      </div>
      <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">{m.kp209()}</a>
    </div>

    {#if routed.length === 0 && candidates.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p class="text-sm font-semibold text-foreground">{m.kp210()}</p>
        <p class="mt-1 text-xs text-muted-foreground">{m.kp211()}</p>
      </div>
    {:else}
      <ul class="mt-4 space-y-2">
        {#each routed as o (o.id)}
          <li class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city} · {formatRupiah(o.total)}</span>
            <span class="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">{m.kp212()}</span>
          </li>
        {/each}
        {#each candidates as o (o.id)}
          <li class="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3">
            <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city} · {formatRupiah(o.total)}</span>
            <span class="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning-foreground">{COD_DECISION_LABEL[o.codDecision ?? ""] ?? "Berisiko"}</span>
            <button type="button" onclick={() => reroute(o)} class="rounded-lg border border-warning/50 px-3 py-1.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/10">{m.kp213()}</button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
        <GlitterIcon cls="h-5 w-5" />
      </span>
      <div class="min-w-0">
        <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">{m.kp214()}</p>
        <p class="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
          {m.kp215()}
        </p>
      </div>
    </div>
  </div>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each network as n (n.label)}
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">{n.label}</p>
        <p class="kpi-value mt-1 text-xl text-primary">{n.value}</p>
        <p class="mt-0.5 text-xs text-muted-foreground">{n.sub}</p>
      </div>
    {/each}
  </div>

  <div class="rounded-2xl border border-border bg-card p-5">
    <p class="mb-4 text-sm font-medium">{m.kp216()}</p>
    <ol class="space-y-4">
      {#each steps as s (s.n)}
        <li class="flex gap-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)]">{s.n}</span>
          <div>
            <p class="text-sm font-semibold">{s.t}</p>
            <p class="mt-0.5 text-[15px] text-muted-foreground">{s.d}</p>
          </div>
        </li>
      {/each}
    </ol>
  </div>

  <div class="overflow-x-auto rounded-2xl border border-border bg-card">
    <div class="border-b border-border bg-muted/40 px-5 py-3">
      <p class="text-sm font-medium">{m.kp217()}</p>
    </div>
    <table class="w-full min-w-[480px] text-sm">
      <caption class="sr-only">{m.kp218()}</caption>
      <thead>
        <tr class="border-b bg-muted/30 text-left text-xs text-muted-foreground">
          <th scope="col" class="px-5 py-2">{m.kp219()}</th>
          <th scope="col" class="px-5 py-2">{m.kp220()}</th>
          <th scope="col" class="px-5 py-2">{m.kp221()}</th>
        </tr>
      </thead>
      <tbody>
        {#each kpi as k (k.kpi)}
          <tr class="border-b last:border-0">
            <td class="px-5 py-2.5">{k.kpi}</td>
            <td class="px-5 py-2.5 text-muted-foreground line-through">{k.baseline}</td>
            <td class="px-5 py-2.5 font-semibold text-success-foreground">{k.target}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>