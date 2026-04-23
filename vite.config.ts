import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    // readable-stream uses require('process/') with a trailing slash, bypassing
    // the normal browser-field remapping for the 'process' package.
    // Map it explicitly to process/browser.js so process.nextTick is available.
    alias: [{ find: /^process\/$/, replacement: 'process/browser.js' }]
  },
  optimizeDeps: {
    // Exclude Comunica from esbuild pre-bundling so that ActorInitQuery-browser.js's
    // `if (typeof process === 'undefined')` guard is evaluated at browser runtime
    // (not at Node.js build time), letting Comunica self-polyfill process.nextTick.
    exclude: ['@comunica/query-sparql']
  }
});
