<script lang="ts">
  import { untrack } from "svelte";
  import { cn } from "$lib/utils";
  import Sparkline from "./Sparkline.svelte";

  type Tone = "up" | "down" | "warn";

  interface Props {
    label: string;
    value?: string;
    delta?: string;
    deltaTone?: Tone;
    sub?: string;
    accent?: boolean;
    valueColor?: string;
    spark?: number[];
    sparkColor?: string;
  }
  let { label, value, delta, deltaTone = "up", sub, accent = false, valueColor, spark, sparkColor }: Props = $props();

  const toneMap: Record<Tone, string> = {
    up: "bg-success text-success-foreground",
    down: "bg-destructive text-destructive-foreground",
    warn: "bg-warning text-warning-foreground"
  };

  const numRe = /^([^-0-9.,]*)(-?[\d.,]+)(.*)$/;
  function parse(v: string): { pre: string; num: number | null; suf: string; dec: number } {
    const m = v.match(numRe);
    if (!m) return { pre: "", num: null, suf: v, dec: 0 };
    const g = m[2];
    let n: number;
    let dec = 0;
    if (g.includes(",")) {
      // id-style: 1.234.567,89 → last comma decimal; dots = thousands
      n = Number(g.replace(/\./g, "").replace(",", "."));
      dec = (g.split(",")[1]?.length ?? 0);
    } else if (/^\d{1,3}\.\d{1,2}$/.test(g) || /^\d{1,3}\.\d{3,}$/.test(g) && !/^\d{1,3}\.\d{3}$/.test(g)) {
      // en-decimal: 50.08 / 317.63 / 1.5
      n = parseFloat(g);
      dec = g.split(".")[1]?.length ?? 0;
    } else if (/^\d{1,3}(\.\d{3})+$/.test(g)) {
      // en-thousands atau desimal pendek: 1.75 (2 digit), 1.234,567 di atas sudah kena; ".75" → decimal
      const frac = g.slice(g.lastIndexOf(".") + 1);
      if (frac.length === 3) n = Number(g.replace(/\./g, "")); else { n = parseFloat(g); dec = frac.length; }
    } else {
      n = Number(g);
    }
    if (!Number.isFinite(n)) return { pre: "", num: null, suf: v, dec: 0 };
    // "1.75" (en-dec 2 digit) di data kasus: simpan dec utk format ulang id (1,75→1.75? tampil id 1,75)
    return { pre: m[1], num: n, suf: m[3], dec: dec || (g.includes(".") && g.split(".").pop()!.length !== 3 ? g.split(".").pop()!.length : 0) };
  }

  function fmt(pre: string, n: number, suf: string, dec: number): string {
    const txt = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    }).format(n);
    return `${pre}${txt}${suf}`;
  }

  let shown = $state(untrack(() => value));
  $effect(() => {
    const src = value;
    if (!src) {
      shown = src;
      return;
    }
    const { pre, num, suf, dec } = parse(src);
    if (num === null) {
      shown = src;
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown = fmt(pre, num, suf, dec);
      return;
    }
    // count-up sekali (700ms cubic-out), tidak re-run ulang pada re-render identik.
    // Baca `shown` via untrack agar penulisan `shown` di dalam frame TIDAK memicu
    // ulang effect ini tiap frame (dulu animasi restart terus → jitter/lambat).
    const target = fmt(pre, num, suf, dec);
    if (untrack(() => shown) === target || num === 0) {
      shown = target;
      return;
    }
    const t0 = performance.now();
    const dur = 700;
    let raf = 0;
    let stopped = false;
    const startNum = parse(untrack(() => shown ?? "")).num ?? 0;
    const ease = (x: number) => 1 - (1 - x) ** 3;
    const frame = (now: number) => {
      if (stopped) return;
      const p = Math.min(1, (now - t0) / dur);
      const cur = startNum + (num - startNum) * ease(p);
      shown = p >= 1 ? target : fmt(pre, cur, suf, dec);
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  });
</script>

<div
  class={cn(
    "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300",
    "hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:shadow-[0_0_30px_-10px_var(--glow)]",
    accent && "border-[color-mix(in_oklab,var(--bitcoin)_35%,transparent)]"
  )}
>
  <div class="relative flex items-center gap-2 text-muted-foreground">
    <span class="font-mono text-[11px] uppercase tracking-wider">{label}</span>
  </div>
  <div class="relative mt-3 flex items-end justify-between gap-3">
    <div class="flex items-baseline gap-2">
      {#if shown}
        <p class="metric-value font-heading text-[23px] leading-none" style={valueColor ? `color:${valueColor}` : undefined}>{shown}</p>
      {/if}
      {#if delta}
        <span class={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[13px] font-bold", toneMap[deltaTone])}>{delta}</span>
      {/if}
    </div>
    {#if spark && spark.length > 1}
      <Sparkline data={spark} color={sparkColor ?? "var(--color-primary)"} cls="shrink-0" />
    {/if}
  </div>
  {#if sub}
    <p class="relative mt-1.5 text-xs text-muted-foreground">{sub}</p>
  {/if}
  <!-- sheen dekoratif kiri (glow) saat hover -->
  <span class="pointer-events-none absolute -left-16 top-0 h-full w-16 -skew-x-12 bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--bitcoin)_18%,transparent)] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
</div>
