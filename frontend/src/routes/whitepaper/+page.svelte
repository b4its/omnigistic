<script lang="ts">
  // ============================================================================
  // Whitepaper — EV Fleet Benefit-Cost Analysis (GC Logistics · ISCEA 2026).
  // Gaya: "editorial technical whitepaper" (dark, tenang, premium). Statis —
  // seluruh angka baseline/BCA tertulis di halaman (tanpa dependensi API) agar
  // selalu dapat dirender untuk perekaman video. Semua nilai = hasil BCA final.
  // ============================================================================
  import { resolveHref } from "$lib/utils";
  import EditorialNav from "$lib/components/EditorialNav.svelte";
  import HeroTexture from "$lib/components/HeroTexture.svelte";

  const navLinks = [
    { href: "#abstract", label: "Abstract" },
    { href: "#baseline", label: "Baseline" },
    { href: "#asumsi", label: "Asumsi" },
    { href: "#ekonomi", label: "Ekonomi" },
    { href: "#kas", label: "Arus Kas" },
    { href: "#kpi", label: "KPI" },
    { href: "#stress", label: "Stress-Test" },
    { href: "#referensi", label: "Referensi" }
  ];

  const meta = [
    { k: "Authors", v: "Tim Analitik Omnigistic" },
    { k: "Length", v: "≈ 20 menit baca" },
    { k: "Audience", v: "Juri ISCEA · Manajemen GC" },
    { k: "Last revised", v: "Juni 2026" }
  ];

  // Ringkasan KPI final (skenario base, replacement) — headline yang disarankan.
  const headline = [
    { k: "Base NPV @10%", v: "Rp3,52 M" },
    { k: "Discounted BCR", v: "2,92×" },
    { k: "Net saving / tahun", v: "Rp945,2 jt" },
    { k: "CO₂ turun / tahun", v: "112 t" }
  ];

  // Data baseline nasional (data pasar — bukan asumsi).
  const baseline = [
    { item: "Pertamax (capacity-weighted 23 hub)", val: "Rp16.125 /L", src: "Bisnis.com" },
    { item: "Listrik PLN B-2/TR 6.600 VA–200 kVA", val: "Rp1.444,70 /kWh", src: "Kompas" },
    { item: "EV Fox 200 (rata-rata regional)", val: "Rp19,225 jt /unit", src: "Polytron" },
    { item: "ICE Honda BeAT (OTR Jkt/Tng)", val: "Rp19,577 jt /unit", src: "Wahana Honda" },
    { item: "Battery-as-a-Service (Fox 200)", val: "Rp125.000 /bln", src: "Polytron" }
  ];

  // Asumsi operasional (asumsi tim — bukan data kasus).
  const asumsi = [
    ["EV (unit)", "200", "200", "200"],
    ["Hari operasi", "365", "365", "365"],
    ["Jarak / unit / hari", "40 km", "60 km", "80 km"],
    ["Efisiensi ICE", "45 km/L", "50 km/L", "55 km/L"],
    ["Konsumsi EV", "27 Wh/km", "23 Wh/km", "22 Wh/km"],
    ["Charging loss", "20%", "15%", "10%"],
    ["Discount rate", "10%", "10%", "10%"]
  ];

  // Perhitungan tahunan per skenario.
  const annual = [
    ["Jarak tahunan", "2,92 jt km", "4,38 jt km", "5,84 jt km"],
    ["BBM ICE (dihindari)", "Rp1,046 M", "Rp1,413 M", "Rp1,712 M"],
    ["Listrik EV", "Rp136,68 jt", "Rp167,37 jt", "Rp204,18 jt"],
    ["Sewa baterai (BaaS)", "Rp300 jt", "Rp300 jt", "Rp300 jt"],
    ["Net operating saving", "Rp609,66 jt", "Rp945,19 jt", "Rp1,208 M"]
  ];

  // Arus kas 5 tahun (Y0..Y5) per skenario.
  const cashflow = [
    ["Y0 (capex awal)", "−Rp79,6 jt", "−Rp59,6 jt", "−Rp39,6 jt"],
    ["Y1", "+Rp609,7 jt", "+Rp945,2 jt", "+Rp1,208 M"],
    ["Y2", "+Rp609,7 jt", "+Rp945,2 jt", "+Rp1,208 M"],
    ["Y3", "+Rp609,7 jt", "+Rp945,2 jt", "+Rp1,208 M"],
    ["Y4", "+Rp609,7 jt", "+Rp945,2 jt", "+Rp1,208 M"],
    ["Y5", "+Rp609,7 jt", "+Rp945,2 jt", "+Rp1,208 M"],
    ["Kumulatif Y5", "Rp2,97 M", "Rp4,67 M", "Rp6,00 M"]
  ];

  // KPI finansial final per skenario.
  const kpi = [
    ["Utilisation", "40 km/hari", "60 km/hari", "80 km/hari"],
    ["Jarak tahunan", "2,92 jt km", "4,38 jt km", "5,84 jt km"],
    ["Fuel cost avoided", "Rp1,046 M", "Rp1,413 M", "Rp1,712 M"],
    ["EV electricity", "Rp136,7 jt", "Rp167,4 jt", "Rp204,2 jt"],
    ["Battery lease", "Rp300 jt", "Rp300 jt", "Rp300 jt"],
    ["Annual net saving", "Rp609,7 jt", "Rp945,2 jt", "Rp1,208 M"],
    ["Initial investment", "Rp79,6 jt", "Rp59,6 jt", "Rp39,6 jt"],
    ["BCR (simple)", "2,31×", "2,95×", "3,37×"],
    ["Discounted BCR @10%", "2,29×", "2,92×", "3,33×"],
    ["NPV @10%", "Rp2,23 M", "Rp3,52 M", "Rp4,58 M"],
    ["ROI 5-tahun", "131%", "195%", "234%"],
    ["Payback", "1,57 bln", "0,76 bln", "0,39 bln"],
    ["CO₂ reduction / tahun", "76 t", "112 t", "135 t"]
  ];

  // Stress-test: fleet tambahan (incremental) vs replacement.
  const stress = [
    ["Initial investment", "Rp59,6 jt", "Rp3,975 M"],
    ["Annual net saving", "Rp945,2 jt", "Rp945,2 jt"],
    ["NPV @10%", "Rp3,52 M", "−Rp392 jt"],
    ["Discounted BCR @10%", "2,92×", "0,93×"],
    ["Payback", "0,76 bln", "≈ 4,19 thn"]
  ];

  const co2 = [
    ["CO₂ reduction / tahun", "76 t", "112 t", "135 t"],
    ["5-tahun", "380 t", "559 t", "674 t"]
  ];

  const references = [
    { n: 1, t: "Polytron — Beli Motor Listrik Fox 200 Jadetabek", u: "https://polytron.co.id/produk/polytron-fox-200-electric-sepeda-motor-listrik-otr-jadetabek/" },
    { n: 2, t: "Bisnis.com — Harga BBM Pertamina 9 September 2026 Seluruh Wilayah Indonesia", u: "https://ekonomi.bisnis.com/read/20260909/44/2002628/harga-bbm-pertamina-9-september-2026-seluruh-wilayah-indonesia" },
    { n: 3, t: "Kompas — Tarif Listrik yang Berlaku Mulai 1 Juli 2026", u: "https://amp.kompas.com/tren/read/2026/07/01/083000965/resmi-ditetapkan-ini-tarif-listrik-yang-berlaku-mulai-1-juli-2026" },
    { n: 4, t: "Polytron — Fox-200 OTR Jawa Barat & Jawa Timur", u: "https://polytron.co.id/produk/polytron-fox-200-electric-sepeda-motor-listrik-otr-jawa-barat-jawa-timur-bto/" },
    { n: 5, t: "Polytron — Harga Motor Listrik Terbaik (Fox Series)", u: "https://polytron.co.id/kategori-produk/ev/motor-listrik/" },
    { n: 6, t: "Wahana Honda — Spesifikasi & Harga Honda BeAT 2026", u: "https://www.wahanahonda.com/produk/honda-beat" },
    { n: 7, t: "Honda Cengkareng — Daftar Konsumsi BBM Sepeda Motor Honda", u: "https://www.hondacengkareng.com/daftar-konsumsi-bbm-sepeda-motor-honda/" },
    { n: 8, t: "Polytron — FOX 200: Motor yang Cocok untuk Para Perempuan", u: "https://polytron.co.id/berita/motor-untuk-perempuan/" },
    { n: 9, t: "IPCC NGGIP — 2006 Guidelines (Publications)", u: "https://www.ipcc-nggip.iges.or.jp/public/2006gl/" },
    { n: 10, t: "PLN — Climate-related Disclosure Report 2024", u: "https://web.pln.co.id/statics/uploads/2025/07/PLN-Climate-related-Disclosure-Report-2024.pdf" }
  ];
