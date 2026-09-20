/**
 * Konten halaman landing dalam dua bahasa (EN = bahasa dasar, ID = pilihan).
 *
 * Dipisah dari komponen agar teks tidak tersebar di markup. Diambil saat RENDER
 * lewat `landingContent()` (bukan konstanta level modul) karena locale bersifat
 * per-permintaan. Angka dan istilah kasus (hub, COD, NPV/BCR, nama orang) tidak
 * diterjemahkan sehingga tetap identik di kedua bahasa.
 *
 * Pada `rootCauses`, `title` = judul bahasa aktif dan `titleId` = padanan bahasa
 * lain, yang ditampilkan sebagai glos italic (desain dua bahasa).
 */
import { getLocale } from "$lib/paraglide/runtime";
import type { IconName } from "$lib/icon-names";

export interface LandingContent {
  nav: Array<{ href: string; label: string }>;
  t: Record<string, string>;
  rootCauses: Array<{ code: string; title: string; titleId: string; icon: IconName; symptoms: string; solution: string; kpi: string }>;
  heroProjects: Array<{ num: string; name: string; meta: string; seed: string; id: string; desc: string }>;
  roles: Array<{ slug: string; name: string; role: string; desc: string; initials: string }>;
  surfaceGrowth: Array<{ label: string; value: string; delta: string }>;
  surfaceConcern: Array<{ label: string; value: string; delta: string }>;
  approach: Array<{ n: string; t: string; d: string }>;
  arch: Array<{ layer: string; title: string; desc: string }>;
  phases: Array<{ f: string; t: string; w: string; s: string }>;
  targets: string[][];
  answers: Array<{ n: string; q: string; a: string; metrics: string[]; links: Array<{ href: string; label: string }> }>;
  solutions: Array<{ n: string; root: string; name: string; impact: string; kpi: string }>;
  impactRows: string[][];
}

const links = (a: Array<{ href: string; label: string }>) => a;

const en: LandingContent = {
  nav: [
    { href: "#jawaban", label: "Answers" },
    { href: "#diagnosis", label: "Diagnosis" },
    { href: "#solusi", label: "Solutions" },
    { href: "#arsitektur", label: "System" },
    { href: "/analisis", label: "Analysis" },
    { href: "/whitepaper", label: "Whitepaper" }
  ],
  t: {
    skip: "Skip to content",
    login: "Enter Portal",
    eyebrow: "System Under Strain · ISCEA 2026",
    heroLead1: "The nervous system of",
    heroEm: "last-mile",
    heroLead2: "across",
    heroStrong: "17,000 islands",
    heroMeta: "23 hubs, 3,200 points, 14,180 vehicles",
    heroTail: "in one source of truth. Nigi AI greets every manager with insight drawn from the case data.",
    ctaAnswers: "Six Answers",
    ctaSystem: "About the System",
    navAnswers: "Answers",
    navDiagnosis: "Diagnosis",
    navSolutions: "Solutions",
    navSystem: "System",
    navAnalysis: "Analysis",
    navWhitepaper: "Whitepaper",
    statHub: "active hubs",
    statEra: "1987 to 2024",
    statParcel: "1.46",
    statParcelLabel: "billion parcels in 2024",
    statGrowth: "+28% year on year",
    statShare: "20.6",
    statShareLabel: "market share",
    statShareDelta: "five years running",
    statUtil: "90.4%",
    statUtilLabel: "Jakarta utilisation",
    statUtilDelta: "vs Jayapura 28.1%",
    secAnswers: "Answers",
    hAnswersA: "Six case questions,",
    hAnswersEm: "six answers",
    hAnswersDesc: "Each card links a case question to the screen that answers it. Figures come from Tables 1 to 4 and Figures 1 to 2; team assumptions are labelled.",
    secDiagnosis: "Diagnosis",
    hDiagA: "Good headline figures,",
    hDiagEm: "not honest",
    hDiagDesc: "Every root cause has a clear Omnigistic solution plus baseline-to-target KPIs from the case document.",
    symptoms: "Symptoms:",
    solutionLabel: "Omnigistic solution",
    secSolutions: "Solutions",
    hSolA: "Six solutions,",
    hSolEm: "one system",
    hSolDesc: "Each solution names the root it addresses, its business impact, and the case KPI.",
    secEvidence: "Framework, analysis and full impact",
    hEvA: "Full framework, analysis and impact",
    hEvB: "Every figure can be",
    hEvEm: "traced",
    evDesc: "Figures come from Tables 1 to 4 and Figures 1 to 2; team assumptions are labelled.",
    secTruth: "One source",
    hTruthA: "How the system",
    hTruthEm: "works",
    secArch: "Architecture",
    hArchA: "Three layers plus",
    hArchEm: "Nigi AI",
    aiDesc: "Nigi AI, the AI layer across all three layers. An assistant per role (HQ, Hub, Courier, Data, Customer, Seller) with proactive greetings, auto-insight, and interactive chat locked to the case data.",
    ctaPortal: "Try it in the Portal",
    secPortals: "Portals by",
    hPortalA: "Portals by ",
    hPortalEm: "role",
    openPortal: "Open portal",
    secRoadmap: "Roadmap",
    hRoadA: "Five phases ",
    hRoadEm: "to scale",
    secTargets: "Data, not slogans: figures from six root causes",
    thMetric: "Metric",
    thToday: "Today",
    thTarget: "Target",
    ctaExplore: "Explore the Dashboard",
    navMethodology: "Methodology",
    navKpi: "KPI Tracker",
    secSources: "Sources & Limits",
    hSrcA: "Every figure can be",
    hSrcEm: "traced",
    srcOfficial: "Figure sources",
    srcOfficialText: "All operational and financial figures come from Tables 1 to 4 and Figures 1 to 2 of the ISCEA 2026 case study. No case figure was altered.",
    srcAssumption: "Team assumptions",
    srcAssumptionText: "EV prices, fuel prices, electricity tariffs, and ROI projections are team assumptions because the case does not provide them. All are labelled on every screen.",
    srcProto: "Prototype",
    srcProtoText: "The forecast, COD risk, and address intelligence models are presentation prototypes that show how the work runs; they are not production systems.",
    contact: "Contact",
    hCtaA: "Room in your",
    hCtaEm: "mind",
    ctaDashboard: "Enter dashboard",
    footSystem: "Proposed system for the ISCEA Global Case Competition 2026, Indonesia. Data and narrative refer to the case study.",
    footNav: "Navigation",
    footTeam: "Team",
    footCase: "Case study “Delivering Promises”",
    copyright: "© 2026 Omnigistic · ISCEA Global Case Competition",
    secSystem: "System",
    posGrowth: "Upside: growth",
    posConcern: "Structural side: cost gap",
    diagCountA: "13 symptoms →",
    diagCountB: "6 root causes",
    truthEm: "of truth",
    aiTitle: "Nigi AI, the AI layer across all three layers",
    targetsCaption: "Omnigistic metrics today against the case targets",
  },
  rootCauses: [
    { code: "RC1", title: "Unchecked expansion", titleId: "Ekspansi tak selaras", icon: "compass",
      symptoms: "Fulfilment expense rose 54.9% against net sales of +48.7%. Loss in 2023. Uneven utilisation: Jakarta 90.4% against Jayapura 28.1%.",
      solution: "Three-tier hybrid: 11 Direct, 8 Joint Venture, 4 Regional Sponsor.", kpi: "Savings of Rp5.04 trillion per year; cost-to-sales 31.34% → 26.8%" },
    { code: "RC2", title: "Fixed capacity, volatile demand", titleId: "Kapasitas tetap, permintaan bergejolak", icon: "chart",
      symptoms: "Demand swings from 78 to 105 million parcels per month (34.6%). The TikTok suspension cut e-commerce by 29.8% from September to October. Java overloads during Double 12.",
      solution: "Five layers: two-way forecasting, base fleet, flexible capacity, load balancing, downturn playbook.", kpi: "Load balancing Rp90 per parcel; MAPE 5% to 8% (out-of-sample)" },
    { code: "RC3", title: "Manual last-mile and cash", titleId: "Last-mile manual-cash", icon: "currency",
      symptoms: "COD takes 138 minutes against 75 minutes for non-COD (+84%). Courier productivity 44.8 against 24.3 parcels per day. Cash reconciliation is error-prone.",
      solution: "Output-based incentives for couriers, four digital interventions, and three-way cash reconciliation.", kpi: "Time per COD parcel 17.25 → 12.0 minutes; productivity +44%" },
    { code: "RC4", title: "Dirty data, blind multi-modal", titleId: "Data kotor + buta multimoda", icon: "map",
      symptoms: "5.5 complaints per million parcels. Ambiguous addresses (the same street name in three distant cities). Sea and air coordination keeps getting more complex.",
      solution: "Address Intelligence, multi-modal Control Tower, and a Modal Shift Optimizer.", kpi: "Below 3 per million parcels; geotag ≥95%" },
    { code: "RC5", title: "Capability lagging growth", titleId: "Kapabilitas tertinggal", icon: "grad",
      symptoms: "“Lacked deep operational expertise, management experience, technical knowledge”. Business model under review.",
      solution: "Digital Twin and KPI Tracker as decision-testing tools; an internal data science team.", kpi: "Network decisions grounded in evidence, not preference" },
    { code: "RC6", title: "Sustainability as purchase, not design", titleId: "Keberlanjutan bukan sistem", icon: "globe",
      symptoms: "A pilot of 350 electric units covers only 2.8% of 12,500 last-mile motorcycles. Buying assets does not change daily operating decisions.",
      solution: "Carbon account per route, modal shift, and a five-phase roadmap (350-unit pilot, two models).", kpi: "Emissions down 49.9%; 292 tonnes CO₂ per year" }
  ],
  heroProjects: [
    { num: "01", name: "Executive & Digital Twin", meta: "HQ Portal · Financial", seed: "exec-pusat", id: "pusat",
      desc: "Financial KPIs, the 23-hub Digital Twin, utilisation by region." },
    { num: "02", name: "Forecast & Load Balance", meta: "Hub Portal · Bandung", seed: "hub-dashboard", id: "hub",
      desc: "Demand forecast, load balancing across hubs, early capacity alerts." },
    { num: "03", name: "Predictive COD & Routes", meta: "Courier Portal · Jakarta", seed: "kurir-cod", id: "kurir",
      desc: "Route clustering, COD success risk scores, slot confirmation." },
    { num: "04", name: "Address Intelligence", meta: "Data Portal · National", seed: "data-address", id: "data",
      desc: "Address Intelligence, complaint monitoring, multi-modal control tower." }
  ],
  roles: [
    { slug: "PUSAT", name: "Dalila", role: "HQ Decision Maker", desc: "Financial KPIs, Digital Twin, utilisation of 23 hubs, expansion.", initials: "D" },
    { slug: "HUB", name: "Marwah", role: "Bandung Hub Manager", desc: "Forecast, load balancing, capacity, early alerts.", initials: "M" },
    { slug: "KURIR", name: "Baits", role: "Jakarta Courier", desc: "Route clustering, Predictive COD, slots, digital payment.", initials: "B" },
    { slug: "DATA", name: "Virgiawan", role: "Data & IT", desc: "Address Intelligence, complaints, control tower, emissions.", initials: "V" },
    { slug: "CUSTOMER", name: "Sari", role: "Buyer", desc: "Shop online, check out with COD and a risk score, track the delivery.", initials: "S" },
    { slug: "SELLER", name: "Rina", role: "Seller", desc: "Profit and margin analytics per product, incoming orders, customer scores.", initials: "R" }
  ],
  surfaceGrowth: [
    { label: "Parcels (2024)", value: "1.46 billion", delta: "+28% year on year" },
    { label: "Market share", value: "20.6%", delta: "market leader for five years" },
    { label: "Operating profit", value: "2024", delta: "back in positive territory" }
  ],
  surfaceConcern: [
    { label: "Fulfilment expense", value: "+54.9%", delta: "against sales +48.7%" },
    { label: "Utilisation gap", value: "62.3 percentage points", delta: "Jakarta 90.4% against Jayapura 28.1%" },
    { label: "Complaints", value: "5.5 per million parcels", delta: "≈6,105 cases per year" }
  ],
  approach: [
    { n: "(01)", t: "Data as one source", d: "OMS, WMS, PUDO, and Address Intelligence share one source of truth. Every decision cites the same data instead of a silo." },
    { n: "(02)", t: "Proactive insight per role", d: "Nigi AI greets every manager with a daily summary. Focus, not noise." },
    { n: "(03)", t: "Measured decisions from day one", d: "The Digital Twin tests scenarios before execution. Baseline-to-target KPIs stay visible." }
  ],
  arch: [
    { layer: "OMS", title: "Order Management System", desc: "The order brain: parcel status, courier assignment, routing, marketplace integration." },
    { layer: "WMS", title: "Warehouse Management System", desc: "Warehouse management: inbound, sorting, outbound, shelf capacity, inventory." },
    { layer: "PUDO", title: "Pick-Up Drop-Off Network", desc: "Point network: locations, shelf capacity, parcel retention, retail partner integration." }
  ],
  phases: [
    { f: "Phase 1", t: "Q4 2026 to Q1 2027", w: "A 350-unit electric pilot in two models (simple and detailed per class), evaluated on day 90 and day 180.", s: "A proof pilot, not the main profit driver" },
    { f: "Phase 2", t: "Q3 2027", w: "Scaling decision toward 3,000 units if the pilot conditions are met: uptime, energy cost, SLA, swap network.", s: "Gradual scale" },
    { f: "Phase 3", t: "2028", w: "Rooftop solar at hubs with high daytime load.", s: "Cleaner energy" },
    { f: "Phase 4", t: "2029", w: "Electric vans on a leasing scheme to cap technology risk.", s: "Wider modes" },
    { f: "Phase 5", t: "2030 to 2031", w: "Heavy electric fleet once the grid is cleaner; until then, modal shift, backhaul, and eco-driving.", s: "Decarbonising the heavy fleet" }
  ],
  targets: [
    ["Network utilisation", "61.8%", "75%"],
    ["Time per COD parcel", "17.25 minutes", "12.0 minutes"],
    ["COD courier productivity", "24.3 parcels per day", "35 parcels per day"],
    ["Complaints", "5.5 per million parcels", "below 3 per million parcels"],
    ["Forecast accuracy", "none yet", "MAPE 5% to 8% (out-of-sample)"],
    ["E-commerce exposure", "57.7%", "below 20% per platform"]
  ],
  answers: [
    { n: "Q1", q: "Should GC move from Direct Operation to a Regional Sponsor model?",
      a: "Not entirely. Eleven core hubs carry 73.6% of volume and stay Direct because density lowers cost per parcel; 8 thin hubs become Joint Ventures (26% fee) and the 4 lowest-utilisation hubs become Regional Sponsors (22% fee). Savings reach Rp5.04 trillion on the 2023 base, or Rp6.12 trillion on the projected base.",
      metrics: ["Savings of Rp5.04 trillion per year", "Cost-to-sales 28.35% → 26.8%", "Volume share of tiers A/B/C: 73.6 / 22.1 / 4.4 percent"],
      links: links([{ href: "/dashboard/pusat/digital-twin", label: "Digital Twin" }, { href: "/dashboard/pusat/network", label: "Network Expansion" }]) },
    { n: "Q2", q: "How should dramatic demand swings be handled?",
      a: "Five layers: two-way forecasting (seasonal, platform, and regulatory calendars), a base fleet at the 70th percentile, flexible capacity of +30 percent, load balancing across hubs, and a downturn playbook. Idle eastern hubs absorb the overflow.",
      metrics: ["Load balancing Rp90 per parcel", "MAPE 5% to 8% (out-of-sample)", "At most 35 percent of load moved"],
      links: links([{ href: "/dashboard/hub/forecast", label: "Demand Forecast" }, { href: "/dashboard/hub/load-balance", label: "Load Balancing" }]) },
    { n: "Q3", q: "How should the COD system be fixed?",
      a: "Separate COD from non-COD. Predictive COD scores the risk of each parcel: low risk goes out normally, high risk goes to a PUDO or pre-payment. Routes are clustered by zone, cash reconciliation is digitised, and cash stays available at PUDO for unbanked segments.",
      metrics: ["Time per COD parcel 17.25 → 12.0 minutes", "Productivity 24.3 → 35 parcels per day", "Digital payment ≥ 50% within 18 months"],
      links: links([{ href: "/dashboard/kurir/cod-risk", label: "Predictive COD" }, { href: "/dashboard/kurir/pudo", label: "PUDO Network" }]) },
    { n: "Q4", q: "What are the roadmap and benefit-cost of sustainability?",
      a: "Emissions become a daily metric per route and mode, not just an asset purchase. The 350-unit pilot runs in two models: Model A nets Rp2.66 billion per year (BCR 1.84 times, NPV Rp11.88 billion), Model B nets Rp3.50 billion per year (BCR 3.50 times, NPV Rp15.49 billion). The roadmap has five phases; the heavy fleet waits until the grid is cleaner.",
      metrics: ["Emissions down 49.9% per kilometre (292 tonnes CO₂ per year)", "Year-0 cash flow positive in both models", "Five-phase roadmap to 2031"],
      links: links([{ href: "/dashboard/data/fleet", label: "Fleet & Emissions" }, { href: "/dashboard/data/ev-sites", label: "EV Site Selection" }]) },
    { n: "Q5", q: "Is market expansion profitable?",
      a: "Yes, but fill the empty capacity of existing hubs first: 401 million parcels per year on the conservative 2024 base, up to 710 million on the Table 1 base. At a contribution of Rp3,000 per parcel, filling 10 to 35 percent yields Rp120 to 421 billion per year with no new infrastructure capital.",
      metrics: ["Empty capacity of 401 to 710 million parcels per year", "Contribution of Rp120 to 421 billion per year", "New hubs deferred until five conditions are met"],
      links: links([{ href: "/dashboard/pusat/executive", label: "Executive" }, { href: "/dashboard/pusat/roi", label: "ROI & BCA" }]) },
    { n: "Q6", q: "What other strategy cuts cost while protecting revenue?",
      a: "The main engine is volume: fixed costs are absorbed as volume grows 21.4 percent, supported by seven efficiency levers. The cost-to-sales bridge runs from 31.34 percent to 29.40 percent (volume absorption), 28.35 percent (seven levers), and 26.8 percent with selective sponsorship.",
      metrics: ["Cost-to-sales 31.34% → 26.8%", "Cost avoided Rp11.54 trillion, or Rp17.66 trillion with sponsorship", "Three revenue sources from assets already paid for"],
      links: links([{ href: "/dashboard/data/address", label: "Address Intelligence" }, { href: "/dashboard/data/multimodal", label: "Control Tower" }]) }
  ],
  solutions: [
    { n: "01", root: "Misaligned expansion", name: "Three-tier hybrid (Own, Joint Venture, Sponsor)", impact: "Eastern cost shifts from fixed to shared risk", kpi: "Savings Rp5.04 trillion; cost-to-sales 28.35% → 26.8%" },
    { n: "02", root: "Fixed capacity against volatile demand", name: "Five layers plus load balancing", impact: "Overflow handled where capacity actually exists", kpi: "Load balancing Rp90 per parcel; MAPE 5% to 8%" },
    { n: "03", root: "COD incentives pointing the wrong way", name: "Output incentives plus four digital interventions", impact: "Courier productivity from 24.3 to 35 parcels per day", kpi: "Time per COD parcel 17.25 → 12.0 minutes" },
    { n: "04", root: "Dirty data and blind multi-modal", name: "Address Intelligence and Control Tower", impact: "Fewer complaints; two modes under control without buying assets", kpi: "Complaints 5.5 → below 3 per million parcels; geotag ≥ 95%" },
    { n: "05", root: "Network decisions without evidence", name: "Digital Twin and KPI Tracker", impact: "Network decisions grounded in evidence, not preference", kpi: "The same model is used to test scenarios" },
    { n: "06", root: "Sustainability as an afterthought", name: "350-unit pilot plus a five-phase roadmap", impact: "Emissions fall without a capital spike", kpi: "Emissions down 49.9%; 292 tonnes CO₂ per year" }
  ],
  impactRows: [
    ["Network utilisation", "61.8%", "75%"],
    ["Time per COD parcel", "17.25 minutes", "12.0 minutes"],
    ["Complaints", "5.5 per million parcels", "below 3 per million parcels"],
    ["Emissions per kilometre", "0.05215 kg CO₂", "0.02610 kg CO₂"]
  ]
};

