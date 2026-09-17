<script lang="ts">
  /**
   * Jembatan pesanan NYATA → halaman simulasi COD.
   *
   * Halaman simulasi COD (cod-cash, cod-intel) sebelumnya 100% data backend dan
   * tak terhubung ke pesanan pembeli. Komponen ini menampilkan ringkasan singkat
   * dari pesanan COD NYATA (store bersama) agar pengguna melihat kaitan antara
   * angka simulasi dan alur pengantaran mereka sendiri — tetap jelas bahwa angka
   * simulasi bersifat prototipe.
   */
  import { onMount } from "svelte";
  import { resolveHref } from "$lib/utils";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, codTriageOrders, type Order } from "$lib/stores/shop";
  import Icon from "$lib/components/Icon.svelte";

  let orders = $state<Order[]>([]);
  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    return unsub;
  });

  const cod = $derived(codTriageOrders(orders));
  const totalValue = $derived(cod.reduce((s, o) => s + o.total, 0));
  const outstanding = $derived(cod.filter((o) => !o.codCollected).length);
  const atRisk = $derived(cod.filter((o) => o.codDecision !== null && o.codDecision !== "antar-normal" && !o.routedToPudo).length);
</script>

<section class="rounded-2xl border border-border bg-card p-5">
  <div class="flex flex-wrap items-end justify-between gap-2">
    <div>
      <p class="text-base font-semibold">Pesanan COD kamu (nyata)</p>
      <p class="text-[13.5px] text-muted-foreground">
        Angka simulasi di halaman ini bersifat prototipe; ringkasan di bawah berasal dari pesanan pembeli nyata.
      </p>
    </div>
    <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">
      Buka tugas pengantaran
    </a>
  </div>

  {#if cod.length === 0}
    <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Belum ada pesanan COD</p>
      <p class="mt-1 text-xs text-muted-foreground">Buat pesanan COD di portal Customer; ringkasannya akan muncul di sini.</p>
    </div>
  {:else}
    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-border bg-background/40 p-4">
        <p class="text-xs text-muted-foreground">Pesanan COD</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{cod.length}</p>
        <p class="mt-0.5 text-xs text-muted-foreground">{outstanding} belum ditagih</p>
      </div>
      <div class="rounded-xl border border-border bg-background/40 p-4">
        <p class="text-xs text-muted-foreground">Total nilai tunai</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-foreground">{formatRupiah(totalValue)}</p>
        <p class="mt-0.5 text-xs text-muted-foreground">nilai tagihan COD</p>
      </div>
      <div class="rounded-xl border border-border bg-background/40 p-4">
        <p class="text-xs text-muted-foreground">Berisiko (kandidat PUDO)</p>
        <p class="mt-1 text-2xl font-bold tabular-nums text-warning-foreground">{atRisk}</p>
        <p class="mt-0.5 text-xs text-muted-foreground">belum dialihkan</p>
      </div>
    </div>
    <p class="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Icon name="bell" cls="h-3.5 w-3.5" /> Porsi COD pada slider di atas = asumsi simulasi, bukan otomatis dari pesananmu.
    </p>
  {/if}
</section>
