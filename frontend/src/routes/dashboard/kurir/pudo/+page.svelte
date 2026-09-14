<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";

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
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">PUDO Network</h1>
    <span class="hub-label text-muted-foreground">Pick-Up Drop-Off</span>
  </div>

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