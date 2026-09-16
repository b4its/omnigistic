<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { api, type OptimizeResult } from "$lib/api";
  import { notify } from "$lib/toast";

  let opt = $state<OptimizeResult | null>(null);
  let loaded = $state(false);
  let failed = $state(false);

  // Ambang simulasi interaktif (dikirim ke engine). Default = nilai kasus.
  let critical = $state(65);
  let safeFloor = $state(60);
  let maxDivert = $state(35);

  async function recompute(userTriggered = true) {
    if (userTriggered) notify({ message: "Menjalankan optimizer jaringan…", type: "info", title: "Load Balancing" });
    try {
      opt = await api.optimizeLoadBalanceCustom({
        critical,
        safe_floor: Math.min(safeFloor, critical),
        max_divert_frac: maxDivert / 100,
      });
      if (userTriggered) notify({ message: "Rencana optimal diperbarui", type: "success", title: "Load Balancing" });
    } catch {
      opt = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal menjalankan optimizer", type: "error", title: "Load Balancing" });
    }
  }

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Menjalankan optimizer jaringan…", type: "info", title: "Load Balancing" });
    try {
      opt = await api.optimizeLoadBalance();
      if (userTriggered) notify({ message: "Rencana optimal diperbarui", type: "success", title: "Load Balancing" });
    } catch {
      opt = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat optimizer", type: "error", title: "Load Balancing" });
    }
    loaded = true;
  }

  async function resetDefaults() {
    critical = 65;
    safeFloor = 60;
    maxDivert = 35;
    await recompute(true);
  }

  onMount(() => void load());

  const fmt3 = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(n);
  const fmt1 = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

  // Grafik util sebelum/sesudah hanya untuk hub yang berubah (|delta| > 0).
  const changed = $derived(opt ? opt.hubs.filter((h) => Math.abs(h.deltaPct) > 0.05) : []);
  const chartHubs = $derived(changed.length ? changed : (opt?.hubs ?? []).slice(0, 10));
  const utilChart = $derived(
    barChart(
      chartHubs.map((h) => h.code),
      [
        { name: "Sebelum", data: chartHubs.map((h) => h.beforePct), color: "var(--color-muted-foreground)" },
        { name: "Sesudah", data: chartHubs.map((h) => h.afterPct), color: "var(--color-primary)" }
      ],
      { maxBarWidth: 26 }
    )
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">Load Balancing</h1>
      <p class="text-sm text-muted-foreground">
        Optimizer jaringan: alihkan overflow hub over-utilisasi (&gt;65%) ke hub ber-headroom (&lt;50%). Kasus: Double 12 2022.
      </p>
    </div>
    <button
      type="button"
      onclick={resetDefaults}
      class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold hover:border-primary/40"
    >
      <Icon name="trend" cls="h-3.5 w-3.5" /> Reset ambang
    </button>
  </div>

  {#if loaded && opt}
    <!-- Panel simulasi ambang (interaktif) -->
    <div class="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <p class="text-sm font-semibold">Simulasi ambang optimizer</p>
      <p class="mt-1 text-xs text-muted-foreground">Geser lalu klik Jalankan — engine menyusun ulang rencana pengalihan dari ambang baru.</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-3">
        <label class="block">
          <span class="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Ambang kritis (over-utilisasi)</span><span class="kpi-value text-foreground">{critical}%</span>
          </span>
          <input type="range" min="50" max="95" step="1" bind:value={critical} aria-label="Ambang kritis persen" class="mt-2 w-full accent-[var(--color-primary)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Lantai aman hub sumber</span><span class="kpi-value text-foreground">{safeFloor}%</span>
          </span>
          <input type="range" min="30" max={critical} step="1" bind:value={safeFloor} aria-label="Lantai aman persen" class="mt-2 w-full accent-[var(--color-primary)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Maks kapasitas boleh dialihkan</span><span class="kpi-value text-foreground">{maxDivert}%</span>
          </span>
          <input type="range" min="5" max="60" step="5" bind:value={maxDivert} aria-label="Maks porsi dialihkan persen" class="mt-2 w-full accent-[var(--color-primary)]" />
        </label>
      </div>
      <button
        type="button"
        onclick={() => recompute(true)}
        class="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-5 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-px active:translate-y-0"
      >
        <Icon name="trend" cls="h-3.5 w-3.5" /> Jalankan optimizer
      </button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Volume Dialihkan"
        value={`${fmt3(opt.summary.totalMovedM)}M`}
        sub={`${opt.summary.moves} rute pergerakan`}
        accent
      />
      <MetricCard
        label="Hub Overload"
        value={`${opt.summary.overloadedBefore} → ${opt.summary.overloadedAfter}`}
        sub="sebelum → sesudah (util > 65%)"
        deltaTone={opt.summary.overloadedBefore - opt.summary.overloadedAfter >= 0 ? "up" : "warn"}
        delta={`${opt.summary.overloadedBefore - opt.summary.overloadedAfter >= 0 ? "-" : "+"}${Math.abs(opt.summary.overloadedBefore - opt.summary.overloadedAfter)}`}
      />
      <MetricCard
        label="Utilisasi Timur (rata²)"
        value={`${fmt1(opt.summary.eastAvgUtilAfter)}%`}
        sub={`dari ${fmt1(opt.summary.eastAvgUtilBefore)}%`}
        deltaTone="up"
        delta={`+${fmt1(opt.summary.eastAvgUtilAfter - opt.summary.eastAvgUtilBefore)}`}
      />
      <MetricCard
        label="Kebutuhan Tak Terlayani"
        value={`${fmt3(opt.summary.unmetM)}M`}
        sub={opt.summary.unmetM === 0 ? "semua tuntas terlayani" : "kapasitas tujuan kurang"}
        valueColor={opt.summary.unmetM === 0 ? "var(--color-success-foreground, var(--color-primary))" : "var(--color-destructive-foreground, var(--color-primary))"}
      />
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Utilisasi sebelum vs sesudah (hub berubah)</p>
        <EChart option={utilChart} height={300} label="Utilisasi hub sebelum dan sesudah optimasi" />
      </div>

      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Rencana Pergerakan</p>
        <div class="max-h-[300px] space-y-2 overflow-y-auto pr-1">
          {#each opt.moves as m (m.fromCode + m.toCode)}
            <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span class="flex items-center gap-1.5">
                <span class="font-medium">{m.fromCode}</span>
                <Icon name="arrow-up-right" cls="h-3.5 w-3.5 text-muted-foreground" />
                <span>{m.toCode}</span>
                {#if !m.sameRegion}
                  <span class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">antar-region</span>
                {/if}
              </span>
              <span class="kpi-value text-chart-3">{fmt3(m.quantityM)}M</span>
            </div>
          {/each}
        </div>
        <p class="mt-3 text-xs text-muted-foreground">
          Engine: {opt.engine}. Biaya = indeks relatif antar-region (proxy prototipe), bukan tarif nyata.
        </p>
      </div>
    </div>

    <div class="overflow-hidden rounded-2xl border border-border bg-card">
      <table class="w-full text-sm">
        <thead class="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th class="px-4 py-2.5 text-left font-medium">Hub</th>
            <th class="px-4 py-2.5 text-right font-medium">Sebelum</th>
            <th class="px-4 py-2.5 text-right font-medium">Sesudah</th>
            <th class="px-4 py-2.5 text-right font-medium">Δ</th>
            <th class="px-4 py-2.5 text-right font-medium">Masuk</th>
            <th class="px-4 py-2.5 text-right font-medium">Keluar</th>
          </tr>
        </thead>
        <tbody>
          {#each opt.hubs as h (h.code)}
            <tr class="border-t border-border/60">
              <td class="px-4 py-2">{h.name} <span class="text-xs text-muted-foreground">({h.region})</span></td>
              <td class="px-4 py-2 text-right tabular-nums">{fmt1(h.beforePct)}%</td>
              <td class="px-4 py-2 text-right tabular-nums font-medium">{fmt1(h.afterPct)}%</td>
              <td
                class="px-4 py-2 text-right tabular-nums"
                style={h.deltaPct > 0.05
                  ? "color:var(--color-chart-3, var(--color-primary))"
                  : h.deltaPct < -0.05
                    ? "color:var(--color-primary)"
                    : ""}
              >
                {h.deltaPct > 0 ? "+" : ""}{fmt1(h.deltaPct)}
              </td>
              <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">{h.movedInM ? fmt3(h.movedInM) + "M" : "—"}</td>
              <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">{h.movedOutM ? fmt3(h.movedOutM) + "M" : "—"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
      <span class="font-medium">Insight:</span> Overflow diarahkan ke hub ber-headroom terdekat secara biaya (greedy cheapest-link-first),
      dengan lantai aman {opt.thresholds.safeFloor}% pada hub sumber dan maks {Math.round(opt.thresholds.maxDivertFrac * 100)}% kapasitas boleh dialihkan.
      Ini mencegah pengalihan mendadak ala Double 12 2022 dan menaikkan utilisasi timur tanpa capex baru.
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat optimizer</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Muat ulang setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-xs font-semibold text-white">Coba lagi</button>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Data optimizer tidak tersedia.</div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}
    </div>
    <div class="h-72 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
