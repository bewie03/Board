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
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('BurnedBone API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Ensure burnedbone_stats table exists
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS burnedbone_stats (
        id SERIAL PRIMARY KEY,
        total_bone_burned DECIMAL(20, 6) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get or create initial record
    let result = await getPool().query('SELECT total_bone_burned FROM burnedbone_stats ORDER BY id DESC LIMIT 1;');
    
    if (result.rows.length === 0) {
      // Create initial record
      await getPool().query(`
        INSERT INTO burnedbone_stats (total_bone_burned, last_updated) 
        VALUES (0, CURRENT_TIMESTAMP);
      `);
      result = await getPool().query('SELECT total_bone_burned FROM burnedbone_stats ORDER BY id DESC LIMIT 1;');
    }

    const totalBurned = parseFloat(result.rows[0].total_bone_burned) || 0;

    return res.status(200).json({
      totalBoneBurned: totalBurned,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting burned BONE total:', error);
    return res.status(500).json({ error: 'Failed to get burned BONE total' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { amount } = req.body;

  if (!amount || isNaN(parseFloat(amount))) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  try {
    // Ensure burnedbone_stats table exists
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS burnedbone_stats (
        id SERIAL PRIMARY KEY,
        total_bone_burned DECIMAL(20, 6) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get or create initial record
    let result = await getPool().query('SELECT id FROM burnedbone_stats ORDER BY id DESC LIMIT 1;');
    
    if (result.rows.length === 0) {
      // Create initial record
      await getPool().query(`
        INSERT INTO burnedbone_stats (total_bone_burned, last_updated) 
        VALUES (0, CURRENT_TIMESTAMP);
      `);
      result = await getPool().query('SELECT id FROM burnedbone_stats ORDER BY id DESC LIMIT 1;');
    }

    const recordId = result.rows[0].id;

    // Update the total
    const updateResult = await getPool().query(`
      UPDATE burnedbone_stats 
      SET total_bone_burned = total_bone_burned + $1,
          last_updated = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING total_bone_burned;
    `, [parseFloat(amount), recordId]);

    const newTotal = parseFloat(updateResult.rows[0].total_bone_burned);

    return res.status(200).json({
      success: true,
      amountAdded: parseFloat(amount),
      newTotal: newTotal,
      message: `Added ${amount} BONE to burned total`
    });
  } catch (error: any) {
    console.error('Error updating burned BONE total:', error);
    return res.status(500).json({ error: 'Failed to update burned BONE total' });
  }
}
