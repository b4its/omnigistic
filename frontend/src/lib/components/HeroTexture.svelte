<script lang="ts">
  // Latar hero full-bleed gaya whitepaper: tekstur organik prosedural (marbling
  // hijau/emerald + semburat copper) dengan overlay gelap rgba(10,13,11,0.55)
  // agar teks tetap terbaca. Bukan ilustrasi SVG kompleks — murni layered
  // gradients + grain halus (sesuai aturan "placeholder tekstur").
  let { grain = true }: { grain?: boolean } = $props();
</script>

<div class="wp-hero-bg" aria-hidden="true"></div>
{#if grain}<div class="wp-hero-grain" aria-hidden="true"></div>{/if}
