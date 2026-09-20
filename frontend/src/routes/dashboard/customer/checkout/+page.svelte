<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import Icon from "$lib/components/Icon.svelte";
  import { formatRupiah, productName } from "$lib/shop/catalog";
  import { shop, cartDetail, shippingCost, buyerReputation, type ResolvedCartItem, type Address, type PaymentMethod } from "$lib/stores/shop";
  import { CITIES, CITY_ROUTES, type City } from "$lib/logistics";
  import CoordPicker from "$lib/map/CoordPicker.svelte";
  import { notify } from "$lib/toast";
  import { api, type CodRiskResult, type Hub } from "$lib/api";
  import type { Reputation } from "$lib/shop/reputation";

  let items = $state<ResolvedCartItem[]>([]);
  let subtotal = $state(0);
  let savedAddress = $state<Address | null>(null);
  let reputation = $state<Reputation | null>(null);
  // Utilisasi hub nyata (Table 1) untuk fitur model COD — bukan konstanta hardcode.
  let hubs = $state<Hub[]>([]);

  onMount(() => {
    shop.init();
    void api.hubs().then((h) => (hubs = h)).catch(() => (hubs = []));
    const unsub = cartDetail.subscribe((d) => {
      items = d.items;
      subtotal = d.subtotal;
    });
    const unsubShop = shop.subscribe((s) => {
      savedAddress = s.address;
      if (s.address) {
        if (!recipient) recipient = s.address.recipient ?? "";
        if (!phone) phone = s.address.phone ?? "";
        if (!street) street = s.address.street ?? "";
        if (s.address.city) city = s.address.city;
        if (typeof s.address.lat === "number") selectedLat = s.address.lat;
        if (typeof s.address.lng === "number") selectedLng = s.address.lng;
      }
    });
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
  let selectedLat = $state<number | null>(null);
  let selectedLng = $state<number | null>(null);
  let showCoordMap = $state(false);

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

  // Kota → hub pengantar (Jabodetabek dilayani hub Jakarta). Sumber: Table 1.
  const CITY_HUB: Record<string, string> = { Jakarta: "Jakarta", Depok: "Jakarta", Tangerang: "Jakarta", Bogor: "Jakarta", Bandung: "Bandung", Surabaya: "Surabaya" };
  /** Utilisasi hub nyata (Table 1) untuk kota tujuan; fallback rata-rata hub bila data belum termuat. */
  function hubUtilForCity(c: string): number {
    const name = CITY_HUB[c] ?? "Jakarta";
    const h = hubs.find((x) => x.name === name);
    if (h) return h.utilizationPct;
    if (hubs.length) return hubs.reduce((s, x) => s + x.utilizationPct, 0) / hubs.length;
    return 60; // fallback kasar bila /api/hubs offline (model tetap jalan)
  }

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
        hub_util: hubUtilForCity(city),
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
      notify({ message: m.ck2t1(), type: "error", title: "Skor COD" });
    } finally {
      scoring = false;
    }
  }

  function choosePayment(method: PaymentMethod) {
    if (method === "COD" && !codAllowed) {
      notify({ message: m.ck2t2(), type: "warn", title: m.ck2t9() });
      return;
    }
    payment = method;
    codResult = null;
    notify({ message: `${m.ck2t3()}: ${method === "COD" ? m.ck2t3() : m.ck2t8()}`, type: "info", title: m.ck2t9() });
    if (method === "COD") void scoreCod();
  }

  function onCityChange() {
    const c = city as City;
    if (CITY_ROUTES[c]) {
      selectedLat = CITY_ROUTES[c].dest[0];
      selectedLng = CITY_ROUTES[c].dest[1];
    }
  }

  function getEffectiveCoord(): { lat: number; lng: number } {
    const c = city as City;
    const fallback = CITY_ROUTES[c]?.dest ?? CITY_ROUTES.Jakarta.dest;
    return {
      lat: selectedLat ?? fallback[0],
      lng: selectedLng ?? fallback[1]
    };
  }

  function saveAddressIfNeeded(): boolean {
    if (!addressValid) return false;
    const coord = getEffectiveCoord();
    shop.saveAddress({
      recipient: recipient.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city,
      lat: coord.lat,
      lng: coord.lng
    });
    return true;
  }

  async function placeOrder() {
    if (!saveAddressIfNeeded() || items.length === 0) return;
    if (payment === "COD" && !codResult) {
      await scoreCod();
    }
    const coord = getEffectiveCoord();
    const orderItems = items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      icon: i.product.icon,
      price: i.product.price,
      qty: i.qty
    }));
    const id = shop.placeOrder({
      items: orderItems,
      subtotal,
      shipping,
      total,
      address: {
        recipient: recipient.trim(),
        phone: phone.trim(),
        street: street.trim(),
        city,
        lat: coord.lat,
        lng: coord.lng
      },
      payment,
      codScore: codResult?.score ?? null,
      codDecision: codResult?.decision ?? null
    });
    placedId = id;
    notify({ message: m.ck3t1({ id }), type: "success", title: "Checkout" });
  }

  const decisionLabel: Record<string, { text: string; tone: string; icon: string }> = {
    "antar-normal": { text: m.ck2t4(), tone: "bg-success/10 text-success-foreground border-success/30", icon: "check" },
    pudo: { text: "Konfirmasi kesiapan / PUDO disarankan", tone: "bg-warning/10 text-warning-foreground border-warning/30", icon: "bell" },
    "pre-payment": { text: m.ck2t5(), tone: "bg-destructive/10 text-destructive-foreground border-destructive/30", icon: "warn" }
  };