const id: LandingContent = {
  nav: [
    { href: "#jawaban", label: "Jawaban" },
    { href: "#diagnosis", label: "Diagnosis" },
    { href: "#solusi", label: "Solusi" },
    { href: "#arsitektur", label: "Sistem" },
    { href: "/analisis", label: "Analisis" },
    { href: "/whitepaper", label: "Whitepaper" }
  ],
  t: {
    skip: "Lewati ke konten",
    login: "Masuk Portal",
    eyebrow: "Sistem Terusik · ISCEA 2026",
    heroLead1: "Sistem saraf",
    heroEm: "last-mile",
    heroLead2: "di atas",
    heroStrong: "17.000 pulau",
    heroMeta: "23 hub, 3.200 titik, 14.180 kendaraan",
    heroTail: "dalam satu sumber kebenaran. Nigi AI menyapa tiap manajer dengan insight dari data studi kasus.",
    ctaAnswers: "Enam Jawaban",
    ctaSystem: "Tentang Sistem",
    navAnswers: "Jawaban",
    navDiagnosis: "Diagnosis",
    navSolutions: "Solusi",
    navSystem: "Sistem",
    navAnalysis: "Analisis",
    navWhitepaper: "Whitepaper",
    statHub: "hub aktif",
    statEra: "1987 sampai 2024",
    statParcel: "1,46",
    statParcelLabel: "miliar paket 2024",
    statGrowth: "+28% per tahun",
    statShare: "20,6",
    statShareLabel: "pangsa pasar",
    statShareDelta: "5 tahun beruntun",
    statUtil: "90,4%",
    statUtilLabel: "utilisasi Jakarta",
    statUtilDelta: "vs Jayapura 28,1%",
    secAnswers: "Jawaban",
    hAnswersA: "Enam pertanyaan kasus,",
    hAnswersEm: "enam jawaban",
    hAnswersDesc: "Tiap kartu menautkan pertanyaan studi kasus ke layar yang menjawabnya. Angka dari Tabel 1 sampai 4 dan Figure 1 sampai 2; asumsi tim berlabel.",
    secDiagnosis: "Diagnosis",
    hDiagA: "Angka headline bagus,",
    hDiagEm: "tapi tidak jujur",
    hDiagDesc: "Setiap akar punya solusi Omnigistic yang jelas dan KPI baseline ke target dari dokumen studi kasus.",
    symptoms: "Gejala:",
    solutionLabel: "Solusi Omnigistic",
    secSolutions: "Solusi",
    hSolA: "Enam solusi,",
    hSolEm: "satu sistem",
    hSolDesc: "Setiap solusi menunjuk akar yang diserang, dampak bisnisnya, dan KPI dari studi kasus.",
    secEvidence: "Kerangka, analisis dan dampak lengkap",
    hEvA: "Kerangka, analisis dan dampak lengkap",
    hEvB: "Setiap angka bisa",
    hEvEm: "ditelusuri",
    evDesc: "Angka dari Tabel 1 sampai 4 dan Figure 1 sampai 2; asumsi tim berlabel.",
    secTruth: "Satu sumber",
    hTruthA: "Cara sistem",
    hTruthEm: "bekerja",
    secArch: "Arsitektur",
    hArchA: "Tiga lapis plus",
    hArchEm: "Nigi AI",
    aiDesc: "Nigi AI, lapisan AI lintas tiga lapis. Asisten per role (Pusat, Hub, Kurir, Data, Customer, Seller) dengan greeting proaktif, auto-insight, dan chat interaktif yang terkunci pada data studi kasus.",
    ctaPortal: "Coba di Portal",
    secPortals: "Portal per",
    hPortalA: "Portal per ",
    hPortalEm: "peran",
    openPortal: "Buka portal",
    secRoadmap: "Roadmap",
    hRoadA: "Lima fase ",
    hRoadEm: "menuju skala",
    secTargets: "Data bukan slogan, angka dari 6 akar",
    thMetric: "Metrik",
    thToday: "Hari ini",
    thTarget: "Target",
    ctaExplore: "Jelajahi Dashboard",
    navMethodology: "Methodology",
    navKpi: "KPI Tracker",
    secSources: "Sumber & Batasan",
    hSrcA: "Setiap angka bisa",
    hSrcEm: "ditelusuri",
    srcOfficial: "Sumber angka",
    srcOfficialText: "Seluruh angka operasional dan finansial berasal dari Tabel 1 sampai 4 dan Figure 1 sampai 2 studi kasus ISCEA 2026. Tidak ada angka kasus yang diubah.",
    srcAssumption: "Asumsi tim",
    srcAssumptionText: "Harga EV, harga BBM, tarif listrik, dan proyeksi ROI adalah asumsi tim karena tidak tersedia di kasus. Semua diberi label di setiap layar.",
    srcProto: "Prototipe",
    srcProtoText: "Model forecast, COD risk, dan address intelligence adalah prototipe presentasi untuk menunjukkan cara kerja, bukan sistem produksi.",
    contact: "Kontak",
    hCtaA: "Punya ruang dalam",
    hCtaEm: "pikiran",
    ctaDashboard: "Masuk dashboard",
    footSystem: "Sistem yang diusulkan untuk ISCEA Global Case Competition 2026, Indonesia. Data dan narasi merujuk studi kasus.",
    footNav: "Navigasi",
    footTeam: "Tim",
    footCase: "Studi kasus “Delivering Promises”",
    copyright: "© 2026 Omnigistic · ISCEA Global Case Competition",
    secSystem: "Sistem",
    posGrowth: "Sisi positif: growth",
    posConcern: "Sisi struktural: cost gap",
    diagCountA: "13 gejala →",
    diagCountB: "6 akar masalah",
    truthEm: "kebenaran",
    aiTitle: "Nigi AI, lapisan AI lintas tiga lapis",
    targetsCaption: "Metrik Omnigistic hari ini dibanding target studi kasus",
  },
  rootCauses: [
    { code: "RC1", title: "Ekspansi tak selaras", titleId: "Unchecked expansion", icon: "compass",
      symptoms: "Fulfilment expense naik 54,9% vs net sales +48,7%. Rugi 2023. Utilisasi timpang: Jakarta 90,4% vs Jayapura 28,1%.",
      solution: "Hibrida tiga tingkat: 11 Direct, 8 Joint Venture, 4 Regional Sponsor.", kpi: "Penghematan Rp5,04 triliun per tahun; cost-to-sales 31,34% → 26,8%" },
    { code: "RC2", title: "Kapasitas tetap, permintaan bergejolak", titleId: "Fixed capacity, volatile demand", icon: "chart",
      symptoms: "Fluktuasi 78 sampai 105 juta paket per bulan (34,6%). Suspend TikTok menumbangkan e-commerce 29,8% dari September ke Oktober. Jawa overload saat Double 12.",
      solution: "Lima lapis: peramalan dua arah, base fleet, kapasitas fleksibel, load balancing, playbook penurunan.", kpi: "Load balancing Rp90 per paket; MAPE 5% sampai 8% (out-of-sample)" },
    { code: "RC3", title: "Last-mile manual-cash", titleId: "Manual last-mile and cash", icon: "currency",
      symptoms: "COD 138 menit vs non-COD 75 menit (+84%). Produktivitas kurir 44,8 vs 24,3 paket per hari. Rekonsiliasi kas rawan salah.",
      solution: "Insentif output untuk kurir, empat intervensi digital, dan rekonsiliasi kas tiga arah.", kpi: "Waktu per paket COD 17,25 → 12,0 menit; produktivitas +44%" },
    { code: "RC4", title: "Data kotor + buta multimoda", titleId: "Dirty data, blind multi-modal", icon: "map",
      symptoms: "Komplain 5,5 per juta paket. Alamat ambigu (nama jalan sama di tiga kota berjauhan). Koordinasi laut-udara makin kompleks.",
      solution: "Address Intelligence, Control Tower multimoda, dan Modal Shift Optimizer.", kpi: "Di bawah 3 per juta paket; geotag ≥95%" },
    { code: "RC5", title: "Kapabilitas tertinggal", titleId: "Capability lagging growth", icon: "grad",
      symptoms: "\u201cLacked deep operational expertise, management experience, technical knowledge\u201d. Model bisnis sedang ditinjau.",
      solution: "Digital Twin dan KPI Tracker sebagai alat uji keputusan; tim data science internal.", kpi: "Keputusan jaringan berbasis bukti, bukan selera" },
    { code: "RC6", title: "Keberlanjutan bukan sistem", titleId: "Sustainability as purchase, not design", icon: "globe",
      symptoms: "Pilot 350 unit listrik baru 2,8% dari 12.500 motor last-mile. Membeli aset bukan mengubah keputusan operasional harian.",
      solution: "Akun karbon per rute, modal shift, dan roadmap lima fase (pilot 350 unit, dua model).", kpi: "Emisi turun 49,9%; 292 ton CO₂ per tahun" }
  ],
  heroProjects: [
    { num: "01", name: "Executive & Digital Twin", meta: "Portal Pusat · Finansial", seed: "exec-pusat", id: "pusat",
      desc: "KPI finansial, Digital Twin 23 hub, utilisasi per region." },
    { num: "02", name: "Forecast & Load Balance", meta: "Portal Hub · Bandung", seed: "hub-dashboard", id: "hub",
      desc: "Forecast demand, load balancing antar-hub, alert dini kapasitas." },
    { num: "03", name: "Predictive COD & Rute", meta: "Portal Kurir · Jakarta", seed: "kurir-cod", id: "kurir",
      desc: "Clustering rute, skor risiko sukses COD, slot confirmation." },
    { num: "04", name: "Address Intelligence", meta: "Portal Data · Nasional", seed: "data-address", id: "data",
      desc: "Address Intelligence, monitoring komplain, control tower multimoda." }
  ],
  roles: [
    { slug: "PUSAT", name: "Dalila", role: "Decision Maker Pusat", desc: "KPI finansial, Digital Twin, utilisasi 23 hub, ekspansi.", initials: "D" },
    { slug: "HUB", name: "Marwah", role: "Hub Manager Bandung", desc: "Forecast, load balancing, kapasitas, alert dini.", initials: "M" },
    { slug: "KURIR", name: "Baits", role: "Kurir Jakarta", desc: "Clustering rute, Predictive COD, slot, pembayaran digital.", initials: "B" },
    { slug: "DATA", name: "Virgiawan", role: "Data & IT", desc: "Address Intelligence, komplain, control tower, emisi.", initials: "V" },
    { slug: "CUSTOMER", name: "Sari", role: "Pembeli", desc: "Belanja di e-commerce, checkout COD dengan skor risiko, lacak pengantaran.", initials: "S" },
    { slug: "SELLER", name: "Rina", role: "Penjual", desc: "Analitik laba rugi dan margin produk, pesanan masuk, skor pelanggan.", initials: "R" }
  ],
  surfaceGrowth: [
    { label: "Paket (2024)", value: "1,46 miliar", delta: "+28% per tahun" },
    { label: "Pangsa pasar", value: "20,6%", delta: "pemimpin pasar 5 tahun" },
    { label: "Laba operasional", value: "2024", delta: "kembali positif" }
  ],
  surfaceConcern: [
    { label: "Beban fulfilment", value: "+54,9%", delta: "vs penjualan +48,7%" },
    { label: "Selisih utilisasi", value: "62,3 poin persentase", delta: "Jakarta 90,4% vs Jayapura 28,1%" },
    { label: "Komplain", value: "5,5 per juta paket", delta: "≈6.105 kasus per tahun" }
  ],
  approach: [
    { n: "(01)", t: "Data jadi satu sumber", d: "OMS, WMS, PUDO, dan Address Intelligence berbagi satu sumber kebenaran. Setiap keputusan merujuk data yang sama, bukan silo." },
    { n: "(02)", t: "Insight proaktif per peran", d: "Nigi AI menyapa tiap manajer dengan ringkasan harian. Fokus, bukan notifikasi." },
    { n: "(03)", t: "Keputusan terukur sejak hari pertama", d: "Digital Twin menguji skenario sebelum dieksekusi. KPI baseline ke target selalu tampak." }
  ],
  arch: [
    { layer: "OMS", title: "Order Management System", desc: "Otak order: status paket, penugasan kurir, routing, integrasi marketplace." },
    { layer: "WMS", title: "Warehouse Management System", desc: "Manajemen gudang: inbound, sorting, outbound, kapasitas rak, inventaris." },
    { layer: "PUDO", title: "Pick-Up Drop-Off Network", desc: "Jaringan titik: lokasi, kapasitas rak, retensi paket, integrasi mitra ritel." }
  ],
  phases: [
    { f: "Fase 1", t: "Kuartal 4 2026 sampai Kuartal 1 2027", w: "Pilot 350 unit listrik dalam dua model (sederhana dan rinci per kelas), dievaluasi pada hari ke-90 dan ke-180.", s: "Pilot pembuktian, bukan penggerak laba utama" },
    { f: "Fase 2", t: "Kuartal 3 2027", w: "Keputusan skala menuju 3.000 unit bila syarat pilot lolos: uptime, biaya energi, SLA, dan jaringan swap.", s: "Skala bertahap" },
    { f: "Fase 3", t: "2028", w: "Solar rooftop di hub dengan beban siang tinggi.", s: "Energi lebih bersih" },
    { f: "Fase 4", t: "2029", w: "Van listrik dengan skema sewa untuk membatasi risiko teknologi.", s: "Perluasan moda" },
    { f: "Fase 5", t: "2030 sampai 2031", w: "Armada berat listrik setelah grid lebih bersih; sebelumnya modal shift, backhaul, dan eco-driving.", s: "Dekarbonisasi armada berat" }
  ],
  targets: [
    ["Utilisasi jaringan", "61,8%", "75%"],
    ["Waktu per paket COD", "17,25 menit", "12,0 menit"],
    ["Produktivitas kurir COD", "24,3 paket per hari", "35 paket per hari"],
    ["Komplain", "5,5 per juta paket", "di bawah 3 per juta paket"],
    ["Akurasi peramalan", "belum ada", "MAPE 5% sampai 8% (out-of-sample)"],
    ["Eksposur e-commerce", "57,7%", "di bawah 20% per platform"]
  ],
  answers: [
    { n: "Q1", q: "Haruskah GC beralih dari Direct Operation ke Regional Sponsor?",
      a: "Tidak sepenuhnya. Sebelas hub inti memuat 73,6% volume dan tetap Direct karena kepadatan menurunkan biaya per paket; 8 hub tipis masuk Joint Venture (fee 26%) dan 4 hub utilisasi terendah menjadi Regional Sponsor (fee 22%). Penghematan Rp5,04 triliun pada basis 2023, atau Rp6,12 triliun pada basis proyeksi.",
      metrics: ["Hemat Rp5,04 triliun per tahun", "Cost-to-sales 28,35% → 26,8%", "Pangsa volume tingkat A/B/C 73,6 / 22,1 / 4,4 persen"],
      links: links([{ href: "/dashboard/pusat/digital-twin", label: "Digital Twin" }, { href: "/dashboard/pusat/network", label: "Network Expansion" }]) },
    { n: "Q2", q: "Bagaimana menghadapi fluktuasi demand?",
      a: "Lima lapis: peramalan dua arah (kalender musiman, platform, regulasi), base fleet persentil-70, kapasitas fleksibel +30 persen, load balancing antar-hub, dan playbook penurunan volume. Hub timur yang menganggur menjadi penyerap beban berlebih.",
      metrics: ["Load balancing Rp90 per paket", "MAPE 5% sampai 8% (out-of-sample)", "Pengalihan beban maksimal 35 persen"],
      links: links([{ href: "/dashboard/hub/forecast", label: "Demand Forecast" }, { href: "/dashboard/hub/load-balance", label: "Load Balancing" }]) },
    { n: "Q3", q: "Bagaimana memperbaiki sistem COD?",
      a: "Pisahkan COD dari non-COD. Predictive COD memberi skor risiko per paket: risiko rendah antar normal, risiko tinggi ke PUDO atau pre-payment. Rute dikelompokkan per zona, rekonsiliasi kas didigitalkan, tunai tetap tersedia di PUDO untuk segmen unbanked.",
      metrics: ["Waktu per paket COD 17,25 → 12,0 menit", "Produktivitas 24,3 → 35 paket per hari", "Pembayaran digital ≥ 50% dalam 18 bulan"],
      links: links([{ href: "/dashboard/kurir/cod-risk", label: "Predictive COD" }, { href: "/dashboard/kurir/pudo", label: "PUDO Network" }]) },
    { n: "Q4", q: "Bagaimana roadmap dan benefit-cost keberlanjutan?",
      a: "Emisi menjadi metrik harian per rute dan moda, bukan sekadar pembelian aset. Pilot 350 unit dalam dua model: Model A net Rp2,66 miliar per tahun (BCR 1,84 kali, NPV Rp11,88 miliar), Model B net Rp3,50 miliar per tahun (BCR 3,50 kali, NPV Rp15,49 miliar). Roadmap lima fase; armada berat ditunda sampai jaringan listrik lebih bersih.",
      metrics: ["Emisi turun 49,9% per kilometer (292 ton CO₂ per tahun)", "Arus kas Tahun-0 positif di kedua model", "Roadmap lima fase sampai 2031"],
      links: links([{ href: "/dashboard/data/fleet", label: "Fleet & Emissions" }, { href: "/dashboard/data/ev-sites", label: "EV Site Selection" }]) },
    { n: "Q5", q: "Apakah ekspansi pasar profitable?",
      a: "Ya, tetapi isi ruang kosong hub yang sudah ada lebih dulu: 401 juta paket per tahun pada basis konservatif 2024, sampai 710 juta paket pada basis Tabel 1. Dengan kontribusi Rp3.000 per paket, mengisi 10 sampai 35 persen memberikan Rp120 sampai 421 miliar per tahun tanpa modal infrastruktur baru.",
      metrics: ["Ruang kosong 401 sampai 710 juta paket per tahun", "Kontribusi Rp120 sampai 421 miliar per tahun", "Hub baru ditunda sampai lima syarat terpenuhi"],
      links: links([{ href: "/dashboard/pusat/executive", label: "Executive" }, { href: "/dashboard/pusat/roi", label: "ROI & BCA" }]) },
    { n: "Q6", q: "Strategi lain turunkan biaya sambil jaga pendapatan?",
      a: "Mesin utamanya adalah volume: absorpsi biaya tetap saat volume naik 21,4 persen, ditambah tujuh tuas efisiensi. Jembatan cost-to-sales: 31,34 persen menjadi 29,40 persen (absorpsi volume), 28,35 persen (tujuh tuas), lalu 26,8 persen dengan sponsor selektif.",
      metrics: ["Cost-to-sales 31,34% → 26,8%", "Biaya dihindarkan Rp11,54 triliun, menjadi Rp17,66 triliun dengan sponsor", "Tiga sumber pendapatan dari aset yang sudah dibayar"],
      links: links([{ href: "/dashboard/data/address", label: "Address Intelligence" }, { href: "/dashboard/data/multimodal", label: "Control Tower" }]) }
  ],
  solutions: [
    { n: "01", root: "Ekspansi tak selaras", name: "Hibrida tiga tingkat (Own, Joint Venture, Sponsor)", impact: "Biaya wilayah timur berubah dari tetap menjadi berbagi risiko", kpi: "Hemat Rp5,04 triliun; cost-to-sales 28,35% → 26,8%" },
    { n: "02", root: "Kapasitas tetap vs permintaan bergejolak", name: "Lima lapis plus load balancing", impact: "Beban berlebih tertangani di tempat yang tepat", kpi: "Load balancing Rp90 per paket; MAPE 5% sampai 8%" },
    { n: "03", root: "Insentif COD salah arah", name: "Insentif output plus empat intervensi digital", impact: "Produktivitas kurir 24,3 menjadi 35 paket per hari", kpi: "Waktu per paket COD 17,25 → 12,0 menit" },
    { n: "04", root: "Data kotor & buta multimoda", name: "Address Intelligence plus Control Tower", impact: "Komplain turun; kendali dua moda tanpa membeli aset", kpi: "Komplain 5,5 → di bawah 3 per juta paket; geotag ≥ 95%" },
    { n: "05", root: "Keputusan jaringan tanpa bukti", name: "Digital Twin plus KPI Tracker", impact: "Keputusan jaringan berbasis bukti, bukan selera", kpi: "Model yang sama dipakai untuk uji skenario" },
    { n: "06", root: "Keberlanjutan bukan sistem", name: "Pilot 350 unit plus roadmap lima fase", impact: "Emisi turun tanpa lonjakan belanja modal", kpi: "Emisi turun 49,9%; 292 ton CO₂ per tahun" }
  ],
  impactRows: [
    ["Utilisasi jaringan", "61,8%", "75%"],
    ["Waktu per paket COD", "17,25 menit", "12,0 menit"],
    ["Komplain", "5,5 per juta paket", "di bawah 3 per juta paket"],
    ["Emisi per kilometer", "0,05215 kg CO₂", "0,02610 kg CO₂"]
  ]
};

