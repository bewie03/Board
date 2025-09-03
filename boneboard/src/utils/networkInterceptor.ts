// Network interceptor to suppress Blockfrost 404 errors during transaction polling
// This prevents console spam when checking transaction status

(function() {
  if (typeof window === 'undefined') return;

  const originalFetch = window.fetch;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      const response = await originalFetch.call(this, input, init);
      
      // Check if this is a Blockfrost transaction status request that returned 404
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url && url.includes('blockfrost.io/api/v0/txs/') && response.status === 404) {
        // Create a custom response that doesn't log to console
        const silentResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
        
        // Mark this as a silent 404 so error handling knows it's expected
        Object.defineProperty(silentResponse, '_silentBlockfrost404', {
          value: true,
          writable: false
        });
        
        return silentResponse;
      }
      
      return response;
    } catch (error) {
      // For network errors on Blockfrost transaction endpoints, suppress console logging
      if (error instanceof TypeError && 
          typeof input === 'string' && 
          input.includes('blockfrost.io/api/v0/txs/')) {
        // Create a custom error that won't spam console
        const silentError = new Error('Transaction not found (polling)');
        Object.defineProperty(silentError, '_silentBlockfrost404', {
          value: true,
          writable: false
        });
        throw silentError;
      }
      
      throw error;
    }
  };
})();

export {};
