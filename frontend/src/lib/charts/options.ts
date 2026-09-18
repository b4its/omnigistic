/** ECharts option helpers — semua pakai token CSS (light & dark) seperti ChartTooltip lama. */
import type { EChartsOption } from "echarts";

// Font grafik = token font-sans aplikasi (Inter) agar teks chart selaras dgn UI,
// bukan nama font hardcoded yang berbeda dari sistem desain.
const FONT = "var(--font-sans, ui-sans-serif, system-ui, sans-serif)";

function baseTooltip(): Record<string, unknown> {
  return {
    trigger: "axis",
    backgroundColor: "var(--color-card)",
    borderColor: "var(--color-border)",
    borderWidth: 1,
    borderRadius: 12,
    textStyle: { color: "var(--color-foreground)", fontFamily: FONT, fontSize: 12 },
    extraCssText: "box-shadow: var(--shadow-pop);"
  };
}

function axisStyle(opts: { rotate?: number; hideOverlap?: boolean } = {}): Record<string, unknown> {
  return {
    axisLine: { lineStyle: { color: "var(--color-border)" } },
    axisTick: { show: false },
    axisLabel: {
      color: "var(--color-muted-foreground)",
      fontSize: 12,
      fontFamily: FONT,
      rotate: opts.rotate ?? 0,
      hideOverlap: opts.hideOverlap ?? true,
      interval: "auto"
    },
    splitLine: { lineStyle: { color: "var(--color-border)", type: "dashed" as const } }
  };
}

/** Tooltip nilai tunggal untuk kartu metrik (trigger item). */
export function itemTooltip(): Record<string, unknown> {
  return {
    ...baseTooltip(),
    trigger: "item"
  };
}

/** tooltip axis + grid default ter-token. */
export function gridOption(): Record<string, unknown> {
  return {
    ...baseTooltip(),
    grid: { left: 8, right: 12, top: 24, bottom: 8, containLabel: true }
  };
}

export function axisOption(): Record<string, unknown> {
  return axisStyle();
}

/** Legend ter-token. Posisi diatur oleh tiap helper (bukan di sini). */
export function legendOption(): Record<string, unknown> {
  return {
    icon: "roundRect",
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 14,
    textStyle: { color: "var(--color-muted-foreground)", fontFamily: FONT, fontSize: 12 }
  };
}

/** Line/AreaChart generik. */
export function lineChart(
  x: string[],
  seriesDef: Array<{ name: string; data: number[]; color: string; smooth?: boolean; area?: boolean }>,
  opts: { rotate?: number } = {}
): EChartsOption {
  const multi = seriesDef.length > 1;
  return {
    tooltip: baseTooltip(),
    legend: multi ? { top: 0, left: "center", ...legendOption() } : { show: false },
    grid: { left: 8, right: 16, top: multi ? 38 : 16, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: x, boundaryGap: false, ...axisStyle({ rotate: opts.rotate }) },
    yAxis: { type: "value", scale: true, ...axisStyle() },
    series: seriesDef.map((s) => ({
      name: s.name,
      type: "line",
      data: s.data,
      smooth: s.smooth ?? true,
      showSymbol: false,
      lineStyle: { width: 2.5, color: s.color },
      areaStyle: s.area ? { opacity: 0.12, color: s.color } : undefined,
      itemStyle: { color: s.color }
    }))
  };
}

/** BarChart generik. Legenda otomatis disembunyikan untuk satu seri. */
export function barChart(
  x: string[],
  seriesDef: Array<{ name: string; data: number[]; color?: string; radius?: number | number[] }>,
  opts: { rotate?: number; maxBarWidth?: number; hideLegend?: boolean } = {}
): EChartsOption {
  const multi = seriesDef.length > 1;
  const showLegend = !opts.hideLegend && multi;
  return {
    tooltip: baseTooltip(),
    legend: showLegend ? { top: 0, left: "center", ...legendOption() } : { show: false },
    grid: { left: 8, right: 16, top: showLegend ? 38 : 16, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: x, ...axisStyle({ rotate: opts.rotate }) },
    yAxis: { type: "value", ...axisStyle() },
    series: seriesDef.map((s) => ({
      name: s.name,
      type: "bar",
      data: s.data,
      barMaxWidth: opts.maxBarWidth ?? 56,
      barCategoryGap: "32%",
      itemStyle: { color: s.color ?? "var(--color-primary)", borderRadius: s.radius ?? [6, 6, 0, 0] }
    }))
  };
}

/** Bar horizontal dengan warna per item (cell). */
export function horizontalBar(x: string[], values: Array<{ name: string; value: number; color: string }>): EChartsOption {
  return {
    tooltip: baseTooltip(),
    grid: { left: 8, right: 32, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: "value", ...axisStyle(), max: 100 },
    yAxis: { type: "category", data: x, ...axisStyle({ hideOverlap: false }) },
    series: [
      {
        type: "bar",
        data: values.map((v) => ({ value: v.value, itemStyle: { color: v.color, borderRadius: [0, 4, 4, 0] } })),
        barMaxWidth: 16,
        label: { show: true, position: "right", color: "var(--color-muted-foreground)", fontSize: 12 }
      }
    ]
  };
}

/** Pie/Donut. */
export function donutChart(data: Array<{ name: string; value: number; color: string }>): EChartsOption {
  return {
    tooltip: itemTooltip(),
    legend: { bottom: 0, left: "center", ...legendOption() },
    series: [
      {
        type: "pie",
        radius: ["48%", "72%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: "var(--color-card)", borderWidth: 2 },
        label: { show: false },
        data: data.map((d) => ({ name: d.name, value: d.value, itemStyle: { color: d.color } }))
      }
    ]
  };
}

