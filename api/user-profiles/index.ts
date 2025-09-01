import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { rateLimit } from '../middleware/rateLimiter';

// Database connection - create pool inside handler to avoid cold start issues
let pool: any = null;

function getPool() {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
    }
    
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1, // Vercel functions are stateless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Enable CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Rate limiting for user profiles API
const userProfilesRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply rate limiting
  userProfilesRateLimit(req, res, () => {});
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Get user and profile data
  const query = `
    SELECT u.*, up.nickname, up.avatar_url, up.bio, up.location,
           up.website, up.twitter, up.discord, up.created_at as profile_created_at
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.wallet_address = $1
  `;

  const result = await getPool().query(query, [wallet]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = result.rows[0];
  const profile = {
    id: user.id,
    walletAddress: user.wallet_address,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    location: user.location,
    website: user.website,
    twitter: user.twitter,
    discord: user.discord,
    createdAt: user.created_at,
    profileCreatedAt: user.profile_created_at
  };

  return res.status(200).json(profile);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { walletAddress, nickname, avatarUrl, bio, location, website, twitter, discord } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // First, ensure user exists and update username
  let userId;
  const userCheck = await getPool().query('SELECT id FROM users WHERE wallet_address = $1', [walletAddress]);
  
  if (userCheck.rows.length === 0) {
    // Create user with username
    const userResult = await getPool().query(
      'INSERT INTO users (wallet_address, username) VALUES ($1, $2) RETURNING id',
      [walletAddress, nickname]
    );
    userId = userResult.rows[0].id;
  } else {
    // Update existing user's username
    userId = userCheck.rows[0].id;
    await getPool().query(
      'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2',
      [nickname, userId]
    );
  }

  // Create or update profile
  const profileCheck = await getPool().query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
  
  if (profileCheck.rows.length === 0) {
    // Create new profile
    const query = `
      INSERT INTO user_profiles (user_id, nickname, avatar_url, bio, location, website, twitter, discord)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await getPool().query(query, [userId, nickname, avatarUrl, bio, location, website, twitter, discord]);
    
    return res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      profile: result.rows[0]
    });
  } else {
    // Update existing profile
    const query = `
      UPDATE user_profiles 
      SET nickname = $2, avatar_url = $3, bio = $4, location = $5, 
          website = $6, twitter = $7, discord = $8, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;
    
    const result = await getPool().query(query, [userId, nickname, avatarUrl, bio, location, website, twitter, discord]);
    
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: result.rows[0]
    });
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  const { wallet } = req.query;
  const updates = req.body;

  console.log('PUT request received:', { wallet, updates });

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  if (!updates.wallet_address) {
    return res.status(400).json({ error: 'wallet_address in body is required' });
  }

  // Get user ID
  const userResult = await getPool().query('SELECT id FROM users WHERE wallet_address = $1', [wallet]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userId = userResult.rows[0].id;

  // Update username in users table if provided
  if (updates.nickname || updates.username) {
    const usernameValue = updates.username || updates.nickname;
    await getPool().query(
      'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2',
      [usernameValue, userId]
    );
  }

  // For user_profiles table, we only need to handle profile_photo -> avatar_url
  // The username is stored in the users table, not user_profiles
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fieldMapping: { [key: string]: string } = {
    nickname: 'nickname',
    avatarUrl: 'avatar_url',
    bio: 'bio',
    location: 'location',
    website: 'website',
    twitter: 'twitter',
    discord: 'discord'
  };

  Object.entries(updates).forEach(([key, value]) => {
    const dbField = fieldMapping[key];
    if (dbField && key !== 'username' && key !== 'wallet_address') { // Skip username as it's handled above
      updateFields.push(`${dbField} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  });

  // Only update user_profiles if there are valid fields to update
  let result = null;
  if (updateFields.length > 0) {
    params.push(userId);
    const query = `
      UPDATE user_profiles 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    result = await getPool().query(query, params);
  }

  return res.status(200).json({ 
    success: true, 
    message: 'Profile updated successfully',
    profile: result ? result.rows[0] : null 
  });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Get user ID
  const userResult = await getPool().query('SELECT id FROM users WHERE wallet_address = $1', [wallet]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userId = userResult.rows[0].id;

  // Delete profile (user will remain for referential integrity)
  const query = 'DELETE FROM user_profiles WHERE user_id = $1 RETURNING id';
  const result = await getPool().query(query, [userId]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  return res.status(200).json({ 
    success: true, 
    message: 'Profile deleted successfully' 
  });
}
