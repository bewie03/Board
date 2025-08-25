// Real OAuth API implementation for token exchange

export interface TwitterUserData {
  username: string;
  id: string;
  name: string;
}

export interface DiscordUserData {
  username: string;
  id: string;
  discriminator: string;
}

// Real Twitter OAuth token exchange via Vercel API
export const exchangeTwitterCode = async (code: string, state: string): Promise<TwitterUserData> => {
  try {
    const apiUrl = import.meta.env.PROD 
      ? '/api/auth/twitter/callback' 
      : 'http://localhost:5173/api/auth/twitter/callback';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Twitter authentication failed');
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    throw error;
  }
};

// Real Discord OAuth token exchange via Vercel API
export const exchangeDiscordCode = async (code: string, state: string): Promise<DiscordUserData> => {
  try {
    const apiUrl = import.meta.env.PROD 
      ? '/api/auth/discord/callback' 
      : 'http://localhost:5173/api/auth/discord/callback';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, state })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Discord authentication failed');
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Discord OAuth error:', error);
    throw error;
  }
};