/** Konten landing untuk locale aktif (dipanggil saat render). */
export function landingContent(): LandingContent {
  return getLocale() === "id" ? id : en;
}

/* ============================== ANALISIS ============================== */

export interface AnalisisQuestion { no: string; q: string; verdict: string; answer: string; evidence: string[]; link: string; linkLabel: string }
export interface AnalisisContent {
  layers: Array<{ l: string; n: string; t: string; q: string }>;
  order: string[][];
  biz: Array<{ t: string; d: string }>;
  fin: string[][];
  dataMap: string[][];
  derivedMetrics: string[];
  gaps: string[];
  sol: Array<{ n: string; root: string; name: string; impact: string; kpi: string }>;
  arch: Array<{ l: string; t: string; d: string }>;
  phases: Array<{ f: string; t: string; w: string }>;
  questions: AnalisisQuestion[];
  t: Record<string, string>;
}

const analisisT_id: Record<string, string> = {
  pill: "Kerangka & Analisis · v2.4 · Juni 2026",
  h1a: "Dari masalah ke solusi, ",
  h1em: "dengan dasar ilmu",
  deck: "Kerangka analisis, pemahaman bisnis, pemahaman data, dan solusi beserta dampak serta KPI-nya. Seluruh angka bersumber dari studi kasus, dan setiap asumsi tim diberi label.",
  metaFramingK: "Framing", metaFramingV: "6 pertanyaan kasus",
  metaMethodK: "Metode", metaMethodV: "MECE · 5 Whys",
  metaScopeK: "Kelengkapan", metaScopeV: "13 gejala → 6 akar",
  metaCloseK: "Penutup", metaCloseV: "BCA + roadmap 5 fase",
  sec1Label: "01 — Kerangka analisis",
  sec1H: "WHY, WHAT, HOW.",
  sec1Deck: "WHY: GC Logistics tumbuh cepat, tetapi biaya tumbuh lebih cepat dan rentan guncangan eksternal. HOW: diagnosis MECE dan akar masalah, lalu desain solusi berbasis teori, diuji dengan BCA dan KPI. WHAT: enam akar masalah, masing-masing dengan solusi, dampak, dan KPI.",
  cap1: "Enam lapis kerangka (L1–L6)",
  thLayer: "Lapis", thName: "Nama", thTool: "Alat", thQuestion: "Pertanyaan",
  sec2Label: "02 — Business understanding",
  sec2H: "Konteks, model, dan tegangan.",
  cap2: "Kinerja finansial, Triliun IDR (2020 → 2023)",
  thCategory: "Kategori (Triliun IDR)", th2020: "2020", th2023: "2023", thChange: "Perubahan",
  note2: "Rugi 2023, lalu EBIT positif 2024. Rasio biaya terhadap penjualan relatif stabil (30,9% → 31,3%), jadi masalahnya adalah skala dan kompleksitas, bukan rasio yang memburuk.",
  sec3Label: "03 — Data understanding",
  sec3H: "Bukan asumsi, tapi angka.",
  cap3: "Peta sumber data studi kasus",
  thSource: "Sumber", thContent: "Isi", thKeyFigure: "Angka kunci", thRoot: "Akar",
  mlTitle: "Metrik turunan", gapsTitle: "Keterbatasan data",
  sec4Label: "04 — Enam pertanyaan strategis",
  sec4H: "Jawaban, dengan angka yang bisa diaudit.",
  sec4Deck: "Setiap pertanyaan kasus dijawab dengan verdict, alasan, bukti kuantitatif dari analisis tim, dan tautan ke karya interaktifnya.",
  sec4Note: "Angka kanonik tim; setiap asumsi yang bukan dari kasus diberi label.",
  sec5Label: "05 — Solusi & dampak",
  sec5H: "Enam akar, enam dampak terukur.",
  cap5: "Solusi, dampak bisnis, dan KPI per akar",
  thRootCol: "Akar", thSolution: "Solusi", thImpact: "Dampak bisnis", thKpi: "KPI",
  contLabel: "Lanjutan",
  contText1: "Benefit-cost analysis penuh untuk inisiatif armada listrik tersedia di ",
  contLink: "Whitepaper EV Fleet BCA",
  contText2: " — dengan benchmark nasional, skema Battery-as-a-Service, dan stress-test replacement vs fleet tambahan.",
  footNote: "ANGKA DARI TABLE 1–4 & FIGURE 1–2 · ASUMSI TIM BERLABEL",
  navHome: "Beranda", navMethodology: "Methodology", navPortal: "Portal",
  cta: "Whitepaper",
  section: "ANALISIS",
  pageTitle: "Kerangka & Analisis",
  navKerangka: "Kerangka", navBisnis: "Bisnis", navData: "Data", navPertanyaan: "Pertanyaan", navSolusi: "Solusi"
};

