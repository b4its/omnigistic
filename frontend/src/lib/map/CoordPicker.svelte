<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  /**
   * Pemilih Titik Koordinat Pengantaran (Leaflet)
   *
   * Memberikan kemampuan interaktif bagi pembeli untuk menentukan titik presisi
   * pengantaran kurir di peta (bukan sekadar memilih kota umum).
   * Menghitung klaster wilayah terdekat secara otomatis dan mendukung sinkronisasi
   * dua arah dengan formulir checkout.
   */
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import type * as LeafletNS from "leaflet";
  import { themeStore } from "$lib/stores/theme";
  import { OSM_TILE, DARK_TILE_FILTER } from "$lib/map/tiles";
  import { CITIES, CITY_ROUTES, type City } from "$lib/logistics";
  import Icon from "$lib/components/Icon.svelte";

  interface Props {
    lat?: number | null;
    lng?: number | null;
    city?: string;
    onCoordChange?: (coords: { lat: number; lng: number; city: string }) => void;
  }

  let {
    lat = $bindable(null),
    lng = $bindable(null),
    city = $bindable("Jakarta"),
    onCoordChange
  }: Props = $props();

  let mapEl = $state<HTMLElement | undefined>();
  let map: LeafletNS.Map | null = null;
  let marker: LeafletNS.Marker | null = null;

  /** Deteksi klaster kota terdekat berdasarkan koordinat (lat, lng). */
  function findNearestCity(targetLat: number, targetLng: number): City {
    let closest: City = "Jakarta";
    let minD = Infinity;
    for (const c of CITIES) {
      const dest = CITY_ROUTES[c].dest;
      const dLat = (targetLat - dest[0]) * 111;
      const dLng = (targetLng - dest[1]) * 111 * Math.cos((targetLat * Math.PI) / 180);
      const d = Math.sqrt(dLat * dLat + dLng * dLng);
      if (d < minD) {
        minD = d;
        closest = c;
      }
    }
    return closest;
  }

  function setCoord(newLat: number, newLng: number, snapCity = true) {
    lat = Number(newLat.toFixed(5));
    lng = Number(newLng.toFixed(5));
    if (snapCity) {
      city = findNearestCity(lat, lng);
    }
    if (marker) {
      marker.setLatLng([lat, lng]);
      marker.setTooltipContent(`📍 Titik Antar: ${lat.toFixed(4)}, ${lng.toFixed(4)} (${city})`);
    }
    onCoordChange?.({ lat, lng, city });
  }

  export function jumpToCity(c: City) {
    city = c;
    const dest = CITY_ROUTES[c]?.dest ?? CITY_ROUTES.Jakarta.dest;
    setCoord(dest[0], dest[1], false);
    if (map) {
      map.flyTo([dest[0], dest[1]], 13, { duration: 0.6 });
    }
  }

  onMount(() => {
    let active = true;
    let unsubTheme = () => {};

    void (async () => {
      if (!mapEl) return;
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!active || !mapEl) return;

      const initialCity = (city as City) in CITY_ROUTES ? (city as City) : "Jakarta";
      const defaultCoord = CITY_ROUTES[initialCity]?.dest ?? CITY_ROUTES.Jakarta.dest;
      const curLat = lat ?? defaultCoord[0];
      const curLng = lng ?? defaultCoord[1];

      map = L.map(mapEl, {
        worldCopyJump: true,
        zoomControl: true,
        center: [curLat, curLng],
        zoom: 12
      });

      L.tileLayer(OSM_TILE.url, {
        maxZoom: OSM_TILE.maxZoom,
        attribution: OSM_TILE.attribution,
        crossOrigin: true
      }).addTo(map);

      const applyDark = (dark: boolean) => {
        const pane = map?.getPane("tilePane");
        if (pane) pane.style.filter = dark ? DARK_TILE_FILTER : "";
      };
      applyDark(get(themeStore) === "dark");
      unsubTheme = themeStore.subscribe((t) => applyDark(t === "dark"));

      // Custom divIcon untuk pin pengantaran presisi yang dapat digeser
      const pinIcon = L.divIcon({
        className: "custom-delivery-pin",
        html: `
          <div style="position:relative; transform: translate(-50%, -100%); cursor: grab; display: flex; flex-direction: column; align-items: center;">
            <div style="background:#f7931a; color:#fff; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; box-shadow:0 3px 8px rgba(0,0,0,0.35); white-space:nowrap; border:1.5px solid #fff; font-family:sans-serif;">
              📍 Titik Pengantaran
            </div>
            <div style="width:16px; height:16px; background:#f7931a; border:2.5px solid #fff; border-radius:50%; margin-top:2px; box-shadow:0 2px 5px rgba(0,0,0,0.35);"></div>
          </div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 46]
      });

      marker = L.marker([curLat, curLng], {
        icon: pinIcon,
        draggable: true
      }).addTo(map);

      marker.bindTooltip(`📍 Titik Antar: ${curLat.toFixed(4)}, ${curLng.toFixed(4)} (${initialCity})`, {
        direction: "top",
        permanent: false,
        offset: [0, -42]
      });

      marker.on("dragend", (e: LeafletNS.LeafletEvent) => {
        const dragEvent = e as LeafletNS.LeafletMouseEvent;
        const pos = (dragEvent.target as LeafletNS.Marker).getLatLng();
        setCoord(pos.lat, pos.lng, true);
      });

      map.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        setCoord(e.latlng.lat, e.latlng.lng, true);
      });

      // Update nilai awal bila belum terisi
      if (lat == null || lng == null) {
        setCoord(curLat, curLng, false);
      }
    })();

    return () => {
      active = false;
      unsubTheme();
      if (map) {
        map.remove();
        map = null;
      }
      marker = null;
    };
  });
</script>

<div class="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="space-y-0.5">
      <p class="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <Icon name="target" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" />
        {m.cp3f1()}
      </p>
      <p class="text-[11px] text-muted-foreground">
        {m.cp3f2()}
      </p>
    </div>
  </div>

  <!-- Pintasan Cepat Klaster Wilayah -->
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="text-[11px] font-medium text-muted-foreground">Pilih Klaster Cepat:</span>
    {#each CITIES as c (c)}
      <button
        type="button"
        onclick={() => jumpToCity(c)}
        class="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors {city === c ? 'bg-primary text-primary-foreground shadow-sm' : 'border border-border bg-background text-muted-foreground hover:text-foreground'}"
      >
        {c}
      </button>
    {/each}
  </div>

  <!-- Kanvas Peta Leaflet Interaktif -->
  <div class="relative isolate z-0 h-[280px] w-full overflow-hidden rounded-xl border border-border">
    <div bind:this={mapEl} class="absolute inset-0" aria-label={m.ax06()}></div>
  </div>

  <!-- HUD Status Titik Terpilih -->
  <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3.5 py-2 text-xs">
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-semibold text-foreground">Titik Presisi:</span>
      <span class="font-mono font-bold text-primary">
        {lat != null ? lat.toFixed(5) : "-"}, {lng != null ? lng.toFixed(5) : "-"}
      </span>
      <span class="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
        Klaster {city}
      </span>
    </div>
    <span class="text-[11px] text-muted-foreground italic">
      Ubin peta © OpenStreetMap (akurasi tingkat jalan)
    </span>
  </div>
</div>
