<script lang="ts">
  // Pengalih bahasa (English ⇄ Indonesia). Mengikuti pola resmi Paraglide:
  // tautan ke URL ber-locale + `data-sveltekit-reload` agar dokumen yang dirender
  // server dan locale runtime tetap sinkron.
  import { page } from "$app/state";
  import { baseLocale, locales, localizeHref } from "$lib/paraglide/runtime";
  import { m } from "$lib/paraglide/messages";
  import { cn, deLocalizedPath } from "$lib/utils";

  interface Props {
    /** "app" = dashboard (token tema), "landing" = halaman editorial landing. */
    variant?: "app" | "landing";
    class?: string;
  }
  let { variant = "app", class: cls = "" }: Props = $props();

  const label: Record<string, string> = {};
  label.en = m.lang_name_en();
  label.id = m.lang_name_id();

  // Path kanonik (tanpa prefix locale) supaya tidak terjadi dobel prefix.
  const current = $derived(deLocalizedPath(String(page.url.pathname)));
</script>

<nav aria-label={m.lang_switch_aria()} class={cn("flex items-center gap-1", cls)}>
  {#each locales as loc (loc)}
    <a
      href={localizeHref(current, { locale: loc })}
      data-sveltekit-reload
      aria-current={loc === baseLocale && page.url.pathname === current ? "true" : undefined}
      class={cn(
        "rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
        variant === "landing"
          ? "border border-[var(--lnd-line)] text-[var(--lnd-soft)] hover:border-[var(--lnd-ink)] hover:text-[var(--lnd-ink)]"
          : "border border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
        loc === baseLocale &&
          page.url.pathname === current &&
          (variant === "landing"
            ? "border-[var(--lnd-ink)] text-[var(--lnd-ink)]"
            : "border-primary/60 text-foreground")
      )}
    >
      {label[loc] ?? loc}
    </a>
  {/each}
</nav>
