<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { barChart } from "$lib/charts/options";
  import { api, type SponsorResult, type SponsorSensitivity } from "$lib/api";
  import { notify } from "$lib/toast";
  import { numId } from "$lib/utils";

  let res = $state<SponsorResult | null>(null);
  let sens = $state<SponsorSensitivity | null>(null);
  let loaded = $state(false);
  let failed = $state(false);
  let busy = $state(false);

  // Parameter interaktif (Digital Twin nyata)
  let hqEquity = $state(30);   // %
  let fixedShare = $state(45); // %
  let localMargin = $state(14); // %

  async function recompute() {
    if (!res) return;
    busy = true;
    try {
      res = await api.sponsorCompare({ hq_equity: hqEquity / 100, fixed_share: fixedShare / 100, local_margin: localMargin / 100 });
    } catch {
      notify({ message: "Gagal menghitung ulang komparasi", type: "error", title: "Digital Twin" });
    }
    busy = false;
  }

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat komparator model…", type: "info", title: "Digital Twin" });
    try {
      [res, sens] = await Promise.all([api.sponsorCompare(), api.sponsorSensitivity()]);
      if (res) {
        hqEquity = Math.round(res.assumptions.hqEquity * 100);
        fixedShare = Math.round(res.assumptions.fixedShare * 100);
        localMargin = Math.round(res.assumptions.localMargin * 100);
      }
      if (userTriggered) notify({ message: "Komparator dimuat", type: "success", title: "Digital Twin" });
    } catch {
      res = null;
      sens = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat komparator", type: "error", title: "Digital Twin" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const rp = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(Math.round(n));
  const rpShort = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e12) return `Rp${numId(n / 1e12, 1)}T`;
    if (abs >= 1e9) return `Rp${numId(n / 1e9, 1)}M`;
    if (abs >= 1e6) return `Rp${numId(n / 1e6, 1)}jt`;
    return rp(n);
  };

  // Grafik: exposure capex Direct vs Sponsor per region.
  const capexChart = $derived(
    res
      ? barChart(
          res.regions.map((r) => r.region.replace(" & Nusa Tenggara", "")),
          [
            { name: "Direct (Rp/juta)", data: res.regions.map((r) => Math.round(r.direct.capexExposurePerDayIdr / 1e6)), color: "var(--color-muted-foreground)" },
            { name: "Sponsor (Rp/juta)", data: res.regions.map((r) => Math.round(r.sponsor.capexExposurePerDayIdr / 1e6)), color: "var(--color-primary)" }
          ],
          { rotate: 20 }
        )
      : null
  );

  // Grafik sensitivitas: jumlah region sponsor vs porsi ekuitas HQ.
  const sensChart = $derived(
    sens
      ? barChart(
          sens.sweep.map((s) => `${Math.round(s.hqEquity * 100)}%`),
          [{ name: "Region Sponsor", data: sens.sweep.map((s) => s.recommendSponsor), color: "var(--color-primary)" }],
          { hideLegend: true, maxBarWidth: 40 }
        )
      : null
  );

  const tone: Record<string, string> = {
    "Sponsor penuh": "bg-primary/10 text-primary",
    "Sponsor bertahap": "bg-warning/15 text-warning-foreground",
    "Direct (pertahankan)": "bg-muted text-muted-foreground"
  };
</script>

