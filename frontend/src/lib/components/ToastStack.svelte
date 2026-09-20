<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import Icon from "./Icon.svelte";
  import { TOAST_EVENT, type ToastDetail, type ToastType } from "$lib/toast";

  interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    title?: string;
    leaving: boolean;
  }

  const toasts: ToastItem[] = $state([]);

  const TONE: Record<ToastType, { icon: "check" | "bell" | "warn"; accent: string; border: string }> = {
    success: { icon: "check", accent: "text-chart-4", border: "var(--color-chart-4)" },
    info: { icon: "bell", accent: "text-primary", border: "var(--color-primary)" },
    warn: { icon: "warn", accent: "text-warning-foreground", border: "var(--color-warning)" },
    error: { icon: "warn", accent: "text-destructive-foreground", border: "var(--color-destructive)" },
  };

  const DURATION = 3600;

  function dismiss(id: number) {
    const t = toasts.find((x) => x.id === id);
    if (!t || t.leaving) return;
    t.leaving = true;
    setTimeout(() => {
      const idx = toasts.findIndex((x) => x.id === id);
      if (idx >= 0) toasts.splice(idx, 1);
    }, 220);
  }

  onMount(() => {
    const onToast = (e: Event) => {
      const raw = (e as CustomEvent<string | ToastDetail>).detail;
      const detail: ToastDetail = typeof raw === "string" ? { message: raw, type: "success" } : raw;
      if (!detail || !detail.message) return;
      const id = Date.now() + Math.random();
      toasts.push({ id, message: detail.message, type: detail.type ?? "success", title: detail.title, leaving: false });
      // Batasi tumpukan agar tidak menutupi layar.
      if (toasts.length > 4) toasts.splice(0, toasts.length - 4);
      setTimeout(() => dismiss(id), DURATION);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  });
</script>

<div style="bottom: var(--gc-overlay-bottom); right: 20px" class="fixed right-5 z-[90] flex max-w-[min(92vw,360px)] flex-col gap-2" aria-live="polite" aria-atomic="false">
  {#each toasts as t (t.id)}
    {@const tone = TONE[t.type]}
    <div
      data-testid="toast"
      data-toast-type={t.type}
      class="pointer-events-auto flex min-w-[240px] items-start gap-2.5 rounded-lg border border-border bg-foreground px-4 py-3 text-sm text-card shadow-pop {t.leaving ? 'opacity-0' : 'opacity-100'}"
      style="border-left: 4px solid {tone.border}; animation: toast-in 0.26s cubic-bezier(.34,1.4,.4,1); transition: opacity .2s ease"
      role={t.type === "error" ? "alert" : "status"}
    >
      <Icon name={tone.icon} cls="mt-0.5 h-4 w-4 shrink-0 {tone.accent}" weight="bold" />
      <div class="min-w-0 flex-1">
        {#if t.title}<p class="text-[11px] font-semibold uppercase tracking-wide opacity-70">{t.title}</p>{/if}
        <p class="leading-snug">{t.message}</p>
      </div>
      <button type="button" onclick={() => dismiss(t.id)} aria-label={m.ax03()} class="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100">
        <Icon name="x" cls="h-3.5 w-3.5" />
      </button>
    </div>
  {/each}
</div>

<style>
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(8px) scale(0.97); }
    to { opacity: 1; transform: none; }
  }
</style>
