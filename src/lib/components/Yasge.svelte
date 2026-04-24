<script lang="ts">
  // https://docs.triply.cc/yasgui-api/#yasgui-api-reference
  // https://www.youtube.com/watch?v=Y5IiSdcqdeQ&themeRefresh=1
  import Yasqe from "@triply/yasqe";
  import type {ActionReturn} from "svelte/action";
  import type {Bindings} from "@rdfjs/types";
  import {alterQuery} from "$lib/helpers.svelte";
  import {QueryEngine} from '@comunica/query-sparql'
  import {replaceState} from "$app/navigation";
  import { base } from '$app/paths';

  // prefix.cc's SSL certificate is expired.  Point YASQE at our own bundled copy
  // of the popular-prefixes JSON so the autocompleter works without hitting the
  // broken external endpoint.
  Yasqe.defaults.prefixCcApi = `${base}/prefix-cc.json`;

  interface Props {
    query: string | undefined;
    bindings?: Bindings[];
    queryDone?: boolean;
    queryRunning?: boolean;
    queryStartTime?: number;
    queryCancelled?: boolean;
    rewrittenQuery?: string;
    rewrite?: (query: string) => string;
    sources?: string[];
  }
  let {
    query = $bindable(),
    bindings = $bindable<Bindings[]>([]),
    queryDone = $bindable(false),
    queryRunning = $bindable(false),
    queryStartTime = $bindable(0),
    queryCancelled = $bindable(false),
    rewrittenQuery = $bindable(''),
    rewrite = (q) => q,
    sources = ["https://fragments.dbpedia.org/2016-04/en"],
  }: Props = $props();
  let error = $state<string | undefined>(undefined);
  const engine = new QueryEngine();
  let abortController: AbortController | undefined;
  let activeStream: { destroy: () => void } | undefined;

  export function cancelQuery(): void {
    if (!queryRunning) return;
    abortController?.abort();
    activeStream?.destroy();
    queryRunning = false;
    queryCancelled = true;
  }
  interface YasgeContext {
    query: string | undefined;
  }
  function yasge(element: HTMLElement, { query: startQuery }: Props): ActionReturn<YasgeContext> {
    const yasqe = new Yasqe(element, {
      editorHeight: '40svh',
    });

    if (startQuery !== undefined) yasqe.setValue(startQuery);

    // Override yasqe.query so both the run button and keyboard shortcuts (Ctrl-Enter / Cmd-Enter)
    // execute via Comunica instead of making an HTTP request to a SPARQL endpoint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (yasqe as any).query = async () => {
      const currentSources = sources;
      if (currentSources.length === 0) return;

      // Free resources from any currently-running query before starting a new one
      abortController?.abort();
      activeStream?.destroy();
      // Invalidate the HTTP/source cache so a re-run of the same query gets a fresh
      // source instead of the stale/destroyed QuerySourceHypermedia that was cached
      // by ActorOptimizeQueryOperationQuerySourceIdentify.
      await engine.invalidateHttpCache();

      query = yasqe.getValue() as string;
      replaceState(alterQuery('query', query), {});
      error = undefined;
      const thisAbortController = new AbortController();
      abortController = thisAbortController;
      try {
        bindings = [];
        queryDone = false;
        queryRunning = true;
        queryCancelled = false;
        queryStartTime = Date.now();

        rewrittenQuery = rewrite(query);
        const bindingStream = await engine.queryBindings(rewrittenQuery, { sources: currentSources });
        activeStream = bindingStream;
        bindingStream.on('data', (binding: Bindings) => {
          if (thisAbortController.signal.aborted) return;
          bindings.push(binding);
        });
        bindingStream.on('error', (err: Error) => {
          if (!thisAbortController.signal.aborted) {
            error = err.message;
            console.error(err);
            queryRunning = false;
          }
        });
        bindingStream.on('end', () => {
          if (!thisAbortController.signal.aborted) {
            queryDone = true;
            queryRunning = false;
          }
        })
      } catch (err: unknown) {
        const e = err as Error;
        if (!thisAbortController.signal.aborted) {
          error = e.message;
          console.error(err);
        }
        if (abortController === thisAbortController) {
          queryRunning = false;
        }
      }
    };

    return {
      update({ query: newQuery }) {
        if (newQuery !== undefined && newQuery !== yasqe.getValue()) {
          error = undefined;
          yasqe.setValue(newQuery);
        }
      },
      destroy() {
        yasqe.destroy();
      }
    };
  }
</script>


<div use:yasge={{ query }} class="yasge"></div>
{#if error}
    <div class="myError">
        <span>
            {error}
        </span>
        <button aria-label="close error" onclick={() => error = undefined}>
            <svg viewBox="0 0 10 10" height="0.75em">
                <path stroke-linecap="round" stroke-linejoin="round" d="M 0 0 L 10 10 M 0 10 L 10 0" />
            </svg>
        </button>
    </div>
{/if}

<style>
    :global {
        @import "@triply/yasqe/build/yasqe.min.css";
    }
    .myError {
        display: flex;
        padding: 0.25em;
        background: rgba(255, 65, 54, 0.66);
        border-radius: 0.25em;
        color: black;
    }
    .myError span {
        flex: 1;
        padding: 0 0 0 10px;
        align-self: center;
        white-space: pre-wrap;
        font-family: monospace;
    }
    .myError button {
        padding: 0 10px;
        background: none;
        border: none;
        box-shadow: none;
    }
    svg {
    /*    thickness*/
        stroke-width: 1;
        color: black;
        stroke: black;
    }

</style>
