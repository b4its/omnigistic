<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref, numId } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import { PRODUCTS, CATEGORIES, searchProducts, formatRupiah, type Product } from "$lib/shop/catalog";
  import { shop, cartCount, orderCount, buyerReputation } from "$lib/stores/shop";
  import { BUYER_PERSONAS, type Reputation } from "$lib/shop/reputation";
  import { notify } from "$lib/toast";

  let query = $state("");
  let category = $state<string>("Semua");
  let sort = $state<"populer" | "murah" | "mahal" | "rating">("populer");
  let cart = $state(0);
  let orders = $state(0);
  let rep = $state<Reputation | null>(null);
  let buyerId = $state(BUYER_PERSONAS[0].id);
  let justAdded = $state<string | null>(null);
  let addedTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    shop.init();
    const unsubCart = cartCount.subscribe((n) => (cart = n));
    const unsubOrders = orderCount.subscribe((n) => (orders = n));
    const unsubRep = buyerReputation.subscribe((r) => (rep = r));
    const unsubShop = shop.subscribe((s) => (buyerId = s.buyerId));
    return () => {
      unsubCart();
      unsubOrders();
      unsubRep();
      unsubShop();
      if (addedTimer) clearTimeout(addedTimer);
    };
  });

  function setPersona(id: string) {
    shop.setBuyer(id);
    const p = BUYER_PERSONAS.find((x) => x.id === id);
    notify({ message: `Mode demo: ${p?.name} (${id === "BUY-GOOD" ? "reputasi baik" : "reputasi buruk"})`, type: "info", title: "Persona" });
  }

  function setCategory(c: string) {
    category = c;
    notify({ message: `Kategori: ${c}`, type: "info", title: "Filter" });
  }

  function setSort(s: typeof sort) {
    sort = s;
    const label: Record<string, string> = { populer: "Terpopuler", murah: "Harga terendah", mahal: "Harga tertinggi", rating: "Rating tertinggi" };
    notify({ message: `Urutkan: ${label[s]}`, type: "info", title: "Filter" });
  }

  const results = $derived.by(() => {
    const list = searchProducts(query, category);
    const sorted = [...list];
    switch (sort) {
      case "murah":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "mahal":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      default:
        sorted.sort((a, b) => b.sold - a.sold);
    }
    return sorted;
  });

  const discountPct = (p: Product) => (p.strikePrice ? Math.round((1 - p.price / p.strikePrice) * 100) : 0);

  function addToCart(p: Product) {
    shop.addToCart(p.id, 1);
    justAdded = p.id;
    if (addedTimer) clearTimeout(addedTimer);
    addedTimer = setTimeout(() => (justAdded = null), 1400);
    notify({ message: `${p.name} ditambahkan ke keranjang`, type: "success", title: "Keranjang" });
  }
</script>

