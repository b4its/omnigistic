<script lang="ts">
  import { gsapReveal } from "$lib/actions/gsapReveal";
  import { resolveHref } from "$lib/utils";

  const layers = [
    { l: "L1", n: "Framing", t: "Pertanyaan inti + 6 pertanyaan kasus", q: "Apa masalah sebenarnya?" },
    { l: "L2", n: "Decomposition (MECE)", t: "Profitability tree: Laba = Pendapatan - Biaya", q: "Di mana nilai bocor, tanpa tumpang tindih?" },
    { l: "L3", n: "Diagnosis", t: "Issue tree + 5 Whys", q: "Mengapa kebocoran terjadi (akar, bukan gejala)?" },
    { l: "L4", n: "Solution Design", t: "Lensa per akar (TCE, OM, BPR, Record Linkage, Dynamic Capabilities, TBL)", q: "Solusi apa yang tepat, dan mengapa secara teori?" },
    { l: "L5", n: "Evaluation", t: "Benefit-Cost Analysis + 3 skenario + KPI tree", q: "Berapa dampaknya, dan apakah layak?" },
    { l: "L6", n: "Implementation", t: "Roadmap 3 fase + tata kelola", q: "Kapan dan bagaimana mengeksekusi?" }
  ];
  const order = [
    ["1", "Business Understanding", "Menentukan masalah yang benar sebelum menyentuh data."],
    ["2", "Data Understanding", "Membuktikan masalah dengan angka, dan mengungkap batas data."],
    ["3", "Diagnosis (13 gejala → 6 akar)", "Menyerang penyebab, bukan gejala."],
    ["4", "Solution Design", "Memilih solusi dengan teori jangkar, bukan selera."],
    ["5", "Evaluation", "Menjawab profitable atau tidak secara kuantitatif."],
    ["6", "Implementation", "Membuktikan solusi bisa dieksekusi."]
  ];
  const biz = [
    { t: "Konteks industri", d: "E-commerce Indonesia Rp453,75 triliun (2023), geografi 17.000+ pulau, COD dominan karena keterbatasan akses finansial, dan guncangan regulasi (suspend TikTok Shop)." },
    { t: "Posisi & model", d: "GC Logistics, berdiri 2018. Pemimpin pasar 5 tahun, pangsa 20,6% (2024). Direct Operation Model terpusat; 23 hub, 3.200 titik; laut dan udara via mitra." },
    { t: "Pemangku kepentingan", d: "VP, manajer keuangan, manajer hub, kurir, mitra e-commerce, pelanggan unbanked, regulator, dan klien yang menuntut ESG." }
  ];
  const fin = [
    ["Fulfilment Expense", "32,34", "50,08", "+54,9%"],
    ["Shipping Expense", "33,76", "49,46", "+46,5%"],
    ["Net Sales", "213,64", "317,63", "+48,7%"]
  ];
  const dataMap = [
    ["Table 1", "23 hub: kapasitas, utilisasi, outlet", "Jakarta 90,4% vs Jayapura 28,1%", "Akar 1, 2"],
    ["Table 2", "Infrastruktur 2020 vs 2023", "Partner 20 → 478 (23,9x); outlet 750 → 2.500", "Akar 1"],
    ["Table 3", "Biaya & penjualan", "Fulfilment +54,9% vs sales +48,7%", "Akar 1, 4"],
    ["Table 4", "Demand bulanan 2023", "78-105 juta/bulan; e-commerce −29,8% Sep→Okt", "Akar 2"],
    ["Figure 1", "Alamat ambigu", "Nama jalan sama di 3 kota berjauhan", "Akar 4"],
    ["Figure 2", "COD vs non-COD", "138 vs 75 menit (8 paket, 5,3 km)", "Akar 3"]
  ];
  const derived = [
    "Cost-to-sales relatif stabil: 30,9% (2020) → 31,3% (2023).",
    "Produktivitas kurir 6,4 vs 3,48 paket/jam; COD hanya 54,3%.",
    "Gap utilisasi Jakarta-Jayapura 62,3 poin persen.",
    "Komplain absolut 5,5 per juta × 1.110 juta ≈ 6.105 kasus (2023).",
    "Motor 93,7% dari kendaraan last-mile; 70% last-mile di kota besar via motor.",
    "Target 200 kendaraan bersih ≈ 1,4% dari 14.180 armada."
  ];
  const gaps = [
    "Kasus tidak memberi harga EV, harga BBM, tarif listrik, atau capex charging; proyeksi ROI/BCA karena itu asumsi tim dan selalu berlabel.",
    "Narasi biaya 'almost doubled' tidak identik cakupannya dengan Table 3; jangan dicampur dalam satu klaim.",
    "Angka '3 juta paket/hari' ambigu (rekor industri vs internal)."
  ];
  const sol = [
    { n: "01", root: "Ekspansi tak selaras", name: "Hibrida berbasis utilisasi", impact: "Biaya wilayah timur: fixed → shared risk", kpi: "Utilisasi timur 41,5% → 55%" },
    { n: "02", root: "Kapasitas vs demand", name: "Kapasitas elastis + forecast per hub", impact: "Overload puncak → nol; biaya ikut kurva demand", kpi: "MAPE <10%; eksposur <20%/platform" },
    { n: "03", root: "Last-mile manual & COD", name: "Predictive COD + PUDO", impact: "Rute terpangkas; kapasitas kurir +38%", kpi: "Rute 138 → ≤100 menit; ≥4,8/jam" },
    { n: "04", root: "Data kotor & buta multimoda", name: "Address Intelligence + Control Tower", impact: "Komplain turun; kendali 2 moda tanpa capex", kpi: "Komplain <3/juta; geotag ≥95%" },
    { n: "05", root: "Kapabilitas tertinggal", name: "GC Academy + Digital Twin", impact: "Keputusan strategis lebih cepat", kpi: "100% manajer tersertifikasi" },
    { n: "06", root: "Keberlanjutan bukan sistem", name: "Carbon per rute + penyusutan 8 tahun", impact: "Emisi turun tanpa lonjakan capex", kpi: "Emisi/paket −20% per 2027" }
  ];
  const arch = [
    { l: "OMS", t: "Order Management System", d: "Status paket, penugasan kurir, routing, integrasi marketplace." },
    { l: "WMS", t: "Warehouse Management System", d: "Inbound, sorting, outbound, kapasitas rak, inventaris." },
    { l: "PUDO", t: "Pick-Up Drop-Off Network", d: "Jaringan titik, kapasitas rak, retensi, integrasi mitra ritel." }
  ];
  const phases = [
    { f: "Fase 1", t: "2024-2025", w: "Baseline emisi, 50 EV pilot rute urban Jawa, Address Intelligence, reusable bag di 8 hub Jawa." },
    { f: "Fase 2", t: "2025-2026", w: "Kepenuhan 200 EV, infrastruktur charging data-driven, kemasan degradable, Predictive COD + PUDO." },
    { f: "Fase 3", t: "2026+", w: "Ekspansi van-truk listrik, Control Tower laut-udara, sertifikasi ESG, Regional Sponsor penuh untuk timur." }
  ];
  const groups = [
    ["Kerangka", "#kerangka"],
    ["Bisnis", "#bisnis"],
    ["Data", "#data"],
    ["Solusi", "#solusi"]
  ];
