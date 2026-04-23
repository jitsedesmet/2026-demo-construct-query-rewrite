<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    content?: Snippet;
  }

  interface Props {
    tabs: Tab[];
    activeTab?: string;
    tabContent?: Snippet<[Tab]>;
  }

  let { tabs, activeTab = $bindable(tabs[0]?.id ?? ''), tabContent }: Props = $props();
</script>

<div class="tab-panel">
  <div class="tab-bar" role="tablist">
    {#each tabs as tab}
      <button
        role="tab"
        aria-selected={activeTab === tab.id}
        class:active={activeTab === tab.id}
        onclick={() => (activeTab = tab.id)}
        type="button"
      >
        {tab.label}
      </button>
    {/each}
  </div>
  <div class="tab-content">
    {#each tabs as tab}
      {#if activeTab === tab.id}
        {#if tab.content}
          {@render tab.content()}
        {:else if tabContent}
          {@render tabContent(tab)}
        {/if}
      {/if}
    {/each}
  </div>
</div>

<style>
  .tab-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid #ccc;
    border-radius: 6px;
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    background: #f6f8fa;
    border-bottom: 1px solid #ccc;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .tab-bar button {
    padding: 6px 14px;
    font-size: 0.85em;
    border: none;
    border-radius: 0;
    background: transparent;
    cursor: pointer;
    border-right: 1px solid #ccc;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .tab-bar button:last-child {
    border-right: none;
  }

  .tab-bar button.active {
    background: #fff;
    font-weight: 600;
    border-bottom: 2px solid #2194f3;
    margin-bottom: -1px;
  }

  .tab-bar button:hover:not(.active) {
    background: #e8f0fe;
  }

  .tab-content {
    flex: 1;
    padding: 0.75rem;
    background: #fff;
    overflow: auto;
  }
</style>
