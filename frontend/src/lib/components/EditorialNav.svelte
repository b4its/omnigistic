<script lang="ts">
  // Header nav editorial bersama untuk halaman gaya "technical whitepaper":
  // logo diamond kecil + "BRAND / section" (monospace) di kiri, tautan nav
  // monospace kecil dengan panah "→" di kanan. Dipakai /whitepaper & /analisis
  // agar identitas visual konsisten.
  import { resolveHref } from "$lib/utils";

  let {
    section = "WHITEPAPER",
    links = [] as { href: string; label: string }[],
    cta = null as { href: string; label: string } | null,
    activeHref = ""
  }: {
    section?: string;
    links?: { href: string; label: string }[];
    cta?: { href: string; label: string } | null;
    activeHref?: string;
  } = $props();
</script>

<header class="wp-nav sticky top-0 z-40" style="background: color-mix(in srgb, var(--wp-bg) 88%, transparent); backdrop-filter: blur(8px)">
  <div class="wp-wrap flex h-14 items-center gap-4">
    <a href={resolveHref("/")} class="flex items-center gap-2.5" aria-label="Omnigistic">
      <span class="wp-diamond" aria-hidden="true"></span>
      <span class="wp-mono text-[13px] tracking-[0.08em] text-[var(--wp-fg)]">OMNIGISTIC</span>
      <span class="wp-mono text-[13px] tracking-[0.08em] text-[var(--wp-muted)]">/ {section}</span>
    </a>
    {#if links.length}
      <nav class="ml-auto hidden items-center gap-5 lg:flex" aria-label="Navigasi bagian">
        {#each links as l (l.href)}
          <a href={l.href.startsWith("#") ? l.href : resolveHref(l.href)} class="wp-nav-link" data-active={l.href === activeHref ? "true" : undefined}>
            {l.label}{#if l.href === activeHref}<span class="wp-accent"> →</span>{/if}
          </a>
        {/each}
      </nav>
    {/if}
    {#if cta}
      <a href={resolveHref(cta.href)} class="wp-mono ml-auto text-[13px] tracking-[0.03em] text-[var(--wp-muted)] transition-colors hover:text-[var(--wp-mint)] lg:ml-6">
        {cta.label} →
      </a>
    {/if}
  </div>
</header>
