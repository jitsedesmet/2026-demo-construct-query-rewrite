<script lang="ts">
  interface Props {
    label: string;
    options: string[];
    selected: Set<string>;
    ontoggle: (option: string) => void;
  }

  let { label, options, selected, ontoggle }: Props = $props();
</script>

<div class="toggle-group">
  <span class="label">{label}</span>
  <div class="buttons">
    {#each options as option}
      <button
        class:active={selected.has(option)}
        onclick={() => ontoggle(option)}
        type="button"
        aria-pressed={selected.has(option)}
      >
        {option}
      </button>
    {/each}
  </div>
</div>

<style>
  .toggle-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .label {
    font-weight: 500;
    white-space: nowrap;
  }

  .buttons {
    display: flex;
    gap: 0;
  }

  button {
    padding: 5px 12px;
    font-size: 0.85em;
    border: 1px solid #ccc;
    background: #f6f8fa;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    border-radius: 0;
  }

  button:first-child {
    border-radius: 6px 0 0 6px;
  }

  button:last-child {
    border-radius: 0 6px 6px 0;
  }

  button:not(:first-child) {
    border-left: none;
  }

  button.active {
    background: #2194f3;
    color: #fff;
    border-color: #1a7fd4;
  }

  button:hover:not(.active) {
    background: #e8f0fe;
  }
</style>
