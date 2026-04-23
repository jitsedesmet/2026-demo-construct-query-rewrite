<script lang="ts">
  import YasqeEditor from "./YasqeEditor.svelte";
  import type { Mapping } from "$lib/mapping";
  import { DEFAULT_MAPPING_QUERY, DEFAULT_MAPPING_LABEL } from "$lib/mapping";

  function makeDefault(): Mapping {
    return { id: crypto.randomUUID(), label: DEFAULT_MAPPING_LABEL, query: DEFAULT_MAPPING_QUERY };
  }

  interface Props {
    mappings: Mapping[];
    height?: string;
  }

  let { mappings = $bindable([makeDefault()]), height = '25svh' }: Props = $props();

  let activeId = $state(mappings[0]?.id ?? '');

  // Keep activeId in sync if the mappings array is replaced externally
  $effect(() => {
    if (!mappings.find(m => m.id === activeId)) {
      activeId = mappings[0]?.id ?? '';
    }
  });

  let editingId = $state<string | null>(null);
  let editingLabel = $state('');
  let renameInputEl = $state<HTMLInputElement | undefined>(undefined);

  function add() {
    const m = makeDefault();
    mappings = [...mappings, m];
    activeId = m.id;
  }

  function close(id: string) {
    const idx = mappings.findIndex(m => m.id === id);
    mappings = mappings.filter(m => m.id !== id);
    if (mappings.length === 0) {
      const def = makeDefault();
      mappings = [def];
      activeId = def.id;
    } else if (activeId === id) {
      activeId = mappings[Math.min(idx, mappings.length - 1)].id;
    }
  }

  function startRename(m: Mapping) {
    editingId = m.id;
    editingLabel = m.label;
    // Focus is handled via bind:this + $effect below
  }

  $effect(() => {
    if (editingId && renameInputEl) {
      renameInputEl.focus();
      renameInputEl.select();
    }
  });

  function commitRename() {
    if (editingId) {
      const m = mappings.find(m => m.id === editingId);
      if (m) m.label = editingLabel.trim() || m.label;
    }
    editingId = null;
  }
</script>

<div class="mapping-editor">
  <div class="tab-bar" role="tablist">
    {#each mappings as mapping (mapping.id)}
      <div class="tab" class:active={activeId === mapping.id}>
        {#if editingId === mapping.id}
          <input
            bind:this={renameInputEl}
            class="rename-input"
            bind:value={editingLabel}
            onblur={commitRename}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); commitRename(); }
            }}
          />
        {:else}
          <button
            class="tab-label"
            role="tab"
            aria-selected={activeId === mapping.id}
            type="button"
            onclick={() => (activeId = mapping.id)}
            ondblclick={() => startRename(mapping)}
            title="Double-click to rename"
          >{mapping.label}</button>
        {/if}
        <button
          class="close-tab"
          type="button"
          aria-label="Close {mapping.label}"
          onclick={(e) => { e.stopPropagation(); close(mapping.id); }}
        >×</button>
      </div>
    {/each}
    <button class="add-tab" type="button" aria-label="Add mapping" onclick={add}>+</button>
  </div>

  <div class="tab-content">
    {#each mappings as mapping (mapping.id)}
      {#if activeId === mapping.id}
        <YasqeEditor bind:query={mapping.query} {height} />
      {/if}
    {/each}
  </div>
</div>

<style>
  .mapping-editor {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    align-items: stretch;
    background: #f6f8fa;
    border-bottom: 1px solid #ccc;
    overflow-x: auto;
    overflow-y: hidden;
    flex-shrink: 0;
  }

  .tab {
    display: flex;
    align-items: stretch;
    border-right: 1px solid #ccc;
    background: transparent;
    transition: background 0.15s;
  }

  .tab.active {
    background: #fff;
    border-bottom: 2px solid #2194f3;
    margin-bottom: -1px;
  }

  .tab-label {
    padding: 5px 8px 5px 12px;
    font-size: 0.82em;
    background: transparent;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    font-weight: 400;
  }

  .tab.active .tab-label {
    font-weight: 600;
  }

  .tab-label:hover {
    text-decoration: underline;
  }

  .rename-input {
    padding: 3px 6px;
    font-size: 0.82em;
    border: 1px solid #2194f3;
    border-radius: 3px;
    outline: none;
    width: 8em;
    margin: 3px;
  }

  .close-tab {
    padding: 2px 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.9em;
    color: #888;
    line-height: 1;
    align-self: center;
  }

  .close-tab:hover {
    color: #c0392b;
    background: rgba(192, 57, 43, 0.1);
    border-radius: 3px;
  }

  .add-tab {
    padding: 5px 10px;
    font-size: 1em;
    font-weight: 600;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #2194f3;
    align-self: center;
    border-radius: 4px;
    margin: 2px 2px 2px 4px;
  }

  .add-tab:hover {
    background: #e8f0fe;
  }

  .tab-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
</style>
