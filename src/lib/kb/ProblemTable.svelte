<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupProblems } from '#lib/kb/problems';

  let { ticket }: { ticket: number } = $props();

  const merged = $derived(uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket));
  const groups = $derived(groupProblems(merged, tenantOf));
  const handles = (ids: Report[]) => {
    const n = new Map<string, number>();
    for (const r of ids) n.set(r.tenant, (n.get(r.tenant) ?? 0) + 1);
    return [...n.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([handle, count]) => `${handle} ×${count}`)
      .join(' · ');
  };
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>seen</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#each groups as g (g.problem)}
  <p class="note"><code>{g.problem}</code> · {handles(g.reports)}</p>
  {#if g.reports.length <= 3}
    <ul>
      {#each g.reports as r (r.id)}
        <li><code>{r.id}</code> {r.body}</li>
      {/each}
    </ul>
  {/if}
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .note { color: var(--muted); font-size: 0.85em; }
</style>
