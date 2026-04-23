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
      }
    ]
  },
  optimizeDeps: {
    include: ['@triply/yasqe', '@comunica/query-sparql']
  }
});
