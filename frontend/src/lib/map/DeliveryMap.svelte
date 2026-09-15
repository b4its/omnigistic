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
  import { themeStore } from "$lib/stores/theme";
  import { ROUTE_COORDS } from "$lib/map/route";
  import { OSM_TILE, DARK_TILE_FILTER } from "$lib/map/tiles";

  interface Props {
    /** Fraksi perjalanan 0..1 (dikendalikan pemanggil). */
    progress?: number;
    originLabel?: string;
    destLabel?: string;
    etaMin?: number;
    height?: number;
  }

  let { progress = 0, originLabel = "Hub Jakarta", destLabel = "Alamat penerima", etaMin = 45, height = 360 }: Props = $props();

  let mapEl = $state<HTMLElement | undefined>();

  type LL = [number, number];

  const route: LL[] = ROUTE_COORDS;
  const ORIGIN: LL = route[0];
  const DEST: LL = route[route.length - 1];

  function haversine(a: LL, b: LL): number {
    const R = 6371.0;
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLng = ((b[1] - a[1]) * Math.PI) / 180;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  const segLen: number[] = [];
  for (let i = 1; i < route.length; i++) segLen.push(haversine(route[i - 1], route[i]));
  const routeTotal = segLen.reduce((s, d) => s + d, 0) || 1;

  function pointAt(t: number): LL {
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

  function sliceUpTo(t: number): LL[] {
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

  // Referensi layer agar bisa diperbarui dari $effect.
  let traveled: LeafletNS.Polyline | null = null;
  let courierMk: LeafletNS.CircleMarker | null = null;

  function paint(t: number) {
    if (!traveled || !courierMk) return;
    const frac = Math.max(0, Math.min(1, t));
    traveled.setLatLngs(sliceUpTo(frac) as unknown as LeafletNS.LatLngExpression[]);
    courierMk.setLatLng(pointAt(frac) as unknown as LeafletNS.LatLngExpression);
    const pct = Math.round(frac * 100);
    const km = Math.round(frac * routeTotal * 10) / 10;
    try {
      courierMk.setTooltipContent(frac >= 1 ? `Tiba · ${destLabel}` : `Kurir · ${pct}% · ~${km} km · ETA ~${Math.max(0, Math.round(etaMin * (1 - frac)))} mnt`);
    } catch {
      /* noop */
    }
  }

  onMount(() => {
    if (!mapEl) return;
    const el = mapEl;
    let disposed = false;
    let map: LeafletNS.Map | null = null;
    let cleanupTheme: (() => void) | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (disposed || !el) return;

      map = L.map(el, { worldCopyJump: true, zoomControl: true }).setView(DEST as unknown as LeafletNS.LatLngExpression, 11);

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
      L.polyline(route as unknown as LeafletNS.LatLngExpression[], { color: "#94a3b8", weight: 3, opacity: 0.55, dashArray: "6 8" }).addTo(map);

      // Garis jalur yang sudah ditempuh — solid.
      traveled = L.polyline([ORIGIN] as unknown as LeafletNS.LatLngExpression[], { color: "#16a34a", weight: 5, opacity: 0.95 }).addTo(map);

      // Titik awal (hub).
      L.circleMarker(ORIGIN as unknown as LeafletNS.LatLngExpression, { radius: 9, color: "#16a34a", fillColor: "#dcfce7", fillOpacity: 0.9, weight: 3 })
        .addTo(map)
        .bindTooltip(`Awal · ${originLabel}`, { direction: "top" });

      // Titik tujuan (pembeli).
      L.circleMarker(DEST as unknown as LeafletNS.LatLngExpression, { radius: 10, color: "#c14a21", fillColor: "#fde4d8", fillOpacity: 0.95, weight: 3 })
        .addTo(map)
        .bindTooltip(`Tujuan · ${destLabel}`, { direction: "top" });

      // Titik saat ini (kurir).
      courierMk = L.circleMarker(ORIGIN as unknown as LeafletNS.LatLngExpression, { radius: 8, color: "#2563eb", fillColor: "#dbeafe", fillOpacity: 1, weight: 3 }).addTo(map);
      courierMk.bindTooltip("Kurir", { direction: "top", permanent: true }).openTooltip();

      map.fitBounds(route as unknown as LeafletNS.LatLngBoundsExpression, { padding: [48, 48] });

      paint(progress);

      // Cleanup tema ketika komponen dibongkar.
      cleanupTheme = unsubTheme;
    })();

    return () => {
      disposed = true;
      cleanupTheme?.();
      traveled = null;
      courierMk = null;
      try {
        if (map) map.remove();
      } catch {
        /* noop */
      }
      map = null;
    };
  });

  // Kurir bergerak ketika progress berubah.
  $effect(() => {
    paint(progress);
  });
</script>

<div class="relative isolate z-0 w-full overflow-hidden rounded-2xl border border-border" style="height:{height}px">
  <div
    bind:this={mapEl}
    aria-label={`Peta pengantaran: titik awal ${originLabel}, titik tujuan ${destLabel}, posisi kurir bergerak mengikuti jalan`}
    role="application"
    class="absolute inset-0"
  ></div>
  <div class="pointer-events-none absolute left-2 top-2 z-[1000] flex flex-col gap-1 rounded-lg border border-border bg-background/90 px-3 py-2 text-[12px] font-medium shadow-pop">
    <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-[#16a34a]"></span> Titik awal (hub)</span>
    <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-[#2563eb]"></span> Posisi kurir</span>
    <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-[#c14a21]"></span> Titik tujuan</span>
  </div>
</div>
