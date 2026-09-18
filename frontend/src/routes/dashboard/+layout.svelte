<script lang="ts">
  import { page } from "$app/state";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { windowClass, type M3Window } from "$lib/stores/window-class";
  import { roleFromPath, roleFromValue, setRoleCookie, type Role } from "$lib/stores/role";
  import { sidebarStore } from "$lib/stores/sidebar";
  import { cn, resolveHref } from "$lib/utils";
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
    dashboard: "Hub Dashboard", forecast: "Demand Forecast", "load-balance": "Load Balancing",
    capacity: "Capacity Alert", surge: "Peak-Surge Test", routes: "Route Clustering", "cod-risk": "Predictive COD",
    "cod-intel": "COD Decision Intelligence", "cod-cash": "COD Cash-Reconciliation Risk",
    slot: "Slot Confirmation", payment: "Digital Payment", pudo: "PUDO Network",
    address: "Address Intelligence", complaint: "Complaint Monitor", multimodal: "Control Tower",
    fleet: "Fleet & Emissions", "ev-sites": "EV Site Selection", methodology: "Methodology",
    academy: "Nigi Academy", kpi: "KPI Tracker", assistant: "Nigi AI", "": "Dashboard",
    tasks: "Tugas Pengantaran",
    shop: "Belanja", orders: "Pesanan Saya", checkout: "Checkout", cart: "Keranjang",
    analytics: "Analitik Penjualan", products: "Produk Saya", customers: "Analisis Pelanggan", "seller-orders": "Pesanan Masuk",
    "predictive-cod": "Predictive COD"
  };
  const seg3 = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    return parts.length <= 1 ? (parts[0] ?? "") : parts[parts.length - 1];
  };

  // Predictive COD = visibilitas internal. Pembeli (CUSTOMER) TIDAK melihat skor
  // prediktif pelanggan, jadi item ini disembunyikan untuk role CUSTOMER.
  const sharedNavFor = (r: Role | null): NavItem[] => {
    const base: NavItem[] = [
      { label: "Kerangka & Analisis", href: "/analisis", icon: "book" },
      { label: "Whitepaper", href: "/whitepaper", icon: "book" },
      { label: "Methodology", href: "/dashboard/methodology", icon: "book" },
      { label: "KPI Tracker", href: "/dashboard/kpi", icon: "chart" },
      { label: "Nigi Academy", href: "/dashboard/academy", icon: "grad" }
    ];
    if (r && r !== "CUSTOMER") base.push({ label: "Predictive COD", href: "/dashboard/predictive-cod", icon: "shield" });
    return base;
  };

  const roleNav: Record<Role, NavItem[]> = {
    PUSAT: [
      { label: "Overview", href: "/dashboard/pusat/overview", icon: "circle" },
      { label: "Executive Dashboard", href: "/dashboard/pusat/executive", icon: "grid" },
      { label: "Digital Twin", href: "/dashboard/pusat/digital-twin", icon: "compass" },
      { label: "Utilization Map", href: "/dashboard/pusat/utilization", icon: "chart" },
      { label: "Network Expansion", href: "/dashboard/pusat/network", icon: "stack" },
      { label: "Market Expansion ROI", href: "/dashboard/pusat/expansion", icon: "target" },
      { label: "EV Fleet BCA", href: "/dashboard/pusat/ev-bca", icon: "chart" },
      { label: "ROI & BCA", href: "/dashboard/pusat/roi", icon: "currency" },
      { label: "Cost-Waterfall P&L", href: "/dashboard/pusat/pnl", icon: "coins" },
      { label: "Nigi AI", href: "/dashboard/pusat/assistant", icon: "chat" },
    ],
    HUB: [
      { label: "Overview", href: "/dashboard/hub/overview", icon: "circle" },
      { label: "Hub Dashboard", href: "/dashboard/hub/dashboard", icon: "globe" },
      { label: "Demand Forecast", href: "/dashboard/hub/forecast", icon: "chart" },
      { label: "Load Balancing", href: "/dashboard/hub/load-balance", icon: "compass" },
      { label: "Capacity Alert", href: "/dashboard/hub/capacity", icon: "bell" },
      { label: "Peak-Surge Test", href: "/dashboard/hub/surge", icon: "activity" },
      { label: "Nigi AI", href: "/dashboard/hub/assistant", icon: "chat" },
    ],
    KURIR: [
      { label: "Overview", href: "/dashboard/kurir/overview", icon: "circle" },
      { label: "Tugas Pengantaran", href: "/dashboard/kurir/tasks", icon: "map" },
      { label: "Route Clustering", href: "/dashboard/kurir/routes", icon: "compass" },
      { label: "Predictive COD", href: "/dashboard/kurir/cod-risk", icon: "currency" },
      { label: "COD Intelligence", href: "/dashboard/kurir/cod-intel", icon: "trend" },
      { label: "COD Cash Risk", href: "/dashboard/kurir/cod-cash", icon: "wallet" },
      { label: "Slot Confirmation", href: "/dashboard/kurir/slot", icon: "bell" },
      { label: "Digital Payment", href: "/dashboard/kurir/payment", icon: "shield" },
      { label: "PUDO Network", href: "/dashboard/kurir/pudo", icon: "map" },
      { label: "Nigi AI", href: "/dashboard/kurir/assistant", icon: "chat" },
    ],
    DATA: [
      { label: "Overview", href: "/dashboard/data/overview", icon: "circle" },
      { label: "Address Intelligence", href: "/dashboard/data/address", icon: "map" },
      { label: "Complaint Monitor", href: "/dashboard/data/complaint", icon: "users" },
      { label: "Control Tower", href: "/dashboard/data/multimodal", icon: "compass" },
      { label: "Fleet & Emissions", href: "/dashboard/data/fleet", icon: "stack" },
      { label: "EV Site Selection", href: "/dashboard/data/ev-sites", icon: "grad" },
      { label: "Nigi AI", href: "/dashboard/data/assistant", icon: "chat" },
    ],
    CUSTOMER: [
      { label: "Dashboard", href: "/dashboard/customer/dashboard", icon: "chart", short: "Dashboard" },
      { label: "Belanja", href: "/dashboard/customer/overview", icon: "grid", short: "Belanja" },
      { label: "Keranjang", href: "/dashboard/customer/cart", icon: "stack", short: "Keranjang" },
      { label: "Pesanan Saya", href: "/dashboard/customer/orders", icon: "map", short: "Pesanan" },
      { label: "Nigi AI", href: "/dashboard/customer/assistant", icon: "chat", short: "Nigi AI" }
    ],
    SELLER: [
      { label: "Analitik", href: "/dashboard/seller/overview", icon: "chart", short: "Analitik" },
      { label: "Produk Saya", href: "/dashboard/seller/products", icon: "stack", short: "Produk" },
      { label: "Pelanggan", href: "/dashboard/seller/customers", icon: "users", short: "Pelanggan" },
      { label: "Pesanan Masuk", href: "/dashboard/seller/orders", icon: "globe", short: "Pesanan" },
      { label: "Nigi AI", href: "/dashboard/seller/assistant", icon: "chat", short: "Nigi AI" }
    ]
  };

  const userNameFor: Record<string, string> = {
    PUSAT: "Dalila · Pusat",
    HUB: "Marwah · Hub Bandung",
    KURIR: "Baits · Kurir Jakarta",
    DATA: "Virgiawan · Data & IT",
    CUSTOMER: "Sari · Pembeli",
    SELLER: "Rina · Penjual"
  };

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
    r ? roleNav[r]?.find((i) => i.href.endsWith(`/${seg}`))?.label : undefined;

  let routeLabel = $derived.by(() => {
    const seg = seg3(pathname);
    return navLabelFor(role, seg) ?? titleMap[seg] ?? "Omnigistic";
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
  const roleQuestion: Record<Role, string> = { PUSAT: "1 dan 5", HUB: "2", KURIR: "3", DATA: "6", CUSTOMER: "3", SELLER: "5 dan 6" };
  const questionLabel = $derived.by(() => {
    const seg = seg3(pathname);
    if (seg === "overview") return role ? `Menjawab pertanyaan #${roleQuestion[role as Role]}` : undefined;
    const q = questionMap[seg];
    return q ? `Menjawab pertanyaan #${q}` : undefined;
  });

  const navItems = $derived(role ? roleNav[role] : []);
  const userLabel = $derived(role && userNameFor[role] ? userNameFor[role] : "Guest");
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
    <M3Nav items={navItems} sharedItems={sharedNavFor(role)} userName={userLabel} open={sidebarOpen} ontoggle={() => sidebarStore.toggleDesktop()} />
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
