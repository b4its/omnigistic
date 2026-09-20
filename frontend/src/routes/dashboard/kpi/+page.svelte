<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { onMount } from "svelte";
  import { api, type KpiRow } from "$lib/api";
  import PageState from "$lib/components/PageState.svelte";

  let rows = $state<KpiRow[]>([]);
  let loaded = $state(false);
  let failed = $state(false);

  async function load() {
    failed = false;
    loaded = false;
    try {
      rows = await api.kpiTargets();
    } catch {
      rows = [];
      failed = true;
    }
    loaded = true;
  }

  onMount(() => void load());
</script>

<div class="space-y-6">
  <h1 class="font-heading text-xl font-semibold tracking-tight">{m.kp01()}</h1>
  <p class="text-sm text-muted-foreground">{m.kp02()} <code class="font-mono text-xs">{m.kp03()}</code></p>

  {#if loaded && failed}
    <PageState loading={false} error={true} errorTitle={m.kq2t1()} errorHint={m.kq2t2()} onretry={load} />
  {:else if loaded && rows.length > 0}
    <div class="overflow-x-auto rounded-2xl border bg-card">
      <table class="w-full text-sm">
        <caption class="sr-only">{m.kp04()}</caption>
        <thead>
          <tr class="border-b bg-muted/50 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <th scope="col" class="px-4 py-3">{m.kp05()}</th>
            <th scope="col" class="px-4 py-3 text-right">{m.kp06()}</th>
            <th scope="col" class="px-4 py-3 text-right">{m.kp07()}</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as r (r.kpi)}
            <tr class="border-b last:border-0 transition-colors hover:bg-[color-mix(in_oklab,var(--bitcoin)_5%,transparent)]">
              <td class="px-4 py-3 text-foreground">{r.kpi}</td>
              <td class="kpi-value px-4 py-3 text-right text-muted-foreground line-through">{r.baseline}</td>
              <td class="kpi-value px-4 py-3 text-right text-[var(--bitcoin)]">{r.target}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if loaded}
    <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">{m.kp08()}</div>
  {:else}
    <PageState loading={true} skeletonCards={0} skeletonHeight={280} />
  {/if}
</div>
