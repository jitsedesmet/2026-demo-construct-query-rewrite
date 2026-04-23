// Minimal browser shim for node:diagnostics_channel
// Matches the shape just enough for pub/sub callers not to crash.
class Channel {
  name: string;
  _subs: Array<(msg: unknown, name: string) => void> = [];
  constructor(name: string) { this.name = name; }
  get hasSubscribers() { return this._subs.length > 0; }
  publish(message: unknown) {
    for (const fn of this._subs) fn(message, this.name);
  }
  subscribe(fn: (msg: unknown, name: string) => void) { this._subs.push(fn); }
  unsubscribe(fn: (msg: unknown, name: string) => void) {
    const i = this._subs.indexOf(fn);
    if (i >= 0) this._subs.splice(i, 1);
    return i >= 0;
  }
}

const channels = new Map<string, Channel>();

export function channel(name: string): Channel {
  let c = channels.get(name);
  if (!c) { c = new Channel(name); channels.set(name, c); }
  return c;
}

export function hasSubscribers(name: string): boolean {
  return channels.get(name)?.hasSubscribers ?? false;
}

export function subscribe(name: string, fn: (msg: unknown, n: string) => void) {
  channel(name).subscribe(fn);
}

export function unsubscribe(name: string, fn: (msg: unknown, n: string) => void) {
  return channel(name).unsubscribe(fn);
}

export function tracingChannel(/* name */) {
  // Real API is richer, but almost nothing in the browser needs it.
  return {
    start: channel('tracing:start'),
    end: channel('tracing:end'),
    asyncStart: channel('tracing:asyncStart'),
    asyncEnd: channel('tracing:asyncEnd'),
    error: channel('tracing:error'),
    tracePromise: async <T>(fn: () => Promise<T>) => fn(),
    traceCallback: (fn: (...a: unknown[]) => unknown, _pos: number, _ctx: unknown, ...args: unknown[]) => fn(...args),
    traceSync: <T>(fn: () => T) => fn()
  };
}

export default { channel, hasSubscribers, subscribe, unsubscribe, tracingChannel };
