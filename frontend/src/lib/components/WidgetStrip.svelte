<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import { widgetsStore, WIDGET_CATALOG, type DashboardWidget } from "$lib/stores/widgets";
  import Icon from "./Icon.svelte";

  // Peta widget → halaman terkait agar kartu bisa diklik (deep-link).
  const HREF: Record<string, string> = {
    "util-map": "/dashboard/pusat/utilization",
    forecast: "/dashboard/hub/forecast",
    "cod-risk": "/dashboard/kurir/cod-intel",
    fleet: "/dashboard/data/fleet",
    complain: "/dashboard/data/complaint",
    address: "/dashboard/data/address"
  };

  let active = $state<DashboardWidget[]>([]);

  onMount(() => {
    const unsub = widgetsStore.subscribe((ids) => {
      active = WIDGET_CATALOG.filter((w) => ids.includes(w.id));
    });
    return unsub;
  });

  function remove(id: string, title: string) {
    widgetsStore.remove(id);
    window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: { message: `Widget "${title}" dilepas`, type: "info", title: "Widget" } }));
  }
</script>

{#if active.length > 0}
  <section class="mb-5" aria-label="Widget dashboard">
    <div class="mb-2 flex items-center justify-between">
      <p class="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Widget dashboard ({active.length})</p>
      <button type="button" onclick={() => widgetsStore.clear()} class="text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive-foreground">Bersihkan</button>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {#each active as w (w.id)}
        <div class="group relative flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border" style="background: color-mix(in oklab, {w.hue} 16%, transparent); border-color: color-mix(in oklab, {w.hue} 34%, transparent); color: {w.hue}" aria-hidden="true">
            <span class="text-sm font-bold">{w.title[0]}</span>
          </span>
          <a href={resolveHref(HREF[w.id] ?? "/dashboard")} class="min-w-0 flex-1">
            <p class="flex items-center gap-1 text-sm font-semibold text-foreground">{w.title}<Icon name="arrow-up-right" cls="h-3 w-3 text-muted-foreground" weight="bold" /></p>
            <p class="mt-0.5 text-xs text-muted-foreground">{w.desc}</p>
            <p class="mt-1.5 inline-block rounded-md bg-accent px-2 py-0.5 text-[12.5px] font-semibold text-accent-foreground">{w.metric}</p>
          </a>
          <button
            type="button"
            onclick={() => remove(w.id, w.title)}
            aria-label={`Lepas widget ${w.title}`}
            class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
          >
            <Icon name="x" cls="h-3.5 w-3.5" />
          </button>
        </div>
      {/each}
    </div>
  </section>
{/if}
