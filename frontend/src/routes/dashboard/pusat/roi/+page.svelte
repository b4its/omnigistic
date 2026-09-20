<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type FinRow } from "$lib/api";
  import { numId } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";

  let fin = $state<FinRow[]>([]);
  // true bila angka kasus dipakai dari fallback (backend offline) → ditandai di UI.
  let offline = $state(false);

  onMount(async () => {
    try {
      fin = await api.financial();
    } catch {
      fin = [];
      offline = true;
    }
  });

  const fulfilment2023 = $derived(fin.find((f) => f.year === 2023)?.fulfilmentT ?? 50.08);
  const shipping2023 = $derived(fin.find((f) => f.year === 2023)?.shippingT ?? 49.46);

  // Asumsi tim (diberi label eksplisit di UI): skenario konservatif / dasar / optimis.
  // Capex kini SKALA dengan jumlah unit EV (tidak flat), sesuai catatan Rp350 juta per unit.
  const EV_CAPEX_T_PER_UNIT = 0.00035; // Rp350 juta = 0,00035 triliun IDR per unit
  const INFRA_T = 5; // infrastruktur charging (asumsi tim, tetap)

  const scenarios = $derived([
    { name: "Konservatif", tag: m.ro4t5(), codShiftPct: 0.3, codSavedPct: 0.18, forecastMapePct: 9, evUnits: 50, evFuelSavingPct: 0.12, addressComplaintCut: 0.15 },
    { name: "Dasar", tag: m.ro4t5(), codShiftPct: 0.5, codSavedPct: 0.28, forecastMapePct: 8, evUnits: 120, evFuelSavingPct: 0.2, addressComplaintCut: 0.25 },
    { name: "Optimis", tag: m.ro4t5(), codShiftPct: 0.65, codSavedPct: 0.34, forecastMapePct: 7, evUnits: 200, evFuelSavingPct: 0.28, addressComplaintCut: 0.35 }
  ]);

  // Pool penghematan dari angka kasus (Table 3).
  const annualCodPoolT = $derived(shipping2023 * 0.3); // asumsi 30% biaya shipping dari COD handling
  const fuelPoolT = $derived(shipping2023 * 0.15); // asumsi 15% shipping adalah BBM
  const complaintCostT = $derived(fulfilment2023 * 0.02); // asumsi 2% fulfilment terkait komplain alamat

  function compute(s: (typeof scenarios)[number]) {
    const codSave = annualCodPoolT * s.codSavedPct;
    const fuelSave = fuelPoolT * s.evFuelSavingPct;
    const compSave = complaintCostT * s.addressComplaintCut;
    const totalSave = codSave + fuelSave + compSave;
    // Capex berskala: unit EV × Rp350 juta + infrastruktur tetap.
    const capexT = s.evUnits * EV_CAPEX_T_PER_UNIT + INFRA_T;
    const payback = totalSave > 0 ? capexT / totalSave : 0;
    const roi = capexT > 0 ? totalSave / capexT : 0;
    return { codSave, fuelSave, compSave, totalSave, capexT, payback, roiYr: roi };
  }

  const computed = $derived(scenarios.map((s) => ({ ...s, ...compute(s) })));

  // Skenario kustom interaktif (slider) — memungkinkan juri mengeksplorasi tuas.
  let cCodSavedPct = $state(28);   // % penghematan COD (dari pool COD handling)
  let cEvUnits = $state(120);      // unit EV → capex + hemat BBM
  let cAddressCut = $state(25);    // % pemangkasan biaya komplain alamat
  let cFuelSavingPct = $state(20); // % hemat BBM dari konversi EV

  const custom = $derived.by(() => {
    const s = {
      name: "Kustom (interaktif)",
      tag: m.ro4t5(),
      codShiftPct: cCodSavedPct / 100,
      codSavedPct: cCodSavedPct / 100,
      forecastMapePct: 0,
      evUnits: cEvUnits,
      evFuelSavingPct: cFuelSavingPct / 100,
      addressComplaintCut: cAddressCut / 100,
    };
    return { ...s, ...compute(s) };
  });

  function resetCustom() {
    cCodSavedPct = 28;
    cEvUnits = 120;
    cAddressCut = 25;
    cFuelSavingPct = 20;
  }
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">{m.ro01()}</h1>
  <p class="text-sm text-muted-foreground">{m.ro02()} <span class="font-medium text-foreground">{m.ro03()}</span>{m.ro04()}</p>
  {#if offline}
    <p class="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-warning-foreground">
      <Icon name="warn" cls="h-3.5 w-3.5" /> {m.ro05()}
    </p>
  {/if}

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
    <span class="font-medium">{m.ro06()}</span> {m.ro4t6({ f: numId(fulfilment2023, 1), u: m.ro4t2() })} · Shipping expense 2023 Rp{numId(shipping2023, 1)} {m.ro3f1()}
  </div>

  <!-- Kustom interaktif -->
  <div class="rounded-2xl border border-primary/30 bg-primary/5 p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-sm font-semibold">{m.ro07()}</p>
        <p class="mt-1 text-xs text-muted-foreground">{m.ro08()}</p>
      </div>
      <button
        type="button"
        onclick={resetCustom}
        class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold hover:border-primary/40"
      ><Icon name="trend" cls="h-3.5 w-3.5" /> {m.ro09()}</button>
    </div>
    <div class="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <label class="block">
        <span class="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>{m.ro10()}</span><span class="kpi-value text-foreground">{cCodSavedPct}%</span></span>
        <input type="range" min="0" max="50" step="1" bind:value={cCodSavedPct} aria-label="Penghematan COD persen" class="mt-2 w-full accent-[var(--color-primary)]" />
      </label>
      <label class="block">
        <span class="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>{m.ro11()}</span><span class="kpi-value text-foreground">{numId(cEvUnits, 0)}</span></span>
        <input type="range" min="0" max="300" step="10" bind:value={cEvUnits} aria-label={m.ax27()} class="mt-2 w-full accent-[var(--color-primary)]" />
      </label>
      <label class="block">
        <span class="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>{m.ro12()}</span><span class="kpi-value text-foreground">{cFuelSavingPct}%</span></span>
        <input type="range" min="0" max="40" step="1" bind:value={cFuelSavingPct} aria-label={m.ro4t4()} class="mt-2 w-full accent-[var(--color-primary)]" />
      </label>
      <label class="block">
        <span class="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>{m.ro13()}</span><span class="kpi-value text-foreground">{cAddressCut}%</span></span>
        <input type="range" min="0" max="50" step="1" bind:value={cAddressCut} aria-label={m.ax28()} class="mt-2 w-full accent-[var(--color-primary)]" />
      </label>
    </div>
    <div class="mt-4 grid gap-3 sm:grid-cols-4">
      <div class="rounded-xl bg-card/70 p-3"><p class="text-xs text-muted-foreground">{m.ro14()}</p><p class="kpi-value text-lg text-success-foreground">Rp{numId(custom.totalSave, 2)} {m.ro4t2()}</p></div>
      <div class="rounded-xl bg-card/70 p-3"><p class="text-xs text-muted-foreground">{m.ro15()}</p><p class="kpi-value text-lg">Rp{numId(custom.capexT, 2)} {m.ro4t2()}</p></div>
      <div class="rounded-xl bg-card/70 p-3"><p class="text-xs text-muted-foreground">{m.ro16()}</p><p class="kpi-value text-lg">{numId(custom.payback, 1)} thn</p></div>
      <div class="rounded-xl bg-card/70 p-3"><p class="text-xs text-muted-foreground">{m.ro17()}</p><p class="kpi-value text-lg text-primary">{numId(custom.roiYr, 1)}x</p></div>
    </div>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    {#each computed as s (s.name)}
      <div class="rounded-2xl border border-border bg-card p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">{s.name}</p>
          <span class="rounded-full bg-accent px-2 py-0.5 text-[13.5px] font-semibold text-accent-foreground">{s.tag}</span>
        </div>
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted-foreground">{m.ro18()}</span><span class="kpi-value">{numId(s.codShiftPct * 100, 0)}%</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">{m.ro19()}</span><span class="kpi-value text-primary">Rp{numId(s.codSave, 1)} {m.ro3f2()}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">{m.ro4t3({ n: s.evUnits })}</span><span class="kpi-value">Rp{numId(s.fuelSave, 1)} {m.ro3f2()}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">{m.ro20()}</span><span class="kpi-value">Rp{numId(s.compSave, 1)} {m.ro3f2()}</span></div>
          <div class="flex justify-between border-t border-border pt-2"><span class="font-medium">{m.ro21()}</span><span class="kpi-value text-success-foreground">Rp{numId(s.totalSave, 1)} {m.ro4t2()}</span></div>
          <div class="flex justify-between border-t border-border pt-2"><span class="font-medium">Capex (EV {s.evUnits} {m.ro3f3()}</span><span class="kpi-value">Rp{numId(s.capexT, 2)} {m.ro4t2()}</span></div>
          <div class="flex justify-between"><span class="font-medium">{m.ro22()}</span><span class="kpi-value">{numId(s.payback, 1)} thn</span></div>
          <div class="flex justify-between"><span class="font-medium">{m.ro23()}</span><span class="kpi-value text-primary">{numId(s.roiYr, 1)}x</span></div>
        </div>
      </div>
    {/each}
  </div>

  <div class="rounded-2xl border-l-4 border-chart-4 bg-muted/30 p-4 text-sm">
    <span class="font-medium">{m.ro24()}</span> {m.ro25()} <span class="font-medium">{m.ro26()}</span> {m.ro27()}
  </div>
</div>