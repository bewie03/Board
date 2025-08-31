// OAuth Configuration
const OAUTH_CONFIG = {
  twitter: {
    clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || 'your_twitter_client_id',
    redirectUri: window.location.hostname === 'localhost' 
      ? 'http://localhost:5173/auth/twitter/callback'
      : 'https://bone-board.vercel.app/auth/twitter/callback',
    scope: 'tweet.read users.read',
    responseType: 'code',
    codeChallenge: 'challenge', // In production, generate this properly
    codeChallengeMethod: 'plain'
  },
  discord: {
    clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || 'your_discord_client_id',
    redirectUri: window.location.hostname === 'localhost'
      ? 'http://localhost:5173/auth/discord/callback'
      : 'https://bone-board.vercel.app/projects/new/auth/discord/callback',
    scope: 'identify',
    responseType: 'code'
  }
};

// Debug: Log OAuth config
console.log('OAuth Config:', {
  twitter: OAUTH_CONFIG.twitter.clientId,
  discord: OAUTH_CONFIG.discord.clientId,
  env: {
    twitter: import.meta.env.VITE_TWITTER_CLIENT_ID,
    discord: import.meta.env.VITE_DISCORD_CLIENT_ID
  },
  allEnv: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
});

// Check if we have valid OAuth credentials
const hasValidCredentials = (platform: 'twitter' | 'discord'): boolean => {
  const clientId = OAUTH_CONFIG[platform].clientId;
  return !!(clientId && !clientId.includes('your_') && clientId.length > 10);
};

// Generate random state for OAuth security
const generateState = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Store OAuth state in sessionStorage for verification
const storeOAuthState = (platform: 'twitter' | 'discord', state: string): void => {
  sessionStorage.setItem(`oauth_state_${platform}`, state);
};

// Verify OAuth state
const verifyOAuthState = (platform: 'twitter' | 'discord', state: string): boolean => {
  const storedState = sessionStorage.getItem(`oauth_state_${platform}`);
  sessionStorage.removeItem(`oauth_state_${platform}`);
  return storedState === state;
};

// Twitter OAuth functions
export const initiateTwitterOAuth = (): Promise<{ username: string; id: string }> => {
  return new Promise((resolve, reject) => {
    // For now, use simple username input until proper OAuth is set up
    console.log('Using Twitter demo mode - simulating authentication');
    
    // Simulate user input for Twitter username
    const username = prompt('Enter your Twitter username (without @):');
    if (!username) {
      reject(new Error('Twitter authentication cancelled'));
      return;
    }
    
    setTimeout(() => {
      resolve({
        username: username.replace('@', ''),
        id: `twitter_${Date.now()}`
      });
    }, 500);
  });
};

// Discord OAuth functions
export const initiateDiscordOAuth = (): Promise<{ username: string; id: string }> => {
  return new Promise((resolve, reject) => {
    // Check if we have valid credentials, if not use demo mode
    if (!hasValidCredentials('discord')) {
      console.log('Using Discord demo mode - no valid credentials configured');
      setTimeout(() => {
        resolve({
          username: 'demo_discord_user#1234',
          id: 'demo_67890'
        });
      }, 1000);
      return;
    }

    const state = generateState();
    storeOAuthState('discord', state);
    
    // Build Discord OAuth URL
    const params = new URLSearchParams({
      response_type: OAUTH_CONFIG.discord.responseType,
      client_id: OAUTH_CONFIG.discord.clientId,
      redirect_uri: OAUTH_CONFIG.discord.redirectUri,
      scope: OAUTH_CONFIG.discord.scope,
      state: state
    });
    
    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    
    // Open popup window for OAuth
    const popup = window.open(
      authUrl,
      'discord-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }
    
    // Listen for the callback
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        reject(new Error('OAuth cancelled by user'));
      }
    }, 1000);
    
    // Listen for messages from the popup
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'DISCORD_OAUTH_SUCCESS') {
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', messageListener);
        
        if (verifyOAuthState('discord', event.data.state)) {
          resolve({
            username: event.data.username,
            id: event.data.id
          });
        } else {
          reject(new Error('Invalid OAuth state'));
        }
      } else if (event.data.type === 'DISCORD_OAUTH_ERROR') {
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', messageListener);
        reject(new Error(event.data.error));
      }
    };
    
    window.addEventListener('message', messageListener);
  });
};

// Handle OAuth callbacks (to be used in callback pages)
export const handleTwitterCallback = async (code: string, state: string): Promise<{ username: string; id: string }> => {
  try {
    // In a real app, you'd send this to your backend to exchange for tokens
    // For demo purposes, we'll simulate the response
    const response = await fetch('/api/auth/twitter/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state })
    });
    
    if (!response.ok) {
      throw new Error('Failed to authenticate with Twitter');
    }
    
    const data = await response.json();
    return {
      username: data.username,
      id: data.id
    };
  } catch (error) {
    console.error('Twitter callback error:', error);
    throw error;
  }
};

export const handleDiscordCallback = async (code: string, state: string): Promise<{ username: string; id: string }> => {
  try {
    // In a real app, you'd send this to your backend to exchange for tokens
    // For demo purposes, we'll simulate the response
    const response = await fetch('/api/auth/discord/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state })
    });
    
    if (!response.ok) {
      throw new Error('Failed to authenticate with Discord');
    }
    
    const data = await response.json();
    return {
      username: data.username,
      id: data.id
    };
  } catch (error) {
    console.error('Discord callback error:', error);
    throw error;
  }
};
