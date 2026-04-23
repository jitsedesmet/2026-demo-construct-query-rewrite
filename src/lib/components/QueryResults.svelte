<script lang="ts">
  import type {Bindings} from "@rdfjs/types";
  import type { Term } from "@rdfjs/types";

  interface Props {
    bindings: Bindings[];
    queryDone: boolean;
    queryCancelled?: boolean;
  }
  let { bindings, queryDone, queryCancelled = false }: Props = $props();

  function termToString(term: Term): string {
    switch (term.termType) {
      case "BlankNode":
        return term.value;
      case "DefaultGraph":
        return term.value;
      case "Literal":
        return term.value;
      case "NamedNode":
        return `<${term.value}>`;
      case "Quad":
        return `<<( ${[term.subject, term.predicate, term.object].map(termToString).join(" ")} )>>`;
      default:
        return term.value;
    }
  }
</script>

{#if bindings.length > 0 || queryDone || queryCancelled}
  {#if queryCancelled}
    <p class="stopped-notice">⚠ Query stopped — results may be incomplete.</p>
  {/if}
  {#if bindings.length === 0 && queryDone}
    <p class="no-results">Query returned no results.</p>
  {:else}
    {#each bindings as binding, i}
      <div class="binding-card" aria-label="Result binding {i + 1}">
        {#if [...binding.keys()].length === 0}
          <span class="empty-binding">(empty binding)</span>
        {:else}
          {#each [...binding] as [variable, term]}
            <div class="binding-row">
              <span class="var-badge">?{variable.value}</span>
              <span class="term-value">{termToString(term)}</span>
            </div>
          {/each}
        {/if}
      </div>
    {/each}
  {/if}
{/if}

<style>
  .no-results {
    color: #555;
    font-size: 0.88em;
    margin: 0;
  }

  .stopped-notice {
    color: #7d3c0a;
    background: #fdf3e3;
    border: 1px solid #f0a500;
    border-radius: 4px;
    font-size: 0.85em;
    padding: 0.3em 0.6em;
    margin: 0 0 0.5rem 0;
  }

  .binding-card {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    overflow: hidden;
    background: #fff;
    display: grid;
    grid-template-columns: max-content 1fr;
  }

  .binding-row {
    display: contents;
  }

  .var-badge {
    background: #4a6081;
    color: #fff;
    font-weight: 700;
    font-size: 0.82em;
    padding: 4px 10px;
    min-width: 5.5rem;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e1e4e8;
  }

  .binding-row:last-child .var-badge,
  .binding-row:last-child .term-value {
    border-bottom: none;
  }

  .term-value {
    padding: 4px 10px;
    font-size: 0.88em;
    word-break: break-all;
    align-self: center;
    border-bottom: 1px solid #e1e4e8;
  }

  .empty-binding {
    grid-column: 1 / -1;
    display: block;
    padding: 6px 10px;
    color: #888;
    font-size: 0.88em;
    font-style: italic;
  }
</style>
