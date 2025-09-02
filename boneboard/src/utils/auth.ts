// Generate PKCE code verifier and challenge
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// OAuth Configuration
const OAUTH_CONFIG = {
  twitter: {
    clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || 'your_twitter_client_id',
    redirectUri: window.location.hostname.includes('localhost')
      ? 'http://localhost:5173/auth/twitter/callback'
      : 'https://bone-board.vercel.app/auth/twitter/callback',
    scope: 'tweet.read users.read',
    responseType: 'code',
    codeChallengeMethod: 'S256'
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

// OAuth config validation (removed sensitive logging)

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

// Prevent multiple simultaneous OAuth flows
let twitterOAuthInProgress = false;

// Twitter OAuth functions
export const initiateTwitterOAuth = (): Promise<{ username: string; id: string; profileImageUrl?: string }> => {
  return new Promise(async (resolve, reject) => {
    // Prevent multiple simultaneous OAuth flows
    if (twitterOAuthInProgress) {
      reject(new Error('Twitter OAuth already in progress. Please wait.'));
      return;
    }
    
    twitterOAuthInProgress = true;
    
    // Check if we have valid credentials, if not use demo mode
    if (!hasValidCredentials('twitter')) {
      // Twitter OAuth not configured, using fallback
      // Simulate user input for Twitter username as fallback
      const username = prompt('Enter your Twitter username (without @) - OAuth not configured:');
      if (!username) {
        reject(new Error('Twitter authentication cancelled'));
        return;
      }
      
      setTimeout(() => {
        twitterOAuthInProgress = false; // Reset flag
        resolve({
          username: username.replace('@', ''),
          id: `twitter_${Date.now()}`
        });
      }, 500);
      return;
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    storeOAuthState('twitter', state);
    sessionStorage.setItem('twitter_code_verifier', codeVerifier);
    
    // Build Twitter OAuth URL
    const params = new URLSearchParams({
      response_type: OAUTH_CONFIG.twitter.responseType,
      client_id: OAUTH_CONFIG.twitter.clientId,
      redirect_uri: OAUTH_CONFIG.twitter.redirectUri,
      scope: OAUTH_CONFIG.twitter.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: OAUTH_CONFIG.twitter.codeChallengeMethod
    });
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    
    // Close any existing popup with the same name first
    const existingPopup = (window as any).twitterOAuthPopup;
    if (existingPopup && !existingPopup.closed) {
      existingPopup.close();
    }
    
    // Open popup window for OAuth
    const popup = window.open(
      authUrl,
      'twitter-oauth',
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );
    
    // Store reference to prevent multiple popups
    (window as any).twitterOAuthPopup = popup;
    
    if (!popup) {
      twitterOAuthInProgress = false; // Reset flag on popup failure
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }
    
    // Listen for messages from the popup
    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'TWITTER_OAUTH_SUCCESS') {
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', messageListener);
        twitterOAuthInProgress = false; // Reset flag on success
        (window as any).twitterOAuthPopup = null; // Clear popup reference
        // Clean up session storage
        sessionStorage.removeItem('twitter_code_verifier');
        sessionStorage.removeItem(`oauth_state_twitter`);
        
        if (verifyOAuthState('twitter', event.data.state)) {
          resolve({
            username: event.data.username,
            id: event.data.id,
            profileImageUrl: event.data.profileImageUrl
          });
        } else {
          reject(new Error('Invalid OAuth state'));
        }
      } else if (event.data.type === 'TWITTER_OAUTH_ERROR') {
        clearInterval(checkClosed);
        popup.close();
        window.removeEventListener('message', messageListener);
        twitterOAuthInProgress = false; // Reset flag on error
        (window as any).twitterOAuthPopup = null; // Clear popup reference
        // Clean up session storage on error
        sessionStorage.removeItem('twitter_code_verifier');
        sessionStorage.removeItem(`oauth_state_twitter`);
        reject(new Error(event.data.error));
      }
    };
    
    // Listen for popup close and cleanup
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
        twitterOAuthInProgress = false; // Reset flag on manual close
        (window as any).twitterOAuthPopup = null; // Clear popup reference
        // Clean up session storage if popup closed manually
        sessionStorage.removeItem('twitter_code_verifier');
        sessionStorage.removeItem(`oauth_state_twitter`);
        reject(new Error('OAuth cancelled by user'));
      }
    }, 1000);
    
    window.addEventListener('message', messageListener);
  });
};

// Discord OAuth functions
export const initiateDiscordOAuth = (): Promise<{ username: string; id: string }> => {
  return new Promise((resolve, reject) => {
    // Check if we have valid credentials, if not use demo mode
    if (!hasValidCredentials('discord')) {
      // Discord OAuth not configured, using fallback
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
export const handleTwitterCallback = async (code: string, state: string): Promise<{ username: string; id: string; profileImageUrl?: string }> => {
  try {
    const codeVerifier = sessionStorage.getItem('twitter_code_verifier');
    if (!codeVerifier) {
      throw new Error('Missing code verifier');
    }

    // Exchange code for access token via our API server
    const response = await fetch('/api/auth/twitter/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state, codeVerifier })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twitter callback failed:', errorData);
      throw new Error('Failed to authenticate with Twitter');
    }

    const data = await response.json();
    return {
      username: data.username,
      id: data.id,
      profileImageUrl: data.profileImageUrl
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
