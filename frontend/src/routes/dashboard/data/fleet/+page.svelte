<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import EChart from "$lib/components/EChart.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import { donutChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let fleet = $state<Record<string, number>>({});
  let loaded = $state(false);
  let failed = $state(false);

  async function load() {
    loaded = false;
    failed = false;
    try {
      fleet = await api.fleet();
    } catch {
      fleet = {};
      failed = true;
    }
    loaded = true;
  }

  onMount(() => void load());

  const pieData = $derived([
    { name: "Motor", value: fleet.motorcycles ?? 0, color: "var(--color-chart-1)" },
    { name: "Van", value: fleet.vans ?? 0, color: "var(--color-chart-3)" },
    { name: "Truck", value: fleet.trucks ?? 0, color: "var(--color-chart-5)" }
  ]);

  const total = $derived(pieData.reduce((s, d) => s + d.value, 0));
  // Basis total aset = line-haul 840 + motor 12.500 + van 280 + truk 560 = 14.180
  const totalAll = $derived((fleet.lineHaul ?? 0) + total);
  // Pangsa motor dari armada last-mile — pakai field API bila ada, kalau tidak
  // HITUNG dari data (jangan hardcode 93,7 yang bisa drift dari sumber).
  const motorSharePct = $derived(fleet.motorcycleSharePct ?? (total ? ((fleet.motorcycles ?? 0) / total) * 100 : 0));

  // ── Simulasi transisi EV (interaktif) ──────────────────────────────────
  // Asumsi tim (dilabel): emisi rata-rata per unit-km/hari & % km motor.
  // Digunakan HANYA untuk membandingkan skenario, bukan klaim emisi absolut.
  const CO2_MOTOR_KG_YR = 780; // emisi tahunan proxy 1 motor BBM (asumsi)
  const CO2_EV_KG_YR = 156;    // emisi tahunan proxy 1 motor EV (grid, asumsi)
  const CO2_VAN_KG_YR = 4200;
  const CO2_TRUCK_KG_YR = 9500;

  let evAdoptionPct = $state(0);   // % armada last-mile dikonversi ke EV
  let showSim = $state(false);

  const sim = $derived.by(() => {
    const motor = fleet.motorcycles ?? 0;
    const van = fleet.vans ?? 0;
    const truck = fleet.trucks ?? 0;
    const lastMile = motor + van + truck;
    const convert = Math.round((lastMile * evAdoptionPct) / 100);
    // Basis mix: konversi proporsional dari motor (yang paling dominan).
    const motorEv = Math.min(convert, motor);
    const sisaEv = Math.max(0, convert - motorEv);
    const vanEv = Math.min(sisaEv, van);
    const truckEv = Math.min(Math.max(0, sisaEv - vanEv), truck);

    const co2Before = motor * CO2_MOTOR_KG_YR + van * CO2_VAN_KG_YR + truck * CO2_TRUCK_KG_YR;
    const co2After =
      (motor - motorEv) * CO2_MOTOR_KG_YR +
      (van - vanEv) * CO2_VAN_KG_YR +
      (truck - truckEv) * CO2_TRUCK_KG_YR +
      (motorEv + vanEv + truckEv) * CO2_EV_KG_YR;
    const co2SavedKg = co2Before - co2After;
    return {
      convert, motorEv, vanEv, truckEv,
      evSharePct: lastMile ? (convert / lastMile) * 100 : 0,
      co2Before, co2After, co2SavedKg,
      co2SavedPct: co2Before ? (co2SavedKg / co2Before) * 100 : 0,
    };
  });

  const simPie = $derived([
    { name: "Motor BBM", value: (fleet.motorcycles ?? 0) - sim.motorEv, color: "var(--color-chart-1)" },
    { name: "Van", value: (fleet.vans ?? 0) - sim.vanEv, color: "var(--color-chart-3)" },
    { name: "Truck", value: (fleet.trucks ?? 0) - sim.truckEv, color: "var(--color-chart-5)" },
    { name: "EV", value: sim.convert, color: "var(--color-success-foreground, var(--color-primary))" }
  ]);
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.df01()}</h1>
    <span class="hub-label text-muted-foreground">DATA · motor dominan {numId(motorSharePct, 1)}%</span>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle={m.fl2t1()} onretry={load} />
  {:else if loaded}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border bg-card p-4 text-center">
        <p class="kpi-value text-2xl">{new Intl.NumberFormat("id-ID").format(totalAll)}</p>
        <p class="text-xs text-muted-foreground">{m.df02()}</p>
      </div>
      <div class="rounded-2xl border border-primary/30 bg-card p-4 text-center">
        <p class="kpi-value text-2xl text-primary">{numId(motorSharePct, 1)}%</p>
        <p class="text-xs text-muted-foreground">{m.df3f1()} {new Intl.NumberFormat("id-ID").format(total)} last-mile)</p>
      </div>
      <div class="rounded-2xl border border-chart-3 bg-card p-4 text-center">
        <p class="kpi-value text-2xl text-chart-3">{fleet.lastMileMotorPct ?? 70}%</p>
        <p class="text-xs text-muted-foreground">{m.df03()}</p>
      </div>
      <div class="rounded-2xl border border-destructive/30 bg-card p-4 text-center">
        <p class="kpi-value text-2xl text-destructive-foreground">{fleet.evTarget ?? 200}</p>
        <p class="text-xs text-muted-foreground">{m.df04()}</p>
      </div>
    </div>

    <div class="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-sm font-semibold">{m.df05()}</p>
          <p class="mt-1 text-xs text-muted-foreground">{m.df06()}</p>
        </div>
        <button
          type="button"
          onclick={() => { evAdoptionPct = 0; showSim = false; }}
          class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold hover:border-primary/40"
        >{m.df07()}</button>
      </div>
      <label class="mt-4 block">
        <span class="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{m.df08()}</span><span class="kpi-value text-foreground">{evAdoptionPct}% · {new Intl.NumberFormat("id-ID").format(sim.convert)} unit</span>
        </span>
        <input
          type="range" min="0" max="100" step="5"
          bind:value={evAdoptionPct}
          oninput={() => (showSim = true)}
          aria-label={m.ax15()}
          class="mt-2 w-full accent-[var(--color-primary)]"
        />
      </label>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-card/70 p-3">
          <p class="text-xs text-muted-foreground">{m.df09()}</p>
          <p class="kpi-value text-lg">{numId(sim.evSharePct, 1)}%</p>
          <p class="text-[11px] text-muted-foreground">{m.df3f2()} {numId(((fleet.evTarget ?? 200) / (total || 1)) * 100, 2)}%</p>
        </div>
        <div class="rounded-xl bg-card/70 p-3">
          <p class="text-xs text-muted-foreground">{m.df10()}</p>
          <p class="kpi-value text-lg">{numId(sim.co2Before / 1000, 1)} → {numId(sim.co2After / 1000, 1)} <span class="text-xs">t</span></p>
          <p class="text-[11px] text-muted-foreground">{m.df11()}</p>
        </div>
        <div class="rounded-xl bg-card/70 p-3">
          <p class="text-xs text-muted-foreground">{m.df12()}</p>
          <p class="kpi-value text-lg text-success-foreground">−{numId(sim.co2SavedPct, 1)}%</p>
          <p class="text-[11px] text-muted-foreground">{numId(sim.co2SavedKg / 1000, 1)} {m.df3f3()}</p>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-3 text-sm font-medium">{m.df3f4()} {showSim && evAdoptionPct > 0 ? `(simulasi EV ${evAdoptionPct}%)` : "(motor dominan)"}</p>
      <EChart option={donutChart(showSim && evAdoptionPct > 0 ? simPie : pieData)} height={220} />
      {#if showSim && evAdoptionPct > 0}
        <p class="mt-3 text-xs text-muted-foreground">
          Konversi: {new Intl.NumberFormat("id-ID").format(sim.motorEv)} motor ·
          {new Intl.NumberFormat("id-ID").format(sim.vanEv)} van ·
          {new Intl.NumberFormat("id-ID").format(sim.truckEv)} truk → EV.
        </p>
      {/if}
    </div>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-3 text-sm font-medium">{m.df13()}</p>
      <ol class="space-y-3">
        <li class="rounded-md bg-muted/50 p-3 text-sm"><span class="font-semibold">{m.df14()}</span> {m.df15()} <span class="text-muted-foreground">{m.df16()}</span></li>
        <li class="rounded-md bg-muted/50 p-3 text-sm"><span class="font-semibold">{m.df17()}</span> {m.df18()} <span class="text-muted-foreground">{m.df19()}</span></li>
        <li class="rounded-md bg-muted/50 p-3 text-sm"><span class="font-semibold">{m.df20()}</span> {m.df21()} <span class="text-muted-foreground">{m.df22()}</span></li>
      </ol>
    </div>

    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
      Motor {numId(motorSharePct, 1)}{m.df3f5()}{new Intl.NumberFormat("id-ID").format(fleet.motorcycles ?? 0)} unit). Target {fleet.evTarget ?? 200} EV ≈ {numId(((fleet.evTarget ?? 200) / (totalAll || 1)) * 100, 2)}% dari {new Intl.NumberFormat("id-ID").format(totalAll)} {m.df3f6()}
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={220} />
  {/if}
</div>