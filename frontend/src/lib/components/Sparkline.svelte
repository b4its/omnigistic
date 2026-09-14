<script lang="ts">
  let {
    data = [] as number[],
    width = 96,
    height = 28,
    color = "var(--color-primary)",
    cls = ""
  }: { data?: number[]; width?: number; height?: number; color?: string; cls?: string } = $props();

  const pts = $derived.by(() => {
    const d = data.filter((n) => Number.isFinite(n));
    if (d.length < 2) return null;
    const min = Math.min(...d);
    const max = Math.max(...d);
    const span = max - min || 1;
    const stepX = width / (d.length - 1);
    const pad = 2.5;
    const h = height - pad * 2;
    return d.map((v, i) => ({ x: i * stepX, y: pad + (1 - (v - min) / span) * h }));
  });
  const line = $derived(pts ? pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") : "");
  const area = $derived(pts ? `${line} L${width},${height} L0,${height} Z` : "");
  const last = $derived(pts ? pts[pts.length - 1] : null);
</script>

{#if pts}
  <svg viewBox="0 0 {width} {height}" width={width} height={height} class={cls} aria-hidden="true" preserveAspectRatio="none">
    <path d={area} fill={color} opacity="0.12" />
    <path d={line} fill="none" stroke={color} stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
    {#if last}<circle cx={last.x} cy={last.y} r="2.2" fill={color} />{/if}
  </svg>
{/if}
