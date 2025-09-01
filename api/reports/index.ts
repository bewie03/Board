import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { rateLimit } from '../middleware/rateLimiter';

// Simple UUID generator function
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// No rate limiting for reports - removed cooldown
// const reportsRateLimit = rateLimit({
//   windowMs: 3 * 60 * 1000, // 3 minutes
//   max: 2, // allow 2 reports per 3 minutes per IP
//   message: 'You can only submit 2 reports every 3 minutes. Please wait before submitting another report.'
// });

// General rate limiting for viewing reports
const reportsViewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs for viewing
  message: 'Too many requests from this IP, please try again later.'
});

export default async function handler(req: any, res: any) {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wallet-address, x-wallet-signature, x-timestamp');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // No rate limiting for report submissions - removed cooldown
    return handleSubmitReport(req, res);
  } else if (req.method === 'GET') {
    // Apply rate limiting for viewing reports
    return new Promise((resolve) => {
      reportsViewRateLimit(req, res, (result?: any) => {
        if (result) {
          // Rate limit exceeded, response already sent
          return resolve(result);
        }
        // Rate limit passed, proceed with handling
        resolve(handleGetReports(req, res));
      });
    });
  } else if (req.method === 'PUT') {
    return handleUpdateReport(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleSubmitReport(req: any, res: any) {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    
    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    const {
      title,
      description,
      scam_type,
      severity,
      evidence_urls,
      scam_identifier,
      reporter_id
    } = req.body;

    // Validate required fields
    if (!title || !description || !scam_type || !severity || !scam_identifier) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Look up or create user ID from wallet address
    let userId = null;
    try {
      // First try to find existing user
      const userQuery = 'SELECT id FROM users WHERE wallet_address = $1';
      const userResult = await getPool().query(userQuery, [walletAddress]);
      
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
      } else {
        // Create new user if doesn't exist
        const newUserId = generateUUID();
        const createUserQuery = `
          INSERT INTO users (id, wallet_address, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          RETURNING id
        `;
        const createUserResult = await getPool().query(createUserQuery, [newUserId, walletAddress]);
        userId = createUserResult.rows[0].id;
      }
    } catch (error) {
      console.error('Error handling user lookup/creation:', error);
      return res.status(500).json({ error: 'Failed to process user information' });
    }

    // Insert report into database
    const reportId = generateUUID();
    const query = `
      INSERT INTO scam_reports (
        id, title, description, scam_type, severity, evidence_urls,
        scam_identifier, reporter_id, status, is_verified, created_at, updated_at,
        upvotes, downvotes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', false, NOW(), NOW(), 0, 0)
      RETURNING *
    `;

    // Convert evidence_urls to proper PostgreSQL array format
    let evidenceUrlsArray = null;
    if (evidence_urls) {
      if (Array.isArray(evidence_urls)) {
        evidenceUrlsArray = evidence_urls;
      } else if (typeof evidence_urls === 'string') {
        try {
          // Try to parse as JSON array first
          evidenceUrlsArray = JSON.parse(evidence_urls);
        } catch {
          // If not JSON, treat as single URL
          evidenceUrlsArray = [evidence_urls];
        }
      }
    }

    const values = [
      reportId,
      title,
      description,
      scam_type,
      severity,
      evidenceUrlsArray,
      scam_identifier,
      userId
    ];

    const result = await getPool().query(query, values);
    
    console.log('Report submitted successfully:', {
      reportId,
      title,
      scam_identifier,
      reporter: walletAddress
    });

    return res.status(201).json({
      message: 'Report submitted successfully',
      report: result.rows[0]
    });

  } catch (error) {
    console.error('Error submitting report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetReports(req: any, res: any) {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    
    // Check if user is admin (you should implement proper admin auth)
    const ADMIN_WALLET = 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';
    
    if (walletAddress !== ADMIN_WALLET) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { paused = 'false' } = req.query;

    let query: string;
    let values: any[] = [];

    if (paused === 'true') {
      // Get reports where associated project/job is paused AND report status is 'verified'
      query = `
        SELECT r.*, 
               CASE 
                 WHEN r.scam_type = 'project' THEN p.title
                 WHEN r.scam_type = 'user' THEN j.title
                 ELSE r.scam_identifier
               END as project_name,
               CASE 
                 WHEN r.scam_type = 'project' THEN 'project'
                 WHEN r.scam_type = 'job' THEN 'job'
                 WHEN r.scam_type = 'user' THEN 'job'
                 ELSE r.scam_type
               END as item_type
        FROM scam_reports r
        LEFT JOIN projects p ON (r.scam_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND CAST(r.scam_identifier AS UUID) = p.id AND r.scam_type = 'project')
        LEFT JOIN job_listings j ON (r.scam_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND CAST(r.scam_identifier AS UUID) = j.id AND r.scam_type = 'user')
        WHERE r.status = 'verified'
        ORDER BY r.updated_at DESC
      `;
      console.log('Paused reports query:', query);
    } else {
      // Get active/pending reports (status = 'pending')
      query = `
        SELECT r.*, 
               CASE 
                 WHEN r.scam_type = 'project' THEN p.title
                 WHEN r.scam_type = 'user' THEN j.title
                 ELSE r.scam_identifier
               END as project_name,
               CASE 
                 WHEN r.scam_type = 'project' THEN 'project'
                 WHEN r.scam_type = 'job' THEN 'job'
                 WHEN r.scam_type = 'user' THEN 'job'
                 ELSE r.scam_type
               END as item_type
        FROM scam_reports r
        LEFT JOIN projects p ON (r.scam_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND CAST(r.scam_identifier AS UUID) = p.id AND r.scam_type = 'project')
        LEFT JOIN job_listings j ON (r.scam_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND CAST(r.scam_identifier AS UUID) = j.id AND r.scam_type = 'user')
        WHERE r.status IN ('pending', 'verified')
        ORDER BY r.created_at DESC
      `;
    }

    const result = await getPool().query(query, values);
    
    console.log(`[API] Query executed for ${paused === 'true' ? 'paused' : 'active'} reports:`);
    console.log(`[API] Found ${result.rows.length} reports`);
    if (result.rows.length > 0) {
      console.log('[API] Sample report:', JSON.stringify(result.rows[0], null, 2));
    }

    return res.status(200).json({
      reports: result.rows
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleUpdateReport(req: any, res: any) {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    
    // Check if user is admin
    const ADMIN_WALLET = 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';
    
    if (walletAddress !== ADMIN_WALLET) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { reportId, action, projectId } = req.body;

    if (!reportId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let reportStatus: string | null = 'pending';
    let projectStatus: string | null = 'active';
    
    switch (action) {
      case 'pause':
        reportStatus = 'verified'; // Mark report as verified but keep it linked to paused item
        projectStatus = 'paused'; // Hide project/job from public view
        break;
      case 'delete':
        // Remove report only - delete report from database but keep project/job active
        reportStatus = null; // Will delete the report
        projectStatus = null; // Don't change job/project status
        break;
      case 'permanent_delete':
        // Delete both report and project/job entirely
        reportStatus = null; // Will delete the report
        projectStatus = 'deleted'; // Mark project/job for permanent deletion
        break;
      case 'restore':
        reportStatus = 'verified'; // Keep report as verified when restoring - just unpausing the item
        projectStatus = null; // Will be set dynamically based on item type
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    console.log(`[API] Action: ${action}, reportStatus: ${reportStatus}, projectStatus: ${projectStatus}`);

    // Start transaction
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Look up admin user ID from wallet address
      const adminUserQuery = 'SELECT id FROM users WHERE wallet_address = $1';
      const adminUserResult = await client.query(adminUserQuery, [walletAddress]);
      
      let adminUserId = null;
      if (adminUserResult.rows.length > 0) {
        adminUserId = adminUserResult.rows[0].id;
      }

      // Update report status or delete report
      let updateReportQuery = '';
      let reportParams: any[] = [];
      
      // First, let's see what the current report looks like with item_type
      const currentReportQuery = `
        SELECT r.*, 
               CASE 
                 WHEN r.scam_type = 'project' THEN 'project'
                 WHEN r.scam_type = 'job' THEN 'job'
                 WHEN r.scam_type = 'user' THEN 'job'
                 ELSE r.scam_type
               END as item_type
        FROM scam_reports r 
        WHERE r.id = $1
      `;
      const currentReportResult = await client.query(currentReportQuery, [reportId]);
      console.log('[API] Current report before update:', JSON.stringify(currentReportResult.rows[0], null, 2));
      
      console.log(`[API] Processing report ${reportId} with action: ${action}, reportStatus: ${reportStatus}`);
      
      if (reportStatus === null) {
        updateReportQuery = `
          DELETE FROM scam_reports 
          WHERE id = $1 
          RETURNING *, 
                   CASE 
                     WHEN scam_type = 'project' THEN 'project'
                     WHEN scam_type = 'job' THEN 'job'
                     WHEN scam_type = 'user' THEN 'job'
                     ELSE scam_type
                   END as item_type
        `;
        reportParams = [reportId];
      } else {
        updateReportQuery = `
          UPDATE scam_reports 
          SET status = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW(), is_verified = true
          WHERE id = $3
          RETURNING *, 
                   CASE 
                     WHEN scam_type = 'project' THEN 'project'
                     WHEN scam_type = 'job' THEN 'job'
                     WHEN scam_type = 'user' THEN 'job'
                     ELSE scam_type
                   END as item_type
        `;
        reportParams = [reportStatus, adminUserId, reportId];
      }
      
      const reportResult = await client.query(updateReportQuery, reportParams);
      
      if (reportResult.rows.length === 0) {
        throw new Error('Report not found');
      }

      console.log('[API] Report updated successfully:', JSON.stringify(reportResult.rows[0], null, 2));
      
      // After updating report, let's check what reports we can find with paused query
      if (action === 'pause') {
        const testPausedQuery = `
          SELECT r.*, 
                 CASE 
                   WHEN r.scam_type = 'project' THEN p.title
                   WHEN r.scam_type = 'user' THEN j.title
                   ELSE r.scam_identifier
                 END as project_name
          FROM scam_reports r
          LEFT JOIN projects p ON (r.scam_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND CAST(r.scam_identifier AS UUID) = p.id AND r.scam_type = 'project')
          LEFT JOIN job_listings j ON (r.scam_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND CAST(r.scam_identifier AS UUID) = j.id AND r.scam_type = 'user')
          WHERE r.status = 'verified'
        `;
        const testResult = await client.query(testPausedQuery);
        console.log('[API] All verified reports after pause action:', testResult.rows.length);
        if (testResult.rows.length > 0) {
          console.log('[API] Sample verified report:', JSON.stringify(testResult.rows[0], null, 2));
        }
      }

      // Take action on the project/job if needed
      if (action && projectId && (projectStatus !== null || action === 'pause' || action === 'restore')) {
        // First, determine if this is a project or job by checking both tables
        const reportData = reportResult.rows[0];
        const scamType = reportData.scam_type;
        const itemType = reportData.item_type;
        
        console.log(`[API] Processing ${action} for scam_type: ${scamType}, item_type: ${itemType} with ID: ${projectId}`);
        console.log(`[API] scam_identifier from report: ${reportData.scam_identifier}`);
        console.log(`[API] projectId parameter: ${projectId}`);
        console.log(`[API] Are they equal? ${reportData.scam_identifier === projectId}`);
        console.log(`[API] reportData.item_type:`, reportData.item_type);
        console.log(`[API] Will process item update: ${itemType === 'project' || itemType === 'job'}`);
        
        // For wallet_address and other non-project/job types, only update the report status
        if (itemType !== 'project' && itemType !== 'job') {
          console.log(`[API] Processing ${action} for ${itemType} report - updating report status only`);
          await client.query('COMMIT');
          return res.status(200).json({
            message: `Report ${action}d successfully.`,
            report: reportResult.rows[0]
          });
        }
        
        // Check both projects and job_listings tables to determine actual type
        let actualItemType = 'project';
        let tableName = 'projects';
        
        // First check projects table
        const projectExistsQuery = `SELECT id, status FROM projects WHERE id = CAST($1 AS UUID)`;
        const projectExists = await client.query(projectExistsQuery, [projectId]);
        
        if (projectExists.rows.length === 0) {
          // Not found in projects, check job_listings
          const jobExistsQuery = `SELECT id, status FROM job_listings WHERE id = CAST($1 AS UUID)`;
          const jobExists = await client.query(jobExistsQuery, [projectId]);
          
          if (jobExists.rows.length > 0) {
            actualItemType = 'job';
            tableName = 'job_listings';
            console.log(`[API] Found in job_listings table:`, jobExists.rows[0]);
          } else {
            console.log(`[API] ERROR: ID ${projectId} not found in either projects or job_listings tables`);
            console.log(`[API] SKIPPING update since item doesn't exist in any table`);
            
            await client.query('COMMIT');
            return res.status(200).json({
              message: `Report processed successfully. Note: Referenced item no longer exists in database.`,
              report: reportResult.rows[0],
              warning: `Item with ID ${projectId} not found in either projects or job_listings tables`
            });
          }
        } else {
          console.log(`[API] Found in projects table:`, projectExists.rows[0]);
        }
        
        console.log(`[API] Determined actualItemType: ${actualItemType}, tableName: ${tableName}`);
        
        let updateQuery = '';
        let updateValues: any[] = [];
        
        // We already checked existence above, so we can proceed with the update

        switch (action) {
          case 'pause':
            // Pause: Hide job/project from public view
            updateQuery = `UPDATE ${tableName} SET status = $1, updated_at = NOW() WHERE id = $2`;
            updateValues = ['paused', projectId];
            break;
          case 'restore':
            // Restore: Update project/job status back to active state when resuming from pause
            updateQuery = `UPDATE ${tableName} SET status = $1, updated_at = NOW() WHERE id = $2`;
            // Projects use 'active', jobs use 'confirmed' as their active state
            const restoredStatus = actualItemType === 'project' ? 'active' : 'confirmed';
            updateValues = [restoredStatus, projectId];
            console.log(`[API] Restoring ${actualItemType} to status: ${restoredStatus}`);
            break;
          case 'permanent_delete':
            // Permanent delete: Remove job/project from database completely
            // Try with UUID casting to handle potential type mismatches
            updateQuery = `DELETE FROM ${tableName} WHERE id = CAST($1 AS UUID)`;
            updateValues = [projectId];
            console.log(`[API] Attempting to delete from ${tableName} with UUID cast`);
            break;
          case 'delete':
            // Delete report only: Don't affect project/job status
            updateQuery = '';
            updateValues = [];
            break;
          default:
            updateQuery = '';
            updateValues = [];
            break;
        }

        // Execute the update query if we have one
        if (updateQuery && updateValues.length > 0) {
          console.log(`[API] Executing update query: ${updateQuery}`);
          console.log(`[API] Update values:`, updateValues);
          console.log(`[API] Target table: ${tableName}, actualItemType: ${actualItemType}`);
          
          const updateResult = await client.query(updateQuery, updateValues);
          console.log(`[API] Update result: ${updateResult.rowCount} rows affected`);
          
          if (updateResult.rowCount === 0) {
            console.log(`[API] WARNING: No rows were updated. Item may not exist or query failed.`);
            // Let's check if the item actually exists with current status
            const checkQuery = `SELECT id, status FROM ${tableName} WHERE id = CAST($1 AS UUID)`;
            const checkResult = await client.query(checkQuery, [projectId]);
            console.log(`[API] Item check result:`, checkResult.rows);
          } else {
            // Verify the update worked by checking current status
            const verifyQuery = `SELECT id, status FROM ${tableName} WHERE id = CAST($1 AS UUID)`;
            const verifyResult = await client.query(verifyQuery, [projectId]);
            console.log(`[API] Post-update verification:`, verifyResult.rows);
          }
        } else {
          console.log(`[API] No update query to execute for action: ${action}`);
        }
      }

      await client.query('COMMIT');
      
      console.log(`Report ${reportId} processed: ${action} by admin ${walletAddress}`);

      return res.status(200).json({
        message: 'Report processed successfully',
        report: reportResult.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
