<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { resolveHref, numId } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import { formatRupiah, productName } from "$lib/shop/catalog";
  import { shop, cartDetail, shippingCost, type ResolvedCartItem, type Address } from "$lib/stores/shop";
  import { notify } from "$lib/toast";

  let items = $state<ResolvedCartItem[]>([]);
  let subtotal = $state(0);
  // Alamat tersimpan (dipakai checkout) → ongkir est. konsisten dgn total checkout.
  let savedAddress = $state<Address | null>(null);

  onMount(() => {
    shop.init();
    const unsubCart = cartDetail.subscribe((d) => {
      items = d.items;
      subtotal = d.subtotal;
    });
    const unsubShop = shop.subscribe((s) => (savedAddress = s.address));
    return () => {
      unsubCart();
      unsubShop();
    };
  });

  const totalItems = $derived(items.reduce((n, i) => n + i.qty, 0));
  const totalWeight = $derived(items.reduce((w, i) => w + i.product.weightKg * i.qty, 0));
  // Kota acuan ongkir = kota alamat tersimpan (sama dgn checkout), fallback Jakarta.
  const shipCity = $derived(savedAddress?.city || "Jakarta");
  const estShipping = $derived(items.length ? shippingCost(items, shipCity) : 0);

  function more(productId: string, qty: number, name: string) {
    shop.setQty(productId, qty + 1);
    notify({ message: m.ctQty({ name, qty: qty + 1 }), type: "info", title: m.cc201() });
  }
  function less(productId: string, qty: number, name: string) {
    shop.setQty(productId, qty - 1);
    notify({ message: qty - 1 <= 0 ? m.ctRemoved({ name }) : m.ctQty({ name, qty: qty - 1 }), type: "info", title: m.cc201() });
  }
  function remove(productId: string, name: string) {
    shop.removeFromCart(productId);
    notify({ message: m.ctRemoved({ name }), type: "warn", title: m.cc201() });
  }
  function clearAll() {
    shop.clearCart();
    notify({ message: "Keranjang dikosongkan", type: "warn", title: "Keranjang" });
  }
</script>

<div class="space-y-6">
  <header class="flex items-center justify-between gap-4">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">{m.cc201()}</h1>
      <p class="text-sm text-muted-foreground">{totalItems} item · perkiraan berat {numId(totalWeight, 1)} kg</p>
    </div>
    {#if items.length > 0}
      <button type="button" onclick={clearAll} class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive-foreground">
        <Icon name="trash" cls="h-3.5 w-3.5" /> {m.cc202()}
      </button>
    {/if}
  </header>

  {#if items.length === 0}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="stack" cls="h-7 w-7" /></span>
      <p class="mt-4 text-base font-semibold text-foreground">{m.cc203()}</p>
      <p class="mt-1 text-sm text-muted-foreground">{m.cc204()}</p>
      <a href={resolveHref("/dashboard/customer/overview")} class="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px">
        <Icon name="search" cls="h-4 w-4" /> {m.cc205()}
      </a>
    </div>
  {:else}
    <div class="grid gap-5 lg:grid-cols-[1fr_340px]">
      <!-- Daftar item -->
      <ul class="space-y-3">
        {#each items as it (it.product.id)}
          <li class="flex gap-4 rounded-2xl border border-border bg-card p-4">
            <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl" style="background:color-mix(in srgb, {it.product.accent} 12%, var(--color-card))">
              <Icon name={it.product.icon} cls="h-8 w-8" style="color:{it.product.accent}" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="truncate text-sm font-semibold text-foreground">{productName(it.product.id, it.product.name)}</h3>
                  <p class="text-xs text-muted-foreground">{it.product.category} · {it.product.store}</p>
                </div>
                <button type="button" onclick={() => remove(it.product.id, it.product.name)} aria-label={m.ctRemoveAria({ name: productName(it.product.id, it.product.name) })} class="shrink-0 text-muted-foreground transition-colors hover:text-destructive-foreground">
                  <Icon name="trash" cls="h-4 w-4" />
                </button>
              </div>
              <div class="mt-auto flex items-center justify-between gap-3">
                <div class="inline-flex items-center rounded-full border border-border">
                  <button type="button" onclick={() => less(it.product.id, it.qty, it.product.name)} aria-label={m.ax09()} class="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted"><span aria-hidden="true">−</span></button>
                  <span class="w-8 text-center text-sm font-semibold tabular-nums text-foreground">{it.qty}</span>
                  <button type="button" onclick={() => more(it.product.id, it.qty, it.product.name)} aria-label={m.ax10()} class="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted"><Icon name="plus" cls="h-3.5 w-3.5" weight="bold" /></button>
                </div>
                <p class="text-base font-bold text-foreground">{formatRupiah(it.lineTotal)}</p>
              </div>
            </div>
          </li>
        {/each}
      </ul>

      <!-- Ringkasan -->
      <aside class="lg:sticky lg:top-4 lg:self-start">
        <div class="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 class="text-sm font-semibold text-foreground">{m.cc206()}</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-muted-foreground">Subtotal ({totalItems} item)</dt><dd class="font-medium tabular-nums text-foreground">{formatRupiah(subtotal)}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Ongkir (est. {shipCity})</dt><dd class="font-medium tabular-nums text-foreground">{formatRupiah(estShipping)}</dd></div>
            <div class="mt-2 flex justify-between border-t border-border pt-3 text-base"><dt class="font-semibold text-foreground">{m.cc207()}</dt><dd class="font-bold tabular-nums text-foreground">{formatRupiah(subtotal + estShipping)}</dd></div>
          </dl>
          {#if !savedAddress}
            <p class="text-xs text-muted-foreground">{m.cc208()}</p>
          {/if}
          <a href={resolveHref("/dashboard/customer/checkout")} class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px">
            <Icon name="currency" cls="h-4 w-4" /> {m.cc209()}
          </a>
          <a href={resolveHref("/dashboard/customer/overview")} class="block text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{m.cc210()}</a>
        </div>
      </aside>
    </div>
  {/if}
</div>
