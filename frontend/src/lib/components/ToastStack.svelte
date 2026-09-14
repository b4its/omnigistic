<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "./Icon.svelte";

  interface ToastItem {
    id: number;
    msg: string;
  }

  const toasts: ToastItem[] = $state([]);

  onMount(() => {
    const onToast = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      const id = Date.now() + Math.random();
      toasts.push({ id, msg });
      setTimeout(() => {
        const idx = toasts.findIndex((t) => t.id === id);
        if (idx >= 0) toasts.splice(idx, 1);
      }, 3200);
    };
    window.addEventListener("omnigistic-toast", onToast);
    return () => window.removeEventListener("omnigistic-toast", onToast);
  });
</script>

<div style="bottom: var(--gc-overlay-bottom); right: 20px" class="fixed right-5 z-[90] flex flex-col gap-2" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="flex min-w-[220px] items-center gap-2.5 rounded-lg bg-foreground px-4 py-3 text-sm text-card" style="animation: toast-in 0.26s cubic-bezier(.34,1.4,.4,1)">
      <Icon name="check" cls="h-4 w-4 shrink-0 text-chart-4" weight="bold" />
      <span>{t.msg}</span>
    </div>
  {/each}
</div>

<style>
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to { opacity: 1; transform: none; }
  }
</style>