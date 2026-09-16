<script lang="ts">
  import { onMount } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import Icon from "./Icon.svelte";
  import { cn } from "$lib/utils";
  import { widgetsStore, WIDGET_CATALOG } from "$lib/stores/widgets";

  const WIDGETS = WIDGET_CATALOG;

  let open = $state(false);
  let q = $state("");
  let sel = new SvelteSet<string>();
  let lastTrigger: HTMLElement | null = null;

  onMount(() => {
    widgetsStore.restore();
    // Sinkronkan pilihan awal dengan widget yang sudah aktif.
    const unsub = widgetsStore.subscribe((ids) => {
      sel.clear();
      ids.forEach((id) => sel.add(id));
    });
    const openW = () => {
      lastTrigger = document.activeElement as HTMLElement;
      open = true;
    };
    const closeByKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        open = false;
        lastTrigger?.focus();
      }
    };
    window.addEventListener("omnigistic-open-widgets", openW);
    window.addEventListener("keydown", closeByKey);
    return () => {
      unsub();
      window.removeEventListener("omnigistic-open-widgets", openW);
      window.removeEventListener("keydown", closeByKey);
    };
  });

  const filtered = $derived(WIDGETS.filter((w) => w.title.toLowerCase().includes(q.toLowerCase())));

  function toggle(id: string) {
    const w = WIDGETS.find((x) => x.id === id);
    if (sel.has(id)) {
      sel.delete(id);
      if (w) window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: { message: `Widget "${w.title}" dilepas`, type: "info", title: "Widget" } }));
    } else {
      sel.add(id);
      if (w) window.dispatchEvent(new CustomEvent("omnigistic-toast", { detail: { message: `Widget "${w.title}" dipilih`, type: "success", title: "Widget" } }));
    }
  }

  function apply() {
    const ids = [...sel];
    widgetsStore.setActive(ids);
    open = false;
    window.dispatchEvent(
      new CustomEvent("omnigistic-toast", {
        detail: ids.length
          ? { message: `${ids.length} widget ditambahkan ke dashboard`, type: "success", title: "Widget" }
          : { message: "Tidak ada widget dipilih", type: "warn", title: "Widget" }
      })
    );
  }
</script>

{#if open}
  <button type="button" aria-label="Tutup drawer" class="fixed inset-0 z-[60] cursor-pointer bg-black/40 transition-opacity" onclick={() => (open = false)}></button>
{/if}
<div
  role="dialog"
  aria-modal="true"
  aria-label="Tambah widget"
  tabindex="-1"
  class="fixed right-0 top-0 z-[70] flex h-full w-[400px] max-w-[92vw] flex-col bg-card shadow-pop transition-transform duration-300"
  style="transform: {open ? 'translateX(0)' : 'translateX(100%)'}; visibility: {open ? 'visible' : 'hidden'}"
  inert={!open}
>
  <div class="flex items-center justify-between border-b border-border px-5 py-4">
    <h2 class="text-base font-semibold">Tambah widget</h2>
    <button type="button" aria-label="Tutup" onclick={() => (open = false)} class="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      <Icon name="x" cls="h-4 w-4" />
    </button>
  </div>
  <label class="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-transparent bg-muted px-3 py-2.5 text-muted-foreground transition-colors focus-within:border-primary focus-within:bg-card">
    <span aria-hidden="true">&#8981;</span>
    <input
      type="search"
      enterkeyhint="search"
      bind:value={q}
      placeholder="Cari widget"
      aria-label="Cari widget"
      class="flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none"
    />
  </label>
  <div class="flex-1 space-y-2.5 overflow-y-auto px-5 py-3">
    {#each filtered as w (w.id)}
      <div class={cn("flex gap-3 rounded-2xl border p-3 transition-colors", sel.has(w.id) ? "border-primary bg-accent" : "border-border")}>
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style="background: {w.hue}" aria-hidden="true">
          <span class="text-sm font-bold">{w.title[0]}</span>
        </span>
        <div class="min-w-0 flex-1">
          <h4 class="text-[15px] font-semibold">{w.title}</h4>
          <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">{w.desc}</p>
          <div class="mt-1.5 flex items-center justify-between">
            <span class="text-xs font-semibold text-accent-foreground">{w.tag}</span>
            <button
              type="button"
              onclick={() => toggle(w.id)}
              class={cn("rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all", sel.has(w.id) ? "border-transparent bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] text-white shadow-[0_0_16px_-5px_var(--glow)]" : "border-border text-foreground hover:border-[color-mix(in_oklab,var(--bitcoin)_50%,transparent)]")}
            >
              {sel.has(w.id) ? "Dipilih" : "Pilih"}
            </button>
          </div>
        </div>
      </div>
    {/each}
    {#if filtered.length === 0}
      <p class="py-8 text-center text-sm text-muted-foreground">Tidak ada widget yang cocok.</p>
    {/if}
  </div>
  <div class="flex items-center justify-between border-t border-border px-5 py-3.5">
    <span class="text-xs text-muted-foreground">{sel.size} dipilih</span>
    <button
      type="button"
      class="rounded-full bg-gradient-to-r from-[var(--bitcoin-deep)] to-[var(--bitcoin)] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_0_20px_-5px_var(--glow)] transition-all duration-300 hover:scale-[1.03] active:scale-100"
      onclick={apply}
    >
      Tambah ke dashboard
    </button>
  </div>
</div>