const analisisEn: AnalisisContent = {
  layers: [
    { l: "L1", n: "Framing", t: "Core question + 6 case questions", q: "What is the real problem?" },
    { l: "L2", n: "Decomposition (MECE)", t: "Profitability tree: Profit = Revenue - Cost", q: "Where does value leak, without overlap?" },
    { l: "L3", n: "Diagnosis", t: "Issue tree + 5 Whys", q: "Why does the leak happen (root, not symptom)?" },
    { l: "L4", n: "Solution Design", t: "Lens per root cause (TCE, OM, BPR, Record Linkage, Dynamic Capabilities, TBL)", q: "Which solution fits, and why in theory?" },
    { l: "L5", n: "Evaluation", t: "Benefit-Cost Analysis + 3 scenarios + KPI tree", q: "How large is the impact, and is it viable?" },
    { l: "L6", n: "Implementation", t: "Five-phase roadmap + governance", q: "When and how do we execute?" }
  ],
  order: [
    ["1", "Business Understanding", "Define the right problem before touching the data."],
    ["2", "Data Understanding", "Prove the problem with figures, and expose the data limits."],
    ["3", "Diagnosis (13 symptoms to 6 roots)", "Attack causes, not symptoms."],
    ["4", "Solution Design", "Choose solutions with anchoring theory, not preference."],
    ["5", "Evaluation", "Answer profitable or not, quantitatively."],
    ["6", "Implementation", "Prove the solution can be executed."]
  ],
  biz: [
    { t: "Industry context", d: "Indonesian e-commerce reached Rp453.75 trillion (2023), across 17,000+ islands, with COD dominating because of limited financial access and regulatory shocks (the TikTok Shop suspension)." },
    { t: "Position & model", d: "GC Logistics, founded 2018. Market leader for five years, 20.6% share (2024). A centralised Direct Operation Model; 23 hubs, 2,500 points; sea and air through partners." },
    { t: "Stakeholders", d: "VPs, finance managers, hub managers, couriers, e-commerce partners, unbanked customers, regulators, and clients demanding ESG." }
  ],
  fin: [
    ["Fulfilment Expense", "32.34", "50.08", "+54.9%"],
    ["Shipping Expense", "33.76", "49.46", "+46.5%"],
    ["Net Sales", "213.64", "317.63", "+48.7%"]
  ],
  dataMap: [
    ["Table 1", "23 hubs: capacity, utilisation, outlets", "Jakarta 90.4% against Jayapura 28.1%", "Roots 1, 2"],
    ["Table 2", "Infrastructure 2020 against 2023", "Partners 20 → 478 (23.9x); outlets 750 → 2,500", "Root 1"],
    ["Table 3", "Cost & sales", "Fulfilment +54.9% against sales +48.7%", "Roots 1, 4"],
    ["Table 4", "Monthly demand 2023", "78 to 105 million parcels per month; e-commerce −29.8% from September to October", "Root 2"],
    ["Figure 1", "Ambiguous addresses", "The same street name in 3 distant cities", "Root 4"],
    ["Figure 2", "COD against non-COD", "138 against 75 minutes (8 parcels, 5.3 km)", "Root 3"]
  ],
  derivedMetrics: [
    "Cost-to-sales 30.94% (2020) → 32.79% (2022) → 31.34% (2023): what broke in 2023 was volume, not cost structure.",
    "Courier productivity 44.8 against 24.3 parcels per day (non-COD against COD), down 45.7%.",
    "Jakarta and Jayapura utilisation gap of 62.3 percentage points (90.4% against 28.1%).",
    "Absolute complaints 5.5 per million × 1,110 million ≈ 6,105 cases (2023).",
    "Motorcycles make up 93.7% of last-mile vehicles; 70% of last-mile parcels in major cities go by motorcycle.",
    "A 350-unit electric pilot equals 2.8% of the 12,500-strong last-mile fleet (not 200 units)."
  ],
  gaps: [
    "The case does not give EV prices, fuel prices, electricity tariffs, or charging capex; market figures come from external sources (September 2026) and every team assumption is labelled.",
    "The “almost doubled” cost narrative does not cover exactly the same scope as Table 3; do not mix them in one claim.",
    "The figure “3 million parcels per day” is ambiguous (industry record against internal volume)."
  ],
  sol: [
    { n: "01", root: "Misaligned expansion", name: "Three-tier hybrid (Own/JV/Sponsor)", impact: "Eastern cost moves from fixed to shared risk", kpi: "Network utilisation 61.8% → 75%" },
    { n: "02", root: "Capacity against demand", name: "Five layers + load balancing", impact: "Peak overload handled where capacity actually sits", kpi: "MAPE out-of-sample 5–8%; load balancing Rp90 per parcel" },
    { n: "03", root: "COD incentives pointing the wrong way", name: "Output incentives + 4 digital interventions", impact: "Courier productivity 24.3 → 35 parcels per day", kpi: "Time per COD parcel 17.25 → 12.0 minutes" },
    { n: "04", root: "Dirty data & blind multi-modal", name: "Address Intelligence + Control Tower", impact: "Fewer complaints; two modes controlled without capex", kpi: "Complaints below 3 per million parcels; geotag ≥95%" },
    { n: "05", root: "Network decisions without evidence", name: "Digital Twin + KPI Tracker", impact: "Network decisions grounded in evidence, not preference", kpi: "Cost-to-sales 31.34% → 28.35%" },
    { n: "06", root: "Sustainability as an afterthought", name: "350-unit EV pilot + five-phase roadmap", impact: "Emissions fall without a capital spike", kpi: "Emissions −49.9% per km; 292 tonnes CO₂ per year" }
  ],
  arch: [
    { l: "OMS", t: "Order Management System", d: "Parcel status, courier assignment, routing, marketplace integration." },
    { l: "WMS", t: "Warehouse Management System", d: "Inbound, sorting, outbound, shelf capacity, inventory." },
    { l: "PUDO", t: "Pick-Up Drop-Off Network", d: "Point network, shelf capacity, retention, retail partner integration." }
  ],
  phases: [
    { f: "Phase 1", t: "Q4 2026 to Q1 2027", w: "A 350-unit electric pilot (Models A & B) with 90-day and 180-day evaluations." },
    { f: "Phase 2", t: "Q3 2027", w: "Scaling decision toward 3,000 units if the pilot conditions are met." },
    { f: "Phase 3", t: "2028", w: "Rooftop solar at hubs with high daytime load." },
    { f: "Phase 4", t: "2029", w: "Electric vans on a leasing scheme to cap technology risk." },
    { f: "Phase 5", t: "2030 to 2031", w: "Heavy electric fleet once the grid is cleaner; until then, modal shift, backhaul, and eco-driving." }
  ],
  questions: [
    { no: "01", q: "Should Direct Operation move to a Regional Sponsored Model?",
      verdict: "Three-tier hybrid: 11 Direct · 8 Joint Venture · 4 Sponsor",
      answer: "Not entirely. Eleven core hubs carry 73.6% of volume and stay Direct because density lowers cost per parcel; 8 thin hubs become Joint Ventures (26% fee) and the 4 lowest-utilisation hubs become Regional Sponsors (22% fee). Savings of Rp5.04 trillion on the 2023 base, or Rp6.12 trillion on the projected base, shift cost-to-sales by 1.59 percentage points (28.35% → 26.8%).",
      evidence: [
        "Tier C holds the 4 lowest-utilisation hubs: Jayapura 28.1% · Ambon 32.1% · Banda Aceh 40.5% · Manado 41.2%; volume share of A/B/C is 73.6 / 22.1 / 4.4%.",
        "Savings = related revenue × (GC cost ratio 31.34% − partner fee): Rp3.74 trillion from the 8 JV hubs plus Rp1.30 trillion from the 4 sponsor hubs.",
        "Contract guardrails: on-time SLA above 92% (fee withheld on failure) · daily data to GCMS · customer tariffs at most HQ+5% · standby capacity +30% (48-hour notice) · quarterly outlet audits · a buyback formula agreed before conversion."
      ],
      link: "/dashboard/pusat/digital-twin", linkLabel: "Open Digital Twin" },
    { no: "02", q: "How should dramatic demand swings be handled?",
      verdict: "Five layers; the biggest lever is load balancing (Rp90 per parcel)",
      answer: "The problem is not total capacity (national utilisation is 61.8%) but capacity in the wrong place: at 1.45× only 3 hubs break, at 3× that becomes 21 hubs. The fix has five layers: two-way forecasting, a base fleet at the 70th percentile, flexible capacity of +30%, load balancing across hubs, and a downturn playbook.",
      evidence: [
        "Load balancing costs Rp90 per parcel: (120 km × Rp3,000/km) ÷ 4,000 parcels; on a like-for-like basis a new hub capex of Rp500 billion is about Rp618 per parcel over a 10-year horizon.",
        "Jakarta example: moving 0.10 million parcels per day takes utilisation from 90.4% to 72.6%, while receiving hubs rise to 73 to 81%.",
        "Forecast target is 5% to 8% MAPE out-of-sample (walk-forward). An in-sample claim of 1.3% is misleading because the data contains policy shocks (TikTok Shop).",
        "Downturn playbook: at day 7 stop flexible contracts · at day 14 switch line-haul to per-trip · at day 30 activate non-e-commerce portfolios."
      ],
      link: "/dashboard/hub/surge", linkLabel: "Open Peak-Surge Test" },
    { no: "03", q: "COD system analysis: compare the process and make recommendations.",
      verdict: "An incentive failure, not merely a process problem",
      answer: "Couriers are paid a flat rate per parcel, so delivering COD correctly costs them 20.45 deliveries a day (Rp40,900 to 45,256). The rational response is to avoid COD, cut verification, or refuse on the spot, which is what produces returns. The fix has three layers: repair the incentives, add four digital interventions, and reconcile cash three ways.",
      evidence: [
        "COD takes 138 minutes against 75 minutes for 8 parcels, so 17.25 against 9.375 minutes per parcel; productivity falls from 44.8 to 24.3 per day (−45.7%).",
        "Four interventions: QRIS 3.5 · pre-arrival confirmation 2.5 · two-objective risk and routing score 1.0 · PUDO or locker 0.5, for 7.5 minutes in total; at 70% realisation the target is 12.0 minutes per parcel and 35 parcels per day (+44%).",
        "Value: Rp2,089 per COD parcel × 388 million parcels (35% mix) equals Rp0.81 trillion that can be derived (range Rp0.58 to 1.04 trillion); the working figure of Rp1.95 trillion uses return and reconciliation components labelled as assumptions."
      ],
      link: "/dashboard/kurir/cod-intel", linkLabel: "Open COD Intelligence" },
    { no: "04", q: "Roadmap and benefit-cost analysis for the sustainability initiatives.",
      verdict: "A 350-unit pilot (2.8% of the fleet) in two models",
      answer: "Model A (350 Scoopy against 350 Zuzu): net Rp2.66 billion per year, BCR 1.84 times, NPV Rp11.88 billion, emissions down 266 tonnes CO₂. Model B (three real fleet classes): net Rp3.50 billion per year, BCR 3.50 times, ROI 250.45%, NPV Rp15.49 billion, emissions down 292 tonnes CO₂. Year-0 cash flow is already positive in both models, so there is no payback period.",
      evidence: [
        "Swap tariffs were tested: the market reference of Rp200/km gives net Rp2.40 billion and NPV Rp10.91 billion; the upper bound of Rp222/km gives net Rp2.18 billion and NPV Rp10.06 billion.",
        "Emissions: petrol 0.05215 against EV 0.02610 kg CO₂ per km (−49.9%); grid factor 0.87 kg CO₂ per kWh and 90% charging efficiency.",
        "A five-phase roadmap: 350-unit pilot (Q4 2026 to Q1 2027) → scaling decision to 3,000 units (Q3 2027) → rooftop solar (2028) → electric vans (2029) → heavy fleet (2030 to 2031) once the grid is cleaner.",
        "Scaling conditions: uptime above 95% · actual energy at most Rp200/km · SLA not degraded · swap network covers the routes · actual net benefit at least 80% of the model · at least two swap vendors per city."
      ],
      link: "/whitepaper", linkLabel: "Open the BCA Whitepaper" },
    { no: "05", q: "Justify the market expansion strategy: is it profitable?",
      verdict: "Profitable, but fill the empty capacity first, not new cities",
      answer: "The network has 401 million parcels of empty capacity per year on the conservative 2024 base, up to 710 million on the Table 1 base. At a contribution of Rp3,000 per parcel, filling 10% to 35% yields Rp120 to 421 billion per year with no new infrastructure capital. New cities pay back in 3 to 5 years, so they are deferred until the conditions are met.",
      evidence: [
        "Parcels per outlet per day: Java 1,052 against Maluku and Papua 420 — coverage is already spread; what is uneven is hub utilisation and eastern outlet productivity.",
        "New hub conditions (all must hold): utilisation at least 78% for three months · load balancing already running · SLA above 90% · no customer above 35% of volume · market growth at least 8% per year.",
        "Price-war warning: with tariffs near Rp10,000 and variable cost near Rp7,000, contribution is Rp3,000; a 10% tariff cut trims it to about Rp2,000."
      ],
      link: "/dashboard/pusat/expansion", linkLabel: "Open Market-Expansion ROI" },
    { no: "06", q: "What other strategy cuts cost while protecting revenue?",
      verdict: "Volume absorption plus seven levers, not price cuts",
      answer: "The main engine is volume: fixed cost of Rp34.84 trillion is already paid, so as volume grows 21.4% the cost per parcel falls without cutting anything. The cost-to-sales bridge runs from 31.34% to 29.40% (volume absorption), 28.35% (seven levers), and 26.8% with selective sponsorship. Cost avoided reaches Rp11.54 trillion without sponsorship, or Rp17.66 trillion with it.",
      evidence: [
        "Volume absorption Rp7.46 trillion plus seven net levers of Rp4.08 trillion (−5.2% of grown variable cost) plus selective sponsorship of Rp6.12 trillion.",
        "Sensitivity: a 10-point fall in utilisation raises cost per parcel by about 6.8%; a fixed-cost share of 25% gives absorption of Rp5.33 trillion, and 45% gives Rp9.59 trillion.",
        "Three revenue sources from assets already paid for: monetising idle capacity, COD-as-a-Service, and capacity collaboration between operators (Rp0.3 to 0.9 trillion, labelled as an assumption)."
      ],
      link: "/dashboard/pusat/pnl", linkLabel: "Open Cost-Waterfall P&L" }
  ],
  t: {
    pill: "Framework & Analysis · v2.4 · June 2026",
    h1a: "From problem to solution, ",
    h1em: "grounded in theory",
    deck: "The analysis framework, business understanding, data understanding, and solutions with their impact and KPIs. Every figure comes from the case study, and every team assumption is labelled.",
    metaFramingK: "Framing", metaFramingV: "6 case questions",
    metaMethodK: "Method", metaMethodV: "MECE · 5 Whys",
    metaScopeK: "Coverage", metaScopeV: "13 symptoms → 6 root causes",
    metaCloseK: "Closing", metaCloseV: "BCA + a five-phase roadmap",
    sec1Label: "01 — Analysis framework",
    sec1H: "WHY, WHAT, HOW.",
    sec1Deck: "WHY: GC Logistics grew fast, but cost grew faster and the business is exposed to external shocks. HOW: an MECE diagnosis of root causes, then theory-grounded solution design tested with BCA and KPIs. WHAT: six root causes, each with a solution, an impact, and a KPI.",
    cap1: "The six framework layers (L1 to L6)",
    thLayer: "Layer", thName: "Name", thTool: "Tool", thQuestion: "Question",
    sec2Label: "02 — Business understanding",
    sec2H: "Context, model, and tension.",
    cap2: "Financial performance, trillion IDR (2020 to 2023)",
    thCategory: "Category (trillion IDR)", th2020: "2020", th2023: "2023", thChange: "Change",
    note2: "A loss in 2023, then positive EBIT in 2024. The cost-to-sales ratio stayed broadly stable (30.9% to 31.3%), so the problem is scale and complexity, not a deteriorating ratio.",
    sec3Label: "03 — Data understanding",
    sec3H: "Not assumptions, but figures.",
    cap3: "Map of the case data sources",
    thSource: "Source", thContent: "Content", thKeyFigure: "Key figure", thRoot: "Root",
    mlTitle: "Derived metrics", gapsTitle: "Data limitations",
    sec4Label: "04 — The six strategic questions",
    sec4H: "Answers, with figures you can audit.",
    sec4Deck: "Each case question is answered with a verdict, the reasoning, quantitative evidence from the team analysis, and a link to the interactive work.",
    sec4Note: "Canonical team figures; every assumption that does not come from the case is labelled.",
    sec5Label: "05 — Solutions & impact",
    sec5H: "Six root causes, six measurable impacts.",
    cap5: "Solution, business impact, and KPI per root cause",
    thRootCol: "Root", thSolution: "Solution", thImpact: "Business impact", thKpi: "KPI",
    contLabel: "Continued",
    contText1: "The full benefit-cost analysis for the electric fleet initiative is available in the ",
    contLink: "EV Fleet BCA Whitepaper",
    contText2: " — with a national benchmark, a Battery-as-a-Service scheme, and a stress test of replacement against additional fleet.",
    footNote: "FIGURES FROM TABLES 1–4 & FIGURES 1–2 · TEAM ASSUMPTIONS LABELLED",
    navHome: "Home", navMethodology: "Methodology", navPortal: "Portal",
    cta: "Whitepaper",
    section: "ANALYSIS",
    pageTitle: "Framework & Analysis",
    navKerangka: "Framework", navBisnis: "Business", navData: "Data", navPertanyaan: "Questions", navSolusi: "Solutions"
  }
};

