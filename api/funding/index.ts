import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const { action, id, owner } = req.query;
    console.log('Funding API GET request:', { action, id, owner });

    if (action === 'total-raised') {
      // Get total funds raised across all projects
      const totalQuery = `
        SELECT COALESCE(SUM(current_funding), 0) as total_raised
        FROM project_funding 
        WHERE is_active = true
      `;
      
      const result = await pool.query(totalQuery);
      const totalRaised = parseFloat(result.rows[0].total_raised) || 0;
      
      return res.status(200).json({ totalRaised: Math.round(totalRaised) });
    }

    if (action === 'single' && id) {
      // Get single funding project with contributions
      const fundingQuery = `
        SELECT 
          pf.*,
          p.title,
          p.description,
          p.category,
          p.logo,
          p.website,
          p.twitter_link,
          p.discord_link,
          p.discord_invite,
          p.is_verified,
          p.user_id as project_owner_id,
          u.wallet_address as owner_wallet,
          COALESCE(
            (SELECT SUM(fc.ada_amount) 
             FROM funding_contributions fc 
             WHERE fc.project_funding_id = pf.id), 
            0
          ) as current_funding,
          COUNT(DISTINCT fc_count.contributor_wallet) as contributor_count
        FROM project_funding pf
        LEFT JOIN projects p ON pf.project_id = p.id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN funding_contributions fc_count ON fc_count.project_funding_id = pf.id
        WHERE pf.id = $1
        GROUP BY pf.id, p.id, u.id
      `;
      
      const contributionsQuery = `
        SELECT 
          fc.contributor_wallet,
          fc.project_funding_id,
          fc.is_anonymous,
          u.username,
          CASE 
            WHEN fc.is_anonymous = true THEN 'Anonymous'
            WHEN u.username IS NOT NULL AND u.username != '' THEN u.username
            ELSE SUBSTRING(fc.contributor_wallet, 1, 8) || '...' || SUBSTRING(fc.contributor_wallet, -6)
          END as display_name,
          SUM(fc.ada_amount)::DECIMAL(15,6) as total_ada_amount,
          COUNT(*)::INTEGER as contribution_count,
          MAX(fc.created_at) as latest_contribution_date,
          (
            SELECT message 
            FROM funding_contributions fc2 
            WHERE fc2.contributor_wallet = fc.contributor_wallet 
              AND fc2.project_funding_id = fc.project_funding_id
              AND fc2.message IS NOT NULL 
              AND fc2.message != ''
            ORDER BY fc2.created_at DESC 
            LIMIT 1
          ) as latest_message,
          (
            SELECT ada_tx_hash 
            FROM funding_contributions fc3 
            WHERE fc3.contributor_wallet = fc.contributor_wallet 
              AND fc3.project_funding_id = fc.project_funding_id
            ORDER BY fc3.created_at DESC 
            LIMIT 1
          ) as latest_tx_hash,
          (
            SELECT id 
            FROM funding_contributions fc4 
            WHERE fc4.contributor_wallet = fc.contributor_wallet 
              AND fc4.project_funding_id = fc.project_funding_id
            ORDER BY fc4.created_at DESC 
            LIMIT 1
          ) as latest_contribution_id
        FROM funding_contributions fc
        LEFT JOIN users u ON fc.contributor_wallet = u.wallet_address
        WHERE fc.project_funding_id = $1
        GROUP BY fc.contributor_wallet, fc.project_funding_id, fc.is_anonymous, u.username
        ORDER BY MAX(fc.created_at) DESC
      `;

      const [fundingResult, contributionsResult] = await Promise.all([
        pool.query(fundingQuery, [id]),
        pool.query(contributionsQuery, [id])
      ]);

      if (fundingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Funding project not found' });
      }

      const project = fundingResult.rows[0];
      const contributions = contributionsResult.rows;


      // Add temporary debug logging
      console.log('DEBUG - Raw contributions from DB:', JSON.stringify(contributions, null, 2));
      
      // Process contributions to ensure numeric values
      const processedContributions = contributions.map(contrib => ({
        ...contrib,
        total_ada_amount: parseFloat(contrib.total_ada_amount) || 0,
        contribution_count: parseInt(contrib.contribution_count) || 0,
        ada_amount: contrib.ada_amount ? parseFloat(contrib.ada_amount) : undefined
      }));
      
      console.log('DEBUG - Processed contributions:', JSON.stringify(processedContributions, null, 2));

      const processedProject = {
        ...project,
        contributions: processedContributions,
        progress_percentage: project.funding_goal > 0 
          ? Math.min((parseFloat(project.current_funding) / parseFloat(project.funding_goal)) * 100, 100)
          : 0,
        contributor_count: parseInt(project.contributor_count) || 0,
        current_funding: parseFloat(project.current_funding) || 0,
        funding_goal: parseFloat(project.funding_goal) || 0
      };

      
      return res.status(200).json(processedProject);
    }

    // Get funding projects - filter by owner if specified
    let query = `
      SELECT 
        pf.*,
        p.title,
        p.title as project_title,
        p.description,
        p.category,
        p.logo,
        p.website,
        p.twitter_link,
        p.discord_link,
        p.discord_invite,
        p.is_verified,
        CASE 
          WHEN pf.funding_goal > 0 THEN 
            LEAST(COALESCE((pf.current_funding / pf.funding_goal) * 100, 0), 100)
          ELSE 0 
        END as progress_percentage,
        (
          SELECT COUNT(DISTINCT fc.contributor_wallet) 
          FROM funding_contributions fc 
          WHERE fc.project_funding_id = pf.id
        ) as contributor_count
      FROM project_funding pf
      LEFT JOIN projects p ON pf.project_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
    `;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (owner) {
      conditions.push('pf.wallet_address = $' + (queryParams.length + 1));
      queryParams.push(owner);
    } else {
      // For main funding page, only show active projects
      conditions.push('pf.is_active = true');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pf.created_at DESC';

    const result = await pool.query(query, queryParams);
    
    // Convert progress_percentage to number to ensure .toFixed() works on frontend
    const processedRows = result.rows.map(row => ({
      ...row,
      progress_percentage: parseFloat(row.progress_percentage) || 0,
      contributor_count: parseInt(row.contributor_count) || 0,
      current_funding: parseFloat(row.current_funding) || 0,
      funding_goal: parseFloat(row.funding_goal) || 0
    }));
    
    console.log('Processed rows:', processedRows.length);
    return res.status(200).json(processedRows);

  } catch (error) {
    console.error('Error fetching funding projects:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const { action } = req.query;
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    if (action === 'create') {
      // Create new funding project
      const { 
        project_id, 
        funding_goal, 
        funding_deadline, 
        bone_posting_fee = 0, 
        bone_tx_hash = 'placeholder',
        wallet_address,
        funding_wallet,
        funding_purpose
      } = req.body;

      if (!project_id || !funding_goal || !funding_deadline || !funding_wallet) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Convert funding_deadline from "YYYY-MM" format to proper timestamp
      // Set deadline to the last day of the selected month at 23:59:59
      let formattedDeadline;
      try {
        if (funding_deadline.match(/^\d{4}-\d{2}$/)) {
          // Input is in "YYYY-MM" format, convert to end of month
          const [year, month] = funding_deadline.split('-');
          const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
          formattedDeadline = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')} 23:59:59`;
        } else {
          // Assume it's already a proper timestamp
          formattedDeadline = funding_deadline;
        }
      } catch (error) {
        console.error('Error formatting deadline:', error);
        return res.status(400).json({ error: 'Invalid funding deadline format' });
      }

      // Verify project ownership - check both user_id match and direct wallet_address match
      console.log('DEBUG: Checking project ownership for project_id:', project_id, 'wallet:', walletAddress);
      console.log('DEBUG: Received funding_wallet:', funding_wallet);
      
      const projectCheck = await pool.query(
        'SELECT user_id, wallet_address FROM projects WHERE id = $1',
        [project_id]
      );

      if (projectCheck.rows.length === 0) {
        console.log('DEBUG: Project not found:', project_id);
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectCheck.rows[0];
      console.log('DEBUG: Project found, user_id:', project.user_id, 'wallet_address:', project.wallet_address);

      // Check if the wallet address matches directly (for legacy projects)
      if (project.wallet_address === walletAddress) {
        console.log('DEBUG: Authorization successful via direct wallet match');
      } else {
        // Check via users table for newer projects
        const userCheck = await pool.query(
          'SELECT id FROM users WHERE wallet_address = $1',
          [walletAddress]
        );

        console.log('DEBUG: User lookup result:', userCheck.rows);

        if (userCheck.rows.length === 0) {
          console.log('DEBUG: No user found with wallet address:', walletAddress);
          return res.status(403).json({ error: 'Not authorized to create funding for this project' });
        }

        if (userCheck.rows[0].id !== project.user_id) {
          console.log('DEBUG: User ID mismatch. User ID:', userCheck.rows[0].id, 'Project user_id:', project.user_id);
          return res.status(403).json({ error: 'Not authorized to create funding for this project' });
        }

        console.log('DEBUG: Authorization successful via user table match');
      }

      // Check if project already has active funding (enforce one funding per project)
      const existingFunding = await pool.query(
        'SELECT id FROM project_funding WHERE project_id = $1 AND is_active = true',
        [project_id]
      );

      if (existingFunding.rows.length > 0) {
        return res.status(400).json({ error: 'This project already has an active funding campaign. Only one funding campaign per project is allowed.' });
      }

      const insertQuery = `
        INSERT INTO project_funding (
          project_id, funding_goal, funding_deadline, bone_posting_fee, 
          bone_tx_hash, wallet_address, funding_wallet, funding_purpose, is_active, is_funded
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        project_id,
        funding_goal,
        formattedDeadline,
        bone_posting_fee,
        bone_tx_hash,
        wallet_address,
        funding_wallet,
        funding_purpose
      ]);

      return res.status(201).json(result.rows[0]);

    } else if (action === 'contribute') {
      // Add contribution to funding project
      const {
        project_funding_id,
        ada_amount,
        ada_tx_hash,
        message,
        is_anonymous = false
      } = req.body;

      if (!project_funding_id || !ada_amount || !ada_tx_hash) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify funding project exists and is active
      const fundingCheck = await pool.query(
        'SELECT * FROM project_funding WHERE id = $1 AND is_active = true',
        [project_funding_id]
      );

      if (fundingCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Funding project not found or inactive' });
      }

      const funding = fundingCheck.rows[0];

      // Check if deadline has passed
      if (new Date() > new Date(funding.funding_deadline)) {
        return res.status(400).json({ error: 'Funding deadline has passed' });
      }

      // Check if already fully funded
      if (funding.is_funded) {
        return res.status(400).json({ error: 'Project is already fully funded' });
      }

      // Check for duplicate transaction hash
      const duplicateCheck = await pool.query(
        'SELECT id FROM funding_contributions WHERE ada_tx_hash = $1',
        [ada_tx_hash]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Transaction already processed' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert contribution
        const contributionQuery = `
          INSERT INTO funding_contributions (
            project_funding_id, contributor_wallet, ada_amount, 
            ada_tx_hash, message, is_anonymous
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const contributionResult = await client.query(contributionQuery, [
          project_funding_id,
          walletAddress,
          ada_amount,
          ada_tx_hash,
          message,
          is_anonymous
        ]);

        // Update current funding amount
        const updateFundingQuery = `
          UPDATE project_funding 
          SET 
            current_funding = current_funding + $1,
            is_funded = CASE 
              WHEN (current_funding + $1) >= funding_goal THEN true 
              ELSE false 
            END,
            updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `;

        const updatedFunding = await client.query(updateFundingQuery, [
          ada_amount,
          project_funding_id
        ]);

        await client.query('COMMIT');

        return res.status(201).json({
          contribution: contributionResult.rows[0],
          funding: updatedFunding.rows[0]
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Error in funding POST:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress || !id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const { is_active, funding_goal, funding_deadline, funding_purpose } = req.body;

    // Convert funding_deadline from "YYYY-MM" format to proper timestamp if provided
    let formattedDeadline = funding_deadline;
    if (funding_deadline) {
      try {
        if (funding_deadline.match(/^\d{4}-\d{2}$/)) {
          // Input is in "YYYY-MM" format, convert to end of month
          const [year, month] = funding_deadline.split('-');
          const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
          formattedDeadline = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')} 23:59:59`;
        }
      } catch (error) {
        console.error('Error formatting deadline in PUT:', error);
        return res.status(400).json({ error: 'Invalid funding deadline format' });
      }
    }

    // Verify ownership - use pf.wallet_address for funding project ownership
    const ownershipCheck = await pool.query(`
      SELECT pf.* 
      FROM project_funding pf
      WHERE pf.id = $1
    `, [id]);

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Funding project not found' });
    }

    if (ownershipCheck.rows[0].wallet_address !== walletAddress) {
      return res.status(403).json({ error: 'Not authorized to modify this funding project' });
    }

    const updateQuery = `
      UPDATE project_funding 
      SET 
        is_active = COALESCE($1, is_active),
        funding_goal = COALESCE($2, funding_goal),
        funding_deadline = COALESCE($3, funding_deadline),
        funding_purpose = COALESCE($4, funding_purpose),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      is_active,
      funding_goal,
      formattedDeadline,
      funding_purpose,
      id
    ]);

    return res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error('Error updating funding project:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress || !id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify ownership - use pf.wallet_address for funding project ownership
    const ownershipCheck = await pool.query(`
      SELECT pf.* 
      FROM project_funding pf
      WHERE pf.id = $1
    `, [id]);

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Funding project not found' });
    }

    if (ownershipCheck.rows[0].wallet_address !== walletAddress) {
      return res.status(403).json({ error: 'Not authorized to delete this funding project' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete contributions first (foreign key constraint)
      await client.query('DELETE FROM funding_contributions WHERE project_funding_id = $1', [id]);
      
      // Delete funding project
      const result = await client.query('DELETE FROM project_funding WHERE id = $1 RETURNING *', [id]);

      await client.query('COMMIT');

      return res.status(200).json({ message: 'Funding project deleted successfully', deleted: result.rows[0] });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error deleting funding project:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
