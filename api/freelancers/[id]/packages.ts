import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

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
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Freelancer ID is required' });
  }

  try {
    const client = await getPool().connect();
    
    try {
      // Get packages for this freelancer
      const packagesResult = await client.query(
        `SELECT * FROM service_packages WHERE freelancer_id = $1 ORDER BY package_type, created_at`,
        [id]
      );

      return res.status(200).json({ 
        success: true,
        packages: packagesResult.rows
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Error fetching service packages:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch service packages',
      details: error.message 
    });
  }
}
