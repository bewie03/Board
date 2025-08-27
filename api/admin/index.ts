// Admin API endpoints for platform management
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-wallet-address');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  try {
    const { method } = req;
    const pool = getPool();

    // Check if this is a settings request based on query parameter
    const isSettingsRequest = req.query?.type === 'settings' || req.url?.includes('settings');
    
    switch (method) {
      case 'GET':
        // Get platform settings
        if (isSettingsRequest) {
          const result = await pool.query(
            'SELECT * FROM platform_settings ORDER BY created_at DESC LIMIT 1'
          );
          
          if (result.rows.length === 0) {
            // Create default settings if none exist
            const defaultSettings = await pool.query(
              `INSERT INTO platform_settings (project_listing_fee, job_listing_fee, project_listing_fee_ada, job_listing_fee_ada, project_listing_currency, job_listing_currency, updated_by) 
               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
              [500.0, 250.0, 50.0, 25.0, 'BONE', 'ADA', 'system']
            );
            const settings = defaultSettings.rows[0];
            return res.status(200).json({
              projectListingFee: parseFloat(settings.project_listing_fee),
              jobListingFee: parseFloat(settings.job_listing_fee),
              projectListingFeeAda: parseFloat(settings.project_listing_fee_ada || settings.project_listing_fee),
              jobListingFeeAda: parseFloat(settings.job_listing_fee_ada || settings.job_listing_fee),
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
            projectListingFeeAda: parseFloat(settings.project_listing_fee_ada || settings.project_listing_fee),
            jobListingFeeAda: parseFloat(settings.job_listing_fee_ada || settings.job_listing_fee),
            projectListingCurrency: settings.project_listing_currency,
            jobListingCurrency: settings.job_listing_currency,
            lastUpdated: settings.created_at,
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
        if (isSettingsRequest) {
          const adminWallet = requireAdmin(req);
          const { projectListingFee, jobListingFee, projectListingFeeAda, jobListingFeeAda, projectListingCurrency, jobListingCurrency } = req.body;

          await pool.query(
            `INSERT INTO platform_settings (project_listing_fee, job_listing_fee, project_listing_fee_ada, job_listing_fee_ada, project_listing_currency, job_listing_currency, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [projectListingFee, jobListingFee, projectListingFeeAda, jobListingFeeAda, projectListingCurrency, jobListingCurrency, adminWallet]
          );

          await logAdminActivity(adminWallet, 'UPDATE_SETTINGS', 'settings', undefined, req.body);

          return res.status(200).json({
            projectListingFee,
            jobListingFee,
            projectListingFeeAda,
            jobListingFeeAda,
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
        try {
          // Verify project
          if (req.query?.action === 'verify') {
            const adminWallet = requireAdmin(req);
            const projectId = req.query.projectId as string;

            if (!projectId) {
              return res.status(400).json({ error: 'Project ID is required' });
            }

            console.log('Verifying project:', projectId, 'by admin:', adminWallet);

            // First check if project exists
            const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [projectId]);
            if (projectCheck.rows.length === 0) {
              return res.status(404).json({ error: 'Project not found' });
            }

            await pool.query(
              `UPDATE projects SET 
                status = $1, 
                verified_by = $2, 
                verified_at = NOW(), 
                updated_at = NOW(),
                is_verified = true
              WHERE id = $3`,
              ['verified', adminWallet, projectId]
            );

            await logAdminActivity(adminWallet, 'VERIFY_PROJECT', 'project', projectId);

            return res.status(200).json({ success: true });
          }

          // Unverify project
          if (req.query?.action === 'unverify') {
            const adminWallet = requireAdmin(req);
            const projectId = req.query.projectId as string;

            if (!projectId) {
              return res.status(400).json({ error: 'Project ID is required' });
            }

            console.log('Unverifying project:', projectId, 'by admin:', adminWallet);

            // First check if project exists
            const projectCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [projectId]);
            if (projectCheck.rows.length === 0) {
              return res.status(404).json({ error: 'Project not found' });
            }

            await pool.query(
              `UPDATE projects SET 
                status = $1, 
                verified_by = NULL, 
                verified_at = NULL, 
                updated_at = NOW(),
                is_verified = false
              WHERE id = $2`,
              ['active', projectId]
            );

            await logAdminActivity(adminWallet, 'UNVERIFY_PROJECT', 'project', projectId);

            return res.status(200).json({ success: true });
          }
        } catch (error) {
          console.error('Admin POST error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : '';
          console.error('Error details:', errorMessage);
          console.error('Error stack:', errorStack);
          return res.status(500).json({ 
            error: 'Internal server error',
            details: errorMessage 
          });
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
