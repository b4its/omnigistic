<script lang="ts">
  import { onMount } from "svelte";
  import MetricCard from "$lib/components/MetricCard.svelte";
  import { api, type DemandSummary } from "$lib/api";
  import { notify } from "$lib/toast";

  // Angka kasus (2023): 5,5 komplain per juta paket (dari narasi studi kasus).
  const RATE_2023 = 5.5;
  const TARGET_RATE = 3.0; // target Omnigistic: <3/juta

  let demand = $state<DemandSummary | null>(null);
  let loaded = $state(false);
  let failed = $state(false);

  // Simulasi: pengurangan komplain dari Address Intelligence (geotag + fuzzy match).
  let geotagCoverage = $state(60); // % alamat ter-geotag presisi
  let rootCoverage = $state(70); // % alamat ambigu yang diselesaikan di hulu

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat ulang metrik komplain…", type: "info", title: "Complaint Monitor" });
    try {
      demand = await api.metricDemand();
      if (userTriggered) notify({ message: "Metrik dimuat", type: "success", title: "Complaint Monitor" });
    } catch {
      demand = null;
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat metrik", type: "error", title: "Complaint Monitor" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const totalVolumeM = $derived(demand?.totalM ?? 1110);
  const baselineCases = $derived(Math.round(totalVolumeM * RATE_2023));

  // Model simulasi: komplain turun sebanding cakupan solusi hulu.
  // Asumsi: alamat ambigu penyebab utama (~2/3 komplain alamat-terkait).
  const projectedRate = $derived.by(() => {
    const alleviated = (geotagCoverage / 100) * (rootCoverage / 100);
    const reduction = 0.55 * alleviated; // maks 55% komplain hilang bila cakupan penuh
    return Math.max(0, RATE_2023 * (1 - reduction));
  });
  const projectedCases = $derived(Math.round(totalVolumeM * projectedRate));
  const casesAvoided = $derived(baselineCases - projectedCases);
  const targetReached = $derived(projectedRate < TARGET_RATE);

  const fmtInt = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));
  const fmtRate = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Complaint Monitor</h1>
    <span class="hub-label text-muted-foreground">Jawaban Pertanyaan 6</span>
  </div>

  {#if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat metrik komplain</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Muat ulang setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-xs font-semibold text-white">Coba lagi</button>
    </div>
  {:else if loaded}
    <div class="grid gap-4 sm:grid-cols-3">
      <MetricCard label="Komplain (2023)" value={`${fmtRate(RATE_2023)}/juta`} sub="baseline studi kasus" />
      <MetricCard label="Kasus Absolut (2023)" value={fmtInt(baselineCases)} sub={`dari ${fmtInt(totalVolumeM)} jt paket`} />
      <MetricCard label="Target Omnigistic" value="< 3/juta" sub="turun ~46% dari baseline" accent />
    </div>

    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-base font-semibold">Simulasi penurunan komplain</p>
      <p class="text-[13.5px] text-muted-foreground">
        Address Intelligence memperbaiki komplain di hulu (geotag presisi + penyelesaian alamat ambigu saat checkout). Atur cakupan untuk melihat proyeksi.
      </p>
      <div class="mt-4 grid gap-5 sm:grid-cols-2">
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>Cakupan geotag presisi</span><span class="kpi-value text-primary">{geotagCoverage}%</span></span>
          <input type="range" min="0" max="100" step="5" value={geotagCoverage} oninput={(e) => (geotagCoverage = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => notify({ message: `Cakupan geotag ${geotagCoverage}%`, type: "info", title: "Complaint Monitor" })} aria-label="Cakupan geotag presisi" class="mt-2 w-full accent-[var(--color-primary)]" />
        </label>
        <label class="block">
          <span class="flex items-center justify-between text-sm font-medium"><span>Alamat ambigu terselesaikan di hulu</span><span class="kpi-value text-primary">{rootCoverage}%</span></span>
          <input type="range" min="0" max="100" step="5" value={rootCoverage} oninput={(e) => (rootCoverage = Number((e.currentTarget as HTMLInputElement).value))} onchange={() => notify({ message: `Solusi hulu ${rootCoverage}%`, type: "info", title: "Complaint Monitor" })} aria-label="Cakupan solusi hulu" class="mt-2 w-full accent-[var(--color-primary)]" />
        </label>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border bg-background/40 p-4 text-center">
          <p class="text-xs text-muted-foreground">Komplain proyeksi</p>
          <p class="kpi-value text-2xl {targetReached ? 'text-success-foreground' : 'text-destructive-foreground'}">{fmtRate(projectedRate)}<span class="text-sm text-muted-foreground">/juta</span></p>
        </div>
        <div class="rounded-xl border bg-background/40 p-4 text-center">
          <p class="text-xs text-muted-foreground">Kasus terhindar / thn</p>
          <p class="kpi-value text-2xl text-primary">{fmtInt(casesAvoided)}</p>
        </div>
        <div class="rounded-xl border bg-background/40 p-4 text-center">
          <p class="text-xs text-muted-foreground">Status target (&lt;3/juta)</p>
          <p class="kpi-value text-2xl {targetReached ? 'text-success-foreground' : 'text-muted-foreground'}">{targetReached ? "Tercapai" : "Belum"}</p>
        </div>
      </div>
    </section>

    <div class="rounded-2xl border bg-card p-5">
      <p class="mb-2 text-sm font-medium">Penyebab utama (akar → solusi)</p>
      <ul class="space-y-2 text-sm text-muted-foreground">
        <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)]"></span><span><span class="font-medium text-foreground">Alamat tidak terstandarisasi</span> → Address Intelligence + geotag wajib saat checkout.</span></li>
        <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)]"></span><span><span class="font-medium text-foreground">Routing error (alamat ambigu)</span> → fuzzy matching + 3 kandidat koordinat terskor.</span></li>
        <li class="flex gap-2"><span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)]"></span><span><span class="font-medium text-foreground">Delivery failure (geotag tidak akurat)</span> → konfirmasi slot + ETA presisi.</span></li>
      </ul>
    </div>

    <div class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm">
      <span class="font-medium">Dampak:</span> ~{fmtInt(baselineCases)} kasus/tahun, kecil secara rasio, signifikan dalam absolut (dari {fmtInt(totalVolumeM)} jt paket).
      Menyelesaikannya di hulu mencegah biaya berulang di sortasi + pengantaran ulang. Proyeksi ini <span class="font-medium">simulasi asumsi tim</span>; angka 5,5/juta & target &lt;3/juta dari studi kasus.
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-3">{#each Array(3) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}</div>
    <div class="h-56 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
