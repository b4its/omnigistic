<script lang="ts">
  /**
   * Peta pengantaran realtime (Leaflet) — titik awal (hub), titik saat ini (kurir),
   * dan titik tujuan (pembeli), dengan garis rute yang mengikuti jalan.
   *
   * Posisi kurir dikendalikan lewat prop `progress` (0..1) sehingga pemanggil
   * (simulasi) bisa mengatur waktu tempuh agar kurir tiba di tujuan.
   *
   * Leaflet diimpor DINAMIS saat onMount agar aman SSR (Leaflet mengakses `window`).
   */
  import { onMount } from "svelte";
  import type * as LeafletNS from "leaflet";
  import { get } from "svelte/store";
  import { browser } from "$app/environment";
  import { themeStore } from "$lib/stores/theme";
  import Icon from "$lib/components/Icon.svelte";
  import DeliveryMap from "$lib/map/DeliveryMap.svelte";
  import { coordsForCity, HUB_LABEL, etaForCity, distanceForCity, pudosForCity, pudoDropRecommendation, PUDO_POINTS, PUDO_KIND_META, pudoCountByKind, pudoCityCount, type PudoKind } from "$lib/logistics";
  import { api, type RoutePlanResult } from "$lib/api";
  import { OSM_TILE, DARK_TILE_FILTER } from "$lib/map/tiles";

  interface Props {
    /** Fraksi perjalanan 0..1 (dikendalikan pemanggil). */
    progress?: number;
    /** Kota tujuan — menentukan geometri & jarak rute (satu sumber: logistics.ts). */
    city?: string;
    originLabel?: string;
    destLabel?: string;
    /** Estimasi waktu tempuh total (menit). Default dari data kota. */
    etaMin?: number;
    height?: number;
    /** Role pengguna — menentukan nada label PUDO (KURIR = aksi, lain = info). */
    role?: string;
    /** Tampilkan titik PUDO + rekomendasi drop (default true). */
    showPudo?: boolean;
    /** Aktifkan Route Intelligence (jalur tercepat: kepadatan + efisiensi). */
    routeIntel?: boolean;
    /**
     * Tampilkan tombol "perbesar" untuk membuka peta modal layar-penuh.
     * Instance di dalam modal memakai `expandable={false}` agar tak rekursif.
     */
    expandable?: boolean;
    /**
     * Tampilkan legenda bawaan (collapsible) di atas peta. Dimatikan pada
     * instance di dalam modal karena legenda dikelola panel modal.
     */
    showLegend?: boolean;
    /**
     * Mode ringkas untuk peta kecil (mis. sidebar ~300px): sembunyikan panel
     * besar "Jalur tercepat" agar tak menumpuk legenda & peta tetap terbaca.
     * Pewarnaan rute tetap aktif; panel lengkap tersedia lewat peta layar penuh.
     */
    compact?: boolean;
  }

  let { progress = 0, city = "Bogor", originLabel = HUB_LABEL, destLabel = "Alamat penerima", etaMin, height = 360, role = "", showPudo = true, routeIntel = false, expandable = true, showLegend = true, compact = false }: Props = $props();

  /** true bila pengguna adalah kurir (PUDO = titik aksi, bukan sekadar info). */
  const isCourier = $derived(role.toUpperCase() === "KURIR");

  let mapEl = $state<HTMLElement | undefined>();
  /** Legenda peta: terbuka default (collapsible). */
  let legendOpen = $state(true);
  /** Legenda pada instance modal (layar penuh) — bisa dibuka/tutup sendiri. */
  let legendOpenFs = $state(true);

  /** Modal layar-penuh: status buka + fokus terakhir (untuk dikembalikan). */
  let fullscreen = $state(false);
  let fsTrigger: HTMLElement | null = null;

  /** Buka peta layar penuh (ingat pemicu agar fokus kembali saat ditutup). */
  function openFullscreen(e: MouseEvent) {
    fsTrigger = e.currentTarget as HTMLElement;
    fullscreen = true;
  }
  /** Tutup modal & kembalikan fokus ke tombol pemicu. */
  function closeFullscreen() {
    fullscreen = false;
    fsTrigger?.focus();
  }

  type LL = [number, number];

  /** Geometri + metrik rute per kota (reaktif terhadap prop `city`). */
  const rgeo = $derived.by(() => {
    const route: LL[] = coordsForCity(city);
    const segLen: number[] = [];
    for (let i = 1; i < route.length; i++) segLen.push(haversine(route[i - 1], route[i]));
    const total = segLen.reduce((s, d) => s + d, 0) || 1;
    return { route, segLen, total, origin: route[0], dest: route[route.length - 1] };
  });
  /** ETA total (menit): prop eksplisit bila ada, jika tidak dari data kota. */
  const tripMin = $derived(etaMin ?? etaForCity(city));
  const tripKm = $derived(distanceForCity(city));

  /** Titik PUDO di kota ini + rekomendasi drop terdekat dari tujuan. */
  const pudos = $derived(showPudo ? pudosForCity(city) : []);
  const dropRec = $derived(showPudo ? pudoDropRecommendation(city) : null);

  /** Warna PUDO per KATEGORI mitra (minimarket/pos/agen/komunitas). */
  function pudoKindStyle(kind: PudoKind): { color: string; fill: string } {
    const m = PUDO_KIND_META[kind] ?? PUDO_KIND_META.minimarket;
    return { color: m.color, fill: m.fill };
  }
  /** Ringkasan jumlah titik per kategori (untuk legenda). */
  const kindCounts = pudoCountByKind;

  // ── Route Intelligence: jalur tercepat berbasis kepadatan & efisiensi ──
  let plan = $state<RoutePlanResult | null>(null);
  let planFailed = $state(false);
  /** Jalur yang sedang ditampilkan/diikuti (key kandidat). Default: direkomendasikan. */
  let selectedKey = $state<string | null>(null);
  /** Override kepadatan (jam sibuk / lengang); null = pakai profil kasus. */
  let density = $state<number | null>(null);

  const candidates = $derived(plan?.candidates ?? []);
  const selected = $derived(candidates.find((c) => c.key === selectedKey) ?? null);

  /** Warna oleh tingkat kepadatan (hijau lengang → merah padat). */
  function densityColor(d: number): string {
    if (d < 0.4) return "#16a34a"; // lengang
    if (d < 0.65) return "#eab308"; // sedang
    return "#dc2626"; // padat
  }

  async function loadPlan() {
    planFailed = false;
    try {
      plan = await api.routePlan({ distance_km: tripKm, density_override: density });
      // Pertahankan pilihan pengguna bila masih valid; default ke rekomendasi.
      if (!selectedKey || !plan.candidates.some((c) => c.key === selectedKey)) {
        selectedKey = plan.recommended;
      }
    } catch {
      plan = null;
      planFailed = true;
    }
  }

  /**
   * Offset geometri rute ke samping proporsional (perpendicular) agar tiap
   * kandidat jalur terlihat sebagai garis terpisah, bukan saling menumpuk.
   */
  function offsetRoute(route: LL[], offKm: number): LL[] {
    if (offKm === 0) return route;
    return route.map((p, i) => {
      const a = route[Math.max(0, i - 1)];
      const b = route[Math.min(route.length - 1, i + 1)];
      const dLat = b[0] - a[0];
      const dLng = b[1] - a[1];
      const len = Math.hypot(dLat, dLng) || 1;
      // perpendicular unit → geser. Skala derajat ≈ 111 km/derajat (lat).
      const perLat = -dLng / len;
      const perLng = dLat / len;
      const dOff = offKm / 111.0;
      return [p[0] + perLat * dOff, p[1] + perLng * dOff] as LL;
    });
  }

  /** Offset (km) per kandidat agar garis terpisah: -0.6, 0, +0.6 km relatif. */
  function offsetForIndex(i: number): number {
    return (i - 1) * 0.6;
  }

  function haversine(a: LL, b: LL): number {
    const R = 6371.0;
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLng = ((b[1] - a[1]) * Math.PI) / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function pointAt(t: number): LL {
    const { route, segLen, total } = rgeo;
    let dist = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < segLen.length; i++) {
      if (dist <= segLen[i] || i === segLen.length - 1) {
        const f = segLen[i] > 0 ? dist / segLen[i] : 0;
        const a = route[i];
        const b = route[i + 1];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      dist -= segLen[i];
    }
    return route[route.length - 1];
  }

  function sliceUpTo(t: number): LL[] {
    const { route, segLen, total } = rgeo;
    const dist = Math.max(0, Math.min(1, t)) * total;
    const out: LL[] = [route[0]];
    let acc = 0;
    for (let i = 0; i < segLen.length; i++) {
      if (acc + segLen[i] <= dist) {
        out.push(route[i + 1]);
        acc += segLen[i];
      } else break;
    }
    out.push(pointAt(t));
    return out;
  }

  // Referensi layer agar bisa diperbarui dari $effect.
  let traveled: LeafletNS.Polyline | null = null;
  let courierMk: LeafletNS.CircleMarker | null = null;

  function paint(t: number) {
    if (!traveled || !courierMk) return;
    const frac = Math.max(0, Math.min(1, t));
    traveled.setLatLngs(sliceUpTo(frac) as unknown as LeafletNS.LatLngExpression[]);
    courierMk.setLatLng(pointAt(frac) as unknown as LeafletNS.LatLngExpression);
    const pct = Math.round(frac * 100);
    const km = Math.round(frac * tripKm * 10) / 10;
    const etaLeft = Math.max(0, Math.round(tripMin * (1 - frac)));
    try {
      courierMk.setTooltipContent(frac >= 1 ? `Tiba · ${destLabel}` : `Kurir · ${pct}% · ~${km} km · ETA ~${etaLeft} mnt`);
    } catch {
      /* noop */
    }
  }

  let map: LeafletNS.Map | null = null;
  let cleanupTheme: (() => void) | null = null;
  let disposed = false;
  let buildSeq = 0;

  /**
   * Bangun ulang peta dari identitas rute saat ini. Dipanggil dari $effect yang
   * melacak `city`/`showPudo`/`role` → peta selalu sinkron (dulu hanya onMount
   * sekali, sehingga kota baru tetap memakai geometri/marker/viewport kota lama).
   */
  function buildMap(el: HTMLElement) {
    // Token urut: bila build lain dimulai sebelum async ini selesai, build ini
    // membatalkan diri (mencegah L.map(el) dipanggil 2× → 'already initialized').
    const seq = ++buildSeq;
    const stale = () => disposed || seq !== buildSeq || !el.isConnected;
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (stale()) return;

      map = L.map(el, { worldCopyJump: true, zoomControl: true }).setView(rgeo.dest as unknown as LeafletNS.LatLngExpression, 11);

      // Tile OpenStreetMap — gratis, open-source, lengkap (tanpa API key).
      const tile = L.tileLayer(OSM_TILE.url, { maxZoom: OSM_TILE.maxZoom, attribution: OSM_TILE.attribution, crossOrigin: true });
      tile.addTo(map);

      // Mode gelap: filter CSS pada tile OSM (bukan penyedia pihak ketiga).
      const applyDark = (dark: boolean) => {
        const pane = map?.getPane("tilePane");
        if (pane) pane.style.filter = dark ? DARK_TILE_FILTER : "";
      };
      applyDark(get(themeStore) === "dark");
      const unsubTheme = themeStore.subscribe((t) => applyDark(t === "dark"));

      // Garis rute penuh — putus-putus, samar.
      L.polyline(rgeo.route as unknown as LeafletNS.LatLngExpression[], { color: "#94a3b8", weight: 3, opacity: 0.55, dashArray: "6 8" }).addTo(map);

      // ── Route Intelligence: gambar KANDIDAT jalur oleh tingkat kepadatan ──
      // Jalur terpilih digambar tebal & terang; lainnya tipis/samar.
      if (routeIntel && candidates.length && map) {
        const m = map;
        candidates.forEach((c, i) => {
          const geo = offsetRoute(rgeo.route, offsetForIndex(i));
          const isSel = c.key === selectedKey;
          L.polyline(geo as unknown as LeafletNS.LatLngExpression[], {
            color: densityColor(c.density),
            weight: isSel ? 6 : 3,
            opacity: isSel ? 0.95 : 0.45,
            dashArray: isSel ? undefined : "4 6",
          })
            .addTo(m)
            .bindTooltip(`${c.label} · ${c.timeMin} mnt · kepadatan ${Math.round(c.density * 100)}%${c.toll ? " · tol" : ""}`, { direction: "top" });
        });
      }

      // Garis jalur yang sudah ditempuh — solid.
      traveled = L.polyline([rgeo.origin] as unknown as LeafletNS.LatLngExpression[], { color: "#16a34a", weight: 5, opacity: 0.95 }).addTo(map);

      // Titik awal (hub).
      L.circleMarker(rgeo.origin as unknown as LeafletNS.LatLngExpression, { radius: 9, color: "#16a34a", fillColor: "#dcfce7", fillOpacity: 0.9, weight: 3 })
        .addTo(map)
        .bindTooltip(`Awal · ${originLabel}`, { direction: "top" });

      // Titik tujuan (pembeli).
      L.circleMarker(rgeo.dest as unknown as LeafletNS.LatLngExpression, { radius: 10, color: "#f7931a", fillColor: "#fde4d8", fillOpacity: 0.95, weight: 3 })
        .addTo(map)
        .bindTooltip(`Tujuan · ${destLabel}`, { direction: "top" });

      // Titik saat ini (kurir).
      courierMk = L.circleMarker(rgeo.origin as unknown as LeafletNS.LatLngExpression, { radius: 8, color: "#2563eb", fillColor: "#dbeafe", fillOpacity: 1, weight: 3 }).addTo(map);
      courierMk.bindTooltip("Kurir", { direction: "top", permanent: true }).openTooltip();

      // ── PUDO: semua titik mitra + rekomendasi drop terdekat ──
      const recId = dropRec?.pudo.id;
      for (const p of pudos) {
        const isRec = p.id === recId;
        const ks = pudoKindStyle(p.kind);
        const mk = L.circleMarker(p.coord as unknown as LeafletNS.LatLngExpression, {
          radius: isRec ? 11 : 7,
          // Rekomendasi selalu ungu pekat (aksen aksi); lainnya diwarnai per kategori.
          color: isRec ? "#7c3aed" : ks.color,
          weight: isRec ? 4 : 2,
          fillColor: isRec ? "#ede9fe" : ks.fill,
          fillOpacity: isRec ? 1 : 0.85,
          dashArray: isRec ? undefined : "2 3",
        }).addTo(map);
        const kindLabel = PUDO_KIND_META[p.kind]?.label ?? "Mitra";
        const tag = isRec ? (isCourier ? "Titik drop rekomendasi (kurir)" : "PUDO terdekat (rekomendasi)") : `PUDO · ${kindLabel}`;
        mk.bindTooltip(`${tag} · ${p.name} (${p.partner})`, { direction: "top" });
        const srcNote = p.source === "osm" ? "Koordinat & alamat: OpenStreetMap (ODbL)" : "Koordinat: asumsi tim";
        mk.bindPopup(
          `<strong>${p.name}</strong> · ${p.partner}<br/>` +
            `<span style="opacity:.85">${kindLabel}</span><br/>` +
            `${isCourier ? "Titik drop paket rekomendasi" : "Titik ambil/bayar paket"}<br/>` +
            `<span style="opacity:.8">${p.address}</span><br/>` +
            `Jam layanan ${p.hours} · kapasitas ${p.capacityPerDay} paket/hari<br/>` +
            `<span style="opacity:.7;font-size:11px">${p.city} · ${p.region} · ${srcNote}</span>` +
            (isRec && dropRec ? `<br/>Jarak dari tujuan ± ${dropRec.distanceKm} km · ETA ± ${dropRec.etaMin} menit` : "")
        );
      }

      // Garis rekomendasi: tujuan penerima → PUDO terdekat.
      if (dropRec) {
        L.polyline(dropRec.route as unknown as LeafletNS.LatLngExpression[], { color: "#7c3aed", weight: 4, opacity: 0.85, dashArray: "5 7" }).addTo(map);
      }

      map.fitBounds(rgeo.route as unknown as LeafletNS.LatLngBoundsExpression, { padding: [48, 48] });

      paint(progress);

      // Simpan pembersih tema; dibuang saat peta dibangun ulang / komponen dibongkar.
      cleanupTheme = unsubTheme;
    })();
  }

  function teardownMap() {
    buildSeq++; // batalkan build async yang masih berjalan
    cleanupTheme?.();
    cleanupTheme = null;
    traveled = null;
    courierMk = null;
    try {
      if (map) map.remove();
    } catch {
      /* noop */
    }
    map = null;
  }

  onMount(() => {
    // Tutup modal dengan Escape.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) closeFullscreen();
    };
    window.addEventListener("keydown", onKey);
    // disposed dikelola di luar agar $effect rebuild tak dianggap unmount.
    return () => {
      window.removeEventListener("keydown", onKey);
      disposed = true;
      teardownMap();
    };
  });

  // Kunci scroll body saat modal terbuka (tanpa mengganggu instance inline).
  $effect(() => {
    if (!browser) return;
    document.body.style.overflow = fullscreen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  });

  // Bangun ulang peta saat identitas rute berubah (city/showPudo/role), saat
  // Route Intelligence berubah (kandidat/jalur terpilih/kepadatan), & saat el siap.
  $effect(() => {
    const ident = `${city}|${showPudo}|${role}|${routeIntel ? selectedKey ?? "" : ""}|${candidates.length}`;
    const el = mapEl;
    if (!el) return;
    void ident; // jadikan dependensi eksplisit
    teardownMap();
    buildMap(el);
    return () => teardownMap();
  });

  // Muat/refetch rencana rute ketika kota atau kepadatan berubah.
  $effect(() => {
    if (!routeIntel) return;
    void city;
    void density;
    void loadPlan();
  });

  // Kurir bergerak ketika progress berubah.
  $effect(() => {
    paint(progress);
  });
