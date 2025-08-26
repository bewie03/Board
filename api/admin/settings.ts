// Vercel API endpoint for admin settings
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Database connection pool
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
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

const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS || 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';

// Middleware to check admin authentication
const requireAdmin = (req: VercelRequest) => {
  const adminWallet = req.headers['x-wallet-address'] as string;
  if (!adminWallet || adminWallet !== ADMIN_WALLET_ADDRESS) {
    throw new Error('Unauthorized: Admin access required');
  }
  return adminWallet;
};

// Log admin activity
const logAdminActivity = async (
  adminWallet: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: any
) => {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO admin_activity_log (admin_wallet, action, target_type, target_id, details) 
       VALUES ($1, $2, $3, $4, $5)`,
      [adminWallet, action, targetType, targetId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wallet-address');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method } = req;
    const pool = getPool();

    switch (method) {
      case 'GET':
        // Get platform settings
        const result = await pool.query(
          'SELECT * FROM platform_settings ORDER BY created_at DESC LIMIT 1'
        );
        
        if (result.rows.length === 0) {
          // Create default settings if none exist
          const defaultSettings = await pool.query(
            `INSERT INTO platform_settings (project_listing_fee, job_listing_fee, project_listing_currency, job_listing_currency, updated_by) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [50.0, 25.0, 'BONE', 'ADA', 'system']
          );
          const settings = defaultSettings.rows[0];
          return res.status(200).json({
            projectListingFee: parseFloat(settings.project_listing_fee),
            jobListingFee: parseFloat(settings.job_listing_fee),
            projectListingCurrency: settings.project_listing_currency,
            jobListingCurrency: settings.job_listing_currency,
            lastUpdated: settings.created_at,
            updatedBy: settings.updated_by
          });
        }

        const settings = result.rows[0];
        return res.status(200).json({
          projectListingFee: parseFloat(settings.project_listing_fee),
          jobListingFee: parseFloat(settings.job_listing_fee),
          projectListingCurrency: settings.project_listing_currency,
          jobListingCurrency: settings.job_listing_currency,
          lastUpdated: settings.updated_at,
          updatedBy: settings.updated_by
        });

      case 'PUT':
        // Update platform settings
        const adminWallet = requireAdmin(req);
        const { projectListingFee, jobListingFee, projectListingCurrency, jobListingCurrency } = req.body;

        await pool.query(
          `INSERT INTO platform_settings (project_listing_fee, job_listing_fee, project_listing_currency, job_listing_currency, updated_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [projectListingFee, jobListingFee, projectListingCurrency, jobListingCurrency, adminWallet]
        );

        await logAdminActivity(adminWallet, 'UPDATE_SETTINGS', 'settings', undefined, req.body);

        return res.status(200).json({
          projectListingFee,
          jobListingFee,
          projectListingCurrency,
          jobListingCurrency,
          lastUpdated: new Date().toISOString(),
          updatedBy: adminWallet
        });

      default:
        res.setHeader('Allow', 'GET, PUT, OPTIONS');
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Admin settings API error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
