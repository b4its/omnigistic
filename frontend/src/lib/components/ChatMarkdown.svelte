<script lang="ts">
  /** Render bold + bullets dari jawaban Nigi AI. Teks = untrusted (LLM/DB) → HTML di-escape sebelum {@html}. */

  function esc(t: string): string {
    return t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function inline(text: string): string {
    return esc(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  let { text = "" }: { text?: string } = $props();

  type Block = { kind: "ul" | "ol" | "p"; t: string; num: number };

  const blocks: Block[] = $derived.by(() => {
    const arr: Block[] = [];
    let n = 0;
    let prev = "";
    for (const raw of (text || "").split(/\r?\n/)) {
      const s = raw.trim();
      if (!s) {
        n = 0;
        prev = "";
        continue;
      }
      const mUl = s.match(/^[-*]\s+(.*)$/);
      const mOl = s.match(/^\d+[.)]\s+(.*)$/);
      if (mUl) arr.push({ kind: "ul", t: mUl[1], num: 0 });
      else if (mOl) {
        n = prev === "ol" ? n + 1 : 1;
        arr.push({ kind: "ol", t: mOl[1], num: n });
      } else {
        n = 0;
        arr.push({ kind: "p", t: s, num: 0 });
      }
      prev = mUl ? "ul" : mOl ? "ol" : "p";
    }
    return arr;
  });
</script>

<div class="space-y-1.5">
  {#each blocks as b, i (i)}
    {#if b.kind === "p"}
      <p class="leading-relaxed">{@html inline(b.t)}</p>
    {:else if b.kind === "ul"}
      <ul class="my-0.5 list-none space-y-1">
        <li class="flex gap-2">
          <span aria-hidden="true" class="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-primary"></span>
          <span>{@html inline(b.t)}</span>
        </li>
      </ul>
    {:else}
      <ol class="my-0.5 list-none space-y-1">
        <li class="flex gap-2">
          <span class="mt-px shrink-0 font-bold tabular-nums text-primary">{b.num}.</span>
          <span>{@html inline(b.t)}</span>
        </li>
      </ol>
    {/if}
  {/each}
</div>
