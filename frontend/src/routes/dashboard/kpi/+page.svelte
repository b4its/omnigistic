<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";

  let rows = $state<Array<{ kpi: string; baseline: string; target: string }>>([]);

  const fallback = [
    { kpi: "Utilisasi hub timur", baseline: "41,5%", target: "≥55% (24 bulan)" },
    { kpi: "Complaint rate", baseline: "5,5/juta", target: "<3/juta" },
    { kpi: "Rute COD (8 paket)", baseline: "138 menit", target: "≤100 menit" },
    { kpi: "Produktivitas COD", baseline: "3,48/jam", target: "≥4,8/jam" },
    { kpi: "Forecast accuracy", baseline: "-", target: "MAPE <10%" },
    { kpi: "Eksposur per platform", baseline: "57,7%", target: "<20%" },
    { kpi: "Armada bersih", baseline: "0%", target: "Roadmap 3 fase" }
  ];

  onMount(async () => {
    try {
      rows = await api.kpiTargets();
    } catch {
      rows = fallback;
    }
  });
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">KPI Tracker</h1>
  <p class="text-sm text-muted-foreground">Baseline → target, sistem yang diusulkan</p>

  <div class="overflow-x-auto rounded-2xl border bg-card">
    <table class="w-full text-sm">
      <caption class="sr-only">KPI Omnigistic baseline dan target studi kasus</caption>
      <thead>
        <tr class="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <th scope="col" class="px-4 py-3">KPI</th>
          <th scope="col" class="px-4 py-3 text-right">Baseline</th>
          <th scope="col" class="px-4 py-3 text-right">Target</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r (r.kpi)}
          <tr class="border-b last:border-0">
            <td class="px-4 py-3 text-foreground">{r.kpi}</td>
            <td class="kpi-value px-4 py-3 text-right text-muted-foreground line-through">{r.baseline}</td>
            <td class="kpi-value px-4 py-3 text-right text-primary">{r.target}</td>
          </tr>
        {/each}
        {#if rows.length === 0}
          <tr>
            <td colspan="3" class="px-4 py-8 text-center text-muted-foreground">Loading…</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>