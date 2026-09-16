<script lang="ts">
  import { onMount } from "svelte";
  import { api, type CodImpact, type CodRiskPkg, type CodFactor } from "$lib/api";
  import Icon from "$lib/components/Icon.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { donutChart } from "$lib/charts/options";
  import { resolveHref, numId } from "$lib/utils";
  import { formatRupiah } from "$lib/shop/catalog";
  import { shop, type Order } from "$lib/stores/shop";
  import { COURIER, COD_DECISION_LABEL } from "$lib/logistics";
  import { notify } from "$lib/toast";

  let packages = $state<CodRiskPkg[]>([]);
  let sim = $state<CodImpact | null>(null);
  let loaded = $state(false);
  let errored = $state(false);
  let openId = $state<string | null>(null);

  /** Pesanan COD NYATA dari checkout pembeli (dipenuhi lewat store bersama). */
  let orders = $state<Order[]>([]);

  onMount(() => {
    shop.init();
    const unsub = shop.subscribe((s) => (orders = s.orders));
    void loadDemo();
    return unsub;
  });

  async function loadDemo() {
    errored = false;
    try {
      const d = await api.codRiskDemo();
      packages = d.packages;
      sim = d.sim;
    } catch {
      packages = [];
      sim = null;
      errored = true;
      notify({ message: "Gagal memuat preset risk scoring (backend offline)", type: "error", title: "Predictive COD" });
    }
    loaded = true;
  }

  /** Pesanan COD nyata, diurutkan dari skor risiko tertinggi. */
  const realCod = $derived(
    orders
      .filter((o) => o.payment === "COD")
      .sort((a, b) => (b.codScore ?? 0) - (a.codScore ?? 0))
  );

  function reroute(o: Order) {
    shop.routeToPudo(o.id, COURIER.actor);
    notify({ message: `Paket ${o.id} dialihkan ke PUDO`, type: "info", title: "Predictive COD" });
  }

  const decisionCls: Record<string, string> = {
    "antar-normal": "bg-success text-success-foreground",
    pudo: "bg-warning text-warning-foreground",
    "pre-payment": "bg-destructive text-destructive-foreground"
  };
  const clusterCls: Record<string, string> = {
    hijau: "bg-success text-success-foreground",
    kuning: "bg-warning text-warning-foreground",
    merah: "bg-destructive text-destructive-foreground"
  };

  const TIERS = [
    { key: "hijau", label: "Hijau · Cepat", color: "var(--color-chart-3)",
      crit: "Skor < 0,35. Penerima siap bayar, ambil paket cepat (≈ 2-6 menit).",
      action: "Antar normal." },
    { key: "kuning", label: "Kuning · Sedang", color: "var(--color-chart-2)",
      crit: "Skor 0,35-0,65. Kadang belum siap, ekspektasi tunggu ≈ 6-10 menit.",
      action: "Konfirmasi slot atau tawarkan PUDO." },
    { key: "merah", label: "Merah · Lambat", color: "var(--color-chart-5)",
      crit: "Skor ≥ 0,65. Uang belum siap atau alamat sulit, tunggu > 10 menit.",
      action: "PUDO atau pre-payment." }
  ];

  const counts = $derived(TIERS.map((t) => ({ ...t, n: packages.filter((p) => p.cluster === t.key).length })));
  const donut = $derived(counts.filter((c) => c.n > 0).map((c) => ({ name: c.label, value: c.n, color: c.color })));

  function sortedFactors(p: CodRiskPkg): CodFactor[] {
    return [...(p.factors ?? [])].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }
  function maxAbs(p: CodRiskPkg): number {
    const m = Math.max(0, ...(p.factors ?? []).map((f) => Math.abs(f.contribution)));
    return m || 1;
  }
  function toggleDetail(id: string) {
    openId = openId === id ? null : id;
    notify({ message: openId ? `Detail penjelasan ${id} dibuka` : `Detail ${id} ditutup`, type: "info", title: "Predictive COD" });
  }
  function openChat() {
    window.dispatchEvent(new CustomEvent("omnigistic-open-nigi-chat"));
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="font-heading text-xl font-semibold tracking-tight">Predictive COD</h1>
    <span class="hub-label text-muted-foreground">Risk scoring · triase nyata</span>
  </div>

  <!-- Paket COD NYATA dari pesanan pembeli (dipenuhi lewat store bersama) -->
  <section class="rounded-2xl border border-border bg-card p-5">
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p class="text-base font-semibold">Paket COD pembeli (nyata)</p>
        <p class="text-[13.5px] text-muted-foreground">Pesanan dari checkout Customer yang dibayar di tempat, diurutkan dari risiko tertinggi. Aksi kurir langsung tersimpan untuk pembeli.</p>
      </div>
      <a href={resolveHref("/dashboard/kurir/tasks")} class="rounded-full border border-border px-3 py-1 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent">Buka tugas pengantaran</a>
    </div>
    {#if realCod.length === 0}
      <div class="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
        <p class="text-sm font-semibold text-foreground">Belum ada pesanan COD dari pembeli</p>
        <p class="mt-1 text-xs text-muted-foreground">Buat pesanan COD di portal Customer; skor &amp; keputusan model akan muncul di sini untuk ditriase kurir.</p>
      </div>
    {:else}
      <div class="mt-4 overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-[13px] text-muted-foreground">
              <th scope="col" class="px-3 py-2">Pesanan</th>
              <th scope="col" class="px-3 py-2">Penerima</th>
              <th scope="col" class="px-3 py-2 text-right">Nilai</th>
              <th scope="col" class="px-3 py-2 text-center">Skor risiko</th>
              <th scope="col" class="px-3 py-2">Keputusan</th>
              <th scope="col" class="px-3 py-2">Status</th>
              <th scope="col" class="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {#each realCod as o (o.id)}
              {@const score = o.codScore ?? 0}
              <tr class="border-b last:border-0">
                <td class="px-3 py-2 font-mono text-xs">{o.id}</td>
                <td class="px-3 py-2">{o.address.recipient} <span class="text-muted-foreground">· {o.address.city}</span></td>
                <td class="px-3 py-2 text-right tabular-nums">{formatRupiah(o.total)}</td>
                <td class="px-3 py-2 text-center">
                  <span class="inline-block w-16 rounded-full bg-muted px-2 py-0.5 text-[13px] font-semibold tabular-nums">{(score * 100).toFixed(0)}%</span>
                </td>
                <td class="px-3 py-2">
                  <span class="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold {decisionCls[o.codDecision ?? 'antar-normal']}">{COD_DECISION_LABEL[o.codDecision ?? ""] ?? o.codDecision ?? "-"}</span>
                </td>
                <td class="px-3 py-2 text-[13px] text-muted-foreground">{o.codCollected ? "Tunai diterima" : o.routedToPudo ? "Ke PUDO" : "Belum dibayar"}</td>
                <td class="px-3 py-2 text-right">
                  {#if !o.routedToPudo && score >= 0.35}
                    <button type="button" onclick={() => reroute(o)} class="rounded-lg border border-warning/50 px-3 py-1.5 text-[13px] font-semibold text-warning-foreground transition-colors hover:bg-warning/10">Alihkan PUDO</button>
                  {:else}
                    <span class="text-[13px] text-muted-foreground">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  {#if errored}
    <div class="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
      <p class="text-sm font-semibold text-foreground">Gagal memuat preset demo risk scoring</p>
      <p class="mt-1 text-xs text-muted-foreground">Backend offline? Data pesanan nyata di atas tetap tersedia.</p>
      <button type="button" onclick={() => loadDemo()} class="mt-3 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-4 py-2 text-xs font-semibold text-white">Coba lagi</button>
    </div>
  {:else if loaded && sim && packages.length}
    <div class="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 shadow-card">
      <div class="flex items-start gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_16px_-4px_var(--glow)] text-white">
          <Icon name="chat" cls="h-5 w-5" weight="fill" />
        </span>
        <div class="min-w-0">
          <p class="text-[13.5px] font-semibold uppercase tracking-wider text-primary">Saran Nigi AI untuk kurir</p>
          <ul class="mt-2 space-y-1.5 text-[15px] leading-relaxed text-foreground">
            <li>• <strong>Hubungi customer dulu</strong> untuk konfirmasi kesiapan COD, jika siap antar normal.</li>
            <li>• Jika customer <strong>belum siap</strong>, arahkan paket ke <strong>cluster COD aman</strong> atau jadwalkan ulang ke slot lain.</li>
            <li>• Paket berisiko tinggi ({packages.filter((p) => p.decision !== "antar-normal").length} dari {packages.length}) dialihkan ke PUDO atau pre-payment, kurir tidak jadi kasir keliling.</li>
          </ul>
          <button type="button" onclick={openChat} class="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] shadow-[0_0_20px_-5px_var(--glow)] px-5 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-px active:translate-y-0">
            Buka Nigi Chat <Icon name="arrow-up-right" cls="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>
      </div>
    </div>

    <section class="rounded-2xl border border-border bg-card p-5">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p class="text-base font-semibold">Klaster pelanggan COD</p>
          <p class="text-[13.5px] text-muted-foreground">Hijau, kuning, merah, berdasarkan skor risiko dan kecepatan penerima mengambil paket. Prototipe presentasi.</p>
        </div>
        <span class="rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-muted-foreground">{packages.length} paket</span>
      </div>
      <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div class="grid gap-3 sm:grid-cols-3">
          {#each counts as t (t.key)}
            <div class="rounded-xl border border-border bg-background/40 p-4" style="border-left: 5px solid {t.color}">
              <p class="text-sm font-semibold text-foreground">{t.label}</p>
              <p class="mt-1 text-[14px] leading-relaxed text-muted-foreground">{t.crit}</p>
              <p class="mt-2 text-[13.5px] font-semibold text-foreground">Aksi: {t.action}</p>
              <p class="mt-2 text-2xl font-bold tabular-nums text-foreground">{t.n} <span class="text-sm font-medium text-muted-foreground">paket</span></p>
            </div>
          {/each}
        </div>
        <div class="rounded-xl border border-border p-2">
          {#if donut.length}
            <EChart option={donutChart(donut)} height={210} label="Distribusi klaster pelanggan COD" />
          {/if}
        </div>
      </div>
    </section>

    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-2xl border border-border bg-card p-4 text-center">
        <p class="text-[13.5px] text-muted-foreground">Rute sebelum</p>
        <p class="kpi-value text-xl text-muted-foreground">{sim.currentTime} menit</p>
        <p class="text-[13.5px] text-muted-foreground">{sim.currentPerHour}/jam</p>
      </div>
      <div class="rounded-2xl border border-primary/40 bg-card p-4 text-center">
        <p class="text-[13.5px] text-muted-foreground">Rute setelah (60% digital)</p>
        <p class="kpi-value text-xl text-primary">{sim.newTime} menit</p>
        <p class="text-[13.5px] text-muted-foreground">{sim.newPerHour}/jam</p>
      </div>
      <div class="rounded-2xl border border-chart-2 bg-card p-4 text-center">
        <p class="text-[13.5px] text-muted-foreground">Kapasitas naik</p>
        <p class="kpi-value text-xl text-chart-2">+{sim.capacityGainPct}%</p>
        <p class="text-[13.5px] text-muted-foreground">{sim.packagesFreed} paket terselamatkan</p>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-card p-5">
      <p class="mb-3 text-base font-semibold">Skor risiko per paket</p>
      <p class="mb-3 text-[13.5px] text-muted-foreground">Logistic Regression · data sintetik ber-logika kasus. Klik Detail untuk melihat alasan (why) dan cara hitung (how).</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b bg-muted/50 text-left text-[13px] text-muted-foreground">
              <th scope="col" class="px-3 py-2">Paket</th>
              <th scope="col" class="px-3 py-2 text-right">Nilai</th>
              <th scope="col" class="px-3 py-2 text-right">Jam</th>
              <th scope="col" class="px-3 py-2 text-center">Alamat ambigu</th>
              <th scope="col" class="px-3 py-2 text-center">Skor risiko</th>
              <th scope="col" class="px-3 py-2">Klaster</th>
              <th scope="col" class="px-3 py-2">Keputusan</th>
              <th scope="col" class="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {#each packages as p (p.id)}
              <tr class="border-b last:border-0">
                <td class="px-3 py-2 font-medium">{p.id}</td>
                <td class="px-3 py-2 text-right tabular-nums">Rp{p.value}rb</td>
                <td class="px-3 py-2 text-right tabular-nums">{Math.round(p.hour)}.00</td>
                <td class="px-3 py-2 text-center">{p.ambiguous === 1 ? "Ya" : "Tidak"}</td>
                <td class="px-3 py-2 text-center">
                  <span class="inline-block w-16 rounded-full bg-muted px-2 py-0.5 text-[13px] font-semibold tabular-nums">{(p.score * 100).toFixed(0)}%</span>
                </td>
                <td class="px-3 py-2"><span class="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold {clusterCls[p.cluster ?? 'kuning']}">{p.clusterLabel ?? "-"}</span></td>
                <td class="px-3 py-2"><span class="inline-block rounded-md px-2 py-0.5 text-[13px] font-semibold {decisionCls[p.decision]}">{p.decision}</span></td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    onclick={() => toggleDetail(p.id)}
                    aria-expanded={openId === p.id}
                    class="rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {openId === p.id ? "Tutup" : "Detail"}
                  </button>
                </td>
              </tr>
              {#if openId === p.id}
                <tr class="border-b last:border-0">
                  <td colspan="8" class="bg-muted/30 px-4 py-4">
                    <div class="grid gap-5 lg:grid-cols-2">
                      <div>
                        <p class="text-[13px] font-semibold uppercase tracking-wider text-primary">Kenapa · kontribusi tiap faktor</p>
                        <ul class="mt-3 space-y-2.5">
                          {#each sortedFactors(p) as f (f.key)}
                            <li>
                              <div class="flex items-center justify-between text-[14.5px]">
                                <span class="text-foreground">{f.label} <span class="text-muted-foreground">= {f.value}</span></span>
                                <span class={f.contribution >= 0 ? "font-semibold text-destructive-foreground" : "font-semibold text-success-foreground"}>
                                  {f.contribution >= 0 ? "+" : ""}{numId(f.contribution, 2)}
                                </span>
                              </div>
                              <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                                <div class={f.contribution >= 0 ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-success"} style="width: {Math.min(100, (Math.abs(f.contribution) / maxAbs(p)) * 100)}%"></div>
                              </div>
                              <p class="mt-1 text-[12.5px] text-muted-foreground">koefisien {f.coef} · {f.contribution >= 0 ? "menaikkan" : "menurunkan"} risiko</p>
                            </li>
                          {/each}
                        </ul>
                      </div>
                      <div>
                        <p class="text-[13px] font-semibold uppercase tracking-wider text-primary">Bagaimana · cara hitung</p>
                        <div class="mt-3 space-y-1.5 text-[14.5px] text-muted-foreground">
                          <p>Model: <span class="text-foreground">{p.model ?? "Logistic Regression"}</span>{p.accuracy != null ? ` · akurasi uji ${(p.accuracy * 100).toFixed(0)}%` : ""}</p>
                          <p>logit = intercept ({p.intercept != null ? numId(p.intercept, 2) : "-"}) + Σ (koef × fitur) = <span class="text-foreground">{p.logit != null ? numId(p.logit, 2) : "-"}</span></p>
                          <p>P(gagal COD) = 1 / (1 + e^−logit) = <span class="font-semibold text-foreground">{(p.score * 100).toFixed(0)}%</span></p>
                          <p>Ambang: &lt; 35% antar-normal · 35-65% PUDO · ≥ 65% pre-payment.</p>
                        </div>
                        <div class="mt-3 rounded-lg bg-muted/50 p-3 text-[14.5px]">
                          <p>Klaster: <strong class="text-foreground">{p.clusterLabel}</strong> · ekspektasi penerima ambil paket ≈ <strong class="text-foreground">{p.pickupWaitMin} menit</strong></p>
                          <p class="mt-1 text-muted-foreground">Keputusan: <strong class="text-foreground">{p.decision}</strong> · {p.clusterAction}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if !errored}
    <div class="h-64 animate-pulse rounded-2xl border border-border bg-card/60"></div>
  {/if}
</div>
