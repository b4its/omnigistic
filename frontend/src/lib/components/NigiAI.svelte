<script lang="ts">
  import { m as msg } from "$lib/paraglide/messages";
  import { onMount, untrack } from "svelte";
  import { api, type ChatResp, type Insights } from "$lib/api";
  import { fly } from "svelte/transition";
  import { greetingByTime, cn } from "$lib/utils";
  import { windowClass, type M3Window } from "$lib/stores/window-class";
  import ChatMarkdown from "./ChatMarkdown.svelte";
  import Icon from "./Icon.svelte";
  import GlitterIcon from "./ui/GlitterIcon.svelte";

  type InsightEntry = Insights["insights"][number];

  let { role = "PUSAT", suggestions = [] as string[], initialGreeting = "", initialInsights = [] as Insights["insights"] }: {
    role?: string;
    suggestions?: string[];
    initialGreeting?: string;
    initialInsights?: Insights["insights"];
  } = $props();

  interface Msg {
    role: "user" | "assistant";
    content: string;
    suggestions?: string[];
  }

  const EMPTY_CHIPS = ["Apa masalah utama GC Logistics?", msg.niga1(), msg.niga2()];
  const priorityDot: Record<string, string> = { high: "bg-destructive", medium: "bg-warning", low: "bg-success" };

  let screenOpen = $state(false);
  let panelEl = $state<HTMLElement | undefined>();
  let logEl = $state<HTMLElement | undefined>();
  let msgs = $state<Msg[]>([]);
  let input = $state("");
  let busy = $state(false);
  let intro = $state<{ greeting: string; insights: InsightEntry[] }>(
    untrack(() => ({ greeting: initialGreeting, insights: initialInsights }))
  );
  let introError = $state(false);
  let shownWords = $state(0);
  let introVisible = $state(false);
  let introStarted = false;

  let reduce = $derived(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  let mode = $state<M3Window>("expanded");
  $effect(() => {
    const unsub = windowClass.subscribe((w) => (mode = w));
    return unsub;
  });

  function closePanel() {
    screenOpen = false;
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-testid="nigi-fab"]')?.focus());
  }
  $effect(() => {
    if (screenOpen) panelEl?.focus?.();
  });
  onMount(() => {
    if (!initialGreeting && !initialInsights.length) {
      api
        .insights(role)
        .then((data) => {
          const timeGreeting = greetingByTime();
          intro = {
            greeting: data.greeting
              ? `${timeGreeting}. ${data.greeting.replace(/^(Halo\w*,?|Salam,?)\s*/i, "")}`
              : `${timeGreeting}. Tanyakan apa saja soal data GC Logistics.`,
            insights: data.insights ?? []
          };
        })
        .catch(() => (introError = true));
    }
    const open = () => (screenOpen = true);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && screenOpen) closePanel(); };
    window.addEventListener("omnigistic-open-nigi-chat", open);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("omnigistic-open-nigi-chat", open);
      window.removeEventListener("keydown", esc);
    };
  });

  $effect(() => {
    if (!screenOpen || introStarted) return;
    if (!intro.greeting && !intro.insights.length) return;
    introStarted = true;
    introVisible = true;
  });

  const wordCount = $derived((intro.greeting || " ").split(" ").length);
  $effect(() => {
    if (!introVisible || reduce) return;
    if (shownWords >= wordCount) return;
    const t = setTimeout(() => (shownWords += 1), 30);
    return () => clearTimeout(t);
  });

  const greetingDone = $derived(shownWords >= wordCount);
  // Chip saran tampil begitu sapaan selesai — TIDAK menunggu insights (dulu
  // insights kosong saat backend offline → chip tak pernah muncul; padahal itu
  // justru momen paling butuh pertanyaan siap-pakai). chips punya fallback EMPTY_CHIPS.
  const introDone = $derived(greetingDone);
  const chips = $derived((suggestions.length ? suggestions : EMPTY_CHIPS).slice(0, 3));
  const greetingWords = $derived(intro.greeting.split(" ").slice(0, shownWords).join(" "));

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    busy = true;
    msgs = [...msgs, { role: "user", content: q }];
    try {
      const data = (await api.chat(role, q)) as ChatResp;
      msgs = [...msgs, { role: "assistant", content: data.content ?? "", suggestions: data.suggestions ?? [] }];
    } catch {
      msgs = [...msgs, { role: "assistant", content: msg.niga4(), suggestions: [] }];
    } finally {
      busy = false;
      input = "";
    }
  }

  // Auto-scroll ke pesan terbaru, seperti chat AI umumnya.
  $effect(() => {
    void msgs;
    void busy;
    void screenOpen;
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  });
</script>

