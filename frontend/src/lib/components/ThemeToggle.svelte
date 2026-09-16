<script lang="ts">
  import { themeStore } from "$lib/stores/theme";
  import { notify } from "$lib/toast";
  import Icon from "$lib/components/Icon.svelte";

  let cur = $state<"light" | "dark">("light");
  themeStore.subscribe((t) => (cur = t));

  function toggleTheme() {
    themeStore.toggle();
    notify({ message: cur === "dark" ? "Mode terang diaktifkan" : "Mode gelap diaktifkan", type: "info", title: "Tema" });
  }
</script>

<!-- Pill toggle: dua ikon sun/moon, knob meluncur + glow orange -->
<button
  class="relative inline-flex h-9 w-16 items-center rounded-full border border-border bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)] p-1 transition-colors hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
  type="button"
  role="switch"
  aria-checked={cur === "dark"}
  aria-label={cur === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
  title="Beralih tema"
  onclick={toggleTheme}
>
  <span class="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground">
    <Icon name="sun" cls="h-3.5 w-3.5" />
  </span>
  <span class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted-foreground">
    <Icon name="moon" cls="h-3.5 w-3.5" />
  </span>
  <span
    class="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--bitcoin-deep)] to-[var(--bitcoin)] text-white shadow-[0_0_12px_-2px_var(--glow)] transition-transform duration-300"
    style="transform: translateX({cur === 'dark' ? '26px' : '0px'})"
  >
    <Icon name={cur === "dark" ? "moon" : "sun"} cls="h-3.5 w-3.5" weight="bold" />
  </span>
</button>
