<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Insights } from "$lib/api";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import { cn } from "$lib/utils";

  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);

  onMount(async () => {
    try {
      const ins = await api.insights("DATA");
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* */
    }
    loaded = true;
  });

  const kpi = [
    { label: "Complaint Rate 2023", value: "5,5 / juta", sub: "≈ 6.105 kasus dari 1.110 jt paket", accent: "var(--color-destructive-foreground)" },
    { label: "Hub Overloaded", value: "8", sub: "Jawa rata-rata di atas 65%", accent: "var(--color-destructive-foreground)" },
    { label: "Hub Underutilized", value: "7", sub: "Kalimantan, Sulawesi, Maluku, Papua <50%" },
    { label: "Target 2026", value: "<3 / juta", sub: "lewat Address Intelligence", accent: "var(--color-success-foreground)" }
  ];

  const fleet = [
    { label: "Motor", value: 12500, color: "var(--color-primary)" },
    { label: "Van", value: 280, color: "var(--color-chart-2)" },
    { label: "Truck", value: 560, color: "var(--color-chart-3)" }
  ];
  const totalMotor = fleet.reduce((s, f) => s + f.value, 0);
</script>

<RoleOverview
  role="DATA"
  kpi={kpi}
  greeting={loaded ? greeting : ""}
  insights={loaded ? insights : []}
>
  {#snippet chart()}
    <p class="mb-2 text-sm font-semibold text-muted-foreground">Armada: motor dominan 93,7%</p>
    <div class="flex h-[220px] flex-col justify-center gap-4">
      {#each fleet as f (f.label)}
        <div class="flex items-center gap-3">
          <span class="w-16 shrink-0 text-xs font-medium text-muted-foreground">{f.label}</span>
          <div class="h-4 flex-1 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full transition-all" style={"width:" + (f.value / totalMotor) * 100 + "%;background:" + f.color}></div>
          </div>
          <span class="w-16 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">{new Intl.NumberFormat("id-ID").format(f.value)}</span>
        </div>
      {/each}
      <p class="mt-1 text-[14px] text-muted-foreground">Target EV 2026: 200 unit, hanya 1,4% dari total armada 14.180 (motor 12.500 + van 280 + truk 560 + line-haul 840).</p>
    </div>
  {/snippet}
</RoleOverview>