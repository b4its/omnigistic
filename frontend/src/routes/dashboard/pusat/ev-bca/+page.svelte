<script lang="ts">
  import { onMount } from "svelte";
  import { api, type EvBcaResult, type EvBcaScenario } from "$lib/api";
  import { notify } from "$lib/toast";
  import Icon from "$lib/components/Icon.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart, lineChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let res = $state<EvBcaResult | null>(null);
  let loaded = $state(false);
  let failed = $state(false);
  let busy = $state(false);

  // Kontrol interaktif (menggerakkan engine nyata, bukan label kosong).
  let units = $state(200);
  let pertamax = $state<number | null>(null); // null = pakai benchmark nasional
  let includeMaintenance = $state(false);
  let discountRate = $state(10); // % (8–20)
  let tariff = $state<number | null>(null); // IDR/kWh, null = tarif PLN
  let batteryLease = $state<number | null>(null); // IDR/unit/tahun
  let evPrice = $state<number | null>(null); // IDR/unit
  let icePrice = $state<number | null>(null); // IDR/unit
  let scenarioKey = $state<"conservative" | "base" | "upside">("base");
  let view = $state<"replacement" | "incremental">("replacement");
  let tab = $state<"kpi" | "cashflow" | "roadmap">("kpi");

  async function load(userTriggered = false) {
    failed = false;
    if (userTriggered) notify({ message: "Menghitung ulang BCA armada EV…", type: "info", title: "EV BCA" });
    try {
      res = await api.evBca({
        units,
        pertamax_override: pertamax ?? undefined,
        include_maintenance: includeMaintenance,
        discount_rate: discountRate / 100,
        tariff_override: tariff ?? undefined,
        battery_lease_override: batteryLease ?? undefined,
        ev_price_override: evPrice ?? undefined,
        ice_price_override: icePrice ?? undefined
      });
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal menghitung BCA", type: "error", title: "EV BCA" });
    }
    loaded = true;
  }

  async function run() {
    busy = true;
    await load(true);
    busy = false;
  }

  onMount(() => void load());

  const scen = $derived<EvBcaScenario | null>(
    res ? (view === "replacement" ? res.scenarios[scenarioKey] : res.incrementalFleetStressTest[scenarioKey]) : null
  );
  const incScen = $derived<EvBcaScenario | null>(res ? res.incrementalFleetStressTest.base : null);

  const SCEN_LABEL: Record<string, string> = { conservative: "Konservatif", base: "Base", upside: "Upside" };
  const SCEN_NOTE: Record<string, string> = {
    conservative: "40 km/unit/hari · 45 km/L · 27 Wh/km · loss 20%",
    base: "60 km/unit/hari · 50 km/L · 23 Wh/km · loss 15%",
    upside: "80 km/unit/hari · 55 km/L · 22 Wh/km · loss 10%"
  };

  // Format rupiah ringkas (T/M/jt) yang aman untuk nilai negatif & nol.
  function idr(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (abs >= 1e12) return `${sign}Rp${numId(abs / 1e12, 2)} T`;
    if (abs >= 1e9) return `${sign}Rp${numId(abs / 1e9, 2)} M`;
    if (abs >= 1e6) return `${sign}Rp${numId(abs / 1e6, 1)} jt`;
    return `${sign}Rp${numId(abs, 0)}`;
  }

  // ── Charts ──
  const npvChart = $derived(
    res
      ? barChart(
          ["Konservatif", "Base", "Upside"],
          [
            {
              name: `NPV @${numId(res.inputs.discountRatePct, 0)}% (Rp M)`,
              data: (["conservative", "base", "upside"] as const).map((k) => Math.round(res!.scenarios[k].kpi.npvIdr / 1e9))
            }
          ],
          { maxBarWidth: 56 }
        )
      : null
  );

  // Cashflow kumulatif (nominal + diskon) untuk skenario terpilih.
  const cashflowChart = $derived(
    scen
      ? lineChart(
          scen.cashflow.rows.map((r) => `Y${r.year}`),
          [
            {
              name: "Kumulatif nominal (Rp M)",
              data: scen.cashflow.rows.map((r) => Math.round(r.cumulativeIdr / 1e6)),
              color: "var(--bitcoin)",
              smooth: true,
              area: true
            },
            {
              name: "Kumulatif diskon (Rp M)",
              data: scen.cashflow.rows.map((r) => Math.round((r.cumulativeDiscountedIdr ?? r.cumulativeIdr) / 1e6)),
              color: "var(--color-primary)",
              smooth: true
            }
          ]
        )
      : null
  );

  // Sensitivitas utilisasi: NPV replacement vs incremental (garis impas).
  const sensChart = $derived(
    res
      ? lineChart(
          res.utilizationSensitivity.rows.map((r) => `${numId(r.distanceKmPerUnitDay, 0)}`),
          [
            {
              name: "NPV replacement (Rp M)",
              data: res.utilizationSensitivity.rows.map((r) => Math.round(r.npvIdr / 1e6)),
              color: "var(--bitcoin)",
              smooth: true,
              area: true
            },
            {
              name: "NPV fleet tambahan (Rp M)",
              data: res.utilizationSensitivity.incrementalRows.map((r) => Math.round(r.npvIdr / 1e6)),
              color: "var(--color-primary)",
              smooth: true
            }
          ]
        )
      : null
  );

  const co2Chart = $derived(
    res
      ? barChart(
          ["Konservatif", "Base", "Upside"],
          [
            {
              name: "CO₂ turun (t/th)",
              data: (["conservative", "base", "upside"] as const).map((k) => res!.scenarios[k].co2.reductionTonsYear),
              color: "var(--color-success, #16a34a)"
            }
          ],
          { maxBarWidth: 56 }
        )
      : null
  );

  const PRESETS = [
    { label: "Target kasus · 200 unit", u: 200, p: null, m: false, dr: 10, t: null, b: null, ev: null, ice: null },
    { label: "Skala 500 unit", u: 500, p: null, m: false, dr: 10, t: null, b: null, ev: null, ice: null },
    { label: "Pertamax premium Rp18.000", u: 200, p: 18000, m: false, dr: 10, t: null, b: null, ev: null, ice: null },
    { label: "Listrik naik Rp2.000/kWh", u: 200, p: null, m: false, dr: 10, t: 2000, b: null, ev: null, ice: null },
    { label: "Tanpa sewa baterai (beli)", u: 200, p: null, m: false, dr: 10, t: null, b: 0, ev: null, ice: null },
    { label: "Diskon 15% + maintenance", u: 200, p: null, m: true, dr: 15, t: null, b: null, ev: null, ice: null }
  ];

  function applyPreset(p: (typeof PRESETS)[number]) {
    units = p.u;
    pertamax = p.p;
    includeMaintenance = p.m;
    discountRate = p.dr;
    tariff = p.t;
    batteryLease = p.b;
    evPrice = p.ev;
    icePrice = p.ice;
    void run();
  }

  function resetLevers() {
    units = 200;
    pertamax = null;
    includeMaintenance = false;
    discountRate = 10;
    tariff = null;
    batteryLease = null;
    evPrice = null;
    icePrice = null;
    void run();
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">EV Fleet Benefit-Cost Analysis</h1>
      <p class="text-sm text-muted-foreground">
        BCA konversi armada ICE → EV dengan <span class="font-medium text-foreground">benchmark nasional</span> (bukan harga satu provinsi).
        Pertamax capacity-weighted atas 23 hub · tarif PLN B-2/TR · skema Battery-as-a-Service · roadmap 3 fase.
      </p>
    </div>
    <div class="flex gap-2">
      <button type="button" onclick={resetLevers} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-60">
        Reset
      </button>
      <button type="button" onclick={() => run()} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
        <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Hitung ulang"}
      </button>
    </div>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle="Gagal menghitung BCA" errorHint="Backend offline. Coba lagi setelah backend aktif." onretry={() => run()} />
  {:else if loaded && res}
    <!-- Headline disclaimer: replacement vs incremental -->
    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-4">
      <p class="text-sm">
        <span class="font-semibold">Headline disarankan:</span> NPV <strong>{idr(res.headline.npvIdr)}</strong> ·
        Discounted BCR <strong>{numId(res.headline.bcrDiscounted, 2)}×</strong> ·
        Net saving <strong>{idr(res.headline.annualNetSavingIdr)}/th</strong> ·
        CO₂ turun <strong>{numId(res.headline.co2ReductionTonsYear, 1)} t/th</strong>.
      </p>
      <p class="mt-1 text-xs text-muted-foreground">⚠ {res.headline.caveat}</p>
    </div>

    <!-- Panel benchmark nasional -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Pertamax (weighted)</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.inputs.pertamaxIdrPerL, 0)}<span class="text-sm text-muted-foreground">/L</span></p>
        <p class="mt-1 text-xs text-muted-foreground">capacity-weighted {numId(res.references.pertamax.totalCapacityM, 3)} jt/hari · 23 hub</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Listrik PLN B-2/TR</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.inputs.tariffIdrPerKwh, 2)}<span class="text-sm text-muted-foreground">/kWh</span></p>
        <p class="mt-1 text-xs text-muted-foreground">berlaku nasional</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">EV vs ICE (benchmark pasar)</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{idr(res.inputs.evUnitPriceIdr)}<span class="text-sm text-muted-foreground"> /unit</span></p>
        <p class="mt-1 text-xs text-muted-foreground">ICE {idr(res.inputs.iceUnitPriceIdr)}/unit</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Battery-as-a-Service</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.references.batteryLeaseIdrPerMonth, 0)}<span class="text-sm text-muted-foreground">/bln</span></p>
        <p class="mt-1 text-xs text-muted-foreground">sewa baterai → penggantian masuk opex</p>
      </div>
    </div>

    <!-- Kontrol simulasi -->
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <p class="text-sm font-semibold">Simulasi fleet & tuas ekonomi</p>
      <p class="mt-1 text-xs text-muted-foreground">Geser & hitung ulang — engine menghitung ulang seluruh skenario, arus kas, & emisi secara nyata.</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Jumlah unit EV</span><span class="kpi-value text-foreground">{numId(units, 0)}</span></span>
          <input type="range" min="50" max="1000" step="50" bind:value={units} aria-label="Jumlah unit EV" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Harga Pertamax</span><span class="kpi-value text-foreground">{pertamax == null ? "nasional" : "Rp" + numId(pertamax, 0)}</span></span>
          <input type="range" min="0" max="20000" step="250" value={pertamax ?? 0} oninput={(e) => (pertamax = (e.currentTarget as HTMLInputElement).valueAsNumber === 0 ? null : (e.currentTarget as HTMLInputElement).valueAsNumber)} aria-label="Harga Pertamax" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Tarif listrik</span><span class="kpi-value text-foreground">{tariff == null ? "PLN B-2/TR" : "Rp" + numId(tariff, 0) + "/kWh"}</span></span>
          <input type="range" min="0" max="3000" step="50" value={tariff ?? 0} oninput={(e) => (tariff = (e.currentTarget as HTMLInputElement).valueAsNumber === 0 ? null : (e.currentTarget as HTMLInputElement).valueAsNumber)} aria-label="Tarif listrik" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Sewa baterai /unit/th</span><span class="kpi-value text-foreground">{batteryLease == null ? "Rp1,5 jt" : idr(batteryLease)}</span></span>
          <input type="range" min="0" max="3000000" step="100000" value={batteryLease ?? 0} oninput={(e) => (batteryLease = (e.currentTarget as HTMLInputElement).valueAsNumber === 0 ? null : (e.currentTarget as HTMLInputElement).valueAsNumber)} aria-label="Sewa baterai" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Discount rate</span><span class="kpi-value text-foreground">{numId(discountRate, 0)}%</span></span>
          <input type="range" min="8" max="20" step="1" bind:value={discountRate} aria-label="Discount rate" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="flex items-end gap-2 pb-1">
          <input type="checkbox" bind:checked={includeMaintenance} class="h-4 w-4 accent-[var(--bitcoin)]" />
          <span class="text-xs text-muted-foreground">Sertakan maintenance saving (opsional, Rp720 rb/unit/th)</span>
        </label>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        {#each PRESETS as p (p.label)}
          <button type="button" onclick={() => applyPreset(p)} class="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:text-foreground">{p.label}</button>
        {/each}
      </div>
      <button type="button" onclick={run} disabled={busy} class="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_-5px_var(--glow)] transition-all duration-300 hover:scale-[1.03] disabled:opacity-60">
        <Icon name="activity" cls="h-3.5 w-3.5" weight="bold" /> Hitung BCA
      </button>
    </div>

    <!-- Toggle skenario & mode -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="inline-flex rounded-full border border-border bg-card p-1">
        {#each (["conservative", "base", "upside"] as const) as k (k)}
          <button type="button" onclick={() => (scenarioKey = k)} class="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors {scenarioKey === k ? 'bg-[var(--bitcoin)] text-white' : 'text-muted-foreground hover:text-foreground'}">{SCEN_LABEL[k]}</button>
        {/each}
      </div>
      <div class="inline-flex rounded-full border border-border bg-card p-1">
        <button type="button" onclick={() => (view = "replacement")} class="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors {view === 'replacement' ? 'bg-[var(--bitcoin)] text-white' : 'text-muted-foreground hover:text-foreground'}">Replacement</button>
        <button type="button" onclick={() => (view = "incremental")} class="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors {view === 'incremental' ? 'bg-[var(--bitcoin)] text-white' : 'text-muted-foreground hover:text-foreground'}">Fleet tambahan</button>
      </div>
      <span class="text-xs text-muted-foreground">{SCEN_NOTE[scenarioKey]}</span>
    </div>

    {#if scen}
      {#if view === "incremental"}
        <div class="rounded-xl border border-[color-mix(in_oklab,var(--destructive,#ef4444)_40%,transparent)] bg-destructive/5 p-3 text-xs">
          <span class="font-semibold">Stress-test fleet tambahan:</span> tanpa ICE yang dihindari, seluruh harga EV jadi capex. Pada base,
          NPV {idr(incScen?.kpi.npvIdr ?? 0)} & BCR diskon {numId(incScen?.kpi.bcrDiscounted ?? 0, 2)}× — economics jauh lebih lemah.
          Ambang utilisasi impas fleet tambahan ≈ {res.utilizationSensitivity.breakevenIncrementalKmPerUnitDay ?? "—"} km/unit/hari.
        </div>
      {/if}

      <!-- KPI skenario terpilih -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Net operating saving</p>
          <p class="kpi-value mt-2 font-heading text-2xl">{idr(scen.annual.netAnnualSavingIdr)}<span class="text-sm text-muted-foreground">/th</span></p>
          <p class="mt-1 text-xs text-muted-foreground">fuel {idr(scen.annual.iceFuelCostIdr)} − listrik {idr(scen.annual.evEnergyCostIdr)} − baterai {idr(scen.annual.batteryLeaseIdr)}{scen.annual.maintenanceSavingIdr ? ` + maint ${idr(scen.annual.maintenanceSavingIdr)}` : ""}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">NPV @{numId(res.inputs.discountRatePct, 0)}% · 5 tahun</p>
          <p class="kpi-value mt-2 font-heading text-2xl {scen.kpi.npvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(scen.kpi.npvIdr)}</p>
          <p class="mt-1 text-xs text-muted-foreground">initial {idr(scen.capex.initialInvestmentIdr)}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">BCR (simple · diskon)</p>
          <p class="kpi-value mt-2 font-heading text-2xl">{numId(scen.kpi.bcrSimple, 2)}× <span class="text-sm text-muted-foreground">· {numId(scen.kpi.bcrDiscounted, 2)}×</span></p>
          <p class="mt-1 text-xs text-muted-foreground">ROI 5-th {numId(scen.kpi.roi5yPct, 0)}%</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Payback · CO₂</p>
          <p class="kpi-value mt-2 font-heading text-2xl">{scen.kpi.paybackYears == null ? "—" : numId(scen.kpi.paybackMonths ?? 0, 2) + " bln"}</p>
          <p class="mt-1 text-xs text-muted-foreground">CO₂ turun {numId(scen.co2.reductionTonsYear, 1)} t/th · 5-th {numId(scen.co2.reductionTons5y, 0)} t</p>
        </div>
      </div>

      <!-- Tab: KPI / Arus kas / Roadmap -->
      <div class="inline-flex rounded-full border border-border bg-card p-1">
        {#each ([["kpi", "Analisis KPI"], ["cashflow", "Arus Kas"], ["roadmap", "Roadmap Rollout"]] as const) as [k, label] (k)}
          <button type="button" onclick={() => (tab = k)} class="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors {tab === k ? 'bg-[var(--bitcoin)] text-white' : 'text-muted-foreground hover:text-foreground'}">{label}</button>
        {/each}
      </div>

      {#if tab === "kpi"}
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">NPV per skenario (replacement, Rp M)</p>
            {#if npvChart}<EChart option={npvChart} height={260} label="NPV per skenario" />{/if}
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">CO₂ turun per skenario (ton/tahun, operasional)</p>
            {#if co2Chart}<EChart option={co2Chart} height={260} label="CO2 per skenario" />{/if}
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="overflow-x-auto rounded-2xl border border-border bg-card">
            <table class="w-full text-sm">
              <caption class="sr-only">Rincian tahunan & capex skenario terpilih</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">Pos</th>
                  <th class="px-4 py-2.5 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border/60"><td class="px-4 py-2">Jarak tahunan</td><td class="px-4 py-2 text-right tabular-nums">{numId(scen.annual.distanceKm / 1e6, 2)} jt km</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">BBM ICE (dihindari)</td><td class="px-4 py-2 text-right tabular-nums">{numId(scen.annual.iceLiters, 0)} L · {idr(scen.annual.iceFuelCostIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">Listrik EV</td><td class="px-4 py-2 text-right tabular-nums">{numId(scen.annual.evKwh, 0)} kWh · {idr(scen.annual.evEnergyCostIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">Sewa baterai (BaaS)</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.annual.batteryLeaseIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">Selisih harga kendaraan</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.capex.vehicleDeltaIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">Infrastruktur charging</td><td class="px-4 py-2 text-right tabular-nums">{scen.capex.chargingPoints} titik · {numId(scen.capex.dailyKwhDemand, 0)} kWh/hari · {idr(scen.capex.chargingInfraIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">Implementasi + pelatihan</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.capex.implementationTrainingIdr)}</td></tr>
                <tr class="border-b border-border/60 bg-muted/30 font-medium"><td class="px-4 py-2">Total investasi awal</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.capex.initialInvestmentIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">Fuel benefit 5-th</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.kpi.fuelBenefit5yIdr)}</td></tr>
                <tr><td class="px-4 py-2">Total cost 5-th</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.kpi.totalCost5yIdr)}</td></tr>
              </tbody>
            </table>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-border bg-card p-5">
              <p class="mb-3 text-sm font-medium">Tabel benchmark vs asumsi</p>
              <div class="space-y-1.5 text-xs">
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">Pertamax (data pasar)</span><span class="kpi-value">Rp{numId(res.references.pertamax.priceIdrPerL, 0)}/L · capacity-weighted</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">Listrik PLN B-2/TR (data)</span><span class="kpi-value">Rp{numId(res.references.plnTariffIdrPerKwh, 2)}/kWh</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">EV benchmark (data pasar)</span><span class="kpi-value">{idr(res.references.evUnitPriceIdr)} · {numId(res.references.evBatteryKwh, 2)} kWh</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">ICE benchmark (data pasar)</span><span class="kpi-value">{idr(res.references.iceUnitPriceIdr)}</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">Faktor emisi bensin / grid</span><span class="kpi-value">{numId(res.references.gasolineCo2KgPerL, 2)} kg/L · {numId(res.references.gridCo2KgPerKwh, 3)} kg/kWh</span></p>
                <hr class="border-border" />
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">Utilisasi (asumsi tim)</span><span class="kpi-value">{numId(scen.assumptions.distanceKmPerUnitDay, 0)} km/unit/hari</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">Efisiensi ICE (asumsi)</span><span class="kpi-value">{numId(scen.assumptions.iceEfficiencyKmPerL, 0)} km/L</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">Konsumsi EV (asumsi)</span><span class="kpi-value">{numId(scen.assumptions.evWhPerKm, 0)} Wh/km · loss {numId(scen.assumptions.chargingLossPct, 0)}%</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">Discount rate (asumsi)</span><span class="kpi-value">{numId(scen.assumptions.discountRatePct, 0)}%</span></p>
              </div>
            </div>
            <div class="rounded-xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
              <span class="font-medium">Temuan strategis:</span> {res.strategicTakeaway}
            </div>
          </div>
        </div>

        <!-- Tabel perbandingan 3 skenario (replacement vs incremental) -->
        <div class="overflow-x-auto rounded-2xl border border-border bg-card">
          <table class="w-full text-sm">
            <caption class="sr-only">Perbandingan 3 skenario: replacement vs fleet tambahan</caption>
            <thead>
              <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th class="px-4 py-2.5">Metrik</th>
                {#each res.scenarioComparison as row (row.key)}
                  <th class="px-4 py-2.5 text-right">{row.label}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">Utilisasi (km/hari)</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.distanceKmPerUnitDay, 0)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">Jarak tahunan</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId((row.distanceKmPerUnitDay * res.inputs.units * 365) / 1e6, 2)} jt km</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">Fuel cost avoided</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(res.scenarios[row.key].annual.iceFuelCostIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">EV electricity</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(res.scenarios[row.key].annual.evEnergyCostIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">Battery lease</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(res.scenarios[row.key].annual.batteryLeaseIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60 font-medium"><td class="px-4 py-2 text-muted-foreground">Annual net saving</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(row.netAnnualSavingIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">Initial investment</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(row.initialInvestmentIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">BCR (simple)</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(res.scenarios[row.key].kpi.bcrSimple, 2)}×</td>{/each}</tr>
              <tr class="border-b border-border/60 font-medium"><td class="px-4 py-2 text-muted-foreground">Discounted BCR</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.bcrDiscounted, 2)}×</td>{/each}</tr>
              <tr class="border-b border-border/60 font-medium"><td class="px-4 py-2 text-muted-foreground">NPV</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums {row.npvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(row.npvIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">ROI 5-th</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.roi5yPct, 0)}%</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">CO₂ turun/tahun</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.co2ReductionTonsYear, 1)} t</td>{/each}</tr>
              <tr class="border-b border-2 border-border bg-muted/20"><td class="px-4 py-2 text-muted-foreground" colspan={1}><em>Fleet tambahan</em> — NPV</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums {row.incrementalNpvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(row.incrementalNpvIdr)}</td>{/each}</tr>
              <tr><td class="px-4 py-2 text-muted-foreground"><em>Fleet tambahan</em> — BCR diskon</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.incrementalBcrDiscounted, 2)}×</td>{/each}</tr>
            </tbody>
          </table>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-1 text-sm font-medium">Sensitivitas utilisasi — replacement vs fleet tambahan</p>
            <p class="mb-3 text-xs text-muted-foreground">{res.utilizationSensitivity.note} · breakeven fleet tambahan ≈ <strong>{res.utilizationSensitivity.breakevenIncrementalKmPerUnitDay ?? "—"}</strong> km/hari.</p>
            {#if sensChart}<EChart option={sensChart} height={280} label="Sensitivitas utilisasi" />{/if}
          </div>
          <div class="overflow-x-auto rounded-2xl border border-border bg-card">
            <table class="w-full text-sm">
              <caption class="sr-only">Tabel sensitivitas utilisasi (replacement)</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">km/hari</th>
                  <th class="px-4 py-2.5 text-right">Net saving</th>
                  <th class="px-4 py-2.5 text-right">NPV</th>
                  <th class="px-4 py-2.5 text-right">BCR diskon</th>
                </tr>
              </thead>
              <tbody>
                {#each res.utilizationSensitivity.rows as r (r.distanceKmPerUnitDay)}
                  <tr class="border-b border-border/60 last:border-0 {!r.positiveNpv ? 'bg-destructive/5' : ''}">
                    <td class="px-4 py-2 tabular-nums">{numId(r.distanceKmPerUnitDay, 0)}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{idr(r.annualNetSavingIdr)}</td>
                    <td class="px-4 py-2 text-right tabular-nums font-medium {r.positiveNpv ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(r.npvIdr)}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{numId(r.bcrDiscounted, 2)}×</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">Sensitivitas discount rate (base replacement)</p>
            <div class="space-y-1.5 text-xs">
              {#each res.discountRateSensitivity.rows as r (r.discountRatePct)}
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">r = {numId(r.discountRatePct, 0)}%</span><span class="kpi-value">NPV {idr(r.npvIdr)} · BCR {numId(r.bcrDiscounted, 2)}×</span></p>
              {/each}
            </div>
          </div>
          <div class="rounded-xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
            <span class="font-medium">Ambang operasional:</span> {res.utilizationSensitivity.breakevenNote}
          </div>
        </div>
      {:else if tab === "cashflow"}
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">Arus kas kumulatif — {scen.label} ({view === "replacement" ? "replacement" : "fleet tambahan"})</p>
            {#if cashflowChart}<EChart option={cashflowChart} height={300} label="Arus kas kumulatif" />{/if}
          </div>
          <div class="overflow-x-auto rounded-2xl border border-border bg-card">
            <table class="w-full text-sm">
              <caption class="sr-only">Arus kas per tahun</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">Tahun</th>
                  <th class="px-4 py-2.5 text-right">Arus kas</th>
                  <th class="px-4 py-2.5 text-right">Diskon</th>
                  <th class="px-4 py-2.5 text-right">Kumulatif</th>
                </tr>
              </thead>
              <tbody>
                {#each scen.cashflow.rows as r (r.year)}
                  <tr class="border-b border-border/60 last:border-0">
                    <td class="px-4 py-2 font-mono text-xs">Y{r.year}</td>
                    <td class="px-4 py-2 text-right tabular-nums {r.netCashFlowIdr >= 0 ? '' : 'text-destructive-foreground'}">{idr(r.netCashFlowIdr)}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{idr(r.discountedIdr)}</td>
                    <td class="px-4 py-2 text-right tabular-nums font-medium {r.cumulativeIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(r.cumulativeIdr)}</td>
                  </tr>
                {/each}
                <tr class="bg-muted/30 font-medium">
                  <td class="px-4 py-2">Total</td>
                  <td class="px-4 py-2 text-right tabular-nums">{idr(scen.cashflow.totalNetIdr)}</td>
                  <td class="px-4 py-2 text-right tabular-nums">NPV {idr(scen.cashflow.npvIdr)}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{idr(scen.cashflow.totalNetIdr + scen.capex.initialInvestmentIdr)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground">
          <span class="font-medium text-foreground">Catatan interpretasi:</span> Y0 = capex awal (murni investasi, operasi belum berjalan). Bila investasi awal ≤ 0
          (benchmark EV lebih murah dari ICE yang dihindari pada skenario replacement), payback menjadi sangat pendek dan TIDAK boleh dijadikan headline tunggal
          tanpa konteks counterfactual — lihat tab Roadmap & stress-test fleet tambahan.
        </div>
      {:else}
        <!-- Roadmap rollout -->
        <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
          <p class="text-sm font-semibold">Roadmap 3 fase — basis armada {numId(res.roadmap.basisMotorcycles, 0)} motor (kasus)</p>
          <p class="mt-1 text-xs text-muted-foreground">{res.roadmap.note}</p>
          <p class="mt-2 text-xs">Total tercakup simulasi: <strong>{numId(res.roadmap.totalCumulativeUnits, 0)} unit</strong> ({numId(res.roadmap.totalCumulativeUnitsPct, 0)}% basis motor) pada akhir Fase 3.</p>
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          {#each res.roadmap.phases as p (p.phase)}
            <div class="rounded-2xl border border-border bg-card p-5">
              <div class="flex items-center justify-between">
                <p class="font-heading text-lg font-semibold">Fase {p.phase} · {p.label}</p>
                <span class="font-mono text-[11px] text-muted-foreground">bln {p.monthFrom}–{p.monthTo}</span>
              </div>
              <p class="mt-3 kpi-value font-heading text-2xl">{numId(p.cumulativeUnits, 0)}<span class="text-sm text-muted-foreground"> unit kumulatif</span></p>
              <p class="text-xs text-muted-foreground">{numId(p.cumulativeUnitsPctOfMotor, 1)}% basis motor · +{numId(p.addedUnits, 0)} unit fase ini</p>
              <div class="mt-3 space-y-1 text-xs">
                <p class="flex justify-between gap-2"><span class="text-muted-foreground">Investasi fase</span><span class="kpi-value">{idr(p.initialInvestmentIdr)}</span></p>
                <p class="flex justify-between gap-2"><span class="text-muted-foreground">Net saving/th</span><span class="kpi-value">{idr(p.netAnnualSavingIdr)}</span></p>
                <p class="flex justify-between gap-2"><span class="text-muted-foreground">NPV</span><span class="kpi-value {p.npvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(p.npvIdr)}</span></p>
                <p class="flex justify-between gap-2"><span class="text-muted-foreground">CO₂ turun/th</span><span class="kpi-value">{numId(p.co2ReductionTonsYear, 0)} t</span></p>
              </div>
              <p class="mt-3 text-[11px] text-muted-foreground">{p.note}</p>
            </div>
          {/each}
        </div>
        <div class="rounded-xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
          <span class="font-medium">Rekomendasi:</span> mulai dari pilot 1 kota padat (Fase 1) untuk memvalidasi utilisasi nyata, titik charging, dan skema BaaS;
          scale bertahap hanya pada hub ber-utilisasi tinggi; perluasan luas menunggu data pilot. Jangan komit capex 5.000 unit serentak tanpa validasi.
        </div>
      {/if}
    {/if}

    <div class="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">{res.note}</div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={280} />
  {/if}
</div>
