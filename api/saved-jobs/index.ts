import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Database connection - create pool inside handler to avoid cold start issues
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
      max: 1, // Vercel functions are stateless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Enable CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers first
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Get saved jobs with job details and project verification
  const query = `
    SELECT sj.*, j.title, j.company, j.description, j.salary, j.salary_type,
           j.category, j.type, j.work_arrangement, j.company_logo, j.status,
           j.expires_at, j.created_at as job_created_at,
           p.is_verified as project_verified, p.status as project_status
    FROM saved_jobs sj
    INNER JOIN jobs j ON sj.job_id = j.id
    LEFT JOIN projects p ON j.company = p.name
    WHERE sj.wallet_address = $1
    ORDER BY sj.created_at DESC
  `;

  const result = await getPool().query(query, [wallet]);
  
  const savedJobs = result.rows.map((row: any) => ({
    id: row.job_id,
    title: row.title,
    company: row.company,
    description: row.description,
    salary: row.salary,
    salaryType: row.salary_type,
    category: row.category,
    type: row.type,
    workArrangement: row.work_arrangement,
    companyLogo: row.company_logo,
    status: row.status,
    expiresAt: row.expires_at,
    jobCreatedAt: row.job_created_at,
    savedAt: row.created_at,
    isProjectVerified: row.project_verified || row.project_status === 'verified'
  }));

  return res.status(200).json(savedJobs);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { jobId, walletAddress } = req.body;

  if (!jobId || !walletAddress) {
    return res.status(400).json({ error: 'Job ID and wallet address are required' });
  }

  // Check if job exists
  const jobCheck = await getPool().query('SELECT id FROM jobs WHERE id = $1', [jobId]);
  if (jobCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Insert saved job (will fail if already exists due to unique constraint)
  try {
    const query = 'INSERT INTO saved_jobs (job_id, wallet_address) VALUES ($1, $2) RETURNING *';
    const result = await getPool().query(query, [jobId, walletAddress]);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Job saved successfully',
      savedJob: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Job already saved' });
    }
    throw error;
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { jobId, wallet } = req.query;

  if (!jobId || !wallet) {
    return res.status(400).json({ error: 'Job ID and wallet address are required' });
  }

  const query = 'DELETE FROM saved_jobs WHERE job_id = $1 AND wallet_address = $2 RETURNING *';
  const result = await getPool().query(query, [jobId, wallet]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Saved job not found' });
  }

  return res.status(200).json({ 
    success: true, 
    message: 'Job removed from saved list' 
  });
}