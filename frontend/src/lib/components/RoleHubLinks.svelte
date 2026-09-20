<script lang="ts">
  // Hub tautan modul role. Dipakai halaman Overview (PUSAT/HUB/KURIR/DATA) agar
  // seluruh halaman role tetap terjangkau meski sidebar dibatasi 5 destinasi
  // (best practice: tidak ada halaman yatim).
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import type { IconName } from "$lib/icon-names";
  import { m } from "$lib/paraglide/messages";

  interface HubLink {
    label: string;
    href: string;
    icon: IconName;
    desc?: string;
  }
  let { title = m.hub_links_title(), links }: { title?: string; links: HubLink[] } = $props();
</script>

<section class="rounded-2xl border border-border bg-card p-5">
  <p class="text-sm font-medium">{title}</p>
  <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
    {#each links as l (l.href)}
      <a
        href={resolveHref(l.href)}
        class="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/60 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        <Icon name={l.icon} cls="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium">{l.label}</span>
          {#if l.desc}
            <span class="mt-0.5 block text-xs text-muted-foreground">{l.desc}</span>
          {/if}
        </span>
      </a>
    {/each}
  </div>
</section>
