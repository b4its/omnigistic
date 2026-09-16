<script lang="ts">
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, cartDetail, shippingCost, buyerReputation, type ResolvedCartItem, type Address, type PaymentMethod } from "$lib/stores/shop";
  import { CITIES } from "$lib/logistics";
  import { notify } from "$lib/toast";
  import { api, type CodRiskResult } from "$lib/api";
  import type { Reputation } from "$lib/shop/reputation";

  let items = $state<ResolvedCartItem[]>([]);
  let subtotal = $state(0);
  let savedAddress = $state<Address | null>(null);
  let reputation = $state<Reputation | null>(null);

  onMount(() => {
    shop.init();
    const unsub = cartDetail.subscribe((d) => {
      items = d.items;
      subtotal = d.subtotal;
    });
    const unsubShop = shop.subscribe((s) => (savedAddress = s.address));
    const unsubRep = buyerReputation.subscribe((r) => (reputation = r));
    return () => {
      unsub();
      unsubShop();
      unsubRep();
    };
  });

  // Form alamat
  let recipient = $state("");
  let phone = $state("");
  let street = $state("");
  let city = $state("Jakarta");

  // Metode bayar
  let payment = $state<PaymentMethod>("COD");

  // Bila COD tidak tersedia (produk/reputasi), paksa ke Transfer.
  $effect(() => {
    if (!codAllowed && payment === "COD") {
      payment = "Transfer";
      codResult = null;
    }
  });

  // State scoring COD
  let scoring = $state(false);
  let codResult = $state<CodRiskResult | null>(null);
  let scoringError = $state(false);
  let placedId = $state<string | null>(null);

  const itemsCodEligible = $derived(items.every((i) => i.product.codEligible));
  // COD hanya tersedia bila: semua produk mendukung COD DAN reputasi pembeli baik.
  const codAllowed = $derived(itemsCodEligible && !!reputation?.codAllowed);
  const codBlockedByReputation = $derived(!!reputation && !reputation.codAllowed);
  const shipping = $derived(shippingCost(items, city));
  const total = $derived(subtotal + shipping);
  const totalWeight = $derived(items.reduce((w, i) => w + i.product.weightKg * i.qty, 0));

  const phoneValid = $derived(/^[0-9+\-\s()]{8,}$/.test(phone.trim()));
  const addressValid = $derived(recipient.trim().length > 1 && phoneValid && street.trim().length > 4 && !!city);

  // Skor risiko COD diturunkan dari model Predictive: nilai paket, jam, berat→proxy
  // zona, alamat (street length→proxy ambiguitas ringan). Non-COD tidak di-skor.
  async function scoreCod(): Promise<void> {
    if (payment !== "COD" || !codAllowed) {
      codResult = null;
      return;
    }
    scoring = true;
    scoringError = false;
    try {
      const hour = new Date().getHours();
      // Heuristik fitur dari data keranjang (prototipe presentasi).
      const value = Math.min(500, Math.round(total / 1000)); // ribuan rupiah, cap 500rb
      const ambiguous = street.trim().length < 12 ? 1 : 0;
      const zone = totalWeight > 5 ? 2 : totalWeight > 2 ? 1 : 0;
      const res = await api.codRisk({
        hub_util: 68.9,
        value,
        hour,
        ambiguous,
        zone
      });
      codResult = res;
      notify({ message: `Kesiapan bayar COD dinilai: ${res.decision}`, type: "info", title: "Skor COD" });
    } catch {
      codResult = null;
      scoringError = true;
      notify({ message: "Gagal menilai kesiapan COD — coba lagi", type: "error", title: "Skor COD" });
    } finally {
      scoring = false;
    }
  }

  function choosePayment(m: PaymentMethod) {
    if (m === "COD" && !codAllowed) {
      notify({ message: "COD tidak tersedia untuk akun ini", type: "warn", title: "Pembayaran" });
      return;
    }
    payment = m;
    codResult = null;
    notify({ message: `Metode pembayaran: ${m === "COD" ? "Bayar di Tempat (COD)" : "Transfer / Digital"}`, type: "info", title: "Pembayaran" });
    if (m === "COD") void scoreCod();
  }

  function saveAddressIfNeeded(): boolean {
    if (!addressValid) return false;
    shop.saveAddress({ recipient: recipient.trim(), phone: phone.trim(), street: street.trim(), city });
    return true;
  }

  async function placeOrder() {
    if (!saveAddressIfNeeded() || items.length === 0) return;
    if (payment === "COD" && !codResult) {
      await scoreCod();
    }
    const orderItems = items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      emoji: i.product.emoji,
      price: i.product.price,
      qty: i.qty
    }));
    const id = shop.placeOrder({
      items: orderItems,
      subtotal,
      shipping,
      total,
      address: { recipient: recipient.trim(), phone: phone.trim(), street: street.trim(), city },
      payment,
      codScore: codResult?.score ?? null,
      codDecision: codResult?.decision ?? null
    });
    placedId = id;
    notify({ message: `Pesanan ${id} berhasil dibuat`, type: "success", title: "Checkout" });
  }

  const decisionLabel: Record<string, { text: string; tone: string; icon: string }> = {
    "antar-normal": { text: "Antar normal — pembayaran di tempat", tone: "bg-success/10 text-success-foreground border-success/30", icon: "check" },
    pudo: { text: "Konfirmasi kesiapan / PUDO disarankan", tone: "bg-warning/10 text-warning-foreground border-warning/30", icon: "bell" },
    "pre-payment": { text: "Disarankan pre-payment (risiko tinggi)", tone: "bg-destructive/10 text-destructive-foreground border-destructive/30", icon: "warn" }
  };
