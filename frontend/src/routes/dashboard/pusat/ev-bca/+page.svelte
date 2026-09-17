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
  let scenarioKey = $state<"conservative" | "base" | "upside">("base");
  let view = $state<"replacement" | "incremental">("replacement");

  async function load(userTriggered = false) {
    failed = false;
    if (userTriggered) notify({ message: "Menghitung ulang BCA armada EV…", type: "info", title: "EV BCA" });
    try {
      res = await api.evBca({
        units,
        pertamax_override: pertamax ?? undefined,
        include_maintenance: includeMaintenance
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
  const baseScen = $derived<EvBcaScenario | null>(res ? res.scenarios.base : null);
  const incScen = $derived<EvBcaScenario | null>(res ? res.incrementalFleetStressTest.base : null);

  const SCEN_LABEL: Record<string, string> = { conservative: "Konservatif", base: "Base", upside: "Upside" };
  const SCEN_NOTE: Record<string, string> = {
    conservative: "40 km/unit/hari · 45 km/L · 27 Wh/km · loss 20%",
    base: "60 km/unit/hari · 50 km/L · 23 Wh/km · loss 15%",
    upside: "80 km/unit/hari · 55 km/L · 22 Wh/km · loss 10%"
  };

  // Format miliar/juta rupiah yang ringkas & aman.
  function idr(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const abs = Math.abs(v);
    const sign = v < 0 ? "-" : "";
    if (abs >= 1e12) return `${sign}Rp${numId(abs / 1e12, 2)} T`;
    if (abs >= 1e9) return `${sign}Rp${numId(abs / 1e9, 2)} M`;
    if (abs >= 1e6) return `${sign}Rp${numId(abs / 1e6, 1)} jt`;
    return `${sign}Rp${numId(abs, 0)}`;
  }

  // NPV per skenario (replacement) untuk bar chart.
  const npvChart = $derived(
    res
      ? barChart(
          ["Konservatif", "Base", "Upside"],
          [
            {
              name: "NPV @10% (Rp M)",
              data: (["conservative", "base", "upside"] as const).map((k) => Math.round(res!.scenarios[k].kpi.npvIdr / 1e9))
            }
          ],
          { maxBarWidth: 56 }
        )
      : null
  );

  // Sensitivitas utilisasi → net saving & BCR.
  const sensChart = $derived(
    res
      ? lineChart(
          res.utilizationSensitivity.rows.map((r) => `${numId(r.distanceKmPerUnitDay, 0)} km`),
          [
            {
              name: "Net saving (Rp M/th)",
              data: res.utilizationSensitivity.rows.map((r) => Math.round(r.annualNetSavingIdr / 1e6)),
              color: "var(--color-primary)",
              smooth: true,
              area: true
            },
            {
              name: "BCR diskon (×10)",
              data: res.utilizationSensitivity.rows.map((r) => Math.round(r.bcrDiscounted * 10)),
              color: "var(--bitcoin)",
              smooth: true
            }
          ]
        )
      : null
  );

  // CO₂ reduction per skenario.
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
    { label: "Target kasus · 200 unit", u: 200, p: null, m: false },
    { label: "Skala 500 unit", u: 500, p: null, m: false },
    { label: "Pertamax premium Rp18.000", u: 200, p: 18000, m: false },
    { label: "Termasuk maintenance", u: 200, p: null, m: true }
  ];

  function applyPreset(p: (typeof PRESETS)[number]) {
    units = p.u;
    pertamax = p.p;
    includeMaintenance = p.m;
    void run();
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">EV Fleet Benefit-Cost Analysis</h1>
      <p class="text-sm text-muted-foreground">
        BCA konversi armada ICE → EV dengan <span class="font-medium text-foreground">benchmark nasional</span> (bukan harga satu provinsi).
        Pertamax capacity-weighted atas 23 hub · tarif PLN B-2/TR · skema Battery-as-a-Service.
      </p>
    </div>
    <button type="button" onclick={() => run()} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
      <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Hitung ulang"}
    </button>
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
      <p class="mt-1 text-xs text-muted-foreground">
        ⚠ {res.headline.caveat}
      </p>
    </div>

    <!-- Panel benchmark nasional -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Pertamax (weighted)</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.inputs.pertamaxIdrPerL, 0)}<span class="text-sm text-muted-foreground">/L</span></p>
        <p class="mt-1 text-xs text-muted-foreground">capacity-weighted {numId(res.references.pertamax.totalCapacityM, 3)} jt/hari</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Tarif listrik PLN B-2/TR</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.references.plnTariffIdrPerKwh, 2)}<span class="text-sm text-muted-foreground">/kWh</span></p>
        <p class="mt-1 text-xs text-muted-foreground">berlaku nasional</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">EV vs ICE (benchmark pasar)</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{idr(res.references.evUnitPriceIdr)}<span class="text-sm text-muted-foreground"> /unit</span></p>
        <p class="mt-1 text-xs text-muted-foreground">ICE {idr(res.references.iceUnitPriceIdr)}/unit</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Battery-as-a-Service</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.references.batteryLeaseIdrPerMonth, 0)}<span class="text-sm text-muted-foreground">/bln</span></p>
        <p class="mt-1 text-xs text-muted-foreground">sewa baterai → penggantian masuk opex</p>
      </div>
    </div>

    <!-- Kontrol simulasi -->
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <p class="text-sm font-semibold">Simulasi fleet</p>
      <p class="mt-1 text-xs text-muted-foreground">Geser & hitung ulang — engine mengubah unit, harga BBM, dan skema maintenance secara nyata.</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-3">
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Jumlah unit EV</span><span class="kpi-value text-foreground">{numId(units, 0)}</span></span>
          <input type="range" min="50" max="1000" step="50" bind:value={units} aria-label="Jumlah unit EV" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>Harga Pertamax</span><span class="kpi-value text-foreground">{pertamax == null ? "nasional" : "Rp" + numId(pertamax, 0)}</span></span>
          <input type="range" min="0" max="20000" step="250" value={pertamax ?? 0} oninput={(e) => (pertamax = (e.currentTarget as HTMLInputElement).valueAsNumber === 0 ? null : (e.currentTarget as HTMLInputElement).valueAsNumber)} aria-label="Harga Pertamax" class="mt-2 w-full accent-[var(--bitcoin)]" />
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
          Timing penggantian aset menentukan kelayakan.
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
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">NPV @10% · 5 tahun</p>
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

      <!-- Rincian skenario lengkap -->
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
              <tr class="border-b border-border/60"><td class="px-4 py-2">Infrastruktur charging</td><td class="px-4 py-2 text-right tabular-nums">{scen.capex.chargingPoints} titik · {idr(scen.capex.chargingInfraIdr)}</td></tr>
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
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">Pertamax (data pasar)</span><span class="kpi-value">Rp{numId(res.references.pertamax.priceIdrPerL, 0)}/L · method: capacity-weighted</span></p>
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

      <div class="grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="mb-1 text-sm font-medium">Sensitivitas utilisasi (km/unit/hari)</p>
          <p class="mb-3 text-xs text-muted-foreground">{res.utilizationSensitivity.note}</p>
          {#if sensChart}<EChart option={sensChart} height={280} label="Sensitivitas utilisasi" />{/if}
        </div>
        <div class="overflow-x-auto rounded-2xl border border-border bg-card">
          <table class="w-full text-sm">
            <caption class="sr-only">Tabel sensitivitas utilisasi</caption>
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
    {/if}

    <div class="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
      {res.note}
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={280} />
  {/if}
</div>
