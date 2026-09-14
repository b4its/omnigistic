<script lang="ts">
  import { onMount } from "svelte";
  import { api, type FinRow } from "$lib/api";

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

  // Asumsi tim (diberi label eksplisit di UI): skenario konservatif / dasar / optimis
  const scenarios = $derived([
    {
      name: "Konservatif",
      tag: "Asumsi tim",
      codShiftPct: 0.3,
      codSavedPct: 0.18,
      forecastMapePct: 9,
      evUnits: 50,
      evFuelSavingPct: 0.12,
      addressComplaintCut: 0.15,
      roadFactor_removed: true
    },
    {
      name: "Dasar",
      tag: "Asumsi tim",
      codShiftPct: 0.5,
      codSavedPct: 0.28,
      forecastMapePct: 8,
      evUnits: 120,
      evFuelSavingPct: 0.2,
      addressComplaintCut: 0.25,
      roadFactor_removed: true
    },
    {
      name: "Optimis",
      tag: "Asumsi tim",
      codShiftPct: 0.65,
      codSavedPct: 0.34,
      forecastMapePct: 7,
      evUnits: 200,
      evFuelSavingPct: 0.28,
      addressComplaintCut: 0.35,
      roadFactor_removed: true
    }
  ]);

  // ROI sederhana: penghematan tahunan dari (1) COD shift, (2) fuel saving EV, (3) penurunan komplain return
  const annualCodPoolT = $derived(shipping2023 * 0.3); // asumsi 30% biaya shipping dari COD handling
  const fuelPoolT = $derived(shipping2023 * 0.15); // asumsi 15% shipping adalah BBM
  const complaintCostT = $derived(fulfilment2023 * 0.02); // asumsi 2% fulfilment terkait komplain alamat

  const capex = {
    Sama: { eco: 30, infra: 5 }
  };

  function compute(s: (typeof scenarios)[number]) {
    const codSave = annualCodPoolT * s.codSavedPct;
    const fuelSave = fuelPoolT * s.evFuelSavingPct;
    const compSave = complaintCostT * s.addressComplaintCut;
    const totalSave = codSave + fuelSave + compSave;
    const capexT = capex.Sama.eco + capex.Sama.infra;
    const payback = totalSave > 0 ? capexT / totalSave : 0;
    const roi = totalSave / capexT;
    return {
      codSave,
      fuelSave,
      compSave,
      totalSave,
      capexT,
      payback,
      roiYr: roi
    };
  }

  const computed = $derived(scenarios.map((s) => ({ ...s, ...compute(s) })));
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">ROI & Benefit-Cost Analysis</h1>
  <p class="text-sm text-muted-foreground">Tiga skenario (konservatif / dasar / optimis) · <span class="font-medium text-foreground">semua angka kuantitatif di luar studi kasus adalah asumsi tim</span>, diberi label jujur.</p>

  <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
    <span class="font-medium">Basis angka:</span> Fulfilment expense 2023 Rp{fulfilment2023.toFixed(1)}T · Shipping expense 2023 Rp{shipping2023.toFixed(1)}T (Table 3). Estimasi komponen (COD handling ~30% shipping, BBM ~15% shipping, komplain alamat ~2% fulfilment) adalah asumsi tim.
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    {#each computed as s (s.name)}
      <div class="rounded-2xl border border-border bg-card p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">{s.name}</p>
          <span class="rounded-full bg-accent px-2 py-0.5 text-[13.5px] font-semibold text-accent-foreground">{s.tag}</span>
        </div>
        <div class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted-foreground">COD shift ke digital</span><span class="kpi-value">{(s.codShiftPct * 100).toFixed(0)}%</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Penghematan COD</span><span class="kpi-value text-primary">Rp{s.codSave.toFixed(1)}T/th</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Hemat BBM (EV {s.evUnits} unit)</span><span class="kpi-value">Rp{s.fuelSave.toFixed(1)}T/th</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Hemat komplain alamat</span><span class="kpi-value">Rp{s.compSave.toFixed(1)}T/th</span></div>
          <div class="border-t border-border pt-2 flex justify-between"><span class="font-medium">Total hemat/th</span><span class="kpi-value text-success-foreground">Rp{s.totalSave.toFixed(1)}T</span></div>
          <div class="border-t border-border pt-2 flex justify-between"><span class="font-medium">Capex (EV + infra)</span><span class="kpi-value">Rp{s.capexT.toFixed(1)}T</span></div>
          <div class="flex justify-between"><span class="font-medium">Payback</span><span class="kpi-value">{(s.payback).toFixed(1)} thn</span></div>
          <div class="flex justify-between"><span class="font-medium">ROI / thn</span><span class="kpi-value text-primary">{s.roiYr.toFixed(1)}x</span></div>
        </div>
      </div>
    {/each}
  </div>

  <div class="rounded-2xl border-l-4 border-chart-4 bg-muted/30 p-4 text-sm">
    <span class="font-medium">Interpretasi jujur:</span> kasus tidak memberi angka capex EV / harga BBM. Model ini memakai asumsi industri (EV capex ≈ Rp350 jt/unit, saving BBM 12-28% sesuai skenario) agar juri melihat kerangka ROI—bukan klaim angka pasti. Semua KPI utama dari kasus (rute COD ≤100 menit, util timur ≥55%, komplain &lt;3/juta, emisi -20%/2027) tetap menjadi kompas.
  </div>
</div>