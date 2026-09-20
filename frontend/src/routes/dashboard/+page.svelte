<script lang="ts">
  import { roleLabel } from "$lib/i18n/labels";
  import { m } from "$lib/paraglide/messages";
  import { resolveHref } from "$lib/utils";

  const roles = [
    { slug: "pusat", initials: "D", name: "Dalila", role: "Decision Maker Pusat", desc: m.db2t1() },
    { slug: "hub", initials: "M", name: "Marwah", role: m.db2t2(), desc: m.db2t3() },
    { slug: "kurir", initials: "B", name: "Baits", role: "Courier Jakarta", desc: m.db2t4() },
    { slug: "data", initials: "V", name: "Virgiawan", role: "Data & IT", desc: m.db2t5() },
    { slug: "customer", initials: "S", name: "Sari", role: m.db2t8(), desc: m.db2t6() },
    { slug: "seller", initials: "R", name: "Rina", role: m.db2t9(), desc: m.db2t7() }
  ];
</script>

<svelte:head><title>{m.dsh01()}</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.dsh02()} <span class="text-gradient">{m.dsh03()}</span></h1>
    <a href={resolveHref("/")} class="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{m.dsh04()}</a>
  </div>
  <p class="text-sm text-muted-foreground">{m.dsh05()}</p>
  <div class="grid gap-4 sm:grid-cols-2">
    {#each roles as r (r.slug)}
      <a href={resolveHref(`/dashboard/${r.slug}/overview`)} class="group flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)]">
        <div class="flex items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] font-heading text-sm font-bold text-[var(--primary-foreground)]">{r.initials}</span>
          <span class="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{roleLabel(r.slug)}</span>
        </div>
        <p class="font-heading text-sm font-semibold text-foreground">{r.name} · <span class="font-normal text-muted-foreground">{r.role}</span></p>
        <p class="text-[15px] leading-relaxed text-muted-foreground">{r.desc}</p>
      </a>
    {/each}
  </div>
</div>
