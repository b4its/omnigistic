<script lang="ts">
  import { onMount } from "svelte";
  import { api, type ChatResp, type Insights } from "$lib/api";
  import ChatMarkdown from "./ChatMarkdown.svelte";
  import Icon from "./Icon.svelte";

  let { role = "PUSAT" }: { role?: string } = $props();

  const ROLE_CHIPS: Record<string, string[]> = {
    PUSAT: ["Kenapa biaya naik lebih cepat dari sales?", "Kenapa Jakarta overload?"],
    HUB: ["Berapa utilisasi hub Bandung?", "Kenapa demand naik turun?"],
    KURIR: ["Kenapa COD lebih lambat?", "Apa itu Slot Confirmation?"],
    DATA: ["Kenapa alamat bisa ambigu?", "Berapa tingkat komplain?"],
    CUSTOMER: ["Kenapa COD lebih lambat?", "Apa itu PUDO?"],
    SELLER: ["Berapa tingkat komplain?", "Kenapa COD lebih lambat?"]
  };

  let greeting = $state("");
  let insights = $state<Insights["insights"]>([]);
  let answer = $state("");
  let busy = $state(false);
  let input = $state("");
  let error = $state(false);
  let ansEl = $state<HTMLElement | undefined>();

  onMount(async () => {
    try {
      const ins = await api.insights(role);
      greeting = ins.greeting || "Tanyakan apa saja soal data GC Logistics.";
      insights = ins.insights ?? [];
    } catch {
      error = true;
    }
  });

  async function ask(q: string) {
    const query = q.trim();
    if (!query || busy) return;
    busy = true;
    answer = "";
    try {
      const data = (await api.chat(role, query)) as ChatResp;
      answer = data.content ?? "";
    } catch {
      answer = "Gagal menghubungi Nigi AI. Coba lagi.";
    } finally {
      busy = false;
      input = "";
    }
  }

  function expand() {
    window.dispatchEvent(new CustomEvent("omnigistic-open-nigi-chat"));
  }

  // Auto-scroll area jawaban ke bawah saat isinya berubah.
  $effect(() => {
    void answer;
    void busy;
    if (ansEl) ansEl.scrollTop = ansEl.scrollHeight;
  });
</script>

<article class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
  <header class="flex items-center gap-2.5">
    <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
      <Icon name="chat" cls="h-4 w-4" />
    </span>
    <div class="min-w-0 leading-tight">
      <p class="text-sm font-semibold tracking-tight">Nigi AI</p>
      <p class="text-xs text-muted-foreground">Asisten data studi kasus</p>
    </div>
    <button
      type="button"
      onclick={expand}
      aria-label="Perluas ke panel penuh"
      class="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
    >
      <Icon name="arrow-up-right" cls="h-4 w-4" weight="bold" />
    </button>
  </header>

  <div bind:this={ansEl} class="max-h-[200px] min-h-[56px] overflow-y-auto rounded-xl border border-border bg-background/60 p-3 text-[15px] leading-relaxed" role="status" aria-live="polite">
    {#if error}
      <p class="text-muted-foreground">Ringkasan tidak tersedia. Buka panel penuh untuk bertanya.</p>
    {:else if busy}
      <p class="flex items-center gap-2 text-muted-foreground"><Icon name="dots" cls="h-4 w-4 animate-pulse" weight="bold" /> mengetik</p>
    {:else if answer}
      <ChatMarkdown text={answer} />
    {:else if greeting}
      <p class="text-foreground">{greeting}</p>
      {#if insights.length > 0}
        <ul class="mt-2 space-y-1.5">
          {#each insights.slice(0, 2) as ins (ins.title)}
            <li class="text-[14.5px] text-muted-foreground"><strong class="font-semibold text-foreground">{ins.title}.</strong> {ins.message}</li>
          {/each}
        </ul>
      {/if}
    {:else}
      <p class="text-muted-foreground">Memuat ringkasan…</p>
    {/if}
  </div>

  <div class="flex flex-wrap gap-1.5">
    {#each (ROLE_CHIPS[role] ?? ROLE_CHIPS.PUSAT) as c (c)}
      <button
        type="button"
        onclick={() => ask(c)}
        class="min-h-9 rounded-full border border-border bg-background px-3 py-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground active:scale-[0.98]"
      >
        {c}
      </button>
    {/each}
  </div>

  <form
    class="flex items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pl-4 pr-1 transition-colors focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/15"
    onsubmit={(e) => { e.preventDefault(); ask(input); }}
  >
    <input
      type="text"
      autocomplete="off"
      bind:value={input}
      placeholder="Tanya apa saja"
      aria-label="Tanya Nigi Chat"
      readonly={busy}
      enterkeyhint="send"
      class="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
    />
    <button
      type="submit"
      disabled={busy || !input.trim()}
      aria-label="Kirim"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
    >
      <Icon name="send" cls="h-4 w-4" weight="fill" />
    </button>
  </form>
</article>
