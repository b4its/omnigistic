<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import { themeStore } from "$lib/stores/theme";
  import { ROUTE_COORDS } from "$lib/map/route";
  import { OSM_TILE, DARK_TILE_FILTER } from "$lib/map/tiles";
  import { CITY_ROUTES, pudosForCity } from "$lib/logistics";
  import Icon from "$lib/components/Icon.svelte";

  let { demo = true }: { demo?: boolean } = $props();

  let mapEl = $state<HTMLElement | undefined>();
  /** Legenda peta: terbuka default (collapsible). */
  let legendOpen = $state(true);
  let map: L.Map | null = null;

  const origin = { lat: -6.2088, lng: 106.8456 }; // Jakarta (hub)
  const locations = [
    { key: "Cibinong", lat: -6.4817, lng: 106.8526, label: "Cibinong", city: "Kab. Bogor", score: 3 },
    { key: "Depok", lat: -6.4035, lng: 106.8174, label: "Sukamaju", city: "Kota Depok", score: 0 },
    { key: "Tangsel", lat: -6.2934, lng: 106.7551, label: "Rempoa", city: "Tangerang Selatan", score: 1 }
  ];
  const target = locations[0];
  // ETA dari SATU sumber kebenaran (logistics.ts) — hilangkan hardcode 75 yang
  // bertentangan dgn 96 (logistics) & 36 (route.ts).
  const etaMin = CITY_ROUTES.Bogor.durationMin;

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

    map = L.map(el, { worldCopyJump: true, zoomControl: true }).setView([-6.4, 106.8], 10);

    // Tile OpenStreetMap — gratis, open-source, lengkap (tanpa API key).
    L.tileLayer(OSM_TILE.url, { maxZoom: OSM_TILE.maxZoom, attribution: OSM_TILE.attribution, crossOrigin: true }).addTo(map);

    // Mode gelap: filter CSS pada tile OSM (bukan penyedia pihak ketiga).
    const applyDark = (dark: boolean) => {
      const pane = map?.getPane("tilePane");
      if (pane) pane.style.filter = dark ? DARK_TILE_FILTER : "";
    };
    applyDark(get(themeStore) === "dark");
    const unsubTheme = themeStore.subscribe((t) => applyDark(t === "dark"));

    // origin marker (vector, hindari 404 marker-icon.png)
    const originMk = L.circleMarker(origin, { radius: 9, color: "#16a34a", fillColor: "#dcfce7", fillOpacity: 0.7, weight: 2 }).addTo(map);
    originMk.bindTooltip(m.addt1(), { permanent: false, direction: "top" });

    // 3 kandidat alamat ambigu
    for (const loc of locations) {
      const mk = L.circleMarker([loc.lat, loc.lng], {
        radius: loc.key === "Cibinong" ? 11 : 8,
        color: loc.key === "Cibinong" ? "#f7931a" : "#7f8c8d",
        weight: loc.key === "Cibinong" ? 4 : 2,
        fillColor: loc.key === "Cibinong" ? "#f7931a" : "#95a5a6",
        fillOpacity: 0.85
      }).addTo(map);
      const km = Math.round(haversine(origin, loc) * 10) / 10;
      mk.bindTooltip(`${loc.city} — ${loc.label} · ~${km} km`, { direction: "top", permanent: false });
    }

    // Titik PUDO mitra area Jabodetabek (informasi alternatif drop/ambil).
    for (const p of [...pudosForCity("Jakarta"), ...pudosForCity("Bogor"), ...pudosForCity("Depok")]) {
      const mk = L.circleMarker(p.coord as unknown as L.LatLngExpression, {
        radius: 6,
        color: "#8b5cf6",
        weight: 2,
        fillColor: "#ddd6fe",
        fillOpacity: 0.9,
        dashArray: "2 3"
      }).addTo(map);
      mk.bindTooltip(`PUDO · ${p.name} (${p.partner})`, { direction: "top" });
      mk.bindPopup(`<strong>${p.name}</strong> · ${p.partner}<br/>${p.city} · jam ${p.hours}`);
    }
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
          moving.setTooltipContent(m.add2t1()).openTooltip();
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
  <div bind:this={mapEl} aria-label={m.ax29({ eta: etaMin })} role="application" class="absolute inset-0"></div>
  <!-- Legenda peta lengkap & rinci (collapsible) -->
  <div class="absolute right-2 top-2 z-[1000] max-w-[min(16rem,calc(100%-1rem))] rounded-lg border border-border bg-background/92 text-[12px] shadow-pop backdrop-blur">
    <button
      type="button"
      onclick={() => (legendOpen = !legendOpen)}
      aria-expanded={legendOpen}
      aria-controls="addr-legend"
      class="flex w-full items-center justify-between gap-2 px-3 py-2 font-semibold text-foreground"
    >
      <span class="flex items-center gap-1.5"><Icon name="map" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" weight="bold" /> {m.am4t1()}</span>
      <Icon name={legendOpen ? "caret-down" : "arrow-right"} cls="h-3 w-3 shrink-0 text-muted-foreground" weight="bold" />
    </button>
    {#if legendOpen}
      <div id="addr-legend" class="max-h-[58%] space-y-2 overflow-y-auto border-t border-border px-3 py-2.5">
        <p class="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Penanda</p>
        <ul class="space-y-1.5">
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#16a34a] bg-[#dcfce7]"></span> <span><b class="text-foreground">{m.am3f1()}</b> · {m.am4t2()}</span></li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#f7931a] bg-[#f7931a]"></span> <span><b class="text-foreground">{m.am3f2()}</b> (target benar)</span></li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#7f8c8d] bg-[#95a5a6]"></span> <span>Kandidat ambigu lain (skor rendah)</span></li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border-2 border-[#8b5cf6] bg-[#ddd6fe]"></span> <span>{m.am4t3()}</span></li>
        </ul>
        <p class="pt-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Garis</p>
        <ul class="space-y-1.5">
          <li class="flex items-center gap-2"><span class="h-1 w-6 shrink-0 rounded bg-[#16a34a]"></span> <span>{m.am3f3()}</span></li>
        </ul>
        <p class="border-t border-border pt-2 text-[10px] italic leading-snug text-muted-foreground">
          Ubin © OpenStreetMap. Rute ~{Math.round(routeTotal)} km · ETA ~{etaMin} {m.am3f4()}
        </p>
      </div>
    {/if}
  </div>
</div>
<p class="mt-2 text-[14px] text-muted-foreground">
  {m.am3f5()}{Math.round(routeTotal)} {m.am3f6()}{etaMin} {m.am3f7()}
</p>
