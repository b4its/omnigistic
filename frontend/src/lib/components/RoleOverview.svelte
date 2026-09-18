<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { api, type Insights } from "$lib/api";
  import { greetingByTime, cn, priorityCls } from "$lib/utils";
  import { notify } from "$lib/toast";
  import GlitterIcon from "./ui/GlitterIcon.svelte";
  import MetricCard from "./MetricCard.svelte";

  interface Kpi { label: string; value: string; sub?: string; accent?: string; spark?: number[] }

  let {
    role = "PUSAT",
    kpi = [] as Kpi[],
    greeting = "",
    insights = [] as Insights["insights"],
    chart
  }: {
    role?: string;
    kpi?: Kpi[];
    greeting?: string;
    insights?: Insights["insights"];
    chart?: import("svelte").Snippet;
  } = $props();

  const roleName: Record<string, string> = { PUSAT: "Dalila", HUB: "Marwah", KURIR: "Baits", DATA: "Virgiawan", CUSTOMER: "Sari", SELLER: "Rina" };
  const priorityIcon: Record<string, string> = { high: "!", medium: "\u2191", low: "\u2022" };

  let ins = $state<Insights["insights"]>(untrack(() => insights));
  let grt = $state(untrack(() => greeting));
  /** true setelah percobaan fetch selesai (agar bisa bedakan loading vs gagal). */
  let settled = $state(false);
  let failed = $state(false);

  async function load(userTriggered = false) {
    failed = false;
    settled = false;
    if (userTriggered) notify({ message: "Memuat ulang insight Nigi AI…", type: "info", title: "Insight" });
    try {
      const data = await api.insights(role);
      if (Array.isArray(data.insights)) ins = data.insights;
      if (data.greeting) grt = data.greeting;
      if (userTriggered) notify({ message: "Insight dimuat ulang", type: "success", title: "Insight" });
    } catch {
      failed = true;
      if (userTriggered) notify({ message: "Gagal memuat insight Nigi AI", type: "error", title: "Insight" });
    }
    settled = true;
  }

  onMount(() => {
    if (!greeting && !insights.length) void load();
    else settled = true;
  });

  function openChat() {
    window.dispatchEvent(new CustomEvent("omnigistic-open-nigi-chat"));
  }
</script>

<div class="space-y-5">
  <h1 class="sr-only">Portal {role} — Omnigistic</h1>
  <div class="flex items-center gap-3 overflow-hidden rounded-2xl border border-border p-5 [background:var(--banner-bg)] text-[color:var(--banner-fg)] shadow-sm">
    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/10">
      <GlitterIcon cls="h-5 w-5" />
    </span>
    <div class="min-w-0">
      <p class="flex items-center gap-1.5 text-[14px] font-medium uppercase tracking-wide opacity-90">
        <GlitterIcon cls="h-3 w-3" />
        {greetingByTime(roleName[role] ?? "")} · Nigi AI
      </p>
      <p class="mt-1 text-sm font-semibold leading-snug sm:text-base">{grt}</p>
    </div>
    <button type="button" onclick={openChat} class="ml-auto shrink-0 rounded-full bg-black/10 px-3.5 py-2 text-xs font-semibold text-[color:var(--banner-fg)] transition-colors hover:bg-black/15 active:scale-[0.98]">
      Buka chat
    </button>
  </div>

  {#if kpi.length > 0}
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {#each kpi as k (k.label)}
        <MetricCard label={k.label} value={k.value} sub={k.sub} valueColor={k.accent} spark={k.spark} />
      {/each}
    </div>
  {/if}

  {#if chart}
    <div class="rounded-2xl border border-border bg-card p-4">
      <div>{@render chart()}</div>
    </div>
  {/if}

  {#if ins.length > 0}
    <div class="grid gap-3 lg:grid-cols-3">
      {#each ins as item, i (item.title)}
        <div class="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-center gap-2">
            <span class={cn("flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold", priorityCls[item.priority] ?? "bg-muted text-muted-foreground")}>
              {priorityIcon[item.priority] ?? "\u2022"}
            </span>
            <p class="text-[13.5px] uppercase tracking-wide text-muted-foreground">Insight {i + 1}</p>
          </div>
          <p class="mt-3 text-base font-semibold tracking-tight text-foreground">{item.title}</p>
          <p class="mt-1.5 text-[15.5px] leading-relaxed text-muted-foreground">{item.message}</p>
        </div>
      {/each}
    </div>
  {:else if settled && failed}
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
      <div>
        <p class="text-sm font-semibold text-foreground">Insight Nigi AI tidak tersedia</p>
        <p class="mt-0.5 text-xs text-muted-foreground">Backend tampaknya offline. Kartu KPI &amp; grafik tetap tampil dari data lokal.</p>
      </div>
      <button type="button" onclick={() => load(true)} class="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Coba lagi</button>
    </div>
  {:else if !settled}
    <div class="grid gap-3 lg:grid-cols-3">
      {#each Array(3) as _, i (i)}<div class="h-28 animate-pulse rounded-2xl border border-border bg-card/60"></div>{/each}
    </div>
  {/if}



  <div class="rounded-2xl border border-border bg-card p-4 text-[15.5px] leading-relaxed text-muted-foreground">
    <span class="font-medium text-foreground">Tip:</span> Nigi AI (tombol bulat kanan bawah) menjawab hanya dengan angka studi kasus. Coba <span class="font-heading italic">"Apa itu Digital Twin?"</span>
  </div>
</div>
