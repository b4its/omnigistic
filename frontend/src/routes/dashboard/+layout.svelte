<script lang="ts">
  import { page } from "$app/state";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import { windowClass, type M3Window } from "$lib/stores/window-class";
  import { roleStore, roleFromPath, type Role } from "$lib/stores/role";
  import { cn } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import M3Nav, { type NavItem } from "$lib/components/M3Nav.svelte";
  import Topbar from "$lib/components/Topbar.svelte";
  import NigiAI from "$lib/components/NigiAI.svelte";
  import WidgetDrawer from "$lib/components/WidgetDrawer.svelte";
  import ToastStack from "$lib/components/ToastStack.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { probeBackend, online } from "$lib/api";

  interface Props {
    children: import("svelte").Snippet;
    data?: { cookieRole?: string | null };
  }
  let { children, data }: Props & { data?: { cookieRole?: string | null } } = $props();


  const titleMap: Record<string, string> = {
    overview: "Portal", executive: "Executive Dashboard", "digital-twin": "Digital Twin",
    utilization: "Utilization Map", network: "Network Expansion", roi: "ROI & Benefit-Cost",
    dashboard: "Hub Dashboard", forecast: "Demand Forecast", "load-balance": "Load Balancing",
    capacity: "Capacity Alert", routes: "Route Clustering", "cod-risk": "Predictive COD",
    slot: "Slot Confirmation", payment: "Digital Payment", pudo: "PUDO Network",
    address: "Address Intelligence", complaint: "Complaint Monitor", multimodal: "Control Tower",
    fleet: "Fleet & Emissions", "ev-sites": "EV Site Selection", methodology: "Methodology",
    academy: "GC Academy", kpi: "KPI Tracker", assistant: "Nigi AI", "": "Dashboard"
  };
  const seg3 = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    return parts.length <= 1 ? (parts[0] ?? "") : parts[parts.length - 1];
  };

  const sharedNav: NavItem[] = [
    { label: "Kerangka & Analisis", href: "/analisis", icon: "book" },
    { label: "Methodology", href: "/dashboard/methodology", icon: "book" },
    { label: "KPI Tracker", href: "/dashboard/kpi", icon: "chart" },
    { label: "GC Academy", href: "/dashboard/academy", icon: "grad" }
  ];

  const roleNav: Record<Role, NavItem[]> = {
    PUSAT: [
      { label: "Nigi AI", href: "/dashboard/pusat/assistant", icon: "chat" },
      { label: "Overview", href: "/dashboard/pusat/overview", icon: "circle" },
      { label: "Executive Dashboard", href: "/dashboard/pusat/executive", icon: "grid" },
      { label: "Digital Twin", href: "/dashboard/pusat/digital-twin", icon: "compass" },
      { label: "Utilization Map", href: "/dashboard/pusat/utilization", icon: "chart" },
      { label: "Network Expansion", href: "/dashboard/pusat/network", icon: "stack" },
      { label: "ROI & BCA", href: "/dashboard/pusat/roi", icon: "currency" }
    ],
    HUB: [
      { label: "Nigi AI", href: "/dashboard/hub/assistant", icon: "chat" },
      { label: "Overview", href: "/dashboard/hub/overview", icon: "circle" },
      { label: "Hub Dashboard", href: "/dashboard/hub/dashboard", icon: "globe" },
      { label: "Demand Forecast", href: "/dashboard/hub/forecast", icon: "chart" },
      { label: "Load Balancing", href: "/dashboard/hub/load-balance", icon: "compass" },
      { label: "Capacity Alert", href: "/dashboard/hub/capacity", icon: "bell" }
    ],
    KURIR: [
      { label: "Nigi AI", href: "/dashboard/kurir/assistant", icon: "chat" },
      { label: "Overview", href: "/dashboard/kurir/overview", icon: "circle" },
      { label: "Route Clustering", href: "/dashboard/kurir/routes", icon: "compass" },
      { label: "Predictive COD", href: "/dashboard/kurir/cod-risk", icon: "currency" },
      { label: "Slot Confirmation", href: "/dashboard/kurir/slot", icon: "bell" },
      { label: "Digital Payment", href: "/dashboard/kurir/payment", icon: "shield" },
      { label: "PUDO Network", href: "/dashboard/kurir/pudo", icon: "map" }
    ],
    DATA: [
      { label: "Nigi AI", href: "/dashboard/data/assistant", icon: "chat" },
      { label: "Overview", href: "/dashboard/data/overview", icon: "circle" },
      { label: "Address Intelligence", href: "/dashboard/data/address", icon: "map" },
      { label: "Complaint Monitor", href: "/dashboard/data/complaint", icon: "users" },
      { label: "Control Tower", href: "/dashboard/data/multimodal", icon: "compass" },
      { label: "Fleet & Emissions", href: "/dashboard/data/fleet", icon: "stack" },
      { label: "EV Site Selection", href: "/dashboard/data/ev-sites", icon: "grad" }
    ]
  };

  const roleShort: Record<string, string> = { PUSAT: "PUSAT", HUB: "HUB", KURIR: "KURIR", DATA: "DATA" };
  const userNameFor: Record<string, string> = {
    PUSAT: "Dalila · Pusat",
    HUB: "Marwah · Hub Bandung",
    KURIR: "Baits · Kurir Jakarta",
    DATA: "Virgiawan · Data & IT"
  };

  // role DERIVED dari path+cookie → SSR pertama kali render sudah pasangkan shell (CLS 0), tanpa onMount
  const pathname = $derived(String(page.url.pathname));
  let role = $derived<Role | null>(roleFromPath(pathname) ?? (roleShort[(data?.cookieRole ?? "").toUpperCase() || ""] ? ((data?.cookieRole ?? "").toUpperCase() as Role) : null));
  let reduceMotion = $derived(typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let mode = $state<M3Window>("expanded");

  onMount(() => {
    windowClass.init();
    void probeBackend();
    const unsubWc = windowClass.subscribe((w) => (mode = w));
    return () => unsubWc();
  });

  $effect(() => {
    const r = roleFromPath(pathname);
    if (r) roleStore.set(r);
  });
  let routeLabel = $derived(titleMap[seg3(pathname)] ?? "Omnigistic");

  const questionMap: Record<string, string> = {
    "digital-twin": "1", network: "1", utilization: "1",
    forecast: "2", "load-balance": "2", capacity: "2",
    "cod-risk": "3", routes: "3", slot: "3", payment: "3", pudo: "3",
    address: "6", complaint: "6", multimodal: "6",
    fleet: "4", "ev-sites": "4", roi: "4",
    executive: "5"
  };
  const roleQuestion: Record<Role, string> = { PUSAT: "1 dan 5", HUB: "2", KURIR: "3", DATA: "6" };
  const questionLabel = $derived.by(() => {
    const seg = seg3(pathname);
    if (seg === "overview") return role ? `Menjawab pertanyaan #${roleQuestion[role as Role]}` : undefined;
    const q = questionMap[seg];
    return q ? `Menjawab pertanyaan #${q}` : undefined;
  });

  const isRole = $derived(!!role && !!roleShort[role]);

  const navItems = $derived(isRole ? roleNav[role as Role] : []);
  const userLabel = $derived(role && userNameFor[role] ? userNameFor[role] : "Guest");
</script>

<svelte:head>
  <title>{routeLabel} · Omnigistic</title>
</svelte:head>

<div class="flex h-dvh w-full overflow-hidden bg-background">
  <a
    href="#omnigistic-main"
    class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[200] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
    >Lewati ke konten</a
  >
  {#if role}
    <M3Nav items={navItems} sharedItems={sharedNav} userName={userLabel} />
  {/if}

  <div class="flex min-w-0 flex-1 flex-col">
    {#if role}
      <Topbar role={role} />
    {:else}
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-6">
        <div class="flex items-center gap-3">
          <a href="/dashboard" aria-label="Kembali ke dashboard peran" class="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"><Icon name="arrow-left" cls="h-4 w-4" /></a>
          <span class="text-sm font-semibold text-foreground">Omnigistic</span>
        </div>
        <ThemeToggle />
      </header>
    {/if}

    <main id="omnigistic-main" class="overscroll-isolate min-h-0 flex-1 overflow-y-auto">
      {#key pathname}
      <div
        transition:fade={{ duration: reduceMotion ? 0 : 120 }}
        class={cn(
          "mx-auto py-6",
          mode === "compact" && "max-w-[600px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]",
          mode === "medium" && "w-full px-6",
          mode === "expanded" && "w-full max-w-[1920px] px-8"
        )}
      >
        {#if questionLabel}
          <p class="mb-4 inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[13.5px] font-semibold uppercase tracking-wider text-accent-foreground">{questionLabel}</p>
        {/if}
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