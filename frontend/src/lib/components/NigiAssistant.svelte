<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { api, type Insights } from "$lib/api";
  import { greetingByTime, cn } from "$lib/utils";
  import ChatMarkdown from "./ChatMarkdown.svelte";
  import Icon from "./Icon.svelte";

  type InsightEntry = Insights["insights"][number];

  let { role = "PUSAT" }: { role?: string } = $props();

  interface Msg {
    role: "user" | "assistant";
    content: string;
    suggestions?: string[];
  }

  interface Conversation {
    id: string;
    title: string;
    msgs: Msg[];
    updatedAt: number;
  }

  const roleName: Record<string, string> = { PUSAT: "Dalila", HUB: "Marwah", KURIR: "Baits", DATA: "Virgiawan", CUSTOMER: "Sari" };
  const priorityDot: Record<string, string> = { high: "bg-destructive", medium: "bg-warning", low: "bg-success" };
  const EMPTY_CHIPS = [
    "Apa masalah utama GC Logistics?",
    "Bagaimana solusi Omnigistic?",
    "Berapa utilisasi Jakarta?"
  ];
  const STORE_KEY_PREFIX = "omnigistic-nigi-conversations-";
  let storeKey = $derived(`${STORE_KEY_PREFIX}${role}`);

  let msgs = $state<Msg[]>([]);
  let input = $state("");
  let busy = $state(false);
  let intro = $state<{ greeting: string; insights: InsightEntry[] }>({ greeting: "", insights: [] });
  let introError = $state(false);
  let introLoading = $state(true);

  let logEl = $state<HTMLElement | undefined>();

  let conversations = $state<Conversation[]>([]);
  let activeId = $state<string | null>(null);
  let search = $state("");
  let renamingId = $state<string | null>(null);
  let renameValue = $state("");
  let sidebarOpen = $state(false);
  let loaded = $state(false);

  const chips = $derived(intro.greeting ? EMPTY_CHIPS : []);

  const filtered = $derived(
    conversations
      .filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        if (c.title.toLowerCase().includes(q)) return true;
        return c.msgs.some((m) => m.content.toLowerCase().includes(q));
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
  );

  function uid(): string {
    return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  /** Deep-clone lepas dari proxy $state supaya aman disimpan/disalin. */
  function cloneMsgs(list: Msg[]): Msg[] {
    return JSON.parse(JSON.stringify($state.snapshot(list))) as Msg[];
  }

  function persist() {
    if (!browser) return;
    try {
      localStorage.setItem(storeKey, JSON.stringify(conversations));
    } catch {
      /* storage penuh / private mode — abaikan */
    }
  }

  function loadStore(): Conversation[] {
    if (!browser) return [];
    try {
      const raw = localStorage.getItem(storeKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Conversation[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((c) => c && typeof c.id === "string" && Array.isArray(c.msgs));
    } catch {
      return [];
    }
  }

  function titleFrom(msgs: Msg[]): string {
    const first = msgs.find((m) => m.role === "user")?.content ?? "";
    const clean = first.replace(/\s+/g, " ").trim();
    if (!clean) return "Percakapan baru";
    return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
  }

  function activeConv(): Conversation | undefined {
    return conversations.find((c) => c.id === activeId);
  }

  function newConversation() {
    const c: Conversation = { id: uid(), title: "Percakapan baru", msgs: [], updatedAt: Date.now() };
    conversations = [c, ...conversations];
    activeId = c.id;
    msgs = [];
    input = "";
    renamingId = c.id;
    renameValue = c.title;
    sidebarOpen = false;
    persist();
  }

  function selectConversation(id: string) {
    const c = conversations.find((x) => x.id === id);
    if (!c) return;
    activeId = id;
    msgs = cloneMsgs(c.msgs);
    sidebarOpen = false;
  }

  function deleteConversation(id: string) {
    conversations = conversations.filter((c) => c.id !== id);
    if (activeId === id) {
      activeId = conversations[0]?.id ?? null;
      msgs = conversations[0] ? cloneMsgs(conversations[0].msgs) : [];
    }
    persist();
  }

  function startRename(c: Conversation) {
    renamingId = c.id;
    renameValue = c.title;
  }

  function commitRename() {
    if (!renamingId) return;
    const t = renameValue.trim() || "Percakapan baru";
    conversations = conversations.map((c) => (c.id === renamingId ? { ...c, title: t } : c));
    renamingId = null;
    persist();
  }

  function syncActive() {
    if (!activeId) return;
    conversations = conversations.map((c) =>
      c.id === activeId ? { ...c, msgs: cloneMsgs(msgs), updatedAt: Date.now() } : c
    );
    persist();
  }

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    if (!activeId) {
      const c: Conversation = { id: uid(), title: "Percakapan baru", msgs: [], updatedAt: Date.now() };
      conversations = [c, ...conversations];
      activeId = c.id;
    }
    msgs = [...msgs, { role: "user", content: text }];
    input = "";
    busy = true;
    const conv = activeConv();
    if (conv && (conv.title === "Percakapan baru" || !conv.msgs.some((m) => m.role === "user"))) {
      const t = titleFrom(msgs);
      conversations = conversations.map((c) => (c.id === activeId ? { ...c, title: t } : c));
    }
    syncActive();
    try {
      const r = await api.chat(role, text);
      msgs = [...msgs, { role: "assistant", content: r.content, suggestions: r.suggestions }];
    } catch {
      msgs = [...msgs, { role: "assistant", content: "Gagal terhubung ke Nigi AI. Coba lagi.", suggestions: [] }];
    } finally {
      busy = false;
      syncActive();
    }
  }

  function send(q: string) {
    void ask(q);
  }

  function fmtTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  }

  function focusOnMount(node: HTMLInputElement) {
    requestAnimationFrame(() => {
      node.focus();
      node.select();
    });
  }

  onMount(() => {
    conversations = loadStore();
    activeId = conversations[0]?.id ?? null;
    if (conversations[0]) msgs = cloneMsgs(conversations[0].msgs);
    loaded = true;

    api
      .insights(role)
      .then((data) => {
        const timeGreeting = greetingByTime(roleName[role] ?? "");
        intro = {
          greeting: data.greeting
            ? `${timeGreeting}. ${data.greeting.replace(/^(Halo\w*,?|Salam,?)\s*/i, "")}`
            : `${timeGreeting}. Tanyakan apa saja soal data GC Logistics.`,
          insights: data.insights ?? []
        };
      })
      .catch(() => (introError = true))
      .finally(() => (introLoading = false));
  });

  $effect(() => {
    void msgs;
    void busy;
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  });

  $effect(() => {
    if (loaded) persist();
  });
</script>

<div class="relative mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-6xl gap-4">
  <aside
    class={cn(
      "absolute inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-card shadow-card transition-transform lg:static lg:translate-x-0",
      sidebarOpen ? "translate-x-0" : "-translate-x-[120%] lg:translate-x-0"
    )}
    aria-label="Riwayat percakapan"
  >
    <div class="flex items-center gap-2 border-b border-border/80 p-3">
      <button
        type="button"
        onclick={newConversation}
        class="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        <Icon name="plus" cls="h-4 w-4" weight="bold" />
        Percakapan baru
      </button>
      <button
        type="button"
        onclick={() => (sidebarOpen = false)}
        aria-label="Tutup riwayat"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Icon name="x" cls="h-4 w-4" />
      </button>
    </div>

    <div class="border-b border-border/80 p-3">
      <div class="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 transition-colors focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/15">
        <Icon name="search" cls="h-4 w-4 text-muted-foreground" />
        <input
          bind:value={search}
          class="h-7 min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Cari percakapan…"
          aria-label="Cari percakapan"
          autocomplete="off"
        />
        {#if search}
          <button type="button" onclick={() => (search = "")} aria-label="Hapus pencarian" class="text-muted-foreground hover:text-foreground">
            <Icon name="x" cls="h-3.5 w-3.5" />
          </button>
        {/if}
      </div>
    </div>

    <nav class="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
      {#each filtered as c (c.id)}
        <div
          class={cn(
            "group relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
            c.id === activeId ? "bg-primary/10" : "hover:bg-muted"
          )}
        >
          {#if renamingId === c.id}
            <input
              bind:value={renameValue}
              onblur={commitRename}
              onkeydown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") renamingId = null;
              }}
              class="h-7 min-w-0 flex-1 rounded-lg border border-primary/50 bg-card px-2 text-[13px] text-foreground outline-none"
              aria-label="Nama percakapan"
              use:focusOnMount
            />
            <button type="button" onclick={commitRename} aria-label="Simpan nama" class="text-muted-foreground hover:text-foreground">
              <Icon name="check" cls="h-3.5 w-3.5" weight="bold" />
            </button>
          {:else}
            <button
              type="button"
              onclick={() => selectConversation(c.id)}
              class="flex min-w-0 flex-1 items-center gap-2"
            >
              <Icon name="chat" cls="h-4 w-4 shrink-0 text-muted-foreground" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13.5px] font-medium text-foreground">{c.title}</span>
                <span class="block truncate text-[11px] text-muted-foreground">{c.msgs.length} pesan · {fmtTime(c.updatedAt)}</span>
              </span>
            </button>
            <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onclick={() => startRename(c)}
                aria-label="Ganti nama percakapan"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
              >
                <Icon name="edit" cls="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onclick={() => deleteConversation(c.id)}
                aria-label="Hapus percakapan"
                class="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Icon name="trash" cls="h-3.5 w-3.5" />
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <p class="px-3 py-6 text-center text-[13px] text-muted-foreground">
          {search ? "Tidak ada percakapan yang cocok." : "Belum ada percakapan. Mulai tanya Nigi."}
        </p>
      {/each}
    </nav>
  </aside>

  {#if sidebarOpen}
    <button
      type="button"
      aria-label="Tutup riwayat"
      class="absolute inset-0 z-20 cursor-default bg-black/30 lg:hidden"
      onclick={() => (sidebarOpen = false)}
    ></button>
  {/if}

  <div class="flex min-w-0 flex-1 flex-col gap-4">
    <header class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onclick={() => (sidebarOpen = true)}
        aria-label="Buka riwayat percakapan"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Icon name="chat" cls="h-5 w-5" />
      </button>
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground">Nigi</span>
      <div class="min-w-0">
        <h1 class="font-serif text-2xl font-light tracking-tight">{activeConv()?.title ?? "Nigi AI"}</h1>
        <p class="text-[13px] text-muted-foreground">Asisten Omnigistic · {roleName[role] ?? role} · data studi kasus GC Logistics</p>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          onclick={newConversation}
          class="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon name="plus" cls="h-3.5 w-3.5" weight="bold" />
          Baru
        </button>
        <a
          href="#composer"
          class="rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Tanya Nigi
        </a>
      </div>
    </header>

    <section class="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card shadow-card">
      <div bind:this={logEl} class="overscroll-isolate min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5" role="log" aria-live="polite" aria-label="Percakapan Nigi AI">
        {#if introLoading}
          <div class="flex gap-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">Nigi</span>
            <div class="h-16 w-2/3 animate-pulse rounded-2xl border border-border bg-muted/50"></div>
          </div>
        {:else if introError}
          <div class="rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-xs text-destructive-foreground">
            Gagal memuat ringkasan Nigi AI.
          </div>
        {:else}
          <div class="space-y-3">
            <div class="flex gap-2.5">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">Nigi</span>
              <div class="rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-[15px] leading-relaxed text-foreground">
                {intro.greeting}
              </div>
            </div>

            {#if intro.insights.length}
              <div class="space-y-2 pl-9">
                {#each intro.insights as ins, i (i)}
                  <div class="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                    <p class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <span class={cn("h-2 w-2 rounded-full", priorityDot[ins.priority] ?? "bg-muted")}></span>
                      Insight {i + 1}
                    </p>
                    <p class="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">
                      <strong class="font-semibold text-foreground">{ins.title}.</strong>
                      <span>{ins.message}</span>
                    </p>
                  </div>
                {/each}
              </div>
            {/if}

            {#if chips.length}
              <div class="flex flex-wrap gap-1.5 pl-9">
                {#each chips as c (c)}
                  <button
                    type="button"
                    onclick={() => send(c)}
                    class="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
                  >
                    {c}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        {#each msgs as m, i (i)}
          <div class={cn("flex gap-2.5", m.role === "user" && "justify-end")}>
            {#if m.role === "assistant"}
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">Nigi</span>
            {/if}
            <div class={cn("max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed", m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-foreground")}>
              {#if m.role === "assistant"}
                <ChatMarkdown text={m.content} />
              {:else}
                {m.content}
              {/if}
            </div>
          </div>
          {#if m.suggestions?.length}
            <div class="flex flex-wrap gap-1.5 pl-9">
              {#each m.suggestions as s (s)}
                <button
                  type="button"
                  onclick={() => send(s)}
                  class="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
                >
                  {s}
                </button>
              {/each}
            </div>
          {/if}
        {/each}

        {#if busy}
          <div class="flex gap-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">Nigi</span>
            <div class="rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-[15px] text-muted-foreground">mengetik…</div>
          </div>
        {/if}
      </div>

      <form
        id="composer"
        class="shrink-0 border-t border-border/80 bg-card p-3"
        onsubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <div class="flex items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pl-4 pr-1 transition-colors focus-within:border-primary/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/15">
          <input
            bind:value={input}
            class="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Tanya apa saja soal data GC Logistics…"
            aria-label="Pesan untuk Nigi AI"
            autocomplete="off"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Kirim pesan"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40"
          >
            <Icon name="send" cls="h-4 w-4" weight="fill" />
          </button>
        </div>
      </form>
    </section>
  </div>
</div>