</script>

<div class="space-y-6">
  <header class="space-y-1">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Checkout</h1>
    <p class="text-sm text-muted-foreground">Lengkapi alamat &amp; metode bayar. Untuk COD, sistem menilai otomatis risiko pengantaran.</p>
  </header>

  {#if items.length === 0 && !placedId}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <p class="text-sm font-semibold text-foreground">Keranjang kosong</p>
      <a href={resolveHref("/dashboard/customer/overview")} class="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-5 py-2.5 text-sm font-semibold text-white">
        <Icon name="search" cls="h-4 w-4" /> Mulai belanja
      </a>
    </div>
  {:else if placedId}
    <!-- Sukses -->
    <div class="space-y-5 rounded-2xl border border-success/40 bg-card p-8 text-center">
      <span class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success text-success-foreground"><Icon name="check" cls="h-8 w-8" weight="bold" /></span>
      <div class="space-y-1">
        <h2 class="font-heading text-lg font-semibold text-foreground">Pesanan dibuat!</h2>
        <p class="text-sm text-muted-foreground">ID pesanan <span class="font-mono font-semibold text-foreground">{placedId}</span></p>
      </div>
      {#if payment === "COD" && codResult}
        {@const d = decisionLabel[codResult.decision] ?? { text: codResult.decision, tone: "bg-muted text-foreground", icon: "bell" }}
        <div class="mx-auto max-w-md rounded-xl border {d.tone} p-4 text-sm">
          <span class="inline-flex items-center gap-2 font-semibold"><Icon name={d.icon as never} cls="h-4 w-4" weight="bold" /> {d.text}</span>
          <p class="mt-1 text-xs opacity-90">Skor risiko COD {(codResult.score * 100).toFixed(0)}% · perkiraan tunggu {codResult.pickupWaitMin} menit.</p>
        </div>
      {/if}
      <div class="flex flex-wrap justify-center gap-3">
        <a href={resolveHref("/dashboard/customer/orders")} class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px">
          <Icon name="map" cls="h-4 w-4" /> Lacak pesanan
        </a>
        <a href={resolveHref("/dashboard/customer/overview")} class="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent">Belanja lagi</a>
      </div>
    </div>
  {:else}
    <div class="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div class="space-y-5">
        <!-- Alamat -->
        <section class="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon name="map" cls="h-4 w-4 text-primary" /> Alamat pengiriman</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1.5 text-xs font-medium text-muted-foreground">
              Nama penerima
              <input type="text" autocomplete="name" bind:value={recipient} placeholder="mis. Sari Wulandari" class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50" />
            </label>
            <label class="space-y-1.5 text-xs font-medium text-muted-foreground">
              Nomor HP
              <input type="tel" inputmode="tel" autocomplete="tel" bind:value={phone} placeholder="08xxxxxxxxxx" class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50" />
            </label>
            <label class="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
              Alamat lengkap
              <textarea autocomplete="street-address" bind:value={street} rows="2" placeholder="Jl. Raya Jakarta-Bogor No.12, RT 03/RW 05" class="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"></textarea>
            </label>
            <label class="space-y-1.5 text-xs font-medium text-muted-foreground">
              Kota
              <select bind:value={city} class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50">
                {#each CITIES as c (c)}<option value={c}>{c}</option>{/each}
              </select>
            </label>
          </div>
          {#if savedAddress}
            <p class="text-xs text-muted-foreground">Tersimpan sebelumnya: {savedAddress.recipient} · {savedAddress.city}. Isi ulang untuk mengubah.</p>
          {/if}
        </section>

        <!-- Metode bayar -->
        <section class="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon name="currency" cls="h-4 w-4 text-primary" /> Metode pembayaran</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onclick={() => choosePayment("COD")}
              disabled={!codAllowed}
              aria-pressed={payment === "COD"}
              class="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 {payment === 'COD' ? 'border-primary bg-accent' : 'border-border hover:border-primary/40'}"
            >
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Icon name="currency" cls="h-4 w-4" /></span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-foreground">Bayar di Tempat (COD)</span>
                <span class="block text-xs text-muted-foreground">Bayar tunai saat paket tiba.</span>
                {#if codBlockedByReputation}
                  <span class="mt-1 block text-xs font-medium text-destructive-foreground">Tidak tersedia untuk akunmu — reputasi belum memenuhi syarat.</span>
                {:else if !itemsCodEligible}
                  <span class="mt-1 block text-xs font-medium text-warning-foreground">Ada item berat yang belum mendukung COD.</span>
                {:else}
                  <span class="mt-1 block text-xs font-medium text-success-foreground">Tersedia untuk akunmu.</span>
                {/if}
              </span>
            </button>
            <button
              type="button"
              onclick={() => choosePayment("Transfer")}
              aria-pressed={payment === "Transfer"}
              class="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors {payment === 'Transfer' ? 'border-primary bg-accent' : 'border-border hover:border-primary/40'}"
            >
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><Icon name="shield" cls="h-4 w-4" /></span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-foreground">Transfer / Digital</span>
                <span class="block text-xs text-muted-foreground">Bayar di muka, tanpa perlu skor risiko. Pengantaran paling cepat.</span>
              </span>
            </button>
          </div>

          {#if payment === "COD"}
            <div class="rounded-xl border border-border bg-muted/40 p-4">
              {#if scoring}
                <p class="flex items-center gap-2 text-sm text-muted-foreground"><Icon name="dots" cls="h-4 w-4 animate-pulse" weight="bold" /> Menyiapkan pengantaran COD…</p>
              {:else if scoringError}
                <p class="text-sm text-muted-foreground">Pengantaran COD akan dikonfirmasi kurir sebelum tiba.</p>
              {:else if codResult}
                {@const d = decisionLabel[codResult.decision] ?? { text: codResult.decision, tone: "bg-muted text-foreground", icon: "bell" }}
                <div class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold {d.tone}">
                  <Icon name={d.icon as never} cls="h-3.5 w-3.5" weight="bold" /> {d.text}
                  <span class="font-normal opacity-80">· perkiraan tunggu {codResult.pickupWaitMin} menit</span>
                </div>
              {:else}
                <button type="button" onclick={() => scoreCod()} class="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent">
                  <Icon name="chart" cls="h-4 w-4" /> Cek kesiapan pengantaran COD
                </button>
              {/if}
            </div>
          {/if}
        </section>
      </div>

      <!-- Ringkasan -->
      <aside class="lg:sticky lg:top-4 lg:self-start">
        <div class="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 class="text-sm font-semibold text-foreground">Ringkasan</h2>
          <ul class="space-y-2">
            {#each items as it (it.product.id)}
              <li class="flex items-center gap-2 text-sm">
                <span class="text-lg" aria-hidden="true">{it.product.emoji}</span>
                <span class="min-w-0 flex-1 truncate text-muted-foreground">{it.product.name} × {it.qty}</span>
                <span class="shrink-0 font-medium tabular-nums text-foreground">{formatRupiah(it.lineTotal)}</span>
              </li>
            {/each}
          </ul>
          <dl class="space-y-2 border-t border-border pt-3 text-sm">
            <div class="flex justify-between"><dt class="text-muted-foreground">Subtotal</dt><dd class="font-medium tabular-nums text-foreground">{formatRupiah(subtotal)}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Ongkir · {city}</dt><dd class="font-medium tabular-nums text-foreground">{formatRupiah(shipping)}</dd></div>
            <div class="flex justify-between border-t border-border pt-3 text-base"><dt class="font-semibold text-foreground">Total</dt><dd class="font-bold tabular-nums text-foreground">{formatRupiah(total)}</dd></div>
          </dl>
          <button
            type="button"
            onclick={() => placeOrder()}
            disabled={!addressValid || scoring}
            class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="check" cls="h-4 w-4" weight="bold" /> Buat pesanan
          </button>
          {#if !addressValid}<p class="text-center text-xs text-muted-foreground">Lengkapi alamat untuk melanjutkan.</p>{/if}
        </div>
      </aside>
    </div>
  {/if}
</div>
