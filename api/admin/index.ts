// Admin API endpoints for platform management
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Database connection pool
let pool: Pool | null = null;

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

const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS || 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';

// Middleware to check admin authentication
const requireAdmin = (req: VercelRequest) => {
  const adminWallet = req.headers['x-wallet-address'] as string;
  console.log('Auth check - Received wallet:', adminWallet);
  console.log('Auth check - Expected wallet:', ADMIN_WALLET_ADDRESS);
  console.log('Auth check - Match:', adminWallet === ADMIN_WALLET_ADDRESS);
  
  if (!adminWallet || adminWallet !== ADMIN_WALLET_ADDRESS) {
    console.log('AUTH FAILED: Unauthorized access attempt');
    throw new Error('Unauthorized: Admin access required');
  }
  console.log('AUTH SUCCESS: Admin authenticated');
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
      [adminWallet, action, targetType, targetId, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    console.error('Error logging admin activity:', error);
    console.error('Failed to log activity for:', { adminWallet, action, targetType, targetId });
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

  // Add comprehensive logging
  console.log('=== ADMIN API REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('========================');

  try {
    const { method } = req;
    
    // Log environment check
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('ADMIN_WALLET_ADDRESS:', process.env.ADMIN_WALLET_ADDRESS);
    
    const pool = getPool();
    console.log('Pool created successfully');

    // Check if this is a settings request based on query parameter
    const isSettingsRequest = req.query?.type === 'settings' || req.url?.includes('settings');
    
    switch (method) {
      case 'GET':
        // Test database connection
        if (req.query?.test === 'db') {
          try {
            console.log('Testing database connection...');
            const testResult = await pool.query('SELECT NOW() as current_time');
            console.log('Database test result:', testResult.rows);
            return res.status(200).json({ 
              success: true, 
              message: 'Database connection working',
              time: testResult.rows[0]?.current_time 
            });
          } catch (error) {
            console.error('Database test error:', error);
            return res.status(500).json({ 
              error: 'Database connection failed',
              details: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Test admin_activity_log table
        if (req.query?.test === 'table') {
          try {
            console.log('Testing admin_activity_log table...');
            const tableTest = await pool.query('SELECT COUNT(*) FROM admin_activity_log');
            console.log('Table test result:', tableTest.rows);
            return res.status(200).json({ 
              success: true, 
              message: 'admin_activity_log table exists',
              count: tableTest.rows[0]?.count 
            });
          } catch (error) {
            console.error('Table test error:', error);
            return res.status(500).json({ 
              error: 'admin_activity_log table test failed',
              details: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

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
        // Verify project
        if (req.query?.action === 'verify') {
          try {
            console.log('Processing VERIFY request...');
            console.log('Admin wallet from header:', req.headers['x-wallet-address']);
            console.log('Expected admin wallet:', ADMIN_WALLET_ADDRESS);
            console.log('Environment ADMIN_WALLET_ADDRESS:', process.env.ADMIN_WALLET_ADDRESS);
            console.log('Database URL exists:', !!process.env.DATABASE_URL);
            console.log('Postgres URL exists:', !!process.env.POSTGRES_URL);
            
            const adminWallet = requireAdmin(req);
            const projectId = req.query.projectId as string;

            if (!projectId) {
              console.log('ERROR: No project ID provided');
              return res.status(400).json({ error: 'Project ID is required' });
            }

            console.log('Verifying project:', projectId, 'by admin:', adminWallet);

            // First check if project exists and get current status
            console.log('Checking if project exists...');
            const projectCheck = await pool.query('SELECT id, status, user_id, is_verified FROM projects WHERE id = $1', [projectId]);
            console.log('Project check result:', projectCheck.rows);
            
            if (projectCheck.rows.length === 0) {
              console.log('ERROR: Project not found in database');
              return res.status(404).json({ error: 'Project not found' });
            }

            const currentProject = projectCheck.rows[0];
            console.log('Current project state:', currentProject);
            
            // Handle projects with null user_id (legacy/migrated projects)
            if (!currentProject.user_id) {
              console.log('WARNING: Project has null user_id, will verify without user constraint');
            }

            // Check if already verified
            if (currentProject.status === 'verified' && currentProject.is_verified) {
              console.log('Project already verified, returning success');
              return res.status(200).json({ success: true, message: 'Project already verified' });
            }

            console.log('Executing UPDATE query...');
            console.log('Query parameters:', {
              status: 'verified',
              verified_by: adminWallet,
              project_id: projectId,
              is_verified: true
            });
            
            const updateResult = await pool.query(
              `UPDATE projects SET 
                status = $1, 
                verified_by = $2, 
                verified_at = NOW(), 
                updated_at = NOW(),
                is_verified = $4
              WHERE id = $3`,
              ['verified', adminWallet, projectId, true]
            );
            console.log('Update result:', updateResult);

            console.log('Logging admin activity...');
            await logAdminActivity(adminWallet, 'VERIFY_PROJECT', 'project', projectId);

            console.log('SUCCESS: Project verified successfully');
            return res.status(200).json({ success: true });
          } catch (error) {
            console.error('Admin POST verify error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error details:', errorMessage);
            return res.status(500).json({ 
              error: 'Internal server error',
              details: errorMessage 
            });
          }
        }

        // Unverify project
        if (req.query?.action === 'unverify') {
          try {
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
                is_verified = $3
              WHERE id = $2`,
              ['active', projectId, false]
            );

            await logAdminActivity(adminWallet, 'UNVERIFY_PROJECT', 'project', projectId);

            return res.status(200).json({ success: true });
          } catch (error) {
            console.error('Admin POST unverify error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error details:', errorMessage);
            return res.status(500).json({ 
              error: 'Internal server error',
              details: errorMessage 
            });
          }
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
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.message && error.message.includes('Unauthorized')) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error',
      stack: error.stack
    });
  }
}
