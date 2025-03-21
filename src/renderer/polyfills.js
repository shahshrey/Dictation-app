// Browser polyfills for Node.js built-in modules
// This file is injected into the renderer process bundles

// Polyfill for process
if (typeof window !== 'undefined' && !window.process) {
  window.process = {
    env: {
      NODE_ENV: 'development'
    },
    cwd: () => '/',
    browser: true,
    version: '',
    versions: {},
    platform: 'browser',
    nextTick: (cb) => setTimeout(cb, 0)
  };
}

// Polyfill for util
if (typeof window !== 'undefined' && !window.util) {
  window.util = {
    inherits: function(ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    },
    format: function(f) {
      if (typeof f !== 'string') {
        const objects = [];
        for (let i = 0; i < arguments.length; i++) {
          objects.push(String(arguments[i]));
        }
        return objects.join(' ');
      }
      
      const args = Array.prototype.slice.call(arguments, 1);
      let i = 0;
      
      return f.replace(/%[sdj%]/g, function(x) {
        if (x === '%%') return '%';
        if (i >= args.length) return x;
        switch (x) {
          case '%s': return String(args[i++]);
          case '%d': return Number(args[i++]);
          case '%j': 
            try {
              return JSON.stringify(args[i++]);
            } catch (_) {
              return '[Circular]';
            }
          default: return x;
        }
      });
    }
  };
}

// Export empty modules for Node.js built-ins
export const fs = {};
export const path = {
  join: (...args) => args.join('/'),
  resolve: (...args) => args.join('/'),
  dirname: (p) => p.split('/').slice(0, -1).join('/')
};
export const os = {};
export const http = {};
export const https = {};
export const zlib = {}; 