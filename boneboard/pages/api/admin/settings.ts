// Custom types for API since Next.js types not available
interface ApiRequest {
  method?: string;
  headers: { [key: string]: string | string[] | undefined };
  body: any;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
}
import { getPool } from '../../../src/lib/database';

const ADMIN_WALLET_ADDRESS = 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';

// Middleware to check admin authentication
const requireAdmin = (req: ApiRequest) => {
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
            `INSERT INTO platform_settings (project_listing_fee, job_listing_fee, fee_currency, updated_by) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [5.0, 10.0, 'ADA', '']
          );
          const settings = defaultSettings.rows[0];
          return res.status(200).json({
            projectListingFee: parseFloat(settings.project_listing_fee),
            jobListingFee: parseFloat(settings.job_listing_fee),
            projectListingCurrency: settings.fee_currency,
            jobListingCurrency: settings.fee_currency,
            lastUpdated: settings.updated_at,
            updatedBy: settings.updated_by
          });
        }

        const settings = result.rows[0];
        return res.status(200).json({
          projectListingFee: parseFloat(settings.project_listing_fee),
          jobListingFee: parseFloat(settings.job_listing_fee),
          projectListingCurrency: settings.project_listing_currency || settings.fee_currency,
          jobListingCurrency: settings.job_listing_currency || settings.fee_currency,
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
        res.setHeader('Allow', 'GET, PUT');
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
