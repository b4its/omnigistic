<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub, type Insights } from "$lib/api";
  import RoleOverview from "$lib/components/RoleOverview.svelte";

  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);

  // Angka armada & status hub DITARIK dari satu sumber kebenaran (API), bukan hardcode.
  let fleetData = $state<Record<string, number>>({});
  let hubs = $state<Hub[]>([]);

  onMount(async () => {
    try {
      const ins = await api.insights("DATA");
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* */
    }
    try {
      [fleetData, hubs] = await Promise.all([api.fleet(), api.hubs()]);
    } catch {
      /* fallback: batas bawah kosong, dihitung jadi 0 */
    }
    loaded = true;
  });

  const overloaded = $derived(hubs.filter((h) => h.utilizationPct > 65).length);
  const underutilized = $derived(hubs.filter((h) => h.utilizationPct < 50).length);

  const kpi = $derived([
    { label: "Complaint Rate 2023", value: "5,5 / juta", sub: "≈ 6.105 kasus dari 1.110 jt paket", accent: "var(--color-destructive-foreground)" },
    { label: "Hub Overloaded", value: String(overloaded), sub: "utilisasi >65% (hitung dari 23 hub)", accent: "var(--color-destructive-foreground)" },
    { label: "Hub Underutilized", value: String(underutilized), sub: "utilisasi <50% (Kalimantan, Sulawesi, Maluku, Papua)" },
    { label: "Target 2026", value: "<3 / juta", sub: "lewat Address Intelligence", accent: "var(--color-success-foreground)" }
  ]);

  const fleet = $derived([
    { label: "Motor", value: fleetData.motorcycles ?? 0, color: "var(--color-primary)" },
    { label: "Van", value: fleetData.vans ?? 0, color: "var(--color-chart-2)" },
    { label: "Truck", value: fleetData.trucks ?? 0, color: "var(--color-chart-3)" }
  ]);
  const totalMotor = $derived(fleet.reduce((s, f) => s + f.value, 0) || 1);
  const totalAll = $derived(fleetData.totalArmada ?? 0);
  const evTarget = $derived(fleetData.evTarget ?? 0);
  const evSharePct = $derived(fleetData.evSharePct ?? 0);
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
      <p class="mt-1 text-[14px] text-muted-foreground">
        Target EV 2026: {new Intl.NumberFormat("id-ID").format(evTarget)} unit, hanya
        {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(evSharePct)}% dari total armada
        {new Intl.NumberFormat("id-ID").format(totalAll)} (motor {new Intl.NumberFormat("id-ID").format(fleetData.motorcycles ?? 0)}
        + van {new Intl.NumberFormat("id-ID").format(fleetData.vans ?? 0)}
        + truk {new Intl.NumberFormat("id-ID").format(fleetData.trucks ?? 0)}
        + line-haul {new Intl.NumberFormat("id-ID").format(fleetData.lineHaul ?? 0)}).
      </p>
    </div>
  {/snippet}
</RoleOverview>