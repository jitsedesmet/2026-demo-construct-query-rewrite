<script lang="ts">
  import Yasqe from "@triply/yasqe";
  import type { ActionReturn } from "svelte/action";

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
        }
      },
      destroy() {
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
  }

  .yasqe-editor-wrap :global(.yasqe_queryButton),
  .yasqe-editor-wrap :global(.yasqe_share) {
    display: none;
  }
</style>
