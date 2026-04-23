<script lang="ts">
  import Yasqe from "@triply/yasqe";
  import type { ActionReturn } from "svelte/action";

  interface Props {
    query?: string;
    readonly?: boolean;
    height?: string;
  }

  let {
    query = $bindable(''),
    readonly = false,
    height = '25svh',
  }: Props = $props();

  function yasqeEditor(element: HTMLElement, initialProps: Props): ActionReturn<Props> {
    const inst = new Yasqe(element, {
      editorHeight: initialProps.height ?? '25svh',
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

<div use:yasqeEditor={{ query, readonly, height }} class="yasqe-editor-wrap"></div>

<style>
  .yasqe-editor-wrap {
    flex: 1;
    min-height: 0;
  }
</style>
