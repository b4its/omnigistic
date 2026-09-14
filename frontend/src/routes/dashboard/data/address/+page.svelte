<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import AddressMap from "$lib/map/AddressMap.svelte";
  import Icon from "$lib/components/Icon.svelte";
  interface Cand { city: string; district: string; coordinate: string; score: number }
  let addrs = $state<Array<{ street: string; city: string; district: string; coordinate: string }>>([]);
  let parsed = $state<{ best: Cand | null; candidates: Cand[]; etaMin: number | null } | null>(null);

  onMount(async () => {
    try {
      addrs = await api.addresses();
    } catch {
      addrs = [];
    }
    try {
      parsed = await api.addressParse("Jl. Raya Jakarta-Bogor No.12, Cibinong, Kabupaten Bogor");
    } catch {
      parsed = null;
    }
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
    const delay = 3000; // fase "menghitung"
    const dur = 3600;
    const stagger = 1700;
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
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Address Intelligence</h1>
    <span class="hub-label text-muted-foreground">DATA · Virgiawan</span>
  </div>

  <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Icon name="chat" cls="h-5 w-5" weight="fill" />
      </span>
      <div class="min-w-0">
        <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">Saran Nigi AI</p>
        <p class="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
          Paket COD di Cibinong (alamat benar terverifikasi geotag): hubungi penerima dulu untuk slot. Jika belum siap, pindahkan ke PUDO terdekat. Kurir diarahkan mengikuti rute jalan + ETA, agar tidak mencari-cari.
        </p>
        <button type="button" onclick={openChat} class="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0">
          Buka Nigi Chat <Icon name="arrow-up-right" cls="h-3.5 w-3.5" weight="bold" />
        </button>
      </div>
    </div>
  </div>

  <div class="rounded-2xl border-l-4 border-chart-4 bg-muted/30 p-4 text-sm">
    Nama jalan yang sama muncul di <span class="font-medium">3 lokasi berbeda</span>, berjarak puluhan kilometer. Inilah akar komplain alamat.
  </div>

  <AddressMap />

  <div class="grid gap-4 sm:grid-cols-3">
    {#each addrs as a (a.district)}
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
        <span class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          {#if analyzing}<span class="absolute inset-0 animate-ping rounded-xl bg-primary/40"></span>{/if}
          <Icon name="chat" cls="h-4 w-4" weight="fill" />
        </span>
        <div class="min-w-0">
          <p class="text-sm font-semibold">Nigi AI</p>
          <p class="text-xs text-muted-foreground">{analyzing ? "Menganalisis 3 kandidat alamat…" : "Analisis selesai · kandidat terskor"}</p>
        </div>
        {#if analyzing}
          <span class="ml-auto flex items-center gap-1.5 text-[13.5px] font-semibold text-primary">
            <Icon name="dots" cls="h-4 w-4 animate-pulse" weight="bold" /> menghitung
          </span>
        {:else}
          <span class="ml-auto rounded-full bg-success px-2.5 py-1 text-[13px] font-semibold text-success-foreground">selesai</span>
        {/if}
      </div>

      <ol class="mt-4 space-y-2.5">
        {#each parsed.candidates as c, i (c.district)}
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
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chart-3 text-white"><Icon name="check" cls="h-3.5 w-3.5" weight="bold" /></span>
          <span><strong>Keputusan:</strong> target = {parsed.best.city} · {parsed.best.district} · ETA {parsed.etaMin ?? "—"} menit.</span>
        </p>
      {/if}
    </div>
  {/if}

  <div class="rounded-2xl border border-border bg-card p-5">
    <p class="mb-2 text-sm font-medium">Bagaimana NLP membantu</p>
    <ol class="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
      <li>Parse alamat jadi komponen terstruktur</li>
      <li>Fuzzy matching ke koordinat</li>
      <li>Geotag wajib saat checkout</li>
      <li>Disambiguasi lokasi serupa (mis. Cibinong vs Depok vs Tangsel)</li>
    </ol>
  </div>
</div>