</script>

<div class="space-y-6">
  <header class="space-y-1">
    <h1 class="font-heading text-xl font-semibold tracking-tight">{m.ck01()}</h1>
    <p class="text-sm text-muted-foreground">{m.ck02()}</p>
  </header>

  {#if items.length === 0 && !placedId}
    <div class="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <p class="text-sm font-semibold text-foreground">{m.ck03()}</p>
      <a href={resolveHref("/dashboard/customer/overview")} class="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)]">
        <Icon name="search" cls="h-4 w-4" /> {m.ck04()}
      </a>
    </div>
  {:else if placedId}
    <!-- Sukses -->
    <div class="space-y-5 rounded-2xl border border-success/40 bg-card p-8 text-center">
      <span class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success text-success-foreground"><Icon name="check" cls="h-8 w-8" weight="bold" /></span>
      <div class="space-y-1">
        <h2 class="font-heading text-lg font-semibold text-foreground">{m.ck05()}</h2>
        <p class="text-sm text-muted-foreground">{m.ck06()} <span class="font-mono font-semibold text-foreground">{placedId}</span></p>
      </div>
      {#if payment === "COD" && codResult}
        {@const d = decisionLabel[codResult.decision] ?? { text: codResult.decision, tone: "bg-muted text-foreground", icon: "bell" }}
        <div class="mx-auto max-w-md rounded-xl border {d.tone} p-4 text-sm">
          <span class="inline-flex items-center gap-2 font-semibold"><Icon name={d.icon as never} cls="h-4 w-4" weight="bold" /> {d.text}</span>
          <p class="mt-1 text-xs opacity-90">Skor risiko COD {(codResult.score * 100).toFixed(0)}%{#if codResult.pickupWaitMin != null} · perkiraan tunggu {codResult.pickupWaitMin} menit{/if}.</p>
        </div>
      {/if}
      <div class="flex flex-wrap justify-center gap-3">
        <a href={resolveHref("/dashboard/customer/orders")} class="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px">
          <Icon name="map" cls="h-4 w-4" /> {m.ck07()}
        </a>
        <a href={resolveHref("/dashboard/customer/overview")} class="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent">{m.ck08()}</a>
      </div>
    </div>
  {:else}
    <div class="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div class="space-y-5">
        <!-- Alamat -->
        <section class="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon name="map" cls="h-4 w-4 text-primary" /> {m.ck09()}</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1.5 text-xs font-medium text-muted-foreground">
              {m.ck10()}
              <input type="text" autocomplete="name" bind:value={recipient} placeholder="mis. Sari Wulandari" class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50" />
            </label>
            <label class="space-y-1.5 text-xs font-medium text-muted-foreground">
              {m.ck11()}
              <input type="tel" inputmode="tel" autocomplete="tel" bind:value={phone} placeholder="08xxxxxxxxxx" class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50" />
            </label>
            <label class="space-y-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
              {m.ck12()}
              <textarea autocomplete="street-address" bind:value={street} rows="2" placeholder="Jl. Raya Jakarta-Bogor No.12, RT 03/RW 05" class="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"></textarea>
            </label>
            <!-- Pilihan Wilayah & Koordinat dari Peta -->
            <div class="sm:col-span-2 space-y-3 border-t border-border pt-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Icon name="map" cls="h-4 w-4 text-primary" /> {m.ck13()}
                  </span>
                  <p class="text-[11px] text-muted-foreground">
                    {m.ck14()}
                  </p>
                </div>
                <button
                  type="button"
                  onclick={() => (showCoordMap = !showCoordMap)}
                  aria-expanded={showCoordMap}
                  class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
                >
                  <Icon name="target" cls="h-3.5 w-3.5 text-[var(--bitcoin)]" />
                  <span>{showCoordMap ? m.ck2t6() : m.ck2t7()}</span>
                </button>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="space-y-1.5 text-xs font-medium text-muted-foreground">
                  {m.ck15()}
                  <select
                    bind:value={city}
                    onchange={onCityChange}
                    class="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
                  >
                    {#each CITIES as c (c)}<option value={c}>{c}</option>{/each}
                  </select>
                </label>

                <div class="space-y-1.5 text-xs font-medium text-muted-foreground">
                  <span>{m.ck16()}</span>
                  <div class="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs font-mono text-foreground">
                    <span class="truncate">
                      {#if selectedLat != null && selectedLng != null}
                        {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
                      {:else}
                        {CITY_ROUTES[city as City]?.dest[0] ?? "-6.20864"}, {CITY_ROUTES[city as City]?.dest[1] ?? "106.84566"}
                      {/if}
                    </span>
                    <span class="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{m.ck17()}</span>
                  </div>
                </div>
              </div>

              {#if showCoordMap}
                <CoordPicker
                  bind:lat={selectedLat}
                  bind:lng={selectedLng}
                  bind:city
                />
              {/if}
            </div>
          </div>
          {#if savedAddress}
            <p class="text-xs text-muted-foreground">
              Tersimpan sebelumnya: {savedAddress.recipient} · {savedAddress.city}
              {#if savedAddress.lat != null && savedAddress.lng != null}
                (GPS {savedAddress.lat.toFixed(4)}, {savedAddress.lng.toFixed(4)})
              {/if}.
              {m.ck3f1()}
            </p>
          {/if}
        </section>

        <!-- Metode bayar -->
        <section class="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 class="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon name="currency" cls="h-4 w-4 text-primary" /> {m.ck18()}</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onclick={() => choosePayment("COD")}
              disabled={!codAllowed}
              aria-pressed={payment === "COD"}
              class="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 {payment === 'COD' ? 'border-primary bg-accent' : 'border-border hover:border-primary/40'}"
            >
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]"><Icon name="currency" cls="h-4 w-4" /></span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-foreground">{m.ck19()}</span>
                <span class="block text-xs text-muted-foreground">{m.ck20()}</span>
                {#if codBlockedByReputation}
                  <span class="mt-1 block text-xs font-medium text-destructive-foreground">{m.ck21()}</span>
                {:else if !itemsCodEligible}
                  <span class="mt-1 block text-xs font-medium text-warning-foreground">{m.ck22()}</span>
                {:else}
                  <span class="mt-1 block text-xs font-medium text-success-foreground">{m.ck23()}</span>
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
                <span class="block text-sm font-semibold text-foreground">{m.ck24()}</span>
                <span class="block text-xs text-muted-foreground">{m.ck25()}</span>
              </span>
            </button>
          </div>

          {#if payment === "COD"}
            <div class="rounded-xl border border-border bg-muted/40 p-4">
              {#if scoring}
                <p class="flex items-center gap-2 text-sm text-muted-foreground"><Icon name="dots" cls="h-4 w-4 animate-pulse" weight="bold" /> {m.ck26()}</p>
              {:else if scoringError}
                <p class="text-sm text-muted-foreground">{m.ck27()}</p>
              {:else if codResult}
                {@const d = decisionLabel[codResult.decision] ?? { text: codResult.decision, tone: "bg-muted text-foreground", icon: "bell" }}
                <div class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold {d.tone}">
                  <Icon name={d.icon as never} cls="h-3.5 w-3.5" weight="bold" /> {d.text}
                  {#if codResult.pickupWaitMin != null}<span class="font-normal opacity-80">· perkiraan tunggu {codResult.pickupWaitMin} menit</span>{/if}
                </div>
              {:else}
                <button type="button" onclick={() => scoreCod()} class="inline-flex items-center gap-2 rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent">
                  <Icon name="chart" cls="h-4 w-4" /> {m.ck28()}
                </button>
              {/if}
            </div>
          {/if}
        </section>
      </div>

      <!-- Ringkasan -->
      <aside class="lg:sticky lg:top-4 lg:self-start">
        <div class="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 class="text-sm font-semibold text-foreground">{m.ck29()}</h2>
          <ul class="space-y-2">
            {#each items as it (it.product.id)}
              <li class="flex items-center gap-2 text-sm">
                <Icon name={it.product.icon} cls="h-4.5 w-4.5" style="color:{it.product.accent}" />
                <span class="min-w-0 flex-1 truncate text-muted-foreground">{productName(it.product.id, it.product.name)} × {it.qty}</span>
                <span class="shrink-0 font-medium tabular-nums text-foreground">{formatRupiah(it.lineTotal)}</span>
              </li>
            {/each}
          </ul>
          <dl class="space-y-2 border-t border-border pt-3 text-sm">
            <div class="flex justify-between"><dt class="text-muted-foreground">{m.ck30()}</dt><dd class="font-medium tabular-nums text-foreground">{formatRupiah(subtotal)}</dd></div>
            <div class="flex justify-between"><dt class="text-muted-foreground">Ongkir · {city}</dt><dd class="font-medium tabular-nums text-foreground">{formatRupiah(shipping)}</dd></div>
            <div class="flex justify-between border-t border-border pt-3 text-base"><dt class="font-semibold text-foreground">{m.ck31()}</dt><dd class="font-bold tabular-nums text-foreground">{formatRupiah(total)}</dd></div>
          </dl>
          <button
            type="button"
            onclick={() => placeOrder()}
            disabled={!addressValid || scoring}
            class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="check" cls="h-4 w-4" weight="bold" /> {m.ck32()}
          </button>
          {#if !addressValid}<p class="text-center text-xs text-muted-foreground">{m.ck33()}</p>{/if}
        </div>
      </aside>
    </div>
  {/if}
</div>
