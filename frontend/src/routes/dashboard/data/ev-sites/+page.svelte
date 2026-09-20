<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import GlitterIcon from "$lib/components/ui/GlitterIcon.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { lineChart } from "$lib/charts/options";
  import { api, type Hub } from "$lib/api";
  import { notify } from "$lib/toast";
  import { numId } from "$lib/utils";

  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  // Kontrol simulasi
  let depreciationYears = $state(8); // umur ekonomis kendaraan fosil
  let evTarget = $state(200); // target EV (kasus: >200 unit akhir 2026)

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: m.ev2t1(), type: "info", title: "EV Sites" });
    try {
      hubs = await api.hubs();
      evTarget = (await api.metricFleet()).evTarget;
      if (userTriggered) notify({ message: "Data dimuat", type: "success", title: "EV Sites" });
    } catch {
      hubs = [];
      failed = true;
      if (userTriggered) notify({ message: m.ev2t2(), type: "error", title: "EV Sites" });
    }
    loaded = true;
  }

  onMount(() => void load());

  // Koridor prioritas DITURUNKAN dari utilisasi hub nyata (Table 1), bukan hardcode.
  const CORRIDOR_PAIRS: Array<[string, string]> = [
    ["Jakarta", "Bandung"],
    ["Surabaya", "Bekasi-Karawang"],
    ["Semarang", "Solo"],
    ["Medan", "Pekanbaru"],
    ["Makassar", "Balikpapan"],
    ["Denpasar", "Mataram"]
  ];

  const corridors = $derived(
    CORRIDOR_PAIRS.map(([from, to]) => {
      const a = hubs.find((h) => h.name === from);
      const b = hubs.find((h) => h.name === to);
      if (!a || !b) return null;
      const util = Math.round(((a.utilizationPct + b.utilizationPct) / 2) * 10) / 10;
      const volume = Math.round(a.capacityM * (a.utilizationPct / 100) * 100 * 10) / 10; // indeks relatif harian
      // Skor = 60% utilisasi + 40% volume relatif (dinormalisasi terhadap max).
      return { from, to, util, volume, detail: `${a.region} · hub ${a.code}/${b.code}` };
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  );

  const maxVolume = $derived(Math.max(1, ...corridors.map((c) => c.volume)));
  const scored = $derived(
    corridors
      .map((c) => ({ ...c, score: Math.round(0.6 * Math.min(100, c.util) + 0.4 * (c.volume / maxVolume) * 100) }))
      .sort((x, y) => y.score - x.score)
  );

  const scoreColor = (s: number) => (s >= 80 ? "bg-success text-success-foreground" : s >= 60 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground");

  // Kurva transformasi EV: setiap tahun sebagian armada fosil diganti mengikuti penyusutan.
  const turnoverPct = $derived(100 / depreciationYears);
  const curve = $derived(
    Array.from({ length: 10 }, (_, i) => {
      const y = i + 1;
      const cleanPct = Math.round((1 - Math.pow(1 - turnoverPct / 100, y)) * 1000) / 10;
      return { year: `Th ${y}`, cleanPct };
    })
  );
  const fleetAt10 = $derived(curve[curve.length - 1]?.cleanPct ?? 0);
  const yearsToTarget = $derived.by(() => {
    // Perkiraan tahun saat armada bersih kumulatif mencapai porsi setara target EV.
    const targetShare = (evTarget / 14180) * 100;
    let acc = 0;
    let y = 0;
    while (acc < targetShare && y < 80) {
      y += 1;
      acc = (1 - Math.pow(1 - turnoverPct / 100, y)) * 100;
    }
    return y;
  });

  const curveChart = $derived(
    lineChart(curve.map((c) => c.year), [{ name: m.ev2t3(), data: curve.map((c) => c.cleanPct), color: "var(--color-primary)", area: true }])
  );
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">{m.es01()}</h1>
      <p class="text-sm text-muted-foreground">{m.es02()}</p>
    </div>
    <span class="hub-label text-muted-foreground">{m.es03()}</span>
  </div>

  {#if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">{m.es04()}</p>
      <p class="mt-1 text-xs text-muted-foreground">{m.es05()}</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-[var(--primary-foreground)]">{m.es06()}</button>
    </div>
  {:else if loaded}
    <div class="grid gap-4 sm:grid-cols-3">
      <MetricCard label={m.ev2t4()} value={`${evTarget} unit`} sub={m.ev2t5()} accent />
      <MetricCard label="Koridor Diprioritaskan" value={`${scored.length}`} sub={m.ev2t6()} />
      <MetricCard label={m.ev2t7()} value={m.es3t2({ years: yearsToTarget })} sub={m.es3t1({ pct: numId((evTarget / 14180) * 100, 2) })} />
    </div>

    <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
      <div class="flex items-start gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]"><GlitterIcon cls="h-5 w-5" /></span>
        <div class="min-w-0">
          <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">{m.es07()}</p>
          <p class="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
            {m.es08()}
          </p>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-3 text-sm font-medium">{m.es09()}</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th scope="col" class="px-4 py-2">{m.es10()}</th>
              <th scope="col" class="px-4 py-2 text-right">{m.es11()}</th>
              <th scope="col" class="px-4 py-2 text-right">{m.es12()}</th>
              <th scope="col" class="px-4 py-2 text-right">{m.es13()}</th>
            </tr>
          </thead>
          <tbody>
            {#each scored as c (c.from + c.to)}
              <tr class="border-b last:border-0">
                <td class="px-4 py-2"><p class="font-medium">{c.from} → {c.to}</p><p class="text-xs text-muted-foreground">{c.detail}</p></td>
                <td class="px-4 py-2 text-right tabular-nums">{c.util}%</td>
                <td class="px-4 py-2 text-right tabular-nums">{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(c.volume)}M</td>
                <td class="px-4 py-2 text-right"><span class={"rounded-md px-2 py-0.5 text-sm font-bold " + scoreColor(c.score)}>{c.score}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-[13px] italic text-muted-foreground">{m.es14()}</p>
    </div>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-1 text-sm font-medium">Kebijakan penyusutan {depreciationYears} {m.es3f1()}</p>
      <p class="mb-3 text-sm text-muted-foreground">{m.es3f2()} {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(turnoverPct)}%/th.</p>

      <label class="block max-w-sm">
        <span class="flex items-center justify-between text-sm font-medium"><span>{m.es15()}</span><span class="kpi-value text-primary">{depreciationYears} thn</span></span>
        <input type="range" min="4" max="12" step="1" value={depreciationYears} oninput={(e) => (depreciationYears = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => notify({ message: `Umur ekonomis ${depreciationYears} tahun`, type: "info", title: "EV Sites" })} aria-label="Umur ekonomis kendaraan" class="mt-2 w-full accent-[var(--color-primary)]" />
      </label>
      <label class="block mt-4 max-w-sm">
        <span class="flex items-center justify-between text-sm font-medium"><span>{m.es16()}</span><span class="kpi-value text-primary">{evTarget} unit</span></span>
        <input type="range" min="50" max="500" step="25" value={evTarget} oninput={(e) => (evTarget = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => notify({ message: `Target EV ${evTarget} unit`, type: "info", title: "EV Sites" })} aria-label={m.ax14()} class="mt-2 w-full accent-[var(--color-primary)]" />
      </label>

      <div class="mt-4">
        <EChart option={curveChart} height={260} label={m.ev2t8()} />
      </div>
      <p class="mt-2 text-xs text-muted-foreground">{m.es3f3()} {fleetAt10}{m.es3f4()} {evTarget} unit ≈ {numId((evTarget / 14180) * 100, 2)}{m.es3f5()}{yearsToTarget} {m.es3f6()}</p>
    </div>
  {:else}
    <div class="h-72 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
