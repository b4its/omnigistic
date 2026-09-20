<script lang="ts">
  import { m as msg } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type SurgeResult } from "$lib/api";
  import { notify } from "$lib/toast";
  import Icon from "$lib/components/Icon.svelte";
  import PageState from "$lib/components/PageState.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { numId } from "$lib/utils";

  let res = $state<SurgeResult | null>(null);
  let loaded = $state(false);
  let failed = $state(false);

  // Kontrol simulasi (start = puncak musiman kasus 1,15×).
  let peak = $state(1.15);
  let surgeCap = $state(1.0);
  let busy = $state(false);

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Menjalankan stress-test…", type: "info", title: "Peak-Surge" });
    try {
      res = await api.surge({ peak_multiplier: peak, surge_capacity_factor: surgeCap });
    } catch {
      res = null;
      failed = true;
      if (userTriggered) notify({ message: msg.sg2t1(), type: "error", title: "Peak-Surge" });
    }
    loaded = true;
  }

  async function run() {
    busy = true;
    await load(true);
    busy = false;
  }

  onMount(() => void load());

  const topBreach = $derived(res ? [...res.hubs].filter((h) => h.breached).slice(0, 10) : []);
  const utilChart = $derived(
    res
      ? barChart(
          topBreach.length ? topBreach.map((h) => h.code) : res.hubs.slice(0, 8).map((h) => h.code),
          [
            {
              name: "Util puncak (%)",
              data: topBreach.length ? topBreach.map((h) => h.peakUtilPct) : res.hubs.slice(0, 8).map((h) => h.peakUtilPct)
            }
          ],
          { maxBarWidth: 34 }
        )
      : null
  );

  const PRESETS = [
    { label: "Musiman 1,15×", pm: 1.15, cf: 1.0, note: "Puncak bulanan Table 4" },
    { label: "Festival 2×", pm: 2.0, cf: 1.0, note: "Harbolnas / 11.11" },
    { label: "Double 12 3×", pm: 3.0, cf: 1.0, note: msg.sg2t2() },
    { label: "Double 12 + buffer", pm: 3.0, cf: 1.3, note: msg.sg2t3() }
  ];

  function applyPreset(p: (typeof PRESETS)[number]) {
    peak = p.pm;
    surgeCap = p.cf;
    void run();
  }
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">{msg.sg01()}</h1>
      <p class="text-sm text-muted-foreground">
        {msg.sg02()}
      </p>
    </div>
    <button type="button" onclick={() => run()} disabled={busy} class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] disabled:opacity-60">
      <Icon name="activity" cls="h-3.5 w-3.5" /> {busy ? "Menghitung…" : "Jalankan ulang"}
    </button>
  </div>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle=msg.sg2t1() errorHint=msg.sg2t4() onretry={() => run()} />
  {:else if loaded && res}
    <!-- Panel simulasi -->
    <div class="rounded-2xl border border-[color-mix(in_oklab,var(--bitcoin)_30%,transparent)] bg-[color-mix(in_oklab,var(--bitcoin)_6%,transparent)] p-5">
      <p class="text-sm font-semibold">{msg.sg03()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{msg.sg04()}</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-2">
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{msg.sg05()}</span><span class="kpi-value text-foreground">{numId(peak, 2)}×</span></span>
          <input type="range" min="1" max="4" step="0.05" bind:value={peak} aria-label={msg.ax20()} class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground"><span>{msg.sg06()}</span><span class="kpi-value text-foreground">{numId(surgeCap, 2)}×</span></span>
          <input type="range" min="1" max="1.5" step="0.05" bind:value={surgeCap} aria-label={msg.ax21()} class="mt-2 w-full accent-[var(--bitcoin)]" />
        </label>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        {#each PRESETS as p (p.label)}
          <button type="button" onclick={() => applyPreset(p)} class="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:text-foreground" title={p.note}>{p.label}</button>
        {/each}
      </div>
      <button type="button" onclick={run} disabled={busy} class="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--primary-foreground)] transition-all duration-300 hover:scale-[1.03] disabled:opacity-60">
        <Icon name="activity" cls="h-3.5 w-3.5" weight="bold" /> {msg.sg07()}
      </button>
    </div>

    <!-- KPI -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{msg.sg08()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.totalPeakLoadM, 2)}<span class="text-sm text-muted-foreground"> {msg.sg09()}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">{msg.sg3f1()} {numId(res.reference.totalCapacityPerDayM, 2)} jt/hari</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{msg.sg10()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl {res.summary.hubBreached > 0 ? 'text-destructive-foreground' : 'text-success-foreground'}">{res.summary.hubBreached}<span class="text-sm text-muted-foreground"> / {res.summary.hubCount}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">util nasional {numId(res.summary.nationalUtilPct, 1)}%</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{msg.sg11()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.residualOverflowM, 3)}<span class="text-sm text-muted-foreground">M</span></p>
        <p class="mt-1 text-xs text-muted-foreground">dialihkan {numId(res.summary.spilloverMovedM, 3)}{msg.sg3f2()}</p>
      </div>
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{msg.sg12()}</p>
        <p class="kpi-value mt-2 font-heading text-2xl">{numId(res.summary.recoveryDays, 1)}<span class="text-sm text-muted-foreground"> {msg.sg13()}</span></p>
        <p class="mt-1 text-xs text-muted-foreground">{msg.sg14()}</p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">{msg.sg15()}</p>
        {#if utilChart}<EChart option={utilChart} height={280} label={msg.sg2t5()} />{/if}
      </div>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">{msg.sg16()}</p>
        <div class="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {#if res.spillover.length === 0}
            <p class="text-sm text-muted-foreground">{msg.sg17()}</p>
          {/if}
          {#each res.spillover as m (m.fromCode + m.toCode)}
            <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span class="flex items-center gap-1.5">
                <span class="font-mono text-xs font-medium">{m.fromCode}</span>
                <Icon name="arrow-right" cls="h-3.5 w-3.5 text-muted-foreground" />
                <span class="font-mono text-xs">{m.toCode}</span>
              </span>
              <span class="kpi-value text-[var(--bitcoin)]">{numId(m.quantityM, 3)}M</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Tabel hub -->
    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full text-sm">
        <caption class="sr-only">{msg.sg18()}</caption>
        <thead>
          <tr class="border-b border-border bg-muted/50 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th class="px-4 py-2.5">{msg.sg19()}</th>
            <th class="px-4 py-2.5 text-right">{msg.sg20()}</th>
            <th class="px-4 py-2.5 text-right">{msg.sg21()}</th>
            <th class="px-4 py-2.5 text-right">{msg.sg22()}</th>
            <th class="px-4 py-2.5 text-right">{msg.sg23()}</th>
          </tr>
        </thead>
        <tbody>
          {#each res.hubs as h (h.code)}
            <tr class="border-b border-border/60 last:border-0 {h.breached ? 'bg-destructive/5' : ''}">
              <td class="px-4 py-2">{h.name} <span class="font-mono text-[11px] text-muted-foreground">{h.code}</span></td>
              <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">{numId(h.capacityEffectiveM, 3)}M</td>
              <td class="px-4 py-2 text-right tabular-nums">{numId(h.peakLoadM, 3)}M</td>
              <td class="px-4 py-2 text-right tabular-nums font-medium {h.peakUtilPct > 100 ? 'text-destructive-foreground' : h.peakUtilPct > 65 ? 'text-warning-foreground' : ''}">{numId(h.peakUtilPct, 1)}%</td>
              <td class="px-4 py-2 text-right tabular-nums">{h.overflowM > 0 ? numId(h.overflowM, 3) + "M" : "—"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-[var(--bitcoin)] bg-muted/30 p-4 text-sm">
      <span class="font-medium">{msg.sg24()}</span> {msg.sg25()} <strong>{msg.sg26()}</strong> {msg.sg3f3()} {res.note}
    </div>

    <!-- Rencana kanonik (analisis tim) -->
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-sm font-medium">{msg.sg27()}</p>
      <p class="mt-1 text-xs text-muted-foreground">
        {msg.sg28()} <span class="font-medium text-foreground">{msg.sg29()}</span> (Rp{numId(res.plan.loadBalancing.costPerPackageIdr, 0)} {msg.sg3f4()}
        {msg.sg3f5()} {res.plan.loadBalancing.derivation}.
      </p>

      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <caption class="sr-only">{msg.sg30()}</caption>
          <thead>
            <tr class="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <th class="py-2">{msg.sg31()}</th>
              <th class="py-2 text-right">{msg.sg32()}</th>
              <th class="py-2 text-right">{msg.sg33()}</th>
            </tr>
          </thead>
          <tbody>
            {#each res.plan.amplificationTable as a (a.amplification)}
              <tr class="border-b border-border/60 last:border-0">
                <td class="py-2">{numId(a.amplification, 2)}×</td>
                <td class="py-2 text-right tabular-nums font-medium">{a.hubsBreached}</td>
                <td class="py-2 text-right tabular-nums text-muted-foreground">{numId(a.nationalUtilPct, 1)}%</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{msg.sg34()}</p>
          <p class="kpi-value text-lg text-success-foreground">Rp{numId(res.plan.loadBalancing.costPerPackageIdr, 0)}<span class="text-sm text-muted-foreground"> {msg.sg35()}</span></p>
        </div>
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{msg.sg36()}</p>
          <p class="kpi-value text-lg">Rp{numId(res.plan.newHubCapexPerPackageIdr.horizon10 ?? 0, 0)}<span class="text-sm text-muted-foreground"> {msg.sg37()}</span></p>
        </div>
        <div class="rounded-xl bg-muted/40 p-3">
          <p class="text-xs text-muted-foreground">{msg.sg38()}</p>
          <p class="kpi-value text-lg">Rp{numId(res.plan.newHubCapexPerPackageIdr.horizon5 ?? 0, 0)}<span class="text-sm text-muted-foreground"> {msg.sg39()}</span></p>
        </div>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{msg.sg40()}</p>
          <ul class="mt-2 space-y-1 text-xs">
            {#each res.plan.layers as l (l.layer)}
              <li><span class="font-medium">{l.layer}:</span> {l.content}</li>
            {/each}
          </ul>
        </div>
        <div>
          <p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{msg.sg41()}</p>
          <ul class="mt-2 space-y-1 text-xs">
            {#each res.plan.downturnPlaybook as d (d.when)}
              <li><span class="font-medium">{d.when}:</span> {d.action}</li>
            {/each}
          </ul>
        </div>
      </div>

      <p class="mt-4 text-xs text-muted-foreground">
        Contoh Jakarta: mengalihkan {numId(res.plan.jakartaExample.movedTotalM, 2)} {msg.sg3f6()}
        {numId(res.plan.jakartaExample.utilizationBeforePct, 1)}% ke {numId(res.plan.jakartaExample.utilizationAfterPct, 1)}%, sementara penerima naik ke
        {res.plan.jakartaExample.receivers.map((r) => `${r.hub} ${numId(r.utilizationAfterPct, 1)}%`).join(", ")}.
      </p>
    </div>
  {:else}
    <PageState loading={true} skeletonCards={4} skeletonHeight={280} />
  {/if}
</div>
