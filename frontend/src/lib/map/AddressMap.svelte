<script lang="ts">
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import { themeStore } from "$lib/stores/theme";
  import { api } from "$lib/api";
  import { ROUTE_COORDS } from "$lib/map/route";

  let { demo = true }: { demo?: boolean } = $props();

  let mapEl = $state<HTMLElement | undefined>();
  let map: L.Map | null = null;

  const origin = { lat: -6.2088, lng: 106.8456 }; // Jakarta (hub)
  const locations = [
    { key: "Cibinong", lat: -6.4817, lng: 106.8526, label: "Cibinong", city: "Kab. Bogor", score: 3 },
    { key: "Depok", lat: -6.4035, lng: 106.8174, label: "Sukamaju", city: "Kota Depok", score: 0 },
    { key: "Tangsel", lat: -6.2934, lng: 106.7551, label: "Rempoa", city: "Tangerang Selatan", score: 1 }
  ];
  const target = locations[0];
  const etaMin = 75; // ETA motor (bukan tol) menuju Cibinong

  type LL = [number, number];

  function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
    const R = 6371.0;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  // Rute jalan asli (OSRM). Fallback: garis lurus bila geometri kosong.
  const route: LL[] = ROUTE_COORDS.length > 1 ? ROUTE_COORDS : [[origin.lat, origin.lng], [target.lat, target.lng]];
  const segLen: number[] = [];
  for (let i = 1; i < route.length; i++) {
    const d = haversine({ lat: route[i - 1][0], lng: route[i - 1][1] }, { lat: route[i][0], lng: route[i][1] });
    segLen.push(d);
  }
  const routeTotal = segLen.reduce((s, d) => s + d, 0);

  /** Titik pada fraksi jarak t (0..1) di sepanjang polyline. */
  function pointAt(t: number): LL {
    if (routeTotal <= 0) return route[0];
    let dist = Math.max(0, Math.min(1, t)) * routeTotal;
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

  /** Sub-polyline dari awal sampai fraksi t, untuk efek "draw in" mengikuti jalan. */
  function sliceUpTo(t: number): LL[] {
    if (routeTotal <= 0) return route.slice();
    const dist = Math.max(0, Math.min(1, t)) * routeTotal;
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

  onMount(() => {
    if (!mapEl) return;
    const el = mapEl;

    // fallback offline: tetap render marker + path, tanpa tile
    const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
    const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";

    map = L.map(el, { worldCopyJump: true, zoomControl: true }).setView([-6.4, 106.8], 10);

    let basemap: L.TileLayer | null = null;
    const applyTiles = (dark: boolean) => {
      const url = dark ? TILE_DARK : TILE_LIGHT;
      const next = L.tileLayer(url, { maxZoom: 20, crossOrigin: true, errorTileUrl: "" });
      next.addTo(map!);
      if (basemap) map?.removeLayer(basemap);
      basemap = next;
    };
    applyTiles(get(themeStore) === "dark");

    const unsubTheme = themeStore.subscribe((t) => {
      map?.eachLayer((l) => {
        if (l instanceof L.TileLayer) map?.removeLayer(l);
      });
      applyTiles(t === "dark");
    });

    // origin marker (vector, hindari 404 marker-icon.png)
    const originMk = L.circleMarker(origin, { radius: 9, color: "#16a34a", fillColor: "#dcfce7", fillOpacity: 0.7, weight: 2 }).addTo(map);
    originMk.bindTooltip("Hub Jakarta (origin)", { permanent: false, direction: "top" });

    // 3 kandidat alamat ambigu
    for (const loc of locations) {
      const mk = L.circleMarker([loc.lat, loc.lng], {
        radius: loc.key === "Cibinong" ? 11 : 8,
        color: loc.key === "Cibinong" ? "#c14a21" : "#7f8c8d",
        weight: loc.key === "Cibinong" ? 4 : 2,
        fillColor: loc.key === "Cibinong" ? "#c14a21" : "#95a5a6",
        fillOpacity: 0.85
      }).addTo(map);
      const km = Math.round(haversine(origin, loc) * 10) / 10;
      mk.bindTooltip(`${loc.city} — ${loc.label} · ~${km} km`, { direction: "top", permanent: false });
    }
    void api;

    map.fitBounds(route as unknown as L.LatLngBoundsExpression, { padding: [40, 40] });

    // rute mengikuti jalan, digambar progresif
    const path = L.polyline([route[0]], { color: "#16a34a", weight: 4, opacity: 0.95 }).addTo(map);
    const moving = L.circleMarker([origin.lat, origin.lng], { radius: 8, color: "#16a34a", fillColor: "#dcfce7", fillOpacity: 1 }).addTo(map);

    const REDUCE = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    const TOTAL_STEPS = 360;

    function render(frac: number): void {
      const cur = pointAt(frac);
      path.setLatLngs(sliceUpTo(frac));
      moving.setLatLng(cur);
      const pct = Math.round(frac * 100);
      const km = Math.round(frac * routeTotal * 10) / 10;
      try {
        moving.bindTooltip(`ETA ~${etaMin} min · ${pct}% · ~${km} km`, { direction: "top", permanent: true }).openTooltip();
      } catch {
        /* noop */
      }
    }

    function tick(): void {
      render(t);
      if (t < 1) {
        t = Math.min(1, t + 1 / TOTAL_STEPS);
        raf = requestAnimationFrame(tick);
      } else {
        try {
          moving.setTooltipContent("Tiba: Jl. Raya Jakarta-Bogor No.12, Cibinong (target benar)").openTooltip();
        } catch {
          /* noop */
        }
      }
    }

    if (demo && !REDUCE) {
      raf = requestAnimationFrame(tick);
    } else {
      render(1);
    }

    return () => {
      unsubTheme();
      try {
        cancelAnimationFrame(raf);
      } catch {
        /* noop */
      }
      try {
        if (map) map.remove();
      } catch {
        /* noop */
      }
      map = null;
    };
  });
</script>

<div class="relative isolate z-0 h-[340px] w-full overflow-hidden rounded-2xl border border-border">
  <div bind:this={mapEl} aria-label="Peta Leaflet: 3 alamat ambigu, ML memetakan target, animasi kurir mengikuti rute jalan, ETA 75 menit" role="application" class="absolute inset-0"></div>
  <div class="pointer-events-none absolute right-2 top-2 z-[1000] rounded-lg border border-border bg-background/90 px-3 py-2 text-[13px] font-semibold shadow-pop">
    <span class="text-success-foreground">●</span> alamat benar · <span class="text-muted-foreground">○</span> kandidat salah
  </div>
</div>
<p class="mt-2 text-[14px] text-muted-foreground">
  Rute kurir mengikuti jalan (~{Math.round(routeTotal)} km) menuju Cibinong (Kab. Bogor) — ETA ~{etaMin} menit, dibandingkan 3 kandidat alamat ambigu.
</p>
