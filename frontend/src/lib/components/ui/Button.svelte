<script lang="ts">
  /**
   * Button — primitif "Bitcoin DeFi".
   * Varian selaras design system: primary (gradien orange→gold, glow), outline,
   * ghost, link. Semua pill (rounded-full), min-height 44px (touch-friendly).
   */
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import type { IconName } from "$lib/icon-names";

  type Variant = "primary" | "outline" | "ghost" | "link" | "gold";
  type Size = "sm" | "md" | "lg";

  interface Props {
    variant?: Variant;
    size?: Size;
    href?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    loading?: boolean;
    icon?: IconName;
    iconEnd?: IconName;
    block?: boolean;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    "aria-label"?: string;
  }
  let {
    variant = "primary",
    size = "md",
    href,
    type = "button",
    disabled = false,
    loading = false,
    icon,
    iconEnd,
    block = false,
    class: cls = "",
    onclick,
    children,
    ...rest
  }: Props = $props();

  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

  const sizes: Record<Size, string> = {
    sm: "h-9 px-4 text-[13px]",
    md: "min-h-[44px] px-6 text-sm",
    lg: "min-h-[52px] px-8 text-base"
  };

  const variants: Record<Variant, string> = {
    primary:
      "bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] text-white font-semibold uppercase tracking-wider " +
      "shadow-[0_0_20px_-5px_var(--glow)] hover:scale-[1.03] hover:shadow-[0_0_30px_-5px_var(--glow)]",
    gold:
      "bg-gradient-to-r from-[var(--bitcoin)] to-[var(--gold)] text-[#030304] font-semibold uppercase tracking-wider " +
      "shadow-[0_0_20px_-5px_var(--glow-gold)] hover:scale-[1.03]",
    outline:
      "border-2 border-[color-mix(in_oklab,var(--foreground)_20%,transparent)] text-foreground bg-transparent " +
      "hover:border-[var(--bitcoin)] hover:bg-[color-mix(in_oklab,var(--bitcoin)_10%,transparent)]",
    ghost: "bg-transparent text-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_8%,transparent)] hover:text-[var(--bitcoin)]",
    link: "bg-transparent text-[var(--bitcoin)] hover:underline px-0 min-h-0 h-auto"
  };

  const classes = $derived(
    cn(base, sizes[size], variants[variant], block && "w-full", cls)
  );
</script>

{#if href}
  <a {href} class={classes} {...rest} aria-disabled={disabled}>
    {#if icon}<Icon name={icon} cls="h-4 w-4 shrink-0" weight="bold" />{/if}
    {#if children}{@render children()}{/if}
    {#if iconEnd}<Icon name={iconEnd} cls="h-4 w-4 shrink-0" weight="bold" />{/if}
  </a>
{:else}
  <button {type} class={classes} {disabled} {onclick} {...rest}>
    {#if loading}<Icon name="dots" cls="h-4 w-4 shrink-0 animate-pulse" weight="bold" />
    {:else if icon}<Icon name={icon} cls="h-4 w-4 shrink-0" weight="bold" />{/if}
    {#if children}{@render children()}{/if}
    {#if iconEnd}<Icon name={iconEnd} cls="h-4 w-4 shrink-0" weight="bold" />{/if}
  </button>
{/if}
