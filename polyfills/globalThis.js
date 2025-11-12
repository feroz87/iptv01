// Polyfill for globalThis module
if (typeof globalThis === 'undefined') {
  var globalThis = (function() {
    if (typeof self !== 'undefined') {
      return self;
    } else if (typeof window !== 'undefined') {
      return window;
    } else if (typeof global !== 'undefined') {
      return global;
    } else {
      return {};
    }
  })();
}

module.exports = globalThis;

