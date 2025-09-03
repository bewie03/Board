// Console warning suppression utility
// Filters out known non-critical warnings from external libraries

const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Patterns to suppress
const suppressPatterns = [
  'initEternlDomAPI',
  'Download the React DevTools for a better development experience',
  'domId',
  'href https://bone-board.vercel.app'
];

// Override console.warn
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  // Check if message matches any suppress pattern
  const shouldSuppress = suppressPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  if (!shouldSuppress) {
    originalConsoleWarn.apply(console, args);
  }
};

// Override console.log for Eternl wallet logs
console.log = (...args: any[]) => {
  const message = args.join(' ');
  
  // Check if message matches any suppress pattern
  const shouldSuppress = suppressPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  if (!shouldSuppress) {
    originalConsoleLog.apply(console, args);
  }
};

export {};
