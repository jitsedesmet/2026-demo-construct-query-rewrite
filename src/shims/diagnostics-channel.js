// Browser shim for node:diagnostics_channel.
// lru-cache (pulled in by Comunica) CJS-requires this module; in the browser
// we replace it with no-ops via resolve.alias in vite.config.ts.
const ch = () => ({
  hasSubscribers: false,
  publish() {},
  subscribe() {},
  unsubscribe() {
    return false;
  },
});

export const channel = ch;
export const hasSubscribers = () => false;
export const subscribe = () => {};
export const unsubscribe = () => false;
export const tracingChannel = () => ({
  start: ch(),
  end: ch(),
  asyncStart: ch(),
  asyncEnd: ch(),
  error: ch(),
  tracePromise: async (fn) => fn(),
  traceCallback: (fn, _pos, _ctx, ...args) => fn(...args),
  traceSync: (fn) => fn(),
});
export default { channel, hasSubscribers, subscribe, unsubscribe, tracingChannel };
