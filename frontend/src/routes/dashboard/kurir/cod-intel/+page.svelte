<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import CodRealOrdersBridge from "$lib/components/CodRealOrdersBridge.svelte";
  import { barChart } from "$lib/charts/options";
  import { api, type CodIntelResult, type CodPlan } from "$lib/api";
  import { notify } from "$lib/toast";
  import { numId } from "$lib/utils";

  let res = $state<CodIntelResult | null>(null);
  let plan = $state<CodPlan | null>(null);
  let scenarios = $state<Record<string, CodIntelResult>>({});
  let loaded = $state(false);
  let failed = $state(false);
  let busy = $state(false);

  // Kontrol interaktif
  let codShare = $state(60);
  let packagesPerShift = $state(40);
  let active = new SvelteSet<string>();

  function toggle(key: string, checked: boolean) {
    if (checked) active.add(key);
    else active.delete(key);
    void recompute();
  }

  async function recompute() {
    if (!res) return;
    busy = true;
    try {
      res = await api.codIntel({
        cod_share_pct: codShare,
        interventions: [...active],
        packages_per_shift: packagesPerShift
      });
    } catch {
      notify({ message: m.ci2t1(), type: "error", title: "COD Intelligence" });
    }
    busy = false;
  }

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: m.ci2t2(), type: "info", title: "COD Intelligence" });
    try {
      scenarios = await api.codIntelScenarios();
      res = scenarios["Tanpa intervensi (baseline)"] ?? Object.values(scenarios)[0] ?? null;
      plan = await api.codPlan();
      if (userTriggered) notify({ message: m.ci2t3(), type: "success", title: "COD Intelligence" });
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: m.ci2t4(), type: "error", title: "COD Intelligence" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);
  const rupiah = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(n));

  // Grafik durasi shift baseline vs optimized.
  const durationChart = $derived(
    res
      ? barChart(
          ["Baseline", "Setelah intervensi"],
          [
            {
              name: "Durasi shift (menit)",
              data: [res.baseline.shiftDurationMin, res.optimized.shiftDurationMin],
              color: "var(--color-primary)"
            }
          ],
          { maxBarWidth: 90, hideLegend: true }
        )
      : null
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">{m.ci01()}</h1>
      <p class="text-sm text-muted-foreground">
        {m.ci02()}
      </p>
    </div>
    <span class="hub-label text-muted-foreground">{m.ci03()}</span>
  </div>

  {#if loaded && res}
    <!-- Kasus dasar -->
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">{m.ci04()}</p>
        <p class="kpi-value text-xl">{res.caseFigures.nonCod.durationMin} menit</p>
        <p class="text-xs text-muted-foreground">{res.caseFigures.nonCod.packages} paket · {res.caseFigures.nonCod.distanceKm} km</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">{m.ci05()}</p>
        <p class="kpi-value text-xl text-destructive-foreground">{res.caseFigures.cod.durationMin} menit</p>
        <p class="text-xs text-muted-foreground">+{Math.round((res.caseFigures.cod.durationMin / res.caseFigures.nonCod.durationMin - 1) * 100)}% lebih lambat</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-xs text-muted-foreground">{m.ci06()}</p>
        <p class="kpi-value text-xl">{fmt(res.baseline.waitPerCodPkgMin)} menit</p>
        <p class="text-xs text-muted-foreground">{m.ci07()}</p>
      </div>
    </div>

    <!-- Kontrol interaktif -->
    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-base font-semibold">{m.ci08()}</p>
      <p class="text-[13.5px] text-muted-foreground">{m.ci09()}</p>

      <div class="mt-4 grid gap-5 lg:grid-cols-2">
        <div class="space-y-4">
          <label class="block">
            <span class="flex items-center justify-between text-sm font-medium">
              <span>{m.ci10()}</span>
              <span class="kpi-value text-primary">{codShare}%</span>
            </span>
            <input
              type="range" min="0" max="100" step="5" value={codShare}
              oninput={(e) => (codShare = Number((e.currentTarget as HTMLInputElement).value))}
              onchange={() => void recompute()}
              aria-label={m.ci2t5()}
              class="mt-2 w-full accent-[var(--color-primary)]"
            />
          </label>
          <label class="block">
            <span class="flex items-center justify-between text-sm font-medium">
              <span>{m.ci11()}</span>
              <span class="kpi-value text-primary">{packagesPerShift}</span>
            </span>
            <input
              type="range" min="16" max="80" step="4" value={packagesPerShift}
              oninput={(e) => (packagesPerShift = Number((e.currentTarget as HTMLInputElement).value))}
              onchange={() => void recompute()}
              aria-label={m.ci2t6()}
              class="mt-2 w-full accent-[var(--color-primary)]"
            />
          </label>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{m.ci12()}</p>
          {#each res.interventionCatalog as iv (iv.key)}
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/40 p-3 transition-colors hover:border-primary/40">
              <input
                type="checkbox" checked={active.has(iv.key)}
                onchange={(e) => toggle(iv.key, (e.currentTarget as HTMLInputElement).checked)}
                class="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
              />
              <span class="min-w-0">
                <span class="block text-sm font-medium">{iv.label}</span>
                <span class="block text-xs text-muted-foreground">pangkas ~{iv.cutPct}% waktu tunggu COD</span>
              </span>
            </label>
          {/each}
        </div>
      </div>
    </section>

    <!-- Hasil dampak -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" class:opacity-60={busy}>
      <MetricCard
        label={m.ci2t7()}
        value={`${fmt(res.impact.minutesSavedPerShift)} menit`}
        sub={`shift ${fmt(res.baseline.shiftDurationMin)} → ${fmt(res.optimized.shiftDurationMin)} menit`}
        accent
      />
      <MetricCard
        label={m.ci2t8()}
        value={`+${fmt(res.impact.extraPackagesPerShift)}`}
        sub={m.ci4t1({ pct: fmt(res.impact.extraCapacityPct) })}
        deltaTone="up"
        delta={`+${fmt(res.impact.extraCapacityPct)}%`}
      />
      <MetricCard
        label={m.ci2t9()}
        value={rupiah(res.impact.savedIdrPerShift)}
        sub={m.ci2t10()}
      />
      <MetricCard
        label={m.ci2t11()}
        value={`${fmt(res.impact.savedCo2GramPerShift / 1000)} kg`}
        sub={m.ci2t12()}
      />
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">{m.ci13()}</p>
        {#if durationChart}
          <EChart option={durationChart} height={260} label="Durasi shift baseline vs intervensi" />
        {/if}
        <p class="mt-2 text-xs text-muted-foreground">
          {m.ci3f1()} {fmt(res.split.codPackages)} · non-COD: {fmt(res.split.nonCodPackages)}. Pemangkasan intervensi = {fmt(res.input.interventionCutPct)}%.
        </p>
      </div>

      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">{m.ci14()}</p>
        <div class="space-y-3 text-sm">
          <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span class="text-muted-foreground">{m.ci15()}</span>
            <span class="kpi-value text-primary">{fmt(res.impact.hoursSavedPer100Couriers)} jam</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span class="text-muted-foreground">{m.ci16()}</span>
            <span class="kpi-value text-primary">+{fmt(res.impact.extraPackagesPerShift * 100)} paket</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <span class="text-muted-foreground">{m.ci17()}</span>
            <span class="kpi-value text-primary">{rupiah(res.impact.savedIdrPerShift * 100)}</span>
          </div>
        </div>
        <p class="mt-3 text-xs text-muted-foreground">
          {m.ci18()}
        </p>
      </div>
    </div>

    <!-- Rekomendasi -->
    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
      <span class="font-medium">{m.ci19()}</span>
      {m.ci20()} <strong>{m.ci21()}</strong>{m.ci22()} <strong>{m.ci23()}</strong> {m.ci24()} <strong>{m.ci25()}</strong> {m.ci26()}
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-base font-semibold">{m.ci27()}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th scope="col" class="px-3 py-2">{m.ci28()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.ci29()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.ci30()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.ci31()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.ci32()}</th>
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(scenarios) as [name, s] (name)}
              <tr class="border-b last:border-0">
                <td class="px-3 py-2">{name}</td>
                <td class="px-3 py-2 text-right tabular-nums">{fmt(s.optimized.shiftDurationMin)} menit</td>
                <td class="px-3 py-2 text-right tabular-nums text-primary">{s.impact.minutesSavedPerShift > 0 ? "+" : ""}{fmt(s.impact.minutesSavedPerShift)} menit</td>
                <td class="px-3 py-2 text-right tabular-nums">+{fmt(s.impact.extraPackagesPerShift)}</td>
                <td class="px-3 py-2 text-right tabular-nums">+{fmt(s.impact.extraCapacityPct)}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">{m.ci33()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.ci34()}</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">{m.ci35()}</button>
    </div>
    <!-- Rencana kanonik (analisis tim) -->
    {#if plan}
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="text-sm font-medium">{m.ci36()}</p>
        <p class="mt-1 text-xs text-muted-foreground">{plan.incentive.note}</p>

        <div class="mt-4 grid gap-3 sm:grid-cols-4">
          <div class="rounded-xl bg-muted/40 p-3">
            <p class="text-xs text-muted-foreground">{m.ci37()}</p>
            <p class="kpi-value text-lg">{numId(plan.timeBasis.nonCodPerPackageMin, 2)}<span class="text-sm text-muted-foreground"> → {numId(plan.timeBasis.codPerPackageMin, 2)} menit</span></p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{m.ci38()}</p>
          </div>
          <div class="rounded-xl bg-muted/40 p-3">
            <p class="text-xs text-muted-foreground">{m.ci39()}</p>
            <p class="kpi-value text-lg text-destructive-foreground">{numId(plan.timeBasis.productivityDropPct, 1)}%</p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{numId(plan.timeBasis.productivityNonCodPerDay, 1)} → {numId(plan.timeBasis.productivityCodPerDay, 1)} {m.ci3f2()}</p>
          </div>
          <div class="rounded-xl bg-muted/40 p-3">
            <p class="text-xs text-muted-foreground">{m.ci40()}</p>
            <p class="kpi-value text-lg">Rp{numId(plan.incentive.lostIncomePerDayLowIdr, 0)}–{numId(plan.incentive.lostIncomePerDayHighIdr, 0)}</p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{m.ci3f3()}{numId(plan.incentive.lostDeliveriesPerDay, 2)} paket)</p>
          </div>
          <div class="rounded-xl bg-muted/40 p-3">
            <p class="text-xs text-muted-foreground">{m.ci41()}</p>
            <p class="kpi-value text-lg text-success-foreground">{numId(plan.realization.targetMinutesPerPackage, 1)} menit</p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{numId(plan.realization.productivityTargetPerDay, 0)}{m.ci3f4()}{numId(plan.realization.productivityUpliftPct, 0)}%)</p>
          </div>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Empat intervensi digital (total {numId(plan.interventionTotalMin, 1)} menit)</p>
            <ul class="mt-2 space-y-1 text-xs">
              {#each plan.interventions as iv (iv.key)}
                <li><span class="font-medium">{iv.label}</span> · {numId(iv.minutes, 1)} menit</li>
              {/each}
            </ul>
            <p class="mt-2 text-[11px] text-muted-foreground">Realisasi {numId(plan.realization.realizationPct, 1)}% → hemat {numId(plan.realization.realizedMinutesPerPackage, 2)} {m.ci3f5()} {plan.assumptions.realizationRangePct[0]}–{plan.assumptions.realizationRangePct[1]}%.</p>
          </div>
          <div>
            <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.ci42()}</p>
            <table class="mt-2 w-full text-xs">
              <tbody>
                {#each plan.targets as t (t.metric)}
                  <tr class="border-b border-border/60 last:border-0">
                    <td class="py-1.5">{t.metric}</td>
                    <td class="py-1.5 text-right tabular-nums text-muted-foreground">{t.baseline}</td>
                    <td class="py-1.5 text-right tabular-nums font-medium">{t.target}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
            <p class="mt-2 text-[11px] text-muted-foreground">Rekonsiliasi kas tiga arah: {plan.reconciliation.sources.join(", ")}.</p>
          </div>
        </div>

        <details class="mt-4">
          <summary class="cursor-pointer text-xs font-medium">{m.ci43()}</summary>
          <div class="mt-2 overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th class="py-1.5">{m.ci44()}</th><th class="py-1.5">{m.ci45()}</th><th class="py-1.5">{m.ci46()}</th>
                </tr>
              </thead>
              <tbody>
                {#each plan.processComparison as p (p.stage)}
                  <tr class="border-b border-border/60 last:border-0">
                    <td class="py-1.5 font-medium">{p.stage}</td>
                    <td class="py-1.5 text-muted-foreground">{p.nonCod}</td>
                    <td class="py-1.5">{p.cod}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </details>

        <p class="mt-4 text-xs text-muted-foreground">
          Nilai: Rp{numId(plan.value.valuePerCodPackageIdr, 0)} {m.ci3f6()} {numId(plan.value.codPackagesPerYearM, 1)} {m.ci3f7()} {numId(plan.value.codMixPct, 0)}%) =
          <span class="font-medium text-foreground">Rp{numId(plan.value.derivableIdrT, 2)} {m.ci3f8()}</span> {m.ci3f9()}{numId(plan.value.workingValueIdrT, 2)} triliun memakai komponen tambahan berlabel asumsi.
        </p>
      </div>
    {/if}
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">{m.ci47()}</div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-4">{#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}</div>
  {/if}

  <!-- Jembatan ke pesanan COD NYATA (agar simulasi tidak terpisah dari alur kurir) -->
  <CodRealOrdersBridge />
</div>
