<script lang="ts">
  interface Datasource {
    name: string;
    url: string;
  }

  const PRESET_SOURCES: Datasource[] = [
    { name: "DBpedia 2016-04", url: "https://fragments.dbpedia.org/2016-04/en" },
    { name: "Ruben Verborgh's Profile", url: "https://ruben.verborgh.org/profile/" },
    { name: "Ruben Taelman's Profile", url: "https://www.rubensworks.net/" },
    { name: "DBpedia SPARQL", url: "https://dbpedia.org/sparql" },
    { name: "DBpedia 2015-10", url: "https://fragments.dbpedia.org/2015-10/en" },
    { name: "DBpedia 2015-04", url: "https://fragments.dbpedia.org/2015/en" },
    { name: "DBpedia 2014", url: "https://fragments.dbpedia.org/2014/en" },
    { name: "Ghent University Academic Bibliography", url: "https://data.linkeddatafragments.org/ugent-biblio" },
    { name: "Linked Open Vocabularies", url: "https://data.linkeddatafragments.org/lov" },
    { name: "Virtual International Authority File (VIAF)", url: "https://data.linkeddatafragments.org/viaf" },
    { name: "Harvard Library", url: "https://data.linkeddatafragments.org/harvard" },
    { name: "Between Our Worlds 2018-06", url: "https://data.betweenourworlds.org/2018-06" },
    { name: "Wikidata", url: "https://query.wikidata.org/bigdata/ldf" },
    { name: "Wikidata SPARQL", url: "https://query.wikidata.org/sparql" },
    { name: "SNCB", url: "https://graph.irail.be/sncb/connections" },
    { name: "Uniprot", url: "https://sparql.uniprot.org/sparql" },
    { name: "Rhea", url: "https://sparql.rhea-db.org/sparql" },
    { name: "Disputed Territories", url: "https://raw.githubusercontent.com/rubensworks/rdf-12-examples/refs/heads/master/territories/data.ttl" },
  ];

  interface Props {
    selected: string[];
  }

  let { selected = $bindable([]) }: Props = $props();

  let inputValue = $state('');
  let open = $state(false);
  let inputEl: HTMLInputElement;

  function getLabel(url: string): string {
    const preset = PRESET_SOURCES.find(s => s.url === url);
    return preset ? preset.name : url;
  }

  let filtered = $derived(
    PRESET_SOURCES.filter(s =>
      !selected.includes(s.url) &&
      (s.name.toLowerCase().includes(inputValue.toLowerCase()) ||
       s.url.toLowerCase().includes(inputValue.toLowerCase()))
    )
  );

  function addSource(url: string) {
    const trimmed = url.trim();
    if (trimmed && !selected.includes(trimmed)) {
      selected = [...selected, trimmed];
    }
    inputValue = '';
  }

  function removeSource(url: string) {
    selected = selected.filter(s => s !== url);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && inputValue.trim()) {
      addSource(inputValue.trim());
      open = false;
    } else if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

<div class="source-selector">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="input-area" onclick={() => inputEl.focus()}>
    {#each selected as url}
      <span class="tag">
        {getLabel(url)}
        <button type="button" aria-label="Remove {getLabel(url)}" onclick={(e) => { e.stopPropagation(); removeSource(url); }}>×</button>
      </span>
    {/each}
    <input
      bind:this={inputEl}
      bind:value={inputValue}
      placeholder={selected.length === 0 ? "Select a preset data source, or type a custom URL" : ""}
      onfocus={() => (open = true)}
      onblur={() => setTimeout(() => (open = false), 150)}
      onkeydown={handleKeydown}
      oninput={() => (open = true)}
    />
  </div>

  {#if open && filtered.length > 0}
    <ul class="dropdown" role="listbox">
      {#each filtered as source}
        <li role="option" aria-selected="false" onmousedown={() => addSource(source.url)}>
          {source.name}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .source-selector {
    position: relative;
    margin-bottom: 0.5rem;
  }

  .input-area {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px 6px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: white;
    cursor: text;
    min-height: 32px;
    align-items: center;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #e8f0fe;
    border: 1px solid #c5d2f6;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.82em;
    white-space: nowrap;
  }

  .tag button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1em;
    line-height: 1;
    color: #555;
  }

  .tag button:hover {
    color: #000;
  }

  input {
    border: none;
    outline: none;
    flex: 1;
    min-width: 180px;
    font-size: 0.85em;
    background: transparent;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 100;
    background: white;
    border: 1px solid #d0d7de;
    border-radius: 0 0 6px 6px;
    max-height: 200px;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .dropdown li {
    padding: 6px 10px;
    cursor: pointer;
    font-size: 0.88em;
  }

  .dropdown li:hover {
    background: #f0f4ff;
  }
</style>
