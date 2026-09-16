<script lang="ts">
  /**
   * Card — "block" di rantai. Permukaan Dark Matter, border ultra-tipis,
   * lift + glow orange saat hover. Varian `glass` untuk panel mengambang.
   */
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  type Variant = "solid" | "glass" | "outline";

  interface Props {
    variant?: Variant;
    hover?: boolean;
    padding?: "none" | "sm" | "md" | "lg";
    class?: string;
    children?: Snippet;
  }
  let { variant = "solid", hover = false, padding = "md", class: cls = "", children }: Props = $props();

  const pads = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-8"
  } as const;

  const variants: Record<Variant, string> = {
    solid: "bg-card border border-border",
    glass: "glass border border-border",
    outline: "bg-transparent border border-border"
  };

  const classes = $derived(
    cn(
      "rounded-2xl transition-all duration-300",
      variants[variant],
      pads[padding],
      hover &&
        "hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] hover:shadow-[0_0_30px_-10px_var(--glow)]",
      cls
    )
  );
</script>

<div class={classes}>
  {@render children?.()}
</div>
