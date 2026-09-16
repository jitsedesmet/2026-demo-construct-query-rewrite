<script lang="ts">
  import Yasqe from "@triply/yasqe";
  import type { ActionReturn } from "svelte/action";

  import { base } from '$app/paths';

  // prefix.cc's SSL certificate is expired.  Point YASQE at our own bundled copy
  // of the popular-prefixes JSON so the autocompleter works without hitting the
  // broken external endpoint.
  Yasqe.defaults.prefixCcApi = `${base}/prefix-cc.json`;

  interface Props {
    query?: string;
    readonly?: boolean;
  }

  let {
    query = $bindable(''),
    readonly = false,
  }: Props = $props();

  function yasqeEditor(element: HTMLElement, initialProps: Props): ActionReturn<Props> {
    const inst = new Yasqe(element, {
      // '100%' lets the CSS flex chain control the height via .yasqe { height: 100% }
      editorHeight: '100%',
      // readOnly is a valid CodeMirror option passed through PartialConfig
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (initialProps.readonly) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inst as any).setOption('readOnly', true);
    }

    if (initialProps.query) inst.setValue(initialProps.query);

    // CodeMirror measures the height of its box once and then works from that. Nothing tells it when the
    // flex layout around it hands it a different one - the step slider appearing above it, a step caption
    // wrapping to one line more - and a measurement that is too tall clips the query at the bottom without
    // ever showing a scrollbar, the editor believing all of it fits. Yasqe calls refresh() after its own
    // drag-resize for exactly this reason; this does it for the resizes Yasqe does not know about.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refresh = () => (inst as any).refresh();
    let pendingRefresh: number | undefined;
    const refreshNextFrame = () => {
      if (pendingRefresh !== undefined) cancelAnimationFrame(pendingRefresh);
      pendingRefresh = requestAnimationFrame(() => {
        pendingRefresh = undefined;
        refresh();
      });
    };
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(element);

    // Disable query execution — this component is a pure editor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (inst as any).query = async () => {};

    if (!initialProps.readonly) {
      inst.on('change', () => {
        query = inst.getValue() as string;
      });
    }

    return {
      update(newProps) {
        if (newProps.query !== undefined && newProps.query !== inst.getValue()) {
          inst.setValue(newProps.query);
          // A longer step can turn the editor from one that fits into one that scrolls; re-measure once
          // the new value has been laid out.
          refreshNextFrame();
        }
      },
      destroy() {
        resizeObserver.disconnect();
        if (pendingRefresh !== undefined) cancelAnimationFrame(pendingRefresh);
        inst.destroy();
      },
    };
  }
</script>

<div use:yasqeEditor={{ query, readonly }} class="yasqe-editor-wrap"></div>

<style>
  .yasqe-editor-wrap {
    flex: 1;
    min-height: 0;
    /* Yasqe's root div needs an explicit height so that editorHeight:'100%' on
       .CodeMirror resolves to the flex-allocated pixel height of this wrapper. */
    height: 0; /* combined with flex:1 this makes children's height:100% work */
  }

  .yasqe-editor-wrap :global(.yasqe) {
    height: 100%;
    /* Yasqe puts its drag-to-resize handle inside this element, below the editor. A column flex box is
       what lets the editor give up those 10px instead of overflowing by them. */
    display: flex;
    flex-direction: column;
  }

  .yasqe-editor-wrap :global(.yasqe_queryButton),
  .yasqe-editor-wrap :global(.yasqe_share) {
    display: none;
  }
</style>
