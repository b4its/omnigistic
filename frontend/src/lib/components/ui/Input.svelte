<script lang="ts">
  /**
   * Input — terminal entri data: bg semi-transparan, border bawah 2px yang
   * menyala orange saat fokus. Mendukung label + ikon.
   */
  import { cn } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import type { IconName } from "$lib/icon-names";

  interface Props {
    value?: string;
    type?: string;
    placeholder?: string;
    label?: string;
    icon?: IconName;
    id?: string;
    disabled?: boolean;
    class?: string;
    ariaLabel?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
  }
  let {
    value = $bindable(""),
    type = "text",
    placeholder = "",
    label = "",
    icon,
    id = "",
    disabled = false,
    class: cls = "",
    ariaLabel,
    oninput,
    onchange
  }: Props = $props();

  const inputId = $derived(id || `in-${Math.random().toString(36).slice(2, 9)}`);
</script>

<div class={cn("w-full", cls)}>
  {#if label}
    <label for={inputId} class="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
  {/if}
  <div class="relative">
    {#if icon}
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Icon name={icon} cls="h-4 w-4" />
      </span>
    {/if}
    <input
      id={inputId}
      {type}
      bind:value
      {placeholder}
      {disabled}
      aria-label={ariaLabel ?? label ?? undefined}
      class={cn(
        "h-12 w-full rounded-lg border-0 border-b-2 border-[var(--input)] bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)] px-4 text-sm text-foreground",
        "placeholder:text-muted-foreground transition-all duration-200",
        "focus:border-b-[var(--bitcoin)] focus:shadow-[0_10px_20px_-10px_var(--glow)] focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        icon && "pl-10"
      )}
      {oninput}
      {onchange}
    />
  </div>
</div>
