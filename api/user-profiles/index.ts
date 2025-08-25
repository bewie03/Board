import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers first
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

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

  // First, ensure user exists
  let userId;
  const userCheck = await getPool().query('SELECT id FROM users WHERE wallet_address = $1', [walletAddress]);
  
  if (userCheck.rows.length === 0) {
    // Create user
    const userResult = await getPool().query(
      'INSERT INTO users (wallet_address) VALUES ($1) RETURNING id',
      [walletAddress]
    );
    userId = userResult.rows[0].id;
  } else {
    userId = userCheck.rows[0].id;
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

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Get user ID
  const userResult = await getPool().query('SELECT id FROM users WHERE wallet_address = $1', [wallet]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const userId = userResult.rows[0].id;

  // Build dynamic update query
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
    if (dbField) {
      updateFields.push(`${dbField} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  params.push(userId);
  const query = `
    UPDATE user_profiles 
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE user_id = $${paramIndex}
    RETURNING *
  `;

  const result = await getPool().query(query, params);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  return res.status(200).json({ success: true, profile: result.rows[0] });
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
