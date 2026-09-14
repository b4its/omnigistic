<script lang="ts">
  const roles = [
    { slug: "pusat", initials: "D", name: "Dalila", role: "Decision Maker Pusat", desc: "KPI finansial, Digital Twin, utilisasi 23 hub, ekspansi." },
    { slug: "hub", initials: "M", name: "Marwah", role: "Hub Manager Bandung", desc: "Forecast, load balancing, kapasitas, alert dini." },
    { slug: "kurir", initials: "B", name: "Baits", role: "Courier Jakarta", desc: "Clustering rute, Predictive COD, slot, pembayaran digital." },
    { slug: "data", initials: "V", name: "Virgiawan", role: "Data & IT", desc: "Address Intelligence, komplain, control tower, emisi." }
  ];
</script>

<svelte:head><title>Pilih Portal · Omnigistic</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Pilih portal peran</h1>
    <a href="/" class="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">&larr; Halaman utama</a>
  </div>
  <p class="text-sm text-muted-foreground">Empat sudut pandang atas satu sumber kebenaran kasus GC Logistics.</p>
  <div class="grid gap-4 sm:grid-cols-2">
    {#each roles as r (r.slug)}
      <a href="/dashboard/{r.slug}/overview" class="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40">
        <div class="flex items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">{r.initials}</span>
          <span class="text-[14px] font-semibold uppercase tracking-wider text-muted-foreground">{r.slug}</span>
        </div>
        <p class="text-sm font-semibold text-foreground">{r.name} · <span class="font-normal text-muted-foreground">{r.role}</span></p>
        <p class="text-[15px] leading-relaxed text-muted-foreground">{r.desc}</p>
      </a>
    {/each}
  </div>
</div>
