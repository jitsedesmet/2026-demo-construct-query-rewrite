<script lang="ts">
  import hljs from 'highlight.js/lib/core';
  import typescript from 'highlight.js/lib/languages/typescript';
  import json from 'highlight.js/lib/languages/json';
  import 'highlight.js/styles/github.css';

  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('json', json);

  interface Props {
    code: string;
    language?: string;
  }
  let { code, language = 'typescript' }: Props = $props();

  let highlighted = $derived(hljs.highlight(code, { language }).value);
</script>

<!-- eslint-disable svelte/no-at-html-tags -->
<pre class="code-block hljs language-{language}">{@html highlighted}</pre>

<style>
  .code-block {
    margin: 0;
    font-size: 0.78em;
    overflow: auto;
    border-radius: 4px;
    padding: 0.5em;
    line-height: 1.4;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    white-space: pre;
  }
</style>
