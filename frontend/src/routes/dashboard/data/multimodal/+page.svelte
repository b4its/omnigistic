<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import Icon from "$lib/components/Icon.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart, donutChart } from "$lib/charts/options";
  import { api, type ModalShiftResult, type CostLeverResult } from "$lib/api";
  import { notify } from "$lib/toast";

  let res = $state<ModalShiftResult | null>(null);
  let levers = $state<CostLeverResult | null>(null);
  let loaded = $state(false);
  let failed = $state(false);
  let busy = $state(false);

  // Kontrol interaktif
  let slaHours = $state(48);
  let wCost = $state(50);
  let wCo2 = $state(30);
  let wSpeed = $state(20);
  let activeModes = new SvelteSet<string>(["darat", "laut", "udara"]);

  function toggleMode(mode: string, on: boolean) {
    if (on) activeModes.add(mode);
    else activeModes.delete(mode);
    if (activeModes.size === 0) {
      activeModes.add(mode); // jangan sampai kosong
      notify({ message: "Minimal satu moda harus aktif", type: "warn", title: "Modal Shift" });
      return;
    }
    void recompute();
  }

  async function recompute() {
    busy = true;
    try {
      res = await api.modalShift({
        mode_filter: [...activeModes],
        weights: { cost: wCost / 100, emission: wCo2 / 100, speed: wSpeed / 100 },
        sla_hours: slaHours
      });
    } catch {
      notify({ message: "Gagal menghitung ulang optimizer", type: "error", title: "Modal Shift" });
    }
    busy = false;
  }

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat optimizer modal shift…", type: "info", title: "Control Tower" });
    try {
      [res, levers] = await Promise.all([api.modalShift(), api.costLevers()]);
      if (res) {
        wCost = Math.round(res.weights.cost * 100);
        wCo2 = Math.round(res.weights.emission * 100);
        wSpeed = Math.round(res.weights.speed * 100);
        slaHours = res.slaHours;
      }
      if (userTriggered) notify({ message: "Optimizer dimuat", type: "success", title: "Control Tower" });
    } catch {
      res = null;
      levers = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat optimizer", type: "error", title: "Control Tower" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const rp = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(n));
  const modalLabel = (m: string) => (m === "darat" ? "Darat" : m === "laut" ? "Laut" : m === "udara" ? "Udara" : m);
  const modeColor: Record<string, string> = { darat: "var(--color-chart-4)", laut: "var(--color-chart-3)", udara: "var(--color-primary)" };

  const modeMixDonut = $derived(
    res ? Object.entries(res.summary.modeMix).map(([m, n]) => ({ name: modalLabel(m), value: n, color: modeColor[m] ?? "var(--color-muted-foreground)" })) : []
  );

  const leverChart = $derived(
    levers
      ? barChart(
          levers.levers.map((l) => l.lever.split(" ").slice(0, 2).join(" ")),
          [{ name: "Potensi hemat (T IDR)", data: levers.levers.map((l) => l.costImpactIdrT), color: "var(--color-primary)" }],
          { rotate: 25, hideLegend: true }
        )
      : null
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">Multimodal Control Tower</h1>
      <p class="text-sm text-muted-foreground">
        Optimizer modal-shift: pilih moda per koridor menurut biaya, emisi, & SLA. Menjawab Pertanyaan 6 (reduce cost + sustainability).
      </p>
    </div>
    <span class="hub-label text-muted-foreground">Interaktif</span>
  </div>

  {#if loaded && res}
    <!-- Ringkasan -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Penghematan Biaya" value={`${res.summary.costSavingPct}%`} sub="vs baseline ekspres (tercepat)" accent delta={`${res.summary.costSavingPct}%`} deltaTone="up" />
      <MetricCard label="Penghematan Emisi" value={`${res.summary.co2SavingPct}%`} sub="gram CO₂ per paket" delta={`${res.summary.co2SavingPct}%`} deltaTone="up" />
      <MetricCard label="Koridor Teroptimasi" value={`${res.summary.routes}`} sub="antar-region" />
      <MetricCard label="Biaya Optimasi" value={rp(res.summary.totalCostPerPkgIdr)} sub={`baseline ${rp(res.summary.baselineCostPerPkgIdr)}`} />
    </div>

    <!-- Kontrol -->
    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-base font-semibold">Parameter optimizer</p>
      <p class="text-[13.5px] text-muted-foreground">Tarif moda = asumsi tim (dokumen kasus tidak memuat tarif). Ubah bobot & SLA untuk menguji strategi.</p>
      <div class="mt-4 grid gap-5 lg:grid-cols-2">
        <div class="space-y-4">
          <label class="block">
            <span class="flex items-center justify-between text-sm font-medium"><span>Bobot biaya</span><span class="kpi-value text-primary">{wCost}%</span></span>
            <input type="range" min="0" max="100" step="5" value={wCost} oninput={(e) => (wCost = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Bobot biaya" class="mt-2 w-full accent-[var(--color-primary)]" />
          </label>
          <label class="block">
            <span class="flex items-center justify-between text-sm font-medium"><span>Bobot emisi (CO₂)</span><span class="kpi-value text-primary">{wCo2}%</span></span>
            <input type="range" min="0" max="100" step="5" value={wCo2} oninput={(e) => (wCo2 = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Bobot emisi" class="mt-2 w-full accent-[var(--color-primary)]" />
          </label>
          <label class="block">
            <span class="flex items-center justify-between text-sm font-medium"><span>Bobot kecepatan (SLA)</span><span class="kpi-value text-primary">{wSpeed}%</span></span>
            <input type="range" min="0" max="100" step="5" value={wSpeed} oninput={(e) => (wSpeed = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Bobot kecepatan" class="mt-2 w-full accent-[var(--color-primary)]" />
          </label>
          <label class="block">
            <span class="flex items-center justify-between text-sm font-medium"><span>Batas SLA (jam)</span><span class="kpi-value text-primary">{slaHours} jam</span></span>
            <input type="range" min="6" max="120" step="6" value={slaHours} oninput={(e) => (slaHours = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Batas SLA jam" class="mt-2 w-full accent-[var(--color-primary)]" />
          </label>
        </div>
        <div class="space-y-2">
          <p class="text-sm font-medium">Moda diizinkan</p>
          {#each Object.entries(res.modes) as [key, m] (key)}
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/40">
              <input type="checkbox" checked={activeModes.has(key)} onchange={(e) => toggleMode(key, (e.currentTarget as HTMLInputElement).checked)} class="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
              <span class="min-w-0">
                <span class="block text-sm font-medium">{m.label}</span>
                <span class="block text-xs text-muted-foreground">{m.owned ? "Dikelola GC" : "Pihak ketiga"} · Rp{m.costIdrPerPkgKm}/pkg-km · {m.co2GPerPkgKm} g CO₂ · {m.speedKmh} km/j</span>
              </span>
            </label>
          {/each}
        </div>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[1fr_300px]" class:opacity-60={busy}>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Pilihan moda per koridor (vs baseline ekspres)</p>
        <div class="max-h-[380px] space-y-2 overflow-y-auto pr-1">
          {#each res.routes as r, i (`${r.dest}-${i}`)}
            <div class="rounded-xl border border-border bg-background/40 p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="flex items-center gap-2 text-sm font-medium">
                  <span class="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white" style="background:{modeColor[r.chosen.mode]}">{modalLabel(r.chosen.mode)}</span>
                  {r.dest} <span class="text-xs text-muted-foreground">· {r.toRegion} · {r.distanceKm} km</span>
                </span>
                <span class="text-xs text-muted-foreground">{r.chosen.etaHours} jam {r.chosen.withinSla ? "" : "(di luar SLA→dipaksa)"}</span>
              </div>
              <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
                <span>Biaya: <span class="font-medium text-foreground">{rp(r.chosen.costPerPkgIdr)}</span> <span class="text-primary">({r.saving.costPct > 0 ? "−" : "+"}{Math.abs(r.saving.costPct)}%)</span></span>
                <span>CO₂: <span class="font-medium text-foreground">{r.chosen.co2GPerPkg} g</span> <span class="text-primary">({r.saving.co2Pct > 0 ? "−" : "+"}{Math.abs(r.saving.co2Pct)}%)</span></span>
                <span class="text-muted-foreground/80">alternatif: {r.options.map((o) => modalLabel(o.mode)).join(" / ")}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="mb-2 text-sm font-medium">Bauran moda terpilih</p>
        {#if modeMixDonut.length}<EChart option={donutChart(modeMixDonut)} height={220} label="Bauran moda terpilih" />{/if}
      </div>
    </div>

    <!-- Portofolio tuas biaya -->
    {#if levers}
      <section class="space-y-4">
        <div class="rounded-2xl border border-border bg-card p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-base font-semibold">Portofolio tuas pengurangan biaya</p>
              <p class="text-[13.5px] text-muted-foreground">6 strategi (Pertanyaan 6): potensi hemat + dampak sustainability. Basis biaya {levers.basisYear}: {levers.totalCostT}T IDR.</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold tabular-nums text-primary">{levers.summary.totalSavingIdrT}T</p>
              <p class="text-xs text-muted-foreground">≈ {levers.summary.savingPctOfCost}% dari total biaya</p>
            </div>
          </div>
        </div>

        {#if leverChart}
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">Potensi penghematan per tuas (T IDR)</p>
            <EChart option={leverChart} height={280} label="Potensi penghematan per tuas biaya" />
          </div>
        {/if}

        <div class="grid gap-3 md:grid-cols-2">
          {#each levers.levers as l (l.lever)}
            <div class="rounded-2xl border border-border bg-card p-4">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-semibold text-foreground">{l.lever}</p>
                <span class="shrink-0 rounded-full border border-[color-mix(in_oklab,var(--bitcoin)_40%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_10%,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--bitcoin)]">−{l.costPct}%</span>
              </div>
              <p class="mt-1 text-[13.5px] text-muted-foreground">{l.mechanism}</p>
              <div class="mt-2 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
                <span>Hemat: <span class="font-medium text-foreground">Rp{l.costImpactIdrT}T</span></span>
                <span>CO₂: <span class="font-medium text-[color:var(--color-chart-3)]">−{l.co2Pct}%</span></span>
              </div>
              <p class="mt-2 text-[12px] italic text-muted-foreground">{l.evidence}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
      <span class="font-medium">Insight:</span> strategi ini menurunkan biaya <strong>tanpa</strong> memotong layanan — dengan menggeser paket non-ekspres ke moda laut/darat yang lebih murah & rendah emisi,
      sambil menjaga SLA. Control Tower mengendalikan moda lewat <strong>data</strong>, bukan kepemilikan aset (laut & udara tetap mitra).
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <Icon name="warn" cls="mx-auto h-6 w-6" />
      <p class="mt-2 text-sm font-semibold text-foreground">Gagal memuat optimizer</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Coba lagi setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-xs font-semibold text-white">Coba lagi</button>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-4">{#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}</div>
    <div class="h-72 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
