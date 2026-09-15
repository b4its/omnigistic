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
  import { coordsForCity, HUB_LABEL, etaForCity, distanceForCity, pudosForCity, pudoDropRecommendation } from "$lib/logistics";
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
  }

  let { progress = 0, city = "Bogor", originLabel = HUB_LABEL, destLabel = "Alamat penerima", etaMin, height = 360, role = "", showPudo = true }: Props = $props();

  /** true bila pengguna adalah kurir (PUDO = titik aksi, bukan sekadar info). */
  const isCourier = $derived(role.toUpperCase() === "KURIR");

  let mapEl = $state<HTMLElement | undefined>();

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

      // Garis jalur yang sudah ditempuh — solid.
      traveled = L.polyline([rgeo.origin] as unknown as LeafletNS.LatLngExpression[], { color: "#16a34a", weight: 5, opacity: 0.95 }).addTo(map);

      // Titik awal (hub).
      L.circleMarker(rgeo.origin as unknown as LeafletNS.LatLngExpression, { radius: 9, color: "#16a34a", fillColor: "#dcfce7", fillOpacity: 0.9, weight: 3 })
        .addTo(map)
        .bindTooltip(`Awal · ${originLabel}`, { direction: "top" });

      // Titik tujuan (pembeli).
      L.circleMarker(rgeo.dest as unknown as LeafletNS.LatLngExpression, { radius: 10, color: "#c14a21", fillColor: "#fde4d8", fillOpacity: 0.95, weight: 3 })
        .addTo(map)
        .bindTooltip(`Tujuan · ${destLabel}`, { direction: "top" });

      // Titik saat ini (kurir).
      courierMk = L.circleMarker(rgeo.origin as unknown as LeafletNS.LatLngExpression, { radius: 8, color: "#2563eb", fillColor: "#dbeafe", fillOpacity: 1, weight: 3 }).addTo(map);
      courierMk.bindTooltip("Kurir", { direction: "top", permanent: true }).openTooltip();

      // ── PUDO: semua titik mitra + rekomendasi drop terdekat ──
      const recId = dropRec?.pudo.id;
      for (const p of pudos) {
        const isRec = p.id === recId;
        const mk = L.circleMarker(p.coord as unknown as LeafletNS.LatLngExpression, {
          radius: isRec ? 11 : 7,
          color: isRec ? "#7c3aed" : "#8b5cf6",
          weight: isRec ? 4 : 2,
          fillColor: isRec ? "#ede9fe" : "#ddd6fe",
          fillOpacity: isRec ? 1 : 0.85,
          dashArray: isRec ? undefined : "2 3",
        }).addTo(map);
        const tag = isRec ? (isCourier ? "★ Titik drop rekomendasi (kurir)" : "★ PUDO terdekat") : "PUDO mitra";
        mk.bindTooltip(`${tag} · ${p.name} (${p.partner})`, { direction: "top" });
        mk.bindPopup(
          `<strong>${p.name}</strong> · ${p.partner}<br/>${isCourier ? "Titik drop paket rekomendasi" : "Titik ambil/bayar paket"}<br/>Jam layanan ${p.hours} · kapasitas ${p.capacityPerDay} paket/hari` +
            (isRec && dropRec ? `<br/>Jarak dari tujuan ± ${dropRec.distanceKm} km · ETA ± ${dropRec.etaMin} menit` : "")
        );
      }

      // Garis rekomendasi: tujuan penerima → PUDO terdekat.
      if (dropRec) {
        L.polyline(dropRec.route as unknown as LeafletNS.LatLngExpression[], { color: "#7c3aed", weight: 4, opacity: 0.85, dashArray: "5 7" }).addTo(map);
      }

      map.fitBounds(rgeo.route as unknown as LeafletNS.LatLngBoundsExpression, { padding: [48, 48] });

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
    aria-label={`Peta pengantaran: titik awal ${originLabel}, titik tujuan ${destLabel}, posisi kurir bergerak mengikuti jalan${showPudo ? ", serta titik PUDO mitra dan rekomendasi drop terdekat" : ""}`}
    role="application"
    class="absolute inset-0"
  ></div>
  <div class="pointer-events-none absolute left-2 top-2 z-[1000] flex flex-col gap-1 rounded-lg border border-border bg-background/90 px-3 py-2 text-[12px] font-medium shadow-pop">
    <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-[#16a34a]"></span> Titik awal (hub)</span>
    <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-[#2563eb]"></span> Posisi kurir</span>
    <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-[#c14a21]"></span> Titik tujuan</span>
    {#if showPudo && pudos.length > 0}
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background:#8b5cf6"></span> PUDO mitra</span>
      <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full ring-2 ring-[#7c3aed]" style="background:#ede9fe"></span> {isCourier ? "Drop rekomendasi" : "PUDO terdekat"}</span>
    {/if}
  </div>
  {#if showPudo && dropRec}
    <div class="pointer-events-none absolute bottom-2 left-2 z-[1000] max-w-[calc(100%-1rem)] rounded-lg border border-[#7c3aed]/40 bg-background/95 px-3 py-2 text-[12px] shadow-pop">
      <p class="font-semibold text-foreground">
        {#if isCourier}★ Titik drop paket rekomendasi{:else}★ PUDO terdekat untuk penerima{/if}
      </p>
      <p class="text-muted-foreground">{dropRec.pudo.name} · {dropRec.pudo.partner} · ± {dropRec.distanceKm} km · ETA ± {dropRec.etaMin} mnt · {dropRec.pudo.hours}</p>
      <p class="mt-0.5 text-[11px] text-muted-foreground">
        {#if isCourier}Arahkan paket berisiko COD ke titik ini alih-alih menunggu di alamat.{:else}Penerima dapat mengambil/membayar paket di gerai mitra ini.{/if}
      </p>
    </div>
  {/if}
</div>
