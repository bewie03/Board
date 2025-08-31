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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Jobs API Error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      DATABASE_URL_SET: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL)
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { id, wallet, status, category, active, removeDuplicates } = req.query;

  // If removeDuplicates flag is set, clean up duplicates first
  if (removeDuplicates === 'true') {
    await removeDuplicateJobs();
  }

  let query = `
    SELECT 
      j.*,
      p.is_verified as project_verified,
      p.status as project_status
    FROM job_listings j
    LEFT JOIN projects p ON (
      LOWER(j.company) = LOWER(p.title) OR
      j.user_id = p.wallet_address
    )
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (id) {
    conditions.push('j.id = $' + (params.length + 1));
    params.push(id);
  }

  if (wallet) {
    conditions.push('j.user_id = $' + (params.length + 1));
    params.push(wallet);
  }

  if (status) {
    conditions.push('j.status = $' + (params.length + 1));
    params.push(status);
  }

  if (category) {
    conditions.push('j.category = $' + (params.length + 1));
    params.push(category);
  }

  if (active === 'true') {
    conditions.push('j.expires_at > NOW()');
    conditions.push('j.status IN (\'confirmed\', \'pending\')');
    conditions.push('j.status != \'paused\''); // Exclude paused items from public listings
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY j.created_at DESC';

  const result = await getPool().query(query, params);
  
  // Transform database result to match frontend interface
  const jobs = result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    company: row.company,
    description: row.description,
    salary: row.salary,
    salaryType: row.salary_type,
    customSalaryType: row.custom_salary_type,
    category: row.category,
    type: row.type,
    contactEmail: row.contact_email,
    howToApply: row.how_to_apply,
    duration: row.listing_duration,
    paymentAmount: row.payment_amount,
    paymentCurrency: row.payment_currency,
    walletAddress: row.user_id,
    timestamp: new Date(row.created_at).getTime(),
    txHash: row.tx_hash,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    workArrangement: row.work_arrangement,
    requiredSkills: row.required_skills_text ? row.required_skills_text.split(',').map((skill: string) => skill.trim().replace(/^["']|["']$/g, '')).filter((skill: string) => skill.length > 0) : [],
    additionalInfo: row.additional_info_text ? row.additional_info_text.split('\n').map((info: string) => info.trim().replace(/^["']|["']$/g, '')).filter((info: string) => info.length > 0) : [],
    companyWebsite: row.company_website,
    companyLogo: row.company_logo_url,
    website: row.website,
    twitter: row.twitter,
    discord: row.discord,
    featured: row.is_featured,
    isProjectVerified: row.project_verified || row.project_status === 'verified'
  }));

  return res.status(200).json(jobs);
}

// Function to remove duplicate jobs based on txHash or similar content
async function removeDuplicateJobs() {
  try {
    console.log('Starting duplicate job removal process...');
    
    // Find duplicates by txHash (most reliable identifier)
    const txHashDuplicatesQuery = `
      WITH duplicate_txhash AS (
        SELECT tx_hash, MIN(id) as keep_id, COUNT(*) as count
        FROM job_listings 
        WHERE tx_hash IS NOT NULL 
        GROUP BY tx_hash 
        HAVING COUNT(*) > 1
      )
      DELETE FROM job_listings 
      WHERE tx_hash IN (SELECT tx_hash FROM duplicate_txhash)
      AND id NOT IN (SELECT keep_id FROM duplicate_txhash)
      RETURNING id, tx_hash, title;
    `;
    
    const txHashResult = await getPool().query(txHashDuplicatesQuery);
    
    // Find duplicates by content similarity (same title, company, wallet, created within 5 minutes)
    const contentDuplicatesQuery = `
      WITH duplicate_content AS (
        SELECT 
          title, company, user_id,
          MIN(id) as keep_id,
          COUNT(*) as count,
          MIN(created_at) as first_created
        FROM job_listings 
        GROUP BY title, company, user_id
        HAVING COUNT(*) > 1
        AND MAX(created_at) - MIN(created_at) < INTERVAL '5 minutes'
      )
      DELETE FROM job_listings 
      WHERE (title, company, user_id) IN (
        SELECT title, company, user_id FROM duplicate_content
      )
      AND id NOT IN (SELECT keep_id FROM duplicate_content)
      RETURNING id, title, company, user_id;
    `;
    
    const contentResult = await getPool().query(contentDuplicatesQuery);
    
    const totalRemoved = txHashResult.rows.length + contentResult.rows.length;
    
    if (totalRemoved > 0) {
      console.log(`Removed ${totalRemoved} duplicate jobs:`, {
        byTxHash: txHashResult.rows.length,
        byContent: contentResult.rows.length,
        removedJobs: [...txHashResult.rows, ...contentResult.rows]
      });
    } else {
      console.log('No duplicate jobs found to remove');
    }
    
    return totalRemoved;
  } catch (error) {
    console.error('Error removing duplicate jobs:', error);
    throw error;
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const {
    title,
    company,
    description,
    salary,
    salaryType,
    customSalaryType,
    category,
    type,
    contactEmail,
    howToApply,
    duration,
    paymentAmount,
    paymentCurrency,
    walletAddress,
    txHash,
    status = 'pending',
    workArrangement,
    requiredSkills,
    additionalInfo,
    companyWebsite,
    companyLogo,
    website,
    twitter,
    discord,
    featured = false
  } = req.body;

  // Calculate expiration date
  const expiresAt = new Date(Date.now() + (duration * 30 * 24 * 60 * 60 * 1000));

  // Check if job with this txHash already exists to prevent duplicates
  if (txHash) {
    const duplicateCheckQuery = 'SELECT id FROM job_listings WHERE tx_hash = $1';
    const duplicateResult = await getPool().query(duplicateCheckQuery, [txHash]);
    
    if (duplicateResult.rows.length > 0) {
      console.log('Job with this transaction hash already exists:', txHash);
      return res.status(409).json({ 
        error: 'Job with this transaction hash already exists',
        existingJobId: duplicateResult.rows[0].id 
      });
    }
  }

  // Validate that the project exists if company name matches a project
  if (company) {
    const projectCheck = await getPool().query(
      'SELECT id FROM projects WHERE LOWER(title) = LOWER($1) OR wallet_address = $2',
      [company, walletAddress]
    );
    
    if (projectCheck.rows.length === 0 && company !== 'Independent') {
      console.log('Project not found for company:', company, 'wallet:', walletAddress);
      return res.status(404).json({ 
        error: 'Project not found. Cannot create job for non-existent project.',
        company: company
      });
    }
  }

  const query = `
    INSERT INTO job_listings (
      title, company, description, salary, salary_type, category, type,
      contact_email, how_to_apply, listing_duration, payment_amount, payment_currency,
      user_id, status, work_arrangement, required_skills_text,
      additional_info_text, company_website, company_logo_url, website, twitter,
      discord, is_featured, tx_hash, expires_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
    ) RETURNING *
  `;

  const params = [
    title, company, description, salary, salaryType, category, type,
    contactEmail, howToApply, duration, paymentAmount, paymentCurrency,
    walletAddress, status, workArrangement, requiredSkills,
    additionalInfo, companyWebsite, companyLogo, website, twitter,
    discord, featured, txHash, expiresAt
  ];

  const result = await getPool().query(query, params);
  const job = result.rows[0];

  // Transform to frontend format
  const transformedJob = {
    id: job.id,
    title: job.title,
    company: job.company,
    description: job.description,
    salary: job.salary,
    salaryType: job.salary_type,
    customSalaryType: job.custom_salary_type,
    category: job.category,
    type: job.type,
    contactEmail: job.contact_email,
    howToApply: job.how_to_apply,
    duration: job.listing_duration,
    paymentAmount: job.payment_amount,
    paymentCurrency: job.payment_currency,
    walletAddress: job.user_id,
    timestamp: new Date(job.created_at).getTime(),
    txHash: job.tx_hash,
    status: job.status,
    createdAt: job.created_at,
    expiresAt: job.expires_at,
    workArrangement: job.work_arrangement,
    requiredSkills: job.required_skills_text ? job.required_skills_text.split(',').map((skill: string) => skill.trim().replace(/^["']|["']$/g, '')).filter((skill: string) => skill.length > 0) : [],
    additionalInfo: job.additional_info_text ? job.additional_info_text.split('\n').map((info: string) => info.trim().replace(/^["']|["']$/g, '')).filter((info: string) => info.length > 0) : [],
    companyWebsite: job.company_website,
    companyLogo: job.company_logo_url,
    website: job.website,
    twitter: job.twitter,
    discord: job.discord,
    featured: job.is_featured
  };

  return res.status(201).json(transformedJob);
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const updates = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  // Build dynamic update query
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fieldMapping: { [key: string]: string } = {
    title: 'title',
    company: 'company',
    description: 'description',
    salary: 'salary',
    salaryType: 'salary_type',
    category: 'category',
    type: 'type',
    contactEmail: 'contact_email',
    howToApply: 'how_to_apply',
    status: 'status',
    workArrangement: 'work_arrangement',
    requiredSkills: 'required_skills_text',
    additionalInfo: 'additional_info_text',
    companyWebsite: 'company_website',
    companyLogo: 'company_logo_url',
    website: 'website',
    twitter: 'twitter',
    discord: 'discord',
    featured: 'is_featured',
    txHash: 'tx_hash'
  };

  Object.entries(updates).forEach(([key, value]) => {
    const dbField = fieldMapping[key];
    if (dbField) {
      updateFields.push(`${dbField} = $${paramIndex}`);
      
      // Handle array fields that need to be converted to strings
      if (key === 'requiredSkills' && Array.isArray(value)) {
        // Convert array to comma-separated string
        params.push(value.join(', '));
      } else if (key === 'additionalInfo' && Array.isArray(value)) {
        // Convert array to newline-separated string
        params.push(value.join('\n'));
      } else {
        params.push(value);
      }
      
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  params.push(id); // Add ID as last parameter
  const query = `
    UPDATE job_listings 
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await getPool().query(query, params);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.status(200).json({ success: true, job: result.rows[0] });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  const query = 'DELETE FROM job_listings WHERE id = $1 RETURNING id';
  const result = await getPool().query(query, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.status(200).json({ success: true, message: 'Job deleted successfully' });
}
