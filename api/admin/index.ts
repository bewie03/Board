// Admin API endpoints for platform management
import { getPool } from '../../boneboard/src/lib/database';

interface ApiRequest {
  method?: string;
  url?: string;
  headers: { [key: string]: string | undefined };
  body?: any;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
  setHeader: (name: string, value: string) => void;
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
            projectListingCurrency: settings.project_listing_currency,
            jobListingCurrency: settings.job_listing_currency,
            lastUpdated: settings.updated_at,
            updatedBy: settings.updated_by
          });
        }

        // Get admin statistics
        if (req.url?.includes('/stats')) {
          const [projectsResult, jobsResult, usersResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $1) as verified FROM projects', ['verified']),
            pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $1) as active FROM job_listings', ['active']),
            pool.query('SELECT COUNT(*) as total FROM users')
          ]);

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
            .filter(key => !['updatedBy', 'updatedAt'].includes(key))
            .map((key, index) => `${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = $${index + 2}`)
            .join(', ');

          const values = Object.keys(updates)
            .filter(key => !['updatedBy', 'updatedAt'].includes(key))
            .map(key => updates[key]);

          await pool.query(
            `UPDATE projects SET ${setClause}, updated_at = NOW() WHERE id = $1`,
            [projectId, ...values]
          );

          await logAdminActivity(adminWallet, 'UPDATE_PROJECT', 'project', projectId, updates);

          return res.status(200).json({ success: true });
        }

        return res.status(404).json({ error: 'Endpoint not found' });

      case 'POST':
        // Verify project
        if (req.url?.includes('/verify')) {
          const adminWallet = requireAdmin(req);
          const projectId = req.url.split('/projects/')[1].split('/verify')[0];

          await pool.query(
            `UPDATE projects SET status = 'verified', verified_by = $1, verified_at = NOW(), updated_at = NOW() WHERE id = $2`,
            [adminWallet, projectId]
          );

          await logAdminActivity(adminWallet, 'VERIFY_PROJECT', 'project', projectId);

          return res.status(200).json({ success: true });
        }

        // Unverify project
        if (req.url?.includes('/unverify')) {
          const adminWallet = requireAdmin(req);
          const projectId = req.url.split('/projects/')[1].split('/unverify')[0];

          await pool.query(
            `UPDATE projects SET status = 'active', verified_by = NULL, verified_at = NULL, updated_at = NOW() WHERE id = $1`,
            [projectId]
          );

          await logAdminActivity(adminWallet, 'UNVERIFY_PROJECT', 'project', projectId);

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
