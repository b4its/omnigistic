<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";

  const stages = [
    { step: "H-1", desc: "Pemberitahuan paket akan diantar besok", en: "Notify" },
    { step: "30-60 min", desc: "Estimasi tiba + konfirmasi kesiapan", en: "Estimate" },
    { step: "Arrival", desc: "Penerima siap → kurir tidak menunggu", en: "Confirm" }
  ];

  let quotes = $state<Array<{ city: string; quote: string }>>([]);
  let loaded = $state(false);

  onMount(async () => {
    try {
      quotes = await api.courierQuotes();
    } catch {
      quotes = [];
    }
    loaded = true;
  });
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">Slot Confirmation</h1>
  <p class="text-sm text-muted-foreground">Notifikasi 3 tahap kurangi waktu tunggu</p>

  <div class="grid gap-4 sm:grid-cols-3">
    {#each stages as s, i (s.step)}
      <div class="rounded-2xl border bg-card p-5">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
          <span class="hub-label text-xs text-muted-foreground">{s.en}</span>
        </div>
        <p class="kpi-value mt-3 text-sm">{s.step}</p>
        <p class="mt-1 text-xs text-muted-foreground">{s.desc}</p>
      </div>
    {/each}
  </div>

  <div class="rounded-2xl border-l-4 border-chart-2 bg-muted/30 p-4 text-sm">
    Individual attempt makan 10-20 menit saat akses sulit; percobaan gagal berarti paket kembali ke titik drop. Slot confirmation + notifikasi bertahap menaikkan first-attempt success rate.
  </div>

  <div class="space-y-3">
    {#each quotes as q (q.city)}
      <blockquote class="rounded-2xl border-l-4 border-primary bg-muted/30 p-4 text-sm italic">
        &ldquo;{q.quote}&rdquo;
        <span class="mt-1 block text-xs not-italic text-muted-foreground">dari Kurir {q.city}</span>
      </blockquote>
    {/each}
  </div>
</div>