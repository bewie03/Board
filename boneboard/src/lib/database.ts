// Database connection and query utilities
import { Pool } from 'pg';

// Database connection pool - create pool inside functions to avoid cold start issues
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

// Freelancer database operations
export const createFreelancer = async (freelancerData: any) => {
  try {
    console.log('Creating freelancer with data:', freelancerData);
    
    const query = `
      INSERT INTO freelancer_profiles (
        user_id, name, title, bio, avatar_url, category, skills, languages,
        location, rating, review_count, completed_orders, response_time, 
        is_online, busy_status, social_links, work_images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const values = [
      freelancerData.userId,
      freelancerData.name || 'Freelancer', // Ensure name is never null
      freelancerData.title || 'Professional',
      freelancerData.bio || '',
      freelancerData.avatarUrl || freelancerData.avatar || '',
      freelancerData.category || 'Other',
      freelancerData.skills || [], // PostgreSQL array
      freelancerData.languages || ['English'], // PostgreSQL array
      freelancerData.location || '',
      freelancerData.rating || 0,
      freelancerData.reviewCount || 0,
      freelancerData.completedOrders || 0,
      freelancerData.responseTime || '24 hours',
      freelancerData.isOnline !== undefined ? freelancerData.isOnline : true,
      freelancerData.busyStatus || 'available',
      JSON.stringify(freelancerData.socialLinks || {}),
      freelancerData.workImages || [] // PostgreSQL array
    ];
    
    console.log('Query values:', values);
    
    const result = await getPool().query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating freelancer:', error);
    console.error('Freelancer data that failed:', freelancerData);
    throw error;
  }
};

export const getFreelancerByWallet = async (walletAddress: string) => {
  try {
    const query = `
      SELECT f.*, u.wallet_address 
      FROM freelancer_profiles f
      JOIN users u ON f.user_id = u.id
      WHERE u.wallet_address = $1
    `;
    
    const result = await getPool().query(query, [walletAddress]);
    return result.rows[0];
  } catch (error) {
    console.error('Error getting freelancer by wallet:', error);
    throw error;
  }
};

export const updateFreelancer = async (walletAddress: string, updates: any) => {
  try {
    // First get the current freelancer data to preserve existing values
    const currentFreelancer = await getFreelancerByWallet(walletAddress);
    if (!currentFreelancer) {
      throw new Error('Freelancer not found');
    }

    // Only include fields that are being updated to avoid payload size issues
    const fieldsToUpdate = [];
    const values = [walletAddress];
    let paramIndex = 2;
    
    if (updates.name !== undefined) {
      fieldsToUpdate.push(`name = $${paramIndex}`);
      values.push(updates.name || currentFreelancer.name || 'Freelancer');
      paramIndex++;
    }
    
    if (updates.title !== undefined) {
      fieldsToUpdate.push(`title = $${paramIndex}`);
      values.push(updates.title || currentFreelancer.title || 'Professional');
      paramIndex++;
    }
    
    if (updates.bio !== undefined) {
      fieldsToUpdate.push(`bio = $${paramIndex}`);
      values.push(updates.bio || currentFreelancer.bio || '');
      paramIndex++;
    }
    
    if (updates.avatarUrl !== undefined || updates.avatar !== undefined) {
      fieldsToUpdate.push(`avatar_url = $${paramIndex}`);
      values.push(updates.avatarUrl || updates.avatar || currentFreelancer.avatar_url || '');
      paramIndex++;
    }
    
    if (updates.location !== undefined) {
      fieldsToUpdate.push(`location = $${paramIndex}`);
      values.push(updates.location || currentFreelancer.location || '');
      paramIndex++;
    }
    
    if (updates.languages !== undefined) {
      fieldsToUpdate.push(`languages = $${paramIndex}`);
      values.push(updates.languages || currentFreelancer.languages || []);
      paramIndex++;
    }
    
    if (updates.skills !== undefined) {
      fieldsToUpdate.push(`skills = $${paramIndex}`);
      values.push(updates.skills || currentFreelancer.skills || []);
      paramIndex++;
    }
    
    if (updates.busyStatus !== undefined) {
      fieldsToUpdate.push(`busy_status = $${paramIndex}`);
      values.push(updates.busyStatus || currentFreelancer.busy_status || 'available');
      paramIndex++;
    }
    
    if (updates.isOnline !== undefined) {
      fieldsToUpdate.push(`is_online = $${paramIndex}`);
      values.push(updates.isOnline);
      paramIndex++;
    }
    
    // Always add updated_at
    fieldsToUpdate.push(`updated_at = NOW()`);
    
    if (fieldsToUpdate.length === 1) { // Only updated_at
      return currentFreelancer; // No changes to make
    }

    const updateQuery = `
      UPDATE freelancer_profiles 
      SET ${fieldsToUpdate.join(', ')}
      FROM users u
      WHERE freelancer_profiles.user_id = u.id AND u.wallet_address = $1
      RETURNING freelancer_profiles.*
    `;
    
    const result = await getPool().query(updateQuery, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating freelancer:', error);
    console.error('Update data:', updates);
    throw error;
  }
};

export const getAllFreelancers = async () => {
  try {
    const query = `
      SELECT f.*, u.wallet_address 
      FROM freelancer_profiles f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `;
    
    const result = await getPool().query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting all freelancers:', error);
    throw error;
  }
};

// Service database operations
export const createService = async (serviceData: any) => {
  const query = `
    INSERT INTO services (
      freelancer_id, title, description, short_description, category, skills, images
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const values = [
    serviceData.freelancerId,
    serviceData.title,
    serviceData.description,
    serviceData.shortDescription,
    serviceData.category,
    serviceData.skills,
    serviceData.images
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getServicesByFreelancer = async (freelancerId: string) => {
  const query = 'SELECT * FROM services WHERE freelancer_id = $1 AND is_active = true';
  const result = await pool.query(query, [freelancerId]);
  return result.rows;
};

// Review database operations
export const createReview = async (reviewData: any) => {
  const query = `
    INSERT INTO reviews (
      freelancer_id, client_wallet_address, client_name, client_avatar,
      service_id, rating, comment
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const values = [
    reviewData.freelancerId,
    reviewData.clientWalletAddress,
    reviewData.clientName,
    reviewData.clientAvatar,
    reviewData.serviceId,
    reviewData.rating,
    reviewData.comment
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

export const getReviewsByFreelancer = async (freelancerId: string) => {
  const query = 'SELECT * FROM reviews WHERE freelancer_id = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [freelancerId]);
  return result.rows;
};

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
      FROM project_fundings 
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
