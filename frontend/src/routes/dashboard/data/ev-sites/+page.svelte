<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";

  const corridors = [
    { from: "Jakarta", to: "Bandung", util: 68.9, volume: 82, distanceKm: 150, competitorDensity: "tinggi", score: 94,
      detail: "Koridor urban Jawa · volume tinggi + 70% last-mile terjadi di Jawa" },
    { from: "Surabaya", to: "Jakarta", util: 71.8, volume: 68, distanceKm: 700, competitorDensity: "sedang", score: 87,
      detail: "Kapasitas tertinggi Jawa · ideal untuk charging hub" },
    { from: "Semarang", to: "Solo", util: 65.9, volume: 51, distanceKm: 120, competitorDensity: "sedang", score: 82,
      detail: "Middle Jawa · konektor antara Jakarta-Surabaya" },
    { from: "Medan", to: "Pekanbaru", util: 56.2, volume: 34, distanceKm: 450, competitorDensity: "rendah", score: 65,
      detail: "Koridor Sumatra utara · jarak panjang, butuh charging di titik" },
    { from: "Makassar", to: "Balikpapan", util: 48.6, volume: 29, distanceKm: 600, competitorDensity: "sangat rendah", score: 58,
      detail: "Cross-region Kalimantan-Sulawesi · utilisasi rendah, butuh model dulu" },
    { from: "Jayapura", to: "Ambon", util: 32.1, volume: 12, distanceKm: 1500, competitorDensity: "nihil", score: 21,
      detail: "Timur paling ekstrem · butuh Regional Sponsor + laut dulu sebelum EV" }
  ];

  const scoreColor = (s: number) => (s >= 80 ? "bg-success text-success-foreground" : s >= 60 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground");

  const policy = {
    turnoverPct: 12.5, // penyusutan 8 th = 1/8 per tahun
    years: Array.from({ length: 10 }, (_, i) => i + 1).map((y) =>
      (() => {
        const cleanPct = (1 - Math.pow(1 - 0.125, y)) * 100; // % armada bersih kumulatif
        return { year: y, cleanPct: Math.round(cleanPct * 10) / 10 };
      })()
    )
  };
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">EV Site Selection</h1>
    <span class="hub-label text-muted-foreground">Data-driven charging infrastructure</span>
  </div>

  <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Icon name="chat" cls="h-5 w-5" weight="fill" />
      </span>
      <div class="min-w-0">
        <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">Saran Nigi AI</p>
        <p class="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
          Prioritas pertama: koridor urban Jawa (utilisasi &gt; 65%, 70% last-mile terjadi). Koridor timur (Jayapura) perlu Regional Sponsor + modal laut dulu sebelum charging EV.
        </p>
      </div>
    </div>
  </div>

  <div class="rounded-2xl border bg-card p-5">
    <p class="mb-3 text-sm font-medium">Koridor prioritas (skor = utilisasi hub + volume + jarak SPKLU + densitas kompetitor)</p>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/50 text-left text-xs text-muted-foreground">
            <th scope="col" class="px-4 py-2">Koridor</th>
            <th scope="col" class="px-4 py-2 text-right">Utilisasi</th>
            <th scope="col" class="px-4 py-2 text-right">Indeks volume*</th>
            <th scope="col" class="px-4 py-2 text-right">Jarak</th>
            <th scope="col" class="px-4 py-2">Kompetitor</th>
            <th scope="col" class="px-4 py-2 text-right">Skor</th>
          </tr>
        </thead>
        <tbody>
          {#each corridors as c (c.from + c.to)}
            <tr class="border-b last:border-0">
              <td class="px-4 py-2"><p class="font-medium">{c.from} → {c.to}</p><p class="text-xs text-muted-foreground">{c.detail}</p></td>
              <td class="px-4 py-2 text-right tabular-nums">{c.util}%</td>
              <td class="px-4 py-2 text-right tabular-nums">{c.volume}M</td>
              <td class="px-4 py-2 text-right tabular-nums">{c.distanceKm} km</td>
              <td class="px-4 py-2 text-sm"><span class="rounded-full bg-muted px-2 py-0.5 text-[13px]">{c.competitorDensity}</span></td>
              <td class="px-4 py-2 text-right"><span class={"rounded-md px-2 py-0.5 text-sm font-bold " + scoreColor(c.score)}>{c.score}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="mt-3 text-[13px] italic text-muted-foreground">Asumsi tim: skor kelayakan dihitung dari utilisasi hub + estimasi kepadatan kompetitor. Prioritas tertinggi: koridor urban Jawa (70% last-mile). *indeks relatif, bukan agregat harian.</p>
  </div>

  <div class="rounded-2xl border bg-card p-5">
    <h2 class="mb-3 text-sm font-medium">Kebijakan Penyusutan 8 Tahun → Kurva Transformasi EV</h2>
    <p class="mb-3 text-sm text-muted-foreground">Setiap kendaraan fosil yang mencapai umur ekonomis 8 tahun wajib diganti EV. Tidak ada lonjakan capex · penggantian mengikuti jadwal penyusutan yang sudah ada. Turnover: ~{(12.5)}%/th.</p>
    <div class="grid grid-cols-5 gap-2 sm:grid-cols-10">
      {#each policy.years.slice(0, 10) as y (y.year)}
        <div class="flex flex-col items-center gap-1">
          <div class="inline-block h-12 w-6 overflow-hidden rounded-md bg-muted relative"><div class="absolute inset-x-0 bottom-0 bg-primary transition-all" style="height: {y.cleanPct}%"></div></div>
          <p class="text-[13.5px] tabular-nums text-muted-foreground">{y.year}</p>
        </div>
      {/each}
      <div class="text-xs text-muted-foreground col-span-5 sm:col-span-10 mt-1">
        Tahun ke-10: {(policy.years[9]?.cleanPct ?? 73.4)}% armada fosil tergantikan secara alami tanpa capex spike.
      </div>
    </div>
  </div>
</div>