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
  import {
    coordsForCity,
    HUB_LABEL,
    etaForCity,
    distanceForCity,
    pudosForCity,
    pudoDropRecommendation,
    PUDO_POINTS,
    PUDO_KIND_META,
    pudoCountByKind,
    pudoCityCount,
    calculateSimTelemetry,
    type PudoKind,
    type SimTelemetry
  } from "$lib/logistics";
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
    height?: number | string;
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
     * Tampilkan legenda bawaan (collapsible) di luar peta. Dimatikan pada
     * instance di dalam modal karena legenda dikelola panel modal.
     */
    showLegend?: boolean;
    /**
     * Mode ringkas untuk peta kecil (mis. sidebar ~300px): sembunyikan panel
     * besar "Jalur tercepat" agar tak menumpuk legenda & peta tetap terbaca.
     * Pewarnaan rute tetap aktif; panel lengkap tersedia lewat peta layar penuh.
     */
    compact?: boolean;
    /** Aktifkan kontrol & telemetri simulasi pengantaran riil (default true). */
    showSimulation?: boolean;
    /** Callback saat progres simulasi bergerak (0..1). */
    onProgressChange?: (progress: number) => void;
    /** Callback saat simulasi mencapai 100% (tiba di tujuan). */
    onSimulationComplete?: () => void;
    /** Callback saat rute dialihkan ke titik PUDO. */
    onSimulationDivertPudo?: () => void;
  }

  let {
    progress = 0,
    city = "Bogor",
    originLabel = HUB_LABEL,
    destLabel = "Alamat penerima",
    etaMin,
    height = 360,
    role = "",
    showPudo = true,
    routeIntel = false,
    expandable = true,
    showLegend = true,
    compact = false,
    showSimulation = true,
    onProgressChange,
    onSimulationComplete,
    onSimulationDivertPudo
  }: Props = $props();

  const heightStyle = $derived(typeof height === "number" ? `${height}px` : height);

  /** true bila pengguna adalah kurir (PUDO = titik aksi, bukan sekadar info). */
  const isCourier = $derived(role.toUpperCase() === "KURIR");

  let mapEl = $state<HTMLElement | undefined>();
  /** Legenda peta: terbuka default (collapsible). */
  let legendOpen = $state(true);
  /** Legenda pada instance modal (layar penuh) — bisa dibuka/tutup sendiri. */
  let legendOpenFs = $state(true);
  /** Bilah simulasi pengantaran riil: terbuka default (collapsible). */
  let simWidgetOpen = $state(true);
  /** Panel Route Intelligence (jalur tercepat): terbuka default (collapsible). */
  let routeIntelOpen = $state(true);

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

  // ── Simulasi Pengantaran Riil (Kurir) ──────────────────────────────────
  let simPlaying = $state(false);
  let simSpeed = $state(1); // 1, 2, 5, 10
  let simProgress = $state(0);
  let simWeather = $state<"cerah" | "hujan" | "badai">("cerah");
  let simTraffic = $state<"lancar" | "sedang" | "macet">("lancar");
  let simDiverted = $state(false);
  let simPanelExpanded = $state(false);
  let simInitDone = false;
  let simAnimId: number | null = null;
  let lastTimestamp = 0;

  $effect(() => {
    if (!simInitDone) {
      simProgress = progress;
      simPanelExpanded = !compact;
      simInitDone = true;
    }
  });


  /** Titik PUDO di kota ini + rekomendasi drop terdekat dari tujuan. */
  const pudos = $derived(showPudo ? pudosForCity(city) : []);
  const dropRec = $derived(showPudo ? pudoDropRecommendation(city) : null);

  /** Geometri + metrik rute per kota (reaktif terhadap prop `city` dan pengalihan PUDO). */
  const rgeo = $derived.by(() => {
    let route: LL[] = coordsForCity(city);
    if (simDiverted && dropRec) {
      route = [...route.slice(0, -1), dropRec.pudo.coord];
    }
    const segLen: number[] = [];
    for (let i = 1; i < route.length; i++) segLen.push(haversine(route[i - 1], route[i]));
    const total = segLen.reduce((s, d) => s + d, 0) || 1;
    return { route, segLen, total, origin: route[0], dest: route[route.length - 1] };
  });

  /** ETA total (menit): prop eksplisit bila ada, jika tidak dari data kota. */
  const tripMin = $derived(etaMin ?? etaForCity(city));
  const tripKm = $derived(distanceForCity(city));

  const simTelemetry = $derived(
    calculateSimTelemetry(city, simProgress, simWeather, simTraffic, simDiverted)
  );

  function simStep(timestamp: number) {
    if (!simPlaying) return;
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dtMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    const baseTripSeconds = 30; // basis durasi simulasi (detik)
    const weatherMult = simWeather === "hujan" ? 0.78 : simWeather === "badai" ? 0.55 : 1.0;
    const trafficMult = simTraffic === "macet" ? 0.52 : simTraffic === "sedang" ? 0.8 : 1.0;
    const rate = (1 / (baseTripSeconds / (weatherMult * trafficMult))) * simSpeed;

    const nextP = Math.min(1.0, simProgress + (dtMs / 1000) * rate);
    simProgress = nextP;
    paint(nextP);
    onProgressChange?.(nextP);

    if (nextP >= 1.0) {
      simPlaying = false;
      simAnimId = null;
      onSimulationComplete?.();
    } else {
      simAnimId = requestAnimationFrame(simStep);
    }
  }

  function toggleSimPlay() {
    if (simPlaying) {
      simPlaying = false;
      if (simAnimId) cancelAnimationFrame(simAnimId);
      simAnimId = null;
    } else {
      if (simProgress >= 1.0) {
        simProgress = 0;
        paint(0);
        onProgressChange?.(0);
      }
      simPlaying = true;
      lastTimestamp = 0;
      simAnimId = requestAnimationFrame(simStep);
    }
  }

  function resetSim() {
    simPlaying = false;
    if (simAnimId) cancelAnimationFrame(simAnimId);
    simAnimId = null;
    simProgress = 0;
    simDiverted = false;
    paint(0);
    onProgressChange?.(0);
  }

  function handleScrub(e: Event) {
    const val = Number((e.currentTarget as HTMLInputElement).value);
    simProgress = val;
    paint(val);
    onProgressChange?.(val);
    if (val >= 1.0 && simPlaying) {
      simPlaying = false;
      if (simAnimId) cancelAnimationFrame(simAnimId);
      simAnimId = null;
      onSimulationComplete?.();
    }
  }

  function toggleDivertPudo() {
    simDiverted = !simDiverted;
    onSimulationDivertPudo?.();
  }


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
    const km = Math.round(frac * simTelemetry.distanceTotalKm * 10) / 10;
    const etaLeft = simTelemetry.etaRemainingMin;
    const targetLabel = simDiverted && dropRec ? `Gerai PUDO (${dropRec.pudo.name})` : destLabel;
    try {
      courierMk.setTooltipContent(
        frac >= 1
          ? `🏁 Tiba · ${targetLabel}`
          : `🛵 Kurir (${pct}%) · ~${km} km · ${simTelemetry.speedKmh} km/j · ETA ~${etaLeft} mnt`
      );
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
      const originMk = L.circleMarker(rgeo.origin as unknown as LeafletNS.LatLngExpression, {
        radius: 9,
        color: "#16a34a",
        fillColor: "#dcfce7",
        fillOpacity: 0.95,
        weight: 3
      }).addTo(map);
      originMk.bindTooltip(`🏢 Hub: ${originLabel}`, {
        direction: "top",
        permanent: true,
        className: "map-label-hub",
        offset: [0, -8]
      });

      // Titik tujuan (pembeli).
      const destMk = L.circleMarker(rgeo.dest as unknown as LeafletNS.LatLngExpression, {
        radius: 10,
        color: "#f7931a",
        fillColor: "#fde4d8",
        fillOpacity: 0.95,
        weight: 3
      }).addTo(map);
      destMk.bindTooltip(`🎯 Tujuan: ${destLabel}`, {
        direction: "top",
        permanent: true,
        className: "map-label-dest",
        offset: [0, -8]
      });

      // Titik saat ini (kurir).
      courierMk = L.circleMarker(rgeo.origin as unknown as LeafletNS.LatLngExpression, {
        radius: 8,
        color: "#2563eb",
        fillColor: "#dbeafe",
        fillOpacity: 1,
        weight: 3
      }).addTo(map);
      courierMk.bindTooltip("🛵 Kurir", {
        direction: "top",
        permanent: true,
        className: "map-label-courier",
        offset: [0, -8]
      }).openTooltip();

      // ── PUDO: semua titik mitra + rekomendasi drop terdekat ──
      const recId = dropRec?.pudo.id;
      if (dropRec) {
        const p = dropRec.pudo;
        const recMk = L.circleMarker(p.coord as unknown as LeafletNS.LatLngExpression, {
          radius: 11,
          color: "#7c3aed",
          weight: 4,
          fillColor: "#ede9fe",
          fillOpacity: 1,
        }).addTo(map);
        const recLabel = isCourier ? `📦 Drop: ${p.name}` : `📦 PUDO: ${p.name}`;
        recMk.bindTooltip(recLabel, {
          direction: "bottom",
          permanent: true,
          className: "map-label-pudo-rec",
          offset: [0, 8]
        });
        const srcNote = p.source === "osm" ? "Koordinat & alamat: OpenStreetMap (ODbL)" : "Koordinat: asumsi tim";
        recMk.bindPopup(
          `<strong>${p.name}</strong> · ${p.partner}<br/>` +
            `<span style="opacity:.85">${PUDO_KIND_META[p.kind]?.label ?? "Mitra"}</span><br/>` +
            `${isCourier ? "Titik drop paket rekomendasi" : "Titik ambil/bayar paket"}<br/>` +
            `<span style="opacity:.8">${p.address}</span><br/>` +
            `Jam layanan ${p.hours} · kapasitas ${p.capacityPerDay} paket/hari<br/>` +
            `<span style="opacity:.7;font-size:11px">${p.city} · ${p.region} · ${srcNote}</span>` +
            `<br/>Jarak dari tujuan ± ${dropRec.distanceKm} km · ETA ± ${dropRec.etaMin} menit`
        );
      }

      for (const p of pudos) {
        if (recId && p.id === recId) continue;
        const ks = pudoKindStyle(p.kind);
        const mk = L.circleMarker(p.coord as unknown as LeafletNS.LatLngExpression, {
          radius: 7,
          color: ks.color,
          weight: 2,
          fillColor: ks.fill,
          fillOpacity: 0.85,
          dashArray: "2 3",
        }).addTo(map);
        const kindLabel = PUDO_KIND_META[p.kind]?.label ?? "Mitra";
        mk.bindTooltip(`🏪 ${p.name} (${kindLabel})`, {
          direction: "top",
          permanent: false,
          className: "map-label-pudo"
        });
        const srcNote = p.source === "osm" ? "Koordinat & alamat: OpenStreetMap (ODbL)" : "Koordinat: asumsi tim";
        mk.bindPopup(
          `<strong>${p.name}</strong> · ${p.partner}<br/>` +
            `<span style="opacity:.85">${kindLabel}</span><br/>` +
            `Titik ambil/bayar paket<br/>` +
            `<span style="opacity:.8">${p.address}</span><br/>` +
            `Jam layanan ${p.hours} · kapasitas ${p.capacityPerDay} paket/hari<br/>` +
            `<span style="opacity:.7;font-size:11px">${p.city} · ${p.region} · ${srcNote}</span>`
        );
      }

      // Garis rekomendasi: tujuan penerima → PUDO terdekat.
      if (dropRec) {
        L.polyline(dropRec.route as unknown as LeafletNS.LatLngExpression[], { color: "#7c3aed", weight: 4, opacity: 0.85, dashArray: "5 7" }).addTo(map);
      }

      map.fitBounds(rgeo.route as unknown as LeafletNS.LatLngBoundsExpression, { padding: [48, 48] });

      setTimeout(() => {
        if (map && !disposed) {
          map.invalidateSize();
        }
      }, 150);

      paint(progress);

      // Simpan pembersih tema; dibuang saat peta dibangun ulang / komponen dibongkar.
      cleanupTheme = unsubTheme;
    })();
  }

  function teardownMap() {
    if (simAnimId) cancelAnimationFrame(simAnimId);
    simAnimId = null;
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
      if (simAnimId) cancelAnimationFrame(simAnimId);
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

  // Bangun ulang peta saat identitas rute berubah (city/showPudo/role/simDiverted), saat
  // Route Intelligence berubah (kandidat/jalur terpilih/kepadatan), & saat el siap.
  $effect(() => {
    const ident = `${city}|${showPudo}|${role}|${routeIntel ? selectedKey ?? "" : ""}|${candidates.length}|${simDiverted}`;
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

  // Kurir bergerak ketika progress berubah dari luar (hanya jika simulasi internal tidak berjalan).
  $effect(() => {
    if (!simPlaying) {
      simProgress = progress;
      paint(progress);
    }
  });

</script>

<div class="relative isolate z-0 w-full overflow-hidden rounded-2xl border border-border {typeof height === 'string' && height.includes('%') ? 'h-full' : ''}" style="height:{heightStyle}">
  <div
    bind:this={mapEl}
    aria-label={`Peta pengantaran: titik awal ${originLabel}, titik tujuan ${destLabel}, posisi kurir bergerak mengikuti jalan${showPudo ? ", serta titik PUDO mitra dan rekomendasi drop terdekat" : ""}`}
    role="application"
    class="absolute inset-0"
  ></div>

  {#if expandable}
    <!-- Tombol perbesar → peta modal layar-penuh -->
    <button
      type="button"
      onclick={openFullscreen}
      aria-label="Perbesar peta ke layar penuh"
      title="Perbesar peta (layar penuh)"
      class="absolute right-2.5 top-2.5 z-[1000] inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/90 px-3 py-1.5 text-[12px] font-semibold text-foreground shadow-pop backdrop-blur transition-all hover:bg-accent hover:scale-[1.02]"
    >
      <Icon name="layers" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" />
      <span>Perbesar</span>
    </button>
  {/if}
</div>

<!-- ── Widget 1: Bilah Kontrol & Telemetri Simulasi Pengantaran Riil (Di Luar Peta) ── -->
{#if showSimulation}
  <div
    class="mt-3 rounded-2xl border border-border bg-card/90 p-3 text-[12px] shadow-sm backdrop-blur transition-all"
    role="region"
    aria-label="Kontrol simulasi pengantaran riil"
  >
    <!-- Header Widget: Judul, Status Live, dan Tombol Buka/Tutup -->
    <div class="flex items-center justify-between gap-2 border-b border-border pb-2">
      <div class="flex items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="route" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" />
        </span>
        <div class="flex items-center gap-2">
          <span class="font-bold text-foreground">Simulasi Pengantaran Riil</span>
          <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[9.5px] font-semibold text-muted-foreground">
            <span class="h-1.5 w-1.5 rounded-full {simPlaying ? 'bg-success animate-ping' : 'bg-muted-foreground'}"></span>
            {simPlaying ? "BERJALAN" : "SIAP"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onclick={() => (simWidgetOpen = !simWidgetOpen)}
        aria-expanded={simWidgetOpen}
        aria-controls="sim-control-body"
        aria-label={simWidgetOpen ? "Tutup bilah simulasi" : "Buka bilah simulasi"}
        class="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {#if simWidgetOpen}
          <Icon name="x" cls="h-3 w-3" weight="bold" /> Tutup Bilah Simulasi
        {:else}
          <Icon name="route" cls="h-3 w-3 text-[var(--bitcoin)]" /> Buka Bilah Simulasi
        {/if}
      </button>
    </div>

    {#if simWidgetOpen}
      <div id="sim-control-body" class="mt-2.5 space-y-2">
        <!-- Baris 1: Kontrol Playback, Kecepatan, dan Speedometer -->
        <div class="flex flex-wrap items-center justify-between gap-1.5">
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onclick={toggleSimPlay}
              aria-label={simPlaying ? "Jeda simulasi pengantaran" : "Mulai simulasi pengantaran"}
              class="inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold shadow-sm transition-all {simPlaying ? 'bg-warning text-warning-foreground animate-pulse' : 'bg-primary text-primary-foreground hover:opacity-90'}"
            >
              {#if simPlaying}
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-current"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                <span>Jeda</span>
              {:else}
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-current"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                <span>{simProgress >= 1 ? "Ulangi" : "Simulasi"}</span>
              {/if}
            </button>

            <button
              type="button"
              onclick={resetSim}
              aria-label="Reset simulasi"
              title="Reset ke titik awal"
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-none stroke-current stroke-2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>

            <!-- Pilihan Kecepatan -->
            <div class="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 font-mono text-[10.5px]">
              {#each [1, 2, 5, 10] as sp}
                <button
                  type="button"
                  onclick={() => (simSpeed = sp)}
                  aria-pressed={simSpeed === sp}
                  class="rounded px-1.5 py-0.5 font-semibold transition-colors {simSpeed === sp ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
                >
                  {sp}×
                </button>
              {/each}
            </div>
          </div>

          <!-- Telemetri Cepat: Kecepatan & Progres -->
          <div class="flex items-center gap-1.5">
            <span class="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10.5px] font-semibold tabular-nums text-foreground">
              <span class="h-2 w-2 rounded-full {simPlaying ? 'bg-success animate-ping' : 'bg-muted-foreground'}"></span>
              {simTelemetry.speedKmh} km/j
            </span>
            <span class="hidden font-mono text-[10.5px] text-muted-foreground sm:inline">
              {Math.round(simProgress * 100)}% · {simTelemetry.distanceDoneKm}/{simTelemetry.distanceTotalKm} km
            </span>
            <button
              type="button"
              onclick={() => (simPanelExpanded = !simPanelExpanded)}
              aria-expanded={simPanelExpanded}
              class="inline-flex items-center gap-1 rounded-lg border border-border px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon name="trend" cls="h-3 w-3" /> {simPanelExpanded ? "Ringkas" : "Rincian"}
            </button>
          </div>
        </div>

        <!-- Scrubber Progres Jalur Rute -->
        <div class="flex items-center gap-2 pt-0.5">
          <span class="font-mono text-[9.5px] text-muted-foreground">Hub</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={simProgress}
            oninput={handleScrub}
            aria-label="Scrubber posisi kurir sepanjang rute"
            class="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
          />
          <span class="font-mono text-[9.5px] text-muted-foreground">{simDiverted ? "PUDO" : city}</span>
        </div>

        <!-- Detail Telemetri & Kondisi Lapangan -->
        {#if simPanelExpanded}
          <div class="space-y-2 border-t border-border pt-2 text-[11px]">
            <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <div class="rounded-lg bg-muted/40 px-2 py-1.5">
                <span class="block text-[9.5px] uppercase tracking-wider text-muted-foreground">ETA Tersisa</span>
                <span class="font-mono font-semibold text-foreground">~{simTelemetry.etaRemainingMin} mnt</span>
              </div>
              <div class="rounded-lg bg-muted/40 px-2 py-1.5">
                <span class="block text-[9.5px] uppercase tracking-wider text-muted-foreground">Sisa Jarak</span>
                <span class="font-mono font-semibold text-foreground">{simTelemetry.distanceRemainingKm} km</span>
              </div>
              <div class="rounded-lg bg-muted/40 px-2 py-1.5">
                <span class="block text-[9.5px] uppercase tracking-wider text-muted-foreground">Baterai EV</span>
                <span class="font-mono font-semibold text-success-foreground">🔋 {simTelemetry.batteryPct}%</span>
              </div>
              <div class="rounded-lg bg-muted/40 px-2 py-1.5">
                <span class="block text-[9.5px] uppercase tracking-wider text-muted-foreground">Hemat CO₂</span>
                <span class="font-mono font-semibold text-primary">{simTelemetry.co2SavedG} g</span>
              </div>
            </div>

            <!-- Segmen Jalan & Milestone Event -->
            <div class="flex items-center justify-between rounded-lg bg-accent/30 px-2.5 py-1.5">
              <span class="flex items-center gap-1.5 truncate font-medium text-foreground">
                <Icon name="compass" cls="h-3.5 w-3.5 text-primary shrink-0" />
                <span class="truncate">{simTelemetry.phase}</span>
              </span>
              {#if simTelemetry.event}
                <span class="hidden truncate text-[10.5px] italic text-muted-foreground md:inline">{simTelemetry.event}</span>
              {/if}
            </div>

            <!-- Kondisi Cuaca, Macet, dan Skenario Reroute PUDO -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10.5px] text-muted-foreground">Cuaca:</span>
                  <button
                    type="button"
                    onclick={() => (simWeather = simWeather === "cerah" ? "hujan" : "cerah")}
                    class="rounded-md border border-border px-2 py-0.5 text-[10.5px] font-semibold transition-colors {simWeather === 'hujan' ? 'bg-primary/15 text-primary border-primary/40' : 'bg-card text-foreground'}"
                  >
                    {simWeather === "hujan" ? "🌧️ Hujan" : "☀️ Cerah"}
                  </button>
                </div>

                <div class="flex items-center gap-1.5">
                  <span class="text-[10.5px] text-muted-foreground">Lalin:</span>
                  <button
                    type="button"
                    onclick={() => (simTraffic = simTraffic === "lancar" ? "macet" : "lancar")}
                    class="rounded-md border border-border px-2 py-0.5 text-[10.5px] font-semibold transition-colors {simTraffic === 'macet' ? 'bg-destructive/15 text-destructive-foreground border-destructive/40' : 'bg-card text-foreground'}"
                  >
                    {simTraffic === "macet" ? "🔴 Macet" : "🟢 Lancar"}
                  </button>
                </div>
              </div>

              {#if showPudo && dropRec}
                <button
                  type="button"
                  onclick={toggleDivertPudo}
                  aria-pressed={simDiverted}
                  class="rounded-md border px-2.5 py-0.5 text-[10.5px] font-semibold transition-all {simDiverted ? 'border-purple-500 bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold' : 'border-border text-foreground hover:bg-accent'}"
                >
                  {simDiverted ? "✓ Rute ke PUDO" : "Alihkan PUDO"}
                </button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<!-- ── Widget 2: Analisis Jalur Tercepat / Route Intelligence (Di Luar Peta) ── -->
{#if routeIntel && !compact}
  <div
    class="mt-3 rounded-2xl border border-border bg-card/90 p-3.5 text-[12px] shadow-sm backdrop-blur transition-all"
    role="region"
    aria-label="Panel jalur tercepat route intelligence"
  >
    <!-- Header Widget Route Intelligence: Judul + Penghematan + Tombol Buka/Tutup -->
    <div class="flex items-center justify-between gap-2 border-b border-border pb-2">
      <div class="flex items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="compass" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" />
        </span>
        <div class="flex items-center gap-2">
          <span class="font-bold text-foreground">Jalur tercepat</span>
          {#if plan}
            <span class="rounded-full border border-[color-mix(in_oklab,var(--bitcoin)_40%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_10%,transparent)] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--bitcoin)]">−{plan.summary.timeSavedMin} mnt</span>
          {/if}
        </div>
      </div>

      <button
        type="button"
        onclick={() => (routeIntelOpen = !routeIntelOpen)}
        aria-expanded={routeIntelOpen}
        aria-controls="route-intel-body"
        aria-label={routeIntelOpen ? "Tutup jalur tercepat" : "Buka jalur tercepat"}
        class="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {#if routeIntelOpen}
          <Icon name="x" cls="h-3 w-3" weight="bold" /> Tutup Jalur Tercepat
        {:else}
          <Icon name="compass" cls="h-3 w-3 text-[var(--bitcoin)]" /> Buka Jalur Tercepat
        {/if}
      </button>
    </div>

    {#if routeIntelOpen}
      <div id="route-intel-body" class="mt-2.5 space-y-2.5">
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
          <button type="button" onclick={() => (density = null)} class="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Reset ke profil kasus</button>

          <!-- Daftar kandidat jalur -->
          <ul class="space-y-1.5">
            {#each candidates as c (c.key)}
              <li>
                <button
                  type="button"
                  onclick={() => (selectedKey = c.key)}
                  aria-pressed={selectedKey === c.key}
                  class="flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors {selectedKey === c.key ? 'border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_10%,transparent)]' : 'border-border hover:bg-muted/50'}"
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
            <p class="rounded-lg bg-muted/50 px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <span class="font-medium text-foreground">Dipilih: {selected.label}.</span>
              ETA {selected.timeMin} mnt · Rp{new Intl.NumberFormat("id-ID").format(selected.costIdr)} · {selected.co2G} g CO₂. Keandalan {(selected.reliability * 100).toFixed(0)}%.
            </p>
          {/if}
          <p class="text-[10px] italic text-muted-foreground">Kepadatan/kecepatan/biaya = asumsi tim; bukan data lalu lintas live.</p>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<!-- ── Informasi Legenda di Luar Peta (Clean Map Architecture) ── -->
{#if showLegend}
  <div class="mt-2.5 rounded-xl border border-border bg-card/80 p-3 text-[12px] shadow-sm backdrop-blur">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" />
        </span>
        <div>
          <span class="font-bold text-foreground">Legenda peta</span>
          <span class="ml-2 hidden rounded-full bg-muted px-2 py-0.5 font-mono text-[9.5px] text-muted-foreground sm:inline">
            Semua penanda terlabel langsung di peta
          </span>
        </div>
      </div>
      <button
        type="button"
        onclick={() => (legendOpen = !legendOpen)}
        aria-expanded={legendOpen}
        aria-controls="map-legend-panel"
        aria-label={legendOpen ? "Tutup legenda peta" : "Buka legenda peta"}
        class="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {#if legendOpen}
          <Icon name="x" cls="h-3 w-3" weight="bold" /> Tutup legenda peta
        {:else}
          <Icon name="map" cls="h-3 w-3 text-[var(--bitcoin)]" /> Buka legenda peta
        {/if}
      </button>
    </div>

    {#if legendOpen}
      <div id="map-legend-panel" class="mt-2.5 space-y-2.5 border-t border-border pt-2.5">
        <!-- Penanda Titik -->
        <div>
          <p class="mb-1.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Penanda Titik pada Peta</p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
              <span class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#16a34a] bg-[#dcfce7]"></span>
              <div class="min-w-0">
                <p class="truncate text-[11.5px] font-semibold text-foreground">Hub asal</p>
                <p class="truncate text-[10.5px] text-muted-foreground">{originLabel}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
              <span class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#2563eb] bg-[#dbeafe]"></span>
              <div class="min-w-0">
                <p class="truncate text-[11.5px] font-semibold text-foreground">Kurir</p>
                <p class="truncate text-[10.5px] text-muted-foreground">Posisi saat ini &amp; telemetri bergerak</p>
              </div>
            </div>

            <div class="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
              <span class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#f7931a] bg-[#fde4d8]"></span>
              <div class="min-w-0">
                <p class="truncate text-[11.5px] font-semibold text-foreground">Tujuan</p>
                <p class="truncate text-[10.5px] text-muted-foreground">{destLabel}</p>
              </div>
            </div>

            {#if showPudo && pudos.length > 0}
              <div class="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                <span class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#8b5cf6] bg-[#ddd6fe]"></span>
                <div class="min-w-0">
                  <p class="truncate text-[11.5px] font-semibold text-foreground">PUDO mitra</p>
                  <p class="truncate text-[10.5px] text-muted-foreground">Titik ambil/bayar alternatif</p>
                </div>
              </div>

              {#if dropRec}
                <div class="flex items-center gap-2 rounded-lg border border-[#7c3aed]/30 bg-[#ede9fe]/30 px-2.5 py-1.5 dark:bg-[#ede9fe]/10">
                  <span class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#7c3aed] bg-[#ede9fe]"></span>
                  <div class="min-w-0">
                    <p class="truncate text-[11.5px] font-semibold text-foreground">
                      {isCourier ? "Titik drop paket rekomendasi" : "PUDO terdekat"}
                    </p>
                    <p class="truncate text-[10.5px] text-muted-foreground">{dropRec.pudo.name} (±{dropRec.distanceKm} km · ETA ±{dropRec.etaMin} mnt)</p>
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        </div>

        <!-- Garis Rute & Kategori Mitra -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2 text-[11px]">
          <div class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Garis Rute:</span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-0.5 w-5 rounded bg-[#94a3b8]"></span>
              <span class="text-muted-foreground">Rencana rute (penuh)</span>
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="h-1 w-5 rounded bg-[#16a34a]"></span>
              <span class="text-muted-foreground">Sudah ditempuh</span>
            </span>
            {#if routeIntel}
              <span class="inline-flex items-center gap-1.5">
                <span class="h-1 w-5 rounded bg-[var(--bitcoin)]"></span>
                <span class="text-muted-foreground">Jalur terpilih (tebal)</span>
              </span>
            {/if}
          </div>

          {#if showPudo && pudos.length > 0}
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Kategori Mitra:</span>
              {#each kindCounts() as kc (kc.kind)}
                <span class="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                  <span class="h-2.5 w-2.5 rounded-full border" style="border-color:{kc.color};background:{kc.fill}"></span>
                  <span>{kc.label} <b>· {kc.count}</b></span>
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Atribusi Sumber & Catatan -->
        <p class="border-t border-border pt-1.5 text-[10px] italic leading-snug text-muted-foreground">
          Jaringan PUDO nasional: {PUDO_POINTS.length} titik mitra · {pudoCityCount()} kota di 6 region. Ubin peta © OpenStreetMap (ODbL);
          koordinat &amp; alamat diverifikasi dari OpenStreetMap; jam layanan &amp; kapasitas = asumsi operasional.
        </p>
      </div>
    {/if}
  </div>
{/if}

{#if expandable && fullscreen}
  <!-- Modal peta layar penuh: pop up modal dengan kontrol open/close -->
  <div
    class="fixed inset-0 z-[10000] flex flex-col bg-background/98 backdrop-blur-md animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
    aria-label={`Peta layar penuh: ${originLabel} ke ${destLabel}`}
    tabindex="-1"
  >
    <!-- Header Modal -->
    <div class="flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Icon name="map" cls="h-4 w-4" />
        </span>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="truncate text-sm font-bold text-foreground">Peta pengantaran — layar penuh</h2>
            <span class="hidden rounded-full bg-success/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-success-foreground sm:inline">
              Mode Penuh
            </span>
          </div>
          <p class="truncate text-xs text-muted-foreground">{originLabel} → {destLabel}{role ? ` · ${role}` : ""}</p>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onclick={() => (legendOpenFs = !legendOpenFs)}
          aria-expanded={legendOpenFs}
          aria-controls="modal-legend-aside"
          class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          <Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" />
          <span>{legendOpenFs ? "Sembunyikan legenda" : "Tampilkan legenda"}</span>
        </button>

        <button
          type="button"
          onclick={closeFullscreen}
          aria-label="Tutup peta layar penuh"
          title="Tutup peta layar penuh (Esc)"
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive-foreground"
        >
          <Icon name="x" cls="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Body Modal: Peta Layar Penuh + Panel Samping Legenda -->
    <div class="relative flex min-h-0 flex-1 overflow-hidden">
      <!-- Area Peta Full Screen -->
      <div class="relative h-full min-w-0 flex-1">
        {#key fullscreen}
          <DeliveryMap
            {progress}
            {city}
            {originLabel}
            {destLabel}
            {etaMin}
            height="100%"
            {role}
            {showPudo}
            {routeIntel}
            expandable={false}
            showLegend={false}
            showSimulation={showSimulation}
            compact={false}
          />
        {/key}
      </div>

      <!-- Panel Samping Legenda Modal (bisa dibuka / ditutup) -->
      {#if legendOpenFs}
        <aside
          id="modal-legend-aside"
          class="w-[20rem] max-w-[40vw] shrink-0 overflow-y-auto border-l border-border bg-card p-4 text-[12px] shadow-xl"
        >
          <div class="mb-3 flex items-center justify-between gap-2 border-b border-border pb-2.5">
            <p class="flex items-center gap-1.5 font-bold text-foreground">
              <Icon name="map" cls="h-4 w-4 text-[var(--bitcoin)]" weight="bold" />
              Legenda peta
            </p>
            <button
              type="button"
              onclick={() => (legendOpenFs = false)}
              aria-label="Tutup legenda peta"
              title="Tutup panel legenda"
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon name="x" cls="h-3.5 w-3.5" weight="bold" />
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <p class="mb-1.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Penanda Titik</p>
              <ul class="space-y-2">
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#16a34a] bg-[#dcfce7]"></span>
                  <div>
                    <b class="text-foreground">Hub asal</b>
                    <p class="text-[11px] text-muted-foreground">{originLabel}</p>
                  </div>
                </li>
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#2563eb] bg-[#dbeafe]"></span>
                  <div>
                    <b class="text-foreground">Kurir</b>
                    <p class="text-[11px] text-muted-foreground">Posisi saat ini &amp; telemetri bergerak</p>
                  </div>
                </li>
                <li class="flex items-start gap-2">
                  <span class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#f7931a] bg-[#fde4d8]"></span>
                  <div>
                    <b class="text-foreground">Tujuan</b>
                    <p class="text-[11px] text-muted-foreground">{destLabel}</p>
                  </div>
                </li>
                {#if showPudo && pudos.length > 0}
                  <li class="flex items-start gap-2">
                    <span class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#8b5cf6] bg-[#ddd6fe]"></span>
                    <div>
                      <b class="text-foreground">PUDO mitra</b>
                      <p class="text-[11px] text-muted-foreground">Titik ambil/bayar alternatif</p>
                    </div>
                  </li>
                  {#if dropRec}
                    <li class="flex items-start gap-2">
                      <span class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#7c3aed] bg-[#ede9fe]"></span>
                      <div>
                        <b class="text-foreground">{isCourier ? "Drop rekomendasi" : "PUDO terdekat"}</b>
                        <p class="text-[11px] text-muted-foreground">{dropRec.pudo.name} · ±{dropRec.distanceKm} km</p>
                      </div>
                    </li>
                  {/if}
                {/if}
              </ul>
            </div>

            <div class="border-t border-border pt-2.5">
              <p class="mb-1.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Garis rute</p>
              <ul class="space-y-1.5">
                <li class="flex items-center gap-2"><span class="h-0.5 w-6 shrink-0 rounded bg-[#94a3b8]"></span> <span>Rencana rute (penuh)</span></li>
                <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[#16a34a]"></span> <span>Sudah ditempuh</span></li>
                {#if routeIntel}
                  <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[var(--bitcoin)]"></span> <span>Jalur terpilih (tebal)</span></li>
                {/if}
              </ul>
            </div>

            <p class="border-t border-border pt-2.5 text-[10px] italic leading-snug text-muted-foreground">
              Ubin peta © OpenStreetMap (ODbL). Jam/kapasitas & kepadatan = asumsi tim (prototipe).
            </p>
          </div>
        </aside>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(.leaflet-tooltip.map-label-hub),
  :global(.leaflet-tooltip.map-label-courier),
  :global(.leaflet-tooltip.map-label-dest),
  :global(.leaflet-tooltip.map-label-pudo-rec),
  :global(.leaflet-tooltip.map-label-pudo) {
    background: #ffffff !important;
    color: #0f172a !important;
    border: 1px solid #cbd5e1 !important;
    box-shadow: 0 4px 10px -1px rgba(0, 0, 0, 0.15) !important;
    border-radius: 6px !important;
    padding: 3px 8px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
    pointer-events: none !important;
  }

  :global(.dark .leaflet-tooltip.map-label-hub),
  :global(.dark .leaflet-tooltip.map-label-courier),
  :global(.dark .leaflet-tooltip.map-label-dest),
  :global(.dark .leaflet-tooltip.map-label-pudo-rec),
  :global(.dark .leaflet-tooltip.map-label-pudo) {
    background: #18181b !important;
    color: #f4f4f5 !important;
    border: 1px solid #3f3f46 !important;
    box-shadow: 0 4px 12px -1px rgba(0, 0, 0, 0.5) !important;
  }

  :global(.leaflet-tooltip.map-label-hub) {
    border-color: #16a34a !important;
    color: #15803d !important;
  }
  :global(.dark .leaflet-tooltip.map-label-hub) {
    border-color: #22c55e !important;
    color: #4ade80 !important;
  }

  :global(.leaflet-tooltip.map-label-courier) {
    border-color: #2563eb !important;
    color: #1d4ed8 !important;
  }
  :global(.dark .leaflet-tooltip.map-label-courier) {
    border-color: #3b82f6 !important;
    color: #60a5fa !important;
  }

  :global(.leaflet-tooltip.map-label-dest) {
    border-color: #f97316 !important;
    color: #c2410c !important;
  }
  :global(.dark .leaflet-tooltip.map-label-dest) {
    border-color: #f97316 !important;
    color: #fb923c !important;
  }

  :global(.leaflet-tooltip.map-label-pudo-rec) {
    border-color: #7c3aed !important;
    color: #6d28d9 !important;
  }
  :global(.dark .leaflet-tooltip.map-label-pudo-rec) {
    border-color: #8b5cf6 !important;
    color: #c4b5fd !important;
  }

  :global(.leaflet-tooltip-top:before) {
    border-top-color: #cbd5e1 !important;
  }
  :global(.dark .leaflet-tooltip-top:before) {
    border-top-color: #3f3f46 !important;
  }
  :global(.leaflet-tooltip-bottom:before) {
    border-bottom-color: #cbd5e1 !important;
  }
  :global(.dark .leaflet-tooltip-bottom:before) {
    border-bottom-color: #3f3f46 !important;
  }
</style>
