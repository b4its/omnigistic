<script lang="ts">
  import { page } from "$app/state";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { windowClass, type M3Window } from "$lib/stores/window-class";
  import { roleFromPath, roleFromValue, setRoleCookie, type Role } from "$lib/stores/role";
  import { sidebarStore } from "$lib/stores/sidebar";
  import { cn, resolveHref } from "$lib/utils";
  import { m } from "$lib/paraglide/messages";
  import Icon from "$lib/components/Icon.svelte";
  import M3Nav, { type NavItem } from "$lib/components/M3Nav.svelte";
  import Topbar from "$lib/components/Topbar.svelte";
  import NigiAI from "$lib/components/NigiAI.svelte";
  import WidgetDrawer from "$lib/components/WidgetDrawer.svelte";
  import WidgetStrip from "$lib/components/WidgetStrip.svelte";
  import ToastStack from "$lib/components/ToastStack.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { probeBackend } from "$lib/api";

  interface Props {
    children: import("svelte").Snippet;
    data?: { cookieRole?: string | null };
  }
  let { children, data }: Props & { data?: { cookieRole?: string | null } } = $props();


  const titleMap: Record<string, string> = {
    overview: "Portal", executive: "Executive Dashboard", "digital-twin": "Digital Twin",
    utilization: "Utilization Map", network: "Network Expansion", expansion: "Market-Expansion ROI", roi: "ROI & Benefit-Cost", pnl: "Cost-Waterfall & P&L", "ev-bca": "EV Fleet BCA",
    dashboard: m.ly2t1(), forecast: "Demand Forecast", "load-balance": "Load Balancing",
    capacity: "Capacity Alert", surge: "Peak-Surge Test", routes: "Route Clustering", "cod-risk": "Predictive COD",
    "cod-intel": "COD Decision Intelligence", "cod-cash": "COD Cash-Reconciliation Risk",
    slot: m.ly2t2(), payment: "Digital Payment", pudo: "PUDO Network",
    address: "Address Intelligence", complaint: "Complaint Monitor", multimodal: "Control Tower",
    fleet: "Fleet & Emissions", "ev-sites": "EV Site Selection", methodology: "Methodology",
    kpi: "KPI Tracker", assistant: "Nigi AI", "": "Dashboard",
    "predictive-cod": "Predictive COD"
  };

  // Judul yang bergantung bahasa: dipanggil saat render (bukan level modul) supaya
  // locale yang benar dipakai per permintaan.
  const titleIdFor = (seg: string): string | undefined =>
    ({
      tasks: m.nav_tasks(),
      shop: m.nav_shop(),
      orders: m.nav_orders(),
      cart: m.nav_cart(),
      analytics: m.title_analytics(),
      products: m.nav_products(),
      customers: m.title_customers(),
      "seller-orders": m.nav_incoming_orders()
    })[seg];
  const seg3 = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    return parts.length <= 1 ? (parts[0] ?? "") : parts[parts.length - 1];
  };

  // Shared = artefak lintas-role (bukan milik satu role). Beranda role tetap
  // terjangkau lewat brand sidebar (logo = home) dan hub Overview.
  const sharedNavFor = (): NavItem[] => [
    { label: m.nav_framework(), href: "/analisis", icon: "book" },
    { label: "Whitepaper", href: "/whitepaper", icon: "book" },
    { label: "Methodology", href: "/dashboard/methodology", icon: "book" },
    { label: "KPI Tracker", href: "/dashboard/kpi", icon: "chart" }
  ];

  // Maks 5 destinasi per role (M3: 3-7). Nigi AI SELALU terakhir supaya di
  // bottom bar mobile (4 item pertama + "Lainnya") yang tampil adalah 4 halaman
  // inti role, bukan asisten.
  // Fungsi (bukan konstanta level modul) agar label diterjemahkan saat render.
  const roleNavFor = (r: Role): NavItem[] => {
    const nav: Record<Role, NavItem[]> = {
    PUSAT: [
      { label: "Digital Twin", href: "/dashboard/pusat/digital-twin", icon: "compass" },
      { label: "Market-Expansion ROI", href: "/dashboard/pusat/expansion", icon: "target" },
      { label: "EV Fleet BCA", href: "/dashboard/pusat/ev-bca", icon: "chart" },
      { label: "Cost-Waterfall P&L", href: "/dashboard/pusat/pnl", icon: "coins" },
      { label: "Nigi AI", href: "/dashboard/pusat/assistant", icon: "chat", fa: "glitter" },
    ],
    HUB: [
      { label: "Demand Forecast", href: "/dashboard/hub/forecast", icon: "chart" },
      { label: "Load Balancing", href: "/dashboard/hub/load-balance", icon: "compass" },
      { label: "Capacity Alert", href: "/dashboard/hub/capacity", icon: "bell" },
      { label: "Peak-Surge Test", href: "/dashboard/hub/surge", icon: "activity" },
      { label: "Nigi AI", href: "/dashboard/hub/assistant", icon: "chat", fa: "glitter" },
    ],
    KURIR: [
      { label: m.nav_tasks(), href: "/dashboard/kurir/tasks", icon: "map" },
      { label: "Predictive COD", href: "/dashboard/kurir/cod-risk", icon: "currency" },
      { label: "COD Intelligence", href: "/dashboard/kurir/cod-intel", icon: "trend" },
      { label: m.nav_buyer_cod_score(), href: "/dashboard/predictive-cod", icon: "users" },
      { label: "Nigi AI", href: "/dashboard/kurir/assistant", icon: "chat", fa: "glitter" },
    ],
    DATA: [
      { label: "Address Intelligence", href: "/dashboard/data/address", icon: "map" },
      { label: "Control Tower", href: "/dashboard/data/multimodal", icon: "compass" },
      { label: "Complaint Monitor", href: "/dashboard/data/complaint", icon: "users" },
      { label: "Fleet & Emissions", href: "/dashboard/data/fleet", icon: "stack" },
      { label: "Nigi AI", href: "/dashboard/data/assistant", icon: "chat", fa: "glitter" },
    ],
    CUSTOMER: [
      { label: "Dashboard", href: "/dashboard/customer/dashboard", icon: "chart", short: "Dashboard" },
      { label: m.nav_shop(), href: "/dashboard/customer/overview", icon: "grid", short: m.nav_shop() },
      { label: m.nav_cart(), href: "/dashboard/customer/cart", icon: "stack", short: m.nav_cart() },
      { label: m.nav_orders(), href: "/dashboard/customer/orders", icon: "map", short: m.nav_orders_short() },
      { label: "Nigi AI", href: "/dashboard/customer/assistant", icon: "chat", short: "Nigi AI", fa: "glitter" }
    ],
    SELLER: [
      { label: m.nav_analytics(), href: "/dashboard/seller/overview", icon: "chart", short: m.nav_analytics() },
      { label: m.nav_products(), href: "/dashboard/seller/products", icon: "stack", short: m.nav_products_short() },
      { label: m.nav_customers(), href: "/dashboard/seller/customers", icon: "users", short: m.nav_customers() },
      { label: m.nav_incoming_orders(), href: "/dashboard/seller/orders", icon: "globe", short: m.nav_incoming_orders_short() },
      { label: "Nigi AI", href: "/dashboard/seller/assistant", icon: "chat", short: "Nigi AI", fa: "glitter" }
    ]
    };
    return nav[r];
  };

  const userNameFor = (r: Role): string =>
    ({
      PUSAT: m.user_pusat(),
      HUB: m.user_hub(),
      KURIR: m.user_kurir(),
      DATA: m.user_data(),
      CUSTOMER: m.user_customer(),
      SELLER: m.user_seller()
    })[r] ?? m.title_guest();

  // role DERIVED dari path+cookie → SSR pertama kali render sudah pasangkan shell (CLS 0), tanpa onMount
  const pathname = $derived(String(page.url.pathname));
  let role = $derived<Role | null>(roleFromPath(pathname) ?? roleFromValue(data?.cookieRole));
  let reduceMotion = $derived(typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let mode = $state<M3Window>("expanded");
  let sidebarOpen = $state(true);

  onMount(() => {
    windowClass.init();
    sidebarStore.restore();
    void probeBackend();
    const unsubWc = windowClass.subscribe((w) => (mode = w));
    const unsubSb = sidebarStore.subscribe((s) => (sidebarOpen = s.desktopOpen));
    return () => {
      unsubWc();
      unsubSb();
    };
  });

  $effect(() => {
    const r = roleFromPath(pathname);
    if (r) setRoleCookie(r);
  });
  // Judul halaman: utamakan label nav role (mis. "Belanja" utk customer overview,
  // "Dashboard" utk customer dashboard), lalu titleMap global.
  const navLabelFor = (r: Role | null, seg: string): string | undefined =>
    r ? roleNavFor(r).find((i) => i.href.endsWith(`/${seg}`))?.label : undefined;

  let routeLabel = $derived.by(() => {
    const seg = seg3(pathname);
    return navLabelFor(role, seg) ?? titleIdFor(seg) ?? titleMap[seg] ?? "Omnigistic";
  });

  const questionMap: Record<string, string> = {
    "digital-twin": "1", network: "1", utilization: "1",
    forecast: "2", "load-balance": "2", capacity: "2", surge: "2",
    "cod-risk": "3", "cod-cash": "3", routes: "3", slot: "3", payment: "3", pudo: "3", tasks: "3",
    address: "6", complaint: "6", multimodal: "6",
    fleet: "4", "ev-sites": "4", roi: "4", "ev-bca": "4",
    executive: "5", expansion: "5", pnl: "6",
    shop: "3", cart: "3", checkout: "3", orders: "3",
    analytics: "5", products: "5", customers: "6", "seller-orders": "3"
  };
  const roleQuestionFor = (r: Role): string =>
    ({ PUSAT: m.q_pair_15(), HUB: m.q_pair_2(), KURIR: m.q_pair_3(), DATA: m.q_pair_6(), CUSTOMER: m.q_pair_3(), SELLER: m.q_pair_56() })[r];
  const questionLabel = $derived.by(() => {
    const seg = seg3(pathname);
    if (seg === "overview") return role ? m.q_answers({ n: roleQuestionFor(role) }) : undefined;
    const q = questionMap[seg];
    return q ? m.q_answers({ n: q }) : undefined;
  });

  const navItems = $derived(role ? roleNavFor(role) : []);
  const userLabel = $derived(role ? userNameFor(role) : m.title_guest());
</script>

<svelte:head>
  <title>{routeLabel} · Omnigistic</title>
</svelte:head>

<div class="relative flex h-dvh w-full overflow-hidden bg-background">
  <!-- Tekstur editorial: grid halus + ambient glow mint (global, 1 layer) -->
  <div class="pointer-events-none absolute inset-0 z-0 bg-grid-sm opacity-[0.5] dark:opacity-100" aria-hidden="true"></div>
  <div class="pointer-events-none absolute -right-40 -top-48 z-0 hidden h-[42rem] w-[42rem] rounded-full ambient-glow md:block" aria-hidden="true"></div>
  <a
    href="#omnigistic-main"
    class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[200] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
    >Lewati ke konten</a
  >
  {#if role}
    <M3Nav items={navItems} sharedItems={sharedNavFor()} userName={userLabel} homeHref={`/dashboard/${role.toLowerCase()}/overview`} open={sidebarOpen} ontoggle={() => sidebarStore.toggleDesktop()} />
  {/if}

  <div class="relative z-10 flex min-w-0 flex-1 flex-col">
    {#if role}
      <Topbar role={role} onmenutoggle={() => sidebarStore.toggleDesktop()} sidenavOpen={sidebarOpen} sidenavVisible={mode !== "compact"} />
    {:else}
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-6">
        <div class="flex items-center gap-3">
          <a href={resolveHref("/dashboard")} aria-label="Kembali ke dashboard peran" class="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"><Icon name="arrow-left" cls="h-4 w-4" /></a>
          <span class="text-sm font-semibold text-foreground">Omnigistic</span>
        </div>
        <ThemeToggle />
      </header>
    {/if}

    <main id="omnigistic-main" class="overscroll-isolate min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      {#key pathname}
      <div
        transition:fade={{ duration: reduceMotion ? 0 : 120 }}
        class={cn(
          "mx-auto w-full min-w-0 py-6",
          mode === "compact" && "max-w-[600px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]",
          mode === "medium" && "max-w-[1100px] px-4 sm:px-6",
          mode === "expanded" && "max-w-[1920px] px-4 sm:px-6 lg:px-8"
        )}
      >
        {#if questionLabel}
          <p class="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--bitcoin)_35%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_10%,transparent)] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--bitcoin)]"><span class="inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)]"></span>{questionLabel}</p>
        {/if}
        <WidgetStrip />
        {@render children()}
      </div>
      {/key}
    </main>
  </div>

  {#if role}
    {#key role}
      <NigiAI role={role} />
    {/key}
  {/if}
  <WidgetDrawer />
  <ToastStack />
</div>
