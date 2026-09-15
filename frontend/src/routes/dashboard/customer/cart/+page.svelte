<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, cartDetail, shippingCost, type ResolvedCartItem } from "$lib/stores/shop";
  import { notify } from "$lib/toast";

  let items = $state<ResolvedCartItem[]>([]);
  let subtotal = $state(0);

  onMount(() => {
    shop.init();
    const unsub = cartDetail.subscribe((d) => {
      items = d.items;
      subtotal = d.subtotal;
    });
    return unsub;
  });

  const totalItems = $derived(items.reduce((n, i) => n + i.qty, 0));
  const totalWeight = $derived(items.reduce((w, i) => w + i.product.weightKg * i.qty, 0));
  const estShipping = $derived(items.length ? shippingCost(items, "Jakarta") : 0);

  function more(productId: string, qty: number, name: string) {
    shop.setQty(productId, qty + 1);
    notify({ message: `${name} → jumlah ${qty + 1}`, type: "info", title: "Keranjang" });
  }
  function less(productId: string, qty: number, name: string) {
    shop.setQty(productId, qty - 1);
    notify({ message: qty - 1 <= 0 ? `${name} dihapus dari keranjang` : `${name} → jumlah ${qty - 1}`, type: "info", title: "Keranjang" });
  }
  function remove(productId: string, name: string) {
    shop.removeFromCart(productId);
    notify({ message: `${name} dihapus dari keranjang`, type: "warn", title: "Keranjang" });
  }
  function clearAll() {
    shop.clearCart();
    notify({ message: "Keranjang dikosongkan", type: "warn", title: "Keranjang" });
  }
</script>

<div class="space-y-6">
  <header class="flex items-center justify-between gap-4">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Keranjang</h1>
      <p class="text-sm text-muted-foreground">{totalItems} item · perkiraan berat {totalWeight.toFixed(1)} kg</p>
    </div>
    {#if items.length > 0}
      <button type="button" onclick={clearAll} class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive-foreground">
        <Icon name="trash" cls="h-3.5 w-3.5" /> Kosongkan
      </button>
    {/if}
  </header>

  {#if items.length === 0}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <span class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="stack" cls="h-7 w-7" /></span>
      <p class="mt-4 text-base font-semibold text-foreground">Keranjang masih kosong</p>
      <p class="mt-1 text-sm text-muted-foreground">Yuk, cari produk favoritmu di toko.</p>
      <a href={resolveHref("/dashboard/customer/overview")} class="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px">
        <Icon name="search" cls="h-4 w-4" /> Mulai belanja
      </a>
    </div>
  {:else}
    <div class="grid gap-5 lg:grid-cols-[1fr_340px]">
      <!-- Daftar item -->
      <ul class="space-y-3">
        {#each items as it (it.product.id)}
          <li class="flex gap-4 rounded-2xl border border-border bg-card p-4">
            <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl" style="background:color-mix(in srgb, {it.product.accent} 12%, var(--color-card))">
              <span class="text-3xl" aria-hidden="true">{it.product.emoji}</span>
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="truncate text-sm font-semibold text-foreground">{it.product.name}</h3>
                  <p class="text-xs text-muted-foreground">{it.product.category} · {it.product.store}</p>
                </div>
                <button type="button" onclick={() => remove(it.product.id, it.product.name)} aria-label={`Hapus ${it.product.name}`} class="shrink-0 text-muted-foreground transition-colors hover:text-destructive-foreground">
                  <Icon name="trash" cls="h-4 w-4" />
                </button>
              </div>
              <div class="mt-auto flex items-center justify-between gap-3">
                <div class="inline-flex items-center rounded-full border border-border">
                  <button type="button" onclick={() => less(it.product.id, it.qty, it.product.name)} aria-label="Kurangi jumlah" class="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted"><span aria-hidden="true">−</span></button>
                  <span class="w-8 text-center text-sm font-semibold tabular-nums text-foreground">{it.qty}</span>
                  <button type="button" onclick={() => more(it.product.id, it.qty, it.product.name)} aria-label="Tambah jumlah" class="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted"><Icon name="plus" cls="h-3.5 w-3.5" weight="bold" /></button>
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
          <h2 class="text-sm font-semibold text-foreground">Ringkasan pesanan</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-muted-foreground">Subtotal ({totalItems} item)</dt><dd class="font-medium tabular-nums text-foreground">{formatRupiah(subtotal)}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Ongkir (est. Jakarta)</dt><dd class="font-medium tabular-nums text-foreground">{formatRupiah(estShipping)}</dd></div>
            <div class="mt-2 flex justify-between border-t border-border pt-3 text-base"><dt class="font-semibold text-foreground">Total</dt><dd class="font-bold tabular-nums text-foreground">{formatRupiah(subtotal + estShipping)}</dd></div>
          </dl>
          <a href={resolveHref("/dashboard/customer/checkout")} class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-px">
            <Icon name="currency" cls="h-4 w-4" /> Lanjut ke checkout
          </a>
          <a href={resolveHref("/dashboard/customer/overview")} class="block text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Lanjut belanja</a>
        </div>
      </aside>
    </div>
  {/if}
</div>
