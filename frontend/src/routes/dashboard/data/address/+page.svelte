<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { notify } from "$lib/toast";
  import AddressMap from "$lib/map/AddressMap.svelte";
  import Icon from "$lib/components/Icon.svelte";
  import GlitterIcon from "$lib/components/ui/GlitterIcon.svelte";
  interface Cand { city: string; district: string; coordinate: string; score: number }
  type Parsed = { best: Cand | null; candidates: Cand[]; etaMin: number | null; distanceKm?: number | null; matched?: boolean };
  let addrs = $state<Array<{ street: string; city: string; district: string; coordinate: string }>>([]);
  let parsed = $state<Parsed | null>(null);
  let query = $state("Jl. Raya Jakarta-Bogor No.12, Cibinong, Kabupaten Bogor");
  let loading = $state(false);

  async function analyze(text: string) {
    const q = text.trim();
    if (!q) {
      notify(m.ad2t1(), "warn", "Address Intelligence");
      return;
    }
    loading = true;
    try {
      parsed = await api.addressParse(q);
    } catch {
      notify(m.ad2t2(), "error", "Address Intelligence");
      parsed = null;
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    try {
      addrs = await api.addresses();
    } catch {
      addrs = [];
    }
    await analyze(query);
  });

  function openChat() {
    window.dispatchEvent(new CustomEvent("omnigistic-open-nigi-chat"));
  }

  // Animasi "Nigi AI menganalisis" lalu menghitung skor kandidat.
  let analyzing = $state(true);
  let shown = $state<number[]>([]);
  let decided = $state(false);

  $effect(() => {
    if (!parsed) return;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = parsed.candidates.map((c) => c.score * 100);
    if (reduce) {
      shown = targets;
      analyzing = false;
      decided = true;
      return;
    }
    analyzing = true;
    decided = false;
    shown = targets.map(() => 0);
    const delay = 400; // fase "menghitung" singkat
    const dur = 2200;
    const stagger = 700;
    const t0 = performance.now();
    const ease = (x: number) => 1 - (1 - x) ** 3;
    let raf = 0;
    const frame = (now: number) => {
      const e = now - t0;
      let done = true;
      shown = targets.map((s, i) => {
        const local = Math.max(0, Math.min(1, (e - delay - i * stagger) / dur));
        if (local < 1) done = false;
        return s * ease(local);
      });
      if (e < delay || !done) {
        raf = requestAnimationFrame(frame);
      } else {
        shown = targets;
        analyzing = false;
        decided = true;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  const EXAMPLES = [
    "Jl. Raya Jakarta-Bogor No.12, Cibinong",
    "Jl. Raya Jakarta-Bogor No.12, Rempoa, Tangsel",
    "Jl. Raya Jakarta-Bogor No.12, Sukamaju, Depok",
  ];
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.da01()}</h1>
    <span class="hub-label text-muted-foreground">{m.da02()}</span>
  </div>

  <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
        <GlitterIcon cls="h-5 w-5" />
      </span>
      <div class="min-w-0">
        <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">{m.da03()}</p>
        <p class="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
          {m.da04()}
        </p>
        <button type="button" onclick={openChat} class="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-xs font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px active:translate-y-0">
          {m.da05()} <Icon name="arrow-up-right" cls="h-3.5 w-3.5" weight="bold" />
        </button>
      </div>
    </div>
  </div>

  <div class="rounded-2xl border-l-4 border-chart-4 bg-muted/30 p-4 text-sm">
    {m.da06()} <span class="font-medium">{m.da07()}</span>{m.da08()}
  </div>

  <form
    class="rounded-2xl border border-border bg-card p-5"
    onsubmit={(e) => { e.preventDefault(); analyze(query); }}
  >
    <label for="addr-input" class="text-sm font-medium text-foreground">{m.da09()}</label>
    <p class="mt-1 text-xs text-muted-foreground">{m.da10()}</p>
    <div class="mt-3 flex flex-col gap-2 sm:flex-row">
      <input
        id="addr-input"
        type="text"
        bind:value={query}
        placeholder="mis. Jl. Raya Jakarta-Bogor No.12, Cibinong"
        class="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        autocomplete="off"
      />
      <button
        type="submit"
        disabled={loading}
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0 disabled:opacity-60"
      >
        {#if loading}<Icon name="dots" cls="h-4 w-4 animate-pulse" weight="bold" />{:else}<Icon name="search" cls="h-4 w-4" weight="bold" />{/if}
        Analisis
      </button>
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      {#each EXAMPLES as ex (ex)}
        <button
          type="button"
          onclick={() => { query = ex; analyze(ex); }}
          class="rounded-full border border-border bg-muted/40 px-3 py-1 text-[12.5px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >{ex}</button>
      {/each}
    </div>
  </form>

  <AddressMap />

  <div class="grid gap-4 sm:grid-cols-3">
    {#each addrs as a, i (`${a.city}-${a.district}-${i}`)}
      <div class="rounded-2xl border bg-card p-5">
        <p class="font-mono text-sm text-primary">{a.street}</p>
        <p class="mt-3 text-sm font-medium">{a.city}</p>
        <p class="text-xs text-muted-foreground">{a.district}</p>
        <p class="kpi-value mt-2 text-xs text-muted-foreground">{a.coordinate}</p>
      </div>
    {/each}
  </div>

  {#if parsed}
    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="flex items-center gap-2.5">
        <span class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
          {#if analyzing}<span class="absolute inset-0 animate-ping rounded-xl bg-primary/40"></span>{/if}
          <GlitterIcon cls="h-4 w-4" />
        </span>
        <div class="min-w-0">
          <p class="text-sm font-semibold">{m.da11()}</p>
          <p class="text-xs text-muted-foreground">{analyzing ? "Menganalisis 3 kandidat alamat…" : "Analisis selesai · kandidat terskor"}</p>
        </div>
        {#if analyzing}
          <span class="ml-auto flex items-center gap-1.5 text-[13.5px] font-semibold text-primary">
            <Icon name="dots" cls="h-4 w-4 animate-pulse" weight="bold" /> {m.da12()}
          </span>
        {:else}
          <span class="ml-auto rounded-full bg-success px-2.5 py-1 text-[13px] font-semibold text-success-foreground">{m.da13()}</span>
        {/if}
      </div>

      <ol class="mt-4 space-y-2.5">
        {#each parsed.candidates as c, i (`${c.city}-${c.district}-${i}`)}
          {@const val = shown[i] ?? 0}
          {@const isBest = c.city === parsed.best?.city}
          <li class="rounded-xl bg-muted/50 px-3 py-2.5">
            <div class="flex items-center justify-between text-sm">
              <span class={isBest ? "font-semibold text-foreground" : "text-foreground"}>{c.city} · {c.district}</span>
              <span class={"kpi-value tabular-nums " + (isBest ? "text-success-foreground" : "text-muted-foreground")}>{val.toFixed(0)}%</span>
            </div>
            <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
              <div class={"h-full rounded-full " + (isBest ? "bg-success-foreground" : "bg-muted-foreground/60")} style="width: {val}%"></div>
            </div>
          </li>
        {/each}
      </ol>

      {#if decided && parsed.best}
        <p class="mt-4 flex items-center gap-2 text-[15px]">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]"><Icon name="check" cls="h-3.5 w-3.5" weight="bold" /></span>
          <span><strong>{m.da14()}</strong> target = {parsed.best.city} · {parsed.best.district} · ETA {parsed.etaMin ?? "—"} menit{parsed.distanceKm != null ? ` · ${parsed.distanceKm} km` : ""}.</span>
        </p>
      {:else if decided && !parsed.best}
        <p class="mt-4 flex items-center gap-2 text-[15px]">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground"><Icon name="warn" cls="h-3.5 w-3.5" weight="bold" /></span>
          <span><strong>{m.da15()}</strong> {m.da16()}</span>
        </p>
      {/if}
    </div>
  {/if}

  <div class="rounded-2xl border border-border bg-card p-5">
    <p class="mb-2 text-sm font-medium">{m.da17()}</p>
    <ol class="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
      <li>{m.da18()}</li>
      <li>{m.da19()}</li>
      <li>{m.da20()}</li>
      <li>{m.da21()}</li>
    </ol>
  </div>
</div>