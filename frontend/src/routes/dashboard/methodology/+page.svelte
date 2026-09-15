<script lang="ts">
  interface Root { n: string; name: string; theory: string; solution: string; kpi: string }
  const roots: Root[] = [
    { n: "1", name: "Ekspansi tanpa keselarasan kapasitas-demand", theory: "Transaction Cost Economics", solution: "Hibrida Direct vs Regional Sponsor berbasis utilisasi", kpi: "Utilisasi timur 41,5% → ≥55%" },
    { n: "2", name: "Kapasitas fixed vs demand fluktuatif", theory: "Aggregate planning + Queueing theory", solution: "Kapasitas elastis 3 tingkat + forecast per hub", kpi: "MAPE <10%; eksposur <20%/platform" },
    { n: "3", name: "Last-mile manual dan cash-based", theory: "Business Process Reengineering + VRPTW", solution: "Predictive COD + clustering rute + PUDO + rekonsiliasi digital", kpi: "Rute COD ≤100 menit; ≥4,8 paket/jam" },
    { n: "4", name: "Data tidak terstandar dan buta multimoda", theory: "Record Linkage / Fuzzy Matching", solution: "Address Intelligence + Control Tower + modal shift", kpi: "Komplain <3/juta; geotag ≥95%" },
    { n: "5", name: "Kapabilitas tertinggal dari pertumbuhan", theory: "Dynamic Capabilities", solution: "Nigi Academy + tim data internal + Digital Twin", kpi: "100% manajer tersertifikasi" },
    { n: "6", name: "Keberlanjutan sebagai pembelian, bukan desain sistem", theory: "Triple Bottom Line + TCO", solution: "Carbon per rute + roadmap 3 fase + penyusutan 8 tahun", kpi: "Emisi/paket −20% per 2027" }
  ];
  const steps = [
    { step: "Collect", problem: "Alamat ambigu · 62% dari merchant · 38% individu", solution: "Address Intelligence · geotag wajib" },
    { step: "Sort", problem: "Hub overload (JKT 90,4%) · sortasi lambat saat puncak", solution: "WMS + kapasitas elastis 3 tingkat" },
    { step: "Transport", problem: "Biaya naik 54,9% · empty run · 2 dari 3 moda via pihak ketiga", solution: "Modal shift · Control Tower · load balancing" },
    { step: "Deliver", problem: "COD 138 menit · tunggu 10-20 menit · human error kas", solution: "Predictive COD · PUDO · slot confirmation" }
  ];
</script>

<div class="space-y-8">
  <header class="space-y-2">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Methodology</h1>
    <p class="text-sm text-muted-foreground">Kerangka analisis problem-first: gejala → akar → solusi berbasis teori → KPI. Setiap angka dari Table 1-4 dan Figure 1-2; asumsi tim berlabel.</p>
  </header>

  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-muted-foreground">Enam akar, teori jangkar, solusi, KPI</h2>
    <div class="grid gap-3 md:grid-cols-2">
      {#each roots as r (r.n)}
        <article class="rounded-2xl border border-border bg-card p-5">
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{r.n}</span>
            <h3 class="text-sm font-semibold text-foreground">{r.name}</h3>
          </div>
          <dl class="mt-3 space-y-1.5 text-[15px]">
            <div class="flex gap-2"><dt class="w-24 shrink-0 text-muted-foreground">Teori</dt><dd class="text-foreground">{r.theory}</dd></div>
            <div class="flex gap-2"><dt class="w-24 shrink-0 text-muted-foreground">Solusi</dt><dd class="text-foreground">{r.solution}</dd></div>
            <div class="flex gap-2"><dt class="w-24 shrink-0 text-muted-foreground">KPI</dt><dd class="font-medium text-primary">{r.kpi}</dd></div>
          </dl>
        </article>
      {/each}
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-muted-foreground">Alur operasi: Collect, Sort, Transport, Deliver</h2>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {#each steps as s, i (s.step)}
        <div class="rounded-2xl border border-border bg-card p-5">
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
            <span class="font-heading text-base font-semibold">{s.step}</span>
          </div>
          <div class="mt-4 space-y-2">
            <div class="rounded-sm bg-destructive/10 p-2 text-xs text-destructive-foreground"><span class="font-medium">Masalah:</span> {s.problem}</div>
            <div class="rounded-sm bg-success/10 p-2 text-xs text-success-foreground"><span class="font-medium">Omnigistic:</span> {s.solution}</div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="rounded-2xl border border-border bg-card p-5">
    <h2 class="text-sm font-semibold">Sumber &amp; batasan</h2>
    <ul class="mt-3 space-y-1.5 text-[15px] text-muted-foreground">
      <li>Angka operasional dan finansial dari Table 1-4 serta Figure 1-2 studi kasus ISCEA 2026.</li>
      <li>Harga EV, harga BBM, tarif listrik, dan proyeksi ROI adalah asumsi tim (tidak ada di kasus) dan selalu berlabel.</li>
      <li>Model forecast, COD risk, dan address intelligence adalah prototipe presentasi, bukan sistem produksi.</li>
    </ul>
  </section>
</div>
