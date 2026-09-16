<script lang="ts">
  import { onMount } from "svelte";
  import { api, type Hub } from "$lib/api";
  import { cn } from "$lib/utils";
  import { notify } from "$lib/toast";

  let hubs = $state<Hub[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load(userTriggered = false) {
    failed = false;
    loaded = false;
    if (userTriggered) notify({ message: "Memuat ulang data kapasitas…", type: "info", title: "Capacity Alert" });
    try {
      hubs = await api.hubs();
      if (userTriggered) notify({ message: "Data kapasitas dimuat", type: "success", title: "Capacity Alert" });
    } catch {
      hubs = [];
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat data hub", type: "error", title: "Capacity Alert" });
    }
    loaded = true;
  }

  onMount(() => void load());

  const atRisk = $derived(hubs.filter((h) => h.utilizationPct > 65));
  const bdg = $derived(hubs.find((h) => h.name === "Bandung"));

  // Kontrol buffer 3 tingkat (simulasi): pengguna bisa mengaktifkan tingkat buffer.
  // Tingkat mengikuti Tabel 4: lembah 78M, normal 92,5M, puncak 105M+.
  type Tier = "lembah" | "normal" | "puncak";
  let tier = $state<Tier>("normal");
  const TIERS: Array<{ key: Tier; label: string; value: string; note: string }> = [
    { key: "lembah", label: "Lembah", value: "78M", note: "kontrak kurir inti" },
    { key: "normal", label: "Normal", value: "92,5M", note: "+ kurir musiman" },
    { key: "puncak", label: "Puncak", value: "105M+", note: "+15% buffer armada sewa" }
  ];
  // Buffer aktif otomatis bila ada hub >65% DAN tier minimal normal.
  const bufferActive = $derived(atRisk.length > 0 && tier !== "lembah");
  const coveredHubs = $derived(bufferActive ? atRisk.length : 0);

  function setTier(t: Tier) {
    tier = t;
    notify({
      message: `Buffer tingkat ${TIERS.find((x) => x.key === t)?.label} diaktifkan`,
      type: "info",
      title: "Capacity Alert"
    });
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Capacity Alert</h1>
    <span class="hub-label text-muted-foreground">Early warning &gt;65%</span>
  </div>

  {#if loaded && failed}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat data kapasitas hub</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline. Muat ulang setelah backend aktif.</p>
      <button type="button" onclick={() => load(true)} class="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Coba lagi</button>
    </div>
  {:else if loaded && bdg}
    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs text-muted-foreground">Hub Bandung, utilisasi</p>
      <p class="kpi-value text-3xl {bdg.utilizationPct > 65 ? 'text-destructive-foreground' : 'text-chart-3'}">{bdg.utilizationPct}%</p>
      <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div class="h-full {bdg.utilizationPct > 65 ? 'bg-destructive' : 'bg-chart-3'}" style="width: {bdg.utilizationPct}%"></div>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">{bdg.utilizationPct > 65 ? "Di atas ambang 65%, butuh perhatian" : "Dalam zona aman"}</p>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="mb-3 flex items-center justify-between">
        <p class="text-sm font-medium">Hub di atas ambang (&gt;65%)</p>
        <span class={cn("rounded-md px-3 py-1.5 text-xs font-semibold", bufferActive ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground")}>
          {bufferActive ? `Buffer kurir aktif · ${coveredHubs} hub tertutup` : "Buffer off"}
        </span>
      </div>
      <ul class="space-y-2">
        {#if atRisk.length === 0}
          <li class="text-sm text-muted-foreground">Tidak ada hub di atas ambang.</li>
        {/if}
        {#each atRisk as h (h.name)}
          <li class="flex items-center justify-between rounded-md bg-muted/50 px-4 py-2 text-sm">
            <span>{h.name} <span class="hub-label text-muted-foreground">· {h.code}</span></span>
            <span class="kpi-value text-destructive-foreground">{h.utilizationPct}%</span>
          </li>
        {/each}
      </ul>
    </div>

    <div>
      <p class="mb-2 text-sm font-medium">Kapasitas elastis 3 tingkat (simulasi)</p>
      <div class="grid gap-4 sm:grid-cols-3">
        {#each TIERS as t (t.key)}
          <button
            type="button"
            onclick={() => setTier(t.key)}
            aria-pressed={tier === t.key}
            class={cn(
              "rounded-2xl border bg-card p-4 text-left transition-colors",
              tier === t.key ? "border-primary/50 ring-1 ring-primary/30" : "hover:border-primary/30"
            )}
          >
            <p class="hub-label text-xs text-muted-foreground">{t.label}</p>
            <p class="kpi-value text-lg">{t.value}</p>
            <p class="text-xs text-muted-foreground">{t.note}</p>
            {#if tier === t.key}<p class="mt-1 text-[11px] font-semibold text-primary">● Aktif</p>{/if}
          </button>
        {/each}
      </div>
      <p class="mt-2 text-xs text-muted-foreground">
        Tingkat buffer menentukan kapasitas cadangan saat puncak. Buffer menutup {atRisk.length} hub yang melebihi ambang 65%.
      </p>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Data hub tidak tersedia.</div>
  {:else}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>