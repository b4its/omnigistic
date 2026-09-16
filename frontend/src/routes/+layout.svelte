<script lang="ts">
  import "../app.css";

  // Font self-hosted (pengganti next/font versi Lama — tanpa dependensi jaringan)
  // Sistem "Bitcoin DeFi": Space Grotesk (heading) · Inter (body) · JetBrains Mono (data)
  import "@fontsource-variable/space-grotesk";
  import "@fontsource-variable/inter";
  import "@fontsource-variable/fraunces";
  import "@fontsource-variable/jetbrains-mono";

  import { onMount } from "svelte";
  import { themeStore } from "$lib/stores/theme";

  let { children } = $props();

  onMount(() => {
    themeStore.restore();
  });
</script>

{@render children()}