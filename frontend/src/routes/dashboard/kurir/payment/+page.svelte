<script lang="ts">
  const flow = [
    "Kurir serah tunai",
    "QRIS / digital",
    "Hub rekonsiliasi",
    "Settlement merchant"
  ];
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Digital Payment</h1>
    <span class="hub-label text-muted-foreground">COD settlement</span>
  </div>

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-[15px] text-muted-foreground">
    <span class="font-medium text-foreground">Ilustrasi proses.</span> Halaman ini menggambarkan alur rekonsiliasi, bukan integrasi pembayaran live.
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-2 text-xs font-semibold text-destructive-foreground">Saat ini · manual</p>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Kurir kumpulkan tunai, dicatat &amp; direkonsiliasi sebelum settlement ke merchant. Kompleks, memakan waktu, rawan human error.
      </p>
    </div>
    <div class="rounded-2xl border border-chart-2 bg-card p-5">
      <p class="mb-2 text-xs font-semibold text-chart-2">Omnigistic · digital</p>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Rekonsiliasi otomatis via hub, digital settlement ke merchant. Human error turun -80%, tunai fisik di rute berkurang.
      </p>
    </div>
  </div>

  <div class="rounded-2xl border border-border bg-card p-5">
    <p class="mb-3 text-sm font-medium">Alur settlement</p>
    <div class="flex flex-wrap items-center gap-2">
      {#each flow as s, i (s)}
        <div class="flex items-center gap-2">
          <span class="rounded-md bg-muted px-3 py-1.5 text-sm">{s}</span>
          {#if i < flow.length - 1}
            <span class="text-muted-foreground">→</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>