<script lang="ts">
  import { onMount } from "svelte";
  import type * as LeafletNS from "leaflet";
  import { get } from "svelte/store";
  import type { Hub } from "$lib/api";
  import { themeStore } from "$lib/stores/theme";
  import { OSM_TILE, DARK_TILE_FILTER } from "$lib/map/tiles";
  import { PUDO_POINTS, pudoCountByRegion, UTIL_THRESHOLD } from "$lib/logistics";
  import Icon from "$lib/components/Icon.svelte";
  import { numId } from "$lib/utils";

  interface Props {
    hubs?: Hub[];
    height?: number;
    /** Tampilkan titik PUDO mitra (default true). */
    showPudo?: boolean;
    /** Aktifkan kontrol interaktif (cari/filter/statistik/daftar/pilih hub). */
    interactive?: boolean;
    /** Callback opsional saat hub dipilih/dibersihkan (default noop). */
    onSelect?: (hub: Hub | null) => void;
  }
  let {
    hubs = [] as Hub[],
    height = 520,
    showPudo = true,
    interactive = true,
    onSelect = () => {}
  }: Props = $props();

  let mapEl = $state<HTMLElement | undefined>();
  /** Legenda peta: terbuka default (collapsible). */
  let legendOpen = $state(true);
  /** Panel daftar hub: terbuka default (collapsible). */
  let listOpen = $state(true);

  // ── Kontrol interaktif ─────────────────────────────────────────────────
  let q = $state("");
  type Tier = "all" | "overload" | "warn" | "ok";
  let tier = $state<Tier>("all");
  let region = $state<string>("all");
  let selectedCode = $state<string | null>(null);
  /** Urutan daftar hub: turun menurut metrik, atau nama A→Z. */
  type SortKey = "util" | "cap" | "name";
  let sortKey = $state<SortKey>("util");

  /** Escaping HTML untuk tooltip/popup (defensif — data bisa dari API). */
  function esc(s: unknown): string {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
  }

  /** Master list (prop bisa kosong saat mount; komponen tetap aman). */
  const all = $derived(hubs ?? []);

  function tierOf(u: number): Exclude<Tier, "all"> {
    if (u > UTIL_THRESHOLD.critical) return "overload";
    if (u >= UTIL_THRESHOLD.warn) return "warn";
    return "ok";
  }

  const regions = $derived([...new Set(all.map((h) => h.region))].sort());

  const filtered = $derived(
    all.filter((h) => {
      if (tier !== "all" && tierOf(h.utilizationPct) !== tier) return false;
      if (region !== "all" && h.region !== region) return false;
      const s = q.trim().toLowerCase();
      if (s && !(h.name.toLowerCase().includes(s) || h.code.toLowerCase().includes(s) || h.region.toLowerCase().includes(s))) return false;
      return true;
    })
  );

  const stats = $derived.by(() => {
    const n = filtered.length;
    const overload = filtered.filter((h) => tierOf(h.utilizationPct) === "overload").length;
    const warn = filtered.filter((h) => tierOf(h.utilizationPct) === "warn").length;
    const ok = n - overload - warn;
    const cap = filtered.reduce((s, h) => s + h.capacityM, 0);
    const outlets = filtered.reduce((s, h) => s + h.outlets, 0);
    const usedCap = filtered.reduce((s, h) => s + h.capacityM * (h.utilizationPct / 100), 0);
    const avgUtil = cap > 0 ? (usedCap / cap) * 100 : 0;
    // Defisit headroom: bila utilisasi > ambang critical, kelebihan beban (juta paket/hari)
    // = kapasitas × (util−critical)/100 — indikator "relief" yang dibutuhkan.
    const deficit = filtered.reduce((s, h) => s + (h.utilizationPct > UTIL_THRESHOLD.critical ? h.capacityM * ((h.utilizationPct - UTIL_THRESHOLD.critical) / 100) : 0), 0);
    return { n, overload, warn, ok, cap, outlets, usedCap, avgUtil, deficit };
  });

  const selected = $derived(selectedCode ? all.find((h) => h.code === selectedCode) ?? null : null);

  /** Peringkat hub berdasarkan utilisasi (untuk kartu detail & daftar). */
  const rankedAll = $derived.by(() => {
    const byUtil = [...all].sort((a, b) => b.utilizationPct - a.utilizationPct);
    const rank: Record<string, number> = {};
    byUtil.forEach((h, i) => (rank[h.code] = i + 1));
    const totalCap = all.reduce((s, h) => s + h.capacityM, 0);
    return { rank, totalCap, totalUtil: all.length };
  });

  /** Daftar hub tersaring, terurut sesuai `sortKey` (dipakai panel daftar). */
  const listed = $derived.by(() => {
    const arr = [...filtered];
    if (sortKey === "cap") arr.sort((a, b) => b.capacityM - a.capacityM);
    else if (sortKey === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "id"));
    else arr.sort((a, b) => b.utilizationPct - a.utilizationPct);
    return arr;
  });

  /** Warna PUDO per region (6 region kasus) — untuk legenda & marker. */
  const PUDO_REGION_COLOR: Record<string, { color: string; fill: string }> = {
    Java: { color: "#7c3aed", fill: "#ddd6fe" },
    Sumatra: { color: "#0891b2", fill: "#cffafe" },
    Kalimantan: { color: "#16a34a", fill: "#dcfce7" },
    Sulawesi: { color: "#ea580c", fill: "#ffedd5" },
    "Bali & Nusa Tenggara": { color: "#ca8a04", fill: "#fef9c3" },
    "Maluku & Papua": { color: "#db2777", fill: "#fce7f3" }
  };
  const regionCounts = pudoCountByRegion();

  // Koordinat kota hub (data publik). Kode mengikuti `code` di data-kas.json.
  const COORDS: Record<string, [number, number]> = {
    JKT: [-6.2088, 106.8456], BKS: [-6.28, 107.1], BDG: [-6.9175, 107.6191],
    SMG: [-6.9667, 110.4167], YOG: [-7.7972, 110.3688], SOL: [-7.5755, 110.8243],
    SUB: [-7.2575, 112.7521], MLG: [-7.9666, 112.6326], DPS: [-8.6705, 115.2126],
    MTR: [-8.5833, 116.1167], MDN: [3.5952, 98.6722], PKB: [0.5071, 101.4478],
    PLB: [-2.9761, 104.7754], BLL: [-5.3971, 105.2668], PDG: [-0.9471, 100.4172],
    BTJ: [5.5483, 95.3238], BDJ: [-3.3186, 114.5944], BPN: [-1.2379, 116.8529],
    PNK: [-0.0263, 109.3425], MKS: [-5.1477, 119.4327], MDO: [1.4748, 124.8421],
    AMQ: [-3.6954, 128.1814], DJJ: [-2.5916, 140.669]
  };

  const TIER_COLOR: Record<Exclude<Tier, "all">, string> = {
    overload: "#a03123",
    warn: "#d9a441",
    ok: "#3f5c3f"
  };
  function tone(u: number): { color: string; label: string } {
    const t = tierOf(u);
    const label = t === "overload" ? `overload (>${UTIL_THRESHOLD.critical}%)` : t === "warn" ? `perhatian (${UTIL_THRESHOLD.warn}-${UTIL_THRESHOLD.critical}%)` : `sehat (<${UTIL_THRESHOLD.warn}%)`;
    return { color: TIER_COLOR[t], label };
  }

  // ── Leaflet refs ───────────────────────────────────────────────────────
  let map: LeafletNS.Map | null = null;
  let cleanupTheme: (() => void) | null = null;
  let disposed = false;
  let buildSeq = 0;
  /** Registry marker hub (code → layer) untuk restyle tanpa rebuild. */
  let hubLayers: Record<string, LeafletNS.CircleMarker> = {};
  /** Registry marker PUDO (untuk dim saat filter region aktif). */
  let pudoLayers: Array<{ region: string; mk: LeafletNS.CircleMarker }> = [];
  /** Semua koordinat hub (untuk tombol "lihat semua"). */
  let allBounds: Array<[number, number]> = [];

  function hubPopup(h: Hub): string {
    const { label } = tone(h.utilizationPct);
    const headroom = Math.max(0, 100 - h.utilizationPct);
    const pct = Math.round(h.utilizationPct * 10) / 10;
    const r = rankedAll.rank[h.code] ?? 0;
    const share = rankedAll.totalCap > 0 ? (h.capacityM / rankedAll.totalCap) * 100 : 0;
    return (
      `<strong>${esc(h.name)}</strong> · ${esc(h.region)}<br/>` +
      `Utilisasi <strong>${pct}%</strong> <span style="opacity:.75">(${esc(label)})</span><br/>` +
      `Peringkat <strong>#${r}</strong> / ${rankedAll.totalUtil} · pangsa kapasitas ${numId(share, 1)}%<br/>` +
      `Kapasitas ${h.capacityM} juta paket/hari · ${h.outlets} outlet<br/>` +
      `Headroom ± ${Math.round(headroom)} poin`
    );
  }

  function teardown() {
    buildSeq++;
    cleanupTheme?.();
    cleanupTheme = null;
    hubLayers = {};
    pudoLayers = [];
    allBounds = [];
    try {
      map?.remove();
    } catch {
      /* noop */
    }
    map = null;
  }

  function build(el: HTMLElement) {
    const seq = ++buildSeq;
    const stale = () => disposed || seq !== buildSeq || !el.isConnected;
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (stale()) return;

      const m = L.map(el, { worldCopyJump: true, zoomControl: true, scrollWheelZoom: true });
      map = m;
      L.tileLayer(OSM_TILE.url, { maxZoom: OSM_TILE.maxZoom, attribution: OSM_TILE.attribution, crossOrigin: true }).addTo(m);

      // Mode gelap: filter CSS pada tile OSM (konsisten dgn peta lain).
      const applyDark = (dark: boolean) => {
        const pane = m.getPane("tilePane");
        if (pane) pane.style.filter = dark ? DARK_TILE_FILTER : "";
      };
      applyDark(get(themeStore) === "dark");
      cleanupTheme = themeStore.subscribe((t) => applyDark(t === "dark"));

      const bounds: Array<[number, number]> = [];
      for (const h of all) {
        const c = COORDS[h.code];
        if (!c) continue;
        const { color } = tone(h.utilizationPct);
        const mk = L.circleMarker(c, {
          radius: 6 + h.capacityM * 18,
          color,
          weight: h.utilizationPct > UTIL_THRESHOLD.critical ? 3 : 2,
          fillColor: color,
          fillOpacity: 0.72
        }).addTo(m);
        mk.bindTooltip(`<strong>${esc(h.name)}</strong> (${esc(h.code)}) · ${esc(h.region)}`, { direction: "top" });
        mk.bindPopup(hubPopup(h));
        mk.on("click", () => (selectedCode = selectedCode === h.code ? null : h.code));
        hubLayers[h.code] = mk;
        bounds.push(c);
      }

      // ── Titik PUDO mitra (overlay informasi) — warna per REGION ──
      if (showPudo) {
        for (const p of PUDO_POINTS) {
          const rc = PUDO_REGION_COLOR[p.region] ?? { color: "#8b5cf6", fill: "#ddd6fe" };
          const mk = L.circleMarker(p.coord as unknown as LeafletNS.LatLngExpression, {
            radius: 5,
            color: rc.color,
            weight: 2,
            fillColor: rc.fill,
            fillOpacity: 0.92,
            dashArray: "2 3"
          }).addTo(m);
          mk.bindTooltip(`PUDO · ${esc(p.name)} (${esc(p.region)})`, { direction: "top" });
          mk.bindPopup(
            `<strong>${esc(p.name)}</strong> · ${esc(p.partner)}<br/>` +
              `<span style="opacity:.8">${esc(p.address)}</span><br/>` +
              `${esc(p.city)} · ${esc(p.region)}<br/>Jam ${esc(p.hours)} · kapasitas ${p.capacityPerDay} paket/hari<br/>` +
              `<span style="opacity:.7;font-size:11px">Koordinat: ${p.source === "osm" ? "OpenStreetMap" : "asumsi tim"}</span>`
          );
          pudoLayers.push({ region: p.region, mk });
        }
      }

      allBounds = bounds;
      if (bounds.length) {
        m.fitBounds(bounds as LeafletNS.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 6 });
      } else {
        m.setView([-2.5, 118], 5);
      }
    })();
  }

  onMount(() => {
    const el = mapEl;
    if (el) build(el);
    return () => {
      disposed = true;
      teardown();
    };
  });

  /** Terbang ke sebuah hub & buka popup-nya (dipakai klik daftar / map). */
  function focusHub(code: string) {
    const c = COORDS[code];
    if (map && c) {
      try {
        map.flyTo(c as LeafletNS.LatLngExpression, Math.max(map.getZoom(), 10), { duration: 0.6 });
      } catch {
        /* noop */
      }
    }
  }

  /** Pilih hub: toggle seleksi, fokuskan peta, dan buka popup. */
  function pickHub(code: string) {
    if (selectedCode === code) {
      selectedCode = null;
      return;
    }
    selectedCode = code;
    focusHub(code);
  }

  /** Kembalikan viewport ke seluruh hub (tampilan nasional). */
  function fitAll() {
    if (map && allBounds.length) {
      try {
        map.fitBounds(allBounds as LeafletNS.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 6 });
      } catch {
        /* noop */
      }
    }
  }

  // ── Restyle marker saat filter / seleksi berubah (tanpa rebuild) ─────────
  $effect(() => {
    const matchCodes = new Set(filtered.map((h) => h.code));
    const regionActive = region !== "all";
    for (const [code, mk] of Object.entries(hubLayers)) {
      const h = all.find((x) => x.code === code);
      if (!h) continue;
      const on = matchCodes.has(code);
      const { color } = tone(h.utilizationPct);
      const isSel = code === selectedCode;
      try {
        mk.setStyle({
          color,
          fillColor: color,
          opacity: on ? 1 : 0.08,
          fillOpacity: on ? (isSel ? 0.95 : 0.72) : 0.05,
          weight: isSel ? 4 : on ? (h.utilizationPct > UTIL_THRESHOLD.critical ? 3 : 2) : 1
        });
        mk.setRadius((6 + h.capacityM * 18) * (isSel ? 1.35 : 1));
        if (on) mk.bringToFront();
      } catch {
        /* layer mungkin sudah dibuang */
      }
      if (isSel && on) {
        try {
          mk.openPopup();
        } catch {
          /* noop */
        }
      }
    }
    // PUDO ikut diredupkan bila filter region aktif & regionnya tak cocok.
    for (const { region: r, mk } of pudoLayers) {
      try {
        const on = !regionActive || r === region;
        mk.setStyle({ opacity: on ? 1 : 0.08, fillOpacity: on ? 0.92 : 0.05 });
      } catch {
        /* noop */
      }
    }
    // Sesuaikan viewport ke subset yang cocok (bila ada & peta siap), kecuali
    // ketika sebuah hub sedang dipilih (view dikendalikan pickHub/focusHub).
    if (map && !selectedCode && matchCodes.size > 0 && matchCodes.size < all.length) {
      const pts = filtered.map((h) => COORDS[h.code]).filter(Boolean) as Array<[number, number]>;
      if (pts.length === 1) {
        try {
          map.setView(pts[0], 9, { animate: true });
        } catch {
          /* noop */
        }
      } else if (pts.length > 1) {
        try {
          map.fitBounds(pts as LeafletNS.LatLngBoundsExpression, { padding: [48, 48], maxZoom: 7 });
        } catch {
          /* noop */
        }
      }
    }
  });

  // Sinkronkan callback seleksi ke pemanggil (opsional).
  $effect(() => {
    onSelect(selected);
  });

  function resetFilters() {
    q = "";
    tier = "all";
    region = "all";
  }

  const TIER_CHIPS: Array<{ key: Tier; label: string }> = [
    { key: "all", label: "Semua" },
    { key: "overload", label: "Overload" },
    { key: "warn", label: "Perhatian" },
    { key: "ok", label: "Sehat" }
  ];

  const SORTS: Array<{ key: SortKey; label: string }> = [
    { key: "util", label: "Utilisasi" },
    { key: "cap", label: "Kapasitas" },
    { key: "name", label: "Nama" }
  ];