<div class="space-y-6">
  <!-- Header toko + ringkasan -->
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <h1 class="font-heading text-xl font-semibold tracking-tight">Omnigistic Shop</h1>
      <p class="text-sm text-muted-foreground">Belanja dari ribuan penjual — cari produk, masukkan keranjang, checkout, lalu bayar COD atau transfer.</p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <a href={resolveHref("/dashboard/customer/orders")} class="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent">
        <Icon name="map" cls="h-4 w-4" /> Pesanan<span class="rounded-full bg-muted px-1.5 text-xs tabular-nums">{orders}</span>
      </a>
      <a href={resolveHref("/dashboard/customer/cart")} class="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-px">
        <Icon name="stack" cls="h-4 w-4" /> Keranjang
        {#if cart > 0}<span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)]-foreground px-1 text-xs font-bold text-primary tabular-nums">{cart}</span>{/if}
      </a>
    </div>
  </header>

  <!-- Status reputasi (pembeli hanya lihat status, bukan skor internal) -->
  {#if rep}
    <section class="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between {rep.codAllowed ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}">
      <div class="flex items-start gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl {rep.codAllowed ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}">
          <Icon name={rep.codAllowed ? "check" : "warn"} cls="h-5 w-5" weight="bold" />
        </span>
        <div class="space-y-0.5">
          <p class="text-sm font-semibold text-foreground">{rep.codAllowed ? "Reputasi baik — COD tersedia" : "Reputasi buruk — COD tidak tersedia"}</p>
          <p class="text-xs text-muted-foreground">{rep.buyerNote}</p>
        </div>
      </div>
      <!-- Pengalih persona demo (presentasi): tunjukkan kedua skenario -->
      <div class="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card p-1">
        {#each BUYER_PERSONAS as p (p.id)}
          <button
            type="button"
            onclick={() => setPersona(p.id)}
            aria-pressed={buyerId === p.id}
            class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors {buyerId === p.id ? 'bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] text-white shadow-[0_0_16px_-5px_var(--glow)]' : 'text-muted-foreground hover:text-foreground'}"
          >{p.id === "BUY-GOOD" ? "Demo: baik" : "Demo: buruk"}</button>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Banner alur -->
  <section class="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-4">
    {#each [
      { icon: "search", t: "Cari produk", d: "Filter kategori & urutkan" },
      { icon: "stack", t: "Keranjang", d: "Atur jumlah item" },
      { icon: "currency", t: "Checkout", d: "COD bila reputasi baik" },
      { icon: "map", t: "Lacak kirim", d: "Sampai ke tanganmu" }
    ] as step, i (step.t)}
      <div class="flex items-start gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon name={step.icon as never} cls="h-4 w-4" /></span>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-foreground">{i + 1}. {step.t}</p>
          <p class="text-xs text-muted-foreground">{step.d}</p>
        </div>
      </div>
    {/each}
  </section>

  <!-- Search + filter -->
  <section class="space-y-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label class="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 transition-colors focus-within:border-primary/50">
        <Icon name="search" cls="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          enterkeyhint="search"
          bind:value={query}
          placeholder="Cari produk, kategori, atau toko…"
          aria-label="Cari produk"
          class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
        />
        {#if query}
          <button type="button" onclick={() => { query = ""; notify({ message: "Pencarian dihapus", type: "info", title: "Belanja" }); }} aria-label="Hapus pencarian" class="text-muted-foreground hover:text-foreground"><Icon name="x" cls="h-4 w-4" /></button>
        {/if}
      </label>
      <label class="flex items-center gap-2 text-sm text-muted-foreground">
        <span class="shrink-0">Urutkan</span>
        <select value={sort} onchange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as typeof sort)} aria-label="Urutkan produk" class="rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50">
          <option value="populer">Terpopuler</option>
          <option value="murah">Harga terendah</option>
          <option value="mahal">Harga tertinggi</option>
          <option value="rating">Rating tertinggi</option>
        </select>
      </label>
    </div>

    <div class="flex flex-wrap gap-2">
      {#each CATEGORIES as c (c)}
        <button
          type="button"
          onclick={() => setCategory(c)}
          aria-pressed={category === c}
          class="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors {category === c ? 'border-transparent bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] text-white shadow-[0_0_16px_-5px_var(--glow)]' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}"
        >
          {c}
        </button>
      {/each}
    </div>
    <p class="text-xs text-muted-foreground">{results.length} dari {PRODUCTS.length} produk</p>
  </section>

  <!-- Grid produk -->
  {#if results.length === 0}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Icon name="search" cls="h-6 w-6" /></span>
      <p class="mt-3 text-sm font-semibold text-foreground">Produk tidak ditemukan</p>
      <p class="text-xs text-muted-foreground">Coba kata kunci lain atau ubah kategori.</p>
    </div>
  {:else}
    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each results as p (p.id)}
        <article class="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40">
          <div class="relative flex h-36 items-center justify-center" style="background:color-mix(in srgb, {p.accent} 12%, var(--color-card))">
            <Icon name={p.icon} cls="h-14 w-14" style="color:{p.accent}" />
            {#if p.strikePrice}<span class="absolute left-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">-{discountPct(p)}%</span>{/if}
            {#if p.tags?.includes("COD")}<span class="absolute right-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-bold text-foreground ring-1 ring-border">COD</span>{/if}
          </div>
          <div class="flex min-h-0 flex-1 flex-col gap-2 p-4">
            <div class="min-w-0 flex-1">
              <h3 class="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{p.name}</h3>
              <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span class="inline-flex items-center gap-0.5 font-semibold text-warning-foreground"><Icon name="sparkles" cls="h-3 w-3" weight="bold" /> {numId(p.rating, 1)}</span>
              <span>·</span>
              <span>{new Intl.NumberFormat("id-ID").format(p.sold)} terjual</span>
            </div>
            <div class="flex items-end justify-between gap-2">
              <div class="min-w-0">
                {#if p.strikePrice}<p class="text-[11px] text-muted-foreground line-through">{formatRupiah(p.strikePrice)}</p>{/if}
                <p class="text-base font-bold text-foreground">{formatRupiah(p.price)}</p>
              </div>
              <span class="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"><Icon name="map" cls="h-3 w-3" /> {p.store}</span>
            </div>
            <button
              type="button"
              onclick={() => addToCart(p)}
              class="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 px-3 py-2 text-sm font-semibold transition-colors {justAdded === p.id ? 'border-success bg-success text-success-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'}"
            >
              <Icon name={justAdded === p.id ? "check" : "plus"} cls="h-4 w-4" weight="bold" />
              {justAdded === p.id ? "Ditambahkan" : "Keranjang"}
            </button>
          </div>
        </article>
      {/each}
    </section>
  {/if}
</div>
