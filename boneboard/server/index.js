const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Twitter OAuth token exchange
app.post('/api/auth/twitter/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.VITE_TWITTER_CLIENT_ID}:${process.env.VITE_TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NODE_ENV === 'production' 
          ? 'https://bone-board.vercel.app/auth/twitter/callback'
          : 'http://localhost:5173/auth/twitter/callback',
        code_verifier: 'challenge'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Twitter token exchange failed:', errorData);
      return res.status(400).json({ error: 'Token exchange failed' });
    }

    const tokenData = await tokenResponse.json();

    // Get user data
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error('Twitter user fetch failed:', errorData);
      return res.status(400).json({ error: 'Failed to get user data' });
    }

    const userData = await userResponse.json();

    res.json({
      username: userData.data.username,
      id: userData.data.id,
      name: userData.data.name
    });

  } catch (error) {
    console.error('Twitter OAuth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Discord OAuth token exchange
app.post('/api/auth/discord/callback', async (req, res) => {
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
        redirect_uri: process.env.NODE_ENV === 'production'
          ? 'https://bone-board.vercel.app/projects/new/auth/discord/callback'
          : 'http://localhost:5173/auth/discord/callback'
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
});

app.listen(PORT, () => {
  console.log(`OAuth server running on http://localhost:${PORT}`);
});
