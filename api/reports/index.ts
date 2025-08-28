import { Pool } from 'pg';

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

export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    return handleSubmitReport(req, res);
  } else if (req.method === 'GET') {
    return handleGetReports(req, res);
  } else if (req.method === 'PUT') {
    return handleUpdateReport(req, res);
  } else {
    res.setHeader('Allow', ['POST', 'GET', 'PUT']);
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

    const { archived = 'false', paused = 'false' } = req.query;

    let query: string;
    let values: any[] = [];

    if (paused === 'true') {
      // Get reports where associated project/job is paused AND report status is 'verified'
      query = `
        (SELECT r.*, 
               p.title as project_name,
               'project' as item_type
        FROM scam_reports r
        INNER JOIN projects p ON r.scam_identifier = p.id::text AND r.scam_type = 'project'
        WHERE p.status = 'paused' AND r.status = 'verified')
        UNION ALL
        (SELECT r.*, 
               j.title as project_name,
               'job' as item_type
        FROM scam_reports r
        INNER JOIN job_listings j ON r.scam_identifier = j.id::text AND r.scam_type = 'user'
        WHERE j.status = 'paused' AND r.status = 'verified')
        ORDER BY updated_at DESC
      `;
    } else if (archived === 'true') {
      // Get archived/resolved reports (status = 'resolved')
      query = `
        SELECT r.*, 
               CASE 
                 WHEN r.scam_type = 'project' THEN p.title
                 WHEN r.scam_type = 'user' THEN j.title
                 ELSE r.scam_identifier
               END as project_name,
               CASE 
                 WHEN r.scam_type = 'project' THEN 'project'
                 WHEN r.scam_type = 'user' THEN 'job'
                 ELSE r.scam_type
               END as item_type
        FROM scam_reports r
        LEFT JOIN projects p ON r.scam_identifier = p.id::text AND r.scam_type = 'project'
        LEFT JOIN job_listings j ON r.scam_identifier = j.id::text AND r.scam_type = 'user'
        WHERE r.status = 'resolved'
        ORDER BY r.updated_at DESC
      `;
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
                 WHEN r.scam_type = 'user' THEN 'job'
                 ELSE r.scam_type
               END as item_type
        FROM scam_reports r
        LEFT JOIN projects p ON r.scam_identifier = p.id::text AND r.scam_type = 'project'
        LEFT JOIN job_listings j ON r.scam_identifier = j.id::text AND r.scam_type = 'user'
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC
      `;
    }

    const result = await getPool().query(query, values);

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
      case 'archive':
        reportStatus = 'resolved'; // Move report to archive menu
        projectStatus = null; // Don't change job/project status
        break;
      case 'restore':
        reportStatus = 'pending'; // Move report back to active reports
        projectStatus = null; // Don't change job/project status when restoring from archive
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

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
      
      if (action === 'delete' || action === 'permanent_delete') {
        updateReportQuery = `DELETE FROM scam_reports WHERE id = $1 RETURNING *`;
        reportParams = [reportId];
      } else {
        updateReportQuery = `
          UPDATE scam_reports 
          SET status = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW(), is_verified = true
          WHERE id = $3
          RETURNING *
        `;
        reportParams = [reportStatus, adminUserId, reportId];
      }
      
      const reportResult = await client.query(updateReportQuery, reportParams);
      
      if (reportResult.rows.length === 0) {
        throw new Error('Report not found');
      }

      // Take action on the project/job if needed
      if (action && projectId && projectStatus !== null) {
        // First, determine if this is a project or job by checking the report
        const reportData = reportResult.rows[0];
        const scamType = reportData.scam_type;
        const itemType = scamType === 'project' ? 'project' : 'job';
        
        console.log(`Processing ${action} for scam_type: ${scamType}, itemType: ${itemType} with ID: ${projectId}`);
        
        let updateQuery = '';
        let updateValues: any[] = [];
        let tableName = itemType === 'project' ? 'projects' : 'job_listings';

        switch (action) {
          case 'pause':
            // Pause: Hide job/project from public view
            updateQuery = `UPDATE ${tableName} SET status = $1, updated_at = NOW() WHERE id = $2`;
            updateValues = ['paused', projectId];
            break;
          case 'restore':
            // Restore: Update project/job status to active when resuming from pause
            updateQuery = `UPDATE ${tableName} SET status = $1, updated_at = NOW() WHERE id = $2`;
            updateValues = itemType === 'project' ? ['active', projectId] : ['confirmed', projectId];
            break;
          case 'permanent_delete':
            // Permanent delete: Remove job/project from database completely
            updateQuery = `DELETE FROM ${tableName} WHERE id = $1`;
            updateValues = [projectId];
            break;
          case 'delete':
            // Delete report only: Don't affect project/job status
            updateQuery = '';
            updateValues = [];
            break;
          case 'archive':
            // Archive report only: Don't affect project/job status
            updateQuery = '';
            updateValues = [];
            break;
          default:
            updateQuery = '';
            updateValues = [];
            break;
        }

        if (updateQuery) {
          console.log(`Executing query: ${updateQuery} with values:`, updateValues);
          const updateResult = await client.query(updateQuery, updateValues);
          console.log(`Update result: ${updateResult.rowCount} rows affected`);
          console.log(`${itemType} ${projectId} ${action}d by admin ${walletAddress}`);
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
