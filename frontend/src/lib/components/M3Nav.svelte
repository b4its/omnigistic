<script lang="ts">
  import { page } from "$app/state";
  import { windowClass } from "$lib/stores/window-class";
  import { cn, resolveHref } from "$lib/utils";
  import Icon from "./Icon.svelte";
  import type { IconName } from "$lib/icon-names";

  export type NavItem = { label: string; short?: string; href: string; icon: IconName };

  let { items = [], sharedItems = [], userName = "Guest", open = true, ontoggle }: {
    items?: NavItem[];
    sharedItems?: NavItem[];
    userName?: string;
    /** Apakah rail/sidebar sedang terbuka (dikontrol layout). */
    open?: boolean;
    /** Callback tombol buka/tutup. */
    ontoggle?: () => void;
  } = $props();

  const labelOf = (i: { label: string; short?: string }) => i.short ?? i.label.split(" ")[0];

  let mode = $state<"compact" | "medium" | "expanded">("expanded");
  let overflowOpen = $state(false);

  $effect(() => {
    const unsub = windowClass.subscribe((w) => {
      mode = w;
    });
    return unsub;
  });

  const pathname = $derived(String(page.url.pathname));

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const overflowItems = $derived([...items.slice(4), ...sharedItems]);

  // Pada layar compact rail tak tampil (bottom bar), jadi toggle tak berlaku.
  const canToggle = $derived(mode !== "compact");
  // Rail menyempit (ikon saja) ketika ditutup pada mode medium/expanded.
  const railCollapsed = $derived(canToggle && !open);

  function toggle() {
    ontoggle?.();
    overflowOpen = false;
  }
</script>

