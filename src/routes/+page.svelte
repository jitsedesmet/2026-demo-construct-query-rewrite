<script lang="ts">
  import Yasge from "$lib/components/Yasge.svelte";
  import YasqeEditor from "$lib/components/YasqeEditor.svelte";
  import MappingEditor from "$lib/components/MappingEditor.svelte";
  import type { Mapping } from "$lib/mapping";
  import { DEFAULT_MAPPING_QUERY, DEFAULT_MAPPING_LABEL } from "$lib/mapping";
  import QueryResults from "$lib/components/QueryResults.svelte";
  import SourceSelector from "$lib/components/SourceSelector.svelte";
  import type {Bindings} from "@rdfjs/types";
  import {alterQuery, getQueryParam} from "$lib/helpers.svelte";
  import {goto} from "$app/navigation";
  import {exampleQueries} from "$lib/exampleQueries";

  // ── Mappings state ─────────────────────────────────────────────────────────
  function makeDefaultMappings(): Mapping[] {
    return [{ id: crypto.randomUUID(), label: DEFAULT_MAPPING_LABEL, query: DEFAULT_MAPPING_QUERY }];
  }

  let mappings = $state<Mapping[]>(makeDefaultMappings());

  /** The baseline mappings to compare against for overwrite-protection.
   *  Updated whenever an example is loaded or on first load. */
  let baselineMappings = $state<Mapping[]>(makeDefaultMappings());

  function mappingsAreDirty(): boolean {
    if (mappings.length !== baselineMappings.length) return true;
    return mappings.some((m, i) =>
      m.query !== baselineMappings[i].query || m.label !== baselineMappings[i].label
    );
  }

  // ── Pending example load (for overwrite-protection modal) ──────────────────
  let pendingExample = $state<(typeof exampleQueries)[0] | null>(null);
  let showModal = $state(false);

  // ── Query & results ────────────────────────────────────────────────────────
  let selectedSources = $state<string[]>(["https://fragments.dbpedia.org/2016-04/en"]);
  const defaultQuery = `PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?movie ?title ?name
WHERE {
  ?movie dbpedia-owl:starring [ rdfs:label "Brad Pitt"@en ];
         rdfs:label ?title;
         dbpedia-owl:director [ rdfs:label ?name ].
  FILTER LANGMATCHES(LANG(?title), "EN")
  FILTER LANGMATCHES(LANG(?name),  "EN")
}`;
  let query = $state<string>(getQueryParam('query') ?? defaultQuery);
  let rewrittenQuery = $state<string>('');
  let bindings = $state<Bindings[]>([]);
  let queryDone = $state(false);
  let queryRunning = $state(false);
  let queryStartTime = $state(0);
  let queryCancelled = $state(false);
  let elapsed = $state(0);
  let yasgeRef: { cancelQuery: () => void } | undefined = $state();
  let queryTimerSuffix = $derived(queryRunning ? '…' : queryCancelled ? ' (stopped)' : '');

  $effect(() => {
    if (!queryRunning) return;
    const start = queryStartTime;
    elapsed = 0;
    const id = setInterval(() => {
      elapsed = (Date.now() - start) / 1000;
    }, 100);
    return () => {
      clearInterval(id);
      elapsed = (Date.now() - start) / 1000;
    };
  });

  // ── Layout measurements ────────────────────────────────────────────────────
  let headerHeight = $state(0);
  let footerHeight = $state(0);

  // ── Derive active example name from URL ───────────────────────────────────
  let activeExampleName = $derived(
    exampleQueries.find(q => q.query === getQueryParam('query'))?.name ?? ''
  );

  // ── Example loading ────────────────────────────────────────────────────────
  function applyExample(example: (typeof exampleQueries)[0]) {
    query = example.query;
    const newMappings = example.mappings.map(m => ({ ...m, id: crypto.randomUUID() }));
    mappings = newMappings;
    baselineMappings = newMappings.map(m => ({ ...m }));
    // Clear any stale execution state from the previous query
    rewrittenQuery = '';
    bindings = [];
    queryDone = false;
    queryCancelled = false;
  }

  async function loadExample(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const example = exampleQueries.find(q => q.name === select.value);
    if (!example) return;

    if (mappingsAreDirty()) {
      pendingExample = example;
      showModal = true;
      // Reset the select value to avoid it staying on the new selection while modal is open
      select.value = activeExampleName;
      return;
    }

    applyExample(example);
    await goto(alterQuery('query', example.query), { replaceState: false });
  }

  function cancelLoad() {
    pendingExample = null;
    showModal = false;
  }

  let cancelBtnEl = $state<HTMLButtonElement | undefined>(undefined);

  // Focus cancel button when modal opens (proper focus management for dialogs)
  $effect(() => {
    if (showModal && cancelBtnEl) cancelBtnEl.focus();
  });
  $effect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelLoad(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  async function confirmLoad() {
    if (!pendingExample) return;
    const example = pendingExample;
    showModal = false;
    pendingExample = null;
    applyExample(example);
    await goto(alterQuery('query', example.query), { replaceState: false });
  }
</script>

<!-- ── Overwrite-protection modal ──────────────────────────────────────────── -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    onclick={cancelLoad}
  >
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="modal-title">
      <h3 id="modal-title">Replace current mappings?</h3>
      <p>
        Loading <strong>"{pendingExample?.name}"</strong> will overwrite your current
        mappings. Any unsaved changes will be lost.
      </p>
      <div class="modal-actions">
        <button class="btn-cancel" bind:this={cancelBtnEl} onclick={cancelLoad}>Cancel</button>
        <button class="btn-confirm" onclick={confirmLoad}>Load example</button>
      </div>
    </div>
  </div>
{/if}

<div class="page">
  <header bind:clientHeight={headerHeight}>
    <h1>SPARQL Query Rewriting</h1>
  </header>

  <main class="split-view">
    <!-- ===== LEFT PANEL ===== -->
    <div class="left-panel" style="height: calc(100svh - {headerHeight}px - {footerHeight}px - 8px - 12px)">

      <!-- Mappings section -->
      <section class="config-section">
        <h2>Mappings</h2>
        <MappingEditor bind:mappings height="22svh" />
      </section>

      <!-- Rewritten query section -->
      <section class="config-section rewritten-section">
        <h2>Rewritten query <span class="section-hint">(read-only, populated on execute)</span></h2>
        <YasqeEditor query={rewrittenQuery} readonly height="18svh" />
      </section>

    </div>

    <!-- ===== RIGHT PANEL ===== -->
    <div class="right-panel">
      <section class="query-section">
        <div class="query-title-row">
          <h2>Query</h2>
          <select class="example-select" value={activeExampleName} onchange={loadExample}>
            <option value="" disabled>Load example…</option>
            {#each exampleQueries as example}
              <option value={example.name}>{example.name}</option>
            {/each}
          </select>
        </div>
        <span class="source-label">Choose datasources:</span>
        <SourceSelector bind:selected={selectedSources} />
        <Yasge
          bind:this={yasgeRef}
          bind:query
          bind:bindings
          bind:queryDone
          bind:queryRunning
          bind:queryStartTime
          bind:queryCancelled
          bind:rewrittenQuery
          rewrite={(q) => q}
          sources={selectedSources}
        />
        {#if queryRunning}
          <button class="stop-btn" onclick={() => yasgeRef?.cancelQuery()}>
            <svg viewBox="0 0 10 10" height="0.8em" aria-hidden="true">
              <rect x="1" y="1" width="8" height="8" />
            </svg>
            Stop
          </button>
        {/if}
      </section>

      <section class="results-section">
        <div class="results-header">
          <h2>Results</h2>
          {#if queryRunning || queryDone || queryCancelled}
            <span class="query-timer">{bindings.length} result{bindings.length === 1 ? '' : 's'} in {elapsed.toFixed(1)}s{queryTimerSuffix}</span>
          {/if}
        </div>
        <QueryResults {bindings} {queryDone} {queryCancelled} />
      </section>
    </div>
  </main>

  <footer bind:clientHeight={footerHeight}>
    <a href="https://github.com/jitsedesmet/2026-demo-construct-query-rewrite">
      <svg height="1.5rem" aria-hidden="true" viewBox="0 0 24 24" version="1.1" width="24">
        <path d="M12 1C5.9225 1 1 5.9225 1 12C1 16.8675 4.14875 20.9787 8.52125 22.4362C9.07125 22.5325 9.2775 22.2025 9.2775 21.9137C9.2775 21.6525 9.26375 20.7862 9.26375 19.865C6.5 20.3737 5.785 19.1912 5.565 18.5725C5.44125 18.2562 4.905 17.28 4.4375 17.0187C4.0525 16.8125 3.5025 16.3037 4.42375 16.29C5.29 16.2762 5.90875 17.0875 6.115 17.4187C7.105 19.0812 8.68625 18.6137 9.31875 18.325C9.415 17.61 9.70375 17.1287 10.02 16.8537C7.5725 16.5787 5.015 15.63 5.015 11.4225C5.015 10.2262 5.44125 9.23625 6.1425 8.46625C6.0325 8.19125 5.6475 7.06375 6.2525 5.55125C6.2525 5.55125 7.17375 5.2625 9.2775 6.67875C10.1575 6.43125 11.0925 6.3075 12.0275 6.3075C12.9625 6.3075 13.8975 6.43125 14.7775 6.67875C16.8813 5.24875 17.8025 5.55125 17.8025 5.55125C18.4075 7.06375 18.0225 8.19125 17.9125 8.46625C18.6138 9.23625 19.04 10.2125 19.04 11.4225C19.04 15.6437 16.4688 16.5787 14.0213 16.8537C14.42 17.1975 14.7638 17.8575 14.7638 18.8887C14.7638 20.36 14.75 21.5425 14.75 21.9137C14.75 22.2025 14.9563 22.5462 15.5063 22.4362C19.8513 20.9787 23 16.8537 23 12C23 5.9225 18.0775 1 12 1Z"></path>
      </svg>
      <span>Source code</span>
    </a>
  </footer>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Funnel+Display:wght@300..800&display=swap');

  /* ---- Page shell ---- */
  .page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    box-sizing: border-box;
    padding: 0 1rem 0.5rem;
  }

  header {
    text-align: center;
    padding: 0.75rem 0 0.5rem;
  }

  h1 {
    font-family: "Audiowide", serif;
    font-size: clamp(1.4rem, 3vw, 2.4rem);
    font-weight: 400;
    margin: 0;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.4rem 0;
  }

  .section-hint {
    font-size: 0.75em;
    font-weight: 400;
    color: #888;
  }

  /* ---- Split view ---- */
  .split-view {
    display: flex;
    flex: 1;
    gap: 1.25rem;
    align-items: flex-start;
  }

  .left-panel {
    flex: 0 0 38%;
    min-width: 260px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    position: sticky;
    top: 0;
    align-self: flex-start;
  }

  .right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* ---- Config sections ---- */
  .config-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    padding: 0.75rem;
    background: #fafbfc;
    overflow: hidden;
  }

  .rewritten-section {
    flex: 0 0 auto;
  }

  .source-label {
    font-weight: 500;
    white-space: nowrap;
  }

  .query-title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.4rem;
  }

  .query-title-row h2 {
    margin: 0;
    flex-shrink: 0;
  }

  .example-select {
    font-size: 0.85em;
    padding: 0.2rem 0.4rem;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
    max-width: 18rem;
  }

  /* ---- Query / Results sections ---- */
  .query-section,
  .results-section {
    border: 1px solid #d0d7de;
    border-radius: 8px;
    padding: 0.75rem;
    background: #fafbfc;
  }

  .results-header {
    display: flex;
    align-items: baseline;
    margin-bottom: 0.4rem;
  }

  .results-header h2 {
    margin: 0;
    flex: 1;
  }

  .query-timer {
    font-size: 0.88em;
    color: #555;
    white-space: nowrap;
  }

  .stop-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    margin-top: 0.4rem;
    padding: 0.3em 0.75em;
    background: #c0392b;
    color: #fff;
    border: none;
    border-radius: 4px;
    font-size: 0.88em;
    cursor: pointer;
  }

  .stop-btn:hover {
    background: #a93226;
  }

  .stop-btn svg rect {
    fill: #fff;
  }

  /* ---- Modal ---- */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: #fff;
    border-radius: 10px;
    padding: 1.5rem 2rem;
    max-width: 26rem;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.22);
  }

  .modal h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .modal p {
    margin: 0 0 1.25rem 0;
    font-size: 0.92em;
    color: #444;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 0.4em 1em;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    cursor: pointer;
    font-size: 0.9em;
  }

  .btn-cancel:hover {
    background: #e8ecf0;
  }

  .btn-confirm {
    padding: 0.4em 1em;
    border: none;
    border-radius: 6px;
    background: #2194f3;
    color: #fff;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
  }

  .btn-confirm:hover {
    background: #1a7fd4;
  }

  /* ---- Footer ---- */
  footer {
    display: flex;
    gap: 1rem;
    padding: 6px 0;
    margin-top: 0.5rem;
  }

  footer a {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #333;
    text-decoration: none;
    font-size: 0.9em;
  }

  footer svg {
    fill: #555;
  }

  /* ---- Global overrides ---- */
  :global {
    *:not(.yasge *) {
      font-family: "Funnel Display", serif;
      font-optical-sizing: auto;
      font-weight: 300;
      font-style: normal;
    }
  }
</style>
