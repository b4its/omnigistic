<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub } from "$lib/api";
  import { cn } from "$lib/utils";
  import { notify } from "$lib/toast";

  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat ulang data kapasitas…", type: "info", title: "Capacity Alert" });
    try {
      hubs = await api.hubs();
      if (userTriggered) notify({ message: "Data kapasitas dimuat", type: "success", title: "Capacity Alert" });
    } catch {
      hubs = [];
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat data hub", type: "error", title: "Capacity Alert" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const THRESHOLD = 65; // ambang early-warning (skenario Double 12 2022)
  const bdg = $derived(hubs.find((h) => h.name === "Bandung"));

  // Simulasi kapasitas elastis 3 tingkat. Level = permintaan bulanan (Tabel 4):
  // lembah 78M (Jan) · normal 92,5M · puncak 105M (Apr/Agu). Level men-SKALA
  // volume tiap hub dari baseline hari ini, lalu util dihitung ulang → jumlah
  // hub yang menembus ambang + overflow jadi angka nyata, bukan label kosong.
  type Tier = "lembah" | "normal" | "puncak";
  const TIERS: Array<{ key: Tier; label: string; demandM: number; note: string }> = [
    { key: "lembah", label: "Lembah", demandM: 78, note: "kontrak kurir inti" },
    { key: "normal", label: "Normal", demandM: 92.5, note: "+ kurir musiman" },
    { key: "puncak", label: "Puncak", demandM: 105, note: "+15% buffer armada sewa" }
  ];
  let tier = $state<Tier>("normal");

  // Baseline = permintaan bulanan rata-rata 2023 = 1.110M / 12 ≈ 92,5M (level
  // "Normal" = titik nol skala). Utilisasi hub kasus dibaca pada level ini.
  const BASE_DEMAND_M = 92.5;

  // Faktor skala = level / baseline (lembah 0,843× · puncak 1,135×).
  const scale = $derived.by(() => {
    const target = TIERS.find((x) => x.key === tier)?.demandM ?? BASE_DEMAND_M;
    return target / BASE_DEMAND_M;
  });

  // Util simulasi per hub (kapasitas tetap, volume diskala) + daftar breach.
  const sim = $derived.by(() =>
    hubs.map((h) => {
      const util = h.utilizationPct * scale;
      const cap = h.capacityM;
      // Overflow = volume di atas kapasitas (M paket/hari) pada utilisasi simulasi.
      const overflowM = Math.max(0, (util - 100) / 100) * cap;
      return { name: h.name, code: h.code, util, overflowM, breach: util > THRESHOLD };
    })
  );
  const breaches = $derived(sim.filter((h) => h.breach).sort((a, b) => b.util - a.util));
  const overflowTotalM = $derived(sim.reduce((s, h) => s + h.overflowM, 0));
  const peak = $derived(breaches[0] ?? null);

</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Capacity Alert</h1>
    <span class="hub-label text-muted-foreground">Early warning &gt;65%</span>
  </div>

  {#if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat data kapasitas hub</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Muat ulang setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-xs font-semibold text-white">Coba lagi</button>
    </div>
  {:else if loaded && bdg}
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs text-muted-foreground">Hub Bandung, utilisasi</p>
      <p class="kpi-value text-3xl {bdg.utilizationPct > 65 ? 'text-destructive-foreground' : 'text-chart-3'}">{bdg.utilizationPct}%</p>
      <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div class="h-full {bdg.utilizationPct > 65 ? 'bg-destructive' : 'bg-chart-3'}" style="width: {bdg.utilizationPct}%"></div>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">{bdg.utilizationPct > 65 ? "Di atas ambang 65%, butuh perhatian" : "Dalam zona aman"}</p>
    </div>

    <div>
      <p class="mb-2 text-sm font-medium">Simulasi kapasitas elastis — pilih level permintaan</p>
      <div class="grid gap-4 sm:grid-cols-3">
        {#each TIERS as t (t.key)}
          <button
            type="button"
            onclick={() => (tier = t.key)}
            aria-pressed={tier === t.key}
            class={cn(
              "rounded-2xl border bg-card p-4 text-left transition-colors",
              tier === t.key ? "border-primary/50 ring-1 ring-primary/30" : "hover:border-primary/30"
            )}
          >
            <p class="hub-label text-xs text-muted-foreground">{t.label}</p>
            <p class="kpi-value text-lg">{t.demandM.toLocaleString("id-ID")}M</p>
            <p class="text-xs text-muted-foreground">{t.note}</p>
            {#if tier === t.key}<p class="mt-1 text-[11px] font-semibold text-primary">● Aktif</p>{/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">Hub menembus ambang &gt;65%</p>
        <p class="kpi-value text-2xl {breaches.length ? 'text-destructive-foreground' : 'text-chart-3'}">{breaches.length}<span class="text-sm text-muted-foreground"> / {hubs.length}</span></p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">Util tertinggi (simulasi)</p>
        <p class="kpi-value text-2xl">{peak ? peak.util.toFixed(1) + "%" : "—"}</p>
        <p class="text-xs text-muted-foreground">{peak?.name ?? "—"}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">Overflow butuh buffer</p>
        <p class="kpi-value text-2xl">{overflowTotalM > 0 ? overflowTotalM.toFixed(3) + "M" : "0"}</p>
        <p class="text-xs text-muted-foreground">paket/hari di atas kapasitas</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex items-center justify-between">
        <p class="text-sm font-medium">Hub di atas ambang (&gt;{THRESHOLD}%) pada level {TIERS.find((x) => x.key === tier)?.label}</p>
        <span class={cn("rounded-md px-3 py-1.5 text-xs font-semibold", breaches.length ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground")}>
          {breaches.length ? `${breaches.length} hub perlu buffer` : "Semua aman"}
        </span>
      </div>
      <ul class="space-y-2">
        {#if breaches.length === 0}
          <li class="text-sm text-muted-foreground">Tidak ada hub di atas ambang pada level ini.</li>
        {/if}
        {#each breaches as h (h.code)}
          <li class="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2 text-sm">
            <span>{h.name} <span class="hub-label text-muted-foreground">· {h.code}</span></span>
            <span class="kpi-value {h.util > 100 ? 'text-destructive-foreground' : 'text-warning-foreground'}">
              {h.util.toFixed(1)}%{#if h.overflowM > 0}<span class="ml-2 text-[11px] text-muted-foreground">+{h.overflowM.toFixed(3)}M</span>{/if}
            </span>
          </li>
        {/each}
      </ul>
      <p class="mt-3 text-xs text-muted-foreground">
        Volume hub diskala ×{scale.toFixed(3)} dari baseline {BASE_DEMAND_M.toLocaleString("id-ID")}M/bulan
        (rata-rata 2023 = 1.110M ÷ 12). Buffer armada menyusutkan overflow ke hub dengan headroom.
        {#if bdg}Hub Bandung acuan: {bdg.utilizationPct}% → {(bdg.utilizationPct * scale).toFixed(1)}%.{/if}
      </p>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Data hub tidak tersedia.</div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>