<script lang="ts">
  import { onMount } from "svelte";
  import echarts from "$lib/charts/core";
  import type { EChartsCoreOption as EChartsOption } from "echarts/core";
  import { themeStore } from "$lib/stores/theme";

  interface Props {
    option: EChartsOption;
    height?: number;
    class?: string;
    label?: string;
  }
  let { option, height = 230, class: cls = "", label = "Grafik data Omnigistic" }: Props = $props();

  let chartEl: HTMLDivElement | undefined = $state();
  let chart: echarts.ECharts | null = null;

  /* CANVAS renderer TIDAK memahami CSS var() → hasil: warna hitam/default (bug audit).
     Resolver ini mengganti semua var(--x) (termasuk di dalam string panjang) dengan
     nilai computed token saat ini, lalu di-refresh saat tema ganti. */
  const VAR_RE = /var\((--[a-z0-9-]+)\)/g;
  function resolveStrings(v: unknown): unknown {
    if (typeof v === "string") {
      return v.replace(VAR_RE, (whole, name: string) => {
        const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return val || whole;
      });
    }
    if (Array.isArray(v)) return v.map(resolveStrings);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) out[k] = resolveStrings(val);
      return out;
    }
    return v;
  }

  const reduce = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setOpt(notMerge = false) {
    if (!chart) return;
    const opt = resolveStrings(option) as Record<string, unknown>;
    if (reduce()) opt.animation = false;
    chart.setOption(opt, notMerge);
  }

  onMount(() => {
    if (!chartEl) return;
    const el = chartEl;
    const inst = echarts.init(el);
    chart = inst;
    setOpt(true);

    const unsubTheme = themeStore.subscribe(() => setOpt(true));
    const onResize = () => inst.resize();
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      unsubTheme();
      inst.dispose();
      chart = null;
    };
  });

  $effect(() => {
    // re-render saat opsi berubah (data fetch)
    void option;
    if (chart) setOpt(true);
  });
</script>

<div role="img" aria-label={label} class={cls} style="width:100%;height:{height}px">
  <div bind:this={chartEl} style="width:100%;height:100%"></div>
</div>
