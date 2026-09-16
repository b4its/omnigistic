<script lang="ts">
  import { onMount } from "svelte";
  import { api, type FinRow } from "$lib/api";
  import { numId } from "$lib/utils";

  let fin = $state<FinRow[]>([]);

  onMount(async () => {
    try {
      fin = await api.financial();
    } catch {
      fin = [];
    }
  });

  const fulfilment2023 = $derived(fin.find((f) => f.year === 2023)?.fulfilmentT ?? 50.08);
  const shipping2023 = $derived(fin.find((f) => f.year === 2023)?.shippingT ?? 49.46);

  // Asumsi tim (diberi label eksplisit di UI): skenario konservatif / dasar / optimis.
  // Capex kini SKALA dengan jumlah unit EV (tidak flat), sesuai catatan Rp350 jt/unit.
  const EV_CAPEX_T_PER_UNIT = 0.00035; // Rp350 jt = 0,00035 T IDR per unit
  const INFRA_T = 5; // infrastruktur charging (asumsi tim, tetap)

  const scenarios = $derived([
    { name: "Konservatif", tag: "Asumsi tim", codShiftPct: 0.3, codSavedPct: 0.18, forecastMapePct: 9, evUnits: 50, evFuelSavingPct: 0.12, addressComplaintCut: 0.15 },
    { name: "Dasar", tag: "Asumsi tim", codShiftPct: 0.5, codSavedPct: 0.28, forecastMapePct: 8, evUnits: 120, evFuelSavingPct: 0.2, addressComplaintCut: 0.25 },
    { name: "Optimis", tag: "Asumsi tim", codShiftPct: 0.65, codSavedPct: 0.34, forecastMapePct: 7, evUnits: 200, evFuelSavingPct: 0.28, addressComplaintCut: 0.35 }
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
    // Capex berskala: EV unit × Rp350 jt + infrastruktur tetap.
    const capexT = s.evUnits * EV_CAPEX_T_PER_UNIT + INFRA_T;
    const payback = totalSave > 0 ? capexT / totalSave : 0;
    const roi = capexT > 0 ? totalSave / capexT : 0;
    return { codSave, fuelSave, compSave, totalSave, capexT, payback, roiYr: roi };
  }

  const computed = $derived(scenarios.map((s) => ({ ...s, ...compute(s) })));
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">ROI & Benefit-Cost Analysis</h1>
  <p class="text-sm text-muted-foreground">Tiga skenario (konservatif / dasar / optimis) · <span class="font-medium text-foreground">semua angka kuantitatif di luar studi kasus adalah asumsi tim</span>, diberi label jujur.</p>

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
    <span class="font-medium">Basis angka:</span> Fulfilment expense 2023 Rp{numId(fulfilment2023, 1)}T · Shipping expense 2023 Rp{numId(shipping2023, 1)}T (Table 3). Estimasi komponen (COD handling ~30% shipping, BBM ~15% shipping, komplain alamat ~2% fulfilment) dan capex EV (Rp350 jt/unit + infra Rp5T) adalah asumsi tim.
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    {#each computed as s (s.name)}
      <div class="rounded-2xl border border-border bg-card p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">{s.name}</p>
          <span class="rounded-full bg-accent px-2 py-0.5 text-[13.5px] font-semibold text-accent-foreground">{s.tag}</span>
        </div>
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted-foreground">COD shift ke digital</span><span class="kpi-value">{numId(s.codShiftPct * 100, 0)}%</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Penghematan COD</span><span class="kpi-value text-primary">Rp{numId(s.codSave, 1)}T/th</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Hemat BBM (EV {s.evUnits} unit)</span><span class="kpi-value">Rp{numId(s.fuelSave, 1)}T/th</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Hemat komplain alamat</span><span class="kpi-value">Rp{numId(s.compSave, 1)}T/th</span></div>
          <div class="flex justify-between border-t border-border pt-2"><span class="font-medium">Total hemat/th</span><span class="kpi-value text-success-foreground">Rp{numId(s.totalSave, 1)}T</span></div>
          <div class="flex justify-between border-t border-border pt-2"><span class="font-medium">Capex (EV {s.evUnits}×Rp350jt + infra)</span><span class="kpi-value">Rp{numId(s.capexT, 2)}T</span></div>
          <div class="flex justify-between"><span class="font-medium">Payback</span><span class="kpi-value">{numId(s.payback, 1)} thn</span></div>
          <div class="flex justify-between"><span class="font-medium">ROI / thn</span><span class="kpi-value text-primary">{numId(s.roiYr, 1)}x</span></div>
        </div>
      </div>
    {/each}
  </div>

  <div class="rounded-2xl border-l-4 border-chart-4 bg-muted/30 p-4 text-sm">
    <span class="font-medium">Interpretasi jujur:</span> kasus tidak memberi angka capex EV / harga BBM. Model memakai asumsi industri (EV capex ≈ Rp350 jt/unit, infra Rp5T, saving BBM 12-28% per skenario) agar juri melihat kerangka ROI — bukan klaim angka pasti. Capex kini <span class="font-medium">berskala</span> dengan jumlah unit (50/120/200 EV), sehingga skenario benar-benar berbeda. Semua KPI utama dari kasus (rute COD ≤100 menit, util timur ≥55%, komplain &lt;3/juta, emisi −20%/2027) tetap menjadi kompas.
  </div>
</div>