const analisisId: AnalisisContent = {

  layers: [
    { l: "L1", n: "Framing", t: "Pertanyaan inti + 6 pertanyaan kasus", q: "Apa masalah sebenarnya?" },
    { l: "L2", n: "Decomposition (MECE)", t: "Profitability tree: Laba = Pendapatan - Biaya", q: "Di mana nilai bocor, tanpa tumpang tindih?" },
    { l: "L3", n: "Diagnosis", t: "Issue tree + 5 Whys", q: "Mengapa kebocoran terjadi (akar, bukan gejala)?" },
    { l: "L4", n: "Solution Design", t: "Lensa per akar (TCE, OM, BPR, Record Linkage, Dynamic Capabilities, TBL)", q: "Solusi apa yang tepat, dan mengapa secara teori?" },
    { l: "L5", n: "Evaluation", t: "Benefit-Cost Analysis + 3 skenario + KPI tree", q: "Berapa dampaknya, dan apakah layak?" },
    { l: "L6", n: "Implementation", t: "Roadmap 5 fase + tata kelola", q: "Kapan dan bagaimana mengeksekusi?" }
  ],
  order: [
    ["1", "Business Understanding", "Menentukan masalah yang benar sebelum menyentuh data."],
    ["2", "Data Understanding", "Membuktikan masalah dengan angka, dan mengungkap batas data."],
    ["3", "Diagnosis (13 gejala → 6 akar)", "Menyerang penyebab, bukan gejala."],
    ["4", "Solution Design", "Memilih solusi dengan teori jangkar, bukan selera."],
    ["5", "Evaluation", "Menjawab profitable atau tidak secara kuantitatif."],
    ["6", "Implementation", "Membuktikan solusi bisa dieksekusi."]
  ],
  biz: [
    { t: "Konteks industri", d: "E-commerce Indonesia Rp453,75 triliun (2023), geografi 17.000+ pulau, COD dominan karena keterbatasan akses finansial, dan guncangan regulasi (suspend TikTok Shop)." },
    { t: "Posisi & model", d: "GC Logistics, berdiri 2018. Pemimpin pasar 5 tahun, pangsa 20,6% (2024). Direct Operation Model terpusat; 23 hub, 2.500 titik; laut dan udara via mitra." },
    { t: "Pemangku kepentingan", d: "VP, manajer keuangan, manajer hub, kurir, mitra e-commerce, pelanggan unbanked, regulator, dan klien yang menuntut ESG." }
  ],
  fin: [
    ["Fulfilment Expense", "32,34", "50,08", "+54,9%"],
    ["Shipping Expense", "33,76", "49,46", "+46,5%"],
    ["Net Sales", "213,64", "317,63", "+48,7%"]
  ],
  dataMap: [
    ["Table 1", "23 hub: kapasitas, utilisasi, outlet", "Jakarta 90,4% vs Jayapura 28,1%", "Akar 1, 2"],
    ["Table 2", "Infrastruktur 2020 vs 2023", "Partner 20 → 478 (23,9x); outlet 750 → 2.500", "Akar 1"],
    ["Table 3", "Biaya & penjualan", "Fulfilment +54,9% vs sales +48,7%", "Akar 1, 4"],
    ["Table 4", "Demand bulanan 2023", "78 sampai 105 juta paket per bulan; e-commerce −29,8% dari September ke Oktober", "Akar 2"],
    ["Figure 1", "Alamat ambigu", "Nama jalan sama di 3 kota berjauhan", "Akar 4"],
    ["Figure 2", "COD vs non-COD", "138 vs 75 menit (8 paket, 5,3 km)", "Akar 3"]
  ],
  derivedMetrics: [
    "Cost-to-sales 30,94% (2020) → 32,79% (2022) → 31,34% (2023): yang rusak di 2023 adalah volume, bukan struktur biaya.",
    "Produktivitas kurir 44,8 vs 24,3 paket/hari (non-COD vs COD) — turun 45,7%.",
    "Gap utilisasi Jakarta-Jayapura 62,3 poin persen (90,4% vs 28,1%).",
    "Komplain absolut 5,5 per juta × 1.110 juta ≈ 6.105 kasus (2023).",
    "Motor 93,7% dari kendaraan last-mile; 70% last-mile di kota besar via motor.",
    "Pilot 350 motor listrik = 2,8% dari 12.500 armada last-mile (bukan 200 unit)."
  ],
  gaps: [
    "Kasus tidak memberi harga EV, harga BBM, tarif listrik, atau capex charging; angka pasar dipakai dari sumber eksternal (Sep 2026) dan setiap asumsi tim diberi label.",
    "Narasi biaya 'almost doubled' tidak identik cakupannya dengan Table 3; jangan dicampur dalam satu klaim.",
    "Angka '3 juta paket/hari' ambigu (rekor industri vs internal)."
  ],
  sol: [
    { n: "01", root: "Ekspansi tak selaras", name: "Hibrida tiga tingkat (Own/JV/Sponsor)", impact: "Biaya wilayah timur: fixed → shared risk", kpi: "Utilisasi jaringan 61,8% → 75%" },
    { n: "02", root: "Kapasitas vs demand", name: "Lima lapis + load balancing", impact: "Overload puncak tertangani di tempat yang salah", kpi: "MAPE out-of-sample 5–8%; load balancing Rp90/paket" },
    { n: "03", root: "Insentif COD salah arah", name: "Insentif output + 4 intervensi digital", impact: "Produktivitas kurir 24,3 → 35 paket/hari", kpi: "Waktu per paket COD 17,25 → 12,0 menit" },
    { n: "04", root: "Data kotor & buta multimoda", name: "Address Intelligence + Control Tower", impact: "Komplain turun; kendali 2 moda tanpa capex", kpi: "Komplain di bawah 3 per juta paket; geotag ≥95%" },
    { n: "05", root: "Keputusan jaringan tanpa bukti", name: "Digital Twin + KPI Tracker", impact: "Keputusan jaringan berbasis bukti, bukan selera", kpi: "Cost-to-sales 31,34% → 28,35%" },
    { n: "06", root: "Keberlanjutan bukan sistem", name: "Pilot EV 350 unit + roadmap 5 fase", impact: "Emisi turun tanpa lonjakan capex", kpi: "Emisi −49,9% per km; 292 ton CO₂ per tahun" }
  ],
  arch: [
    { l: "OMS", t: "Order Management System", d: "Status paket, penugasan kurir, routing, integrasi marketplace." },
    { l: "WMS", t: "Warehouse Management System", d: "Inbound, sorting, outbound, kapasitas rak, inventaris." },
    { l: "PUDO", t: "Pick-Up Drop-Off Network", d: "Jaringan titik, kapasitas rak, retensi, integrasi mitra ritel." }
  ],
  phases: [
    { f: "Fase 1", t: "Q4 2026–Q1 2027", w: "Pilot 350 unit listrik (Model A & B) dengan evaluasi 90 dan 180 hari." },
    { f: "Fase 2", t: "Q3 2027", w: "Keputusan skala menuju 3.000 unit bila syarat pilot lolos." },
    { f: "Fase 3", t: "2028", w: "Solar rooftop di hub dengan beban siang tinggi." },
    { f: "Fase 4", t: "2029", w: "Van listrik dengan skema sewa untuk membatasi risiko teknologi." },
    { f: "Fase 5", t: "2030–2031", w: "Armada berat listrik setelah grid lebih bersih; sebelumnya modal shift, backhaul, dan eco-driving." }
  ],
  questions: [
{
    no: "01",
    q: "Haruskah Direct Operation beralih ke Regional Sponsored Model?",
    verdict: "Hibrida tiga tingkat: 11 Direct · 8 Joint Venture · 4 Sponsor",
    answer:
    "Tidak menyeluruh. Sebelas hub inti memuat 73,6% volume dan tetap Direct karena kepadatan menurunkan biaya per paket; 8 hub tipis jadi Joint Venture (fee 26%) dan 4 hub utilisasi terendah jadi Regional Sponsor (fee 22%). " +
    "Penghematan Rp5,04 triliun (basis 2023) atau Rp6,12 triliun (basis proyeksi), menggeser cost-to-sales 1,59 poin persen (28,35% → 26,8%).",
    evidence: [
    "Tingkat C = 4 hub utilisasi terendah: Jayapura 28,1% · Ambon 32,1% · Banda Aceh 40,5% · Manado 41,2%; pangsa volume A/B/C = 73,6 / 22,1 / 4,4%.",
    "Penghematan = pendapatan terkait × (rasio biaya GC 31,34% − fee mitra): Rp3,74 triliun dari 8 hub JV + Rp1,30 triliun dari 4 hub sponsor.",
    "Guardrail kontrak: SLA on-time >92% (fee ditahan bila gagal) · data harian ke GCMS · tarif pelanggan ≤ HQ+5% · kapasitas cadangan +30% (notifikasi 48 jam) · audit outlet triwulanan · formula buyback disepakati sebelum konversi.",
    ],
    link: "/dashboard/pusat/digital-twin",
    linkLabel: "Buka Digital Twin",
    },
    {
    no: "02",
    q: "Bagaimana menangani fluktuasi demand yang dramatis?",
    verdict: "Lima lapis; tuas terbesar load balancing (Rp90/paket)",
    answer:
    "Masalahnya bukan kapasitas total (utilisasi nasional 61,8%), melainkan kapasitas di tempat yang salah: pada 1,45× hanya 3 hub pecah, pada 3× menjadi 21 hub. Solusinya lima lapis: peramalan dua arah, base fleet persentil-70, kapasitas fleksibel +30%, load balancing antar-hub, dan playbook penurunan volume.",
    evidence: [
    "Load balancing Rp90 per paket — (120 km × Rp3.000/km) ÷ 4.000 paket; sebagai pembanding setara, capex hub baru Rp500 miliar ≈ Rp618 per paket (horizon 10 tahun).",
    "Contoh Jakarta: mengalihkan 0,10 juta paket/hari menurunkan utilisasi 90,4% → 72,6%, penerima naik ke 73–81%.",
    "Target akurasi MAPE out-of-sample 5–8% (validasi walk-forward). Klaim in-sample 1,3% menyesatkan, karena data mengandung guncangan kebijakan (TikTok Shop).",
    "Playbook penurunan: H+7 hentikan kontrak fleksibel · H+14 line-haul per-trip · H+30 aktifkan portofolio non-e-commerce.",
    ],
    link: "/dashboard/hub/surge",
    linkLabel: "Buka Peak-Surge Test",
    },
    {
    no: "03",
    q: "Analisis sistem COD: bandingkan proses & rekomendasi.",
    verdict: "Kegagalan insentif, bukan sekadar masalah proses",
    answer:
    "Kurir dibayar flat per paket, sehingga mengantar COD dengan benar membuatnya kehilangan 20,45 pengantaran per hari (Rp40.900 sampai 45.256). Perilaku rasionalnya: menghindari COD, mengurangi verifikasi, atau menolak di tempat — yang melahirkan retur. Solusinya tiga lapis: perbaiki insentif, empat intervensi digital, dan rekonsiliasi kas tiga arah.",
    evidence: [
    "Waktu COD 138 menit vs non-COD 75 menit untuk 8 paket → 17,25 vs 9,375 menit per paket; produktivitas 24,3 vs 44,8 per hari (−45,7%).",
    "Empat intervensi: QRIS 3,5 · konfirmasi pra-kedatangan 2,5 · skor risiko & rute dua-objektif 1,0 · PUDO/loker 0,5 = 7,5 menit; realisasi 70% → target 12,0 menit per paket, produktivitas 35 per hari (+44%).",
    "Nilai: Rp2.089 per paket COD × 388 juta paket (bauran 35%) = Rp0,81 triliun yang dapat diturunkan (rentang Rp0,58–1,04 triliun); angka kerja Rp1,95 triliun memakai komponen retur dan rekonsiliasi yang berlabel asumsi.",
    ],
    link: "/dashboard/kurir/cod-intel",
    linkLabel: "Buka COD Intelligence",
    },
    {
    no: "04",
    q: "Roadmap & benefit-cost analisis inisiatif sustainability.",
    verdict: "Pilot 350 unit (2,8% armada) dalam dua model",
    answer:
    "Model A (350 Scoopy ↔ 350 Zuzu): net Rp2,66 miliar per tahun, BCR 1,84×, NPV Rp11,88 miliar, emisi turun 266 ton CO₂. Model B (tiga kelas armada nyata): net Rp3,50 miliar per tahun, BCR 3,50×, ROI 250,45%, NPV Rp15,49 miliar, emisi turun 292 ton CO₂. Arus kas Tahun-0 sudah positif di kedua model, jadi tidak ada periode balik modal.",
    evidence: [
    "Tarif swap diuji: acuan pasar Rp200/km → net Rp2,40 miliar dan NPV Rp10,91 miliar; batas atas Rp222/km → net Rp2,18 miliar dan NPV Rp10,06 miliar.",
    "Emisi: bensin 0,05215 vs EV 0,02610 kg CO₂ per km (−49,9%); faktor grid 0,87 kg CO₂/kWh dan efisiensi charging 90%.",
    "Roadmap lima fase: pilot 350 unit (Q4 2026–Q1 2027) → keputusan skala 3.000 unit (Q3 2027) → solar rooftop (2028) → van listrik (2029) → armada berat (2030–2031) setelah listrik lebih bersih.",
    "Syarat penskalaan: uptime >95% · energi aktual ≤Rp200/km · SLA tidak turun · jaringan swap mencakup rute · net aktual ≥80% model · minimal dua vendor swap per kota.",
    ],
    link: "/whitepaper",
    linkLabel: "Buka Whitepaper BCA",
    },
    {
    no: "05",
    q: "Justifikasi strategi ekspansi pasar: profitable atau tidak?",
    verdict: "Menguntungkan, tetapi isi ruang kosong dulu — bukan buka kota baru",
    answer:
    "Ruang kosong jaringan 401 juta paket per tahun (basis konservatif 2024) sampai 710 juta (basis Tabel 1). Dengan kontribusi Rp3.000 per paket, mengisi 10% sampai 35% memberi Rp120 sampai 421 miliar per tahun tanpa modal infrastruktur baru. Kota baru berpayback 3–5 tahun, jadi ditunda sampai syarat terpenuhi.",
    evidence: [
    "Paket per outlet per hari: Jawa 1.052 vs Maluku & Papua 420 — jaringan sudah menyebar; yang timpang adalah utilisasi hub dan produktivitas outlet timur.",
    "Syarat hub baru (semua harus terpenuhi): utilisasi ≥78% selama tiga bulan · load balancing sudah berjalan · SLA >90% · tidak ada pelanggan >35% volume · pertumbuhan pasar ≥8% per tahun.",
    "Peringatan perang harga: dengan tarif ~Rp10.000 dan biaya variabel ~Rp7.000, kontribusi Rp3.000; tarif turun 10% memotongnya ke sekitar Rp2.000.",
    ],
    link: "/dashboard/pusat/expansion",
    linkLabel: "Buka Market-Expansion ROI",
    },
    {
    no: "06",
    q: "Strategi lain menurunkan biaya sambil menjaga pendapatan?",
    verdict: "Absorpsi volume + tujuh tuas, bukan pemotongan harga",
    answer:
    "Mesin utama adalah volume: biaya tetap Rp34,84 triliun sudah dibayar, jadi saat volume naik 21,4% biaya per paket turun tanpa memotong apa pun. Jembatan cost-to-sales: 31,34% → 29,40% (absorpsi volume) → 28,35% (tujuh tuas) → 26,8% (sponsor selektif). Biaya yang dihindarkan Rp11,54 triliun tanpa sponsor, Rp17,66 triliun dengan sponsor.",
    evidence: [
    "Absorpsi volume Rp7,46 triliun + tujuh tuas net Rp4,08 triliun (−5,2% biaya variabel setelah tumbuh) + sponsor selektif Rp6,12 triliun.",
    "Sensitivitas: utilisasi turun 10 poin menaikkan biaya per paket sekitar 6,8%; porsi biaya tetap 25% → manfaat absorpsi Rp5,33 triliun, 45% → Rp9,59 triliun.",
    "Tiga sumber pendapatan dari aset yang sudah dibayar: monetisasi kapasitas idle, COD-as-a-Service, kolaborasi kapasitas antar-operator (Rp0,3–0,9 triliun, berlabel asumsi).",
    ],
    link: "/dashboard/pusat/pnl",
    linkLabel: "Buka Cost-Waterfall P&L",
    },
  ],
  t: analisisT_id
};

