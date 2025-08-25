import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Database connection for packages functionality
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
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Handle service packages operations
async function handlePackages(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed for packages' });
  }

  const { walletAddress, servicePackages } = req.body;

  if (!walletAddress || !servicePackages || !Array.isArray(servicePackages)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Get freelancer profile by wallet address
      const freelancerResult = await client.query(
        'SELECT fp.id FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id WHERE u.wallet_address = $1',
        [walletAddress]
      );

      if (freelancerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Freelancer profile not found' });
      }

      const freelancerId = freelancerResult.rows[0].id;

      // Delete existing packages for this freelancer
      await client.query(
        'DELETE FROM service_packages WHERE freelancer_id = $1',
        [freelancerId]
      );

      // Insert new packages
      for (const pkg of servicePackages) {
        await client.query(
          `INSERT INTO service_packages (
            freelancer_id, service_title, service_description, category,
            basic_price, basic_currency, basic_delivery_days, basic_description, basic_features,
            standard_price, standard_currency, standard_delivery_days, standard_description, standard_features,
            premium_price, premium_currency, premium_delivery_days, premium_description, premium_features,
            hourly_rate, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          [
            freelancerId,
            pkg.service_title,
            pkg.service_description,
            pkg.category,
            pkg.basic_price,
            pkg.basic_currency,
            pkg.basic_delivery_days,
            pkg.basic_description,
            pkg.basic_features,
            pkg.standard_price,
            pkg.standard_currency,
            pkg.standard_delivery_days,
            pkg.standard_description,
            pkg.standard_features,
            pkg.premium_price,
            pkg.premium_currency,
            pkg.premium_delivery_days,
            pkg.premium_description,
            pkg.premium_features,
            pkg.hourly_rate,
            pkg.is_active
          ]
        );
      }

      await client.query('COMMIT');
      
      return res.status(200).json({ 
        success: true, 
        message: 'Service packages saved successfully',
        freelancerId,
        packagesCount: servicePackages.length
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Error saving service packages:', error);
    return res.status(500).json({ 
      error: 'Failed to save service packages',
      details: error.message 
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Handle packages endpoint: /api/freelancers?packages=true
    if (req.query.packages === 'true') {
      return await handlePackages(req, res);
    }

    const client = await getPool().connect();

    try {
      switch (req.method) {
        case 'GET':
          if (req.query.walletAddress) {
            // Get freelancer by wallet address with packages
            const freelancerResult = await client.query(`
              SELECT fp.*, u.wallet_address,
                     array_agg(
                       json_build_object(
                         'id', sp.id,
                         'service_title', sp.service_title,
                         'service_description', sp.service_description,
                         'category', sp.category,
                         'basic_price', sp.basic_price,
                         'basic_currency', sp.basic_currency,
                         'basic_delivery_days', sp.basic_delivery_days,
                         'basic_description', sp.basic_description,
                         'basic_features', sp.basic_features,
                         'standard_price', sp.standard_price,
                         'standard_currency', sp.standard_currency,
                         'standard_delivery_days', sp.standard_delivery_days,
                         'standard_description', sp.standard_description,
                         'standard_features', sp.standard_features,
                         'premium_price', sp.premium_price,
                         'premium_currency', sp.premium_currency,
                         'premium_delivery_days', sp.premium_delivery_days,
                         'premium_description', sp.premium_description,
                         'premium_features', sp.premium_features,
                         'hourly_rate', sp.hourly_rate,
                         'is_active', sp.is_active
                       )
                     ) FILTER (WHERE sp.id IS NOT NULL) as service_packages
              FROM freelancer_profiles fp
              JOIN users u ON fp.user_id = u.id
              LEFT JOIN service_packages sp ON fp.id = sp.freelancer_id
              WHERE u.wallet_address = $1
              GROUP BY fp.id, u.wallet_address
            `, [req.query.walletAddress]);
            
            if (freelancerResult.rows.length === 0) {
              return res.status(404).json({ error: 'Freelancer not found' });
            }
            
            return res.status(200).json(freelancerResult.rows[0]);
          } else {
            // Get all freelancers with basic package info
            const freelancersResult = await client.query(`
              SELECT fp.*, u.wallet_address,
                     MIN(sp.basic_price) as starting_price
              FROM freelancer_profiles fp
              JOIN users u ON fp.user_id = u.id
              LEFT JOIN service_packages sp ON fp.id = sp.freelancer_id
              GROUP BY fp.id, u.wallet_address
              ORDER BY fp.created_at DESC
            `);
            
            return res.status(200).json(freelancersResult.rows);
          }

        case 'POST':
          // Create new freelancer
          const freelancerData = req.body;
          
          // First, ensure user exists or create one
          const userResult = await client.query(
            `INSERT INTO users (wallet_address, profile_type) 
             VALUES ($1, 'freelancer') 
             ON CONFLICT (wallet_address) 
             DO UPDATE SET profile_type = 'freelancer'
             RETURNING id`,
            [freelancerData.walletAddress]
          );
          
          const userId = userResult.rows[0].id;
          
          const createResult = await client.query(
            `INSERT INTO freelancer_profiles (
              user_id, name, title, bio, avatar_url, category, skills, languages, 
              location, rating, review_count, completed_orders, response_time, 
              is_online, busy_status, social_links, work_images
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *`,
            [
              userId,
              freelancerData.name,
              freelancerData.title,
              freelancerData.bio,
              freelancerData.avatarUrl || null,
              freelancerData.category || 'Other',
              freelancerData.skills || [],
              freelancerData.languages || ['English'],
              freelancerData.location || '',
              0,
              0,
              0,
              '24 hours',
              false,
              'available',
              freelancerData.socialLinks || {},
              freelancerData.workImages || []
            ]
          );
          
          return res.status(201).json(createResult.rows[0]);

        case 'PUT':
          // Update freelancer
          if (!req.query.walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
          }

          const updateData = req.body;
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          // Build dynamic update query
          Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
              updateFields.push(`${key} = $${paramIndex}`);
              updateValues.push(updateData[key]);
              paramIndex++;
            }
          });

          if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
          }

          updateValues.push(req.query.walletAddress);
          
          const updateResult = await client.query(
            `UPDATE freelancer_profiles 
             SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             FROM users u
             WHERE freelancer_profiles.user_id = u.id AND u.wallet_address = $${paramIndex}
             RETURNING freelancer_profiles.*`,
            updateValues
          );

          if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Freelancer not found' });
          }

          return res.status(200).json(updateResult.rows[0]);

        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Freelancer API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
