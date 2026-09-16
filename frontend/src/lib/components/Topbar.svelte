<script lang="ts">
  import { onMount } from "svelte";
  import type { Role } from "$lib/stores/role";
  import { resolveHref } from "$lib/utils";
  import { api, online, type Hub } from "$lib/api";
  import { shop, type Order } from "$lib/stores/shop";
  import { pnlSummary } from "$lib/shop/analytics";
  import { liveSummary } from "$lib/shop/orderbook";
  import ThemeToggle from "./ThemeToggle.svelte";
  import Icon from "./Icon.svelte";

  let { role = "PUSAT", onmenutoggle, sidenavOpen = true, sidenavVisible = true }: {
    role?: Role | string;
    /** Callback tombol hamburger (buka/tutup sidebar). */
    onmenutoggle?: () => void;
    /** Apakah sidebar sedang terbuka (untuk aria-expanded). */
    sidenavOpen?: boolean;
    /** Apakah sidebar memang ada di layar ini (compact = bar bawah, jadi tombol disembunyikan). */
    sidenavVisible?: boolean;
  } = $props();

  const roleMeta: Record<string, { name: string; sub: string; letter: string }> = {
    PUSAT: { name: "Dalila", sub: "Manajer Pusat", letter: "D" },
    HUB: { name: "Marwah", sub: "Manajer Hub Bandung", letter: "M" },
    KURIR: { name: "Baits", sub: "Kurir Jakarta", letter: "B" },
    DATA: { name: "Virgiawan", sub: "Data & IT", letter: "V" },
    CUSTOMER: { name: "Sari", sub: "Pembeli", letter: "S" },
    SELLER: { name: "Rina", sub: "Penjual", letter: "R" }
  };
  const roleRoutes: Record<string, string> = {
    PUSAT: "/dashboard/pusat/overview",
    HUB: "/dashboard/hub/overview",
    KURIR: "/dashboard/kurir/overview",
    DATA: "/dashboard/data/overview",
    CUSTOMER: "/dashboard/customer/overview",
    SELLER: "/dashboard/seller/overview"
  };

  const meta = $derived(roleMeta[role] ?? { name: "Guest", sub: "", letter: "G" });

  // Semua angka = dataset kasus ISCEA (2023, 12 titik). Filter rentang waktu
  // TIDAK bermakna di sini, jadi ditampilkan sebagai label periode yang jujur
  // (bukan dropdown yang tak mengubah apa pun).
  const PERIOD_LABEL = "Data kasus 2023";
  let openPop = $state<null | "notif" | "profile">(null);

  // Notifikasi statis per role (klaim umum, tanpa angka yang bisa bertentangan).
  const staticNotifs: Record<string, string[]> = {
    PUSAT: ["Hub Jakarta utilisasi 90,4%, di atas ambang 65%.", "2 paket COD berisiko tinggi di rute Bandung.", "EBIT positif 2024 — fokus jaga cost-to-sales."],
    HUB: ["Utilisasi Bandung 68,9% di atas ambang.", "Forecast: demand naik pada puncak promo.", "Buffer musiman siap diaktivasi."],
    KURIR: ["3 paket COD perlu diarahkan ke PUDO.", "Slot konfirmasi: penerima sudah siap.", "Rute COD terpangkas dengan cluster terpisah."],
    DATA: ["3 alamat ambigu baru perlu verifikasi.", "Geotag checkout mendorong alamat presisi.", "Pipeline ETA partner multimoda tersambung."],
    GUEST: ["Selamat datang — pilih portal peran."]
  };

  // Notifikasi live dari store (pesanan nyata) → tidak bertentangan dgn data turunan.
  let liveOrders = $state<Order[]>([]);
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s: { orders: Order[] }) => (liveOrders = s.orders));
    return unsub;
  });

  const liveNotifs = $derived.by<string[]>(() => {
    if (role === "CUSTOMER") {
      const active = liveOrders.filter((o) => o.status !== "terkirim");
      if (active.length === 0) return ["Belanja dulu — pesanan & pelacakan muncul di sini.", "Bayar COD bila reputasi akunmu baik.", "Lacak kurir realtime di Dashboard."];
      return [
        `Kamu punya ${active.length} pesanan aktif yang sedang diproses.`,
        `Pesanan terbaru: ${active[0].address.recipient} · ${active[0].address.city}.`,
        "Buka Dashboard untuk melacak kurir menuju alamatmu."
      ];
    }
    if (role === "SELLER") {
      const live = liveSummary(liveOrders);
      const pnl = pnlSummary();
      const list = [`Margin kotor (katalog): ${pnl.grossMarginPct}% — sehat.`];
      if (live.orderCount > 0) {
        list.unshift(`${live.orderCount} pesanan masuk dari pembeli (${live.activeCount} aktif).`);
        list.push(`Nilai penjualan live: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(live.revenue)}.`);
      } else {
        list.push("Belum ada pesanan masuk dari pembeli.");
        list.push("Pantau skor pelanggan untuk menekan risiko COD.");
      }
      return list.slice(0, 3);
    }
    return staticNotifs[role as string] ?? staticNotifs.GUEST;
  });

  let exporting = $state(false);
  const notifsList = $derived(liveNotifs);
  const notifs = $derived(notifsList.length);
  let headerEl = $state<HTMLElement | undefined>();

  $effect(() => {
    const close = (e: MouseEvent) => {
      const el = headerEl;
      if (el && !el.contains(e.target as Node)) openPop = null;
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") openPop = null;
    };
    // Pintasan Ctrl/Cmd+B untuk buka/tutup sidebar (umum di editor/dashboard).
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B") && sidenavVisible) {
        e.preventDefault();
        onmenutoggle?.();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    document.addEventListener("keydown", shortcut);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      document.removeEventListener("keydown", shortcut);
    };
  });

  async function exportCsv() {
    if (exporting) return;
    exporting = true;
    try {
      const hubs = await api.hubs();
      const head = "name,region,capacityM_perDay,utilizationPct,outlets,code";
      const body = hubs.map((h: Hub) => [h.name, h.region, h.capacityM, h.utilizationPct, h.outlets, h.code].join(",")).join("\n");
      const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "omnigistic-hubs.csv";
      a.click();
      URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: { message: `omnigistic-hubs.csv terunduh (${hubs.length} hub)`, type: "success", title: "Export" } }));
    } catch {
      window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: { message: "Export gagal — backend offline?", type: "error", title: "Export" } }));
    } finally {
      exporting = false;
    }
  }
