import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { 
  getFreelancerByWallet, 
  getAllFreelancers, 
  createFreelancer, 
  updateFreelancer,
  getUserByWallet,
  createUser
} from '../../boneboard/src/lib/database';

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

  const { walletAddress, packages } = req.body;

  if (!walletAddress || !packages || !Array.isArray(packages)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // First, get or create freelancer profile
      let freelancerId;
      const freelancerResult = await client.query(
        `SELECT f.id FROM freelancer_profiles f
         JOIN users u ON f.user_id = u.id
         WHERE u.wallet_address = $1`,
        [walletAddress]
      );

      if (freelancerResult.rows.length > 0) {
        freelancerId = freelancerResult.rows[0].id;
      } else {
        // First get or create user
        let userId;
        const userResult = await client.query(
          'SELECT id FROM users WHERE wallet_address = $1',
          [walletAddress]
        );
        
        if (userResult.rows.length > 0) {
          userId = userResult.rows[0].id;
        } else {
          const createUserResult = await client.query(
            'INSERT INTO users (wallet_address) VALUES ($1) RETURNING id',
            [walletAddress]
          );
          userId = createUserResult.rows[0].id;
        }
        
        // Create basic freelancer profile if it doesn't exist
        const createResult = await client.query(
          `INSERT INTO freelancer_profiles (user_id, name, title, bio, category, skills, languages, rating, review_count, completed_orders, response_time, is_online, busy_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id`,
          [
            userId,
            'Freelancer',
            'Professional Service Provider',
            'Experienced freelancer ready to help with your projects.',
            'Other',
            ['General'],
            ['English'],
            5.0,
            0,
            0,
            '1 hour',
            true,
            'available'
          ]
        );
        freelancerId = createResult.rows[0].id;
      }

      // Delete existing packages for this freelancer
      await client.query(
        'DELETE FROM service_packages WHERE freelancer_id = $1',
        [freelancerId]
      );

      // Insert new packages using actual deployed schema
      for (const pkg of packages) {
        // Insert basic package
        await client.query(
          `INSERT INTO service_packages (
            freelancer_id, title, description, features, price, currency, delivery_time, package_type, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            freelancerId,
            pkg.service_title || pkg.title || 'Service Package',
            pkg.basic_description || pkg.service_description || 'Basic package',
            pkg.basic_features || ['Basic service delivery'],
            pkg.basic_price || 100,
            pkg.basic_currency || 'ADA',
            pkg.basic_delivery_days ? `${pkg.basic_delivery_days} days` : '7 days',
            'basic',
            pkg.is_active !== false
          ]
        );

        // Insert standard package
        await client.query(
          `INSERT INTO service_packages (
            freelancer_id, title, description, features, price, currency, delivery_time, package_type, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            freelancerId,
            pkg.service_title || pkg.title || 'Service Package',
            pkg.standard_description || `Enhanced ${pkg.service_title || 'Service'}`,
            pkg.standard_features || [...(pkg.basic_features || ['Basic service delivery']), 'Priority support'],
            pkg.standard_price || Math.ceil((pkg.basic_price || 100) * 1.5),
            pkg.standard_currency || 'ADA',
            pkg.standard_delivery_days ? `${pkg.standard_delivery_days} days` : '5 days',
            'standard',
            pkg.is_active !== false
          ]
        );

        // Insert premium package
        await client.query(
          `INSERT INTO service_packages (
            freelancer_id, title, description, features, price, currency, delivery_time, package_type, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            freelancerId,
            pkg.service_title || pkg.title || 'Service Package',
            pkg.premium_description || `Premium ${pkg.service_title || 'Service'}`,
            pkg.premium_features || [...(pkg.basic_features || ['Basic service delivery']), 'Priority support', 'Unlimited revisions'],
            pkg.premium_price || (pkg.basic_price || 100) * 2,
            pkg.premium_currency || 'ADA',
            pkg.premium_delivery_days ? `${pkg.premium_delivery_days} days` : '3 days',
            'premium',
            pkg.is_active !== false
          ]
        );
      }

      await client.query('COMMIT');
      
      // Fetch and return the saved packages
      const savedPackagesResult = await client.query(
        `SELECT * FROM service_packages WHERE freelancer_id = $1 ORDER BY package_type, created_at`,
        [freelancerId]
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Service packages saved successfully',
        freelancerId,
        packagesCount: packages.length * 3, // 3 tiers per package
        packages: savedPackagesResult.rows
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

    switch (req.method) {
      case 'GET':
        if (req.query.walletAddress) {
          // Get freelancer by wallet address
          const freelancer = await getFreelancerByWallet(req.query.walletAddress as string);
          return res.status(200).json(freelancer);
        } else {
          // Get all freelancers
          const freelancers = await getAllFreelancers();
          return res.status(200).json(freelancers);
        }

      case 'POST':
        // Create new freelancer
        const freelancerData = req.body;
        
        // First, create or get user
        let user = await getUserByWallet(freelancerData.walletAddress);
        if (!user) {
          user = await createUser(freelancerData.walletAddress);
        }
        
        // Transform frontend data to match database schema
        const dbFreelancerData = {
          userId: user.id,
          name: freelancerData.name,
          title: freelancerData.title,
          bio: freelancerData.bio,
          avatarUrl: null, // No avatar in creation form
          category: freelancerData.category || 'Other',
          skills: freelancerData.skills || [],
          languages: freelancerData.languages || ['English'],
          location: freelancerData.location || '',
          rating: 0,
          reviewCount: 0,
          completedOrders: 0,
          responseTime: '24 hours',
          isOnline: false,
          busyStatus: 'available',
          socialLinks: {},
          workImages: freelancerData.workExamples || []
        };
        
        const newFreelancer = await createFreelancer(dbFreelancerData);
        return res.status(201).json(newFreelancer);

      case 'PUT':
        // Update freelancers
        if (!req.query.walletAddress) {
          return res.status(400).json({ error: 'Wallet address required' });
        }
        const updatedFreelancer = await updateFreelancer(
          req.query.walletAddress as string,
          req.body
        );
        return res.status(200).json(updatedFreelancer);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Freelancer API Error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
