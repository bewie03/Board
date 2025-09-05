// Database connection and query utilities
import { Pool } from 'pg';

// Database connection pool - create pool inside functions to avoid cold start issues
let pool: any = null;

export function getPool() {
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

// User database operations
export const createUser = async (walletAddress: string) => {
  try {
    const query = 'INSERT INTO users (wallet_address) VALUES ($1) ON CONFLICT (wallet_address) DO NOTHING RETURNING *';
    const result = await getPool().query(query, [walletAddress]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const getUserByWallet = async (walletAddress: string) => {
  try {
    const query = 'SELECT * FROM users WHERE wallet_address = $1';
    const result = await getPool().query(query, [walletAddress]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user by wallet:', error);
    throw error;
  }
};





// Service database operations
export const createService = async (serviceData: any) => {
  const query = `
    INSERT INTO services (
      title, description, category, funding_goal, logo, funding_address,
      discord_link, twitter_link, wallet_address, payment_amount,
      payment_currency, tx_hash, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;
  
  const values = [
    serviceData.title, serviceData.description, serviceData.category,
    serviceData.fundingGoal, serviceData.logo, serviceData.fundingAddress,
    serviceData.discordLink, serviceData.twitterLink, serviceData.walletAddress,
    serviceData.paymentAmount, serviceData.paymentCurrency || 'BONE',
    serviceData.txHash, serviceData.expiresAt
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getActiveServices = async () => {
  const query = `
    SELECT s.*, 
           COALESCE(sv_up.vote_count, 0) as upvotes,
           COALESCE(sv_down.vote_count, 0) as downvotes,
           COALESCE(sf.funding_sum, 0) as current_funding,
           COALESCE(sf.backer_count, 0) as backers
    FROM services s
    LEFT JOIN (
      SELECT service_id, COUNT(*) as vote_count 
      FROM service_votes 
      WHERE vote_type = 'up' 
      GROUP BY service_id
    ) sv_up ON s.id = sv_up.service_id
    LEFT JOIN (
      SELECT service_id, COUNT(*) as vote_count 
      FROM service_votes 
      WHERE vote_type = 'down' 
      GROUP BY service_id
    ) sv_down ON s.id = sv_down.service_id
    LEFT JOIN (
      SELECT service_id, SUM(amount) as funding_sum, COUNT(*) as backer_count
      FROM service_fundings 
      GROUP BY service_id
    ) sf ON s.id = sf.service_id
    WHERE s.status = 'active'
    ORDER BY s.created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

// Review database operations


// Job database operations
export const createJob = async (jobData: any) => {
  const expiresAt = new Date(Date.now() + (jobData.duration * 30 * 24 * 60 * 60 * 1000));
  
  const query = `
    INSERT INTO jobs (
      title, company, description, salary, salary_type, category, type,
      contact_email, how_to_apply, duration, payment_amount, payment_currency,
      wallet_address, tx_hash, status, work_arrangement, required_skills,
      additional_info, company_website, company_logo, website, twitter,
      discord, featured, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    RETURNING *
  `;
  
  const values = [
    jobData.title, jobData.company, jobData.description, jobData.salary,
    jobData.salaryType, jobData.category, jobData.type, jobData.contactEmail,
    jobData.howToApply, jobData.duration, jobData.paymentAmount, jobData.paymentCurrency,
    jobData.walletAddress, jobData.txHash, jobData.status || 'pending',
    jobData.workArrangement, jobData.requiredSkills, jobData.additionalInfo,
    jobData.companyWebsite, jobData.companyLogo, jobData.website, jobData.twitter,
    jobData.discord, jobData.featured || false, expiresAt
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getActiveJobs = async () => {
  const query = `
    SELECT * FROM jobs 
    WHERE expires_at > NOW() AND status IN ('confirmed', 'pending')
    ORDER BY featured DESC, created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

export const getJobsByWallet = async (walletAddress: string) => {
  const query = 'SELECT * FROM jobs WHERE wallet_address = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [walletAddress]);
  return result.rows;
};

// Project database operations
export const createProject = async (projectData: any) => {
  const query = `
    INSERT INTO projects (
      title, description, category, funding_goal, logo, funding_address,
      discord_link, twitter_link, wallet_address, payment_amount,
      payment_currency, tx_hash, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;
  
  const values = [
    projectData.title, projectData.description, projectData.category,
    projectData.fundingGoal, projectData.logo, projectData.fundingAddress,
    projectData.discordLink, projectData.twitterLink, projectData.walletAddress,
    projectData.paymentAmount, projectData.paymentCurrency || 'BONE',
    projectData.txHash, projectData.expiresAt
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getActiveProjects = async () => {
  const query = `
    SELECT p.*, 
           COALESCE(pv_up.vote_count, 0) as upvotes,
           COALESCE(pv_down.vote_count, 0) as downvotes,
           COALESCE(pf.funding_sum, 0) as current_funding,
           COALESCE(pf.backer_count, 0) as backers
    FROM projects p
    LEFT JOIN (
      SELECT project_id, COUNT(*) as vote_count 
      FROM project_votes 
      WHERE vote_type = 'up' 
      GROUP BY project_id
    ) pv_up ON p.id = pv_up.project_id
    LEFT JOIN (
      SELECT project_id, COUNT(*) as vote_count 
      FROM project_votes 
      WHERE vote_type = 'down' 
      GROUP BY project_id
    ) pv_down ON p.id = pv_down.project_id
    LEFT JOIN (
      SELECT project_id, SUM(amount) as funding_sum, COUNT(*) as backer_count
      FROM project_funding 
      GROUP BY project_id
    ) pf ON p.id = pf.project_id
    WHERE p.status = 'active'
    ORDER BY p.created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

// Message database operations
export const createMessage = async (fromWallet: string, toWallet: string, content: string) => {
  const query = `
    INSERT INTO messages (from_wallet_address, to_wallet_address, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await pool.query(query, [fromWallet, toWallet, content]);
  return result.rows[0];
};

export const getMessagesByWallet = async (walletAddress: string) => {
  const query = `
    SELECT * FROM messages 
    WHERE to_wallet_address = $1 OR from_wallet_address = $1
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query, [walletAddress]);
  return result.rows;
};

// Saved jobs operations
export const saveJob = async (jobId: string, walletAddress: string) => {
  const query = 'INSERT INTO saved_jobs (job_id, wallet_address) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *';
  const result = await pool.query(query, [jobId, walletAddress]);
  return result.rows[0];
};

export const getSavedJobsByWallet = async (walletAddress: string) => {
  const query = `
    SELECT sj.*, j.title, j.company, j.description, j.salary, j.category
    FROM saved_jobs sj
    INNER JOIN jobs j ON sj.job_id = j.id
    WHERE sj.wallet_address = $1
    ORDER BY sj.created_at DESC
  `;
  const result = await pool.query(query, [walletAddress]);
  return result.rows;
};

// Cleanup operations
export const runScheduledCleanup = async () => {
  const query = 'SELECT scheduled_cleanup()';
  const result = await pool.query(query);
  return result.rows[0];
};
