<script lang="ts">
  import { resolveHref } from "$lib/utils";

  const roles = [
    { slug: "pusat", initials: "D", name: "Dalila", role: "Decision Maker Pusat", desc: "KPI finansial, Digital Twin, utilisasi 23 hub, ekspansi." },
    { slug: "hub", initials: "M", name: "Marwah", role: "Hub Manager Bandung", desc: "Forecast, load balancing, kapasitas, alert dini." },
    { slug: "kurir", initials: "B", name: "Baits", role: "Courier Jakarta", desc: "Clustering rute, Predictive COD, slot, pembayaran digital." },
    { slug: "data", initials: "V", name: "Virgiawan", role: "Data & IT", desc: "Address Intelligence, komplain, control tower, emisi." },
    { slug: "customer", initials: "S", name: "Sari", role: "Pembeli", desc: "Belanja di e-commerce, checkout COD, lacak pengantaran." },
    { slug: "seller", initials: "R", name: "Rina", role: "Penjual", desc: "Analitik laba/rugi, margin produk, skor pelanggan." }
  ];
</script>

<svelte:head><title>Pilih Portal · Omnigistic</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Pilih <span class="text-gradient">portal peran</span></h1>
    <a href={resolveHref("/")} class="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">&larr; Halaman utama</a>
  </div>
  <p class="text-sm text-muted-foreground">Enam sudut pandang atas satu sumber kebenaran kasus GC Logistics.</p>
  <div class="grid gap-4 sm:grid-cols-2">
    {#each roles as r (r.slug)}
      <a href={resolveHref(`/dashboard/${r.slug}/overview`)} class="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:shadow-[0_0_30px_-10px_var(--glow)]">
        <div class="flex items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--bitcoin-deep)] to-[var(--bitcoin)] font-heading text-sm font-bold text-white shadow-[0_0_14px_-3px_var(--glow)]">{r.initials}</span>
          <span class="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{r.slug}</span>
        </div>
        <p class="font-heading text-sm font-semibold text-foreground">{r.name} · <span class="font-normal text-muted-foreground">{r.role}</span></p>
        <p class="text-[15px] leading-relaxed text-muted-foreground">{r.desc}</p>
      </a>
    {/each}
  </div>
</div>
