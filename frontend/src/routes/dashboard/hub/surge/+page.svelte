<script lang="ts">
  import { onMount } from "svelte";
  import { api, type SurgeResult } from "$lib/api";
  import { notify } from "$lib/toast";
  import Icon from "$lib/components/Icon.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let res = $state<SurgeResult | null>(null);
  let loaded = $state(false);
  let failed = $state(false);

  // Kontrol simulasi (start = puncak musiman kasus 1,15×).
  let peak = $state(1.15);
  let surgeCap = $state(1.0);
  let busy = $state(false);

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Menjalankan stress-test…", type: "info", title: "Peak-Surge" });
    try {
      res = await api.surge({ peak_multiplier: peak, surge_capacity_factor: surgeCap });
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal menjalankan stress-test", type: "error", title: "Peak-Surge" });
    }
    loaded = true;
  }

  async function run() {
    busy = true;
    await load(true);
    busy = false;
  }

  onMount(() => void load());

  const topBreach = $derived(res ? [...res.hubs].filter((h) => h.breached).slice(0, 10) : []);
  const utilChart = $derived(
    res
      ? barChart(
          topBreach.length ? topBreach.map((h) => h.code) : res.hubs.slice(0, 8).map((h) => h.code),
          [
            {
              name: "Util puncak (%)",
              data: topBreach.length ? topBreach.map((h) => h.peakUtilPct) : res.hubs.slice(0, 8).map((h) => h.peakUtilPct)
            }
          ],
          { maxBarWidth: 34 }
        )
      : null
  );

  const PRESETS = [
    { label: "Musiman 1,15×", pm: 1.15, cf: 1.0, note: "Puncak bulanan Table 4" },
    { label: "Festival 2×", pm: 2.0, cf: 1.0, note: "Harbolnas / 11.11" },
    { label: "Double 12 3×", pm: 3.0, cf: 1.0, note: "Kasus historis 2022" },
    { label: "Double 12 + buffer", pm: 3.0, cf: 1.3, note: "+30% armada sewa" }
  ];

  function applyPreset(p: (typeof PRESETS)[number]) {
    peak = p.pm;
    surgeCap = p.cf;
    void run();
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">Peak-Surge Stress-Test</h1>
      <p class="text-sm text-muted-foreground">
        Uji beban puncak terhadap kapasitas 23 hub. Kasus: Double 12 2022 (Jakarta 1 overload) · puncak jaringan &gt;3 juta paket/hari.
      </p>
    </div>
    <button type="button" onclick={() => run()} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
      <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Jalankan ulang"}
    </button>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle="Gagal menjalankan stress-test" errorHint="Backend offline. Coba lagi setelah backend aktif." onretry={() => run()} />
  {:else if loaded && res}
    <!-- Panel simulasi -->
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <p class="text-sm font-semibold">Simulasi amplifikasi puncak</p>
      <p class="mt-1 text-xs text-muted-foreground">Geser & jalankan — engine menghitung ulang beban tiap hub, breach, spillover, dan waktu pemulihan.</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-2">
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Amplifikasi puncak</span><span class="kpi-value text-foreground">{numId(peak, 2)}×</span></span>
          <input type="range" min="1" max="4" step="0.05" bind:value={peak} aria-label="Amplifikasi puncak" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Kapasitas elastis</span><span class="kpi-value text-foreground">{numId(surgeCap, 2)}×</span></span>
          <input type="range" min="1" max="1.5" step="0.05" bind:value={surgeCap} aria-label="Kapasitas elastis" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        {#each PRESETS as p (p.label)}
          <button type="button" onclick={() => applyPreset(p)} class="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:text-foreground" title={p.note}>{p.label}</button>
        {/each}
      </div>
      <button type="button" onclick={run} disabled={busy} class="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_-5px_var(--glow)] transition-all duration-300 hover:scale-[1.03] disabled:opacity-60">
        <Icon name="activity" cls="h-3.5 w-3.5" weight="bold" /> Jalankan stress-test
      </button>
    </div>

    <!-- KPI -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Beban puncak nasional</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.totalPeakLoadM, 2)}<span class="text-sm text-muted-foreground"> jt/hari</span></p>
        <p class="mt-1 text-xs text-muted-foreground">vs kapasitas {numId(res.reference.totalCapacityPerDayM, 2)} jt/hari</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Hub melampaui kapasitas</p>
        <p class="kpi-value mt-2 font-heading text-2xl {res.summary.hubBreached > 0 ? 'text-destructive-foreground' : 'text-success-foreground'}">{res.summary.hubBreached}<span class="text-sm text-muted-foreground"> / {res.summary.hubCount}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">util nasional {numId(res.summary.nationalUtilPct, 1)}%</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Overflow tak tertangani</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.residualOverflowM, 3)}<span class="text-sm text-muted-foreground">M</span></p>
        <p class="mt-1 text-xs text-muted-foreground">dialihkan {numId(res.summary.spilloverMovedM, 3)}M antar-hub</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Waktu pemulihan</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.recoveryDays, 1)}<span class="text-sm text-muted-foreground"> hari</span></p>
        <p class="mt-1 text-xs text-muted-foreground">drain 20% kapasitas/hari (asumsi)</p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Utilisasi puncak (hub teratas)</p>
        {#if utilChart}<EChart option={utilChart} height={280} label="Utilisasi puncak per hub" />{/if}
      </div>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Rencana spillover (hub → headroom)</p>
        <div class="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {#if res.spillover.length === 0}
            <p class="text-sm text-muted-foreground">Tidak ada spillover — beban terserap tanpa pengalihan.</p>
          {/if}
          {#each res.spillover as m (m.fromCode + m.toCode)}
            <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span class="flex items-center gap-1.5">
                <span class="font-mono text-xs font-medium">{m.fromCode}</span>
                <Icon name="arrow-right" cls="h-3.5 w-3.5 text-muted-foreground" />
                <span class="font-mono text-xs">{m.toCode}</span>
              </span>
              <span class="kpi-value text-[var(--bitcoin)]">{numId(m.quantityM, 3)}M</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Tabel hub -->
    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full text-sm">
        <caption class="sr-only">Utilisasi puncak per hub</caption>
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th class="px-4 py-2.5">Hub</th>
            <th class="px-4 py-2.5 text-right">Kap. efektif</th>
            <th class="px-4 py-2.5 text-right">Beban puncak</th>
            <th class="px-4 py-2.5 text-right">Util</th>
            <th class="px-4 py-2.5 text-right">Overflow</th>
          </tr>
        </thead>
        <tbody>
          {#each res.hubs as h (h.code)}
            <tr class="border-b border-border/60 last:border-0 {h.breached ? 'bg-destructive/5' : ''}">
              <td class="px-4 py-2">{h.name} <span class="font-mono text-[11px] text-muted-foreground">{h.code}</span></td>
              <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">{numId(h.capacityEffectiveM, 3)}M</td>
              <td class="px-4 py-2 text-right tabular-nums">{numId(h.peakLoadM, 3)}M</td>
              <td class="px-4 py-2 text-right tabular-nums font-medium {h.peakUtilPct > 100 ? 'text-destructive-foreground' : h.peakUtilPct > 65 ? 'text-warning-foreground' : ''}">{numId(h.peakUtilPct, 1)}%</td>
              <td class="px-4 py-2 text-right tabular-nums">{h.overflowM > 0 ? numId(h.overflowM, 3) + "M" : "—"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
      <span class="font-medium">Insight:</span> puncak musiman (1,15×) hanya menekan <strong>1 hub</strong> — persis peristiwa "Jakarta 1 overload" pada Double 12. Pada festival/Double 12 (2–3×), belasan hub melampaui kapasitas & butuh pengalihan + buffer armada. {res.note}
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={280} />
  {/if}
</div>
