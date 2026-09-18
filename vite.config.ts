import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

const diagnosticsChannelShim = fileURLToPath(
  new URL('./src/shims/diagnostics-channel.js', import.meta.url),
);
const staticExpressionEvaluationShim = fileURLToPath(
  new URL('./src/shims/static-expression-evaluation.js', import.meta.url),
);

/**
 * Replaces sparql-view-unfold's Comunica-backed expression folding by a stub that throws.
 *
 * The package re-exports the pass from its barrel, so it lands in the graph whatever the demo imports,
 * and it bootstraps Components.js from Node's module resolution - which a browser build cannot link.
 * The demo's pipeline never runs it; this keeps it, and Components.js with it, out of the bundle.
 */
const stubStaticExpressionEvaluation = {
  name: 'stub-sparql-view-unfold-static-expression-evaluation',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined): string | undefined {
    if (source.endsWith('staticExpressionEvaluation.js') && importer?.includes('sparql-view-unfold')) {
      return staticExpressionEvaluationShim;
    }
    return undefined;
  },
};

export default defineConfig({
  plugins: [stubStaticExpressionEvaluation, sveltekit()],
  server: {
    fs: {
      // The sparql-view-unfold workspace is a symlink into a sibling checkout, so Vite resolves its files
      // to a real path outside the allow list SvelteKit sets (which covers node_modules, not what a
      // workspace link points at). Dev-only: a build inlines the package.
      allow: ['sparql-view-unfold'],
    },
  },
  resolve: {
    alias: [
      // lru-cache's CJS build (pulled in by Comunica) requires node:diagnostics_channel
      // which doesn't exist in browsers. Alias it to a no-op shim.
      // resolve.alias runs before Vite's built-in node: externalization, so this
      // reliably replaces the module in both dev and production builds.
      { find: 'node:diagnostics_channel', replacement: diagnosticsChannelShim },
      { find: 'diagnostics_channel', replacement: diagnosticsChannelShim },
      // readable-stream uses require('process/') with a trailing slash, bypassing
      // the normal browser-field remapping for the 'process' package.
      { find: /^process\/$/, replacement: 'process/browser.js' },
    ],
  },
  optimizeDeps: {
    // Exclude Comunica from esbuild pre-bundling so that ActorInitQuery-browser.js's
    // `if (typeof process === 'undefined')` guard is evaluated at browser runtime
    // (not at Node.js build time), letting Comunica self-polyfill process.nextTick.
    exclude: ['@comunica/query-sparql'],
  },
});
