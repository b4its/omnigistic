<script lang="ts">
  import type { Role } from "$lib/stores/role";
  import { cn, resolveHref } from "$lib/utils";
  import { api, online, type Hub } from "$lib/api";
  import ThemeToggle from "./ThemeToggle.svelte";
  import Icon from "./Icon.svelte";

  let { role = "PUSAT" }: { role?: Role | string } = $props();

  const roleMeta: Record<string, { name: string; sub: string; letter: string }> = {
    PUSAT: { name: "Dalila", sub: "Manajer Pusat", letter: "D" },
    HUB: { name: "Marwah", sub: "Manajer Hub Bandung", letter: "M" },
    KURIR: { name: "Baits", sub: "Kurir Jakarta", letter: "B" },
    DATA: { name: "Virgiawan", sub: "Data & IT", letter: "V" },
    CUSTOMER: { name: "Sari", sub: "Pembeli", letter: "S" },
    SELLER: { name: "Rina", sub: "Penjual", letter: "R" }
  };
  const RANGES = ["7 hari terakhir", "30 hari terakhir", "90 hari terakhir", "Tahun berjalan"];
  const roleRoutes: Record<string, string> = {
    PUSAT: "/dashboard/pusat/overview",
    HUB: "/dashboard/hub/overview",
    KURIR: "/dashboard/kurir/overview",
    DATA: "/dashboard/data/overview",
    CUSTOMER: "/dashboard/customer/overview",
    SELLER: "/dashboard/seller/overview"
  };

  const meta = $derived(roleMeta[role] ?? { name: "Guest", sub: "", letter: "G" });

  let range = $state(RANGES[1]);
  let openPop = $state<null | "range" | "notif" | "profile">(null);
  const notifCounts: Record<string, string[]> = {
    PUSAT: ["Hub Jakarta utilisasi 90,4%, di atas ambang 65%.", "2 paket COD berisiko tinggi di rute Bandung.", "Complaint rate bulan ini turun 8%."],
    HUB: ["Utilisasi Bandung 68,9% di atas ambang.", "Forecast: demand naik 8% pekan depan.", "Buffer musiman siap diaktivasi."],
    KURIR: ["3 paket COD perlu diarahkan ke PUDO.", "Slot konfirmasi: 18 penerima sudah siap.", "Rute COD terpangkas ke ±100 menit hari ini."],
    DATA: ["3 alamat ambigu baru perlu verifikasi.", "Geotag checkout naik ke 62%.", "Pipeline ETA partner laut tersambung."],
    CUSTOMER: ["Pesananmu sedang dikemas di hub Jakarta.", "Kurir menjadwalkan slot konfirmasi sebelum tiba.", "Pilih COD untuk bayar di tempat, atau transfer lebih cepat."],
    SELLER: ["Margin kotor 30 hari: 31,4% — sehat.", "2 produk margin tipis perlu penyesuaian harga.", "5 pelanggan berisiko tinggi COD, arahkan ke PUDO."],
    GUEST: ["Selamat datang — pilih portal peran."]
  };
  let exporting = $state(false);
  const notifsList = $derived(notifCounts[role as string] ?? notifCounts.GUEST);
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
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
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
      window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: "omnigistic-hubs.csv terunduh (23 hub)" }));
    } catch {
      window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: "Export gagal — backend offline?" }));
    } finally {
      exporting = false;
    }
  }
</script>

<header bind:this={headerEl} class="flex shrink-0 items-center justify-between gap-4 border-b border-sidebar-border bg-background/80 px-6 py-3 backdrop-blur">
  <div class="flex min-w-0 items-center gap-3">
    <div class="min-w-0">
      <p class="truncate font-serif text-xl font-semibold tracking-tight text-foreground">{meta.name} · <span class="text-muted-foreground">{meta.sub}</span></p>
      <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span class={"inline-block h-1.5 w-1.5 rounded-full " + ($online ? "bg-success-foreground" : "bg-warning-foreground")}></span>
        {$online ? "Data studi kasus ISCEA 2026 · langsung" : "Data lokal (backend offline)"}
      </p>
    </div>

    <div class="relative">
      <button
        type="button"
        aria-expanded={openPop === "range"}
        onclick={() => (openPop = openPop === "range" ? null : "range")}
        class="ml-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/60"
      >
        <Icon name="calendar" cls="h-3.5 w-3.5" />
        <span class="hidden sm:inline">{range}</span>
        <Icon name="caret-down" cls="h-3 w-3" />
      </button>
      {#if openPop === "range"}
        <div class="absolute left-0 top-[calc(100%+8px)] z-30 w-44 rounded-xl border border-border bg-card p-1 shadow-pop">
          {#each RANGES as r (r)}
            <button
              type="button"
              onclick={() => { range = r; openPop = null; }}
              class={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs", r === range ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              {r}
              {#if r === range}<Icon name="check" cls="h-3 w-3" weight="bold" />{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={() => window.dispatchEvent(new CustomEvent("omnigistic-open-widgets"))}
      class="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-accent-foreground sm:flex"
    >
      <Icon name="plus" cls="h-3.5 w-3.5" weight="bold" />
      Tambah widget
    </button>

    <button
      type="button"
      onclick={exportCsv}
      disabled={exporting}
      class="relative flex items-center gap-1.5 overflow-hidden rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0 disabled:opacity-80"
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
        <div class="absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-xl border border-border bg-card shadow-pop">
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
        class="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
      >
        {meta.letter}
      </button>
      {#if openPop === "profile"}
        <div class="absolute right-0 top-[calc(100%+8px)] z-30 w-56 rounded-xl border border-border bg-card shadow-pop">
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