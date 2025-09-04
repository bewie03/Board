import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Database connection
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'POST':
        return await handlePost(req, res);
      case 'GET':
        return await handleGet(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    // First check if user already exists
    const existingUser = await getPool().query(
      'SELECT id, wallet_address, username, email, created_at, updated_at, is_active, profile_type FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (existingUser.rows.length > 0) {
      // User exists, return existing user
      const user = existingUser.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          walletAddress: user.wallet_address,
          username: user.username,
          email: user.email,
          profileType: user.profile_type,
          isActive: user.is_active,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        },
        message: 'User already exists'
      });
    }

    // Create new user
    const result = await getPool().query(
      'INSERT INTO users (wallet_address, profile_type) VALUES ($1, $2) RETURNING id, wallet_address, username, email, created_at, updated_at, is_active, profile_type',
      [walletAddress, 'user']
    );

    const newUser = result.rows[0];
    return res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        walletAddress: newUser.wallet_address,
        username: newUser.username,
        email: newUser.email,
        profileType: newUser.profile_type,
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at
      },
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Error creating/getting user:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to create/get user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    const result = await getPool().query(
      'SELECT id, wallet_address, username, email, created_at, updated_at, is_active, profile_type FROM users WHERE wallet_address = $1',
      [wallet]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const user = result.rows[0];
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        email: user.email,
        profileType: user.profile_type,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });

  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to get user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
