<script lang="ts">
  interface Props {
    /** The option's name, shown on the switch. */
    label: string;
    /** One line on what turning it on does, shown on hover. */
    title: string;
    /** Whether the option is on. */
    checked: boolean;
  }

  let { label, title, checked = $bindable(false) }: Props = $props();
</script>

<label class="option-toggle" {title}>
  <input type="checkbox" bind:checked />
  <span class="track" aria-hidden="true"><span class="knob"></span></span>
  <span class="name">{label}</span>
</label>

<style>
  .option-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #555;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }

  /* The checkbox itself carries the state, the focus and the keyboard; the track below is what it looks
     like. Kept on the page rather than `display: none`, so that focus still lands on it. */
  input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    margin: 0;
  }

  .track {
    position: relative;
    flex-shrink: 0;
    width: 1.55rem;
    height: 0.85rem;
    border-radius: 999px;
    background: #cfd6dd;
    transition: background 0.15s;
  }

  .knob {
    position: absolute;
    top: 0.1rem;
    left: 0.1rem;
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
    transition: transform 0.15s;
  }

  input:checked + .track {
    background: #2194f3;
  }

  input:checked + .track .knob {
    transform: translateX(0.7rem);
  }

  input:focus-visible + .track {
    box-shadow: 0 0 0 3px rgba(33, 148, 243, 0.4);
  }

  input:checked ~ .name {
    color: #1a7fd4;
    font-weight: 500;
  }

  .option-toggle:hover .track {
    filter: brightness(0.96);
  }
</style>
