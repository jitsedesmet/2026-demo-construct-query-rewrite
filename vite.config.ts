import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// lru-cache's CJS build (pulled in by Comunica) imports from node:diagnostics_channel
// which doesn't exist in browsers. Stub it out inline — no separate shim file needed.
const diagnosticsChannelStub = {
  name: 'diagnostics-channel-stub',
  resolveId(id: string) {
    if (id === 'node:diagnostics_channel' || id === 'diagnostics_channel')
      return '\0diagnostics_channel';
  },
  load(id: string) {
    if (id !== '\0diagnostics_channel') return;
    return `
      const ch = () => ({ hasSubscribers: false, publish() {}, subscribe() {}, unsubscribe() { return false; } });
      export const channel = ch;
      export const hasSubscribers = () => false;
      export const subscribe = () => {};
      export const unsubscribe = () => false;
      export const tracingChannel = () => ({
        start: ch(), end: ch(), asyncStart: ch(), asyncEnd: ch(), error: ch(),
        tracePromise: async (fn) => fn(),
        traceCallback: (fn, _pos, _ctx, ...args) => fn(...args),
        traceSync: (fn) => fn(),
      });
      export default { channel, hasSubscribers, subscribe, unsubscribe, tracingChannel };
    `;
  }
};

export default defineConfig({
  plugins: [diagnosticsChannelStub, sveltekit()],
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