export function analisisContent(): AnalisisContent {
  return getLocale() === "id" ? analisisId : analisisEn;
}

/* ============================== WHITEPAPER ============================== */

export interface WhitepaperContent {
  navLinks: Array<{ href: string; label: string }>;
  meta: Array<{ k: string; v: string }>;
  headline: Array<{ k: string; v: string }>;
  pasar: Array<{ item: string; val: string; src: string }>;
  paramA: string[][]; paramB: string[][]; chainA: string[][]; tcoA: string[][]; scenA: string[][];
  kelasB: string[][]; hematB: string[][]; kpiB: string[][]; kritisA: string[][]; kritisB: string[][]; co2: string[][];
  references: Array<{ n: number; t: string; u: string }>;
  t: Record<string, string>;
}

const whitepaperEn: WhitepaperContent = {
  navLinks: [
    { href: "#abstract", label: "Abstract" },
    { href: "#pasar", label: "Market Data" },
    { href: "#modela", label: "Model A" },
    { href: "#modelb", label: "Model B" },
    { href: "#kritis", label: "Break-even" },
    { href: "#emisi", label: "Emissions" },
    { href: "#catatan", label: "Notes" },
    { href: "#referensi", label: "References" }
  ],
  meta: [
    { k: "Authors", v: "Omnigistic Analytics Team" },
    { k: "Horizon", v: "5 years · 10% discount" },
    { k: "Audience", v: "ISCEA judges · GC management" },
    { k: "Last revised", v: "19 Sep 2026" }
  ],
  headline: [
    { k: "Net benefit per year", v: "Rp3.50 billion" },
    { k: "BCR (benefit ÷ cost)", v: "3.50×" },
    { k: "NPV @10% · 5 years", v: "Rp15.49 billion" },
    { k: "CO₂ reduction per year", v: "291.8 tonnes" }
  ],
  pasar: [
    { item: "Pertamax (38-province average)", val: "Rp16,253.95 /L", src: "national Rp15,950 as a comparison" },
    { item: "PLN B-2/TR electricity tariff", val: "Rp1,444.70 /kWh", src: "PLN, Sep 2026" },
    { item: "Honda Scoopy Fashion", val: "Rp23,376,000", src: "Astra Oto Shop" },
    { item: "Smoot Zuzu (swap)", val: "Rp19,900,000", src: "Smoot Store" },
    { item: "Honda BeAT CBS (M1)", val: "Rp19,380,000", src: "market Rp18.98–20.38 million" },
    { item: "Honda Vario Evo 160 (M2)", val: "Rp28,525,000", src: "market Rp28.1–29.5 million" },
    { item: "Honda Genio (M3)", val: "Rp20,500,000", src: "market Rp19.73–21.5 million" },
    { item: "United MX-1200 (M2, EV)", val: "Rp16,800,000", src: "Oto.com" },
    { item: "Polytron Fox-200 (M3, EV)", val: "Rp11,500,000", src: "market Rp12.1–12.5 million" },
    { item: "Battery swap tariff (M1)", val: "Rp175 /km", src: "market Rp200–222 /km" },
    { item: "Jakarta minimum wage 2026", val: "Rp5,729,876 /month", src: "DKI Governor Decree 1142/2025" }
  ],
  paramA: [
    ["Units", "350 (2.8% of 12,500)", "Team choice"],
    ["Distance", "80 km per day, 365 days", "Assumption"],
    ["ICE → EV", "Scoopy Fashion → Smoot Zuzu", "Market"],
    ["Effective consumption", "44.2985 km/L", "Manufacturer + idle"],
    ["Swap tariff", "Rp175 /km (market reference Rp200)", "Market / assumption"],
    ["ICE / EV service", "Rp2.88 million / Rp1.20 million per unit per year", "Assumption"]
  ],
  paramB: [
    ["Total units", "350 (175 + 105 + 70)", "Team choice"],
    ["M1", "175 BeAT CBS → Smoot Zuzu · swap", "Market"],
    ["M2", "105 Vario Evo 160 → United MX-1200 · charge", "Market"],
    ["M3", "70 Genio → Polytron Fox-200 · charge", "Market"],
    ["EV energy", "swap Rp175/km · charge Rp43.34/km", "Market"],
    ["EV tax", "PKB 2% per year · BBNKB 12.5% once · NJKB 65% of ICE price", "Team assumption"]
  ],
  chainA: [
    ["Distance: 350 × 80 × 365", "10,220,000 km"],
    ["Effective consumption: 80 ÷ (80/59.0 + 0.45)", "44.2985 km/L"],
    ["Fuel cost per km", "Rp366.92"],
    ["Annual fuel cost", "Rp3,749,913,679"],
    ["Annual swap cost: 10,220,000 × 175", "Rp1,788,500,000"],
    ["Energy savings", "Rp1,961,413,679"],
    ["Service savings: 350 × (2.88 − 1.20) million", "Rp588,000,000"],
    ["PKB savings: 350 × Rp15,194,400 × 2%", "Rp106,360,800"],
    ["Net benefit per year", "Rp2,655,774,479"],
    ["Purchase savings: 350 × Rp3,476,000", "Rp1,216,600,000"],
    ["One-off BBNKB savings: ×12.5%", "Rp664,755,000"],
    ["Training cost: 350 × (minimum wage ÷ 30)", "Rp66,848,553"],
    ["Year-0 cash flow", "+Rp1,814,506,447"]
  ],
  tcoA: [
    ["Purchase price", "Rp23,376,000", "Rp19,900,000"],
    ["Energy / unit / year", "Rp10,714,039", "Rp5,110,000"],
    ["Service / unit / year", "Rp2,880,000", "Rp1,200,000"],
    ["PKB / unit / year", "Rp303,888", "Rp0"],
    ["5-year TCO / unit", "Rp94,764,935", "Rp51,450,000"]
  ],
  scenA: [
    ["Rp175 /km (swap.id assumption, optimistic)", "Rp2,655,774,479", "Rp11,881,981,206"],
    ["Rp200 /km (market lower bound, reference)", "Rp2,400,274,479", "Rp10,913,435,187"],
    ["Rp222 /km (market upper bound)", "Rp2,175,434,479", "Rp10,061,114,689"]
  ],
  kelasB: [
    ["M1", "175", "BeAT CBS → Smoot Zuzu", "swap Rp175/km", "45.19 km/L", "359.68 → 175.00"],
    ["M2", "105", "Vario Evo 160 → United MX-1200", "charge", "37.11 km/L", "437.99 → 43.34"],
    ["M3", "70", "Genio → Polytron Fox-200", "charge", "44.35 km/L", "366.50 → 43.34"]
  ],
  hematB: [
    ["M1", "Rp943,739,611", "Rp294,000,000", "Rp44,089,500", "−Rp91,000,000", "127.8 tonnes"],
    ["M2", "Rp1,209,934,208", "Rp176,400,000", "Rp38,936,625", "Rp1,231,125,000", "110.8 tonnes"],
    ["M3", "Rp660,544,990", "Rp117,600,000", "Rp18,655,000", "Rp630,000,000", "53.1 tonnes"],
    ["Total", "Rp2,814,243,463", "Rp588,000,000", "Rp101,681,125", "Rp1,770,125,000", "291.8 tonnes"]
  ],
  kpiB: [
    ["Net benefit per year", "Rp3,503,924,588"],
    ["Prudent net benefit (battery reserve)", "Rp3,267,674,588"],
    ["Year-0 cash flow", "+Rp2,207,533,478"],
    ["BCR (5-year benefit ÷ 5-year cost)", "3.50×"],
    ["5-year ROI", "250.45%"],
    ["NPV @10% · 5 years", "Rp15,490,164,448"],
    ["5-year TCO (ICE against EV)", "Rp33,655,367,522 against Rp15,109,461,103 (2.227×)"]
  ],
  kritisA: [
    ["Swap tariff where EV energy equals petrol", "Rp366.92 /km (up 2.10×)"],
    ["Swap tariff at zero net operating cost", "Rp424.45 /km"],
    ["Pertamax price where Scoopy energy equals swap Rp175", "Rp7,752 /L"]
  ],
  kritisB: [
    ["M1 (swap): energy parity · net zero", "Rp359.68 /km (2.06×) · Rp417.21 /km"],
    ["M2 (charge): energy parity · net zero", "Rp14,600 /kWh (10.1×) · Rp16,518 /kWh"],
    ["M3 (charge): energy parity · net zero", "Rp12,216 /kWh (8.5×) · Rp14,134 /kWh"]
  ],
  co2: [
    ["Model A (Scoopy ↔ Zuzu)", "0.05215 → 0.02610 kg CO₂/km", "−49.9%", "266.2 tonnes per year"],
    ["Model B (three classes)", "weighted fleet difference", "−49.9% per km", "291.8 tonnes per year"]
  ],
  references: [
    { n: 1, t: "Pertamina Patra Niaga / Bloomberg Technoz — Pertamax price, September 2026", u: "https://www.bloombergtechnoz.com/detail-news/120214/harga-pertamax-september-ditahan-keputusan-tepat-atau-nekat" },
    { n: 2, t: "PLN — B-2/TR business electricity tariff Rp1,444.70/kWh", u: "https://www.metrotvnews.com/read/kM6C4n6l-tarif-listrik-lengkap-periode-14-20-september-2026" },
    { n: 3, t: "Astra Oto Shop — Honda Scoopy Fashion 2026 price", u: "https://astraotoshop.com/article/harga-motor-scoopy-2026" },
    { n: 4, t: "Smoot Store — Smoot Zuzu Rp19,900,000", u: "https://store.smoot.id/products/smoot-zuzu" },
    { n: 5, t: "Oto.com — Honda BeAT, Vario 160, Genio 2026 prices", u: "https://www.oto.com/motor-baru/honda/beat-esp" },
    { n: 6, t: "Oto.com — United MX 1200 Rp16.8 million OTR", u: "https://www.oto.com/motor-baru/united/mx-1200/harga" },
    { n: 7, t: "Polytron — Fox 200 Electric OTR", u: "https://polytron.co.id/produk/polytron-fox-200-electric-sepeda-motor-listrik-buy-to-own-otr-jadetabek/" },
    { n: 8, t: "DKI Jakarta Governor Decree 1142/2025 — 2026 minimum wage Rp5,729,876", u: "https://jdih.jakarta.go.id/dokumen/detail/14763" },
    { n: 9, t: "IPCC NGGIP — 2006 Guidelines (petrol emission factor)", u: "https://www.ipcc-nggip.iges.or.jp/public/2006gl/" },
    { n: 10, t: "PLN grid emission factor ≈ 0.87 kg CO₂/kWh", u: "https://journal.uii.ac.id/JSTL/article/download/46984/19745/165531" }
  ],
  t: {
    whTitle: "Benefit-Cost Analysis of the Electric Fleet · Omnigistic",
    pill: "Whitepaper · v3.0 · 19 Sep 2026",
    h1a: "Benefit-cost analysis of the electric fleet:",
    h1em: "350 units",
    h1b: ", two models, one conclusion.",
    deck: "A pilot of 350 electric motorcycles over the vehicle replacement cycle, a 5-year horizon, a 10% discount rate, and EV tax exemptions included in the base case.",
    abstractLabel: "Abstract · TL;DR",
    abstractH: "The right question is not \"is an EV cheaper\", but which model survives market prices.",
    abstractP1a: "The case study asks for a roadmap and a benefit-cost analysis of GC Logistics sustainability initiatives: 23 regional hubs, 12,500 motorcycles, a target of more than 200 clean vehicles.",
    unitEm: "350 units",
    abstractP1b: "(2.8% of the fleet) because a pilot must be large enough to prove unit economics yet small enough to stop.",
    abstractP2a: "The result is positive in both models and stays positive even when the swap tariff rises to the market upper bound. Year-0 cash flow is already",
    positiveEm: "positive",
    abstractP2b: ", because EV purchase prices are lower in aggregate plus the BBNKB exemption.",
    headlineIs: "Headline =",
    modelBEm: "Model B",
    headlineNote: "(detailed, real fleet mix, tax in the base case). Model A (simple) gives a net Rp2.66 billion per year, BCR 1.84×, and NPV Rp11.88 billion.",
    s1Label: "01 — Verified market data",
    s1H: "Market prices were rechecked, and any gap is stated.",
    s1P1a: "Pertamax has no single national number. We use the 38-province average of",
    priceEm: "Rp16,253.95 per litre",
    s1P1b: "and record the national price of Rp15,950 per litre as a comparison, a gap of about 2% that lowers energy savings by roughly Rp70 million per year.",
    capPasar: "Market data (19 Sep 2026)",
    thParam: "Parameter",
    thValue: "Value",
    thNote: "Note",
    s1Note1: "The Rp175 per km swap tariff from swap.id is likely low: market references cite Rp200 to 222 per km. We therefore",
    swapRefEm: "use Rp200 per km as the reference",
    s1Note2: "and Rp222 per km as the upper bound in the scenario test.",
    s2Label: "02 — Model A · simple",
    s2H: "One class, a calculation chain auditable line by line.",
    capParamA: "Model A parameters (350 Scoopy ↔ 350 Zuzu)",
    thParam2: "Parameter",
    thValue2: "Value",
    thSifat: "Nature",
    capChainA: "Model A calculation chain (per year, 350 units)",
    thStep: "Step",
    thResult: "Result",
    capTco: "5-year TCO per unit",
    thComp: "Component",
    thIce: "ICE Scoopy",
    thEv: "EV Zuzu",
    bcrNpvTitle: "BCR & NPV",
    bcrP1: "TCO of ICE Rp94,764,935 divided by TCO of EV Rp51,450,000 gives",
    bcrEm: "BCR 1.84×",
    bcrP2: ": the EV is about 46% cheaper to own. NPV @10% reaches",
    npvEm: "Rp11,881,981,206",
    paybackA: "Payback: there is no payback period.",
    paybackB: "Year-0 cash flow is already positive (Rp1,814,506,447), because the EV is cheaper to buy plus the BBNKB saving.",
    capScen: "Swap tariff test (decision reference = Rp200 per km)",
    thSwap: "Swap tariff",
    thNetYear: "Net benefit / year",
    thNpv: "NPV @10%",
    scenNote: "Even at the market upper bound, net benefit stays at Rp2.18 billion per year and NPV at Rp10.06 billion. The conclusion does not change.",
    s3Label: "03 — Model B · detailed per class",
    s3H: "Because the fleet is not homogeneous, averaging across brands is removed.",
    capParamB: "Model B parameters (350 units, three classes)",
    thParam3: "Parameter",
    thValue3: "Value",
    thSifat2: "Nature",
    capKelas: "Class composition",
    thKelas: "Class",
    thUnit: "Units",
    thIceEv: "ICE → EV",
    thMode: "Mode",
    thKonsumsi: "Effective consumption",
    thBiayaEnergi: "Energy cost ICE → EV (Rp/km)",
    capHemat: "Savings per class (per year)",
    thKelas2: "Class",
    thEnergi: "Energy",
    thServis: "Service",
    thPkb: "PKB",
    thCapex: "CAPEX",
    thEmisi: "Emissions reduction",
    kelasNote: "Class M1 (BeAT) is indeed more expensive to buy as an EV (CAPEX saving −Rp91 million); classes M2 and M3 cover it, so the total is +Rp1.77 billion.",
    capKpiB: "Model B financial KPIs",
    thKpi: "KPI",
    thNilaiKpi: "Value",
    kpiNote: "Training cost Rp66,848,553 = 350 units × 1 day × (Jakarta minimum wage Rp5,729,876 ÷ 30 days). The depot electricity tariff for the 175 charge-based units is Rp1,444.70 per kWh.",
    s4Label: "04 — Break-even points",
    s4H: "How far prices must move before the conclusion changes.",
    capKritisA: "Model A (one class)",
    thPertanyaan: "Question",
    thJawaban: "Answer",
    capKritisB: "Model B (three classes)",
    thKelas3: "Class",
    thBatas: "Energy-parity · net-zero threshold",
    kritisNote: "Charge-based classes withstand electricity tariff increases far better than the swap class withstands swap tariff increases. For M1, the Pertamax price at which energy parity holds is about Rp7,908 per litre.",
    s5Label: "05 — Operational CO₂ emissions",
    s5H: "A reduction we can account for, and its limits.",
    s5P: "For petrol we use an emission factor of 2.31 kg CO₂ per litre; for electricity, a generation intensity of 0.87 kg CO₂ per kWh with 90% charging efficiency.",
    capCo2: "CO₂ reduction (operational)",
    thModel: "Model",
    thEmisiKm: "Emissions per km",
    thPenurunan: "Reduction",
    thPerTahun: "Per year",
    co2Note: "This is an operational estimate, not a lifecycle assessment. Motorcycle and battery production, recycling, and the fuel chain are not included.",
    s6Label: "06 — Notes, scope, and honest figures",
    s6H: "What is counted, what is not, and what must be validated.",
    scopeLabel: "Scope.",
    scopeP: "This BCA covers the electric fleet initiative (350 units). The two other sustainability initiatives named in the case, degradable delivery bags and reusable transit bags, are assessed on carbon and planning; their cost side sits in Challenge 6 so it is not double counted.",
    pilotLabel: "A pilot, not the main profit driver.",
    pilotP: "A net benefit of Rp3.50 billion equals roughly 0.0035% of the Rp99.54 trillion logistics cost. Its value is proving unit economics and swap risk before a large investment.",
    heavyLabel: "The heavy fleet is deferred.",
    heavyP: "On a grid that is still carbon-intensive, electric trucks are estimated to be about 19% more emissive than diesel. The specific 19% figure",
    scaleLabel: "Scaling conditions.",
    scaleP: "Uptime above 95%, actual energy cost at most Rp200 per km, SLA not degraded, the swap network covers the routes, actual net benefit at least 80% of the model, and at least two swap vendors per city.",
    quoteA: "The BCA question is not \"is an EV cheaper\" but",
    quoteEm: "\"at which market price does the EV stop being profitable?\"",
    quoteB: "That is why every tariff and price is tested across its range, not at a single point.",
    refLabel: "References & footnotes",
    refH: "Market data sources.",
    refNote: "All market benchmark values can change over time and by vendor. Case data: 23 hubs, 12,500 motorcycles, about 70% of urban last-mile by motorcycle.",
    footBrand: "OMNIGISTIC · ISCEA GLOBAL CASE 2026 · GC LOGISTICS",
    footAnalisis: "Framework & Analysis →",
    footModel: "Interactive Model →",
  },
};

