export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_DISCORD_CLIENT_ID,
        client_secret: process.env.VITE_DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${process.env.VERCEL_URL || 'http://localhost:5173'}/auth/discord/callback`
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Discord token exchange failed:', errorData);
      return res.status(400).json({ error: 'Token exchange failed' });
    }

    const tokenData = await tokenResponse.json();

    // Get user data
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error('Discord user fetch failed:', errorData);
      return res.status(400).json({ error: 'Failed to get user data' });
    }

    const userData = await userResponse.json();

    res.json({
      username: userData.username,
      id: userData.id,
      discriminator: userData.discriminator || '0000'
    });

  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
