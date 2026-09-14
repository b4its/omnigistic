<script lang="ts">
  import { onMount } from "svelte";
  import type * as LeafletNS from "leaflet";
  import type { Hub } from "$lib/api";

  let { hubs = [] as Hub[], height = 520 }: { hubs?: Hub[]; height?: number } = $props();

  let mapEl = $state<HTMLElement | undefined>();

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

  function tone(u: number): { color: string; label: string } {
    if (u > 65) return { color: "#a03123", label: "overload (>65%)" };
    if (u >= 50) return { color: "#d9a441", label: "perhatian (50-65%)" };
    return { color: "#3f5c3f", label: "sehat (<50%)" };
  }

  onMount(() => {
    if (!mapEl) return;
    const el = mapEl;
    let disposed = false;
    let map: LeafletNS.Map | null = null;

    void (async () => {
      // Impor dinamis: aman SSR (Leaflet mengakses window saat import).
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (disposed || !el) return;

      const m = L.map(el, { worldCopyJump: true, zoomControl: true, scrollWheelZoom: true });
      map = m;
      const tile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, crossOrigin: true, errorTileUrl: "" });
      tile.addTo(m);
      tile.on("loaderror", () => {
        try {
          m.removeLayer(tile);
        } catch {
          /* noop */
        }
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", { maxZoom: 20 }).addTo(m);
      });

      const bounds: Array<[number, number]> = [];
      for (const h of hubs) {
        const c = COORDS[h.code];
        if (!c) continue;
        const { color, label } = tone(h.utilizationPct);
        const mk = L.circleMarker(c, {
          radius: 6 + h.capacityM * 18,
          color,
          weight: h.utilizationPct > 65 ? 3 : 2,
          fillColor: color,
          fillOpacity: 0.72
        }).addTo(m);
        mk.bindTooltip(`<strong>${h.name}</strong> (${h.code}) · ${h.region}`, { direction: "top" });
        mk.bindPopup(
          `<strong>${h.name}</strong> · ${h.region}<br/>Utilisasi <strong>${h.utilizationPct}%</strong> (${label})<br/>Kapasitas ${h.capacityM} juta paket/hari<br/>${h.outlets} titik pickup/delivery`
        );
        bounds.push(c);
      }

      if (bounds.length) {
        m.fitBounds(bounds as LeafletNS.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 6 });
      } else {
        m.setView([-2.5, 118], 5);
      }
    })();

    return () => {
      disposed = true;
      try {
        map?.remove();
      } catch {
        /* noop */
      }
      map = null;
    };
  });
</script>

<div class="relative isolate z-0 w-full overflow-hidden rounded-2xl border border-border" style="height:{height}px">
  <div bind:this={mapEl} class="absolute inset-0" role="application" aria-label="Peta 23 hub GC Logistics dengan utilisasi berwarna (hijau, kuning, merah)"></div>
  <div class="pointer-events-none absolute right-2 top-2 z-[1000] space-y-1 rounded-lg border border-border bg-background/90 px-3 py-2 text-[12.5px] font-semibold shadow-pop">
    <p class="flex items-center gap-2"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#3f5c3f"></span> Sehat, &lt; 50%</p>
    <p class="flex items-center gap-2"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#d9a441"></span> Perhatian, 50-65%</p>
    <p class="flex items-center gap-2"><span class="inline-block h-2.5 w-2.5 rounded-full" style="background:#a03123"></span> Overload, &gt; 65%</p>
    <p class="pt-1 text-[11.5px] font-normal text-muted-foreground">Ukuran bulatan = kapasitas hub</p>
  </div>
</div>
