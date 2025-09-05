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
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    console.error('Projects API Error:', error);
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
  const { id, wallet, status, category, active } = req.query;

  let query = `
    SELECT p.*, 
           COALESCE(pf_sum.total_funding, 0) as current_funding,
           COALESCE(pf_sum.backer_count, 0) as backers
    FROM projects p
    LEFT JOIN (
      SELECT project_id, SUM(current_funding) as total_funding, COUNT(*) as backer_count
      FROM project_funding 
      GROUP BY project_id
    ) pf_sum ON p.id = pf_sum.project_id
  `;

  const params: any[] = [];
  const conditions: string[] = [];

  if (id) {
    conditions.push('p.id = $' + (params.length + 1));
    params.push(id);
  }

  if (wallet) {
    conditions.push('p.wallet_address = $' + (params.length + 1));
    params.push(wallet);
  }

  if (status) {
    conditions.push('p.status = $' + (params.length + 1));
    params.push(status);
  }

  if (category) {
    conditions.push('p.category = $' + (params.length + 1));
    params.push(category);
  }

  if (active === 'true') {
    conditions.push('p.status IN (\'active\', \'funded\')');
    conditions.push('p.status != \'paused\''); // Exclude paused items from public listings
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY p.created_at DESC';

  const result = await getPool().query(query, params);
  
  // Transform database result to match frontend interface
  const projects = result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    name: row.title, // Add name field mapping to title for PostJob compatibility
    description: row.description,
    category: row.category,
    fundingGoal: parseFloat(row.funding_goal) || 0,
    currentFunding: parseFloat(row.current_funding) || 0,
    backers: parseInt(row.backers) || 0,
    status: row.status,
    createdAt: row.created_at,
    upvotes: 0, // Not implemented yet
    downvotes: 0, // Not implemented yet
    userVote: null,
    logo: row.logo,
    logo_url: row.logo_url,
    website: row.website,
    fundingAddress: row.funding_address,
    discordLink: row.discord_link,
    twitterLink: row.twitter_link,
    twitterUsername: row.twitter_username,
    discordInvite: row.discord_invite,
    walletAddress: row.wallet_address,
    paymentAmount: parseFloat(row.payment_amount) || 0,
    paymentCurrency: row.payment_currency,
    txHash: row.tx_hash,
    expiresAt: row.expires_at,
    isVerified: row.is_verified || row.status === 'verified',
    is_verified: row.is_verified || row.status === 'verified',
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by
  }));

  return res.status(200).json(projects);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  console.log('Received project creation request:', req.body);

  const {
    title,
    description,
    category,
    fundingGoal = 0,
    logo,
    website,
    fundingAddress,
    discordLink,
    twitterLink,
    walletAddress,
    paymentAmount = 0,
    paymentCurrency = 'BONE',
    txHash,
    expiresAt
  } = req.body;

  // Validate required fields
  if (!title || !description || !category || !walletAddress) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['title', 'description', 'category', 'walletAddress'],
      received: { title: !!title, description: !!description, category: !!category, walletAddress: !!walletAddress }
    });
  }

  // First, get or create the user to get the user_id
  const userQuery = `
    INSERT INTO users (wallet_address, profile_type, is_active)
    VALUES ($1, 'user', true)
    ON CONFLICT (wallet_address) DO UPDATE SET updated_at = NOW()
    RETURNING id
  `;
  const userResult = await getPool().query(userQuery, [walletAddress]);
  const userId = userResult.rows[0].id;

  const query = `
    INSERT INTO projects (
      user_id, title, description, category, funding_goal, logo, website, funding_address,
      discord_link, twitter_link, wallet_address, payment_amount,
      payment_currency, tx_hash, expires_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) RETURNING *
  `;

  const params = [
    userId,
    title, 
    description, 
    category, 
    fundingGoal || 0, 
    logo || null, 
    website || null,
    fundingAddress || walletAddress,
    discordLink || null, 
    twitterLink || null, 
    walletAddress, 
    paymentAmount || 0,
    paymentCurrency || 'BONE', 
    txHash || null, 
    null
  ];

  console.log('Executing query with params:', params);

  const result = await getPool().query(query, params);
  const project = result.rows[0];

  // Transform to frontend format
  const transformedProject = {
    id: project.id,
    title: project.title,
    description: project.description,
    category: project.category,
    fundingGoal: project.funding_goal,
    currentFunding: 0,
    backers: 0,
    status: project.status,
    createdAt: project.created_at.toISOString().split('T')[0],
    upvotes: 0,
    downvotes: 0,
    userVote: null,
    logo: project.logo,
    fundingAddress: project.funding_address,
    discordLink: project.discord_link,
    twitterLink: project.twitter_link,
    walletAddress: project.wallet_address,
    paymentAmount: project.payment_amount,
    paymentCurrency: project.payment_currency,
    txHash: project.tx_hash,
    expiresAt: project.expires_at
  };

  return res.status(201).json(transformedProject);
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  // Handle voting
  if (action === 'vote') {
    const { walletAddress, voteType } = req.body;
    
    if (!walletAddress || !voteType || !['up', 'down'].includes(voteType)) {
      return res.status(400).json({ error: 'Valid wallet address and vote type required' });
    }

    // Check if user already voted
    const existingVote = await getPool().query(
      'SELECT * FROM project_votes WHERE project_id = $1 AND wallet_address = $2',
      [id, walletAddress]
    );

    if (existingVote.rows.length > 0) {
      // Update existing vote
      await getPool().query(
        'UPDATE project_votes SET vote_type = $1 WHERE project_id = $2 AND wallet_address = $3',
        [voteType, id, walletAddress]
      );
    } else {
      // Insert new vote
      await getPool().query(
        'INSERT INTO project_votes (project_id, wallet_address, vote_type) VALUES ($1, $2, $3)',
        [id, walletAddress, voteType]
      );
    }

    return res.status(200).json({ success: true, message: 'Vote recorded' });
  }

  // Handle funding
  if (action === 'fund') {
    const { funderWalletAddress, amount, txHash } = req.body;
    
    if (!funderWalletAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid funder wallet and amount required' });
    }

    // Record the funding
    await getPool().query(
      'INSERT INTO project_funding (project_id, wallet_address, current_funding, tx_hash) VALUES ($1, $2, $3, $4)',
      [id, funderWalletAddress, amount, txHash]
    );

    // Update project funding totals
    const fundingResult = await getPool().query(
      'SELECT SUM(current_funding) as total_funding, COUNT(*) as backer_count FROM project_funding WHERE project_id = $1',
      [id]
    );

    const totalFunding = parseInt(fundingResult.rows[0].total_funding) || 0;
    const backerCount = parseInt(fundingResult.rows[0].backer_count) || 0;

    // Check if project is now fully funded
    const projectResult = await getPool().query('SELECT funding_goal FROM projects WHERE id = $1', [id]);
    const fundingGoal = projectResult.rows[0]?.funding_goal || 0;
    
    const newStatus = totalFunding >= fundingGoal ? 'funded' : 'active';

    await getPool().query(
      'UPDATE projects SET status = $1 WHERE id = $2',
      [newStatus, id]
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Funding recorded',
      totalFunding,
      backerCount,
      status: newStatus
    });
  }

  // Handle regular updates
  const updates = req.body;
  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  const fieldMapping: { [key: string]: string } = {
    title: 'title',
    description: 'description',
    category: 'category',
    status: 'status',
    logo: 'logo',
    website: 'website',
    fundingAddress: 'funding_address',
    discordLink: 'discord_link',
    twitterLink: 'twitter_link',
    twitterUsername: 'twitter_username',
    discordInvite: 'discord_invite'
  };

  Object.entries(updates).forEach(([key, value]) => {
    const dbField = fieldMapping[key];
    if (dbField) {
      updateFields.push(`${dbField} = $${paramIndex}`);
      // Handle Twitter object - extract username for twitter_username field
      if (key === 'twitterUsername') {
        // If it's a Twitter object from OAuth, extract the username
        if (typeof value === 'object' && value && 'username' in value) {
          params.push(value.username);
        } else {
          params.push(value);
        }
      } else {
        params.push(value);
      }
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  params.push(id);
  const query = `
    UPDATE projects 
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await getPool().query(query, params);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // If logo was updated, also update all jobs associated with this project
  if (updates.logo) {
    try {
      await getPool().query(
        'UPDATE job_listings SET company_logo_url = $1 WHERE project_id = $2',
        [updates.logo, id]
      );
      console.log(`Updated logo for all jobs associated with project ${id}`);
    } catch (error) {
      console.error('Error updating job logos:', error);
      // Don't fail the project update if job logo update fails
    }
  }

  return res.status(200).json({ success: true, project: result.rows[0] });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const query = 'DELETE FROM projects WHERE id = $1 RETURNING id';
  const result = await getPool().query(query, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }

  return res.status(200).json({ success: true, message: 'Project deleted successfully' });
}