const whitepaperT_id: Record<string, string> = {
  whTitle: "Whitepaper · BCA Armada Listrik · Omnigistic",
  pill: "Whitepaper · v3.0 · 19 Sep 2026",
  h1a: "Benefit-cost analysis armada listrik:",
  h1em: "350 unit",
  h1b: ", dua model, satu kesimpulan.",
  deck: "Pilot 350 motor listrik pada siklus penggantian kendaraan, horizon 5 tahun, diskonto 10%, dengan pembebasan pajak EV dimasukkan ke base case. Model A sederhana satu kelas, Model B rinci mengikuti campuran armada nyata.",
  abstractLabel: "Abstract · TL;DR",
  abstractH: "Pertanyaan yang benar bukan \"apakah EV lebih hemat\", melainkan model mana yang bertahan terhadap harga pasar.",
  abstractP1a: "Studi kasus meminta roadmap dan benefit-cost analysis untuk inisiatif keberlanjutan GC Logistics: 23 hub regional, 12.500 motor, target lebih dari 200 kendaraan bersih. Kami mengambil pilot",
  unitEm: "350 unit",
  abstractP1b: "(2,8% armada) karena pilot harus cukup besar untuk membuktikan unit economics, tetapi cukup kecil untuk dihentikan.",
  abstractP2a: "Hasilnya positif di kedua model, dan tetap positif ketika tarif swap dinaikkan ke batas atas pasar. Arus kas Tahun-0 sudah",
  positiveEm: "positif",
  abstractP2b: ", karena harga beli EV lebih murah secara agregat ditambah pembebasan BBNKB.",
  headlineIs: "Headline =",
  modelBEm: "Model B",
  headlineNote: "(rinci, campuran armada nyata, pajak di base). Model A (sederhana) memberi net Rp2,66 miliar per tahun, BCR 1,84×, dan NPV Rp11,88 miliar.",
  s1Label: "01 — Data pasar terverifikasi",
  s1H: "Harga pasar diperiksa ulang, dan selisihnya dinyatakan.",
  s1P1a: "Harga Pertamax tidak punya satu angka untuk seluruh Indonesia. Kami memakai rata-rata 38 provinsi",
  priceEm: "Rp16.253,95 per liter",
  s1P1b: "dan mencatat harga nasional Rp15.950 per liter sebagai pembanding, selisih sekitar 2% yang menurunkan hemat energi sekitar Rp70 juta per tahun bila dipakai.",
  capPasar: "Data pasar (19 Sep 2026)",
  thParam: "Parameter",
  thValue: "Nilai",
  thNote: "Catatan",
  s1Note1: "Tarif swap Rp175 per km dari swap.id berpotensi rendah: referensi pasar menyebut Rp200 sampai 222 per km. Karena itu",
  swapRefEm: "Rp200 per km dipakai sebagai acuan",
  s1Note2: "dan Rp222 per km sebagai batas atas dalam uji skenario.",
  s2Label: "02 — Model A · sederhana",
  s2H: "Satu kelas, rantai perhitungan yang bisa diaudit baris per baris.",
  capParamA: "Parameter Model A (350 Scoopy ↔ 350 Zuzu)",
  thParam2: "Parameter",
  thValue2: "Nilai",
  thSifat: "Sifat",
  capChainA: "Rantai perhitungan Model A (per tahun, 350 unit)",
  thStep: "Langkah",
  thResult: "Hasil",
  capTco: "TCO 5 tahun per unit",
  thComp: "Komponen",
  thIce: "ICE Scoopy",
  thEv: "EV Zuzu",
  bcrNpvTitle: "BCR & NPV",
  bcrP1: "TCO ICE Rp94.764.935 dibagi TCO EV Rp51.450.000 memberi",
  bcrEm: "BCR 1,84×",
  bcrP2: ": EV sekitar 46% lebih murah dimiliki. NPV @10% sebesar",
  npvEm: "Rp11.881.981.206",
  paybackA: "Payback: tidak ada periode balik modal.",
  paybackB: "Arus kas Tahun-0 sudah positif (Rp1.814.506.447), karena EV lebih murah dibeli ditambah hemat BBNKB.",
  capScen: "Uji tarif swap (acuan keputusan = Rp200 per km)",
  thSwap: "Tarif swap",
  thNetYear: "Net benefit / tahun",
  thNpv: "NPV @10%",
  scenNote: "Bahkan pada batas atas pasar, net benefit tetap Rp2,18 miliar per tahun dan NPV Rp10,06 miliar. Kesimpulan tidak berubah.",
  s3Label: "03 — Model B · rinci per kelas",
  s3H: "Karena armada tidak homogen, rata-rata antar merek dibuang.",
  capParamB: "Parameter Model B (350 unit, tiga kelas)",
  thParam3: "Parameter",
  thValue3: "Nilai",
  thSifat2: "Sifat",
  capKelas: "Komposisi kelas",
  thKelas: "Kelas",
  thUnit: "Unit",
  thIceEv: "ICE → EV",
  thMode: "Mode",
  thKonsumsi: "Konsumsi efektif",
  thBiayaEnergi: "Biaya energi ICE → EV (Rp/km)",
  capHemat: "Hemat per kelas (per tahun)",
  thKelas2: "Kelas",
  thEnergi: "Energi",
  thServis: "Servis",
  thPkb: "PKB",
  thCapex: "CAPEX",
  thEmisi: "Emisi turun",
  kelasNote: "Kelas M1 (BeAT) memang lebih mahal dibeli sebagai EV (hemat CAPEX −Rp91 juta); kelas M2 dan M3 menutupinya sehingga total +Rp1,77 miliar. Klaim \"EV lebih murah dibeli\" berlaku pada agregat, bukan pada setiap kelas.",
  capKpiB: "KPI finansial Model B",
  thKpi: "KPI",
  thNilaiKpi: "Nilai",
  kpiNote: "Biaya pelatihan Rp66.848.553 = 350 unit × 1 hari × (UMP DKI Rp5.729.876 ÷ 30 hari). Tarif listrik depot untuk 175 unit berbasis charge Rp1.444,70 per kWh dengan efisiensi charging 90%.",
  s4Label: "04 — Titik kritis",
  s4H: "Seberapa jauh harga harus bergerak sebelum kesimpulan berubah.",
  capKritisA: "Model A (satu kelas)",
  thPertanyaan: "Pertanyaan",
  thJawaban: "Jawaban",
  capKritisB: "Model B (tiga kelas)",
  thKelas3: "Kelas",
  thBatas: "Batas energi setara · net nol",
  kritisNote: "Kelas berbasis charge jauh lebih tahan terhadap kenaikan tarif listrik daripada kelas swap terhadap kenaikan tarif swap. Untuk M1, harga Pertamax saat energi setara swap Rp175 adalah sekitar Rp7.908 per liter.",
  s5Label: "05 — Emisi CO₂ operasional",
  s5H: "Pengurangan yang dapat dipertanggungjawabkan, dan batasnya.",
  s5P: "Untuk bensin kami memakai faktor emisi 2,31 kg CO₂ per liter; untuk listrik, intensitas pembangkitan 0,87 kg CO₂ per kWh dengan efisiensi charging 90%.",
  capCo2: "Reduksi CO₂ (operasional)",
  thModel: "Model",
  thEmisiKm: "Emisi per km",
  thPenurunan: "Penurunan",
  thPerTahun: "Per tahun",
  co2Note: "Ini estimasi operasional, bukan lifecycle assessment. Produksi motor, baterai, daur ulang, dan rantai bahan bakar belum dihitung.",
  s6Label: "06 — Catatan, cakupan, dan kejujuran angka",
  s6H: "Yang dihitung, yang belum, dan apa yang harus divalidasi.",
  scopeLabel: "Cakupan.",
  scopeP: "BCA ini mencakup inisiatif armada listrik (350 unit). Dua inisiatif keberlanjutan lain yang disebut kasus, yaitu kantong pengiriman degradable dan tas transit reusable, dinilai pada sisi karbon dan rencana; sisi biayanya berada di Tantangan 6 agar tidak dihitung dua kali.",
  pilotLabel: "Pilot, bukan penggerak laba utama.",
  pilotP: "Net benefit Rp3,50 miliar setara sekitar 0,0035% biaya logistik Rp99,54 triliun. Nilainya membuktikan unit economics dan risiko swap sebelum berinvestasi besar.",
  heavyLabel: "Armada berat ditunda.",
  heavyP: "Pada grid listrik yang masih intensif karbon, truk listrik diperkirakan sekitar 19% lebih emisif daripada diesel. Angka 19% spesifik belum terkonfirmasi dan tetap berlabel perlu dicek ulang; arahnya didukung literatur pada grid berbasis batubara.",
  scaleLabel: "Syarat penskalaan.",
  scaleP: "Uptime di atas 95%, biaya energi aktual maksimal Rp200 per km, SLA tidak turun, jaringan swap mencakup rute, net benefit aktual minimal 80% model, dan minimal dua vendor swap per kota.",
  quoteA: "Pertanyaan BCA bukan \"apakah EV lebih hemat\", melainkan",
  quoteEm: "\"pada harga pasar mana EV berhenti menguntungkan?\"",
  quoteB: "Karena itu seluruh tarif dan harga diuji pada rentangnya, bukan satu titik.",
  refLabel: "Referensi & catatan kaki",
  refH: "Sumber data pasar.",
  refNote: "Semua nilai benchmark pasar dapat berubah menurut waktu dan vendor. Data kasus: 23 hub, 12.500 motor, sekitar 70% last-mile urban via motor, target lebih dari 200 kendaraan bersih. Asumsi tim diberi label di seluruh dokumen.",
  footBrand: "OMNIGISTIC · ISCEA GLOBAL CASE 2026 · GC LOGISTICS",
  footAnalisis: "Kerangka & Analisis →",
  footModel: "Model Interaktif →",
};

