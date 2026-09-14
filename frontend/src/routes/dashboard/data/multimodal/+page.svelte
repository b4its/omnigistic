<script lang="ts">
  const modes = [
    { moda: "Darat", own: "Dikelola GC", detail: "Van, truk, motor", status: "In-house" },
    { moda: "Udara", own: "Partner pihak ketiga", detail: "Belly komersial + cargo plane", status: "3rd party" },
    { moda: "Laut", own: "Partner pihak ketiga", detail: "Kargo kontainer", status: "3rd party" }
  ];
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Multimodal Control Tower</h1>
    <span class="hub-label text-muted-foreground">DATA</span>
  </div>

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-[15px] text-muted-foreground">
    <span class="font-medium text-foreground">Ilustrasi proses.</span> Halaman ini menjelaskan desain integrasi Control Tower, bukan koneksi API partner yang sudah berjalan.
  </div>

  <p class="text-sm leading-relaxed text-muted-foreground">
    GC mengelola darat sendiri; laut &amp; udara dipegang mitra. Omnigistic menghadirkan kendali lewat <span class="font-medium text-foreground">data</span>, bukan kepemilikan aset.
  </p>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each modes as m (m.moda)}
      <div class="rounded-2xl border bg-card p-5">
        <p class="hub-label text-sm text-primary">{m.moda}</p>
        <p class="mt-1 text-sm font-medium">{m.own}</p>
        <p class="text-xs text-muted-foreground">{m.detail}</p>
        <span class="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">{m.status}</span>
      </div>
    {/each}
  </div>

  <div class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm">
    <span class="font-medium">Solusi Control Tower:</span> integrasi API + GPS/IoT dengan partner laut-udara, semua ETA dalam satu dashboard, prediksi keterlambatan, dan modal shift optimizer (murah+rendah emisi vs ekspres).
  </div>
</div>