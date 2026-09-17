<script lang="ts">
  /**
   * Card — permukaan editorial: border sangat halus, radius tenang, aksen mint
   * saat hover (tanpa glow tebal). Varian `glass` untuk panel mengambang.
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
      "rounded-xl transition-colors duration-300",
      variants[variant],
      pads[padding],
      hover &&
        "hover:border-[color-mix(in_oklab,var(--primary)_45%,transparent)]",
      cls
    )
  );
</script>

<div class={classes}>
  {@render children?.()}
</div>
