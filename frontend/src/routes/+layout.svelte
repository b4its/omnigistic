<script lang="ts">
  import "../app.css";

  // Font self-hosted (pengganti next/font versi Lama — tanpa dependensi jaringan)
  import "@fontsource-variable/plus-jakarta-sans";
  import "@fontsource-variable/instrument-sans";
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