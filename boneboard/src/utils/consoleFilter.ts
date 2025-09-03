// Console warning suppression utility
// Aggressive filtering for external library warnings

// Immediately override console methods before any other scripts load
(function() {
  const originalMethods = {
    log: console.log,
    warn: console.warn,
    info: console.info,
    error: console.error
  };

  const suppressPatterns = [
    'initEternlDomAPI',
    'Download the React DevTools',
    'react-devtools',
    'domId',
    'eternl',
    'dom.js?token',
    'dom.js',
    'CrCblbzl'
  ];

  const shouldSuppress = (args: any[]): boolean => {
    const message = args.map(arg => String(arg)).join(' ').toLowerCase();
    return suppressPatterns.some(pattern => message.includes(pattern.toLowerCase()));
  };

  // Override immediately
  console.log = (...args: any[]) => {
    if (!shouldSuppress(args)) {
      originalMethods.log.apply(console, args);
    }
  };

  console.warn = (...args: any[]) => {
    if (!shouldSuppress(args)) {
      originalMethods.warn.apply(console, args);
    }
  };

  console.info = (...args: any[]) => {
    if (!shouldSuppress(args)) {
      originalMethods.info.apply(console, args);
    }
  };

  console.error = (...args: any[]) => {
    if (!shouldSuppress(args)) {
      originalMethods.error.apply(console, args);
    }
  };

  // Also override window.console for external scripts
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'console', {
      value: console,
      writable: false,
      configurable: false
    });
  }
})();

export {};
