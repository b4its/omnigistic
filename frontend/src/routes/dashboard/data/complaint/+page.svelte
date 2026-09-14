<script lang="ts">
  const totalVolume = 1110;
  const ratePerM = 5.5;
  const totalCases = Math.round(totalVolume * ratePerM);
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Complaint Monitor</h1>
    <span class="hub-label text-muted-foreground">DATA</span>
  </div>

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-[15px] text-muted-foreground">
    <span class="font-medium text-foreground">Ilustrasi metrik.</span> Angka di halaman ini dari studi kasus (2023), bukan data monitoring live.
  </div>

  <div class="grid gap-4 sm:grid-cols-3">
    <div class="rounded-2xl border bg-card p-5 text-center">
      <p class="kpi-value text-3xl text-destructive-foreground">{ratePerM}</p>
      <p class="text-xs text-muted-foreground">per juta paket (2023)</p>
    </div>
    <div class="rounded-2xl border border-chart-2 bg-card p-5 text-center">
      <p class="kpi-value text-3xl">{new Intl.NumberFormat("id-ID").format(totalCases)}</p>
      <p class="text-xs text-muted-foreground">kasus dari {new Intl.NumberFormat("id-ID").format(totalVolume)}M paket</p>
    </div>
    <div class="rounded-2xl border bg-card p-5 text-center">
      <p class="kpi-value text-3xl text-primary">&lt;3</p>
      <p class="text-xs text-muted-foreground">target per juta (Omnigistic)</p>
    </div>
  </div>

  <div class="rounded-2xl border bg-card p-5">
    <p class="mb-2 text-sm font-medium">Penyebab utama</p>
    <ul class="list-disc list-inside space-y-1 text-sm text-muted-foreground">
      <li>Alamat tidak terstandarisasi, akar paling dasar</li>
      <li>Routing error karena alamat ambigu</li>
      <li>Delivery failure, geotag tidak akurat</li>
    </ul>
  </div>

  <div class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm">
    <span class="font-medium">Dampak:</span> ~6.105 kasus per tahun, kecil secara rasio, signifikan dalam angka absolut mengingat 1.110 jt paket. Menyelesaikannya di hulu (checkout) mencegah biaya berulang di sortasi + pengantaran ulang.
  </div>
</div>