{#if screenOpen}
  <div
    role="region"
    aria-label="Nigi AI"
    tabindex="-1"
    bind:this={panelEl}
    transition:fly={{ y: 20, duration: reduce ? 0 : 220 }}
    class="fixed z-50 flex max-h-[72dvh] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card text-foreground shadow-pop ring-1 ring-border focus:outline-none"
    style="bottom:{mode === 'compact' ? 'calc(104px + env(safe-area-inset-bottom))' : '20px'}; right:{mode === 'compact' ? '12px' : '20px'}"
  >
    <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border/80 px-4 py-3">
      <div class="flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <GlitterIcon cls="h-4 w-4" />
        </span>
        <div class="leading-tight">
          <p class="text-sm font-semibold tracking-tight">{msg.nai01()}</p>
          <p class="text-xs text-muted-foreground">{msg.nai02()}</p>
        </div>
      </div>
      <button type="button" onclick={() => (screenOpen = false)} data-testid="nigi-close" aria-label={msg.nai09()} class="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
        <Icon name="x" cls="h-4 w-4" />
      </button>
    </div>

    <div class="flex min-h-0 flex-col bg-card">
        <div bind:this={logEl} class="overscroll-isolate min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Percakapan Nigi AI">
        {#if introError}
          <div class="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive-foreground">
            <span>{msg.nai03()}</span>
            <button
              type="button"
              onclick={() => { introError = false; intro = { greeting: `${greetingByTime()}. Tanyakan apa saja soal data GC Logistics.`, insights: [] }; introVisible = true; }}
              aria-label="Coba lagi"
              class="min-h-11 shrink-0 rounded-lg border border-destructive/40 px-3 py-1.5 font-semibold text-destructive-foreground transition-colors hover:bg-destructive/20"
            >
              {msg.nai04()}
            </button>
          </div>
        {/if}

        {#if introVisible}
          <div class="space-y-3">
            <div class="flex gap-2">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{msg.nai05()}</span>
              <div class="rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-[15px] leading-relaxed text-foreground">
                {greetingWords}
                {#if !greetingDone && !reduce}<span class="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary align-middle"></span>{/if}
                {#if greetingDone && intro.insights.length > 0}
                  <ul class="mt-2.5 space-y-2 border-t border-border/60 pt-2.5">
                    {#each intro.insights as ins (ins.title)}
                      <li class="flex gap-2 text-[14.5px]">
                        <span class={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[ins.priority] ?? "bg-muted")}></span>
                        <span>
                          <strong class="font-semibold text-foreground">{ins.title}.</strong>
                          <span class="text-muted-foreground">{ins.message}</span>
                        </span>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            </div>

            {#if introDone}
              <div class="flex flex-wrap gap-1.5 pl-8">
                {#each chips as c (c)}
                  <button
                    type="button"
                    onclick={() => send(c)}
                    class="min-h-11 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground active:scale-[0.98]"
                  >
                    {c}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        {#each msgs as m, i (i)}
          <div class={cn("flex gap-2", m.role === "user" && "justify-end")}>
            {#if m.role === "assistant"}
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{msg.nai06()}</span>
            {/if}
            <div class={cn("max-w-[82%] rounded-2xl px-3 py-2 text-[15px] leading-relaxed", m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-foreground")}>
              {#if m.role === "assistant"}
                <ChatMarkdown text={m.content} />
              {:else}
                {m.content}
              {/if}
            </div>
          </div>
        {/each}

        {#if busy}
          <div class="flex items-center gap-2 pl-8 text-xs text-muted-foreground">
            <Icon name="dots" cls="h-4 w-4 animate-pulse" weight="bold" />
            {msg.nai07()}
          </div>
        {/if}
      </div>

      <form
        class="shrink-0 border-t border-border/80 bg-card p-3"
        onsubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <div class="flex items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pl-4 pr-1 transition-colors focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/15">
          <input
            type="text"
            autocomplete="off"
            bind:value={input}
            placeholder={msg.nai08()}
            data-testid="nigi-input"
            aria-label={msg.niga2t1()}
            readonly={busy}
            enterkeyhint="send"
            class="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label={msg.ni3t1()}
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:scale-105 disabled:scale-100 disabled:opacity-40"
          >
            <Icon name="send" cls="h-4 w-4" weight="fill" />
          </button>
        </div>
      </form>
    </div>
  </div>
{:else}
  <button
    type="button"
    onclick={() => (screenOpen = true)}
    data-testid="nigi-fab"
    aria-label={msg.niga2t2()}
    class="fixed z-50 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-shadow hover:shadow-xl"
    style="bottom:{mode === 'compact' ? '104px' : '20px'}; right: 20px"
  >
    <GlitterIcon cls="h-5 w-5" />
  </button>
{/if}