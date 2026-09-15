<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "$lib/components/Icon.svelte";
  import { api, type Hub } from "$lib/api";
  import { notify } from "$lib/toast";

  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat ulang data hub…", type: "info", title: "Load Balancing" });
    try {
      hubs = await api.hubs();
      if (userTriggered) notify({ message: "Data hub dimuat ulang", type: "success", title: "Load Balancing" });
    } catch {
      hubs = [];
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat data hub", type: "error", title: "Load Balancing" });
    }
    loaded = true;
  }

  onMount(() => void load());

  // Simulasi pengalihan overflow Jakarta → hub penerima. Slider interaktif (0-40%).
  let overflowPct = $state(25);
  const jkt = $derived(hubs.find((h) => h.name === "Jakarta") ?? hubs[0]);
  const target = $derived(hubs.find((h) => h.name === "Bekasi-Karawang") ?? hubs[1]);

  const overflowM = $derived(jkt ? Math.round(jkt.capacityM * (overflowPct / 100) * 1000) / 1000 : 0);
  const jktAfter = $derived(jkt && jkt.capacityM ? Math.max(0, jkt.utilizationPct - (overflowM / jkt.capacityM) * 100).toFixed(1) : "0");
  const tgtAfter = $derived(target && target.capacityM ? Math.min(100, target.utilizationPct + (overflowM / target.capacityM) * 100).toFixed(1) : "0");
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">Load Balancing</h1>
  <p class="text-sm text-muted-foreground">Simulasi pengalihan overflow Double 12 2022 · geser untuk mengatur porsi overflow.</p>

  {#if loaded && jkt && target}
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium">Overflow dari Jakarta ({overflowPct}% · kasus Double 12)</p>
            <span class="kpi-value text-sm">{overflowM}M/day</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={overflowPct}
            oninput={(e) => (overflowPct = Number((e.currentTarget as HTMLInputElement).value))}
            onchange={(e) => notify({ message: `Overflow diatur ${(e.currentTarget as HTMLInputElement).value}%`, type: "info", title: "Load Balancing" })}
            aria-label="Persentase overflow dari Jakarta"
            class="mt-2 w-full accent-[var(--color-primary)]"
          />
          <div class="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full bg-primary transition-all" style="width: {(overflowPct / 40) * 100}%"></div>
          </div>
        </div>
        <div class="rounded-lg bg-muted p-4 text-sm">
          <p><span class="text-muted-foreground">Volume dialihkan:</span> <span class="kpi-value">{overflowM}M/day</span></p>
          <p class="mt-1"><span class="text-muted-foreground">Jakarta after:</span> <span class="kpi-value text-primary">{jktAfter}%</span> <span class="text-muted-foreground">(dari {jkt.utilizationPct}%)</span></p>
          <p class="mt-1"><span class="text-muted-foreground">{target.name} {target.utilizationPct}% →</span> <span class="kpi-value text-chart-3">{tgtAfter}%</span></p>
          {#if Number(tgtAfter) > 80}
            <p class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warning-foreground"><Icon name="warn" cls="h-3.5 w-3.5" /> Hub penerima mendekati kapasitas — pertimbangkan hub lain.</p>
          {/if}
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-card p-5">
        <p class="mb-3 text-sm font-medium">Kasus Nyata, Double 12 2022</p>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Hub Jakarta 1 dialihkan sebagian paket ke hub lain karena kapasitas penuh. Omnigistic mencegah pengalihan mendadak ini lewat forecast + kapasitas elastis.
        </p>
        <div class="mt-4 space-y-2">
          {#each hubs.filter((h) => h.name !== "Jakarta" && h.utilizationPct < 80).slice(0, 5) as h (h.name)}
            <div class="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span>{h.name} ({h.code})</span>
              <span class="kpi-value text-chart-3">{h.utilizationPct}%</span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat data hub</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Muat ulang setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Coba lagi</button>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Data hub tidak tersedia.</div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
