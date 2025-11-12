// Polyfill for 'global' which WebTorrent needs
if (typeof global === 'undefined') {
  (window as any).global = globalThis;
}

