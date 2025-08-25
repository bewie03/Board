import React, { useEffect } from 'react';

const DiscordCallback: React.FC = () => {
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
            type: 'DISCORD_OAUTH_ERROR',
            error: error
          }, window.location.origin);
          window.close();
          return;
        }

        if (!code || !state) {
          window.opener?.postMessage({
            type: 'DISCORD_OAUTH_ERROR',
            error: 'Missing authorization code or state'
          }, window.location.origin);
          window.close();
          return;
        }

        // Exchange code for access token via our API server
        const apiBaseUrl = window.location.hostname === 'localhost' 
          ? 'http://localhost:3001' 
          : '/api';
          
        const response = await fetch(`${apiBaseUrl}/api/auth/discord/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state })
        });

        if (!response.ok) {
          throw new Error('Failed to authenticate with Discord');
        }

        const userData = await response.json();

        // Send success message to parent window
        window.opener?.postMessage({
          type: 'DISCORD_OAUTH_SUCCESS',
          username: `${userData.username}#${userData.discriminator}`,
          id: userData.id,
          state: state
        }, window.location.origin);

        window.close();
      } catch (error) {
        console.error('Discord callback error:', error);
        window.opener?.postMessage({
          type: 'DISCORD_OAUTH_ERROR',
          error: 'Authentication failed'
        }, window.location.origin);
        window.close();
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing Discord authentication...</p>
      </div>
    </div>
  );
};

export default DiscordCallback;
