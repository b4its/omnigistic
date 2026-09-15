<script lang="ts">
  import { themeStore } from "$lib/stores/theme";
  import { notify } from "$lib/toast";
  let cur = $state<"light" | "dark">("light");
  themeStore.subscribe((t) => (cur = t));

  function toggleTheme() {
    themeStore.toggle();
    notify({ message: cur === "dark" ? "Mode terang diaktifkan" : "Mode gelap diaktifkan", type: "info", title: "Tema" });
  }
</script>

<button
  class="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]"
  type="button"
  aria-label={cur === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
  aria-pressed={cur === "dark"}
  title="Beralih tema"
  onclick={toggleTheme}
>
  {#if cur === "dark"}
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
  {:else}
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg>
  {/if}
</button>