</script>

<div class="space-y-3">
  <!-- ── Bar kontrol interaktif ───────────────────────────────────────── -->
  {#if interactive}
    <div class="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <label class="relative flex min-w-[12rem] flex-1 items-center">
        <Icon name="search" cls="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" weight="bold" />
        <input
          type="search"
          bind:value={q}
          placeholder="Cari hub / kode / region…"
          aria-label="Cari hub, kode, atau region"
          class="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--primary)] focus:outline-none"
        />
      </label>
      <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter tingkat utilisasi">
        {#each TIER_CHIPS as c (c.key)}
          <button
            type="button"
            onclick={() => (tier = c.key)}
            aria-pressed={tier === c.key}
            class="rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors {tier === c.key ? 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]' : 'border-border text-muted-foreground hover:text-foreground'}"
          >
            {c.label}{#if c.key !== "all"}<span class="ml-1 tabular-nums opacity-80">{c.key === "overload" ? stats.overload : c.key === "warn" ? stats.warn : stats.ok}</span>{/if}
          </button>
        {/each}
      </div>
      <label class="flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <span class="font-mono text-[10px] uppercase tracking-wider">Region</span>
        <select
          bind:value={region}
          aria-label="Filter region"
          class="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-[var(--primary)] focus:outline-none"
        >
          <option value="all">Semua region</option>
          {#each regions as r (r)}<option value={r}>{r}</option>{/each}
        </select>
      </label>
      {#if q || tier !== "all" || region !== "all"}
        <button type="button" onclick={resetFilters} class="rounded-full border border-border px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground">Reset</button>
      {/if}
    </div>

    <!-- ── Statistik live (reaktif terhadap filter) ──────────────────── -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-border bg-card p-3">
        <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Hub tampil</p>
        <p class="kpi-value mt-1 text-xl">{stats.n}<span class="text-sm text-muted-foreground"> / {all.length}</span></p>
      </div>
      <div class="rounded-xl border border-border bg-card p-3">
        <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Kapasitas</p>
        <p class="kpi-value mt-1 text-xl">{numId(stats.cap, 3)}<span class="text-sm text-muted-foreground"> jt/hari</span></p>
      </div>
      <div class="rounded-xl border border-border bg-card p-3">
        <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Utilisasi rata²</p>
        <p class="kpi-value mt-1 text-xl {stats.avgUtil > UTIL_THRESHOLD.critical ? 'text-destructive-foreground' : 'text-foreground'}">{numId(stats.avgUtil, 1)}%</p>
      </div>
      <div class="rounded-xl border border-border bg-card p-3">
        <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Overload</p>
        <p class="kpi-value mt-1 text-xl {stats.overload > 0 ? 'text-destructive-foreground' : 'text-success-foreground'}">{stats.overload}</p>
      </div>
    </div>

    <!-- ── Insight: kelebihan beban yang perlu peredaman kapasitas ────── -->
    {#if stats.deficit > 0}
      <p class="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] text-foreground">
        <Icon name="warn" cls="mt-0.5 h-4 w-4 shrink-0 text-destructive-foreground" weight="bold" />
        <span>
          <b>{stats.overload} hub overload</b> — perkiraan <b>{numId(stats.deficit, 2)} juta paket/hari</b> kelebihan di atas ambang {UTIL_THRESHOLD.critical}% perlu dialihkan ke hub sekitar atau perluasan kapasitas.
          {#if stats.n !== all.length}<span class="text-muted-foreground">(dihitung dari {stats.n} hub tersaring)</span>{/if}
        </span>
      </p>
    {/if}
  {/if}

  <!-- ── Peta + panel hub (grid di layar besar) ──────────────────────── -->
  <div class="grid gap-3 {interactive ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : ''}">
    <!-- Peta -->
    <div class="relative isolate z-0 w-full overflow-hidden rounded-xl border border-border" style="height:{height}px">
      <div bind:this={mapEl} class="absolute inset-0" role="application" aria-label="Peta 23 hub GC Logistics dengan utilisasi berwarna (hijau, kuning, merah)"></div>

      <!-- Kontrol peta: reset view -->
      {#if interactive}
        <button
          type="button"
          onclick={fitAll}
          aria-label="Lihat semua hub (tampilan nasional)"
          title="Lihat semua hub"
          class="absolute left-2 top-2 z-[1000] inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/92 px-2.5 py-1.5 text-[12px] font-semibold text-foreground shadow-pop backdrop-blur transition-colors hover:bg-accent"
        >
          <Icon name="globe" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> Semua hub
        </button>
      {/if}

      <!-- Kartu detail hub terpilih -->
      {#if selected && interactive}
        {@const t = tone(selected.utilizationPct)}
        {@const rk = rankedAll.rank[selected.code] ?? 0}
        {@const share = rankedAll.totalCap > 0 ? (selected.capacityM / rankedAll.totalCap) * 100 : 0}
        <div class="absolute bottom-2 left-2 z-[1000] w-[min(19rem,calc(100%-1rem))] rounded-lg border border-border bg-background/95 p-3 text-[12px] shadow-pop backdrop-blur">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate font-semibold text-foreground">{selected.name} <span class="font-mono text-muted-foreground">({selected.code})</span></p>
              <p class="text-muted-foreground">{selected.region} · peringkat <b class="text-foreground">#{rk}</b>/{rankedAll.totalUtil}</p>
            </div>
            <button type="button" onclick={() => (selectedCode = null)} aria-label="Tutup detail hub" class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icon name="x" cls="h-3.5 w-3.5" weight="bold" /></button>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <div><p class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Utilisasi</p><p class="kpi-value" style="color:{t.color}">{numId(selected.utilizationPct, 1)}%</p></div>
            <div><p class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Headroom</p><p class="kpi-value text-foreground">{numId(Math.max(0, 100 - selected.utilizationPct), 1)} pt</p></div>
            <div><p class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Kapasitas</p><p class="text-foreground">{selected.capacityM} jt/hari</p></div>
            <div><p class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Pangsa nasional</p><p class="text-foreground">{numId(share, 1)}%</p></div>
          </div>
          <div class="mt-2">
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full" style="width:{Math.min(100, selected.utilizationPct)}%;background:{t.color}"></div>
            </div>
          </div>
          <p class="mt-2 border-t border-border pt-2 text-[11px] italic text-muted-foreground">Status: {t.label} · {selected.outlets} outlet</p>
        </div>
      {/if}

      <!-- Legenda peta lengkap & rinci (collapsible) -->
      <div class="absolute right-2 top-2 z-[1000] max-w-[min(17rem,calc(100%-1rem))] rounded-lg border border-border bg-background/92 text-[12px] shadow-pop backdrop-blur">
        <button
          type="button"
          onclick={() => (legendOpen = !legendOpen)}
          aria-expanded={legendOpen}
          aria-controls="hub-legend"
          class="flex w-full items-center justify-between gap-2 px-3 py-2 font-semibold text-foreground"
        >
          <span class="flex items-center gap-1.5"><Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> Legenda peta</span>
          <Icon name={legendOpen ? "caret-down" : "arrow-right"} cls="h-3 w-3 shrink-0 text-muted-foreground" weight="bold" />
        </button>
        {#if legendOpen}
          <div id="hub-legend" class="max-h-[60%] space-y-2 overflow-y-auto border-t border-border px-3 py-2.5">
            <p class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Utilisasi hub (warna)</p>
            <ul class="space-y-1.5">
              <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border border-black/20" style="background:{TIER_COLOR.ok}"></span> <span><b class="text-foreground">Sehat</b> — utilisasi &lt; {UTIL_THRESHOLD.warn}%</span></li>
              <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border border-black/20" style="background:{TIER_COLOR.warn}"></span> <span><b class="text-foreground">Perhatian</b> — {UTIL_THRESHOLD.warn}–{UTIL_THRESHOLD.critical}%</span></li>
              <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border border-black/20" style="background:{TIER_COLOR.overload}"></span> <span><b class="text-foreground">Overload</b> — &gt; {UTIL_THRESHOLD.critical}%</span></li>
            </ul>
            <p class="pt-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Ukuran &amp; simbol</p>
            <ul class="space-y-1.5">
              <li class="flex items-center gap-2"><span class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-foreground/40 bg-foreground/10"></span> <span>Bulatan besar = kapasitas hub lebih besar</span></li>
              {#if interactive}<li class="flex items-center gap-2"><span class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[var(--bitcoin)] bg-[var(--bitcoin)]/20"></span> <span>Klik hub/daftar untuk detail · redup = tersaring</span></li>{/if}
            </ul>
            {#if showPudo}
              <p class="pt-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">PUDO mitra per region ({PUDO_POINTS.length} titik)</p>
              <ul class="space-y-1.5">
                {#each regionCounts as rc (rc.region)}
                  {@const col = PUDO_REGION_COLOR[rc.region] ?? { color: "#8b5cf6", fill: "#ddd6fe" }}
                  <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2" style="border-color:{col.color};background:{col.fill}"></span> <span class="text-muted-foreground">{rc.region} <b class="text-foreground">· {rc.count}</b></span></li>
                {/each}
              </ul>
            {/if}
            <p class="border-t border-border pt-2 text-[10px] italic leading-snug text-muted-foreground">
              Ubin peta © OpenStreetMap. Warna hub = utilisasi Table 1 (kasus); ukuran = kapasitas harian.
              Koordinat & alamat PUDO diverifikasi dari OpenStreetMap (ODbL); jam/kapasitas = asumsi tim.
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Panel daftar hub (interaktif: klik untuk fokus) -->
    {#if interactive}
      <aside class="flex max-h-[var(--hub-list-max)] flex-col rounded-xl border border-border bg-card" style="--hub-list-max:{height}px">
        <div class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onclick={() => (listOpen = !listOpen)}
            aria-expanded={listOpen}
            aria-controls="hub-list"
            class="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground"
          >
            <Icon name="stack" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> Daftar hub
            <span class="rounded-full bg-muted px-1.5 text-[11px] font-mono text-muted-foreground">{listed.length}</span>
            <Icon name={listOpen ? "caret-down" : "arrow-right"} cls="h-3 w-3 text-muted-foreground" weight="bold" />
          </button>
          <label class="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Icon name="filter" cls="h-3 w-3" weight="bold" />
            <span class="sr-only">Urutkan daftar hub</span>
            <select
              bind:value={sortKey}
              aria-label="Urutkan daftar hub"
              class="rounded-md border border-border bg-background px-1.5 py-1 text-[11px] text-foreground focus:border-[var(--primary)] focus:outline-none"
            >
              {#each SORTS as s (s.key)}<option value={s.key}>{s.label}</option>{/each}
            </select>
          </label>
        </div>
        {#if listOpen}
          <ul id="hub-list" class="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {#each listed as h (h.code)}
              {@const t = tone(h.utilizationPct)}
              {@const rk = rankedAll.rank[h.code] ?? 0}
              <li>
                <button
                  type="button"
                  onclick={() => pickHub(h.code)}
                  aria-pressed={selectedCode === h.code}
                  class="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors {selectedCode === h.code ? 'bg-[var(--bitcoin)]/10' : 'hover:bg-muted/50'}"
                >
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums" style="border-color:{t.color};color:{t.color}">{rk}</span>
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center gap-1.5">
                      <span class="truncate text-[13px] font-medium text-foreground">{h.name}</span>
                      <span class="shrink-0 font-mono text-[10px] text-muted-foreground">{h.code}</span>
                    </span>
                    <span class="mt-1 flex items-center gap-2">
                      <span class="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                        <span class="block h-full rounded-full" style="width:{Math.min(100, h.utilizationPct)}%;background:{t.color}"></span>
                      </span>
                      <span class="shrink-0 font-mono text-[11px] font-semibold tabular-nums" style="color:{t.color}">{numId(h.utilizationPct, 1)}%</span>
                    </span>
                  </span>
                </button>
              </li>
            {/each}
            {#if listed.length === 0}
              <li class="px-3 py-6 text-center text-[12.5px] text-muted-foreground">Tidak ada hub yang cocok. <button type="button" onclick={resetFilters} class="font-semibold text-[var(--bitcoin)] underline-offset-2 hover:underline">Reset filter</button></li>
            {/if}
          </ul>
        {/if}
      </aside>
    {/if}
  </div>

  {#if interactive && stats.n === 0}
    <p class="text-center text-[13px] text-muted-foreground">Tidak ada hub yang cocok dengan filter. <button type="button" onclick={resetFilters} class="font-semibold text-[var(--bitcoin)] underline-offset-2 hover:underline">Reset filter</button>.</p>
  {/if}
</div>
