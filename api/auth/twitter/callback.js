export default async function handler(req, res) {
  console.log('Twitter OAuth callback started', {
    method: req.method,
    hasBody: !!req.body,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.error('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, codeVerifier } = req.body;
    
    console.log('Request body received:', {
      hasCode: !!code,
      hasState: !!state,
      hasCodeVerifier: !!codeVerifier,
      codeLength: code?.length,
      stateLength: state?.length,
      verifierLength: codeVerifier?.length
    });

    if (!code || !state || !codeVerifier) {
      console.error('Missing required parameters:', { code: !!code, state: !!state, codeVerifier: !!codeVerifier });
      return res.status(400).json({ error: 'Missing code, state, or codeVerifier' });
    }

    // Use consistent redirect URI - must match exactly what was used in initial auth request
    const redirectUri = req.headers.host && req.headers.host.includes('localhost')
      ? 'http://localhost:5173/auth/twitter/callback'
      : 'https://bone-board.vercel.app/auth/twitter/callback';
      
    console.log('Environment check:', {
      hasTwitterClientId: !!process.env.VITE_TWITTER_CLIENT_ID,
      hasTwitterSecret: !!process.env.VITE_TWITTER_CLIENT_SECRET,
      vercelUrl: process.env.VERCEL_URL,
      requestHost: req.headers.host,
      redirectUri: redirectUri
    });

    // Exchange code for access token
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });
    
    console.log('Token request details:', {
      url: 'https://api.twitter.com/2/oauth2/token',
      bodyParams: Object.fromEntries(tokenRequestBody.entries())
    });

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.VITE_TWITTER_CLIENT_ID}:${process.env.VITE_TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: tokenRequestBody
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Twitter token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorData,
        headers: Object.fromEntries(tokenResponse.headers.entries())
      });
      return res.status(400).json({ 
        error: 'Token exchange failed',
        details: errorData,
        status: tokenResponse.status
      });
    }

    const tokenData = await tokenResponse.json();

    // Get user data with profile image
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error('Twitter user fetch failed:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        errorData,
        headers: Object.fromEntries(userResponse.headers.entries())
      });
      return res.status(400).json({ 
        error: 'Failed to get user data',
        details: errorData,
        status: userResponse.status
      });
    }

    const userData = await userResponse.json();
    
    console.log('Twitter OAuth success:', {
      username: userData.data?.username,
      id: userData.data?.id,
      name: userData.data?.name,
      profileImageUrl: userData.data?.profile_image_url
    });

    res.json({
      username: userData.data.username,
      id: userData.data.id,
      name: userData.data.name,
      profileImageUrl: userData.data.profile_image_url
    });

  } catch (error) {
    console.error('Twitter OAuth error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
