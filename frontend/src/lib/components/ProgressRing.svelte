<script lang="ts">
  /** Cincin progres SVG — menampilkan persentase (0–100) dengan warna aksen. */
  let {
    pct = 0,
    size = 64,
    stroke = 6,
    color = "var(--color-primary)",
    label
  }: { pct?: number; size?: number; stroke?: number; color?: string; label?: string } = $props();

  const clamped = $derived(Math.max(0, Math.min(100, Math.round(pct))));
  const r = $derived((size - stroke) / 2);
  const c = $derived(2 * Math.PI * r);
  const offset = $derived(c * (1 - clamped / 100));
</script>

<div class="relative inline-flex shrink-0 items-center justify-center" style="width:{size}px;height:{size}px" role="img" aria-label={label ?? `${clamped}% selesai`}>
  <svg width={size} height={size} class="-rotate-90" aria-hidden="true">
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" stroke-width={stroke} />
    <circle
      cx={size / 2}
      cy={size / 2}
      r={r}
      fill="none"
      stroke={color}
      stroke-width={stroke}
      stroke-linecap="round"
      stroke-dasharray={c}
      stroke-dashoffset={offset}
      style="transition: stroke-dashoffset .5s cubic-bezier(.34,1,.4,1)"
    />
  </svg>
  <span class="absolute text-[13px] font-bold tabular-nums text-foreground">{clamped}%</span>
</div>
