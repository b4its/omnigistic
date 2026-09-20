<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type CodImpact, type CodRiskPkg, type CodFactor } from "$lib/api";
  import Icon from "$lib/components/Icon.svelte";
  import GlitterIcon from "$lib/components/ui/GlitterIcon.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { donutChart } from "$lib/charts/options";
  import { resolveHref, numId } from "$lib/utils";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, codTriageOrders, type Order } from "$lib/stores/shop";
  import { COURIER, COD_DECISION_LABEL, COD_THRESHOLDS, codDecisionTone } from "$lib/logistics";
  import { notify } from "$lib/toast";

  let packages = $state<CodRiskPkg[]>([]);
  let sim = $state<CodImpact | null>(null);
  let loaded = $state(false);
  let errored = $state(false);
  let openId = $state<string | null>(null);

  /** Pesanan COD NYATA dari checkout pembeli (dipenuhi lewat store bersama). */
  let orders = $state<Order[]>([]);

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    void loadDemo();
    return unsub;
  });

  async function loadDemo() {
    errored = false;
    try {
      const d = await api.codRiskDemo();
      packages = d.packages;
      sim = d.sim;
    } catch {
      packages = [];
      sim = null;
      errored = true;
      notify({ message: m.cr2t1(), type: "error", title: "Predictive COD" });
    }
    loaded = true;
  }

  /** Pesanan COD nyata dalam triase, diurutkan dari skor risiko tertinggi. */
  const realCod = $derived(codTriageOrders(orders));

  function reroute(o: Order) {
    shop.routeToPudo(o.id, COURIER.actor);
    notify({ message: m.cr4t1({ id: o.id }), type: "info", title: "Predictive COD" });
  }

  /** Ambang & tier dari satu sumber (logistics) — bukan hardcode. */
  const T_NORMAL = COD_THRESHOLDS.normal;
  const T_PUDO = COD_THRESHOLDS.pudo;

  const TIERS = [
    { key: "hijau", label: "Hijau · Cepat", color: "var(--color-chart-3)",
      crit: m.cr4t2({ score: numId(T_NORMAL, 2) }),
      action: "Antar normal." },
    { key: "kuning", label: "Kuning · Sedang", color: "var(--color-chart-2)",
      crit: `Skor ${numId(T_NORMAL, 2)}-${numId(T_PUDO, 2)}. Kadang belum siap, ekspektasi tunggu ≈ 6-10 menit.`,
      action: m.cr2t2() },
    { key: "merah", label: "Merah · Lambat", color: "var(--color-chart-5)",
      crit: m.cr4t3({ score: numId(T_PUDO, 2) }),
      action: m.cr2t3() }
  ];

  const counts = $derived(TIERS.map((t) => ({ ...t, n: packages.filter((p) => p.cluster === t.key).length })));
  const donut = $derived(counts.filter((c) => c.n > 0).map((c) => ({ name: c.label, value: c.n, color: c.color })));

  /** Warna badge klaster risiko (hijau/kuning/merah) — konsisten dgn tier. */
  const clusterTone: Record<string, string> = {
    hijau: "bg-success text-success-foreground",
    kuning: "bg-warning text-warning-foreground",
    merah: "bg-destructive text-destructive-foreground"
  };

  function sortedFactors(p: CodRiskPkg): CodFactor[] {
    return [...(p.factors ?? [])].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }
  function maxAbs(p: CodRiskPkg): number {
    const m = Math.max(0, ...(p.factors ?? []).map((f) => Math.abs(f.contribution)));
    return m || 1;
  }
  function toggleDetail(id: string) {
    openId = openId === id ? null : id;
    notify({ message: openId ? `Detail penjelasan ${id} dibuka` : `Detail ${id} ditutup`, type: "info", title: "Predictive COD" });
  }
  function openChat() {
    window.dispatchEvent(new CustomEvent("omnigistic-open-nigi-chat"));
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.cr01()}</h1>
    <span class="hub-label text-muted-foreground">{m.cr02()}</span>
  </div>

  <!-- Paket COD NYATA dari pesanan pembeli (dipenuhi lewat store bersama) -->
  <section class="rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p class="text-base font-semibold">{m.cr03()}</p>
        <p class="text-[13.5px] text-muted-foreground">{m.cr04()}</p>
      </div>
      <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">{m.cr05()}</a>
    </div>
    {#if realCod.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p class="text-sm font-semibold text-foreground">{m.cr06()}</p>
        <p class="mt-1 text-xs text-muted-foreground">{m.cr07()}</p>
      </div>
    {:else}
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-[13px] text-muted-foreground">
              <th scope="col" class="px-3 py-2">{m.cr08()}</th>
              <th scope="col" class="px-3 py-2">{m.cr09()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.cr10()}</th>
              <th scope="col" class="px-3 py-2 text-center">{m.cr11()}</th>
              <th scope="col" class="px-3 py-2">{m.cr12()}</th>
              <th scope="col" class="px-3 py-2">{m.cr13()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.cr14()}</th>
            </tr>
          </thead>
          <tbody>
            {#each realCod as o (o.id)}
              {@const score = o.codScore ?? 0}
              <tr class="border-b last:border-0">
                <td class="px-3 py-2 font-mono text-xs">{o.id}</td>
                <td class="px-3 py-2">{o.address.recipient} <span class="text-muted-foreground">· {o.address.city}</span></td>
                <td class="px-3 py-2 text-right tabular-nums">{formatRupiah(o.total)}</td>
                <td class="px-3 py-2 text-center">
                  <span class="inline-block w-16 rounded-full bg-muted px-2 py-0.5 text-[13px] font-semibold tabular-nums">{(score * 100).toFixed(0)}%</span>
                </td>
                <td class="px-3 py-2">
                  <span class="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold {codDecisionTone(o.codDecision)}">{COD_DECISION_LABEL[o.codDecision ?? ""] ?? o.codDecision ?? "-"}</span>
                </td>
                <td class="px-3 py-2 text-[13px] text-muted-foreground">{o.codCollected ? "Tunai diterima" : o.routedToPudo ? "Ke PUDO" : "Belum dibayar"}</td>
                <td class="px-3 py-2 text-right">
                  {#if !o.routedToPudo && score >= T_NORMAL}
                    <button type="button" onclick={() => reroute(o)} class="rounded-lg border border-warning/50 px-3 py-1.5 text-[13px] font-semibold text-warning-foreground transition-colors hover:bg-warning/10">{m.cr15()}</button>
                  {:else}
                    <span class="text-[13px] text-muted-foreground">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  {#if errored}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">{m.cr16()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.cr17()}</p>
      <button type="button" onclick={() => loadDemo()} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">{m.cr18()}</button>
    </div>
  {:else if loaded && sim && packages.length}
    <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
      <div class="flex items-start gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
          <GlitterIcon cls="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">{m.cr19()}</p>
          <ul class="mt-2 space-y-1.5 text-[15px] leading-relaxed text-foreground">
            <li>• <strong>{m.cr20()}</strong> {m.cr21()}</li>
            <li>{m.cr22()} <strong>{m.cr23()}</strong>{m.cr24()} <strong>{m.cr25()}</strong> {m.cr26()}</li>
            <li>{m.cr3f1()}{m.cr4t4({ n: packages.filter((p) => p.decision !== "antar-normal").length, total: packages.length })}{m.cr3f2()}</li>
          </ul>
          <button type="button" onclick={openChat} class="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px active:translate-y-0">
            {m.cr27()} <Icon name="arrow-up-right" cls="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>
      </div>
    </div>

    <section class="rounded-2xl border border-border bg-card p-5">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p class="text-base font-semibold">{m.cr28()}</p>
          <p class="text-[13.5px] text-muted-foreground">{m.cr29()}</p>
        </div>
        <span class="rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground">{m.cr4t5({ n: packages.length })}</span>
      </div>
      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div class="grid gap-3 sm:grid-cols-3">
          {#each counts as t (t.key)}
            <div class="rounded-xl border border-border bg-background/40 p-4" style="border-left: 5px solid {t.color}">
              <p class="text-sm font-semibold text-foreground">{t.label}</p>
              <p class="mt-1 text-[14px] leading-relaxed text-muted-foreground">{t.crit}</p>
              <p class="mt-2 text-[13.5px] font-semibold text-foreground">Aksi: {t.action}</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{t.n} <span class="text-sm font-medium text-muted-foreground">{m.cr30()}</span></p>
            </div>
          {/each}
        </div>
        <div class="rounded-xl border border-border p-2">
          {#if donut.length}
            <EChart option={donutChart(donut)} height={210} label="Distribusi klaster pelanggan COD" />
          {/if}
        </div>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-border bg-card p-4 text-center">
        <p class="text-[13.5px] text-muted-foreground">{m.cr31()}</p>
        <p class="kpi-value text-xl text-muted-foreground">{sim.currentTime} menit</p>
        <p class="text-[13.5px] text-muted-foreground">{sim.currentPerHour} {m.cr3f3()}</p>
      </div>
      <div class="rounded-2xl border border-primary/40 bg-card p-4 text-center">
        <p class="text-[13.5px] text-muted-foreground">{m.cr32()}</p>
        <p class="kpi-value text-xl text-primary">{sim.newTime} menit</p>
        <p class="text-[13.5px] text-muted-foreground">{sim.newPerHour} {m.cr3f3()}</p>
      </div>
      <div class="rounded-2xl border border-chart-2 bg-card p-4 text-center">
        <p class="text-[13.5px] text-muted-foreground">{m.cr33()}</p>
        <p class="kpi-value text-xl text-chart-2">+{sim.capacityGainPct}%</p>
        <p class="text-[13.5px] text-muted-foreground">{sim.packagesFreed} {m.cr3f4()}</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-base font-semibold">{m.cr34()}</p>
      <p class="mb-3 text-[13.5px] text-muted-foreground">{m.cr35()}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-[13px] text-muted-foreground">
              <th scope="col" class="px-3 py-2">{m.cr36()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.cr37()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.cr38()}</th>
              <th scope="col" class="px-3 py-2 text-center">{m.cr39()}</th>
              <th scope="col" class="px-3 py-2 text-center">{m.cr40()}</th>
              <th scope="col" class="px-3 py-2">{m.cr41()}</th>
              <th scope="col" class="px-3 py-2">{m.cr42()}</th>
              <th scope="col" class="px-3 py-2 text-right">{m.cr43()}</th>
            </tr>
          </thead>
          <tbody>
            {#each packages as p (p.id)}
              <tr class="border-b last:border-0">
                <td class="px-3 py-2 font-medium">{p.id}</td>
                <td class="px-3 py-2 text-right tabular-nums">{m.cr4t6({ value: p.value })}</td>
                <td class="px-3 py-2 text-right tabular-nums">{Math.round(p.hour)}.00</td>
                <td class="px-3 py-2 text-center">{p.ambiguous === 1 ? m.cr4t7() : m.cr4t8()}</td>
                <td class="px-3 py-2 text-center">
                  <span class="inline-block w-16 rounded-full bg-muted px-2 py-0.5 text-[13px] font-semibold tabular-nums">{(p.score * 100).toFixed(0)}%</span>
                </td>
                <td class="px-3 py-2"><span class="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold {clusterTone[p.cluster ?? 'kuning']}">{p.clusterLabel ?? "-"}</span></td>
                <td class="px-3 py-2"><span class="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold {codDecisionTone(p.decision)}">{p.decision}</span></td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    onclick={() => toggleDetail(p.id)}
                    aria-expanded={openId === p.id}
                    class="rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {openId === p.id ? m.cr2t4() : "Detail"}
                  </button>
                </td>
              </tr>
              {#if openId === p.id}
                <tr class="border-b last:border-0">
                  <td colspan="8" class="bg-muted/30 px-4 py-4">
                    <div class="grid gap-5 lg:grid-cols-2">
                      <div>
                        <p class="text-[13px] font-semibold uppercase tracking-wider text-primary">{m.cr44()}</p>
                        <ul class="mt-3 space-y-2.5">
                          {#each sortedFactors(p) as f (f.key)}
                            <li>
                              <div class="flex items-center justify-between text-[14.5px]">
                                <span class="text-foreground">{f.label} <span class="text-muted-foreground">= {f.value}</span></span>
                                <span class={f.contribution >= 0 ? "font-semibold text-destructive-foreground" : "font-semibold text-success-foreground"}>
                                  {f.contribution >= 0 ? "+" : ""}{numId(f.contribution, 2)}
                                </span>
                              </div>
                              <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                                <div class={f.contribution >= 0 ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-success"} style="width: {Math.min(100, (Math.abs(f.contribution) / maxAbs(p)) * 100)}%"></div>
                              </div>
                              <p class="mt-1 text-[12.5px] text-muted-foreground">koefisien {f.coef} · {f.contribution >= 0 ? "menaikkan" : "menurunkan"} risiko</p>
                            </li>
                          {/each}
                        </ul>
                      </div>
                      <div>
                        <p class="text-[13px] font-semibold uppercase tracking-wider text-primary">{m.cr45()}</p>
                        <div class="mt-3 space-y-1.5 text-[14.5px] text-muted-foreground">
                          <p>{m.cr46()} <span class="text-foreground">{p.model ?? "Logistic Regression"}</span>{p.accuracy != null ? ` · akurasi uji ${(p.accuracy * 100).toFixed(0)}%` : ""}</p>
                          <p>logit = intercept ({p.intercept != null ? numId(p.intercept, 2) : "-"}) + Σ (koef × fitur) = <span class="text-foreground">{p.logit != null ? numId(p.logit, 2) : "-"}</span></p>
                          <p>{m.cr47()} <span class="font-semibold text-foreground">{(p.score * 100).toFixed(0)}%</span></p>
                          <p>Ambang: &lt; {(T_NORMAL * 100).toFixed(0)}% antar-normal · {(T_NORMAL * 100).toFixed(0)}-{(T_PUDO * 100).toFixed(0)}% PUDO · ≥ {(T_PUDO * 100).toFixed(0)}% pre-payment.</p>
                        </div>
                        <div class="mt-3 rounded-lg bg-muted/50 p-3 text-[14.5px]">
                          <p>{m.cr48()} <strong class="text-foreground">{p.clusterLabel}</strong> {m.cr49()} <strong class="text-foreground">{p.pickupWaitMin} menit</strong></p>
                          <p class="mt-1 text-muted-foreground">{m.cr50()} <strong class="text-foreground">{p.decision}</strong> · {p.clusterAction}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if !errored}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
