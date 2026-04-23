import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { fileURLToPath } from 'node:url';

const shim = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['buffer', 'stream', 'util', 'events', 'process'],
      globals: { Buffer: true, process: true },
      protocolImports: true
    }),
    sveltekit()
  ],
  resolve: {
    alias: [
      {
        find: /^node:diagnostics_channel$/,
        replacement: shim('./src/lib/shims/diagnostics_channel.ts')
      },
      {
        find: /^diagnostics_channel$/,
        replacement: shim('./src/lib/shims/diagnostics_channel.ts')
      },
      // readable-stream uses require('process/') with a trailing slash, which bypasses
      // vite-plugin-node-polyfills' alias for 'process'. Map it explicitly to the
      // browser-safe shim so process.nextTick is available.
      {
        find: /^process\/$/,
        replacement: shim('../node_modules/process/browser.js')
      }
    ]
  },
  optimizeDeps: {
    include: ['@triply/yasqe', '@comunica/query-sparql']
  }
});
