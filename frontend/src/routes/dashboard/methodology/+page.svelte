<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { api, type AuditResult } from "$lib/api";

  interface Root { n: string; name: string; theory: string; solution: string; kpi: string }
  // Teori jangkar bersifat editorial (tidak ada di data kasus) — tetap lokal.
  const THEORY: string[] = [
    "Transaction Cost Economics",
    "Aggregate planning + Queueing theory",
    "Business Process Reengineering + VRPTW",
    "Record Linkage / Fuzzy Matching",
    "Dynamic Capabilities",
    "Triple Bottom Line + TCO"
  ];
  // Fallback bila backend offline (nilai identik dgn data-kas.json).
  const rootsFallback: Root[] = [
    { n: "1", name: "Ekspansi tak selaras", theory: THEORY[0], solution: "Hibrida Direct vs Regional Sponsor berbasis utilisasi", kpi: "Timur ≥55% (24 bulan)" },
    { n: "2", name: "Kapasitas fixed vs demand fluktuatif", theory: THEORY[1], solution: "Kapasitas elastis 3 tingkat + forecast per hub", kpi: "MAPE <10%; eksposur <20%/platform" },
    { n: "3", name: "Last-mile manual dan cash-based", theory: THEORY[2], solution: "Predictive COD + clustering rute + PUDO + rekonsiliasi digital", kpi: "Rute COD ≤100 menit; ≥4,8 paket/jam" },
    { n: "4", name: "Data tidak terstandar dan buta multimoda", theory: THEORY[3], solution: "Address Intelligence + Control Tower + modal shift", kpi: "Komplain <3/juta; geotag ≥95%" },
    { n: "5", name: "Kapabilitas tertinggal dari pertumbuhan", theory: THEORY[4], solution: "Nigi Academy + tim data internal + Digital Twin", kpi: "100% manajer tersertifikasi" },
    { n: "6", name: "Keberlanjutan sebagai pembelian, bukan desain sistem", theory: THEORY[5], solution: "Carbon per rute + roadmap 3 fase + penyusutan 8 tahun", kpi: "Emisi/paket −20% per 2027" }
  ];

  let roots = $state<Root[]>(rootsFallback);
  let audit = $state<AuditResult | null>(null);
  let auditLoading = $state(true);
  let auditFailed = $state(false);

  async function loadAudit() {
    auditLoading = true;
    auditFailed = false;
    try {
      audit = await api.metricAudit();
    } catch {
      audit = null;
      auditFailed = true;
    }
    auditLoading = false;
  }

  onMount(async () => {
    try {
      const rc = await api.rootCauses();
      if (Array.isArray(rc) && rc.length) {
        roots = rc.map((r, i) => ({
          n: String(i + 1),
          name: r.titleId || r.title,
          theory: THEORY[i] ?? "—",
          solution: r.solution,
          kpi: r.kpiTarget
        }));
      }
    } catch {
      roots = rootsFallback;
    }
    await loadAudit();
  });

  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);

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
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">{r.n}</span>
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
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">{i + 1}</span>
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

  <section class="space-y-3">
    <h2 class="text-sm font-semibold text-muted-foreground">Audit &amp; Rekonsiliasi Angka</h2>
    <p class="text-sm text-muted-foreground">
      Semua angka aplikasi dihitung ulang dari <code>shared/data-kas.json</code> oleh mesin metrik backend, bukan hardcode.
      Berikut hasil trace otomatis: hijau = cocok dengan dokumen kasus, kuning = temuan ketidaksesuaian pada dokumen.
    </p>
    {#if audit}
      <div class="grid gap-3 md:grid-cols-2">
        {#each audit.checks as c (c.id)}
          <div
            class="flex items-start gap-3 rounded-2xl border bg-card p-4"
            style="border-color: {c.ok ? 'var(--color-border)' : 'var(--color-warning, var(--color-chart-3))'}"
          >
            <span
              class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style="background: {c.ok ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'color-mix(in srgb, var(--color-chart-3) 20%, transparent)'}"
            >
              <Icon name={c.ok ? "check" : "warn"} cls="h-4 w-4" weight="bold" />
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">{c.label}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Nilai: <span class="font-mono">{typeof c.value === "object" ? JSON.stringify(c.value) : fmt(Number(c.value))}</span>
              </p>
              {#if c.note}<p class="mt-1 text-xs text-muted-foreground">{c.note}</p>{/if}
            </div>
          </div>
        {/each}
      </div>

      <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
        <p class="font-medium">Temuan rekonsiliasi (Tabel 4):</p>
        <p class="mt-1 text-muted-foreground">{audit.demand.reconciliation.note}</p>
        <p class="mt-2 text-muted-foreground">
          Total demand: <span class="text-foreground">dokumen {fmt(audit.demand.reconciliation.totalM.document)} jt</span> =
          <span class="text-foreground">hitung {fmt(audit.demand.reconciliation.totalM.computed)} jt</span> (cocok) ·
          E-commerce: <span class="text-foreground">dokumen {fmt(audit.demand.reconciliation.ecommerceM.document)} jt</span> vs
          <span class="text-foreground">hitung {fmt(audit.demand.reconciliation.ecommerceM.computed)} jt</span>
          (selisih {fmt(audit.demand.reconciliation.ecommerceM.delta)} jt).
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each audit.regionSummary as r (r.region)}
          <div class="rounded-2xl border border-border bg-card p-4">
            <div class="flex items-center justify-between">
              <p class="text-sm font-semibold">{r.region}</p>
              {#if r.sponsorCandidate}<span class="rounded-full border border-[color-mix(in_oklab,var(--bitcoin)_40%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--bitcoin)]">kandidat sponsor</span>{/if}
            </div>
            <p class="mt-2 text-2xl font-bold tabular-nums">{fmt(r.avgUtilizationPct)}%</p>
            <p class="text-xs text-muted-foreground">{r.hubs} hub · kapasitas {fmt(r.capacityM)}M/hari · {r.outlets} outlet</p>
          </div>
        {/each}
      </div>
    {:else if auditLoading}
      <div class="h-24 animate-pulse rounded-2xl border border-border bg-card/60"></div>
    {:else if auditFailed}
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <div>
          <p class="text-sm font-semibold text-foreground">Gagal memuat audit angka</p>
          <p class="mt-0.5 text-xs text-muted-foreground">Backend offline. Audit &amp; rekonsiliasi diturunkan dari data kasus.</p>
        </div>
        <button type="button" onclick={loadAudit} class="rounded-full bg-[var(--primary)] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--primary-foreground)]">Coba lagi</button>
      </div>
    {/if}
  </section>
</div>
