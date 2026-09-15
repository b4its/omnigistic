<script lang="ts">
  import Icon from "$lib/components/Icon.svelte";
  import type { IconName } from "$lib/icon-names";
  import { resolveHref } from "$lib/utils";

  const routes: Record<string, string> = {
    PUSAT: "/dashboard/pusat/overview",
    HUB: "/dashboard/hub/overview",
    KURIR: "/dashboard/kurir/overview",
    DATA: "/dashboard/data/overview",
    CUSTOMER: "/dashboard/customer/overview",
    SELLER: "/dashboard/seller/overview"
  };

  const roles: { slug: string; name: string; sub: string; initials: string; desc: string; icon: IconName }[] = [
    {
      slug: "PUSAT", name: "Dalila", sub: "Manajer Pusat", initials: "D",
      desc: "Analisa tren finansial, Digital Twin untuk skenario sponsor vs langsung, utilisasi 23 hub.",
      icon: "grid"
    },
    {
      slug: "HUB", name: "Marwah", sub: "Manajer Hub Bandung", initials: "M",
      desc: "Kesehatan hub sendiri vs peer 22 hub. Forecast demand, simulasi load balancer, kapasitas dini.",
      icon: "shield"
    },
    {
      slug: "KURIR", name: "Baits", sub: "Kurir Jakarta", initials: "B",
      desc: "Rute terkluster, skor COD risk, slot confirmation, pembayaran digital.",
      icon: "compass"
    },
    {
      slug: "DATA", name: "Virgiawan", sub: "Data & IT", initials: "V",
      desc: "Address intelligence 3 alamat ambigu, monitoring komplain, control tower multimoda, emisi armada.",
      icon: "map"
    },
    {
      slug: "CUSTOMER", name: "Sari", sub: "Pembeli", initials: "S",
      desc: "Belanja di e-commerce Omnigistic: cari produk, keranjang, checkout COD, lalu lacak pengantaran.",
      icon: "globe"
    },
    {
      slug: "SELLER", name: "Rina", sub: "Penjual", initials: "R",
      desc: "Dashboard penjual: analitik laba/rugi & margin produk, pesanan masuk, dan skor pelanggan.",
      icon: "currency"
    }
  ];
</script>

<svelte:head><title>Masuk Portal · Omnigistic</title></svelte:head>

<div class="landing grid min-h-dvh lg:grid-cols-2" style="background: var(--lnd-bg); color: var(--lnd-ink)">
  <div class="hidden flex-col justify-between rounded-l-none bg-[var(--lnd-ink)] p-[clamp(2rem,5vw,4rem)] text-[var(--lnd-bg)] lg:flex">
    <div class="flex items-baseline gap-1 font-serif text-2xl font-semibold tracking-[0.02em]">
      Omnigistic
    </div>
    <p class="max-w-[12ch] font-serif text-[clamp(2.4rem,4.6vw,4.4rem)] font-light leading-[1.12] tracking-[-0.015em]">
      Angka yang tidak <em class="italic text-[var(--lnd-accent-ink)]">berteriak</em><span class="text-[var(--lnd-accent-ink)]">.</span>
    </p>
    <div class="flex justify-between gap-4 text-[14px] font-semibold uppercase tracking-[0.09em] text-[var(--lnd-on-ink)]">
      <span>Enam portal</span><span>ISCEA 2026</span>
    </div>
  </div>

  <div class="grid place-items-center px-[clamp(1.5rem,4vw,3rem)] py-12">
    <div class="w-full min-[400px]:max-w-[560px]">
      <p class="eyebrow">Masuk</p>
      <h1 class="mt-4 font-serif text-[clamp(2.2rem,4vw,3.2rem)] font-light leading-[1.08] tracking-tight">
        Pilih <em class="italic text-[var(--lnd-accent-ink)]">portal</em> Anda
      </h1>
      <p class="mt-3 max-w-lg text-sm leading-relaxed text-[var(--lnd-soft)]">
        Tidak perlu akun, pilih portal untuk pratinjau langsung. Data studi kasus GC Logistics, dijawab lewat Nigi AI.
      </p>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        {#each roles as r (r.slug)}
          <a href={resolveHref(routes[r.slug])} class="group flex h-full flex-col gap-3 rounded-2xl border border-[var(--lnd-line)] bg-[var(--lnd-surface)] p-6 transition-colors hover:border-[var(--lnd-accent-ink)] hover:bg-[var(--lnd-bg-raise)]">
            <div class="flex items-center justify-between">
              <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lnd-accent-ink)] text-[var(--lnd-bg)]">
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
              Portal {r.slug}
            </div>
          </a>
        {/each}
      </div>

      <div class="mt-8 flex justify-center">
        <a href={resolveHref("/")} class="text-xs text-[var(--lnd-soft)] underline-offset-4 hover:text-[color:var(--lnd-accent-ink)] hover:underline">&larr; Kembali ke halaman utama</a>
      </div>
    </div>
  </div>
</div>
