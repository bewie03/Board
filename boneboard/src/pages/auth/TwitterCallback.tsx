import React, { useEffect } from 'react';

const TwitterCallback: React.FC = () => {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          // Send error to parent window
          window.opener?.postMessage({
            type: 'TWITTER_OAUTH_ERROR',
            error: error
          }, window.location.origin);
          window.close();
          return;
        }

        if (!code || !state) {
          window.opener?.postMessage({
            type: 'TWITTER_OAUTH_ERROR',
            error: 'Missing authorization code or state'
          }, window.location.origin);
          window.close();
          return;
        }

        // Exchange code for access token via our API server
        const apiBaseUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:3001' 
          : '/api';
          
        const codeVerifier = sessionStorage.getItem('twitter_code_verifier');
        // Processing Twitter callback...

        const response = await fetch(`${apiBaseUrl}/auth/twitter/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state, codeVerifier })
        });

        if (!response.ok) {
          // Log error without exposing sensitive details
          console.error('Twitter authentication failed');
          throw new Error('Twitter authentication failed. Please try again.');
        }

        const userData = await response.json();
        // Twitter authentication successful

        // Send success message to parent window
        window.opener?.postMessage({
          type: 'TWITTER_OAUTH_SUCCESS',
          username: userData.username,
          id: userData.id,
          profileImageUrl: userData.profileImageUrl,
          state: state
        }, window.location.origin);

        window.close();
      } catch (error) {
        console.error('Twitter callback error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        window.opener?.postMessage({
          type: 'TWITTER_OAUTH_ERROR',
          error: errorMessage
        }, window.location.origin);
        window.close();
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing Twitter authentication...</p>
      </div>
    </div>
  );
};

export default TwitterCallback;