const whitepaperId: WhitepaperContent = {
  navLinks: [
    { href: "#abstract", label: "Abstract" },
    { href: "#pasar", label: "Data Pasar" },
    { href: "#modela", label: "Model A" },
    { href: "#modelb", label: "Model B" },
    { href: "#kritis", label: "Titik Kritis" },
    { href: "#emisi", label: "Emisi" },
    { href: "#catatan", label: "Catatan" },
    { href: "#referensi", label: "Referensi" }
  ],
  meta: [
    { k: "Authors", v: "Tim Analitik Omnigistic" },
    { k: "Horizon", v: "5 tahun · diskonto 10%" },
    { k: "Audience", v: "Juri ISCEA · Manajemen GC" },
    { k: "Last revised", v: "19 Sep 2026" }
  ],
  headline: [
    { k: "Net benefit / tahun", v: "Rp3,50 miliar" },
    { k: "BCR (manfaat ÷ biaya)", v: "3,50×" },
    { k: "NPV @10% · 5 tahun", v: "Rp15,49 miliar" },
    { k: "CO₂ turun / tahun", v: "291,8 ton" }
  ],
  pasar: [
    { item: "Pertamax (rata-rata 38 provinsi)", val: "Rp16.253,95 /L", src: "nasional Rp15.950 sebagai pembanding" },
    { item: "Tarif listrik PLN B-2/TR", val: "Rp1.444,70 /kWh", src: "PLN, Sep 2026" },
    { item: "Honda Scoopy Fashion", val: "Rp23.376.000", src: "Astra Oto Shop" },
    { item: "Smoot Zuzu (swap)", val: "Rp19.900.000", src: "Smoot Store" },
    { item: "Honda BeAT CBS (M1)", val: "Rp19.380.000", src: "pasar Rp18,98–20,38 juta" },
    { item: "Honda Vario Evo 160 (M2)", val: "Rp28.525.000", src: "pasar Rp28,1–29,5 juta" },
    { item: "Honda Genio (M3)", val: "Rp20.500.000", src: "pasar Rp19,73–21,5 juta" },
    { item: "United MX-1200 (M2, EV)", val: "Rp16.800.000", src: "Oto.com" },
    { item: "Polytron Fox-200 (M3, EV)", val: "Rp11.500.000", src: "pasar Rp12,1–12,5 juta" },
    { item: "Tarif swap baterai (M1)", val: "Rp175 /km", src: "pasar Rp200–222 /km" },
    { item: "UMP DKI Jakarta 2026", val: "Rp5.729.876 /bulan", src: "Kepgub DKI 1142/2025" }
  ],
  paramA: [
    ["Unit", "350 (2,8% dari 12.500)", "Pilihan tim"],
    ["Jarak", "80 km per hari, 365 hari", "Asumsi"],
    ["ICE → EV", "Scoopy Fashion → Smoot Zuzu", "Pasar"],
    ["Konsumsi efektif", "44,2985 km/L", "Pabrikan + idle"],
    ["Tarif swap", "Rp175 /km (acuan pasar Rp200)", "Pasar / asumsi"],
    ["Servis ICE / EV", "Rp2,88 juta / Rp1,20 juta per unit per tahun", "Asumsi"]
  ],
  paramB: [
    ["Unit total", "350 (175 + 105 + 70)", "Pilihan tim"],
    ["M1", "175 BeAT CBS → Smoot Zuzu · swap", "Pasar"],
    ["M2", "105 Vario Evo 160 → United MX-1200 · charge", "Pasar"],
    ["M3", "70 Genio → Polytron Fox-200 · charge", "Pasar"],
    ["Energi EV", "swap Rp175/km · charge Rp43,34/km", "Pasar"],
    ["Pajak EV", "PKB 2% per tahun · BBNKB 12,5% sekali · NJKB 65% harga ICE", "Asumsi tim"]
  ],
  chainA: [
    ["Jarak: 350 × 80 × 365", "10.220.000 km"],
    ["Konsumsi efektif: 80 ÷ (80/59,0 + 0,45)", "44,2985 km/L"],
    ["Biaya BBM per km", "Rp366,92"],
    ["Biaya BBM tahunan", "Rp3.749.913.679"],
    ["Biaya swap tahunan: 10.220.000 × 175", "Rp1.788.500.000"],
    ["Hemat energi", "Rp1.961.413.679"],
    ["Hemat servis: 350 × (2,88 − 1,20) juta", "Rp588.000.000"],
    ["Hemat PKB: 350 × Rp15.194.400 × 2%", "Rp106.360.800"],
    ["Net benefit per tahun", "Rp2.655.774.479"],
    ["Hemat harga beli: 350 × Rp3.476.000", "Rp1.216.600.000"],
    ["Hemat BBNKB sekali: ×12,5%", "Rp664.755.000"],
    ["Biaya pelatihan: 350 × (UMP ÷ 30)", "Rp66.848.553"],
    ["Arus kas Tahun-0", "+Rp1.814.506.447"]
  ],
  tcoA: [
    ["Harga beli", "Rp23.376.000", "Rp19.900.000"],
    ["Energi / unit / tahun", "Rp10.714.039", "Rp5.110.000"],
    ["Servis / unit / tahun", "Rp2.880.000", "Rp1.200.000"],
    ["PKB / unit / tahun", "Rp303.888", "Rp0"],
    ["TCO 5 tahun / unit", "Rp94.764.935", "Rp51.450.000"]
  ],
  scenA: [
    ["Rp175 /km (asumsi swap.id, optimistis)", "Rp2.655.774.479", "Rp11.881.981.206"],
    ["Rp200 /km (batas bawah pasar, acuan)", "Rp2.400.274.479", "Rp10.913.435.187"],
    ["Rp222 /km (batas atas pasar)", "Rp2.175.434.479", "Rp10.061.114.689"]
  ],
  kelasB: [
    ["M1", "175", "BeAT CBS → Smoot Zuzu", "swap Rp175/km", "45,19 km/L", "359,68 → 175,00"],
    ["M2", "105", "Vario Evo 160 → United MX-1200", "charge", "37,11 km/L", "437,99 → 43,34"],
    ["M3", "70", "Genio → Polytron Fox-200", "charge", "44,35 km/L", "366,50 → 43,34"]
  ],
  hematB: [
    ["M1", "Rp943.739.611", "Rp294.000.000", "Rp44.089.500", "−Rp91.000.000", "127,8 ton"],
    ["M2", "Rp1.209.934.208", "Rp176.400.000", "Rp38.936.625", "Rp1.231.125.000", "110,8 ton"],
    ["M3", "Rp660.544.990", "Rp117.600.000", "Rp18.655.000", "Rp630.000.000", "53,1 ton"],
    ["Total", "Rp2.814.243.463", "Rp588.000.000", "Rp101.681.125", "Rp1.770.125.000", "291,8 ton"]
  ],
  kpiB: [
    ["Net benefit per tahun", "Rp3.503.924.588"],
    ["Net benefit prudent (cadangan baterai)", "Rp3.267.674.588"],
    ["Arus kas Tahun-0", "+Rp2.207.533.478"],
    ["BCR (manfaat 5 tahun ÷ biaya 5 tahun)", "3,50×"],
    ["ROI 5 tahun", "250,45%"],
    ["NPV @10% · 5 tahun", "Rp15.490.164.448"],
    ["TCO 5 tahun (ICE vs EV)", "Rp33.655.367.522 vs Rp15.109.461.103 (2,227×)"]
  ],
  kritisA: [
    ["Tarif swap saat energi EV = bensin", "Rp366,92 /km (naik 2,10×)"],
    ["Tarif swap saat net operasional nol", "Rp424,45 /km"],
    ["Harga Pertamax saat energi Scoopy = swap Rp175", "Rp7.752 /L"]
  ],
  kritisB: [
    ["M1 (swap): energi setara · net nol", "Rp359,68 /km (2,06×) · Rp417,21 /km"],
    ["M2 (charge): energi setara · net nol", "Rp14.600 /kWh (10,1×) · Rp16.518 /kWh"],
    ["M3 (charge): energi setara · net nol", "Rp12.216 /kWh (8,5×) · Rp14.134 /kWh"]
  ],
  co2: [
    ["Model A (Scoopy ↔ Zuzu)", "0,05215 → 0,02610 kg CO₂/km", "−49,9%", "266,2 ton per tahun"],
    ["Model B (tiga kelas)", "selisih tertimbang armada", "−49,9% per km", "291,8 ton per tahun"]
  ],
  references: [
    { n: 1, t: "Pertamina Patra Niaga / Bloomberg Technoz — harga Pertamax September 2026", u: "https://www.bloombergtechnoz.com/detail-news/120214/harga-pertamax-september-ditahan-keputusan-tepat-atau-nekat" },
    { n: 2, t: "PLN — tarif listrik bisnis B-2/TR Rp1.444,70/kWh", u: "https://www.metrotvnews.com/read/kM6C4n6l-tarif-listrik-lengkap-periode-14-20-september-2026" },
    { n: 3, t: "Astra Oto Shop — harga Honda Scoopy Fashion 2026", u: "https://astraotoshop.com/article/harga-motor-scoopy-2026" },
    { n: 4, t: "Smoot Store — Smoot Zuzu Rp19.900.000", u: "https://store.smoot.id/products/smoot-zuzu" },
    { n: 5, t: "Oto.com — harga Honda BeAT, Vario 160, Genio 2026", u: "https://www.oto.com/motor-baru/honda/beat-esp" },
    { n: 6, t: "Oto.com — United MX 1200 Rp16,8 juta OTR", u: "https://www.oto.com/motor-baru/united/mx-1200/harga" },
    { n: 7, t: "Polytron — Fox 200 Electric OTR", u: "https://polytron.co.id/produk/polytron-fox-200-electric-sepeda-motor-listrik-buy-to-own-otr-jadetabek/" },
    { n: 8, t: "Keputusan Gubernur DKI Jakarta 1142/2025 — UMP 2026 Rp5.729.876", u: "https://jdih.jakarta.go.id/dokumen/detail/14763" },
    { n: 9, t: "IPCC NGGIP — 2006 Guidelines (faktor emisi bensin)", u: "https://www.ipcc-nggip.iges.or.jp/public/2006gl/" },
    { n: 10, t: "Faktor emisi grid PLN ≈ 0,87 kg CO₂/kWh", u: "https://journal.uii.ac.id/JSTL/article/download/46984/19745/165531" }
  ],
  t: whitepaperT_id,
};



export function whitepaperContent(): WhitepaperContent {
  return getLocale() === "id" ? whitepaperId : whitepaperEn;
}

/* ============================== LOGIN ============================== */

export interface LoginContent {
  roles: Array<{ slug: string; name: string; sub: string; initials: string; desc: string; icon: IconName }>;
  t: Record<string, string>;
}

const loginEn: LoginContent = {
  roles: [
    { slug: "PUSAT", name: "Dalila", sub: "HQ Manager", initials: "D", icon: "grid",
      desc: "Financial trend analysis, a Digital Twin for sponsor against direct scenarios, and utilisation of 23 hubs." },
    { slug: "HUB", name: "Marwah", sub: "Bandung Hub Manager", initials: "M", icon: "shield",
      desc: "Hub health against 22 peers. Demand forecast, load-balancer simulation, and early capacity alerts." },
    { slug: "KURIR", name: "Baits", sub: "Jakarta Courier", initials: "B", icon: "compass",
      desc: "Clustered routes, COD risk scores, slot confirmation, and digital payment." },
    { slug: "DATA", name: "Virgiawan", sub: "Data & IT", initials: "V", icon: "map",
      desc: "Address intelligence for 3 ambiguous addresses, complaint monitoring, a multi-modal control tower, and fleet emissions." },
    { slug: "CUSTOMER", name: "Sari", sub: "Buyer", initials: "S", icon: "globe",
      desc: "Shop the Omnigistic store: find products, fill a cart, check out with COD, then track the delivery." },
    { slug: "SELLER", name: "Rina", sub: "Seller", initials: "R", icon: "currency",
      desc: "Seller dashboard: profit and margin analytics per product, incoming orders, and customer scores." }
  ],
  t: {
    title: "Enter Portal · Omnigistic",
    heroA: "Figures that do not",
    heroEm: "shout",
    sixPortals: "Six portals",
    signIn: "Sign in",
    chooseA: "Choose",
    chooseEm: "your",
    chooseB: "portal",
    intro: "No account needed; choose a portal for a live preview. GC Logistics case data, answered through Nigi AI.",
    backHome: "← Back to the main page",
    brand: "ISCEA 2026"
  }
};

const loginT_id: Record<string, string> = {
  title: "Masuk Portal · Omnigistic",
  heroA: "Angka yang tidak",
  heroEm: "berteriak",
  sixPortals: "Enam portal",
  signIn: "Masuk",
  chooseA: "Pilih",
  chooseEm: "portal",
  chooseB: "Anda",
  intro: "Tidak perlu akun, pilih portal untuk pratinjau langsung. Data studi kasus GC Logistics, dijawab lewat Nigi AI.",
  backHome: "← Kembali ke halaman utama",
  brand: "ISCEA 2026"
};
const loginId: LoginContent = {
  roles: [
  {
  slug: "PUSAT", name: "Dalila", sub: "Manajer Pusat", initials: "D",
  desc: "Analisa tren finansial, Digital Twin untuk skenario sponsor vs langsung, utilisasi 23 hub.",
  icon: "grid"
  },
  {
  slug: "HUB", name: "Marwah", sub: "Manajer Hub Bandung", initials: "M",
  desc: "Kesehatan hub sendiri vs peer 22 hub. Forecast demand, simulasi load balancer, kapasitas dini.",
  icon: "shield"
  },
  {
  slug: "KURIR", name: "Baits", sub: "Kurir Jakarta", initials: "B",
  desc: "Rute terkluster, skor COD risk, slot confirmation, pembayaran digital.",
  icon: "compass"
  },
  {
  slug: "DATA", name: "Virgiawan", sub: "Data & IT", initials: "V",
  desc: "Address intelligence 3 alamat ambigu, monitoring komplain, control tower multimoda, emisi armada.",
  icon: "map"
  },
  {
  slug: "CUSTOMER", name: "Sari", sub: "Pembeli", initials: "S",
  desc: "Belanja di e-commerce Omnigistic: cari produk, keranjang, checkout COD, lalu lacak pengantaran.",
  icon: "globe"
  },
  {
  slug: "SELLER", name: "Rina", sub: "Penjual", initials: "R",
  desc: "Dashboard penjual: analitik laba/rugi & margin produk, pesanan masuk, dan skor pelanggan.",
  icon: "currency"
  }
  ],
  t: loginT_id
};

export function loginContent(): LoginContent {
  return getLocale() === "id" ? loginId : loginEn;
}