</script>

<svelte:head><title>Kerangka &amp; Analisis · Omnigistic</title></svelte:head>

<div class="landing min-h-screen antialiased" style="background: var(--lnd-bg); color: var(--lnd-ink)">
  <header class="sticky top-0 z-40 border-b border-[var(--lnd-line)] backdrop-blur" style="background: color-mix(in srgb, var(--lnd-bg) 86%, transparent)">
    <div class="mx-auto flex h-16 max-w-[1520px] items-center gap-6 px-[clamp(1.25rem,4vw,4.5rem)]">
      <a href={resolveHref("/")} class="flex items-baseline gap-1 font-serif text-[19px] font-semibold tracking-[0.02em]">
        Omnigistic
      </a>
      <nav class="ml-auto hidden items-center gap-6 sm:flex" aria-label="Bagian analisis">
        {#each groups as [label, href] (href)}
          <a href={resolveHref(href)} class="text-[14px] font-medium uppercase tracking-[0.07em] text-[var(--lnd-soft)] transition-colors hover:text-[var(--lnd-accent-ink)]">{label}</a>
        {/each}
      </nav>
      <a href={resolveHref("/")} class="rounded-full border border-[var(--lnd-ink)] px-4 py-2 text-[13.5px] font-semibold uppercase tracking-[0.07em] transition-colors hover:border-[var(--lnd-accent-ink)] hover:text-[var(--lnd-accent-ink)]">Beranda</a>
      <a href={resolveHref("/login")} class="rounded-full bg-[var(--lnd-ink)] px-4 py-2 text-[13.5px] font-semibold uppercase tracking-[0.07em] text-[var(--lnd-bg)] transition-colors hover:bg-[var(--lnd-accent)]">Masuk Portal</a>
    </div>
  </header>

  <main class="mx-auto max-w-[1520px] px-[clamp(1.25rem,4vw,4.5rem)]">
    <!-- HERO -->
    <section class="pt-[clamp(3.5rem,8vw,6rem)] pb-[clamp(2.5rem,5vw,4rem)]">
      <p class="eyebrow">Kerangka &amp; Analisis</p>
      <h1 class="mt-6 max-w-4xl font-serif text-[clamp(2.4rem,6vw,5rem)] font-light leading-[1.02] tracking-[-0.02em]">
        Dari masalah ke solusi, <em class="italic">dengan dasar ilmu</em><span class="text-[var(--lnd-accent)]">.</span>
      </h1>
      <p class="mt-6 max-w-[62ch] text-[1.02rem] leading-relaxed text-[var(--lnd-soft)]">
        Halaman ini menampilkan kerangka analisis, pemahaman bisnis, pemahaman data, dan solusi beserta dampak serta KPI-nya. Seluruh angka bersumber dari studi kasus; asumsi tim diberi label.
      </p>
    </section>

    <!-- KERANGKA -->
    <section use:gsapReveal id="kerangka" class="scroll-mt-20 border-t border-[var(--lnd-line)] py-[clamp(3.5rem,7vw,6rem)]">
      <div class="border-t border-[var(--lnd-ink)] pt-6">
        <p class="eyebrow">Kerangka analisis</p>
        <h2 class="mt-6 max-w-3xl font-serif text-[clamp(1.8rem,4vw,3rem)] font-light leading-[1.05] tracking-[-0.015em]">WHY, WHAT, HOW</h2>
        <p class="mt-4 max-w-[64ch] text-sm leading-relaxed text-[var(--lnd-soft)]">WHY: GC Logistics tumbuh cepat tetapi biaya tumbuh lebih cepat dan rentan guncangan eksternal. HOW: diagnosis MECE dan akar masalah, lalu desain solusi berbasis teori, diuji dengan BCA dan KPI. WHAT: enam akar masalah, masing-masing dengan solusi, dampak, dan KPI.</p>
      </div>

      <div class="mt-10 overflow-x-auto rounded-2xl border border-[var(--lnd-line)]">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr class="border-b border-[var(--lnd-line)] bg-[var(--lnd-surface)] text-[13px] uppercase tracking-wider text-[var(--lnd-soft)]">
              <th class="px-4 py-3">Lapis</th><th class="px-4 py-3">Nama</th><th class="px-4 py-3">Alat</th><th class="px-4 py-3">Pertanyaan</th>
            </tr>
          </thead>
          <tbody>
            {#each layers as r (r.l)}
              <tr class="border-b border-[var(--lnd-line)] last:border-0">
                <td class="px-4 py-3 font-serif italic text-[var(--lnd-accent-ink)]">{r.l}</td>
                <td class="px-4 py-3 font-semibold text-[var(--lnd-ink)]">{r.n}</td>
                <td class="px-4 py-3 text-[var(--lnd-soft)]">{r.t}</td>
                <td class="px-4 py-3 text-[var(--lnd-soft)]">{r.q}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each order as [n, t, d] (n)}
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
            <p class="font-serif text-[15px] italic text-[var(--lnd-accent-ink)]">{n}</p>
            <p class="mt-2 text-sm font-semibold text-[var(--lnd-ink)]">{t}</p>
            <p class="mt-1 text-[15px] leading-relaxed text-[var(--lnd-soft)]">{d}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- BISNIS -->
    <section use:gsapReveal id="bisnis" class="scroll-mt-20 border-t border-[var(--lnd-line)] py-[clamp(3.5rem,7vw,6rem)]">
      <div class="border-t border-[var(--lnd-ink)] pt-6">
        <p class="eyebrow">Business understanding</p>
        <h2 class="mt-6 max-w-3xl font-serif text-[clamp(1.8rem,4vw,3rem)] font-light leading-[1.05] tracking-[-0.015em]">Konteks, model, dan tegangan</h2>
      </div>
      <div class="mt-10 grid gap-4 lg:grid-cols-3">
        {#each biz as b (b.t)}
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <p class="text-sm font-semibold text-[var(--lnd-ink)]">{b.t}</p>
            <p class="mt-2 text-[15px] leading-relaxed text-[var(--lnd-soft)]">{b.d}</p>
          </div>
        {/each}
      </div>
      <div class="mt-6 overflow-x-auto rounded-2xl border border-[var(--lnd-line)]">
        <table class="w-full min-w-[560px] text-left text-sm">
          <caption class="sr-only">Kinerja keuangan GC Logistics 2020 dan 2023, Triliun IDR</caption>
          <thead>
            <tr class="border-b border-[var(--lnd-line)] bg-[var(--lnd-surface)] text-[13px] uppercase tracking-wider text-[var(--lnd-soft)]">
              <th class="px-4 py-3">Kategori (Triliun IDR)</th><th class="px-4 py-3 text-right">2020</th><th class="px-4 py-3 text-right">2023</th><th class="px-4 py-3 text-right">Perubahan</th>
            </tr>
          </thead>
          <tbody>
            {#each fin as [k, a, b, c] (k)}
              <tr class="border-b border-[var(--lnd-line)] last:border-0">
                <td class="px-4 py-3 text-[var(--lnd-ink)]">{k}</td>
                <td class="px-4 py-3 text-right tabular-nums text-[var(--lnd-soft)]">{a}</td>
                <td class="px-4 py-3 text-right tabular-nums text-[var(--lnd-soft)]">{b}</td>
                <td class="px-4 py-3 text-right font-semibold text-[var(--lnd-accent-ink)]">{c}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-[14px] text-[var(--lnd-soft)]">Rugi 2023, lalu EBIT positif 2024. Rasio biaya terhadap penjualan relatif stabil (30,9% → 31,3%), jadi masalahnya adalah skala dan kompleksitas, bukan rasio yang memburuk.</p>
    </section>

    <!-- DATA -->
    <section use:gsapReveal id="data" class="scroll-mt-20 border-t border-[var(--lnd-line)] py-[clamp(3.5rem,7vw,6rem)]">
      <div class="border-t border-[var(--lnd-ink)] pt-6">
        <p class="eyebrow">Data understanding</p>
        <h2 class="mt-6 max-w-3xl font-serif text-[clamp(1.8rem,4vw,3rem)] font-light leading-[1.05] tracking-[-0.015em]">Bukan asumsi, tapi angka</h2>
      </div>
      <div class="mt-10 overflow-x-auto rounded-2xl border border-[var(--lnd-line)]">
        <table class="w-full min-w-[720px] text-left text-sm">
          <caption class="sr-only">Peta sumber data studi kasus</caption>
          <thead>
            <tr class="border-b border-[var(--lnd-line)] bg-[var(--lnd-surface)] text-[13px] uppercase tracking-wider text-[var(--lnd-soft)]">
              <th class="px-4 py-3">Sumber</th><th class="px-4 py-3">Isi</th><th class="px-4 py-3">Angka kunci</th><th class="px-4 py-3">Akar</th>
            </tr>
          </thead>
          <tbody>
            {#each dataMap as [s, i, k, a] (s)}
              <tr class="border-b border-[var(--lnd-line)] last:border-0">
                <td class="px-4 py-3 font-semibold text-[var(--lnd-ink)]">{s}</td>
                <td class="px-4 py-3 text-[var(--lnd-soft)]">{i}</td>
                <td class="px-4 py-3 text-[var(--lnd-soft)]">{k}</td>
                <td class="px-4 py-3 text-[var(--lnd-accent-ink)]">{a}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
          <p class="text-sm font-semibold text-[var(--lnd-ink)]">Metrik turunan</p>
          <ul class="mt-3 space-y-2 text-[15px] leading-relaxed text-[var(--lnd-soft)]">
            {#each derived as d (d)}<li>• {d}</li>{/each}
          </ul>
        </div>
        <div class="rounded-2xl border border-l-4 border-[var(--lnd-line)] border-l-[var(--lnd-late)] bg-[var(--lnd-surface)] p-6">
          <p class="text-sm font-semibold text-[var(--lnd-ink)]">Keterbatasan data</p>
          <ul class="mt-3 space-y-2 text-[15px] leading-relaxed text-[var(--lnd-soft)]">
            {#each gaps as g (g)}<li>• {g}</li>{/each}
          </ul>
        </div>
      </div>
    </section>

    <!-- SOLUSI -->
    <section use:gsapReveal id="solusi" class="scroll-mt-20 border-t border-[var(--lnd-line)] py-[clamp(3.5rem,7vw,6rem)]">
      <div class="border-t border-[var(--lnd-ink)] pt-6">
        <p class="eyebrow">Solusi &amp; dampak</p>
        <h2 class="mt-6 max-w-3xl font-serif text-[clamp(1.8rem,4vw,3rem)] font-light leading-[1.05] tracking-[-0.015em]">Enam akar, enam dampak terukur</h2>
      </div>

      <div class="mt-10 overflow-x-auto rounded-2xl border border-[var(--lnd-line)]">
        <table class="w-full min-w-[820px] text-left text-sm">
          <caption class="sr-only">Solusi, dampak bisnis, dan KPI per akar</caption>
          <thead>
            <tr class="border-b border-[var(--lnd-line)] bg-[var(--lnd-surface)] text-[13px] uppercase tracking-wider text-[var(--lnd-soft)]">
              <th class="px-4 py-3">Akar</th><th class="px-4 py-3">Solusi</th><th class="px-4 py-3">Dampak bisnis</th><th class="px-4 py-3">KPI</th>
            </tr>
          </thead>
          <tbody>
            {#each sol as s (s.n)}
              <tr class="border-b border-[var(--lnd-line)] last:border-0">
                <td class="px-4 py-3"><span class="font-serif italic text-[var(--lnd-accent-ink)]">{s.n}</span> <span class="text-[var(--lnd-soft)]">{s.root}</span></td>
                <td class="px-4 py-3 font-semibold text-[var(--lnd-ink)]">{s.name}</td>
                <td class="px-4 py-3 text-[var(--lnd-soft)]">{s.impact}</td>
                <td class="px-4 py-3 font-semibold text-[var(--lnd-accent-ink)]">{s.kpi}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        {#each arch as a (a.l)}
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
            <p class="font-serif text-lg font-semibold text-[var(--lnd-ink)]">{a.l}</p>
            <p class="mt-1 text-sm font-medium text-[var(--lnd-ink)]">{a.t}</p>
            <p class="mt-1 text-[15px] leading-relaxed text-[var(--lnd-soft)]">{a.d}</p>
          </div>
        {/each}
      </div>

      <div class="mt-6 grid gap-4 md:grid-cols-3">
        {#each phases as p (p.f)}
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">{p.f}, {p.t}</p>
            <p class="mt-3 text-[15px] leading-relaxed text-[var(--lnd-ink)]">{p.w}</p>
          </div>
        {/each}
      </div>
    </section>
  </main>

  <footer class="border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-10">
    <div class="mx-auto flex max-w-[1520px] flex-wrap items-center justify-between gap-4 text-[14px] uppercase tracking-[0.08em] text-[var(--lnd-soft)]">
      <span>Angka dari Table 1-4 dan Figure 1-2 · asumsi tim berlabel</span>
      <span class="flex gap-4">
        <a href={resolveHref("/")} class="text-[var(--lnd-accent-ink)] underline-offset-4 hover:underline">Beranda</a>
        <a href={resolveHref("/dashboard/methodology")} class="text-[var(--lnd-accent-ink)] underline-offset-4 hover:underline">Methodology</a>
        <a href={resolveHref("/login")} class="text-[var(--lnd-accent-ink)] underline-offset-4 hover:underline">Portal</a>
      </span>
    </div>
  </footer>
</div>
