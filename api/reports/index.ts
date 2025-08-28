import { Pool } from 'pg';

// Simple UUID generator function
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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

    const values = [
      reportId,
      title,
      description,
      scam_type,
      severity,
      evidence_urls || null,
      scam_identifier,
      reporter_id || walletAddress
    ];

    const result = await pool.query(query, values);
    
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

    const { status = 'pending', archived = 'false' } = req.query;

    let query = `
      SELECT r.*, 
             CASE 
               WHEN r.scam_type = 'malicious_project' THEN p.title
               WHEN r.scam_type = 'fake_project' THEN p.title
               ELSE r.scam_identifier
             END as project_name
      FROM scam_reports r
      LEFT JOIN projects p ON r.scam_identifier = p.id::text
      WHERE 1=1
    `;

    const values: any[] = [];
    let paramCount = 0;

    if (archived === 'true') {
      query += ` AND r.status IN ('resolved', 'dismissed', 'deleted', 'paused')`;
    } else {
      query += ` AND r.status = $${++paramCount}`;
      values.push(status);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, values);
    
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

    let reportStatus = 'pending';
    let projectAction = null;

    switch (action) {
      case 'pause':
        reportStatus = 'resolved';
        projectAction = 'pause';
        break;
      case 'delete':
        reportStatus = 'resolved';
        projectAction = 'delete';
        break;
      case 'archive':
        reportStatus = 'dismissed';
        break;
      case 'restore':
        reportStatus = 'resolved';
        projectAction = 'restore';
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update report status
      const updateReportQuery = `
        UPDATE scam_reports 
        SET status = $1, verified_by = $2, verified_at = NOW(), updated_at = NOW(), is_verified = true
        WHERE id = $3
        RETURNING *
      `;
      
      const reportResult = await client.query(updateReportQuery, [reportStatus, walletAddress, reportId]);
      
      if (reportResult.rows.length === 0) {
        throw new Error('Report not found');
      }

      // Take action on the project if needed
      if (projectAction && projectId) {
        let projectQuery = '';
        let projectValues: any[] = [];

        switch (projectAction) {
          case 'pause':
            projectQuery = 'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2';
            projectValues = ['paused', projectId];
            break;
          case 'delete':
            projectQuery = 'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2';
            projectValues = ['deleted', projectId];
            break;
          case 'restore':
            projectQuery = 'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2';
            projectValues = ['active', projectId];
            break;
        }

        if (projectQuery) {
          await client.query(projectQuery, projectValues);
          console.log(`Project ${projectId} ${projectAction}d by admin ${walletAddress}`);
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
