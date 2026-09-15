<script lang="ts">
  import { onMount } from "svelte";
  import { gsapReveal } from "$lib/actions/gsapReveal";
  import Icon from "$lib/components/Icon.svelte";
  import { cn, resolveHref } from "$lib/utils";

  const navLinks = [
    { href: "#jawaban", label: "Jawaban" },
    { href: "#diagnosis", label: "Diagnosis" },
    { href: "#solusi", label: "Solusi" },
    { href: "#arsitektur", label: "Sistem" },
    { href: "/analisis", label: "Analisis" }
  ];

  const rootCauses: Array<{ code: string; title: string; titleId: string; icon: import("$lib/icon-names").IconName; symptoms: string; solution: string; kpi: string }> = [
    { code: "RC1", title: "Unchecked Expansion", titleId: "Ekspansi tak selaras", icon: "compass",
      symptoms: "Fulfilment expense naik 54,9% vs net sales +48,7%. Rugi 2023. Utilisasi timpang: JKT 90,4% vs DJJ 28,1%.",
      solution: "Model hibrida berbasis utilisasi + Digital Twin 23 hub.", kpi: "Timur 41,5% → ≥55%" },
    { code: "RC2", title: "Fixed Capacity, Volatile Demand", titleId: "Kapasitas fixed + demand tunggal", icon: "chart",
      symptoms: "Fluktuasi 78-105M/bulan (34,6%). TikTok suspen tumbang -29,8% e-com Sep→Okt. Jawa overload saat Double 12.",
      solution: "Forecast per hub + kapasitas elastis 3 tingkat + diversifikasi demand.", kpi: "MAPE <10%, eksposur <20%" },
    { code: "RC3", title: "Manual Last-Mile & Cash", titleId: "Last-mile manual-cash", icon: "currency",
      symptoms: "COD 138 min vs non-COD 75 (+84%). Produktivitas COD 3,48/jam vs 6,4. Rekonsiliasi kas rawan error.",
      solution: "Predictive COD + clustering rute + PUDO + digitalisasi rekonsiliasi.", kpi: "COD ≤100 min, +38% kapasitas" },
    { code: "RC4", title: "Dirty Data, Blind Multi-modal", titleId: "Data kotor + buta multimoda", icon: "map",
      symptoms: "Complaint 5,5/juta. Alamat ambigu (jalan sama, 3 kota). Koordinasi laut-udara makin kompleks.",
      solution: "Address Intelligence + Control Tower multimoda + Modal Shift Optimizer.", kpi: "<3/juta, geotag ≥95%" },
    { code: "RC5", title: "Capability Lagging Growth", titleId: "Kapabilitas tertinggal", icon: "grad",
      symptoms: "'Lacked deep operational expertise, management experience, technical knowledge'. Model bisnis under review.",
      solution: "Nigi Academy + tim data science + Digital Twin sebagai alat uji keputusan.", kpi: "100% manajer tersertifikasi" },
    { code: "RC6", title: "Sustainability = Purchase, Not Design", titleId: "Keberlanjutan bukan sistem", icon: "globe",
      symptoms: "Target 200 EV hanya 1,4% dari 14.180 armada. Beli aset ≠ ubah keputusan operasional harian.",
      solution: "Carbon account per rute + modal shift + roadmap 3 fase + replacement 8 tahun.", kpi: "Emisi/paket -20% per 2027" }
  ];

  const heroProjects = [
    { num: "01", name: "Executive & Digital Twin", meta: "Portal Pusat · Finansial", seed: "exec-pusat", id: "pusat",
      desc: "KPI finansial, Digital Twin 23 hub, utilisasi per region." },
    { num: "02", name: "Forecast & Load Balance", meta: "Portal Hub · Bandung", seed: "hub-dashboard", id: "hub",
      desc: "Forecast demand, load balancing antar-hub, alert dini kapasitas." },
    { num: "03", name: "Predictive COD & Rute", meta: "Portal Kurir · Jakarta", seed: "kurir-cod", id: "kurir",
      desc: "Clustering rute, skor risiko sukses COD, slot confirmation." },
    { num: "04", name: "Address Intelligence", meta: "Portal Data · Nasional", seed: "data-address", id: "data",
      desc: "Address Intelligence, monitoring komplain, control tower multimoda." }
  ];

  const roles = [
    { slug: "PUSAT", name: "Dalila", role: "Decision Maker Pusat", desc: "KPI finansial, Digital Twin, utilisasi 23 hub, ekspansi.", initials: "D" },
    { slug: "HUB", name: "Marwah", role: "Hub Manager Bandung", desc: "Forecast, load balancing, kapasitas, alert dini.", initials: "M" },
    { slug: "KURIR", name: "Baits", role: "Courier Jakarta", desc: "Clustering rute, Predictive COD, slot, pembayaran digital.", initials: "B" },
    { slug: "DATA", name: "Virgiawan", role: "Data & IT", desc: "Address Intelligence, komplain, control tower, emisi.", initials: "V" },
    { slug: "CUSTOMER", name: "Sari", role: "Pembeli", desc: "Belanja di e-commerce, checkout COD dengan skor risiko, lacak pengantaran.", initials: "S" }
  ];

  let menuOpen = $state(false);
  let loaded = $state(false);

  onMount(() => {
    const raf = requestAnimationFrame(() => (loaded = true));
    return () => cancelAnimationFrame(raf);
  });

  let scrolled = $state(false);
  onMount(() => {
    const onScroll = () => (scrolled = window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });

  const surfaceGrowth = [
    { label: "Parcels (2024)", value: "1,46B", delta: "+28%" },
    { label: "Market Share", value: "20,6%", delta: "5 yrs leader" },
    { label: "EBIT", value: "2024", delta: "back to positive" }
  ];
  const surfaceConcern = [
    { label: "Fulfilment Expense", value: "+54,9%", delta: "vs sales +48,7%" },
    { label: "Utilisation Gap", value: "62,3 pts", delta: "JKT 90,4% vs DJJ 28,1%" },
    { label: "Complaint Rate", value: "5,5/M", delta: "≈6.105 kasus/yr" }
  ];

  const approach = [
    { n: "(01)", t: "Data jadi satu sumber", d: "OMS, WMS, PUDO, dan Address Intelligence berbagi satu sumber kebenaran. Setiap keputusan merujuk data yang sama, bukan silo." },
    { n: "(02)", t: "Insight proaktif per peran", d: "Nigi AI menyapa tiap manajer dengan ringkasan harian. Fokus, bukan notifikasi." },
    { n: "(03)", t: "Keputusan terukur sejak hari pertama", d: "Digital Twin menguji skenario sebelum dieksekusi. KPI baseline→target selalu tampak." }
  ];

  const arch = [
    { layer: "OMS", title: "Order Management System", desc: "Otak order: status paket, penugasan kurir, routing, integrasi marketplace." },
    { layer: "WMS", title: "Warehouse Management System", desc: "Manajemen gudang: inbound, sorting, outbound, kapasitas rak, inventaris." },
    { layer: "PUDO", title: "Pick-Up Drop-Off Network", desc: "Jaringan titik: lokasi, kapasitas rak, retensi paket, integrasi mitra ritel." }
  ];

  const phases = [
    { f: "Fase 1", t: "2024-2025", w: "Baseline emisi, 50 EV pilot rute urban Jawa, Address Intelligence roll-out, reusable transit bag di 8 hub Jawa.", s: "Proof-of-concept self-funding" },
    { f: "Fase 2", t: "2025-2026", w: "Kepenuhan 200 EV, infrastruktur charging data-driven, kemasan degradable penuh, Predictive COD + PUDO.", s: "Skala ke nasional" },
    { f: "Fase 3", t: "2026+", w: "Ekspansi van-truk listrik, Control Tower laut-udara, sertifikasi ESG, regional sponsor penuh untuk timur.", s: "Struktural perubahan model" }
  ];

  const targets = [
    ["Utilisasi hub timur", "41,5%", "≥55%"],
    ["Rute COD 8 paket", "138 menit", "≤100 menit"],
    ["Produktivitas kurir COD", "3,48/jam", "≥4,8/jam"],
    ["Complaint rate", "5,5 / juta", "<3 / juta"],
    ["Forecast accuracy", "belum ada", "MAPE <10%"],
    ["Eksposur e-commerce", "57,7%", "<20% / platform"]
  ];

  type Answer = { n: string; q: string; a: string; metrics: string[]; links: Array<{ href: string; label: string }> };
  const answers: Answer[] = [
    {
      n: "Q1",
      q: "Haruskah GC beralih dari Direct Operation ke Regional Sponsor?",
      a: "Tidak sepenuhnya. Model hibrida berbasis utilisasi: Jawa tetap Direct Operation karena volume padat dan terintegrasi, Kalimantan-Sulawesi bertahap, Maluku-Papua penuh. Pemicunya utilisasi di bawah 50% selama dua kuartal, dan tiap skenario diuji dulu di Digital Twin.",
      metrics: ["Timur 41,5% → 55%", "Jakarta 90,4% → 80-85%", "Throughput +45% tanpa capex"],
      links: [{ href: "/dashboard/pusat/digital-twin", label: "Digital Twin" }, { href: "/dashboard/pusat/network", label: "Network Expansion" }]
    },
    {
      n: "Q2",
      q: "Bagaimana menghadapi fluktuasi demand?",
      a: "Forecast per hub (kalender promo, siklus gajian, libur, sinyal regulasi) plus kapasitas elastis tiga tingkat. Eksposur tiap platform dibatasi 20 persen volume. Hub timur yang menganggur jadi penyerap overflow.",
      metrics: ["MAPE < 10%", "Eksposur < 20% per platform", "Overload puncak → nol"],
      links: [{ href: "/dashboard/hub/forecast", label: "Demand Forecast" }, { href: "/dashboard/hub/load-balance", label: "Load Balancing" }]
    },
    {
      n: "Q3",
      q: "Bagaimana memperbaiki sistem COD?",
      a: "Pisahkan COD dari non-COD. Predictive COD memberi skor risiko per paket: risiko rendah antar normal, risiko tinggi ke PUDO atau pre-payment. Rute dikelompokkan per zona, rekonsiliasi kas didigitalkan, tunai tetap tersedia di PUDO untuk segmen unbanked.",
      metrics: ["Rute 138 → ≤ 100 menit", "3,48 → ≥ 4,8 paket/jam", "Digital ≥ 50% / 18 bulan"],
      links: [{ href: "/dashboard/kurir/cod-risk", label: "Predictive COD" }, { href: "/dashboard/kurir/pudo", label: "PUDO Network" }]
    },
    {
      n: "Q4",
      q: "Bagaimana roadmap dan benefit-cost keberlanjutan?",
      a: "Emisi jadi metrik harian per rute dan moda, bukan sekadar pembelian aset. Tiga fase: pilot 50 EV, lalu 200 EV plus charging data-driven, lalu ekspansi van dan truk. Ditambah policy penyusutan 8 tahun yang mengganti fosil secara alami tanpa lonjakan capex.",
      metrics: ["Emisi/paket −20% / 2027", "On-time tidak turun", "Kemasan sekali pakai −50%"],
      links: [{ href: "/dashboard/data/fleet", label: "Fleet & Emissions" }, { href: "/dashboard/data/ev-sites", label: "EV Site Selection" }]
    },
    {
      n: "Q5",
      q: "Apakah ekspansi pasar profitable?",
      a: "Ya, dengan syarat model hibrida dan intensifikasi Jawa. Kesalahan full-ownership 2021-2023 (partner naik 23,9x, biaya tumbuh lebih cepat dari penjualan) tidak diulang. Kapital dari wilayah timur dialihkan ke intensifikasi hub Jawa.",
      metrics: ["Pangsa 20,6%, 5 tahun", "Volume +28%", "EBIT positif 2024"],
      links: [{ href: "/dashboard/pusat/executive", label: "Executive" }, { href: "/dashboard/pusat/roi", label: "ROI & BCA" }]
    },
    {
      n: "Q6",
      q: "Strategi lain turunkan biaya sambil jaga pendapatan?",
      a: "Bereskan data di hulu dan ambil kendali tanpa beli aset. Address Intelligence memvalidasi alamat saat checkout. Control Tower menyatukan ETA mitra laut-udara. Modal shift memindahkan paket non-ekspres ke laut. Empty run dieliminasi.",
      metrics: ["Komplain 5,5 → < 3/juta", "Geotag ≥ 95% checkout", "Empty run −40%"],
      links: [{ href: "/dashboard/data/address", label: "Address Intelligence" }, { href: "/dashboard/data/multimodal", label: "Control Tower" }]
    }
  ];

  const solutions = [
    { n: "01", root: "Ekspansi tak selaras", name: "Hibrida berbasis utilisasi", impact: "Biaya wilayah timur berubah dari fixed menjadi shared risk", kpi: "Utilisasi timur 41,5% → 55%" },
    { n: "02", root: "Kapasitas vs demand", name: "Kapasitas elastis + forecast per hub", impact: "Overload saat puncak turun ke nol", kpi: "MAPE < 10%; eksposur < 20%/platform" },
    { n: "03", root: "Last-mile manual & COD", name: "Predictive COD + PUDO", impact: "Rute COD terpangkas, kapasitas kurir naik tanpa rekrutmen", kpi: "Rute 138 → ≤ 100 menit; +38% kapasitas" },
    { n: "04", root: "Data kotor & buta multimoda", name: "Address Intelligence + Control Tower", impact: "Komplain turun; kendali 2 moda tanpa beli aset", kpi: "Komplain 5,5 → < 3/juta; geotag ≥ 95%" },
    { n: "05", root: "Kapabilitas tertinggal", name: "Nigi Academy + Digital Twin", impact: "Keputusan strategis lebih cepat dan andal", kpi: "100% manajer tersertifikasi" },
    { n: "06", root: "Keberlanjutan bukan sistem", name: "Carbon per rute + penyusutan 8 tahun", impact: "Emisi turun tanpa lonjakan capex", kpi: "Emisi/paket −20% per 2027" }
  ];

  const impactRows = [
    ["Utilisasi hub timur", "41,5%", "55%"],
    ["Rute COD (8 paket)", "138 menit", "≤100 menit"],
    ["Complaint rate", "5,5 / juta", "<3 / juta"],
    ["Emisi per paket", "baseline", "−20% / 2027"]
  ];
</script>

<div class={cn("landing min-h-screen antialiased", loaded && "loaded")} style="background: var(--lnd-bg); color: var(--lnd-ink)">
  <a href="#lnd-main" class="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-full focus:bg-[var(--lnd-ink)] focus:px-5 focus:py-2.5 focus:text-sm focus:text-[var(--lnd-bg)]">Lewati ke konten</a>

  <!-- Header -->
  <header class="fixed inset-x-0 top-0 z-50 border-b transition-all duration-300" style="background: {scrolled ? 'color-mix(in srgb, var(--lnd-bg) 86%, transparent)' : 'transparent'}; backdrop-filter: {scrolled ? 'blur(12px)' : 'none'}; border-color: {scrolled ? 'var(--lnd-line)' : 'transparent'}">
    <div class="mx-auto relative z-[51] flex h-[76px] max-w-[1520px] items-center gap-10 px-[clamp(1.25rem,4vw,4.5rem)]">
      <a href="#lnd-main" aria-label="Omnigistic, beranda" class="flex items-baseline gap-1 font-serif text-[21px] font-semibold tracking-[0.02em]">
        Omnigistic
      </a>
      <nav class="mx-auto hidden items-center gap-8 md:flex" aria-label="Navigasi utama">
        {#each navLinks as n (n.href)}
          <a href={resolveHref(n.href)} class="relative py-2 text-[14px] font-medium uppercase tracking-[0.07em] text-[var(--lnd-ink)] transition-colors hover:text-[color:var(--lnd-accent-ink)] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-[var(--lnd-accent)] after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100">{n.label}</a>
        {/each}
      </nav>
      <div class="ml-auto flex items-center gap-5 md:ml-0">
        <a href={resolveHref("/login")} class="hidden rounded-full bg-[var(--lnd-ink)] px-6 py-3 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-bg)] transition-colors hover:bg-[var(--lnd-accent)] sm:inline-flex">Masuk Portal</a>
        <button type="button" onclick={() => (menuOpen = !menuOpen)} aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} class="flex h-11 w-11 flex-col items-center justify-center gap-[7px] rounded-lg p-2.5 md:hidden">
          <span class={cn("block h-[1.5px] w-6 transition-transform duration-300", menuOpen ? "translate-y-[4.5px] rotate-45" : "")}></span>
          <span class={cn("block h-[1.5px] w-6 transition-transform duration-300", menuOpen ? "-translate-y-[4.5px] -rotate-45" : "")}></span>
        </button>
      </div>
    </div>

    {#if menuOpen}
      <div class="fixed inset-0 z-40 flex flex-col justify-center bg-[var(--lnd-ink)] px-[clamp(1.5rem,6vw,3rem)] text-[var(--lnd-bg)] md:hidden" role="dialog" aria-modal="true" aria-label="Menu seluler">
        <nav aria-label="Menu seluler" class="flex flex-col gap-1">
          {#each navLinks as n, i (n.href)}
            <a href={resolveHref(n.href)} onclick={() => (menuOpen = false)} class="flex items-baseline gap-3 py-1 font-serif text-[clamp(2rem,8vw,3.2rem)] font-light leading-[1.15]">
              <span class="text-[14px] font-semibold tracking-[0.07em] text-[var(--lnd-accent)]">0{i + 1}</span>
              {n.label}
            </a>
          {/each}
        </nav>
      </div>
    {/if}
  </header>

  <main id="lnd-main" class="pt-[76px] scroll-mt-[76px]">
    <!-- HERO -->
    <section class="px-[clamp(1.25rem,4vw,4.5rem)] pt-[clamp(5rem,11vh,8rem)] pb-[clamp(3rem,7vw,6rem)]">
      <div class="mx-auto max-w-[1720px]">
        <p class="eyebrow">Sistem Terusik · ISCEA 2026</p>
        <h1 class="mt-10 font-serif text-[clamp(3rem,10vw,8.5rem)] font-normal leading-[1.0] tracking-[-0.015em]">
          <span class="block overflow-hidden pb-[0.34em] -mb-[0.34em]"><span class="line-inner block">Sistem saraf <em class="font-medium italic">last-mile</em></span></span>
          <span class="block overflow-hidden"><span class="line-inner block pb-[0.06em]" style="animation-delay: 140ms">di atas <em class="font-medium italic">17.000 pulau</em><span class="text-[var(--lnd-accent)]">.</span></span></span>
        </h1>

        <div class="mt-12 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:gap-16">
          <div>
            <p class="max-w-[52ch] text-[1.05rem] leading-relaxed text-[var(--lnd-soft)]">
              <strong class="font-semibold text-[var(--lnd-ink)]">23 hub, 3.200 titik, 13.340 kendaraan</strong>
              dalam satu sumber kebenaran. Nigi AI menyapa tiap manajer dengan insight dari data studi kasus.
            </p>
            <div class="mt-8 flex flex-wrap gap-4">
              <a href="#jawaban" class="rounded-full bg-[var(--lnd-ink)] px-8 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-bg)] transition-all hover:bg-[var(--lnd-accent)] active:scale-[0.98]">
                Enam Jawaban <Icon name="arrow-up-right" cls="ml-2 inline h-4 w-4" weight="bold" />
              </a>
              <a href="#arsitektur" class="rounded-full border border-[var(--lnd-ink)] px-8 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-ink)] transition-all hover:border-[var(--lnd-accent-ink)] hover:text-[color:var(--lnd-accent-ink)] active:scale-[0.98]">Tentang Sistem</a>
            </div>
          </div>

          <div class="animate-rise grid grid-cols-2 gap-3" style="animation-delay: 240ms">
            <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
              <p class="font-serif text-[clamp(1.8rem,3.4vw,3rem)] font-light tabular-nums leading-none">23</p>
              <p class="mt-2 text-[14px] font-medium text-[var(--lnd-ink)]">hub aktif</p>
              <p class="mt-0.5 text-[14px] text-[color:var(--lnd-soft)]">1987→2024</p>
            </div>
            <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
              <p class="font-serif text-[clamp(1.8rem,3.4vw,3rem)] font-light tabular-nums leading-none">1,46</p>
              <p class="mt-2 text-[14px] font-medium text-[var(--lnd-ink)]">miliar paket 2024</p>
              <p class="mt-0.5 text-[14px] text-[color:var(--lnd-soft)]">+28% YoY</p>
            </div>
            <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
              <p class="font-serif text-[clamp(1.8rem,3.4vw,3rem)] font-light tabular-nums leading-none">20,6</p>
              <p class="mt-2 text-[14px] font-medium text-[var(--lnd-ink)]">market share</p>
              <p class="mt-0.5 text-[14px] text-[color:var(--lnd-soft)]">5 tahun beruntun</p>
            </div>
            <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-5">
              <p class="font-serif text-[clamp(1.8rem,3.4vw,3rem)] font-light tabular-nums leading-none">90,4%</p>
              <p class="mt-2 text-[14px] font-medium text-[var(--lnd-ink)]">utilisasi Jakarta</p>
              <p class="mt-0.5 text-[14px] text-[color:var(--lnd-soft)]">vs Jayapura 28,1%</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ENAM JAWABAN -->
    <section use:gsapReveal id="jawaban" class="scroll-mt-[84px] border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <p class="eyebrow">Jawaban</p>
          <h2 class="mt-6 font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">Enam pertanyaan kasus, <em class="italic">enam jawaban</em></h2>
          <p class="mt-4 max-w-[52ch] text-sm leading-relaxed text-[var(--lnd-soft)]">Tiap kartu menautkan pertanyaan studi kasus ke layar yang menjawabnya. Angka dari Table 1-4 dan Figure 1-2; asumsi tim berlabel.</p>
        </div>
        <ol class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-line)] sm:grid-cols-2 lg:grid-cols-3">
          {#each answers as a (a.n)}
            <li class="flex flex-col gap-3 bg-[var(--lnd-surface)] p-6 transition-colors hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-center justify-between">
                <span class="font-serif text-[15px] italic tabular-nums text-[var(--lnd-accent-ink)]">{a.n}</span>
                <span class="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--lnd-line)] text-[var(--lnd-accent)]">
                  <Icon name="arrow-up-right" cls="h-3.5 w-3.5" weight="bold" />
                </span>
              </div>
              <p class="text-[16px] font-semibold leading-snug tracking-tight text-[var(--lnd-ink)]">{a.q}</p>
              <p class="text-[15px] leading-relaxed text-[var(--lnd-soft)]">{a.a}</p>
              <ul class="flex flex-wrap gap-1.5">
                {#each a.metrics as m (m)}
                  <li class="rounded-full border border-[var(--lnd-line)] bg-[var(--lnd-bg-raise)] px-2.5 py-1 text-[13.5px] font-semibold text-[var(--lnd-ink)]">{m}</li>
                {/each}
              </ul>
              <div class="mt-auto flex flex-wrap gap-3 border-t border-dashed border-[var(--lnd-line-soft)] pt-3">
                {#each a.links as l (l.href)}
                  <a href={resolveHref(l.href)} class="inline-flex items-center gap-1 text-[13.5px] font-semibold uppercase tracking-[0.06em] text-[var(--lnd-accent-ink)] transition-colors hover:text-[var(--lnd-ink)]">
                    {l.label} <Icon name="arrow-up-right" cls="h-3 w-3" weight="bold" />
                  </a>
                {/each}
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </section>



    <!-- SURFACE STORY -->
    <section class="px-[clamp(1.25rem,4vw,4.5rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <h2 class="mt-6 max-w-3xl font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">
            Angka headline bagus, <em class="italic">tapi tidak jujur</em>
          </h2>
        </div>
        <div class="mt-12 grid gap-8 lg:grid-cols-2">
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <div class="flex items-center gap-2 text-[15px] font-semibold text-[color:var(--lnd-positive-on-ink)]">
              <Icon name="trend" cls="h-4 w-4" weight="bold" /> Sisi positif: growth
            </div>
            <div class="mt-5 space-y-3">
              {#each surfaceGrowth as g (g.label)}
                <div class="flex items-baseline justify-between rounded-xl bg-[var(--lnd-bg-raise)] px-4 py-3">
                  <span class="text-sm text-[var(--lnd-soft)]">{g.label}</span>
                  <span class="font-bold tabular-nums text-[var(--lnd-ink)]">{g.value}<span class="ml-2 text-[14px] font-semibold text-[color:var(--lnd-positive-on-ink)]">{g.delta}</span></span>
                </div>
              {/each}
            </div>
          </div>
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <div class="flex items-center gap-2 text-[15px] font-semibold text-[var(--lnd-late)]">
              <Icon name="warn" cls="h-4 w-4" weight="bold" /> Sisi struktural: cost gap
            </div>
            <div class="mt-5 space-y-3">
              {#each surfaceConcern as c (c.label)}
                <div class="flex items-baseline justify-between rounded-xl bg-[var(--lnd-bg-raise)] px-4 py-3">
                  <span class="text-sm text-[var(--lnd-soft)]">{c.label}</span>
                  <span class="font-bold tabular-nums text-[var(--lnd-ink)]">{c.value}<span class="ml-2 text-[14px] font-semibold text-[var(--lnd-late)]">{c.delta}</span></span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- DIAGNOSIS -->
    <section use:gsapReveal  id="diagnosis" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p class="eyebrow">Diagnosis</p>
            <h2 class="mt-6 font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">13 gejala → <em class="text-[var(--lnd-accent-ink)] italic">6 akar masalah</em></h2>
          </div>
          <p class="max-w-sm text-sm leading-relaxed text-[var(--lnd-soft)]">Setiap akar punya solusi Omnigistic yang jelas + KPI baseline→target dari dokumen studi kasus.</p>
        </div>
        <ol class="my-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-line)] sm:grid-cols-2 lg:grid-cols-3">
          {#each rootCauses as rc (rc.code)}
            <li class="group relative flex flex-col gap-3 bg-[var(--lnd-surface)] p-6 transition-colors hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-start justify-between">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lnd-ink)] text-[var(--lnd-bg)] transition-colors group-hover:bg-[var(--lnd-accent)]">
                  <Icon name={rc.icon} cls="h-5 w-5" weight="duotone" />
                </span>
                <span class="font-serif text-[15px] italic tabular-nums text-[var(--lnd-accent-ink)]">{rc.code}</span>
              </div>
              <div>
                <p class="text-[16px] font-semibold leading-tight tracking-tight text-[var(--lnd-ink)]">{rc.title}</p>
                <p class="mt-1 font-serif text-[15px] italic text-[var(--lnd-soft)]">{rc.titleId}</p>
              </div>
              <p class="text-[15px] leading-relaxed text-[var(--lnd-soft)]"><span class="font-medium text-[var(--lnd-ink)]">Gejala:</span> {rc.symptoms.slice(0, 130)}&hellip;</p>
              <div class="mt-auto rounded-xl border border-[var(--lnd-line)] bg-[var(--lnd-bg-raise)] p-3">
                <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-soft)]">Solusi Omnigistic</p>
                <p class="mt-1 text-[15px] leading-snug text-[var(--lnd-ink)]">{rc.solution.slice(0, 135)}&hellip;</p>
                <p class="mt-2 text-[14px] font-semibold text-[var(--lnd-accent-ink)]">{rc.kpi}</p>
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- SOLUSI -->
    <section use:gsapReveal id="solusi" class="scroll-mt-[84px] border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p class="eyebrow">Solusi</p>
            <h2 class="mt-6 font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">Enam solusi, <em class="italic">satu sistem</em></h2>
          </div>
          <p class="max-w-sm text-sm leading-relaxed text-[var(--lnd-soft)]">Setiap solusi menunjuk akar yang diserang, dampak bisnisnya, dan KPI dari studi kasus.</p>
        </div>

        <ol class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-line)] sm:grid-cols-2 lg:grid-cols-3">
          {#each solutions as s (s.n)}
            <li class="flex flex-col gap-3 bg-[var(--lnd-surface)] p-6 transition-colors hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-center justify-between">
                <span class="font-serif text-[15px] italic tabular-nums text-[var(--lnd-accent-ink)]">{s.n}</span>
                <span class="hub-label text-[13px] text-[var(--lnd-soft)]">{s.root}</span>
              </div>
              <p class="text-[16px] font-semibold leading-snug tracking-tight text-[var(--lnd-ink)]">{s.name}</p>
              <p class="text-[15px] leading-relaxed text-[var(--lnd-soft)]">{s.impact}</p>
              <p class="mt-auto border-t border-dashed border-[var(--lnd-line-soft)] pt-3 text-[14px] font-semibold text-[var(--lnd-accent-ink)]">{s.kpi}</p>
            </li>
          {/each}
        </ol>

        <div class="mt-6 grid gap-4 rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-ink)] p-8 text-[var(--lnd-bg)] sm:grid-cols-2 lg:grid-cols-4">
          {#each impactRows as [m, b, t] (m)}
            <div>
              <p class="text-[13.5px] uppercase tracking-wider text-[var(--lnd-on-ink)]">{m}</p>
              <p class="mt-2 font-serif text-[clamp(1.4rem,2.4vw,2rem)] font-light leading-none tabular-nums">{t}</p>
              <p class="mt-1 text-[14px] text-[var(--lnd-on-ink)] line-through">{b}</p>
            </div>
          {/each}
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-4">
          <a href={resolveHref("/analisis")} class="inline-flex items-center gap-2 rounded-full bg-[var(--lnd-ink)] px-8 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-bg)] transition-colors hover:bg-[var(--lnd-accent)]">
            Kerangka, analisis & dampak lengkap <Icon name="arrow-up-right" cls="h-4 w-4" weight="bold" />
          </a>
          <span class="text-[14px] text-[var(--lnd-soft)]">Angka dari Table 1-4 dan Figure 1-2; asumsi tim berlabel.</span>
        </div>
      </div>
    </section>

    <!-- INDEX PROYEK -->
    <section id="proyek" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] pt-2 pb-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <h2 class="font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">Satu sumber <em class="italic">kebenaran</em></h2>
        </div>
        <ol class="mt-10">
          {#each heroProjects as p (p.num)}
            <li>
              <a href={resolveHref(`/dashboard/${p.id}/overview`)} class="group grid w-full cursor-pointer grid-cols-[3rem_1fr] items-center gap-3 border-t border-[var(--lnd-line)] px-2 py-6 text-left transition-[background,padding] duration-300 hover:bg-[var(--lnd-ink)] hover:pl-6 hover:text-[var(--lnd-bg)] sm:grid-cols-[3rem_1fr_11rem] md:grid-cols-[3rem_1fr_auto_11rem_2rem]">
                <span class="font-serif text-[16px] italic tabular-nums text-[var(--lnd-accent-ink)]">{p.num}</span>
                <h3 class="font-serif text-[clamp(1.4rem,3vw,2.4rem)] font-light leading-tight tracking-tight transition-transform duration-300 group-hover:translate-x-2">{p.name}</h3>
                <span class="hidden text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-soft)] transition-colors md:block">{p.meta}</span>
                <span class="hidden text-right text-[14px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-soft)] transition-colors sm:block group-hover:text-[var(--lnd-on-ink)]">{p.desc.slice(0, 44)}</span>
                <span class="hidden justify-end text-[var(--lnd-accent)] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:flex">
                  <Icon name="arrow-up-right" cls="h-5 w-5" weight="bold" />
                </span>
              </a>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- PENDEKATAN -->
    <section use:gsapReveal  id="pendekatan" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <h2 class="font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">Cara sistem <em class="italic">bekerja</em></h2>
        </div>
        <ol class="mt-12 space-y-10">
          {#each approach as ap, i (ap.n)}
            <li class="border-t border-[var(--lnd-ink)] pt-5" style="margin-left: {i * 22}%">
              <span class="font-serif text-[16px] italic text-[var(--lnd-accent-ink)]">{ap.n}</span>
              <h3 class="mt-2 font-serif text-[clamp(1.5rem,2.8vw,2.1rem)] font-light leading-tight tracking-tight">{ap.t}</h3>
              <p class="mt-3 max-w-[46ch] leading-relaxed text-[var(--lnd-soft)]">{ap.d}</p>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- ARSITEKTUR -->
    <section use:gsapReveal  id="arsitektur" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <p class="eyebrow">Arsitektur</p>
          <h2 class="mt-6 font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">Tiga lapis + <em class="italic">Nigi AI</em></h2>
        </div>
        <ol class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-line)] sm:grid-cols-2 lg:grid-cols-3">
          {#each arch as a, i (a.layer)}
            <li class="group relative flex flex-col gap-3 bg-[var(--lnd-surface)] p-7 transition-colors hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-center gap-3">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lnd-ink)] text-sm font-bold text-[var(--lnd-bg)] transition-colors group-hover:bg-[var(--lnd-accent)]">{i + 1}</span>
                <p class="font-serif text-lg font-semibold tracking-tight">{a.layer}</p>
              </div>
              <p class="text-[16px] font-medium text-[var(--lnd-ink)]">{a.title}</p>
              <p class="text-[15px] leading-relaxed text-[var(--lnd-soft)]">{a.desc}</p>
            </li>
          {/each}
        </ol>
        <div class="mt-6 flex flex-col gap-6 rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-ink)] p-8 text-[var(--lnd-bg)] sm:flex-row sm:items-center">
          <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--lnd-accent)]">
            <Icon name="chat" cls="h-6 w-6" weight="duotone" />
          </span>
          <div class="min-w-0">
            <h3 class="font-serif text-2xl font-light tracking-tight">Nigi AI, lapisan AI lintas tiga lapis</h3>
            <p class="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--lnd-on-ink)]">Asisten per role (Pusat, Hub, Kurir, Data, Customer) dengan greeting proaktif, auto-insight, dan chat interaktif yang terkunci pada data studi kasus.</p>
          </div>
          <a href={resolveHref("/login")} class="ml-auto shrink-0 rounded-full border border-[var(--lnd-bg)] px-6 py-3 text-[14.5px] font-semibold uppercase tracking-[0.08em] transition-colors hover:border-[var(--lnd-accent-ink)] hover:bg-[var(--lnd-accent)]">
            Coba di Portal <Icon name="arrow-up-right" cls="ml-2 inline h-4 w-4" weight="bold" />
          </a>
        </div>
      </div>
    </section>

    <!-- PERAN -->
    <section use:gsapReveal  id="roles" class="scroll-mt-[84px] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <h2 class="font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">Portal per <em class="italic">peran</em></h2>
        </div>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {#each roles as r (r.slug)}
            <a href={resolveHref(`/dashboard/${r.slug.toLowerCase()}/overview`)} class="group flex h-full flex-col gap-3 rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6 transition-colors hover:border-[var(--lnd-accent-ink)] hover:bg-[var(--lnd-bg-raise)]">
              <div class="flex items-center gap-2">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lnd-ink)] text-xs font-bold text-[var(--lnd-bg)] transition-colors group-hover:bg-[var(--lnd-accent)]">{r.initials}</span>
                <span class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">{r.slug}</span>
              </div>
              <p class="text-base font-semibold text-[var(--lnd-ink)]">{r.name}</p>
              <p class="text-[13px] uppercase tracking-wide text-[var(--lnd-soft)]">{r.role}</p>
              <p class="mt-auto pt-2 text-[15px] leading-relaxed text-[var(--lnd-soft)]">{r.desc}</p>
              <span class="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--lnd-accent-ink)] group-hover:underline">Buka portal <Icon name="arrow-up-right" cls="h-3.5 w-3.5" weight="bold" /></span>
            </a>
          {/each}
        </div>
      </div>
    </section>

    <!-- ROADMAP -->
    <section use:gsapReveal  id="roadmap" class="scroll-mt-[84px] border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <p class="eyebrow">Roadmap</p>
          <h2 class="mt-6 font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">Tiga fase <em class="italic">self-funding</em></h2>
        </div>
        <ol class="mt-12 grid gap-6 md:grid-cols-3">
          {#each phases as p (p.f)}
            <li class="flex h-full flex-col rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
              <div class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">{p.f}, {p.t}</div>
              <p class="mt-3 text-[15px] leading-relaxed text-[var(--lnd-ink)]">{p.w}</p>
              <p class="mt-3 border-t border-dashed border-[var(--lnd-line-soft)] pt-2 text-[14px] italic text-[var(--lnd-soft)]">{p.s}</p>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- TARGET -->
    <section class="border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px] rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-ink)] p-10 text-center">
        <h2 class="mt-3 font-serif text-[clamp(1.8rem,3.5vw,2.8rem)] font-light tracking-tight text-[var(--lnd-bg)]">Data bukan slogan, angka dari 6 akar</h2>
        <div class="mt-8 overflow-x-auto">
          <table class="mx-auto w-full max-w-3xl text-sm text-[var(--lnd-bg)]">
            <caption class="sr-only">Metrik Omnigistic hari ini dibanding target studi kasus</caption>
            <thead>
              <tr class="border-b border-[color:var(--lnd-line-on-ink)] text-[13px] uppercase tracking-wider text-[var(--lnd-on-ink)]">
                <th scope="col" class="py-3 text-left font-medium">Metrik</th>
                <th scope="col" class="py-3 text-right font-medium">Hari ini</th>
                <th scope="col" class="py-3 text-right font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {#each targets as [m, b, t] (m)}
                <tr class="border-b border-[color:var(--lnd-line-on-ink)] last:border-0">
                  <td class="py-3 text-left font-medium text-[var(--lnd-bg)]">{m}</td>
                  <td class="py-3 text-right text-[var(--lnd-on-ink)] line-through">{b}</td>
                  <td class="py-3 text-right font-semibold text-[color:var(--lnd-positive-on-ink)]">{t}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <a href={resolveHref("/login")} class="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--lnd-accent-ink)] px-8 py-4 text-[14.5px] font-semibold uppercase tracking-[0.08em] text-[var(--lnd-bg)] transition-colors hover:bg-[var(--lnd-bg)] hover:text-[var(--lnd-ink)]">
          Jelajahi Dashboard <Icon name="arrow-up-right" cls="h-4 w-4" weight="bold" />
        </a>
        <div class="mt-4 text-[13px] uppercase tracking-[0.08em]">
          <a href={resolveHref("/dashboard/methodology")} class="text-[color:var(--lnd-on-ink)] underline-offset-4 hover:underline hover:text-[color:var(--lnd-accent-ink)]">Methodology</a> ·
          <a href={resolveHref("/dashboard/kpi")} class="text-[color:var(--lnd-on-ink)] underline-offset-4 hover:underline hover:text-[color:var(--lnd-accent-ink)]">KPI Tracker</a> ·
          <a href={resolveHref("/dashboard/academy")} class="text-[color:var(--lnd-on-ink)] underline-offset-4 hover:underline hover:text-[color:var(--lnd-accent-ink)]">Nigi Academy</a>
        </div>
      </div>
    </section>

    <!-- SUMBER & BATASAN -->
    <section class="border-t border-[var(--lnd-line)] px-[clamp(1.25rem,4vw,4.5rem)] py-[clamp(4.5rem,9vw,8rem)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="border-t border-[var(--lnd-ink)] pt-6">
          <p class="eyebrow">Sumber &amp; Batasan</p>
          <h2 class="mt-6 max-w-3xl font-serif text-[clamp(2rem,4.5vw,3.6rem)] font-light leading-[1.05] tracking-[-0.015em]">Setiap angka bisa <em class="italic">ditelusuri</em></h2>
        </div>
        <div class="mt-12 grid gap-6 lg:grid-cols-3">
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">Sumber angka</p>
            <p class="mt-3 text-[15.5px] leading-relaxed text-[var(--lnd-soft)]">Seluruh angka operasional dan finansial berasal dari Table 1-4 dan Figure 1-2 studi kasus ISCEA 2026. Tidak ada angka kasus yang diubah.</p>
          </div>
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">Asumsi tim</p>
            <p class="mt-3 text-[15.5px] leading-relaxed text-[var(--lnd-soft)]">Harga EV, harga BBM, tarif listrik, dan proyeksi ROI adalah asumsi tim karena tidak tersedia di kasus. Semua diberi label di setiap layar.</p>
          </div>
          <div class="rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6">
            <p class="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--lnd-accent-ink)]">Prototipe</p>
            <p class="mt-3 text-[15.5px] leading-relaxed text-[var(--lnd-soft)]">Model forecast, COD risk, dan address intelligence adalah prototipe presentasi untuk menunjukkan cara kerja, bukan sistem produksi.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="bg-[var(--lnd-ink)] px-[clamp(1.25rem,4vw,4.5rem)] pt-16 pb-8 text-[var(--lnd-bg)]">
      <div class="mx-auto max-w-[1720px]">
        <div class="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p class="text-[14px] font-semibold uppercase tracking-wide text-[var(--lnd-on-ink)]">Kontak</p>
            <h2 class="mt-4 font-serif text-[clamp(2rem,6vw,4.5rem)] font-light leading-[1.05] tracking-[-0.02em]">Punya ruang dalam <em class="italic">pikiran</em><span class="text-[var(--lnd-accent)]">?</span></h2>
          </div>
          <a href={resolveHref("/login")} class="inline-flex items-center gap-3 border-b border-[color:var(--lnd-line-on-ink)] pb-1 font-serif text-[clamp(1.2rem,2.6vw,1.8rem)] transition-colors hover:border-[var(--lnd-accent-ink)]">
            Masuk dashboard <Icon name="arrow-up-right" cls="h-5 w-5 text-[var(--lnd-accent)]" weight="bold" />
          </a>
        </div>
        <div class="mt-12 grid gap-10 border-t border-[color:var(--lnd-line-on-ink)] pt-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <h3 class="text-[14px] font-semibold uppercase tracking-[0.09em] text-[var(--lnd-on-ink)]">Sistem</h3>
            <p class="mt-4 text-[16px] leading-relaxed">Sistem yang diusulkan untuk ISCEA Global Case Competition 2026, Indonesia. Data dan narasi merujuk studi kasus.</p>
          </div>
          <div>
            <h3 class="text-[14px] font-semibold uppercase tracking-[0.09em] text-[var(--lnd-on-ink)]">Navigasi</h3>
            <div class="mt-4 space-y-2">
              {#each navLinks as n (n.href)}
                <a href={resolveHref(n.href)} class="block w-fit border-b border-transparent transition-colors hover:border-[var(--lnd-accent-ink)]">{n.label}</a>
              {/each}
            </div>
          </div>
          <div>
            <h3 class="text-[14px] font-semibold uppercase tracking-[0.09em] text-[var(--lnd-on-ink)]">Tim</h3>
            <p class="mt-4 text-[16px] leading-relaxed">Dalila Syazwani · Virgiawan Prima Rizky<br />Baits Rika Saputra · Marwah Syakinah Indrawati</p>
          </div>
        </div>
        <div class="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--lnd-line-on-ink)] pt-6 text-[14px] uppercase tracking-[0.085em] text-[var(--lnd-on-ink)]">
          <span>© 2026 Omnigistic · ISCEA Global Case Competition</span>
          <span>Studi kasus &ldquo;Delivering Promises&rdquo;</span>
        </div>
      </div>
    </footer>
  </main>
</div>