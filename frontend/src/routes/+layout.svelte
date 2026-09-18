<script lang="ts">
  import "../app.css";

  // Font self-hosted (pengganti next/font versi Lama — tanpa dependensi jaringan)
  // Sistem "Bitcoin DeFi": Space Grotesk (heading) · Inter (body) · JetBrains Mono (data)
  import "@fontsource-variable/space-grotesk";
  import "@fontsource-variable/inter";
  import "@fontsource-variable/fraunces";
  import "@fontsource-variable/jetbrains-mono";

  // Ikon Font Awesome (glitter / wand-magic-sparkles) untuk Nigi AI di seluruh halaman.
  import "@fortawesome/fontawesome-free/css/all.min.css";

  import { onMount } from "svelte";
  import { themeStore } from "$lib/stores/theme";

  let { children } = $props();

  onMount(() => {
    themeStore.restore();
  });
</script>

{@render children()}