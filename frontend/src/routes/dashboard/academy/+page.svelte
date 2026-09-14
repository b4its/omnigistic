<script lang="ts">
  const programs = [
    { title: "GC Academy", desc: "Kurikulum operasi ekspres, data literacy, manajemen hub. Sertifikasi untuk manajer daerah.", target: "100% manajer hub tersertifikasi (18 bulan)" },
    { title: "Data Science Internal", desc: "Tim data science, kurangi ketergantungan vendor, pastikan model terawat.", target: "Tim inti DS 4 orang" },
    { title: "Digital Twin", desc: "Alat uji keputusan, skenario Regional Sponsor, realokasi beban, ekspansi diuji di simulasi.", target: "Keputusan strategis ≤ 6 bulan" }
  ];
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">GC Academy</h1>
    <span class="hub-label text-muted-foreground">Akar 5 · Kapabilitas</span>
  </div>

  <p class="text-sm leading-relaxed text-muted-foreground">
    Diakui dalam kasus: &ldquo;lacked deep operational expertise, management experience, and technical knowledge&rdquo;. Solusi: investasi SDM + alat uji keputusan.
  </p>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each programs as p (p.title)}
      <div class="rounded-2xl border bg-card p-5">
        <p class="text-sm font-semibold">{p.title}</p>
        <p class="mt-2 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
        <p class="kpi-value mt-3 text-xs text-primary">{p.target}</p>
      </div>
    {/each}
  </div>
</div>