<script lang="ts">
  import { onMount } from "svelte";
  import type * as LeafletNS from "leaflet";
  import type { Hub } from "$lib/api";
  import { OSM_TILE } from "$lib/map/tiles";
  import { PUDO_POINTS, pudoCountByRegion } from "$lib/logistics";
  import Icon from "$lib/components/Icon.svelte";

  interface Props {
    hubs?: Hub[];
    height?: number;
    /** Tampilkan titik PUDO mitra (default true). */
    showPudo?: boolean;
  }
  let { hubs = [] as Hub[], height = 520, showPudo = true }: Props = $props();

  let mapEl = $state<HTMLElement | undefined>();
  /** Legenda peta: terbuka default (collapsible). */
  let legendOpen = $state(true);

  /** Warna PUDO per region (6 region kasus) — untuk legenda & marker. */
  const PUDO_REGION_COLOR: Record<string, { color: string; fill: string }> = {
    Java: { color: "#7c3aed", fill: "#ddd6fe" },
    Sumatra: { color: "#0891b2", fill: "#cffafe" },
    Kalimantan: { color: "#16a34a", fill: "#dcfce7" },
    Sulawesi: { color: "#ea580c", fill: "#ffedd5" },
    "Bali & Nusa Tenggara": { color: "#ca8a04", fill: "#fef9c3" },
    "Maluku & Papua": { color: "#db2777", fill: "#fce7f3" },
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
      // Tile OpenStreetMap — gratis, open-source, lengkap (tanpa API key).
      L.tileLayer(OSM_TILE.url, { maxZoom: OSM_TILE.maxZoom, attribution: OSM_TILE.attribution, crossOrigin: true }).addTo(m);

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
            dashArray: "2 3",
          }).addTo(m);
          mk.bindTooltip(`PUDO · ${p.name} (${p.region})`, { direction: "top" });
          mk.bindPopup(
            `<strong>${p.name}</strong> · ${p.partner}<br/>` +
              `<span style="opacity:.8">${p.address}</span><br/>` +
              `${p.city} · ${p.region}<br/>Jam ${p.hours} · kapasitas ${p.capacityPerDay} paket/hari<br/>` +
              `<span style="opacity:.7;font-size:11px">Koordinat: ${p.source === "osm" ? "OpenStreetMap" : "asumsi tim"}</span>`
          );
        }
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
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border border-black/20" style="background:#3f5c3f"></span> <span><b class="text-foreground">Sehat</b> — utilisasi &lt; 50%</span></li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border border-black/20" style="background:#d9a441"></span> <span><b class="text-foreground">Perhatian</b> — 50–65%</span></li>
          <li class="flex items-center gap-2"><span class="h-3 w-3 shrink-0 rounded-full border border-black/20" style="background:#a03123"></span> <span><b class="text-foreground">Overload</b> — &gt; 65%</span></li>
        </ul>
        <p class="pt-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">Ukuran &amp; simbol</p>
        <ul class="space-y-1.5">
          <li class="flex items-center gap-2"><span class="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-foreground/40 bg-foreground/10"></span> <span>Bulatan besar = kapasitas hub lebih besar</span></li>
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
