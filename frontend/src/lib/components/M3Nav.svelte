<script lang="ts">
  import { page } from "$app/state";
  import { windowClass } from "$lib/stores/window-class";
  import { cn, resolveHref } from "$lib/utils";
  import Icon from "./Icon.svelte";
  import type { IconName } from "$lib/icon-names";



  export type NavItem = { label: string; short?: string; href: string; icon: IconName };

  let { items = [], sharedItems = [], userName = "Guest" }: {
    items?: NavItem[];
    sharedItems?: NavItem[];
    userName?: string;
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
</script>

{#if mode === "compact"}
  <nav aria-label="Primary" class="fixed inset-x-0 bottom-0 z-40 flex h-20 items-stretch justify-around gap-1 border-t border-sidebar-border bg-sidebar" style="padding-bottom: env(safe-area-inset-bottom)">
    {#each items.slice(0, 4) as item (item.href)}
      <a
        href={resolveHref(item.href)}
        aria-current={isActive(item.href) ? "page" : undefined}
        class="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5"
      >
        <span class="flex h-8 w-14 items-center justify-center rounded-full transition-colors {isActive(item.href) ? 'bg-accent' : ''}">
          <Icon name={item.icon} cls="h-5 w-5" weight="regular" />
        </span>
        <span class="w-full truncate text-center text-[13px] font-medium {isActive(item.href) ? "text-accent-foreground" : "text-sidebar-foreground/70"}">
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
          <div class="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-xl border border-border bg-card p-1.5 shadow-pop">
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
{:else if mode === "medium"}
  <aside aria-label="Primary" class="flex w-22 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3">
    <div class="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-[13.5px] font-extrabold text-primary-foreground">GC</div>
    <div class="my-1 h-px w-8 bg-sidebar-border"></div>
    {#each items as item (item.href)}
      <a
        href={resolveHref(item.href)}
        title={item.label}
        aria-current={isActive(item.href) ? "page" : undefined}
        class={cn("flex w-full min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[13px] transition-colors", isActive(item.href) ? "bg-accent text-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50")}
      >
        <Icon name={item.icon} cls="h-5 w-5" />
        <span class="max-w-full truncate text-center font-medium">{labelOf(item)}</span>
      </a>
    {/each}
    {#if sharedItems.length > 0}
      <div class="mt-2 flex w-full flex-col items-center gap-1 border-t border-sidebar-border pt-2">
        <div class="relative" data-overflow>
          <button
            type="button"
            aria-label="Menu lainnya"
            aria-expanded={overflowOpen}
            onclick={() => (overflowOpen = !overflowOpen)}
            class="flex w-full min-h-11 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-accent-foreground"
          >
            <Icon name="dots" cls="h-5 w-5" />
            <span class="text-[13.5px]">Lainnya</span>
          </button>
          {#if overflowOpen}
            <div class="absolute left-[calc(100%+12px)] top-0 z-50 w-56 rounded-xl border border-border bg-card p-1.5 shadow-pop">
              {#each sharedItems as item (item.href)}
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
      </div>
    {/if}
  </aside>
{:else if mode === "expanded"}
  <aside aria-label="Sections" class="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
    <div class="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-5">
      <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-[13px] font-bold text-primary-foreground">GC</span>
      <div>
        <p class="font-serif text-sm font-semibold tracking-tight text-foreground">Omnigistic <sup class="text-[13px] text-primary">2.0</sup></p>
        <p class="text-xs text-muted-foreground">ISCEA 2026</p>
      </div>
    </div>
    <div class="flex-1 overflow-y-auto px-3 py-2">
      <p class="px-2 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">{userName}</p>
      {#each items as item (item.href)}
        <a
          href={resolveHref(item.href)}
          aria-current={isActive(item.href) ? "page" : undefined}
          class={cn("group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors", isActive(item.href) ? "bg-accent font-medium text-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-accent-foreground")}
        >
          <Icon name={item.icon} cls="h-4.5 w-4.5 shrink-0" />
          <span class="truncate">{item.label}</span>
          {#if isActive(item.href)}
            <span class="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true"></span>
          {/if}
        </a>
      {/each}
      {#if sharedItems.length > 0}
        <p class="px-2 pb-1.5 pt-5 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">Shared</p>
        {#each sharedItems as item (item.href)}
          <a
            href={resolveHref(item.href)}
            aria-current={isActive(item.href) ? "page" : undefined}
            class={cn("group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors", isActive(item.href) ? "bg-accent font-medium text-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-accent-foreground")}
          >
            <Icon name={item.icon} cls="h-4.5 w-4.5 shrink-0" />
            <span class="truncate">{item.label}</span>
          </a>
        {/each}
      {/if}
    </div>
  </aside>
{/if}