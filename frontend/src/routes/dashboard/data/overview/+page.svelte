<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type Hub, type Insights } from "$lib/api";
  import { numId } from "$lib/utils";
  import { UTIL_THRESHOLD } from "$lib/logistics";
  import RoleOverview from "$lib/components/RoleOverview.svelte";
  import RoleHubLinks from "$lib/components/RoleHubLinks.svelte";

  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let loaded = $state(false);

  // Angka armada & status hub DITARIK dari satu sumber kebenaran (API), bukan hardcode.
  let fleetData = $state<Record<string, number>>({});
  let hubs = $state<Hub[]>([]);
  let failed = $state(false);

  async function load() {
    failed = false;
    loaded = false;
    try {
      const ins = await api.insights("DATA");
      greeting = ins.greeting;
      insights = ins.insights;
    } catch {
      /* insights ditangani RoleOverview */
    }
    try {
      [fleetData, hubs] = await Promise.all([api.fleet(), api.hubs()]);
    } catch {
      failed = true;
    }
    loaded = true;
  }

  onMount(() => void load());

  const overloaded = $derived(hubs.filter((h) => h.utilizationPct > UTIL_THRESHOLD.critical).length);
  const underutilized = $derived(hubs.filter((h) => h.utilizationPct < UTIL_THRESHOLD.warn).length);

  const kpi = $derived([
    { label: "Complaint Rate 2023", value: m.do2t1(), sub: m.do2t2(), accent: "var(--color-destructive-foreground)" },
    { label: m.do2t3(), value: String(overloaded), sub: m.do3t1({ crit: UTIL_THRESHOLD.critical, n: hubs.length }), accent: "var(--color-destructive-foreground)" },
    { label: m.do2t4(), value: String(underutilized), sub: m.do3t2({ warn: UTIL_THRESHOLD.warn }) },
    { label: m.do2t5(), value: m.do2t6(), sub: "lewat Address Intelligence", accent: "var(--color-success-foreground)" }
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
  const motorSharePct = $derived(fleetData.motorcycleSharePct ?? (totalMotor ? ((fleetData.motorcycles ?? 0) / totalMotor) * 100 : 0));
</script>

<RoleOverview
  role="DATA"
  kpi={kpi}
  greeting={loaded ? greeting : ""}
  insights={loaded ? insights : []}
>
  {#snippet chart()}
    {#if loaded && failed}
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <p class="text-sm text-foreground">{m.od01()}</p>
        <button type="button" onclick={load} class="rounded-full bg-[var(--primary)] px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--primary-foreground)]">{m.od02()}</button>
      </div>
    {/if}
    <p class="mb-2 text-sm font-semibold text-muted-foreground">{m.do3f1()} {numId(motorSharePct, 1)}%</p>
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
      <p class="mt-1 text-[13px] text-muted-foreground">{m.od03()} <span class="font-medium">{m.od04()}</span> ({new Intl.NumberFormat("id-ID").format(totalMotor)} unit).</p>
      <p class="text-[14px] text-muted-foreground">
        Target EV 2026: {new Intl.NumberFormat("id-ID").format(evTarget)} {m.do3f2()}
        {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(evSharePct)}{m.do3f3()}
        {new Intl.NumberFormat("id-ID").format(totalAll)} (motor {new Intl.NumberFormat("id-ID").format(fleetData.motorcycles ?? 0)}
        + van {new Intl.NumberFormat("id-ID").format(fleetData.vans ?? 0)}
        + truk {new Intl.NumberFormat("id-ID").format(fleetData.trucks ?? 0)}
        + line-haul {new Intl.NumberFormat("id-ID").format(fleetData.lineHaul ?? 0)}).
      </p>
    </div>
  {/snippet}
</RoleOverview>

<RoleHubLinks
  links={[
    { label: "Address Intelligence", href: "/dashboard/data/address", icon: "map", desc: m.hbd01() },
    { label: "Complaint Monitor", href: "/dashboard/data/complaint", icon: "users", desc: m.hbd02() },
    { label: "Control Tower", href: "/dashboard/data/multimodal", icon: "compass", desc: m.hbd03() },
    { label: "Fleet & Emissions", href: "/dashboard/data/fleet", icon: "stack", desc: m.hbd04() },
    { label: "EV Site Selection", href: "/dashboard/data/ev-sites", icon: "grad", desc: m.hbd05() },
    { label: "Nigi AI", href: "/dashboard/data/assistant", icon: "chat", desc: m.hbd06() }
  ]}
/>