</script>

<div class="relative isolate z-0 w-full overflow-hidden rounded-2xl border border-border" style="height:{height}px">
  <div
    bind:this={mapEl}
    aria-label={`Peta pengantaran: titik awal ${originLabel}, titik tujuan ${destLabel}, posisi kurir bergerak mengikuti jalan${showPudo ? ", serta titik PUDO mitra dan rekomendasi drop terdekat" : ""}`}
    role="application"
    class="absolute inset-0"
  ></div>
  <!-- Legenda peta lengkap & rinci (collapsible: tombol buka/tutup terpisah) -->
  {#if showLegend}
    {#if legendOpen}
      <!-- Legenda terbuka: judul + tombol tutup eksplisit (✕) -->
      <div class="absolute left-2 top-2 z-[1000] max-w-[min(17rem,calc(100%-1rem))] rounded-lg border border-border bg-background/92 text-[12px] shadow-pop backdrop-blur">
        <div class="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p class="flex items-center gap-1.5 font-semibold text-foreground"><Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> Legenda peta</p>
          <button
            type="button"
            onclick={() => (legendOpen = false)}
            aria-label="Tutup legenda peta"
            title="Tutup legenda"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon name="x" cls="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>
        <div id="map-legend" class="max-h-[60%] space-y-2 overflow-y-auto px-3 py-2.5">
        <!-- Penanda titik -->
        <p class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Penanda titik</p>
        <ul class="space-y-1.5">
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#16a34a] bg-[#dcfce7]"></span> <span><b class="text-foreground">Hub asal</b> — {originLabel}</span></li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#2563eb] bg-[#dbeafe]"></span> <span><b class="text-foreground">Kurir</b> — posisi saat ini</span></li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#f7931a] bg-[#fde4d8]"></span> <span><b class="text-foreground">Tujuan</b> — {destLabel}</span></li>
          {#if showPudo && pudos.length > 0}
            <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#8b5cf6] bg-[#ddd6fe]"></span> <span><b class="text-foreground">PUDO mitra</b> — titik ambil/bayar</span></li>
            <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#7c3aed] bg-[#ede9fe]"></span> <span><b class="text-foreground">{isCourier ? "Drop rekomendasi" : "PUDO terdekat"}</b> — tujuan alternatif</span></li>
          {/if}
        </ul>

        <!-- Kategori mitra PUDO (warna marker non-rekomendasi) -->
        {#if showPudo && pudos.length > 0}
          <p class="pt-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Kategori mitra (warna)</p>
          <ul class="space-y-1.5">
            {#each kindCounts() as kc (kc.kind)}
              <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2" style="border-color:{kc.color};background:{kc.fill}"></span> <span class="text-muted-foreground">{kc.label} <b class="text-foreground">· {kc.count}</b></span></li>
            {/each}
          </ul>
        {/if}

        <!-- Garis rute -->
        <p class="pt-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Garis rute</p>
        <ul class="space-y-1.5">
          <li class="flex items-center gap-2"><span class="h-0.5 w-6 shrink-0 rounded bg-[#94a3b8]"></span> <span>Rencana rute (penuh)</span></li>
          <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[#16a34a]"></span> <span>Sudah ditempuh</span></li>
          {#if routeIntel}
            <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[var(--bitcoin)]"></span> <span>Jalur terpilih (tebal)</span></li>
          {/if}
        </ul>

        <!-- Kepadatan (hanya saat Route Intelligence aktif) -->
        {#if routeIntel}
          <p class="pt-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Warna jalur = kepadatan</p>
          <ul class="space-y-1.5">
            <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[#16a34a]"></span> <span>Lengang (&lt;40%)</span></li>
            <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[#eab308]"></span> <span>Sedang (40–65%)</span></li>
            <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[#dc2626]"></span> <span>Padat (&gt;65%)</span></li>
          </ul>
        {/if}

        <!-- Sumber & catatan -->
        <p class="border-t border-border pt-2 text-[10px] italic leading-snug text-muted-foreground">
          Jaringan PUDO nasional: {PUDO_POINTS.length} titik mitra · {pudoCityCount()} kota di 6 region. Ubin peta © OpenStreetMap;
          koordinat & alamat PUDO diverifikasi dari OpenStreetMap (ODbL); jam/kapasitas & kepadatan = asumsi tim (prototipe).
        </p>
      </div>
      </div>
    {:else}
      <!-- Legenda tertutup: pil ringkas untuk membuka kembali -->
      <button
        type="button"
        onclick={() => (legendOpen = true)}
        aria-expanded="false"
        aria-controls="map-legend"
        aria-label="Buka legenda peta"
        title="Buka legenda"
        class="absolute left-2 top-2 z-[1000] inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/92 px-3 py-2 text-[12px] font-semibold text-foreground shadow-pop backdrop-blur transition-colors hover:bg-accent"
      >
        <Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> Legenda
      </button>
    {/if}
  {/if}

  {#if routeIntel && !compact}
    <!-- Panel Route Intelligence: jalur tercepat (kepadatan + efisiensi) -->
    <div class="absolute right-2 top-2 z-[1000] w-[min(20rem,calc(100%-1rem))] rounded-xl border border-border bg-background/95 p-3 text-[12px] shadow-pop">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="flex items-center gap-1.5 font-semibold text-foreground">
          <Icon name="route" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> Jalur tercepat
        </p>
        {#if plan}
          <span class="rounded-full border border-[color-mix(in_oklab,var(--bitcoin)_40%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_10%,transparent)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--bitcoin)]">−{plan.summary.timeSavedMin} mnt</span>
        {/if}
      </div>

      {#if planFailed}
        <p class="text-muted-foreground">Gagal memuat analisis jalur (backend offline). Rute dasar tetap ditampilkan.</p>
      {:else if !plan}
        <div class="h-16 animate-pulse rounded-lg bg-muted/50"></div>
      {:else}
        <!-- Kontrol kepadatan (jam sibuk) -->
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Kepadatan</span><span>{density == null ? "profil kasus" : `${Math.round(density * 100)}%`}</span>
          </span>
          <input
            type="range" min="0" max="1" step="0.1"
            value={density ?? 0.5}
            oninput={(e) => (density = Number((e.currentTarget as HTMLInputElement).value))}
            aria-label="Tingkat kepadatan jalur"
            class="mt-1 w-full accent-[var(--bitcoin)]"
          />
        </label>
        <button type="button" onclick={() => (density = null)} class="mt-1 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Reset ke profil kasus</button>

        <!-- Daftar kandidat jalur -->
        <ul class="mt-2 space-y-1.5">
          {#each candidates as c (c.key)}
            <li>
              <button
                type="button"
                onclick={() => (selectedKey = c.key)}
                aria-pressed={selectedKey === c.key}
                class="flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors {selectedKey === c.key ? 'border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_10%,transparent)]' : 'border-border hover:bg-muted/50'}"
              >
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:{densityColor(c.density)}"></span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-1.5">
                    <span class="truncate font-medium text-foreground">{c.label}</span>
                    {#if c.key === plan.fastestKey}<span class="rounded bg-success px-1 text-[9px] font-bold text-success-foreground">tercepat</span>{/if}
                    {#if c.key === plan.mostEfficientKey}<span class="rounded bg-[var(--gold)] px-1 text-[9px] font-bold text-[#030304]">efisien</span>{/if}
                  </span>
                  <span class="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                    {c.timeMin} mnt · {c.distanceKm} km · {c.effectiveSpeedKmh} km/j · padat {Math.round(c.density * 100)}%{#if c.toll} · tol{/if}
                  </span>
                </span>
                <span class="shrink-0 text-right">
                  <span class="block font-mono text-[11px] font-semibold tabular-nums text-foreground">{(c.efficiencyScore * 100).toFixed(0)}</span>
                  <span class="block font-mono text-[8px] uppercase tracking-wider text-muted-foreground">skor</span>
                </span>
              </button>
            </li>
          {/each}
        </ul>

        {#if selected}
          <p class="mt-2 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
            <span class="font-medium text-foreground">Dipilih: {selected.label}.</span>
            ETA {selected.timeMin} mnt · Rp{new Intl.NumberFormat("id-ID").format(selected.costIdr)} · {selected.co2G} g CO₂. Keandalan {(selected.reliability * 100).toFixed(0)}%.
          </p>
        {/if}
        <p class="mt-1.5 text-[10px] italic text-muted-foreground">Kepadatan/kecepatan/biaya = asumsi tim; bukan data lalu lintas live.</p>
      {/if}
    </div>
  {/if}

  {#if showPudo && dropRec}
    <div class="pointer-events-none absolute bottom-2 left-2 z-[1000] max-w-[calc(100%-1rem)] rounded-lg border border-[#7c3aed]/40 bg-background/95 px-3 py-2 text-[12px] shadow-pop">
      <p class="font-semibold text-foreground">
        {#if isCourier}Titik drop paket rekomendasi{:else}PUDO terdekat untuk penerima{/if}
      </p>
      <p class="text-muted-foreground">{dropRec.pudo.name} · {dropRec.pudo.partner} · ± {dropRec.distanceKm} km · ETA ± {dropRec.etaMin} mnt · {dropRec.pudo.hours}</p>
      <p class="mt-0.5 text-[11px] text-muted-foreground">
        {#if isCourier}Arahkan paket berisiko COD ke titik ini alih-alih menunggu di alamat.{:else}Penerima dapat mengambil/membayar paket di gerai mitra ini.{/if}
      </p>
    </div>
  {/if}

  {#if expandable}
    <!-- Tombol perbesar → peta modal layar-penuh -->
    <button
      type="button"
      onclick={openFullscreen}
      aria-label="Perbesar peta ke layar penuh"
      title="Perbesar peta (layar penuh)"
      class="absolute bottom-2 right-2 z-[1000] inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/95 px-3 py-2 text-[12px] font-semibold text-foreground shadow-pop backdrop-blur transition-colors hover:bg-accent"
    >
      <Icon name="layers" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> Perbesar
    </button>
  {/if}
</div>

{#if expandable && fullscreen}
  <!-- Modal peta layar penuh: peta penuh tanpa gangguan + legenda collapsible -->
  <div
    class="fixed inset-0 z-[10000] flex flex-col bg-background/98 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-label={`Peta layar penuh: ${originLabel} ke ${destLabel}`}
    tabindex="-1"
  >
    <div class="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div class="flex min-w-0 items-center gap-2">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
          <Icon name="map" cls="h-4 w-4" />
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-foreground">Peta pengantaran — layar penuh</p>
          <p class="truncate text-[11px] text-muted-foreground">{originLabel} → {destLabel}{role ? ` · ${role}` : ""}</p>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onclick={() => (legendOpenFs = !legendOpenFs)}
          aria-expanded={legendOpenFs}
          class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent"
        >
          <Icon name="map" cls="h-3.5 w-3.5" /> {legendOpenFs ? "Sembunyikan legenda" : "Tampilkan legenda"}
        </button>
        <button
          type="button"
          onclick={closeFullscreen}
          aria-label="Tutup peta layar penuh"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon name="x" cls="h-4 w-4" />
        </button>
      </div>
    </div>

    <div class="flex min-h-0 flex-1">
      <div class="min-w-0 flex-1">
        {#key fullscreen}
          <DeliveryMap
            {progress}
            {city}
            {originLabel}
            {destLabel}
            {etaMin}
            height={420}
            {role}
            {showPudo}
            {routeIntel}
            expandable={false}
            showLegend={false}
          />
        {/key}
      </div>
      {#if legendOpenFs}
        <aside class="w-[18rem] max-w-[40vw] shrink-0 overflow-y-auto border-l border-border bg-card p-4 text-[12px]">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="flex items-center gap-1.5 font-semibold text-foreground"><Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> Legenda peta</p>
            <button
              type="button"
              onclick={() => (legendOpenFs = false)}
              aria-label="Tutup legenda peta"
              title="Tutup legenda"
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon name="x" cls="h-3.5 w-3.5" weight="bold" />
            </button>
          </div>
          <ul class="space-y-1.5">
            <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#16a34a] bg-[#dcfce7]"></span> <span><b class="text-foreground">Hub asal</b> — {originLabel}</span></li>
            <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#2563eb] bg-[#dbeafe]"></span> <span><b class="text-foreground">Kurir</b> — posisi saat ini</span></li>
            <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#f7931a] bg-[#fde4d8]"></span> <span><b class="text-foreground">Tujuan</b> — {destLabel}</span></li>
            {#if showPudo && pudos.length > 0}
              <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#8b5cf6] bg-[#ddd6fe]"></span> <span><b class="text-foreground">PUDO mitra</b> — titik ambil/bayar</span></li>
              <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#7c3aed] bg-[#ede9fe]"></span> <span><b class="text-foreground">{isCourier ? "Drop rekomendasi" : "PUDO terdekat"}</b> — tujuan alternatif</span></li>
            {/if}
          </ul>
          <p class="mt-3 border-t border-border pt-2 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Garis rute</p>
          <ul class="mt-2 space-y-1.5">
            <li class="flex items-center gap-2"><span class="h-0.5 w-6 shrink-0 rounded bg-[#94a3b8]"></span> <span>Rencana rute (penuh)</span></li>
            <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[#16a34a]"></span> <span>Sudah ditempuh</span></li>
            {#if routeIntel}
              <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[var(--bitcoin)]"></span> <span>Jalur terpilih (tebal)</span></li>
            {/if}
          </ul>
          <p class="mt-3 border-t border-border pt-2 text-[10px] italic leading-snug text-muted-foreground">
            Ubin peta © OpenStreetMap (ODbL). Jam/kapasitas & kepadatan = asumsi tim (prototipe).
          </p>
        </aside>
      {/if}
    </div>
  </div>
{/if}