</script>

<svelte:head>
  <title>Whitepaper · EV Fleet Benefit-Cost Analysis · Omnigistic</title>
  <meta
    name="description"
    content="Whitepaper teknis: benefit-cost analysis armada listrik GC Logistics dengan benchmark nasional Indonesia, skema Battery-as-a-Service, dan uji skenario replacement vs fleet tambahan."
  />
</svelte:head>

<div class="wp min-h-screen antialiased">
  <!-- ============================= NAV ============================= -->
  <EditorialNav
    section="WHITEPAPER"
    links={navLinks}
    cta={{ href: "/dashboard/pusat/ev-bca", label: "Buka Model" }}
  />

  <!-- ============================= HERO ============================= -->
  <section class="wp-hero">
    <HeroTexture />
    <div class="wp-wrap pt-[clamp(3rem,8vw,6rem)] pb-[clamp(2.5rem,5vw,4rem)]">
      <span class="wp-pill">
        <span class="wp-dot" aria-hidden="true">●</span>
        Whitepaper · v2.4 · June 2026
      </span>

      <h1 class="wp-hero-title mt-7">
        Arsitektur biaya di balik <em class="wp-em">Rp945 juta</em> penghematan armada listrik.
      </h1>

      <p class="wp-deck mt-7">
        Sebuah benefit-cost analysis yang jujur — memisahkan data pasar nyata dari asumsi tim.
        Benchmark nasional, bukan harga satu provinsi; risiko baterai masuk sebagai biaya
        operasional, bukan dihilangkan dengan asumsi nol.
      </p>

      <!-- Meta bar 4 kolom -->
      <div class="wp-meta mt-12">
        {#each meta as m (m.k)}
          <div>
            <p class="wp-label">{m.k}</p>
            <p class="wp-meta-value mt-1.5">{m.v}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <main class="wp-wrap">
    <!-- =========================== ABSTRACT =========================== -->
    <section id="abstract" class="wp-section scroll-mt-16">
      <p class="wp-label">Abstract · TL;DR</p>
      <h2 class="wp-h2 mt-4 wp-prose">
        Energi listrik jauh lebih murah dari bensin — tetapi pertanyaan yang benar bukan itu.
      </h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          Studi kasus meminta roadmap dan benefit-cost analysis untuk inisiatif keberlanjutan GC
          Logistics — sebuah jaringan nasional dengan 23 hub regional, 12.500 sepeda motor, dan
          sekitar 70% paket last-mile urban dikirim dengan motor. Target armada bersih: 200
          kendaraan, atau sekitar 1,4% dari 14.180 armada.
        </p>
        <p>
          Kami membangun BCA dari prinsip pertama: <span class="wp-accent">data pasar nyata</span>
          dipisahkan dari <span class="wp-accent">asumsi operasional</span>. Pertanyaan utama bukan
          "apakah EV lebih hemat?" — secara operasional, biaya energinya jauh lebih rendah di
          seluruh skenario. Pertanyaan yang lebih penting adalah
          <em class="wp-em">"kapan dan di mana"</em> GC seharusnya mengganti ICE dengan EV, karena
          ekonomi sangat bergantung pada utilisasi dan waktu penggantian aset.
        </p>
      </div>

      <!-- Headline KPI -->
      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {#each headline as h (h.k)}
          <div class="border-t border-[var(--wp-line)] pt-4">
            <p class="wp-label">{h.k}</p>
            <p class="wp-stat mt-3">{h.v}</p>
          </div>
        {/each}
      </div>
      <p class="wp-muted mt-6 max-w-[68ch] text-[0.9375rem]">
        Angka di atas = skenario <span class="wp-accent">base</span>, mode
        <span class="wp-accent">replacement</span> (200 EV menggantikan 200 ICE). Catatan:
        utilisation 60 km/hari adalah asumsi yang harus divalidasi lewat pilot.
      </p>
    </section>

    <!-- =========================== BASELINE =========================== -->
    <section id="baseline" class="wp-section scroll-mt-16">
      <p class="wp-label">01 — Data baseline nasional</p>
      <h2 class="wp-h2 mt-4 wp-prose">Benchmark yang merepresentasikan jaringan, bukan satu titik di peta.</h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          Harga Pertamax September 2026 tidak memiliki satu angka tunggal untuk seluruh Indonesia —
          pada jaringan nasional berada di rentang Rp15.950–Rp16.650/L. Karena GC memiliki 23 hub
          yang tersebar dari Jawa hingga Papua, kami tidak memilih satu provinsi secara arbitrer.
          Kami menggunakan benchmark <span class="wp-accent">capacity-weighted</span> atas footprint
          hub:
        </p>
      </div>

      <!-- Persamaan -->
      <div class="mt-6 rounded-[8px] border border-[var(--wp-line)] bg-[var(--wp-bg-raise)] p-5">
        <p class="wp-mono text-[0.8125rem] wp-muted">P_national = Σ (Capacity_i × Pertamax_i) / Σ Capacity_i</p>
        <p class="wp-mono mt-3 text-[0.8125rem] wp-muted">
          Σ Capacity = 5,098 juta paket/hari  ·  23 hub
        </p>
        <p class="wp-stat mt-3 wp-accent">= Rp16.125 /L</p>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        Ini adalah derived GC-network national benchmark — bukan harga resmi tunggal Pertamax nasional.
      </p>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Data baseline pasar (nasional)</caption>
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              <th scope="col">Nilai</th>
              <th scope="col">Sumber</th>
            </tr>
          </thead>
          <tbody>
            {#each baseline as b (b.item)}
              <tr>
                <td>{b.item}</td>
                <td>{b.val}</td>
                <td>{b.src}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-note mt-6 max-w-[68ch]">
        Benchmark kendaraan memakai harga pasar publik (Polytron Fox 200 untuk EV, Honda BeAT untuk
        ICE) — <span class="wp-accent">bukan</span> quotation fleet GC. Konsumsi lab 60,6 km/L Honda
        BeAT tidak dipakai sebagai konsumsi kurir aktual.
      </div>
    </section>

    <!-- =========================== ASUMSI =========================== -->
    <section id="asumsi" class="wp-section scroll-mt-16">
      <p class="wp-label">02 — Asumsi operasional</p>
      <h2 class="wp-h2 mt-4 wp-prose">Bagian yang secara jujur bukan data kasus.</h2>
      <p class="wp-deck mt-6">
        Sepanjang dokumen ini, setiap angka non-kasus diberi label. Inilah wilayah asumsi tim — dan
        justru karena itu, ia di-skema-test, bukan dipresentasikan sebagai fakta.
      </p>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Asumsi operasional per skenario</caption>
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              <th scope="col">Conservative</th>
              <th scope="col">Base</th>
              <th scope="col">Upside</th>
            </tr>
          </thead>
          <tbody>
            {#each asumsi as row (row[0])}
              <tr>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        365 hari mengikuti konteks layanan GC yang menyebut operasi 365 hari — bukan berarti setiap
        kendaraan aktif penuh 365 hari. 60 km/hari dipakai sebagai base-case dan harus divalidasi
        lewat pilot.
      </p>
    </section>

    <!-- =========================== EKONOMI BATERAI =========================== -->
    <section id="ekonomi" class="wp-section scroll-mt-16">
      <p class="wp-label">03 — Ekonomi baterai · Battery-as-a-Service</p>
      <h2 class="wp-h2 mt-4 wp-prose">Kami tidak menghilangkan risiko baterai — kami memasukkannya ke biaya operasional.</h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          Headline BCA sengaja dibuat lebih konservatif: biaya baterai <span class="wp-accent">tidak</span>
          diasumsikan Rp0. Kami memakai skema Battery-as-a-Service (BaaS) yang benar-benar ditawarkan
          di pasar — Polytron mencantumkan sewa baterai Fox 200 sebesar Rp125.000/bulan<sup class="wp-sup">1</sup>,
          dengan penggantian baterai tercakup ketika performanya turun di bawah ambang yang ditentukan.
        </p>
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-3">
        <div class="border-t border-[var(--wp-line)] pt-4">
          <p class="wp-label">Sewa per unit</p>
          <p class="wp-stat mt-3">Rp1,5 jt</p>
          <p class="wp-muted mt-1 text-[0.8125rem]">per tahun (Rp125 rb × 12)</p>
        </div>
        <div class="border-t border-[var(--wp-line)] pt-4">
          <p class="wp-label">Untuk 200 unit</p>
          <p class="wp-stat mt-3">Rp300 jt</p>
          <p class="wp-muted mt-1 text-[0.8125rem]">per tahun (recurring)</p>
        </div>
        <div class="border-t border-[var(--wp-line)] pt-4">
          <p class="wp-label">Selama 5 tahun</p>
          <p class="wp-stat mt-3">Rp1,5 M</p>
          <p class="wp-muted mt-1 text-[0.8125rem]">tanpa "battery replacement Y5" yang dikarang</p>
        </div>
      </div>

      <div class="wp-note mt-8 max-w-[68ch]">
        Keuntungan epistemik: karena baterai menjadi recurring cost berdasarkan skema vendor, kami
        tak perlu menciptakan penggantian baterai Tahun-5. Risiko penggantian tidak dihilangkan,
        melainkan dipindahkan ke pihak yang menanggungnya dalam skema BaaS.
      </div>

      <!-- ===== Perhitungan tahunan ===== -->
      <p class="wp-label mt-14">04 — Perhitungan tahunan</p>
      <h3 class="wp-h2 mt-4 wp-prose">Tiga titik utilisasi, tiga jawaban.</h3>
      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Ringkasan arus tahunan per skenario</caption>
          <thead>
            <tr>
              <th scope="col">Komponen</th>
              <th scope="col">Conservative</th>
              <th scope="col">Base</th>
              <th scope="col">Upside</th>
            </tr>
          </thead>
          <tbody>
            {#each annual as row (row[0])}
              <tr data-emph={row[0].startsWith("Net") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        Maintenance saving tidak dimasukkan ke headline: data maintenance aktual fleet GC tidak
        tersedia. Lebih baik kehilangan sedikit benefit daripada mengarang Rp100–700 juta/tahun.
      </p>
    </section>

    <!-- =========================== ARSITEKTUR (placeholder) =========================== -->
    <section class="wp-section">
      <p class="wp-label">05 — Arsitektur model</p>
      <h2 class="wp-h2 mt-4 wp-prose">Dari data pasar ke keputusan.</h2>
      <div class="wp-arch mt-8">
        <p class="wp-arch-label">[ Ilustrasi teknis — placeholder tekstur ]</p>
        <p class="wp-muted mt-2 text-[0.9375rem]">
          Data pasar → derivasi benchmark nasional → asumsi operasional (dilabel) → mesin BCA →
          skenario &amp; KPI → roadmap rollout
        </p>
      </div>
    </section>

    <!-- =========================== ARUS KAS =========================== -->
    <section id="kas" class="wp-section scroll-mt-16">
      <p class="wp-label">06 — Arus kas 5 tahun</p>
      <h2 class="wp-h2 mt-4 wp-prose">Y0 adalah satu-satunya tahun yang merah.</h2>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Net cash flow per tahun (Rp) · replacement</caption>
          <thead>
            <tr>
              <th scope="col">Tahun</th>
              <th scope="col">Conservative</th>
              <th scope="col">Base</th>
              <th scope="col">Upside</th>
            </tr>
          </thead>
          <tbody>
            {#each cashflow as row (row[0])}
              <tr data-emph={row[0].startsWith("Kumulatif") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="wp-note mt-6 max-w-[68ch]">
        <p>
          <span class="wp-label">CapEx awal (replacement counterfactual)</span>
        </p>
        <p class="mt-2 wp-body" style="color: var(--wp-fg)">
          EV benchmark 200 × Rp19,225 jt = Rp3,845 M · ICE avoided 200 × Rp19,577 jt = Rp3,9154 M →
          selisih <span class="wp-accent">−Rp70,4 jt</span>. Ditambah allowance charging Rp100 jt +
          implementasi &amp; pelatihan Rp30 jt → <span class="wp-accent">initial investment Rp59,6 jt</span>
          (base). Argumen ini adalah asumsi analitik, bukan fakta kasus.
        </p>
      </div>

      <!-- Charging infrastructure -->
      <div class="mt-10 grid gap-6 lg:grid-cols-2">
        <div class="wp-prose">
          <p class="wp-label">Infrastruktur charging</p>
          <p class="mt-3 wp-body">
            Fox 200 memakai charger 450 W dengan jendela charging 4–5 jam. Untuk base 60 km/hari,
            kebutuhan energi ≈ 317,4 kWh/hari; dengan jendela 12 jam → sekitar
            <span class="wp-accent">60 titik charging</span>. Kami memakai allowance engineering
            Rp100 jt untuk titik charging + wiring/commissioning (bukan quotation vendor).
          </p>
        </div>
        <div class="wp-table-wrap">
          <table class="wp-table">
            <caption>Initial investment (base)</caption>
            <thead>
              <tr>
                <th scope="col">Komponen</th>
                <th scope="col">Nilai</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Selisih harga kendaraan</td><td>−Rp70,4 jt</td></tr>
              <tr><td>Infrastruktur charging</td><td>Rp100 jt</td></tr>
              <tr><td>Implementasi + pelatihan</td><td>Rp30 jt</td></tr>
              <tr data-emph="true"><td>Total investasi awal</td><td>Rp59,6 jt</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- =========================== KPI =========================== -->
    <section id="kpi" class="wp-section scroll-mt-16">
      <p class="wp-label">07 — Benefit-Cost Ratio, NPV, ROI, Payback</p>
      <h2 class="wp-h2 mt-4 wp-prose">Layak di seluruh skenario — dengan catatan yang jujur.</h2>

      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          Simple BCR = (5 × Fuel Cost) / (Initial Investment + 5 × (Electricity + Battery)).
          Discounted BCR memakai discount rate 10% dengan PV factor 1–5 = 3,7908. Base:
          PV benefit ≈ Rp5,354 M, PV cost ≈ Rp1,830 M →
          <span class="wp-accent">Discounted BCR = 2,92×</span>.
        </p>
      </div>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>KPI finansial final per skenario</caption>
          <thead>
            <tr>
              <th scope="col">KPI</th>
              <th scope="col">Conservative</th>
              <th scope="col">Base</th>
              <th scope="col">Upside</th>
            </tr>
          </thead>
          <tbody>
            {#each kpi as row (row[0])}
              <tr data-emph={row[0].startsWith("NPV") || row[0].startsWith("Discounted") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        Payback 0,76 bulan (base) <span class="wp-accent">tidak</span> dijadikan headline tunggal —
        ia sangat dipengaruhi asumsi replacement dan fakta benchmark EV sedikit lebih murah dari ICE.
      </p>
    </section>

    <!-- =========================== STRESS TEST =========================== -->
    <section id="stress" class="wp-section scroll-mt-16">
      <p class="wp-label">08 — Stress-test: replacement vs fleet tambahan</p>
      <h2 class="wp-h2 mt-4 wp-prose">Satu asumsi yang mengubah segalanya.</h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          Kasus hanya menyebut GC akan deploy &gt;200 kendaraan bersih; tidak menyatakan secara
          eksplisit bahwa 200 kendaraan itu <em class="wp-em">menggantikan</em> 200 ICE. Bila tidak
          ada pembelian ICE yang dihindari, seluruh harga EV menjadi capex — dan ekonomi melemah
          drastis pada utilisasi base.
        </p>
      </div>

      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Base: replacement vs fleet tambahan</caption>
          <thead>
            <tr>
              <th scope="col">Metrik</th>
              <th scope="col">Replacement</th>
              <th scope="col">Fleet tambahan</th>
            </tr>
          </thead>
          <tbody>
            {#each stress as row (row[0])}
              <tr data-emph={row[0].startsWith("NPV") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <blockquote class="wp-quote mt-10 max-w-[62ch]">
        Pertanyaan BCA bukan "apakah EV lebih hemat?" — melainkan
        <span class="wp-accent">"kapan dan di mana GC harus mengganti ICE dengan EV?"</span>
        Karena ekonomi bergantung pada utilisasi dan waktu penggantian aset.
      </blockquote>
    </section>

    <!-- =========================== CO₂ =========================== -->
    <section class="wp-section">
      <p class="wp-label">09 — Emisi CO₂ operasional</p>
      <h2 class="wp-h2 mt-4 wp-prose">Pengurangan yang dapat dipertanggungjawabkan — dan batasnya.</h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          Untuk gasoline kami memakai faktor IPCC motor gasoline ≈ 2,30 kgCO₂/L<sup class="wp-sup">9</sup>;
          untuk listrik, intensitas pembangkitan PLN 2024 ≈ 0,774 kgCO₂e/kWh<sup class="wp-sup">10</sup>.
        </p>
      </div>
      <div class="wp-table-wrap mt-8">
        <table class="wp-table">
          <caption>Reduksi CO₂ (operasional)</caption>
          <thead>
            <tr>
              <th scope="col">Metrik</th>
              <th scope="col">Conservative</th>
              <th scope="col">Base</th>
              <th scope="col">Upside</th>
            </tr>
          </thead>
          <tbody>
            {#each co2 as row (row[0])}
              <tr data-emph={row[0].startsWith("5-tahun") ? "true" : "false"}>
                <td>{row[0]}</td>
                <td>{row[1]}</td>
                <td>{row[2]}</td>
                <td>{row[3]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="wp-muted mt-3 max-w-[68ch] text-[0.9375rem]">
        Ini adalah operational CO₂ estimate, bukan lifecycle assessment. Produksi motor, baterai,
        recycling, dan upstream fuel belum dihitung.
      </p>
    </section>

    <!-- =========================== MAINTENANCE =========================== -->
    <section class="wp-section">
      <p class="wp-label">10 — Maintenance saving sebagai upside, bukan fondasi</p>
      <h2 class="wp-h2 mt-4 wp-prose">Kami tidak mengandalkan penghematan yang belum terukur.</h2>
      <div class="wp-prose mt-6 space-y-4 wp-body">
        <p>
          Motor listrik tidak membutuhkan penggantian oli mesin dan sistem mesinnya lebih sederhana.
          Namun kami tidak memiliki data maintenance aktual GC per km. Maka pada headline BCA,
          maintenance saving = <span class="wp-accent">Rp0</span>.
        </p>
        <p>
          Sebagai upside opsional (benchmark publik Rp720.000/unit/tahun): 200 unit → Rp144 jt/tahun.
          Bila tervalidasi di pilot, base annual saving naik dari Rp945 jt menjadi ≈ Rp1,089 M/tahun,
          dan base NPV dari ≈ Rp3,52 M menjadi ≈ Rp4,07 M. Kita tidak bergantung pada angka ini.
        </p>
      </div>
    </section>

    <!-- =========================== REKOMENDASI =========================== -->
    <section class="wp-section">
      <p class="wp-label">11 — BCA final yang direkomendasikan</p>
      <h2 class="wp-h2 mt-4 wp-prose">National 200-EV BCA.</h2>

      <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div class="border-t border-[var(--wp-line)] pt-4">
          <p class="wp-label">Base NPV @10%</p>
          <p class="wp-stat mt-3">Rp3,52 M</p>
        </div>
        <div class="border-t border-[var(--wp-line)] pt-4">
          <p class="wp-label">Discounted BCR</p>
          <p class="wp-stat mt-3">2,92×</p>
        </div>
        <div class="border-t border-[var(--wp-line)] pt-4">
          <p class="wp-label">Annual net saving</p>
          <p class="wp-stat mt-3">Rp945 jt</p>
        </div>
        <div class="border-t border-[var(--wp-line)] pt-4">
          <p class="wp-label">CO₂ reduction</p>
          <p class="wp-stat mt-3">≈ 112 t/th</p>
        </div>
      </div>

      <div class="wp-note mt-8 max-w-[68ch]">
        <span class="wp-label">Caveat besar</span>
        <p class="mt-2" style="color: var(--wp-fg)">
          Replacement scenario; 60 km/hari adalah asumsi yang harus divalidasi lewat pilot.
        </p>
      </div>

      <blockquote class="wp-quote mt-10 max-w-[64ch]">
        "Our BCA uses national benchmarks rather than a single provincial price. Pertamax is
        capacity-weighted across GC's national hub footprint, electricity uses the national PLN
        B-2/TR tariff, and EV economics include an actual battery-as-a-service benchmark. Because GC
        does not disclose vehicle utilisation, maintenance, or battery-life data, we scenario-test
        these variables instead of presenting them as facts."
      </blockquote>
    </section>

    <!-- =========================== REFERENSI =========================== -->
    <section id="referensi" class="wp-section scroll-mt-16">
      <p class="wp-label">Referensi &amp; catatan kaki</p>
      <h2 class="wp-h2 mt-4 wp-prose">Sumber data pasar.</h2>
      <ol class="mt-8 space-y-3 wp-prose">
        {#each references as r (r.n)}
          <li class="wp-ref flex gap-3">
            <span class="wp-mono wp-accent">[{r.n}]</span>
            <a href={r.u} target="_blank" rel="noopener noreferrer">{r.t}</a>
          </li>
        {/each}
      </ol>
      <p class="wp-muted mt-8 max-w-[68ch] text-[0.8125rem]">
        Semua nilai benchmark pasar dapat berubah menurut waktu dan vendor. Data kasus: 23 hub,
        12.500 motor, ~70% last-mile urban via motor, target 200 kendaraan bersih (≈1,4% dari
        14.180 armada). Asumsi tim diberi label di seluruh dokumen.
      </p>
    </section>
  </main>

  <!-- =========================== FOOTER =========================== -->
  <footer class="border-t border-[var(--wp-line)]">
    <div class="wp-wrap flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
      <p class="wp-mono text-[0.75rem] tracking-[0.05em] wp-muted">
        OMNIGISTIC · ISCEA GLOBAL CASE 2026 · GC LOGISTICS
      </p>
      <div class="flex items-center gap-5">
        <a href={resolveHref("/analisis")} class="wp-nav-link">Kerangka &amp; Analisis →</a>
        <a href={resolveHref("/dashboard/pusat/ev-bca")} class="wp-nav-link">Model Interaktif →</a>
      </div>
    </div>
  </footer>
</div>
