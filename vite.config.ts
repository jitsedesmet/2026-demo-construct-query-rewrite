import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

const diagnosticsChannelShim = fileURLToPath(
  new URL('./src/shims/diagnostics-channel.js', import.meta.url),
);

export default defineConfig({
  plugins: [sveltekit()],
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