{#if mode === "compact"}
  <nav aria-label="Primary" class="fixed inset-x-0 bottom-0 z-40 flex h-20 items-stretch justify-around gap-1 border-t border-sidebar-border bg-sidebar" style="padding-bottom: env(safe-area-inset-bottom)">
    {#each items.slice(0, 4) as item (item.href)}
      <a
        href={resolveHref(item.href)}
        aria-current={isActive(item.href) ? "page" : undefined}
        class="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5"
      >
        <span class="flex h-8 w-14 items-center justify-center rounded-full transition-colors {isActive(item.href) ? 'bg-[color-mix(in_oklab,var(--bitcoin)_18%,transparent)] text-[var(--bitcoin)]' : ''}">
          <Icon name={item.icon} cls="h-5 w-5" weight="regular" />
        </span>
        <span class="w-full truncate text-center font-mono text-[11px] font-medium tracking-wide {isActive(item.href) ? "text-[var(--bitcoin)]" : "text-sidebar-foreground/70"}">
          {labelOf(item)}
        </span>
      </a>
    {/each}
    {#if overflowItems.length > 0}
      <div class="relative flex flex-col items-center justify-center gap-0.5" data-overflow>
        <button
          type="button"
          aria-label="Menu lainnya"
          aria-expanded={overflowOpen}
          onclick={() => (overflowOpen = !overflowOpen)}
          class="flex min-h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-accent-foreground"
        >
          <Icon name="dots" cls="h-5 w-5" />
          <span class="max-w-full truncate text-center text-[13.5px] font-medium">Lainnya</span>
        </button>
        {#if overflowOpen}
          <div class="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-[min(14rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-card p-1.5 shadow-pop">
            {#each overflowItems as item (item.href)}
              <a
                href={resolveHref(item.href)}
                onclick={() => (overflowOpen = false)}
                class={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors", isActive(item.href) ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
              >
                <Icon name={item.icon} cls="h-4 w-4 shrink-0" />
                <span class="truncate">{item.label}</span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </nav>
{:else}
  <!-- Rail/sidebar (medium & expanded) dengan tombol buka/tutup -->
  <aside
    aria-label={mode === "expanded" ? "Sections" : "Primary"}
    data-open={open}
    class={cn(
      "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
      railCollapsed ? "w-22 items-center" : "w-64"
    )}
  >
    {#if mode === "expanded"}
      <div class={cn("flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border", railCollapsed ? "justify-center px-2" : "px-5")}>
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--bitcoin-deep)] to-[var(--bitcoin)] font-heading text-[13px] font-bold text-white shadow-[0_0_14px_-3px_var(--glow)]">GC</span>
        {#if !railCollapsed}
          <div class="min-w-0 flex-1">
            <p class="truncate font-heading text-sm font-semibold tracking-tight text-foreground">Omnigistic <sup class="text-[13px] text-[var(--bitcoin)]">2.0</sup></p>
            <p class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">ISCEA 2026</p>
          </div>
        {/if}
        <button
          type="button"
          onclick={toggle}
          aria-label={open ? "Tutup sidebar" : "Buka sidebar"}
          aria-expanded={open}
          title={open ? "Tutup sidebar" : "Buka sidebar"}
          class={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-accent-foreground",
            railCollapsed && "mt-1"
          )}
        >
          <Icon name={open ? "panel-left" : "menu"} cls="h-4 w-4" weight="regular" />
        </button>
      </div>
    {:else}
      <!-- medium: header ringkas + tombol toggle -->
      <div class="flex h-16 shrink-0 items-center justify-center border-b border-sidebar-border px-2">
        <button
          type="button"
          onclick={toggle}
          aria-label={open ? "Tutup sidebar" : "Buka sidebar"}
          aria-expanded={open}
          title={open ? "Tutup sidebar" : "Buka sidebar"}
          class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-transform hover:scale-105"
        >
          <Icon name={open ? "panel-left" : "menu"} cls="h-4 w-4" weight={open ? "regular" : "bold"} />
        </button>
      </div>
    {/if}

    <div class={cn("flex-1 overflow-y-auto overflow-x-hidden", railCollapsed ? "w-full px-1.5 py-2" : "px-3 py-2")}>
      {#if !railCollapsed}
        <p class="px-2 pb-1.5 pt-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">{userName}</p>
      {/if}
      {#each items as item (item.href)}
        <a
          href={resolveHref(item.href)}
          title={item.label}
          aria-current={isActive(item.href) ? "page" : undefined}
          class={cn(
            "group relative flex items-center rounded-xl text-sm transition-all duration-200",
            railCollapsed ? "mx-auto min-h-12 w-12 flex-col justify-center gap-0.5 px-1 text-[13px]" : "min-h-11 gap-3 px-3 py-2.5",
            isActive(item.href)
              ? "bg-[color-mix(in_oklab,var(--bitcoin)_14%,transparent)] font-medium text-[var(--bitcoin)]"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-accent-foreground"
          )}
        >
          {#if isActive(item.href) && !railCollapsed}
            <span class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[var(--bitcoin)] to-[var(--gold)] shadow-[0_0_10px_-1px_var(--glow)]" aria-hidden="true"></span>
          {/if}
          <Icon name={item.icon} cls={railCollapsed ? "h-5 w-5 shrink-0" : "h-4.5 w-4.5 shrink-0"} />
          {#if railCollapsed}
            <span class="max-w-full truncate text-center font-medium leading-tight">{labelOf(item)}</span>
          {:else}
            <span class="truncate">{item.label}</span>
            {#if isActive(item.href)}
              <span class="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--glow-gold)]" aria-hidden="true"></span>
            {/if}
          {/if}
        </a>
      {/each}
      {#if sharedItems.length > 0}
        {#if !railCollapsed}
          <p class="px-2 pb-1.5 pt-5 font-mono text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">Shared</p>
        {:else}
          <div class="mx-auto my-2 h-px w-8 bg-sidebar-border"></div>
        {/if}
        {#each sharedItems as item (item.href)}
          <a
            href={resolveHref(item.href)}
            title={item.label}
            aria-current={isActive(item.href) ? "page" : undefined}
            class={cn(
              "group relative flex items-center rounded-xl text-sm transition-all duration-200",
              railCollapsed ? "mx-auto min-h-12 w-12 flex-col justify-center gap-0.5 px-1 text-[13px]" : "min-h-11 gap-3 px-3 py-2.5",
              isActive(item.href)
                ? "bg-[color-mix(in_oklab,var(--bitcoin)_14%,transparent)] font-medium text-[var(--bitcoin)]"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-accent-foreground"
            )}
          >
            {#if isActive(item.href) && !railCollapsed}
              <span class="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[var(--bitcoin)] to-[var(--gold)] shadow-[0_0_10px_-1px_var(--glow)]" aria-hidden="true"></span>
            {/if}
            <Icon name={item.icon} cls={railCollapsed ? "h-5 w-5 shrink-0" : "h-4.5 w-4.5 shrink-0"} />
            {#if railCollapsed}
              <span class="max-w-full truncate text-center font-medium leading-tight">{labelOf(item)}</span>
            {:else}
              <span class="truncate">{item.label}</span>
            {/if}
          </a>
        {/each}
      {/if}
    </div>
  </aside>
{/if}
