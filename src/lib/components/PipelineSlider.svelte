<script lang="ts">
  import type { RewriteStage } from "$lib/mapping";

  interface Props {
    /** The pipeline, in order: the original query, the parsed query, then one entry per pass. */
    stages: RewriteStage[];
    /** The step currently shown. */
    index: number;
  }

  let { stages, index = $bindable(0) }: Props = $props();

  /** Width of the range input's thumb, in pixels; the CSS below sets it to the same value. */
  const THUMB_PX = 15;

  /** A step that left the query exactly as it found it — shown hollow, and said so in the caption. */
  let unchanged = $derived(stages.map((stage, i) => i > 0 && stage.query === stages[i - 1].query));

  /**
   * Where a step sits on the track.
   *
   * The native thumb travels between its own half-widths rather than over the whole track, so the dots are
   * inset by the same amount: a click then lands on the dot it points at, at the ends too.
   */
  function offset(i: number): string {
    const fraction = stages.length <= 1 ? 0.5 : i / (stages.length - 1);
    return `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${fraction})`;
  }

  let current = $derived(stages[index]);
</script>

<div class="pipeline">
  <div class="track-wrap">
    <div class="track" aria-hidden="true">
      <div class="track-done" style="width: {offset(index)}"></div>
      {#each stages as stage, i (i)}
        <span
          class="dot"
          class:done={i < index}
          class:active={i === index}
          class:unchanged={unchanged[i]}
          style="left: {offset(i)}"
          title={stage.label}
        ></span>
      {/each}
    </div>
    <input
      class="slider"
      type="range"
      min="0"
      max={Math.max(stages.length - 1, 0)}
      step="1"
      bind:value={index}
      aria-label="Rewriting step"
      aria-valuetext="Step {index + 1} of {stages.length}: {current?.label ?? ''}"
    />
  </div>

  <div class="caption">
    <span class="step-name">
      <span class="step-count">{index + 1}/{stages.length}</span>
      {current?.label ?? ''}
      {#if unchanged[index]}<span class="step-noop">no change</span>{/if}
    </span>
    <span class="step-desc">{current?.description ?? ''}</span>
  </div>
</div>

<style>
  .pipeline {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .track-wrap {
    position: relative;
    height: 1.1rem;
    /* Keep the dots and the thumb off the section's edges, so the first and last are fully visible. */
    margin: 0 0.55rem;
    display: flex;
    align-items: center;
  }

  .track {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
  }

  .track::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 3px;
    border-radius: 2px;
    background: #d7dde3;
  }

  .track-done {
    position: absolute;
    left: 0;
    height: 3px;
    border-radius: 2px;
    background: #2194f3;
  }

  .dot {
    position: absolute;
    width: 9px;
    height: 9px;
    margin-left: -4.5px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #b6bfc8;
    box-sizing: border-box;
  }

  .dot.done {
    border-color: #2194f3;
    background: #2194f3;
  }

  .dot.active {
    width: 15px;
    height: 15px;
    margin-left: -7.5px;
    border-color: #2194f3;
    background: #2194f3;
    box-shadow: 0 0 0 3px rgba(33, 148, 243, 0.2);
  }

  /* A pass that changed nothing stays hollow, so the dots read as what the pipeline actually did.
     Last, so that it wins over the equally specific .done and .active above. */
  .dot.unchanged {
    background: #fff;
  }

  /* The native range sits on top of the dots: it owns the interaction (click, drag, arrow keys),
     the dots below are only what it looks like. */
  .slider {
    position: relative;
    width: 100%;
    margin: 0;
    background: transparent;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
    height: 1.1rem;
  }

  .slider:focus {
    outline: none;
  }

  .slider::-webkit-slider-runnable-track {
    background: transparent;
    height: 1.1rem;
  }

  .slider::-moz-range-track {
    background: transparent;
    height: 1.1rem;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: transparent;
    border: none;
  }

  .slider::-moz-range-thumb {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: transparent;
    border: none;
  }

  .slider:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(33, 148, 243, 0.45);
  }

  .slider:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 3px rgba(33, 148, 243, 0.45);
  }

  .caption {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .step-name {
    font-size: 0.85em;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .step-count {
    font-variant-numeric: tabular-nums;
    color: #888;
    font-weight: 400;
  }

  .step-noop {
    font-size: 0.8em;
    font-weight: 400;
    color: #777;
    border: 1px solid #d0d7de;
    border-radius: 999px;
    padding: 0 0.4em;
  }

  .step-desc {
    font-size: 0.78em;
    color: #555;
    line-height: 1.35;
    /* Two lines, whether or not this step's description needs them: the editor below is sized by what is
       left over, and it should not resize under the reader every time the slider moves a step. */
    min-height: 2.7em;
  }
</style>
