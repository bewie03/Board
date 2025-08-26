// Custom types for API since Next.js types not available
interface ApiRequest {
  method?: string;
  url?: string;
  headers: { [key: string]: string | string[] | undefined };
  body: any;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
}

import { Pool } from 'pg';

// Database connection pool
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    const DATABASE_URL = "postgres://u94m20d9lk1e7b:p73a59938021d84383fb460ad5c478003087a16d6038c9e19d6470d2400f1401e@c3v5n5ajfopshl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d6nclr86s438p6";
    
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
        if (req.url?.includes('/settings')) {
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
        }

        // Get dashboard stats
        if (req.url?.includes('/stats')) {
          const projectsResult = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'verified\') as verified FROM projects');
          const jobsResult = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'active\') as active FROM job_listings');
          const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');

          return res.status(200).json({
            totalProjects: parseInt(projectsResult.rows[0].total),
            verifiedProjects: parseInt(projectsResult.rows[0].verified),
            totalJobs: parseInt(jobsResult.rows[0].total),
            activeJobs: parseInt(jobsResult.rows[0].active),
            totalUsers: parseInt(usersResult.rows[0].total),
            recentActivity: []
          });
        }

        return res.status(404).json({ error: 'Endpoint not found' });

      case 'PUT':
        // Update platform settings
        if (req.url?.includes('/settings')) {
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
        }

        // Update project
        if (req.url?.includes('/projects/')) {
          const adminWallet = requireAdmin(req);
          const projectId = req.url.split('/projects/')[1].split('/')[0];
          const updates = req.body;

          const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
          
          const values = [projectId, ...Object.values(updates)];
          
          await pool.query(
            `UPDATE projects SET ${setClause}, updated_at = NOW() WHERE id = $1`,
            values
          );

          await logAdminActivity(adminWallet, 'UPDATE_PROJECT', 'project', projectId, updates);

          return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Endpoint not found' });

      case 'POST':
        // Verify project
        if (req.url?.includes('/projects/') && req.url?.includes('/verify')) {
          const adminWallet = requireAdmin(req);
          const projectId = req.url.split('/projects/')[1].split('/verify')[0];

          await pool.query(
            'UPDATE projects SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
            ['verified', adminWallet, projectId]
          );
          await logAdminActivity(adminWallet, 'VERIFY_PROJECT', 'project', projectId);

          return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Endpoint not found' });

      case 'DELETE':
        // Delete project
        if (req.url?.includes('/projects/')) {
          const adminWallet = requireAdmin(req);
          const projectId = req.url.split('/projects/')[1];

          await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
          await logAdminActivity(adminWallet, 'DELETE_PROJECT', 'project', projectId);

          return res.status(200).json({ success: true });
        }

        // Delete job listing
        if (req.url?.includes('/jobs/')) {
          const adminWallet = requireAdmin(req);
          const jobId = req.url.split('/jobs/')[1];

          await pool.query('DELETE FROM job_listings WHERE id = $1', [jobId]);
          await logAdminActivity(adminWallet, 'DELETE_JOB', 'job', jobId);

          return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Endpoint not found' });

      default:
        res.setHeader('Allow', 'GET, PUT, POST, DELETE');
        return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Admin API error:', error);
    
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
