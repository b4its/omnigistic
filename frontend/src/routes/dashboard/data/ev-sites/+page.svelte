<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { lineChart } from "$lib/charts/options";
  import { api, type Hub } from "$lib/api";
  import { notify } from "$lib/toast";
  import { numId } from "$lib/utils";

  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  // Kontrol simulasi
  let depreciationYears = $state(8); // umur ekonomis kendaraan fosil
  let evTarget = $state(200); // target EV (kasus: >200 unit akhir 2026)

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat ulang data hub…", type: "info", title: "EV Sites" });
    try {
      hubs = await api.hubs();
      evTarget = (await api.metricFleet()).evTarget;
      if (userTriggered) notify({ message: "Data dimuat", type: "success", title: "EV Sites" });
    } catch {
      hubs = [];
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat data", type: "error", title: "EV Sites" });
    }
    loaded = true;
  }

  onMount(() => void load());

  // Koridor prioritas DITURUNKAN dari utilisasi hub nyata (Table 1), bukan hardcode.
  const CORRIDOR_PAIRS: Array<[string, string]> = [
    ["Jakarta", "Bandung"],
    ["Surabaya", "Bekasi-Karawang"],
    ["Semarang", "Solo"],
    ["Medan", "Pekanbaru"],
    ["Makassar", "Balikpapan"],
    ["Denpasar", "Mataram"]
  ];

  const corridors = $derived(
    CORRIDOR_PAIRS.map(([from, to]) => {
      const a = hubs.find((h) => h.name === from);
      const b = hubs.find((h) => h.name === to);
      if (!a || !b) return null;
      const util = Math.round(((a.utilizationPct + b.utilizationPct) / 2) * 10) / 10;
      const volume = Math.round(a.capacityM * (a.utilizationPct / 100) * 100 * 10) / 10; // indeks relatif harian
      // Skor = 60% utilisasi + 40% volume relatif (dinormalisasi terhadap max).
      return { from, to, util, volume, detail: `${a.region} · hub ${a.code}/${b.code}` };
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  );

  const maxVolume = $derived(Math.max(1, ...corridors.map((c) => c.volume)));
  const scored = $derived(
    corridors
      .map((c) => ({ ...c, score: Math.round(0.6 * Math.min(100, c.util) + 0.4 * (c.volume / maxVolume) * 100) }))
      .sort((x, y) => y.score - x.score)
  );

  const scoreColor = (s: number) => (s >= 80 ? "bg-success text-success-foreground" : s >= 60 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground");

  // Kurva transformasi EV: setiap tahun sebagian armada fosil diganti mengikuti penyusutan.
  const turnoverPct = $derived(100 / depreciationYears);
  const curve = $derived(
    Array.from({ length: 10 }, (_, i) => {
      const y = i + 1;
      const cleanPct = Math.round((1 - Math.pow(1 - turnoverPct / 100, y)) * 1000) / 10;
      return { year: `Th ${y}`, cleanPct };
    })
  );
  const fleetAt10 = $derived(curve[curve.length - 1]?.cleanPct ?? 0);
  const yearsToTarget = $derived.by(() => {
    // Perkiraan tahun saat armada bersih kumulatif mencapai porsi setara target EV.
    const targetShare = (evTarget / 14180) * 100;
    let acc = 0;
    let y = 0;
    while (acc < targetShare && y < 80) {
      y += 1;
      acc = (1 - Math.pow(1 - turnoverPct / 100, y)) * 100;
    }
    return y;
  });

  const curveChart = $derived(
    lineChart(curve.map((c) => c.year), [{ name: "Armada bersih kumulatif (%)", data: curve.map((c) => c.cleanPct), color: "var(--color-primary)", area: true }])
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">EV Site Selection</h1>
      <p class="text-sm text-muted-foreground">Data-driven charging infrastructure · koridor diturunkan dari utilisasi hub nyata (Table 1).</p>
    </div>
    <span class="hub-label text-muted-foreground">Simulasi</span>
  </div>

  {#if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat data hub</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Muat ulang setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-xs font-semibold text-white">Coba lagi</button>
    </div>
  {:else if loaded}
    <div class="grid gap-4 sm:grid-cols-3">
      <MetricCard label="Target EV" value={`${evTarget} unit`} sub="akhir 2026 (studi kasus)" accent />
      <MetricCard label="Koridor Diprioritaskan" value={`${scored.length}`} sub="dari pasangan hub padat" />
      <MetricCard label="Tahun ke Armada Bersih" value={`±${yearsToTarget} thn`} sub={`setara target ${numId((evTarget / 14180) * 100, 2)}% armada`} />
    </div>

    <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
      <div class="flex items-start gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Icon name="chat" cls="h-5 w-5" weight="fill" /></span>
        <div class="min-w-0">
          <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">Saran Nigi AI</p>
          <p class="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
            Prioritaskan koridor urban Jawa (utilisasi tinggi, 70% last-mile terjadi di Jawa). Koridor timur (utilisasi rendah) perlu Regional Sponsor + modal laut dulu sebelum charging EV.
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-3 text-sm font-medium">Koridor prioritas (skor = 60% utilisasi + 40% volume relatif, dari Table 1)</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th scope="col" class="px-4 py-2">Koridor</th>
              <th scope="col" class="px-4 py-2 text-right">Utilisasi</th>
              <th scope="col" class="px-4 py-2 text-right">Indeks volume*</th>
              <th scope="col" class="px-4 py-2 text-right">Skor</th>
            </tr>
          </thead>
          <tbody>
            {#each scored as c (c.from + c.to)}
              <tr class="border-b last:border-0">
                <td class="px-4 py-2"><p class="font-medium">{c.from} → {c.to}</p><p class="text-xs text-muted-foreground">{c.detail}</p></td>
                <td class="px-4 py-2 text-right tabular-nums">{c.util}%</td>
                <td class="px-4 py-2 text-right tabular-nums">{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(c.volume)}M</td>
                <td class="px-4 py-2 text-right"><span class={"rounded-md px-2 py-0.5 text-sm font-bold " + scoreColor(c.score)}>{c.score}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-[13px] italic text-muted-foreground">*indeks volume relatif (kapasitas × utilisasi harian), bukan agregat. Skor = simulasi tim dari data Table 1.</p>
    </div>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-1 text-sm font-medium">Kebijakan penyusutan {depreciationYears} tahun → kurva transformasi EV</p>
      <p class="mb-3 text-sm text-muted-foreground">Kendaraan fosil yang mencapai umur ekonomis diganti EV — tanpa lonjakan capex. Turnover ≈ {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(turnoverPct)}%/th.</p>

      <label class="block max-w-sm">
        <span class="flex items-center justify-between text-sm font-medium"><span>Umur ekonomis kendaraan</span><span class="kpi-value text-primary">{depreciationYears} thn</span></span>
        <input type="range" min="4" max="12" step="1" value={depreciationYears} oninput={(e) => (depreciationYears = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => notify({ message: `Umur ekonomis ${depreciationYears} tahun`, type: "info", title: "EV Sites" })} aria-label="Umur ekonomis kendaraan" class="mt-2 w-full accent-[var(--color-primary)]" />
      </label>
      <label class="block mt-4 max-w-sm">
        <span class="flex items-center justify-between text-sm font-medium"><span>Target EV pada 2026</span><span class="kpi-value text-primary">{evTarget} unit</span></span>
        <input type="range" min="50" max="500" step="25" value={evTarget} oninput={(e) => (evTarget = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => notify({ message: `Target EV ${evTarget} unit`, type: "info", title: "EV Sites" })} aria-label="Target EV unit" class="mt-2 w-full accent-[var(--color-primary)]" />
      </label>

      <div class="mt-4">
        <EChart option={curveChart} height={260} label="Kurva transformasi armada bersih" />
      </div>
      <p class="mt-2 text-xs text-muted-foreground">Tahun ke-10: {fleetAt10}% armada fosil tergantikan secara alami tanpa capex spike. Target {evTarget} unit ≈ {numId((evTarget / 14180) * 100, 2)}% armada tercapai dalam ±{yearsToTarget} tahun pada laju ini.</p>
    </div>
  {:else}
    <div class="h-72 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
