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

  // Get user data from users table only (no user_profiles table exists)
  const query = `
    SELECT id, wallet_address, username, email, created_at, updated_at, is_active, profile_type
    FROM users
    WHERE wallet_address = $1
  `;

  const result = await getPool().query(query, [wallet]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = result.rows[0];
  const profile = {
    id: user.id,
    walletAddress: user.wallet_address,
    username: user.username,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    isActive: user.is_active,
    profileType: user.profile_type
  };

  return res.status(200).json(profile);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { walletAddress, username, email } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Check if user exists
  const userCheck = await getPool().query('SELECT id FROM users WHERE wallet_address = $1', [walletAddress]);
  
  if (userCheck.rows.length === 0) {
    // Create new user
    const query = `
      INSERT INTO users (wallet_address, username, email)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await getPool().query(query, [walletAddress, username, email]);
    
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    });
  } else {
    // Update existing user
    const query = `
      UPDATE users 
      SET username = $2, email = $3, updated_at = NOW()
      WHERE wallet_address = $1
      RETURNING *
    `;
    
    const result = await getPool().query(query, [walletAddress, username, email]);
    
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: result.rows[0]
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

  // Check if user exists
  const userResult = await getPool().query('SELECT id FROM users WHERE wallet_address = $1', [wallet]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Build dynamic update query for users table
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // Map frontend field names to database column names
  const fieldMapping: { [key: string]: string } = {
    username: 'username',
    nickname: 'username', // nickname maps to username in users table
    email: 'email',
    profile_type: 'profile_type',
    is_active: 'is_active'
  };

  Object.entries(updates).forEach(([key, value]) => {
    const dbField = fieldMapping[key];
    if (dbField && key !== 'wallet_address') { // Skip wallet_address as it's the identifier
      updateFields.push(`${dbField} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  // Add wallet address as the WHERE condition parameter
  params.push(wallet);
  
  const query = `
    UPDATE users 
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE wallet_address = $${paramIndex}
    RETURNING *
  `;

  const result = await getPool().query(query, params);

  return res.status(200).json({ 
    success: true, 
    message: 'User updated successfully',
    user: result.rows[0]
  });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Check if user exists
  const userResult = await getPool().query('SELECT id FROM users WHERE wallet_address = $1', [wallet]);
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Delete user (this will cascade to related tables due to foreign key constraints)
  const query = 'DELETE FROM users WHERE wallet_address = $1 RETURNING id';
  const result = await getPool().query(query, [wallet]);

  return res.status(200).json({ 
    success: true, 
    message: 'User deleted successfully' 
  });
}
