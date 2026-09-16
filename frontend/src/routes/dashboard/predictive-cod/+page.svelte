<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { donutChart } from "$lib/charts/options";
  import { roleFromPath, type Role } from "$lib/stores/role";
  import { computeReputation, BUYER_PERSONAS, COD_MIN_SCORE, type Reputation } from "$lib/shop/reputation";
  import { CUSTOMERS } from "$lib/shop/seller";

  let { data }: { data?: { cookieRole?: string | null } } = $props();

  const pathname = $derived(String(page.url.pathname));
  const role = $derived<Role | null>(roleFromPath(pathname) ?? (((data?.cookieRole ?? "").toUpperCase() as Role) || null));

  // Predictive COD hanya untuk role internal — pembeli diblokir.
  const allowed = $derived(role !== "CUSTOMER");

  /** Semua pembeli yang diprediksi (persona demo + basis pelanggan penjual). */
  const buyers = $derived<Reputation[]>([
    ...BUYER_PERSONAS.map(computeReputation),
    ...CUSTOMERS.map((c) =>
      computeReputation({
        id: c.id,
        name: c.name,
        city: c.city,
        failedRate: c.failedRate,
        onTimeRate: 1 - c.failedRate * 0.7,
        accountMonths: Math.max(1, c.orders),
        successOrders: c.orders
      })
    )
  ]);

  const allowedCount = $derived(buyers.filter((b) => b.codAllowed).length);
  const blockedCount = $derived(buyers.length - allowedCount);

  const donut = $derived(
    donutChart([
      { name: "COD tersedia", value: allowedCount, color: "var(--color-chart-1)" },
      { name: "COD diblokir", value: blockedCount, color: "var(--color-chart-5)" }
    ])
  );

  const tone: Record<Reputation["tier"], string> = {
    baik: "bg-success/15 text-success-foreground",
    buruk: "bg-destructive/15 text-destructive-foreground"
  };

  let mounted = $state(false);
  onMount(() => (mounted = true));
</script>

{#if !mounted}
  <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
{:else if !allowed}
  <!-- Pembeli tidak boleh melihat skor prediktif pelanggan lain -->
  <div class="mx-auto max-w-lg space-y-5 py-12 text-center">
    <span class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="shield" cls="h-8 w-8" /></span>
    <h1 class="font-heading text-xl font-semibold text-foreground">Halaman internal</h1>
    <p class="text-sm text-muted-foreground">
      Prediksi <strong class="font-semibold text-foreground">Predictive COD</strong> hanya tersedia untuk tim internal
      (Pusat, Hub, Kurir, Data, Penjual). Sebagai pembeli, kamu hanya melihat status COD di akunmu.
    </p>
    <a href={resolveHref("/dashboard/customer/overview")} class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px">
      <Icon name="arrow-left" cls="h-4 w-4" /> Kembali ke toko
    </a>
  </div>
{:else}
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="font-heading text-xl font-semibold tracking-tight">Predictive COD</h1>
        <p class="text-sm text-muted-foreground">Prediksi kelayakan COD tiap pembeli dari reputasi. Hanya untuk tim internal.</p>
      </div>
      <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        <Icon name="shield" cls="h-3.5 w-3.5" /> Ambang COD: skor ≥ {COD_MIN_SCORE}
      </span>
    </header>

    <!-- Ringkasan -->
    <section class="grid gap-5 sm:grid-cols-[220px_1fr]">
      <div class="flex items-center justify-center rounded-2xl border border-border bg-card p-5">
        <EChart option={donut} height={180} class="w-full" label="Donat kelayakan COD pembeli" />
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-medium text-muted-foreground">Total pembeli diprediksi</p>
          <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{buyers.length}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-medium text-muted-foreground">COD tersedia</p>
          <p class="mt-2 text-2xl font-bold tabular-nums text-success-foreground">{allowedCount}</p>
        </div>
        <div class="rounded-2xl border border-border bg-card p-5">
          <p class="text-xs font-medium text-muted-foreground">COD diblokir</p>
          <p class="mt-2 text-2xl font-bold tabular-nums text-destructive-foreground">{blockedCount}</p>
        </div>
      </div>
    </section>

    <!-- Daftar pembeli -->
    <section class="space-y-3">
      <h2 class="text-sm font-semibold text-muted-foreground">Prediksi per pembeli</h2>
      <ul class="space-y-3">
        {#each buyers as b (b.profile.id)}
          <li class="rounded-2xl border border-border bg-card p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div class="flex flex-1 items-center gap-4">
                <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style="background:color-mix(in srgb, {b.codAllowed ? 'var(--color-chart-1)' : 'var(--color-chart-5)'} 16%, var(--color-card))">
                  <span class="text-lg font-bold" style="color:{b.codAllowed ? 'var(--color-chart-1)' : 'var(--color-chart-5)'}">{b.score.toFixed(0)}</span>
                </div>
                <div class="min-w-0">
                  <p class="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {b.profile.name}
                    <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold {tone[b.tier]}">{b.tier === "baik" ? "Reputasi baik" : "Reputasi buruk"}</span>
                  </p>
                  <p class="text-xs text-muted-foreground">{b.profile.city} · gagal antar {(b.profile.failedRate * 100).toFixed(0)}% · tepat waktu {(b.profile.onTimeRate * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold {b.codAllowed ? 'bg-success/15 text-success-foreground' : 'bg-destructive/15 text-destructive-foreground'}">
                  <Icon name={b.codAllowed ? "check" : "x"} cls="h-3.5 w-3.5" weight="bold" />
                  {b.codAllowed ? "COD tersedia" : "COD diblokir"}
                </span>
              </div>
            </div>
            <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full" style="width:{b.score}%;background:{b.codAllowed ? 'var(--color-chart-1)' : 'var(--color-chart-5)'}"></div>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  </div>
{/if}