</script>

<!-- Header naik ke stacking context tinggi (z-[9999]) agar popover di dalamnya
     selalu di atas konten halaman (kartu/grafik/sticky) yang bisa menutupinya. -->
<header bind:this={headerEl} class="relative z-[9999] flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-background/80 px-3 py-3 backdrop-blur sm:gap-4 sm:px-6">
  <div class="flex min-w-0 items-center gap-2 sm:gap-3">
    {#if sidenavVisible && onmenutoggle}
      <button
        type="button"
        onclick={onmenutoggle}
        aria-label={sidenavOpen ? "Tutup sidebar" : "Buka sidebar"}
        aria-expanded={sidenavOpen}
        title={sidenavOpen ? "Tutup sidebar" : "Buka sidebar"}
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
      >
        <Icon name={sidenavOpen ? "panel-left" : "menu"} cls="h-4.5 w-4.5" />
      </button>
    {/if}
    <div class="min-w-0">
      <p class="truncate font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">{meta.name} · <span class="text-muted-foreground">{meta.sub}</span></p>
      <p class="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span class={"inline-block h-1.5 w-1.5 rounded-full " + ($online ? "bg-success-foreground animate-pulse" : "bg-warning-foreground")}></span>
        <span class="truncate">{$online ? "Data studi kasus ISCEA 2026 · langsung" : "Data lokal (backend offline)"}</span>
      </p>
    </div>

    <span
      class="ml-1 hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground sm:ml-2 sm:flex"
      title="Seluruh angka berasal dari dataset studi kasus ISCEA (12 titik, 2023)"
    >
      <Icon name="calendar" cls="h-3.5 w-3.5" />
      {PERIOD_LABEL}
    </span>
  </div>

  <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
    <button
      type="button"
      onclick={() => window.dispatchEvent(new CustomEvent("omnigistic-open-widgets"))}
      class="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground transition-all duration-300 hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:text-[var(--bitcoin)] sm:flex"
    >
      <Icon name="plus" cls="h-3.5 w-3.5" weight="bold" />
      Tambah widget
    </button>

    <button
      type="button"
      onclick={exportCsv}
      disabled={exporting}
      class="relative flex items-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_-5px_var(--glow)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_-5px_var(--glow)] active:scale-100 disabled:opacity-80"
    >
      <span class="relative z-10 flex items-center gap-1.5">
        <Icon name="download" cls="h-3.5 w-3.5" weight="bold" />
        {exporting ? "Mengekspor..." : "Export"}
      </span>
    </button>

    <div class="relative">
      <button
        type="button"
        aria-label={notifs ? `Notifikasi, ${notifs} belum dibaca` : "Notifikasi"}
        aria-expanded={openPop === "notif"}
        onclick={() => (openPop = openPop === "notif" ? null : "notif")}
        class="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
      >
        <Icon name="bell" cls="h-4 w-4" />
        {#if notifs > 0}
          <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-card bg-destructive"></span>
        {/if}
      </button>
      {#if openPop === "notif"}
        <div class="absolute right-0 top-[calc(100%+8px)] z-[9999] w-72 rounded-xl border border-border bg-card shadow-pop">
          <div class="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span class="text-sm font-semibold">Notifikasi</span>
            <span class="text-xs text-muted-foreground">{notifs} baru</span>
          </div>
          <ul class="max-h-64 overflow-y-auto text-xs">
            {#if notifs > 0}
              {#each notifsList as n, i (i)}
                <li class="flex gap-2 border-b border-border px-4 py-3 last:border-0"><span>{n}</span></li>
              {/each}
            {:else}
              <li class="px-4 py-6 text-center text-muted-foreground">Semua sudah dibaca</li>
            {/if}
          </ul>
        </div>
      {/if}
    </div>

    <ThemeToggle />

    <div class="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={openPop === "profile"}
        onclick={() => (openPop = openPop === "profile" ? null : "profile")}
        class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--bitcoin-deep)] to-[var(--bitcoin)] font-heading text-sm font-bold text-white shadow-[0_0_16px_-4px_var(--glow)]"
      >
        {meta.letter}
      </button>
      {#if openPop === "profile"}
        <div class="absolute right-0 top-[calc(100%+8px)] z-[9999] w-56 rounded-xl border border-border bg-card shadow-pop">
          <div class="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{meta.letter}</span>
            <div>
              <p class="text-sm font-semibold">{meta.name}</p>
              <p class="text-xs text-muted-foreground">{meta.sub || "Omnigistic"}</p>
            </div>
          </div>
          <div class="border-b border-border px-4 py-2">
            <p class="px-1 pb-1 pt-0.5 text-[13.5px] font-semibold uppercase tracking-wider text-muted-foreground">Ganti peran</p>
            {#each Object.entries(roleRoutes) as [slug, href] (slug)}
              <a href={resolveHref(href)} class="block rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                {roleMeta[slug]?.name} · {slug}
              </a>
            {/each}
          </div>
          <a href={resolveHref("/")} class="block px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Kembali ke halaman utama</a>
        </div>
      {/if}
    </div>
  </div>
</header>