<div class="space-y-6">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="font-heading text-xl font-semibold tracking-tight">Digital Twin — Direct vs Regional Sponsor</h1>
      <p class="text-sm text-muted-foreground">
        Komparator ekonomi per region dari angka kasus (Tabel 3 & 4). Atur parameter untuk menguji skenario. Menjawab Pertanyaan 1.
      </p>
    </div>
    <span class="hub-label text-muted-foreground">Interaktif</span>
  </div>

  {#if loaded && res}
    <!-- Basis & ringkasan -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Unit Cost Nasional" value={rp(res.nationalBasis.unitCostIdr)} sub={`basis ${res.nationalBasis.totalCostT}T ÷ ${res.nationalBasis.parcelsM} jt paket`} accent />
      <MetricCard label="Rekomendasi Sponsor" value={`${res.summary.recommendSponsor} region`} sub={res.summary.sponsorRegions.join(", ") || "—"} />
      <MetricCard label="Pertahankan Direct" value={`${res.summary.recommendDirect} region`} sub={res.summary.directRegions.join(", ") || "—"} />
      <MetricCard label="Penghematan Capex" value={rpShort(res.summary.totalCapexSavingPerDayIdr)} sub="per hari pada region sponsor" />
    </div>

    <!-- Kontrol parameter -->
    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-base font-semibold">Parameter model (asumsi tim)</p>
      <p class="text-[13.5px] text-muted-foreground">Geser untuk melihat bagaimana rekomendasi berubah. Angka kasus tetap; parameter ini asumsi yang dapat diuji.</p>
      <div class="mt-4 grid gap-5 sm:grid-cols-3">
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>Ekuitas HQ di sponsor</span><span class="kpi-value text-primary">{hqEquity}%</span></span>
          <input type="range" min="10" max="90" step="5" value={hqEquity} oninput={(e) => (hqEquity = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Porsi ekuitas HQ" class="mt-2 w-full accent-[var(--color-primary)]" />
          <span class="text-xs text-muted-foreground">Makin tinggi → kontrol HQ makin besar</span>
        </label>
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>Porsi biaya tetap bergeser</span><span class="kpi-value text-primary">{fixedShare}%</span></span>
          <input type="range" min="20" max="80" step="5" value={fixedShare} oninput={(e) => (fixedShare = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Porsi biaya tetap bergeser ke mitra" class="mt-2 w-full accent-[var(--color-primary)]" />
          <span class="text-xs text-muted-foreground">Capex yang ditanggung mitra, bukan HQ</span>
        </label>
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>Margin operasional lokal</span><span class="kpi-value text-primary">{localMargin}%</span></span>
          <input type="range" min="5" max="30" step="1" value={localMargin} oninput={(e) => (localMargin = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => void recompute()} aria-label="Margin operasional lokal" class="mt-2 w-full accent-[var(--color-primary)]" />
          <span class="text-xs text-muted-foreground">Efisiensi mitra lokal yang lebih paham pasar</span>
        </label>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-2" class:opacity-60={busy}>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Exposure capex: Direct vs Sponsor (Rp juta/hari)</p>
        {#if capexChart}<EChart option={capexChart} height={300} label="Exposure capex Direct vs Sponsor per region" />{/if}
      </div>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Sensitivitas: region sponsor vs ekuitas HQ</p>
        {#if sensChart}<EChart option={sensChart} height={300} label="Jumlah region sponsor terhadap porsi ekuitas HQ" />{/if}
        <p class="mt-2 text-xs text-muted-foreground">
          Semakin HQ mempertahankan ekuitas, semakin sedikit region yang layak jadi sponsor penuh (trade-off kontrol vs penghematan).
        </p>
      </div>
    </div>

    <!-- Tabel perbandingan per region -->
    <div class="overflow-x-auto rounded-2xl border border-border bg-card">
      <table class="w-full min-w-[860px] text-sm">
        <caption class="sr-only">Perbandingan model Direct vs Sponsor per region</caption>
        <thead class="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th class="px-4 py-2.5 text-left font-medium">Region</th>
            <th class="px-4 py-2.5 text-right font-medium">Util</th>
            <th class="px-4 py-2.5 text-right font-medium">Cost/paket</th>
            <th class="px-4 py-2.5 text-right font-medium">Laba Direct</th>
            <th class="px-4 py-2.5 text-right font-medium">Laba HQ (Sponsor)</th>
            <th class="px-4 py-2.5 text-right font-medium">Hemat Capex</th>
            <th class="px-4 py-2.5 text-right font-medium">Δ Kontrol</th>
            <th class="px-4 py-2.5 text-left font-medium">Rekomendasi</th>
          </tr>
        </thead>
        <tbody>
          {#each res.regions as r (r.region)}
            <tr class="border-t border-border/60">
              <td class="px-4 py-2 font-medium">{r.region}</td>
              <td class="px-4 py-2 text-right tabular-nums">{r.avgUtilizationPct}%</td>
              <td class="px-4 py-2 text-right tabular-nums">{rp(r.unitCostIdr)}</td>
              <td class="px-4 py-2 text-right tabular-nums">{rpShort(r.direct.profitPerDayIdr)}</td>
              <td class="px-4 py-2 text-right tabular-nums">{rpShort(r.sponsor.profitPerDayIdr)}</td>
              <td class="px-4 py-2 text-right tabular-nums text-primary">{rpShort(r.delta.capexSavingPerDayIdr)}</td>
              <td class="px-4 py-2 text-right tabular-nums text-muted-foreground">−{r.delta.controlLossPts}</td>
              <td class="px-4 py-2">
                <span class="inline-block rounded-md px-2 py-0.5 text-[12.5px] font-semibold {tone[r.recommendation] ?? 'bg-muted'}">{r.recommendation}</span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="rounded-2xl border-l-4 border-chart-3 bg-muted/30 p-4 text-sm">
      <span class="font-medium">Kesimpulan:</span> bukan "beralih total", tapi <strong>hibrida</strong>. Region padat (Java, util ≥65%) pertahankan Direct karena skala ekonomi;
      kandidat sponsor = region berutilisasi rendah di mana biaya tetap per-paket mahal. Sponsor menukar sebagian laba & kontrol dengan <strong>pengurangan exposure capex</strong> dan risiko bersama mitra lokal.
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <Icon name="warn" cls="mx-auto h-6 w-6" />
      <p class="mt-2 text-sm font-semibold text-foreground">Gagal memuat komparator</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Coba lagi setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Coba lagi</button>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-4">{#each Array(4) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}</div>
    <div class="h-72 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
