<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import CodRealOrdersBridge from "$lib/components/CodRealOrdersBridge.svelte";
  import { barChart } from "$lib/charts/options";
  import { api, type CodIntelResult } from "$lib/api";
  import { notify } from "$lib/toast";

  let res = $state<CodIntelResult | null>(null);
  let scenarios = $state<Record<string, CodIntelResult>>({});
  let loaded = $state(false);
  let failed = $state(false);
  let busy = $state(false);

  // Kontrol interaktif
  let codShare = $state(60);
  let packagesPerShift = $state(40);
  let active = new SvelteSet<string>();

  function toggle(key: string, checked: boolean) {
    if (checked) active.add(key);
    else active.delete(key);
    void recompute();
  }

  async function recompute() {
    if (!res) return;
    busy = true;
    try {
      res = await api.codIntel({
        cod_share_pct: codShare,
        interventions: [...active],
        packages_per_shift: packagesPerShift
      });
    } catch {
      notify({ message: "Gagal menghitung ulang simulasi", type: "error", title: "COD Intelligence" });
    }
    busy = false;
  }

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat simulasi dampak COD…", type: "info", title: "COD Intelligence" });
    try {
      scenarios = await api.codIntelScenarios();
      res = scenarios["Tanpa intervensi (baseline)"] ?? Object.values(scenarios)[0] ?? null;
      if (userTriggered) notify({ message: "Simulasi dimuat ulang", type: "success", title: "COD Intelligence" });
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat simulasi COD", type: "error", title: "COD Intelligence" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);
  const rupiah = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(n));

  // Grafik durasi shift baseline vs optimized.
  const durationChart = $derived(
    res
      ? barChart(
          ["Baseline", "Setelah intervensi"],
          [
            {
              name: "Durasi shift (menit)",
              data: [res.baseline.shiftDurationMin, res.optimized.shiftDurationMin],
              color: "var(--color-primary)"
            }
          ],
          { maxBarWidth: 90, hideLegend: true }
        )
      : null
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">COD Decision Intelligence</h1>
      <p class="text-sm text-muted-foreground">
        Dampak keputusan COD pada satu shift kurir. Basis: Figure 2 (COD 138 mnt vs non-COD 75 mnt untuk 8 paket / 5,3 km).
      </p>
    </div>
    <span class="hub-label text-muted-foreground">Jawaban Pertanyaan 3</span>
  </div>

  {#if loaded && res}
    <!-- Kasus dasar -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">Non-COD (kasus)</p>
        <p class="kpi-value text-xl">{res.caseFigures.nonCod.durationMin} menit</p>
        <p class="text-xs text-muted-foreground">{res.caseFigures.nonCod.packages} paket · {res.caseFigures.nonCod.distanceKm} km</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">COD (kasus)</p>
        <p class="kpi-value text-xl text-destructive-foreground">{res.caseFigures.cod.durationMin} menit</p>
        <p class="text-xs text-muted-foreground">+{Math.round((res.caseFigures.cod.durationMin / res.caseFigures.nonCod.durationMin - 1) * 100)}% lebih lambat</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">Waktu tunggu COD</p>
        <p class="kpi-value text-xl">{fmt(res.baseline.waitPerCodPkgMin)} menit</p>
        <p class="text-xs text-muted-foreground">per paket COD (verifikasi + bayar + inspeksi)</p>
      </div>
    </div>

    <!-- Kontrol interaktif -->
    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-base font-semibold">Simulator intervensi</p>
      <p class="text-[13.5px] text-muted-foreground">Atur porsi COD & intervensi digital, lihat dampaknya pada kapasitas shift kurir.</p>

      <div class="mt-4 grid gap-5 lg:grid-cols-2">
        <div class="space-y-4">
          <label class="block">
            <span class="flex items-center justify-between text-sm font-medium">
              <span>Porsi paket COD</span>
              <span class="kpi-value text-primary">{codShare}%</span>
            </span>
            <input
              type="range" min="0" max="100" step="5" value={codShare}
              oninput={(e) => (codShare = Number((e.currentTarget as HTMLInputElement).value))}
              onchange={() => void recompute()}
              aria-label="Porsi paket COD per shift"
              class="mt-2 w-full accent-[var(--color-primary)]"
            />
          </label>
          <label class="block">
            <span class="flex items-center justify-between text-sm font-medium">
              <span>Paket per shift</span>
              <span class="kpi-value text-primary">{packagesPerShift}</span>
            </span>
            <input
              type="range" min="16" max="80" step="4" value={packagesPerShift}
              oninput={(e) => (packagesPerShift = Number((e.currentTarget as HTMLInputElement).value))}
              onchange={() => void recompute()}
              aria-label="Jumlah paket per shift"
              class="mt-2 w-full accent-[var(--color-primary)]"
            />
          </label>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Intervensi digital (aktifkan)</p>
          {#each res.interventionCatalog as iv (iv.key)}
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/40">
              <input
                type="checkbox" checked={active.has(iv.key)}
                onchange={(e) => toggle(iv.key, (e.currentTarget as HTMLInputElement).checked)}
                class="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
              />
              <span class="min-w-0">
                <span class="block text-sm font-medium">{iv.label}</span>
                <span class="block text-xs text-muted-foreground">pangkas ~{iv.cutPct}% waktu tunggu COD</span>
              </span>
            </label>
          {/each}
        </div>
      </div>
    </section>

    <!-- Hasil dampak -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" class:opacity-60={busy}>
      <MetricCard
        label="Waktu Dihemat / Shift"
        value={`${fmt(res.impact.minutesSavedPerShift)} mnt`}
        sub={`shift ${fmt(res.baseline.shiftDurationMin)} → ${fmt(res.optimized.shiftDurationMin)} mnt`}
        accent
      />
      <MetricCard
        label="Paket Ekstra / Shift"
        value={`+${fmt(res.impact.extraPackagesPerShift)}`}
        sub={`kapasitas +${fmt(res.impact.extraCapacityPct)}%`}
        deltaTone="up"
        delta={`+${fmt(res.impact.extraCapacityPct)}%`}
      />
      <MetricCard
        label="Nilai Dihemat / Shift"
        value={rupiah(res.impact.savedIdrPerShift)}
        sub="upah kurir efektif (asumsi)"
      />
      <MetricCard
        label="Emisi Idle Dihindari"
        value={`${fmt(res.impact.savedCo2GramPerShift / 1000)} kg`}
        sub="CO₂ per shift (proxy asumsi)"
      />
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Durasi shift: baseline vs intervensi</p>
        {#if durationChart}
          <EChart option={durationChart} height={260} label="Durasi shift baseline vs intervensi" />
        {/if}
        <p class="mt-2 text-xs text-muted-foreground">
          Paket COD: {fmt(res.split.codPackages)} · non-COD: {fmt(res.split.nonCodPackages)}. Pemangkasan intervensi = {fmt(res.input.interventionCutPct)}%.
        </p>
      </div>

      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Proyeksi 100 kurir / hari</p>
        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span class="text-muted-foreground">Jam kerja dihemat</span>
            <span class="kpi-value text-primary">{fmt(res.impact.hoursSavedPer100Couriers)} jam</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span class="text-muted-foreground">Paket ekstra tersalur</span>
            <span class="kpi-value text-primary">+{fmt(res.impact.extraPackagesPerShift * 100)} paket</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span class="text-muted-foreground">Nilai dihemat (100 kurir)</span>
            <span class="kpi-value text-primary">{rupiah(res.impact.savedIdrPerShift * 100)}</span>
          </div>
        </div>
        <p class="mt-3 text-xs text-muted-foreground">
          Ekstrapolasi linier dari model per-shift. Angka upah & CO₂ = asumsi tim (prototipe), bukan data dokumen.
        </p>
      </div>
    </div>

    <!-- Rekomendasi -->
    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
      <span class="font-medium">Rekomendasi keputusan:</span>
      kurir <strong>tidak boleh jadi kasir keliling</strong>. Triase paket COD berisiko → <strong>pre-payment link</strong> atau <strong>PUDO</strong> sebelum rute dimulai.
      Kombinasi pre-payment + slot confirmation memangkas waktu tunggu paling efisien; clustering rute COD menyempurnakan sisanya. Setiap menit yang dihemat = kapasitas paket baru tanpa menambah kurir.
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-base font-semibold">Skenario preset (auto-demo)</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th scope="col" class="px-3 py-2">Skenario</th>
              <th scope="col" class="px-3 py-2 text-right">Durasi shift</th>
              <th scope="col" class="px-3 py-2 text-right">Hemat</th>
              <th scope="col" class="px-3 py-2 text-right">Paket ekstra</th>
              <th scope="col" class="px-3 py-2 text-right">Kapasitas</th>
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(scenarios) as [name, s] (name)}
              <tr class="border-b last:border-0">
                <td class="px-3 py-2">{name}</td>
                <td class="px-3 py-2 text-right tabular-nums">{fmt(s.optimized.shiftDurationMin)} mnt</td>
                <td class="px-3 py-2 text-right tabular-nums text-primary">{s.impact.minutesSavedPerShift > 0 ? "+" : ""}{fmt(s.impact.minutesSavedPerShift)} mnt</td>
                <td class="px-3 py-2 text-right tabular-nums">+{fmt(s.impact.extraPackagesPerShift)}</td>
                <td class="px-3 py-2 text-right tabular-nums">+{fmt(s.impact.extraCapacityPct)}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat simulasi COD</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Muat ulang setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-xs font-semibold text-white">Coba lagi</button>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Simulasi tidak tersedia.</div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-4">{#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}</div>
  {/if}

  <!-- Jembatan ke pesanan COD NYATA (agar simulasi tidak terpisah dari alur kurir) -->
  <CodRealOrdersBridge />
</div>
