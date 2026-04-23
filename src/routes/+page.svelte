<script lang="ts">
  import Yasge from "$lib/components/Yasge.svelte";
  import ToggleGroup from "$lib/components/ToggleGroup.svelte";
  import TabPanel from "$lib/components/TabPanel.svelte";
  import QueryResults from "$lib/components/QueryResults.svelte";
  import SourceSelector from "$lib/components/SourceSelector.svelte";
  import type {Bindings} from "@rdfjs/types";
  import {alterQuery, getQueryParam, removeQuery} from "$lib/helpers.svelte";
  import {goto} from "$app/navigation";
  import {exampleQueries} from "$lib/exampleQueries";

  // Parser composition toggles
  const compositionOptions = ['SPARQL 1.2', 'Built-in Adjust', 'Lateral operation'];

  function parseButtonList(param: string | null): Set<string> {
    if (!param) return new Set<string>();
    return new Set(param.split(',').filter(item => item));
  }

  function syncButtonState(composition: Set<string>, key: string): void {
    const list = [...composition];
    const newIri = list.length === 0 ? removeQuery(key) : alterQuery(key, list.join(','))
    goto(newIri, {
      replaceState: true,
    });
  }

  let parserComposition = $state(parseButtonList(getQueryParam('parserConfig')));
  let engineComposition = $state(parseButtonList(getQueryParam('engineConfig')));

  function toggleOption(current: Set<string>, opt: string): Set<string> {
    const next = new Set(current);
    if (next.has(opt)) next.delete(opt); else next.add(opt);
    return next;
  }

  // Derive the name of the active example from the current query URL param
  let activeExampleName = $derived(
    exampleQueries.find(q => q.query === getQueryParam('query'))?.name ?? ''
  );

  async function loadExample(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const example = exampleQueries.find(q => q.name === select.value);
    if (!example) return;

    // Update local state immediately for instant UI feedback
    query = example.query;

    // Final navigation creates a single history entry (back button works correctly)
    await goto(alterQuery('query', example.query), { replaceState: false });
  }

  // Parser tabs
  let parserActiveTab = $state('lexer');
  // Engine tabs
  let engineActiveTab = $state('config-default');

  // Query & results
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

  // Layout measurements for left-panel height composition
  let headerHeight = $state(0);
  let footerHeight = $state(0);
</script>

<div class="page">
  <header bind:clientHeight={headerHeight}>
    <h1>SPARQL Engine &amp; Parser Composability</h1>
  </header>

  <main class="split-view">
    <!-- ===== LEFT PANEL ===== -->
    <div class="left-panel" style="height: calc(100svh - {headerHeight}px - {footerHeight}px - 8px - 12px)">
      <!-- Parser section -->
      <section class="config-section">
        <ToggleGroup
          label="Parser:"
          options={compositionOptions}
          selected={parserComposition}
          ontoggle={(opt) => {
            parserComposition = toggleOption(parserComposition, opt)
            syncButtonState(parserComposition, 'parserConfig')
          }}
        />

        <TabPanel
          tabs={[]}
          bind:activeTab={parserActiveTab}
        />


      </section>

      <!-- Engine section -->
      <section class="config-section">
        <ToggleGroup
          label="Engine:"
          options={compositionOptions}
          selected={engineComposition}
          ontoggle={(opt) => {
            engineComposition = toggleOption(engineComposition, opt)
            syncButtonState(engineComposition, 'engineConfig')
          }}
        />
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
        <Yasge bind:this={yasgeRef} bind:query bind:bindings bind:queryDone bind:queryRunning bind:queryStartTime bind:queryCancelled {parserComposition} {engineComposition} sources={selectedSources} />
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
    <a href="https://github.com/jitsedesmet/demo-mixed-composability">
      <svg height="1.5rem" aria-hidden="true" viewBox="0 0 24 24" version="1.1" width="24">
        <path d="M12 1C5.9225 1 1 5.9225 1 12C1 16.8675 4.14875 20.9787 8.52125 22.4362C9.07125 22.5325 9.2775 22.2025 9.2775 21.9137C9.2775 21.6525 9.26375 20.7862 9.26375 19.865C6.5 20.3737 5.785 19.1912 5.565 18.5725C5.44125 18.2562 4.905 17.28 4.4375 17.0187C4.0525 16.8125 3.5025 16.3037 4.42375 16.29C5.29 16.2762 5.90875 17.0875 6.115 17.4175C7.105 19.0812 8.68625 18.6137 9.31875 18.325C9.415 17.61 9.70375 17.1287 10.02 16.8537C7.5725 16.5787 5.015 15.63 5.015 11.4225C5.015 10.2262 5.44125 9.23625 6.1425 8.46625C6.0325 8.19125 5.6475 7.06375 6.2525 5.55125C6.2525 5.55125 7.17375 5.2625 9.2775 6.67875C10.1575 6.43125 11.0925 6.3075 12.0275 6.3075C12.9625 6.3075 13.8975 6.43125 14.7775 6.67875C16.8813 5.24875 17.8025 5.55125 17.8025 5.55125C18.4075 7.06375 18.0225 8.19125 17.9125 8.46625C18.6138 9.23625 19.04 10.2125 19.04 11.4225C19.04 15.6437 16.4688 16.5787 14.0213 16.8537C14.42 17.1975 14.7638 17.8575 14.7638 18.8887C14.7638 20.36 14.75 21.5425 14.75 21.9137C14.75 22.2025 14.9563 22.5462 15.5063 22.4362C19.8513 20.9787 23 16.8537 23 12C23 5.9225 18.0775 1 12 1Z"></path>
      </svg>
      <span>Source code</span>
    </a>
    <a href="https://traqula-resource.jitsedesmet.be/">
      <svg height="1.3rem" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" style="fill: rgb(100,100,100)">
        <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z"/>
      </svg>
      <span>Resource Paper</span>
    </a>
    <a href="https://2026-eswc-demo.jitsedesmet.be/">
        <svg height="1.3rem" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" style="fill: rgb(100,100,100)">
            <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z"/>
        </svg>
        <span>Demo Paper</span>
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
