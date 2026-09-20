<script lang="ts">
  import { portalLabel } from "$lib/i18n/labels";
  import Icon from "$lib/components/Icon.svelte";
  import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
  import type { IconName } from "$lib/icon-names";
  import { resolveHref } from "$lib/utils";
  import { loginContent } from "$lib/i18n/content";

  const routes: Record<string, string> = {
    PUSAT: "/dashboard/pusat/overview",
    HUB: "/dashboard/hub/overview",
    KURIR: "/dashboard/kurir/overview",
    DATA: "/dashboard/data/overview",
    CUSTOMER: "/dashboard/customer/overview",
    SELLER: "/dashboard/seller/overview"
  };

  const c = $derived(loginContent());
  const roles = $derived(c.roles);
</script>

<svelte:head><title>{c.t.title}</title></svelte:head>

<div class="landing grid min-h-dvh lg:grid-cols-2" style="background: var(--lnd-bg); color: var(--lnd-ink)">
  <div class="fixed right-4 top-4 z-20 sm:right-6 sm:top-6">
    <LanguageSwitcher variant="landing" />
  </div>
  <div class="relative hidden flex-col justify-between overflow-hidden rounded-l-none bg-[var(--lnd-ink)] p-[clamp(2rem,5vw,4rem)] text-[var(--lnd-bg)] lg:flex">
    <div class="landing-grid" aria-hidden="true"></div>
    <div class="pointer-events-none absolute -bottom-32 -right-24 h-[32rem] w-[32rem] rounded-full opacity-[0.16] blur-[130px]" style="background: radial-gradient(circle, var(--lnd-accent), transparent 70%)" aria-hidden="true"></div>
    <div class="relative flex items-baseline gap-1 font-heading text-2xl font-semibold tracking-[0.02em]">
      Omnigistic<span class="text-[var(--lnd-accent)]">.</span>
    </div>
    <p class="relative max-w-[12ch] font-heading text-[clamp(2.4rem,4.6vw,4.4rem)] font-light leading-[1.12] tracking-[-0.015em]">
      {c.t.heroA} <em class="accent-gradient font-semibold italic">{c.t.heroEm}</em><span class="text-[var(--lnd-accent)]">.</span>
    </p>
    <div class="relative flex justify-between gap-4 font-mono text-[13px] font-semibold uppercase tracking-[0.09em] text-[var(--lnd-on-ink)]">
      <span>{c.t.sixPortals}</span><span>{c.t.brand}</span>
    </div>
  </div>

  <div class="grid place-items-center px-[clamp(1.5rem,4vw,3rem)] py-12">
    <div class="w-full min-[400px]:max-w-[560px]">
      <p class="eyebrow">{c.t.signIn}</p>
      <h1 class="mt-4 font-heading text-[clamp(2.2rem,4vw,3.2rem)] font-light leading-[1.08] tracking-tight">
        {c.t.chooseA} <em class="italic text-[var(--lnd-accent-ink)]">{c.t.chooseEm}</em> {c.t.chooseB}
      </h1>
      <p class="mt-3 max-w-lg text-sm leading-relaxed text-[var(--lnd-soft)]">
        {c.t.intro}
      </p>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        {#each roles as r (r.slug)}
          <a href={resolveHref(routes[r.slug])} class="group flex h-full flex-col gap-3 rounded-xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6 transition-colors duration-300 hover:border-[var(--lnd-accent)]">
            <div class="flex items-center justify-between">
              <span class="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--lnd-accent)] text-[var(--lnd-bg)]">
                <Icon name={r.icon} cls="h-5 w-5" />
              </span>
              <span class="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--lnd-line)] transition-colors group-hover:border-[var(--lnd-accent-ink)]">
                <Icon name="arrow-up-right" cls="h-3.5 w-3.5 text-[var(--lnd-soft)] transition-transform group-hover:translate-x-0.5 group-hover:text-[color:var(--lnd-accent-ink)]" weight="bold" />
              </span>
            </div>
            <div>
              <p class="text-base font-semibold text-[var(--lnd-ink)]">{r.name}<span class="font-normal text-[var(--lnd-soft)]"> · {r.sub}</span></p>
              <p class="mt-1.5 text-[14px] leading-relaxed text-[var(--lnd-soft)]">{r.desc}</p>
            </div>
            <div class="mt-auto flex items-center gap-2 border-t border-dashed border-[var(--lnd-line-soft)] pt-3 text-[13.5px] uppercase tracking-wider text-[var(--lnd-soft)]">
              <span class="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--lnd-accent)] text-[13px] font-bold text-[var(--lnd-bg)]">{r.initials}</span>
              {portalLabel(r.slug)}
            </div>
          </a>
        {/each}
      </div>

      <div class="mt-8 flex justify-center">
        <a href={resolveHref("/")} class="text-xs text-[var(--lnd-soft)] underline-offset-4 hover:text-[color:var(--lnd-accent-ink)] hover:underline">{c.t.backHome}</a>
      </div>
    </div>
  </div>
</div>
