<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { resolveHref } from "$lib/utils";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, type Order } from "$lib/stores/shop";
  import { COURIER, COD_DECISION_LABEL } from "$lib/logistics";
  import { notify } from "$lib/toast";

  const network = [
    { label: "PUDO GC saat ini", value: "3.200 titik", sub: "self-built + agen" },
    { label: "Indomaret (kandidat mitra)", value: "20.000+ gerai", sub: "jangkauan per kecamatan" },
    { label: "Jangkauan total proyeksi", value: "10x lipat", sub: "tanpa membangun satu outlet pun" }
  ];

  const kpi = [
    { kpi: "Waktu rute COD (8 paket)", baseline: "138 menit", target: "≤100 menit" },
    { kpi: "Produktivitas kurir COD", baseline: "3,48/jam", target: "≥4,8/jam" },
    { kpi: "Kapasitas kurir COD", baseline: "baseline", target: "+38% tanpa rekrutmen" }
  ];

  const steps = [
    { n: 1, t: "Predictive COD memberi skor", d: "Model risiko membagi paket: aman → antar normal; tidak aman → PUDO." },
    { n: 2, t: "Paket berisiko diarahkan ke PUDO", d: "Penerima memilih gerai mitra terdekat via aplikasi (notifikasi tahap 3)." },
    { n: 3, t: "Mitra ritel jadi node bayar-ambil", d: "Komisi per transaksi, tunai tetap tersedia, biaya GC variabel (pay-per-use)." }
  ];

  /** Pesanan NYATA yang dialihkan ke PUDO (dari store bersama). */
  let orders = $state<Order[]>([]);
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    return unsub;
  });

  const routed = $derived(orders.filter((o) => o.routedToPudo));
  const candidates = $derived(
    orders.filter((o) => !o.routedToPudo && o.payment === "COD" && (o.codDecision === "pudo" || o.codDecision === "pre-payment"))
  );

  function reroute(o: Order) {
    shop.routeToPudo(o.id, COURIER.actor);
    notify({ message: `Pesanan ${o.id} dialihkan ke PUDO`, type: "info", title: "PUDO" });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">PUDO Network</h1>
    <span class="hub-label text-muted-foreground">Pick-Up Drop-Off</span>
  </div>

  <!-- Paket nyata untuk PUDO -->
  <section class="rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p class="text-base font-semibold">Paket COD berisiko (nyata)</p>
        <p class="text-[13.5px] text-muted-foreground">Pesanan pembeli yang disarankan dialihkan ke gerai mitra (PUDO) alih-alih antar ke alamat.</p>
      </div>
      <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">Buka tugas pengantaran</a>
    </div>

    {#if routed.length === 0 && candidates.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p class="text-sm font-semibold text-foreground">Belum ada paket dialihkan ke PUDO</p>
        <p class="mt-1 text-xs text-muted-foreground">Paket muncul di sini bila pembeli membuat pesanan COD dan model menandainya berisiko (pudo / pre-payment).</p>
      </div>
    {:else}
      <ul class="mt-4 space-y-2">
        {#each routed as o (o.id)}
          <li class="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city} · {formatRupiah(o.total)}</span>
            <span class="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success-foreground">Dialihkan ke PUDO</span>
          </li>
        {/each}
        {#each candidates as o (o.id)}
          <li class="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3">
            <span class="font-mono text-xs text-muted-foreground">{o.id}</span>
            <span class="min-w-0 flex-1 truncate text-sm text-foreground">{o.address.recipient} · {o.address.city} · {formatRupiah(o.total)}</span>
            <span class="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning-foreground">{COD_DECISION_LABEL[o.codDecision ?? ""] ?? "Berisiko"}</span>
            <button type="button" onclick={() => reroute(o)} class="rounded-lg border border-warning/50 px-3 py-1.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/10">Alihkan ke PUDO</button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Icon name="chat" cls="h-5 w-5" weight="fill" />
      </span>
      <div class="min-w-0">
        <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">Saran Nigi AI</p>
        <p class="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
          Kemitraan ritel (Indomaret) memperluas PUDO tanpa capex: GC membayar komisi per transaksi, bukan biaya tetap. Segmen unbanked tetap terlayani karena tunai tetap tersedia di gerai.
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
    <p class="mb-4 text-sm font-medium">Cara kerja</p>
    <ol class="space-y-4">
      {#each steps as s (s.n)}
        <li class="flex gap-3">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{s.n}</span>
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
      <p class="text-sm font-medium">KPI Akar 3 (last-mile manual-cash)</p>
    </div>
    <table class="w-full min-w-[480px] text-sm">
      <caption class="sr-only">Tabel KPI Akar 3: baseline versus target</caption>
      <thead>
        <tr class="border-b bg-muted/30 text-left text-xs text-muted-foreground">
          <th scope="col" class="px-5 py-2">KPI</th>
          <th scope="col" class="px-5 py-2">Baseline</th>
          <th scope="col" class="px-5 py-2">Target</th>
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