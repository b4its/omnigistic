<script lang="ts">
  import { onMount } from "svelte";
  import { gsapReveal } from "$lib/actions/gsapReveal";
  import { resolveHref } from "$lib/utils";
  import { api, type OptimizeResult, type CodIntelResult, type AuditResult } from "$lib/api";
  import EditorialNav from "$lib/components/EditorialNav.svelte";
  import HeroTexture from "$lib/components/HeroTexture.svelte";

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
    { t: "Posisi & model", d: "GC Logistics, berdiri 2018. Pemimpin pasar 5 tahun, pangsa 20,6% (2024). Direct Operation Model terpusat; 23 hub, 2.500 titik; laut dan udara via mitra." },
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
  const derivedMetrics = [
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
    { n: "05", root: "Kapabilitas tertinggal", name: "Nigi Academy + Digital Twin", impact: "Keputusan strategis lebih cepat", kpi: "100% manajer tersertifikasi" },
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

  /* ── Jawaban 6 pertanyaan juri, dengan angka LIVE dari backend ──────────── */
  let optimize = $state<OptimizeResult | null>(null);
  let codIntel = $state<CodIntelResult | null>(null);
  let audit = $state<AuditResult | null>(null);
  /** true bila minimal satu sumber angka live berhasil dimuat dari backend. */
  let live = $state(false);
  let checked = $state(false);

  onMount(async () => {
    const [o, c, a] = await Promise.allSettled([api.optimizeLoadBalance(), api.codIntelScenarios(), api.metricAudit()]);
    if (o.status === "fulfilled") optimize = o.value;
    if (c.status === "fulfilled") codIntel = c.value["Semua intervensi aktif"] ?? null;
    if (a.status === "fulfilled") audit = a.value;
    live = audit !== null || optimize !== null || codIntel !== null;
    checked = true;
  });

  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

  function buildQuestions() {
    return [
    {
      no: "01",
      q: "Haruskah Direct Operation beralih ke Regional Sponsored Model?",
      verdict: "Hibrida, bukan beralih total",
      answer:
        "Tidak semua region cocok jadi sponsor. Jawa padat (utilisasi rata-rata " +
        (audit ? fmt(audit.regionSummary.find((r) => r.region === "Java")?.avgUtilizationPct ?? 69.4) : "69,4") +
        "%) tetap Direct Operation karena skala ekonomi. Timur under-utilisasi (Kalimantan/Sulawesi/Maluku) jadi kandidat sponsor bertahap.",
      evidence: [
        `Optimizer mengalihkan ${optimize ? fmt(optimize.summary.totalMovedM) + "M paket/hari" : "0,31M paket/hari"} dari hub overload ke hub ber-headroom.`,
        `Utilisasi timur naik ${optimize ? fmt(optimize.summary.eastAvgUtilBefore) + "% → " + fmt(optimize.summary.eastAvgUtilAfter) + "%" : "41,5% → 63,6%"}.`,
        "3 region bertanda 'kandidat sponsor' (Kalimantan, Sulawesi, Maluku & Papua) berbasis utilisasi <50%.",
      ],
      link: "/dashboard/pusat/digital-twin",
      linkLabel: "Buka Digital Twin",
    },
    {
      no: "02",
      q: "Bagaimana menangani fluktuasi demand yang dramatis?",
      verdict: "Kapasitas elastis + forecast per hub",
      answer:
        "Demand bergerak 78-105 juta/bulan (" +
        (audit ? fmt(audit.demand.fluctuationPct) + "% range" : "34,6% range") +
        "), dengan shock regulasi (TikTok Shop) menurunkan e-commerce " +
        (audit ? fmt(Math.abs(audit.demand.tiktokEcommerceShockPct ?? 29.8)) + "%" : "29,8%") +
        " pada Okt. Solusi: kapasitas tiga tingkat + forecast per hub + buffer pra-puncak.",
      evidence: [
        "Forecast musiman+tren (MAPE in-sample 1,3%) memprediksi puncak Agustus & palung Oktober jauh sebelum terjadi.",
        "Event flag (Harbolnas, TikTok suspension) menaikkan/menurunkan proyeksi secara eksplisit.",
        "Load Balancing mengalihkan overflow otomatis — mencegah insiden Double 12 2022 terulang.",
      ],
      link: "/dashboard/hub/load-balance",
      linkLabel: "Buka Load Balancing",
    },
    {
      no: "03",
      q: "Analisis sistem COD: bandingkan proses & rekomendasi.",
      verdict: "COD 138 vs 75 menit — kurir jangan jadi kasir keliling",
      answer:
        "Rute COD butuh 138 menit vs non-COD 75 menit (+84%) untuk 8 paket / 5,3 km. Intervensi digital menurunkan waktu tunggu: " +
        (codIntel ? fmt(codIntel.impact.minutesSavedPerShift) + " menit/shift dihemat, kapasitas +" + fmt(codIntel.impact.extraCapacityPct) + "%" : "hingga 142 menit/shift dihemat") +
        ".",
      evidence: [
        "Waktu tunggu COD = 63 menit / 8 paket ≈ 7,9 menit/paket (verifikasi + bayar + inspeksi).",
        "4 intervensi: pre-payment link (−55%), PUDO (−75%), slot confirmation (−35%), clustering rute (−20%).",
        "Setiap menit yang dihemat = paket ekstra tanpa menambah kurir maupun armada.",
      ],
      link: "/dashboard/kurir/cod-intel",
      linkLabel: "Buka COD Intelligence",
    },
    {
      no: "04",
      q: "Roadmap & benefit-cost analisis inisiatif sustainability.",
      verdict: "3 fase, EV = 1,41% armada sebagai pilot terukur",
      answer:
        "Roadmap 3 fase (2024→2026+) dengan target 200 kendaraan bersih = " +
        (audit ? fmt(audit.fleet.evSharePct) + "%" : "1,41%") +
        " dari " + (audit ? fmt(audit.fleet.totalArmada) : "14.180") +
        " armada. Dimulai sebagai pilot rute urban, bukan belanja besar sekaligus; penyusutan 8 tahun & TCO dihitung.",
      evidence: [
        "Fase 1: 50 EV pilot urban Jawa + baseline emisi + reusable bag 8 hub.",
        "Fase 2: kepenuhan 200 EV + kemasan degradable + Predictive COD/PUDO.",
        "Fase 3: ekspansi van-truk listrik + sertifikasi ESG. Emisi/paket target −20% per 2027.",
      ],
      link: "/dashboard/data/ev-sites",
      linkLabel: "Buka EV Site Selection",
    },
    {
      no: "05",
      q: "Justifikasi strategi ekspansi pasar: profitable atau tidak?",
      verdict: "Profitable jika utilisasi & kompleksitas dikendalikan",
      answer:
        "Cost-to-sales relatif stabil (30,9% 2020 → 31,3% 2023), jadi masalahnya bukan margin per unit tetapi skala & kompleksitas. Ekspansi menguntungkan hanya bila utilisasi timur naik dan biaya " +
        "fixed-wilayah-timur bergeser ke model shared-risk sponsor.",
      evidence: [
        "Fulfilment +54,9% vs Net Sales +48,7% (2020→2023): biaya tumbuh lebih cepat dari pendapatan.",
        "Network partner tumbuh 23,9× (20→478) tetapi outlet hanya 3,3× — kompleksitas melonjak.",
        "Optimizer membebaskan kapasitas tanpa capex baru (utilisasi timur +" + (optimize ? fmt(optimize.summary.eastAvgUtilAfter - optimize.summary.eastAvgUtilBefore) : "22,1") + " poin).",
      ],
      link: "/dashboard/pusat/roi",
      linkLabel: "Buka ROI & BCA",
    },
    {
      no: "06",
      q: "Strategi lain menurunkan biaya sambil menjaga pendapatan?",
      verdict: "Eliminasi pemborosan + modal shift, bukan pemotongan harga",
      answer:
        "Tiga tuas: (1) hilangkan waktu tunggu COD (last-mile), (2) modal shift laut-udara via Control Tower untuk rute jauh, (3) Address Intelligence menekan komplain & retur. Semua menurunkan biaya tanpa memotong layanan.",
      evidence: [
        "Komplain 5,5/juta paket — Address Intelligence + geotag menargetkan <3/juta.",
        "Control Tower mengoordinasikan 2 moda tanpa capex armada baru.",
        "COD idle dihindari = proxy CO₂ turun (sustainability tercapai lewat efisiensi).",
      ],
      link: "/dashboard/data/multimodal",
      linkLabel: "Buka Control Tower",
    },
    ];
  }

  // Reaktif terhadap audit/optimize/codIntel (di-evaluasi ulang saat data live tiba).
  const questions = $derived(buildQuestions());
</script>

<svelte:head><title>Kerangka &amp; Analisis · Omnigistic</title></svelte:head>

<div class="wp min-h-screen antialiased">
  <!-- ============================= NAV ============================= -->
  <EditorialNav
    section="ANALISIS"
    links={[
      { href: "#kerangka", label: "Kerangka" },
      { href: "#bisnis", label: "Bisnis" },
      { href: "#data", label: "Data" },
      { href: "#pertanyaan", label: "Pertanyaan" },
      { href: "#solusi", label: "Solusi" }
    ]}
    cta={{ href: "/whitepaper", label: "Whitepaper" }}
  />

  <!-- ============================= HERO ============================= -->
  <section class="wp-hero">
    <HeroTexture />
    <div class="wp-wrap pt-[clamp(3rem,8vw,6rem)] pb-[clamp(2.5rem,5vw,4rem)]">
      <span class="wp-pill">
        <span class="wp-dot" aria-hidden="true">●</span>
        Kerangka &amp; Analisis · v2.4 · June 2026
      </span>
      <h1 class="wp-hero-title mt-7">
        Dari masalah ke solusi, <em class="wp-em">dengan dasar ilmu</em>.
      </h1>
      <p class="wp-deck mt-7">
        Kerangka analisis, pemahaman bisnis, pemahaman data, dan solusi beserta dampak
        serta KPI-nya — seluruh angka bersumber dari studi kasus, dan setiap asumsi tim diberi label.
      </p>
      <div class="wp-meta mt-12">
        {#each [
          { k: "Framing", v: "6 pertanyaan kasus" },
          { k: "Metode", v: "MECE · 5 Whys" },
          { k: "Kelengkapan", v: "13 gejala → 6 akar" },
          { k: "Penutup", v: "BCA + roadmap 3 fase" }
        ] as m (m.k)}
          <div>
            <p class="wp-label">{m.k}</p>
            <p class="wp-meta-value mt-1.5">{m.v}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <main class="wp-wrap">
    <!-- =========================== KERANGKA =========================== -->
    <section id="kerangka" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">01 — Kerangka analisis</p>
      <h2 class="wp-h2 mt-4 wp-prose">WHY, WHAT, HOW.</h2>
      <p class="wp-deck mt-5">
        WHY: GC Logistics tumbuh cepat, tetapi biaya tumbuh lebih cepat dan rentan guncangan
        eksternal. HOW: diagnosis MECE dan akar masalah, lalu desain solusi berbasis teori, diuji
        dengan BCA dan KPI. WHAT: enam akar masalah, masing-masing dengan solusi, dampak, dan KPI.
      </p>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Enam lapis kerangka (L1–L6)</caption>
          <thead>
            <tr>
              <th scope="col">Lapis</th>
              <th scope="col">Nama</th>
              <th scope="col">Alat</th>
              <th scope="col">Pertanyaan</th>
            </tr>
          </thead>
          <tbody>
            {#each layers as r (r.l)}
              <tr>
                <td>{r.l}</td>
                <td>{r.n}</td>
                <td>{r.t}</td>
                <td>{r.q}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-grid wp-grid-3 mt-8">
        {#each order as [n, t, d] (n)}
          <div class="wp-card-line">
            <p class="wp-index">{n}</p>
            <p class="wp-h3 mt-2">{t}</p>
            <p class="wp-muted mt-1.5 text-[0.9375rem]">{d}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- =========================== BISNIS =========================== -->
    <section id="bisnis" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">02 — Business understanding</p>
      <h2 class="wp-h2 mt-4 wp-prose">Konteks, model, dan tegangan.</h2>

      <div class="wp-grid wp-grid-3 mt-8">
        {#each biz as b (b.t)}
          <div class="wp-card">
            <p class="wp-h3">{b.t}</p>
            <p class="wp-muted mt-2 text-[0.9375rem] leading-relaxed">{b.d}</p>
          </div>
        {/each}
      </div>

      <div class="wp-table-wrap mt-6">
        <table class="wp-table">
          <caption>Kinerja finansial, Triliun IDR (2020 → 2023)</caption>
          <thead>
            <tr>
              <th scope="col">Kategori (Triliun IDR)</th>
              <th scope="col">2020</th>
              <th scope="col">2023</th>
              <th scope="col">Perubahan</th>
            </tr>
          </thead>
          <tbody>
            {#each fin as [k, a, b, c] (k)}
              <tr>
                <td>{k}</td>
                <td>{a}</td>
                <td>{b}</td>
                <td>{c}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        Rugi 2023, lalu EBIT positif 2024. Rasio biaya terhadap penjualan relatif stabil
        (30,9% → 31,3%), jadi masalahnya adalah skala dan kompleksitas, bukan rasio yang memburuk.
      </p>
    </section>

    <!-- =========================== DATA =========================== -->
    <section id="data" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">03 — Data understanding</p>
      <h2 class="wp-h2 mt-4 wp-prose">Bukan asumsi, tapi angka.</h2>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Peta sumber data studi kasus</caption>
          <thead>
            <tr>
              <th scope="col">Sumber</th>
              <th scope="col">Isi</th>
              <th scope="col">Angka kunci</th>
              <th scope="col">Akar</th>
            </tr>
          </thead>
          <tbody>
            {#each dataMap as [s, i, k, a] (s)}
              <tr>
                <td>{s}</td>
                <td>{i}</td>
                <td>{k}</td>
                <td>{a}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-grid wp-grid-2 mt-6" style="grid-template-columns: 1.2fr 1fr">
        <div class="wp-card">
          <p class="wp-label">Metrik turunan</p>
          <ul class="wp-list mt-3 space-y-2">
            {#each derivedMetrics as d (d)}<li>{d}</li>{/each}
          </ul>
        </div>
        <div class="wp-card wp-flag">
          <p class="wp-label">Keterbatasan data</p>
          <ul class="wp-list mt-3 space-y-2">
            {#each gaps as g (g)}<li>{g}</li>{/each}
          </ul>
        </div>
      </div>
    </section>

    <!-- =========================== PERTANYAAN =========================== -->
    <section id="pertanyaan" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">04 — Enam pertanyaan strategis</p>
      <h2 class="wp-h2 mt-4 wp-prose">Jawaban, dengan angka yang bisa diaudit.</h2>
      <p class="wp-deck mt-5">
        Setiap pertanyaan kasus dijawab dengan verdict, alasan, bukti kuantitatif dari mesin
        analitik, dan tautan ke karya interaktifnya.
      </p>
      {#if checked}
        <p class="wp-muted mt-3 inline-flex items-center gap-2 text-[0.8125rem]">
          <span class="wp-dot" aria-hidden="true">●</span>
          {live ? "Angka live dari mesin backend" : "Backend offline — memakai angka dasar studi kasus"}
        </p>
      {/if}

      <div class="wp-grid wp-grid-2 mt-8">
        {#each questions as q (q.no)}
          <article class="wp-card flex flex-col">
            <div class="flex items-start gap-3">
              <span class="wp-index">{q.no}</span>
              <h3 class="wp-h3 leading-snug">{q.q}</h3>
            </div>
            <p class="wp-verdict mt-3">{q.verdict}</p>
            <p class="wp-muted mt-3 text-[0.9375rem] leading-relaxed">{q.answer}</p>
            <ul class="wp-list mt-4 space-y-2 border-t border-[var(--wp-line)] pt-4">
              {#each q.evidence as e (e)}
                <li>{e}</li>
              {/each}
            </ul>
            <a href={resolveHref(q.link)} class="wp-cta mt-5">{q.linkLabel} <span aria-hidden="true">→</span></a>
          </article>
        {/each}
      </div>
    </section>

    <!-- =========================== SOLUSI =========================== -->
    <section id="solusi" use:gsapReveal class="wp-section scroll-mt-16">
      <p class="wp-label">05 — Solusi &amp; dampak</p>
      <h2 class="wp-h2 mt-4 wp-prose">Enam akar, enam dampak terukur.</h2>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Solusi, dampak bisnis, dan KPI per akar</caption>
          <thead>
            <tr>
              <th scope="col">Akar</th>
              <th scope="col">Solusi</th>
              <th scope="col">Dampak bisnis</th>
              <th scope="col">KPI</th>
            </tr>
          </thead>
          <tbody>
            {#each sol as s (s.n)}
              <tr>
                <td>{s.n} · {s.root}</td>
                <td>{s.name}</td>
                <td>{s.impact}</td>
                <td>{s.kpi}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-grid wp-grid-3 mt-8">
        {#each arch as a (a.l)}
          <div class="wp-card">
            <p class="wp-h3">{a.l}</p>
            <p class="wp-muted mt-1 text-[0.9375rem]">{a.t}</p>
            <p class="wp-muted mt-2 text-[0.9375rem] leading-relaxed">{a.d}</p>
          </div>
        {/each}
      </div>

      <div class="wp-grid wp-grid-3 mt-6">
        {#each phases as p (p.f)}
          <div class="wp-card-line">
            <p class="wp-kicker">{p.f} · {p.t}</p>
            <p class="wp-body mt-3 text-[0.9375rem] leading-relaxed">{p.w}</p>
          </div>
        {/each}
      </div>

      <div class="wp-note mt-8 max-w-[68ch]">
        <span class="wp-label">Lanjutan</span>
        <p class="mt-2" style="color: var(--wp-fg)">
          Benefit-cost analysis penuh untuk inisiatif armada listrik tersedia di
          <a href={resolveHref("/whitepaper")} class="wp-link">Whitepaper EV Fleet BCA</a> —
          dengan benchmark nasional, skema Battery-as-a-Service, dan stress-test replacement vs
          fleet tambahan.
        </p>
      </div>
    </section>
  </main>

  <!-- =========================== FOOTER =========================== -->
  <footer class="border-t border-[var(--wp-line)]">
    <div class="wp-wrap flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
      <p class="wp-mono text-[0.75rem] tracking-[0.05em] wp-muted">
        ANGKA DARI TABLE 1–4 &amp; FIGURE 1–2 · ASUMSI TIM BERLABEL
      </p>
      <div class="flex items-center gap-5">
        <a href={resolveHref("/")} class="wp-nav-link">Beranda →</a>
        <a href={resolveHref("/dashboard/methodology")} class="wp-nav-link">Methodology →</a>
        <a href={resolveHref("/login")} class="wp-nav-link">Portal →</a>
      </div>
    </div>
  </footer>
</div>
