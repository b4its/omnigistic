<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type EvBcaResult, type EvBcaScenario } from "$lib/api";
  import { notify } from "$lib/toast";
  import Icon from "$lib/components/Icon.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart, lineChart } from "$lib/charts/options";
  import { numId, resolveHref } from "$lib/utils";

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
  let tab = $state<"kpi" | "cashflow" | "roadmap" | "advanced">("kpi");
  // Eskalasi harga tahunan (%) & kontrol Monte Carlo.
  let fuelGrowth = $state(0); // %/th
  let elecGrowth = $state(0); // %/th
  let batteryGrowth = $state(0); // %/th
  let mcRuns = $state(2000);
  let mcSeed = $state(42);

  async function load(userTriggered = false) {
    failed = false;
    if (userTriggered) notify({ message: m.eb2t1(), type: "info", title: "EV BCA" });
    try {
      res = await api.evBca({
        units,
        pertamax_override: pertamax ?? undefined,
        include_maintenance: includeMaintenance,
        discount_rate: discountRate / 100,
        tariff_override: tariff ?? undefined,
        battery_lease_override: batteryLease ?? undefined,
        ev_price_override: evPrice ?? undefined,
        ice_price_override: icePrice ?? undefined,
        fuel_growth: fuelGrowth / 100,
        elec_growth: elecGrowth / 100,
        battery_growth: batteryGrowth / 100,
        monte_carlo_runs: mcRuns,
        seed: mcSeed
      });
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: m.eb2t2(), type: "error", title: "EV BCA" });
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
    conservative: m.eb2t3(),
    base: m.eb2t4(),
    upside: m.eb2t5()
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

  // Sensitivitas jarak harian: NPV replacement vs fleet tambahan.
  // Sumbu-x = NILAI (km/hari) supaya jarak 60->80 tidak tampak sama dengan 20->30,
  // angka lewat valueFormatter idr() agar sama persis dengan tabel di sebelahnya,
  // dan garis impas ditandai eksplisit (replacement: tanpa impas).
  const sensChart = $derived(
    res
      ? (() => {
          const u = res.utilizationSensitivity;
          const be = u.breakevenIncrementalKmPerUnitDay;
          return lineChart(
            [],
            [
              {
                name: "NPV replacement",
                data: u.rows.map((r) => [r.distanceKmPerUnitDay, r.npvIdr] as [number, number]),
                color: "var(--bitcoin)",
                smooth: true,
                opacity: view === "replacement" ? 1 : 0.45,
                markLines: [{ y: 0 }]
              },
              {
                name: "NPV fleet tambahan",
                data: u.incrementalRows.map((r) => [r.distanceKmPerUnitDay, r.npvIdr] as [number, number]),
                color: "var(--color-chart-3)",
                smooth: true,
                opacity: view === "incremental" ? 1 : 0.45,
                markLines: [
                  ...(be != null ? [{ x: be, label: m.eb4t1({ km: numId(be, 0) }) }] : []),
                  { y: 0 }
                ]
              }
            ],
            { xAxisType: "value", valueFormatter: (v) => idr(v) }
          );
        })()
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

  // Monte Carlo: distribusi NPV (histogram 20 bin).
  const mcChart = $derived(
    res
      ? barChart(
          res.monteCarlo.histogram.map((h) => (h.binStartIdr / 1e9).toFixed(1)),
          [
            {
              name: "Frekuensi",
              data: res.monteCarlo.histogram.map((h) => h.count),
              color: "var(--color-primary)"
            }
          ],
          { maxBarWidth: 26, rotate: 45 }
        )
      : null
  );

  // Tornado: ayunan NPV per lever (Rp M).
  const tornadoChart = $derived(
    res
      ? barChart(
          res.tornadoSensitivity.rows.map((r) => r.lever),
          [
            {
              name: "Ayunan NPV (Rp M)",
              data: res.tornadoSensitivity.rows.map((r) => Math.round(r.swingIdr / 1e6)),
              color: "var(--bitcoin)"
            }
          ],
          { maxBarWidth: 40, rotate: 30 }
        )
      : null
  );

  // Arus kas program roadmap (capex disebar Y1..Y3) — kumulatif.
  const programChart = $derived(
    res
      ? lineChart(
          res.roadmapProgramCashflow.rows.map((r) => `Y${r.year}`),
          [
            {
              name: "Kumulatif program (Rp M)",
              data: res.roadmapProgramCashflow.rows.map((r) => Math.round(r.cumulativeIdr / 1e6)),
              color: "var(--bitcoin)",
              smooth: true,
              area: true
            },
            {
              name: "Unit terpasang",
              data: res.roadmapProgramCashflow.rows.map((r) => r.deployedUnits),
              color: "var(--color-primary)",
              smooth: true
            }
          ]
        )
      : null
  );

  const PRESETS = [
    { label: m.eb2t6(), u: 200, p: null, m: false, dr: 10, t: null, b: null, ev: null, ice: null },
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
    fuelGrowth = 0;
    elecGrowth = 0;
    batteryGrowth = 0;
    mcRuns = 2000;
    mcSeed = 42;
    void run();
  }

  // Preset laju eskalasi harga (fraksi → dikonversi ke % di kontrol).
  const GROWTH_PRESETS = [
    { label: "Datar (0%/th)", f: 0, e: 0, b: 0 },
    { label: "Moderat (BBM+3% · listrik+2%)", f: 3, e: 2, b: 0 },
    { label: "Agresif (BBM+6% · listrik+3%)", f: 6, e: 3, b: 1 }
  ];
  function applyGrowth(p: (typeof GROWTH_PRESETS)[number]) {
    fuelGrowth = p.f;
    elecGrowth = p.e;
    batteryGrowth = p.b;
    void run();
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">{m.eb01()}</h1>
      <p class="text-sm text-muted-foreground">
        {m.eb02()} <span class="font-medium text-foreground">{m.eb03()}</span>{m.eb04()}
      </p>
    </div>
    <div class="flex gap-2">
      <button type="button" onclick={resetLevers} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-60">
        {m.eb05()}
      </button>
      <button type="button" onclick={() => run()} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
        <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Hitung ulang"}
      </button>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-2">
    <h2 class="font-heading text-base font-semibold tracking-tight">{m.eb06()}</h2>
    <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.eb07()}</span>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle={m.eb2t2()} errorHint={m.eb2t7()} onretry={() => run()} />
  {:else if loaded && res}
    <!-- Headline disclaimer: replacement vs incremental -->
    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-4">
      <p class="text-sm">
        <span class="font-semibold">{m.eb08()}</span> {m.eb09()} <strong>{idr(res.headline.npvIdr)}</strong> {m.eb10()} <strong>{numId(res.headline.bcrDiscounted, 2)}×</strong> {m.eb11()} <strong>{idr(res.headline.annualNetSavingIdr)}/th</strong> {m.eb12()} <strong>{numId(res.headline.co2ReductionTonsYear, 1)} t/th</strong>.
      </p>
      <p class="mt-1 text-xs text-muted-foreground">⚠ {res.headline.caveat}</p>
    </div>

    <!-- Panel benchmark nasional -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.eb13()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.inputs.pertamaxIdrPerL, 0)}<span class="text-sm text-muted-foreground">{m.eb14()}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">capacity-weighted {numId(res.references.pertamax.totalCapacityM, 3)} {m.eb3f1()}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.eb15()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.inputs.tariffIdrPerKwh, 2)}<span class="text-sm text-muted-foreground">{m.eb16()}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">{m.eb17()}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.eb18()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{idr(res.inputs.evUnitPriceIdr)}<span class="text-sm text-muted-foreground"> {m.eb19()}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">ICE {idr(res.inputs.iceUnitPriceIdr)}/unit</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.eb20()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">Rp{numId(res.references.batteryLeaseIdrPerMonth, 0)}<span class="text-sm text-muted-foreground">{m.eb21()}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">{m.eb22()}</p>
      </div>
    </div>

    <!-- Kontrol simulasi -->
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <p class="text-sm font-semibold">{m.eb23()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.eb24()}</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb25()}</span><span class="kpi-value text-foreground">{numId(units, 0)}</span></span>
          <input type="range" min="50" max="1000" step="50" bind:value={units} aria-label={m.ax24()} class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb26()}</span><span class="kpi-value text-foreground">{pertamax == null ? "nasional" : "Rp" + numId(pertamax, 0)}</span></span>
          <input type="range" min="0" max="20000" step="250" value={pertamax ?? 0} oninput={(e) => (pertamax = (e.currentTarget as HTMLInputElement).valueAsNumber === 0 ? null : (e.currentTarget as HTMLInputElement).valueAsNumber)} aria-label="Harga Pertamax" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb27()}</span><span class="kpi-value text-foreground">{tariff == null ? "PLN B-2/TR" : "Rp" + numId(tariff, 0) + "/kWh"}</span></span>
          <input type="range" min="0" max="3000" step="50" value={tariff ?? 0} oninput={(e) => (tariff = (e.currentTarget as HTMLInputElement).valueAsNumber === 0 ? null : (e.currentTarget as HTMLInputElement).valueAsNumber)} aria-label="Tarif listrik" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb28()}</span><span class="kpi-value text-foreground">{batteryLease == null ? "Rp1,5 juta" : idr(batteryLease)}</span></span>
          <input type="range" min="0" max="3000000" step="100000" value={batteryLease ?? 0} oninput={(e) => (batteryLease = (e.currentTarget as HTMLInputElement).valueAsNumber === 0 ? null : (e.currentTarget as HTMLInputElement).valueAsNumber)} aria-label="Sewa baterai" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb29()}</span><span class="kpi-value text-foreground">{numId(discountRate, 0)}%</span></span>
          <input type="range" min="8" max="20" step="1" bind:value={discountRate} aria-label="Discount rate" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="flex items-end gap-2 pb-1">
          <input type="checkbox" bind:checked={includeMaintenance} class="h-4 w-4 accent-[var(--bitcoin)]" />
          <span class="text-xs text-muted-foreground">{m.eb30()}</span>
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb31()}</span><span class="kpi-value text-foreground">{numId(fuelGrowth, 1)}%</span></span>
          <input type="range" min="0" max="10" step="0.5" bind:value={fuelGrowth} aria-label="Eskalasi BBM" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb32()}</span><span class="kpi-value text-foreground">{numId(elecGrowth, 1)}%</span></span>
          <input type="range" min="0" max="10" step="0.5" bind:value={elecGrowth} aria-label="Eskalasi listrik" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb33()}</span><span class="kpi-value text-foreground">{numId(mcRuns, 0)}</span></span>
          <input type="range" min="200" max="10000" step="200" bind:value={mcRuns} aria-label="Monte Carlo runs" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{m.eb34()}</span><span class="kpi-value text-foreground">{numId(mcSeed, 0)}</span></span>
          <input type="range" min="0" max="100" step="1" bind:value={mcSeed} aria-label="Seed Monte Carlo" class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        {#each PRESETS as p (p.label)}
          <button type="button" onclick={() => applyPreset(p)} class="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:text-foreground">{p.label}</button>
        {/each}
      </div>
      <p class="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.eb35()}</p>
      <div class="mt-2 flex flex-wrap gap-2">
        {#each GROWTH_PRESETS as p (p.label)}
          <button type="button" onclick={() => applyGrowth(p)} class="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:text-foreground">{p.label}</button>
        {/each}
      </div>
      <button type="button" onclick={run} disabled={busy} class="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--primary-foreground)] transition-all duration-300 hover:scale-[1.03] disabled:opacity-60">
        <Icon name="activity" cls="h-3.5 w-3.5" weight="bold" /> {m.eb36()}
      </button>
    </div>

    <!-- Toggle skenario & mode -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="inline-flex rounded-full border border-border bg-card p-1">
        {#each (["conservative", "base", "upside"] as const) as k (k)}
          <button type="button" onclick={() => (scenarioKey = k)} class="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors {scenarioKey === k ? 'bg-[var(--bitcoin)] text-[var(--primary-foreground)]' : 'text-muted-foreground hover:text-foreground'}">{SCEN_LABEL[k]}</button>
        {/each}
      </div>
      <div class="inline-flex rounded-full border border-border bg-card p-1">
        <button type="button" onclick={() => (view = "replacement")} class="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors {view === 'replacement' ? 'bg-[var(--bitcoin)] text-[var(--primary-foreground)]' : 'text-muted-foreground hover:text-foreground'}">{m.eb37()}</button>
        <button type="button" onclick={() => (view = "incremental")} class="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors {view === 'incremental' ? 'bg-[var(--bitcoin)] text-[var(--primary-foreground)]' : 'text-muted-foreground hover:text-foreground'}">{m.eb38()}</button>
      </div>
      <span class="text-xs text-muted-foreground">{SCEN_NOTE[scenarioKey]}</span>
    </div>

    {#if scen}
      {#if view === "incremental"}
        <div class="rounded-xl border border-[color-mix(in_oklab,var(--destructive,#ef4444)_40%,transparent)] bg-destructive/5 p-3 text-xs">
          <span class="font-semibold">{m.eb39()}</span> {m.eb3f2()}
          NPV {idr(incScen?.kpi.npvIdr ?? 0)} & BCR diskon {numId(incScen?.kpi.bcrDiscounted ?? 0, 2)}× — economics jauh lebih lemah.
          {m.eb3f3()} {res.utilizationSensitivity.breakevenIncrementalKmPerUnitDay ?? "—"} {m.eb3f4()}
        </div>
      {/if}

      <!-- KPI skenario terpilih -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.eb40()}</p>
          <p class="kpi-value mt-2 font-heading text-2xl">{idr(scen.annual.netAnnualSavingIdr)}<span class="text-sm text-muted-foreground">{m.eb41()}</span></p>
          <p class="mt-1 text-xs text-muted-foreground">fuel {idr(scen.annual.iceFuelCostIdr)} − listrik {idr(scen.annual.evEnergyCostIdr)} − baterai {idr(scen.annual.batteryLeaseIdr)}{scen.annual.maintenanceSavingIdr ? ` + maint ${idr(scen.annual.maintenanceSavingIdr)}` : ""}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">NPV @{numId(res.inputs.discountRatePct, 0)}{m.eb3f5()}</p>
          <p class="kpi-value mt-2 font-heading text-2xl {scen.kpi.npvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(scen.kpi.npvIdr)}</p>
          <p class="mt-1 text-xs text-muted-foreground">initial {idr(scen.capex.initialInvestmentIdr)}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.eb42()}</p>
          <p class="kpi-value mt-2 font-heading text-2xl">{numId(scen.kpi.bcrSimple, 2)}× <span class="text-sm text-muted-foreground">· {numId(scen.kpi.bcrDiscounted, 2)}×</span></p>
          <p class="mt-1 text-xs text-muted-foreground">ROI 5-th {numId(scen.kpi.roi5yPct, 0)}%</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{m.eb43()}</p>
          <p class="kpi-value mt-2 font-heading text-2xl">{scen.kpi.paybackYears == null ? "—" : numId(scen.kpi.paybackMonths ?? 0, 2) + " bln"}</p>
          <p class="mt-1 text-xs text-muted-foreground">CO₂ turun {numId(scen.co2.reductionTonsYear, 1)} t/th · 5-th {numId(scen.co2.reductionTons5y, 0)} t</p>
        </div>
      </div>

      <!-- Tab: KPI / Arus kas / Roadmap / Simulasi lanjut -->
      <div class="inline-flex flex-wrap rounded-full border border-border bg-card p-1">
        {#each ([["kpi", "Analisis KPI"], ["cashflow", "Arus Kas"], ["roadmap", "Roadmap Rollout"], ["advanced", m.eb2t8()]] as const) as [k, label] (k)}
          <button type="button" onclick={() => (tab = k)} class="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors {tab === k ? 'bg-[var(--bitcoin)] text-[var(--primary-foreground)]' : 'text-muted-foreground hover:text-foreground'}">{label}</button>
        {/each}
      </div>

      {#if tab === "kpi"}
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">{m.eb44()}</p>
            {#if npvChart}<EChart option={npvChart} height={260} label={m.eb2t9()} />{/if}
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">{m.eb45()}</p>
            {#if co2Chart}<EChart option={co2Chart} height={260} label={m.eb2t10()} />{/if}
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="overflow-x-auto rounded-2xl border border-border bg-card">
            <table class="w-full text-sm">
              <caption class="sr-only">{m.eb46()}</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">{m.eb47()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb48()}</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb49()}</td><td class="px-4 py-2 text-right tabular-nums">{numId(scen.annual.distanceKm / 1e6, 2)} jt km</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb50()}</td><td class="px-4 py-2 text-right tabular-nums">{numId(scen.annual.iceLiters, 0)} L · {idr(scen.annual.iceFuelCostIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb51()}</td><td class="px-4 py-2 text-right tabular-nums">{numId(scen.annual.evKwh, 0)} kWh · {idr(scen.annual.evEnergyCostIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb52()}</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.annual.batteryLeaseIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb53()}</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.capex.vehicleDeltaIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb54()}</td><td class="px-4 py-2 text-right tabular-nums">{scen.capex.chargingPoints} titik · {numId(scen.capex.dailyKwhDemand, 0)} {m.eb3f6()} {idr(scen.capex.chargingInfraIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb55()}</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.capex.implementationTrainingIdr)}</td></tr>
                <tr class="border-b border-border/60 bg-muted/30 font-medium"><td class="px-4 py-2">{m.eb56()}</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.capex.initialInvestmentIdr)}</td></tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb57()}</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.kpi.fuelBenefit5yIdr)}</td></tr>
                <tr><td class="px-4 py-2">{m.eb58()}</td><td class="px-4 py-2 text-right tabular-nums">{idr(scen.kpi.totalCost5yIdr)}</td></tr>
              </tbody>
            </table>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-border bg-card p-5">
              <p class="mb-3 text-sm font-medium">{m.eb59()}</p>
              <div class="space-y-1.5 text-xs">
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb60()}</span><span class="kpi-value">Rp{numId(res.references.pertamax.priceIdrPerL, 0)}/L · capacity-weighted</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb61()}</span><span class="kpi-value">Rp{numId(res.references.plnTariffIdrPerKwh, 2)}/kWh</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb62()}</span><span class="kpi-value">{idr(res.references.evUnitPriceIdr)} · {numId(res.references.evBatteryKwh, 2)} kWh</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb63()}</span><span class="kpi-value">{idr(res.references.iceUnitPriceIdr)}</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb64()}</span><span class="kpi-value">{numId(res.references.gasolineCo2KgPerL, 2)} kg/L · {numId(res.references.gridCo2KgPerKwh, 3)} kg/kWh</span></p>
                <hr class="border-border" />
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb65()}</span><span class="kpi-value">{numId(scen.assumptions.distanceKmPerUnitDay, 0)} {m.eb3f7()}</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb66()}</span><span class="kpi-value">{numId(scen.assumptions.iceEfficiencyKmPerL, 0)} km/L</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb67()}</span><span class="kpi-value">{numId(scen.assumptions.evWhPerKm, 0)} Wh/km · loss {numId(scen.assumptions.chargingLossPct, 0)}%</span></p>
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb68()}</span><span class="kpi-value">{numId(scen.assumptions.discountRatePct, 0)}%</span></p>
              </div>
            </div>
            <div class="rounded-xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
              <span class="font-medium">{m.eb69()}</span> {res.strategicTakeaway}
            </div>
          </div>
        </div>

        <!-- Tabel perbandingan 3 skenario (replacement vs incremental) -->
        <div class="overflow-x-auto rounded-2xl border border-border bg-card">
          <table class="w-full text-sm">
            <caption class="sr-only">{m.eb70()}</caption>
            <thead>
              <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th class="px-4 py-2.5">{m.eb71()}</th>
                {#each res.scenarioComparison as row (row.key)}
                  <th class="px-4 py-2.5 text-right">{row.label}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb72()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.distanceKmPerUnitDay, 0)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb73()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId((row.distanceKmPerUnitDay * res.inputs.units * 365) / 1e6, 2)} jt km</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb74()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(res.scenarios[row.key].annual.iceFuelCostIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb75()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(res.scenarios[row.key].annual.evEnergyCostIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb76()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(res.scenarios[row.key].annual.batteryLeaseIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60 font-medium"><td class="px-4 py-2 text-muted-foreground">{m.eb77()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(row.netAnnualSavingIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb78()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{idr(row.initialInvestmentIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb79()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(res.scenarios[row.key].kpi.bcrSimple, 2)}×</td>{/each}</tr>
              <tr class="border-b border-border/60 font-medium"><td class="px-4 py-2 text-muted-foreground">{m.eb80()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.bcrDiscounted, 2)}×</td>{/each}</tr>
              <tr class="border-b border-border/60 font-medium"><td class="px-4 py-2 text-muted-foreground">{m.eb81()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums {row.npvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(row.npvIdr)}</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb82()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.roi5yPct, 0)}%</td>{/each}</tr>
              <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb83()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.co2ReductionTonsYear, 1)} t</td>{/each}</tr>
              <tr class="border-b border-2 border-border bg-muted/20"><td class="px-4 py-2 text-muted-foreground" colspan={1}><em>{m.eb84()}</em> {m.eb85()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums {row.incrementalNpvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(row.incrementalNpvIdr)}</td>{/each}</tr>
              <tr><td class="px-4 py-2 text-muted-foreground"><em>{m.eb86()}</em> {m.eb87()}</td>{#each res.scenarioComparison as row (row.key)}<td class="px-4 py-2 text-right tabular-nums">{numId(row.incrementalBcrDiscounted, 2)}×</td>{/each}</tr>
            </tbody>
          </table>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-1 text-sm font-medium">{m.eb88()}</p>
            <p class="mb-3 text-xs text-muted-foreground">{res.utilizationSensitivity.note} · breakeven fleet tambahan ≈ <strong>{res.utilizationSensitivity.breakevenIncrementalKmPerUnitDay ?? "—"}</strong> {m.eb89()}</p>
            {#if sensChart}<EChart option={sensChart} height={280} label={m.eb2t11()} />{/if}
          </div>
          <div class="overflow-x-auto rounded-2xl border border-border bg-card">
            <table class="w-full text-sm">
              <caption class="sr-only">{m.eb90()}</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">{m.eb91()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb92()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb93()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb94()}</th>
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
            <p class="mb-3 text-sm font-medium">{m.eb95()}</p>
            <div class="space-y-1.5 text-xs">
              {#each res.discountRateSensitivity.rows as r (r.discountRatePct)}
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">r = {numId(r.discountRatePct, 0)}%</span><span class="kpi-value">NPV {idr(r.npvIdr)} · BCR {numId(r.bcrDiscounted, 2)}×</span></p>
              {/each}
            </div>
          </div>
          <div class="rounded-xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
            <span class="font-medium">{m.eb96()}</span> {res.utilizationSensitivity.breakevenNote}
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
              <caption class="sr-only">{m.eb97()}</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">{m.eb98()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb99()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb100()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb101()}</th>
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
                  <td class="px-4 py-2">{m.eb102()}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{idr(scen.cashflow.totalNetIdr)}</td>
                  <td class="px-4 py-2 text-right tabular-nums">NPV {idr(scen.cashflow.npvIdr)}</td>
                  <!-- Kumulatif akhir = totalNetIdr (SUDAH termasuk Y0 = −investasi awal,
                       sama dgn baris terakhir kolom Kumulatif). Jangan ditambah capex lagi. -->
                  <td class="px-4 py-2 text-right tabular-nums">{idr(scen.cashflow.totalNetIdr)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground">
          <span class="font-medium text-foreground">{m.eb103()}</span> {m.eb104()}
        </div>
      {:else if tab === "roadmap"}
        <!-- Roadmap rollout -->
        <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
          <p class="text-sm font-semibold">{m.eb3f8()} {numId(res.roadmap.basisMotorcycles, 0)} {m.eb3f9()}</p>
          <p class="mt-1 text-xs text-muted-foreground">{res.roadmap.note}</p>
          <p class="mt-2 text-xs">{m.eb105()} <strong>{numId(res.roadmap.totalCumulativeUnits, 0)} unit</strong> ({numId(res.roadmap.totalCumulativeUnitsPct, 0)}{m.eb3f10()}</p>
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          {#each res.roadmap.phases as p (p.phase)}
            <div class="rounded-2xl border border-border bg-card p-5">
              <div class="flex items-center justify-between">
                <p class="font-heading text-lg font-semibold">Fase {p.phase} · {p.label}</p>
                <span class="font-mono text-[11px] text-muted-foreground">bln {p.monthFrom}–{p.monthTo}</span>
              </div>
              <p class="mt-3 kpi-value font-heading text-2xl">{numId(p.cumulativeUnits, 0)}<span class="text-sm text-muted-foreground"> {m.eb106()}</span></p>
              <p class="text-xs text-muted-foreground">{numId(p.cumulativeUnitsPctOfMotor, 1)}% basis motor · +{numId(p.addedUnits, 0)} {m.eb3f11()}</p>
              <div class="mt-3 space-y-1 text-xs">
                <p class="flex justify-between gap-2"><span class="text-muted-foreground">{m.eb107()}</span><span class="kpi-value">{idr(p.initialInvestmentIdr)}</span></p>
                <p class="flex justify-between gap-2"><span class="text-muted-foreground">{m.eb108()}</span><span class="kpi-value">{idr(p.netAnnualSavingIdr)}</span></p>
                <p class="flex justify-between gap-2"><span class="text-muted-foreground">{m.eb109()}</span><span class="kpi-value {p.npvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(p.npvIdr)}</span></p>
                <p class="flex justify-between gap-2"><span class="text-muted-foreground">{m.eb110()}</span><span class="kpi-value">{numId(p.co2ReductionTonsYear, 0)} t</span></p>
              </div>
              <p class="mt-3 text-[11px] text-muted-foreground">{p.note}</p>
            </div>
          {/each}
        </div>
        <div class="rounded-xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
          <span class="font-medium">{m.eb111()}</span> {m.eb112()}
        </div>
      {:else}
        <!-- ===== Simulasi Lanjutan (Monte Carlo, tornado, breakeven, TCO, hub, lifecycle) ===== -->
        <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
          <span class="font-medium">{m.eb113()}</span> {m.eb114()}
        </div>

        <!-- Monte Carlo -->
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-1 text-sm font-medium">{m.eb115()}</p>
            <p class="mb-3 text-xs text-muted-foreground">{numId(res.monteCarlo.runs, 0)} iterasi · seed {res.monteCarlo.seed} · {res.monteCarlo.assumptionNote}</p>
            {#if mcChart}<EChart option={mcChart} height={280} label="Distribusi NPV Monte Carlo" />{/if}
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">{m.eb116()}</p>
            <div class="grid grid-cols-3 gap-3">
              <div class="rounded-xl bg-muted/40 p-3 text-center">
                <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.eb117()}</p>
                <p class="kpi-value mt-1 font-heading text-lg">{idr(res.monteCarlo.npv.p10Idr)}</p>
              </div>
              <div class="rounded-xl bg-[color-mix(in_oklab,var(--bitcoin)_12%,transparent)] p-3 text-center">
                <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.eb118()}</p>
                <p class="kpi-value mt-1 font-heading text-lg">{idr(res.monteCarlo.npv.p50Idr)}</p>
              </div>
              <div class="rounded-xl bg-muted/40 p-3 text-center">
                <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.eb119()}</p>
                <p class="kpi-value mt-1 font-heading text-lg">{idr(res.monteCarlo.npv.p90Idr)}</p>
              </div>
            </div>
            <div class="mt-3 space-y-1.5 text-xs">
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb120()}</span><span class="kpi-value font-semibold text-success-foreground">{numId(res.monteCarlo.npv.probPositivePct, 1)}%</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb121()}</span><span class="kpi-value">{idr(res.monteCarlo.npv.meanIdr)}</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb122()}</span><span class="kpi-value">{idr(res.monteCarlo.npv.minIdr)} – {idr(res.monteCarlo.npv.maxIdr)}</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb123()}</span><span class="kpi-value">{numId(res.monteCarlo.bcr.p10, 2)}× · {numId(res.monteCarlo.bcr.p50, 2)}× · {numId(res.monteCarlo.bcr.p90, 2)}×</span></p>
            </div>
            <p class="mt-3 text-[11px] text-muted-foreground">{res.monteCarlo.note}</p>
          </div>
        </div>

        <!-- Tornado + Breakeven -->
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-1 text-sm font-medium">{m.eb124()}</p>
            <p class="mb-3 text-xs text-muted-foreground">Baseline {idr(res.tornadoSensitivity.baselineNpvIdr)} · {res.tornadoSensitivity.note}</p>
            {#if tornadoChart}<EChart option={tornadoChart} height={300} label="Tornado sensitivitas" />{/if}
          </div>
          <div class="overflow-x-auto rounded-2xl border border-border bg-card">
            <table class="w-full text-sm">
              <caption class="sr-only">{m.eb125()}</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">{m.eb126()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb127()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb128()}</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb129()}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{res.breakevens.maxBatteryLeaseIdrPerUnitYear.replacement == null ? "—" : idr(res.breakevens.maxBatteryLeaseIdrPerUnitYear.replacement)}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{res.breakevens.maxBatteryLeaseIdrPerUnitYear.incremental == null ? "—" : idr(res.breakevens.maxBatteryLeaseIdrPerUnitYear.incremental)}</td>
                </tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2 text-muted-foreground">{m.eb130()}</td>
                  <td class="px-4 py-2 text-right tabular-nums" colspan="2">{idr(res.breakevens.maxBatteryLeaseIdrPerUnitYear.currentIdrPerUnitYear)}</td>
                </tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb131()}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{res.breakevens.minDistanceKmPerUnitDay.replacement == null ? "—" : numId(res.breakevens.minDistanceKmPerUnitDay.replacement, 1)}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{res.breakevens.minDistanceKmPerUnitDay.incremental == null ? "—" : numId(res.breakevens.minDistanceKmPerUnitDay.incremental, 1)}</td>
                </tr>
                <tr class="border-b border-border/60"><td class="px-4 py-2">{m.eb132()}</td>
                  <td class="px-4 py-2 text-right tabular-nums" colspan="2">{res.breakevens.breakevenPertamaxIdrPerLIncremental == null ? "—" : "Rp" + numId(res.breakevens.breakevenPertamaxIdrPerLIncremental, 0) + "/L"}</td>
                </tr>
                <tr><td class="px-4 py-2">{m.eb133()}</td>
                  <td class="px-4 py-2 text-right tabular-nums" colspan="2">{res.breakevens.maxEvUnitPriceIdrReplacement.value == null ? "—" : idr(res.breakevens.maxEvUnitPriceIdrReplacement.value)} <span class="text-muted-foreground">(headroom {res.breakevens.maxEvUnitPriceIdrReplacement.headroomIdr == null ? "—" : idr(res.breakevens.maxEvUnitPriceIdrReplacement.headroomIdr)})</span></td>
                </tr>
              </tbody>
            </table>
            <p class="px-4 py-3 text-[11px] text-muted-foreground">{res.breakevens.note}</p>
          </div>
        </div>

        <!-- TCO + Eskalasi + Lifecycle -->
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">{m.eb134()}</p>
            <div class="space-y-1.5 text-xs">
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb135()}</span><span class="kpi-value">Rp{numId(res.tcoPerKm.ice.energyIdrPerKm, 0)}/km</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb136()}</span><span class="kpi-value">Rp{numId(res.tcoPerKm.ice.maintenanceIdrPerKm, 0)}/km</span></p>
              <p class="flex justify-between gap-3 border-t border-border pt-1.5 font-medium"><span>{m.eb137()}</span><span class="kpi-value">Rp{numId(res.tcoPerKm.ice.totalIdrPerKm, 0)}/km</span></p>
              <p class="flex justify-between gap-3 pt-1.5"><span class="text-muted-foreground">{m.eb138()}</span><span class="kpi-value">Rp{numId(res.tcoPerKm.ev.energyIdrPerKm, 0)}/km</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb139()}</span><span class="kpi-value">Rp{numId(res.tcoPerKm.ev.batteryLeaseIdrPerKm, 0)}/km</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb140()}</span><span class="kpi-value">Rp{numId(res.tcoPerKm.ev.vehicleDeltaIdrPerKm, 0)}/km</span></p>
              <p class="flex justify-between gap-3 border-t border-border pt-1.5 font-medium"><span>{m.eb141()}</span><span class="kpi-value">Rp{numId(res.tcoPerKm.ev.totalIdrPerKm, 0)}/km</span></p>
              <p class="flex justify-between gap-3 pt-1.5 text-success-foreground font-medium"><span>{m.eb142()}</span><span class="kpi-value">Rp{numId(res.tcoPerKm.savingIdrPerKm, 0)}/km ({numId(res.tcoPerKm.savingPct, 0)}%)</span></p>
            </div>
            <p class="mt-3 text-[11px] text-muted-foreground">{res.tcoPerKm.note}</p>
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-3 text-sm font-medium">{m.eb143()}</p>
            <div class="space-y-1.5 text-xs">
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb144()}</span><span class="kpi-value">{idr(res.escalationPreview.flatNpvIdr)}</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb145()}</span><span class="kpi-value">{idr(res.escalationPreview.moderateNpvIdr)} <span class="text-success-foreground">(+{idr(res.escalationPreview.moderateDeltaIdr)})</span></span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb146()}</span><span class="kpi-value">{idr(res.escalationPreview.aggressiveNpvIdr)} <span class="text-success-foreground">(+{idr(res.escalationPreview.aggressiveDeltaIdr)})</span></span></p>
            </div>
            <p class="mt-3 text-[11px] text-muted-foreground">{res.escalationPreview.note}</p>
            <p class="mt-2 text-[11px] text-muted-foreground">{m.eb3f12()} {numId(res.inputs.fuelGrowthPct ?? 0, 1)}% · listrik {numId(res.inputs.elecGrowthPct ?? 0, 1)}% · baterai {numId(res.inputs.batteryGrowthPct ?? 0, 1)}%.</p>
          </div>
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-1 text-sm font-medium">{m.eb147()} <span class="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{res.lifecycleEmissions.label}</span></p>
            <div class="mt-2 space-y-1.5 text-xs">
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb148()}</span><span class="kpi-value">{numId(res.lifecycleEmissions.manufacturing.iceTotalKg / 1000, 1)} t</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb149()}</span><span class="kpi-value">{numId(res.lifecycleEmissions.manufacturing.evTotalKg / 1000, 1)} t</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb150()}</span><span class="kpi-value {res.lifecycleEmissions.manufacturing.extraKg > 0 ? 'text-destructive-foreground' : ''}">{numId(res.lifecycleEmissions.manufacturing.extraKg / 1000, 1)} t</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb151()}</span><span class="kpi-value text-success-foreground">{numId(res.lifecycleEmissions.operational.savingKgYear / 1000, 1)} t</span></p>
              <p class="flex justify-between gap-3"><span class="text-muted-foreground">{m.eb152()}</span><span class="kpi-value">{res.lifecycleEmissions.carbonPaybackYears == null ? "—" : numId(res.lifecycleEmissions.carbonPaybackYears, 1) + " th"}</span></p>
              <p class="flex justify-between gap-3 border-t border-border pt-1.5 font-medium"><span>{m.eb153()}</span><span class="kpi-value text-success-foreground">{numId(res.lifecycleEmissions.cumulative5y.deltaTons, 1)} t CO₂e</span></p>
            </div>
            <p class="mt-3 text-[11px] text-muted-foreground">{res.lifecycleEmissions.note}</p>
          </div>
        </div>

        <!-- Hub deployment -->
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
            <p class="text-sm font-semibold">{m.eb154()}</p>
            <p class="mt-1 text-xs text-muted-foreground">{res.hubDeployment.note}</p>
            <p class="mt-2 text-xs">{m.eb155()} <strong>{numId(res.hubDeployment.totalUnits, 0)} unit</strong> ke {res.hubDeployment.hubs.length} hub.</p>
            <div class="mt-3 space-y-1.5 text-xs">
              {#each res.hubDeployment.byRegion as r (r.region)}
                <p class="flex justify-between gap-3"><span class="text-muted-foreground">{r.region}</span><span class="kpi-value">{numId(r.units, 0)} unit · {idr(r.netSavingIdr)}/th · {numId(r.co2TonsYear, 0)} t</span></p>
              {/each}
            </div>
          </div>
          <div class="overflow-x-auto rounded-2xl border border-border bg-card">
            <table class="w-full text-sm">
              <caption class="sr-only">{m.eb156()}</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">{m.eb157()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb158()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb159()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb160()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb161()}</th>
                </tr>
              </thead>
              <tbody>
                {#each res.hubDeployment.hubs.slice(0, 12) as h (h.code)}
                  <tr class="border-b border-border/60 last:border-0">
                    <td class="px-4 py-2">{h.name} <span class="font-mono text-[10px] text-muted-foreground">{h.code}</span></td>
                    <td class="px-4 py-2 text-right tabular-nums">{numId(h.capacityM, 3)}</td>
                    <td class="px-4 py-2 text-right tabular-nums font-medium">{numId(h.allocatedUnits, 0)}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{idr(h.netAnnualSavingIdr)}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{numId(h.co2ReductionTonsYear, 0)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Arus kas program roadmap -->
        <div class="grid gap-6 lg:grid-cols-2">
          <div class="rounded-2xl border border-border bg-card p-5">
            <p class="mb-1 text-sm font-medium">{m.eb162()}</p>
            <p class="mb-3 text-xs text-muted-foreground">{res.roadmapProgramCashflow.note}</p>
            {#if programChart}<EChart option={programChart} height={280} label="Arus kas program rollout" />{/if}
          </div>
          <div class="overflow-x-auto rounded-2xl border border-border bg-card">
            <table class="w-full text-sm">
              <caption class="sr-only">{m.eb163()}</caption>
              <thead>
                <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="px-4 py-2.5">{m.eb164()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb165()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb166()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb167()}</th>
                  <th class="px-4 py-2.5 text-right">{m.eb168()}</th>
                </tr>
              </thead>
              <tbody>
                {#each res.roadmapProgramCashflow.rows as r (r.year)}
                  <tr class="border-b border-border/60 last:border-0">
                    <td class="px-4 py-2 font-mono text-xs">Y{r.year}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{numId(r.deployedUnits, 0)}</td>
                    <td class="px-4 py-2 text-right tabular-nums {r.capexIdr > 0 ? 'text-destructive-foreground' : 'text-muted-foreground'}">{r.capexIdr === 0 ? "—" : idr(r.capexIdr)}</td>
                    <td class="px-4 py-2 text-right tabular-nums">{idr(r.benefitIdr)}</td>
                    <td class="px-4 py-2 text-right tabular-nums font-medium {r.cumulativeIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(r.cumulativeIdr)}</td>
                  </tr>
                {/each}
                <tr class="bg-muted/30 font-medium">
                  <td class="px-4 py-2">{m.eb169()}</td>
                  <td class="px-4 py-2 text-right tabular-nums">{numId(res.roadmapProgramCashflow.finalDeployedUnits, 0)} unit</td>
                  <td colspan="2"></td>
                  <td class="px-4 py-2 text-right tabular-nums {res.roadmapProgramCashflow.npvIdr >= 0 ? 'text-success-foreground' : 'text-destructive-foreground'}">{idr(res.roadmapProgramCashflow.npvIdr)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    {/if}

    <div class="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">{res.note}</div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={280} />
  {/if}
</div>
