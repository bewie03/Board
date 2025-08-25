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
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { wallet, conversation, unread } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  let query = `
    SELECT * FROM messages 
    WHERE to_wallet_address = $1 OR from_wallet_address = $1
  `;
  const params: any[] = [wallet];

  if (conversation) {
    query += ` AND (
      (from_wallet_address = $1 AND to_wallet_address = $2) OR 
      (from_wallet_address = $2 AND to_wallet_address = $1)
    )`;
    params.push(conversation);
  }

  if (unread === 'true') {
    query += ` AND to_wallet_address = $1 AND is_read = false`;
  }

  query += ` ORDER BY created_at DESC`;

  const result = await getPool().query(query, params);
  
  const messages = result.rows.map((row: any) => ({
    id: row.id,
    fromWalletAddress: row.from_wallet_address,
    toWalletAddress: row.to_wallet_address,
    content: row.content,
    isRead: row.is_read,
    createdAt: row.created_at
  }));

  return res.status(200).json(messages);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { fromWalletAddress, toWalletAddress, content } = req.body;

  if (!fromWalletAddress || !toWalletAddress || !content) {
    return res.status(400).json({ error: 'From wallet, to wallet, and content are required' });
  }

  const query = `
    INSERT INTO messages (from_wallet_address, to_wallet_address, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const result = await getPool().query(query, [fromWalletAddress, toWalletAddress, content]);
  const message = result.rows[0];

  const transformedMessage = {
    id: message.id,
    fromWalletAddress: message.from_wallet_address,
    toWalletAddress: message.to_wallet_address,
    content: message.content,
    isRead: message.is_read,
    createdAt: message.created_at
  };

  return res.status(201).json(transformedMessage);
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  const { id, action } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  // Handle marking as read
  if (action === 'mark-read') {
    const query = 'UPDATE messages SET is_read = true WHERE id = $1 RETURNING *';
    const result = await getPool().query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Message marked as read',
      updatedMessage: result.rows[0]
    });
  }

  // Handle marking conversation as read
  if (action === 'mark-conversation-read') {
    const { walletAddress, conversationWith } = req.body;
    
    if (!walletAddress || !conversationWith) {
      return res.status(400).json({ error: 'Wallet address and conversation partner required' });
    }

    const query = `
      UPDATE messages 
      SET is_read = true 
      WHERE to_wallet_address = $1 AND from_wallet_address = $2 AND is_read = false
      RETURNING *
    `;
    
    const result = await getPool().query(query, [walletAddress, conversationWith]);
    
    return res.status(200).json({ 
      success: true, 
      message: `${result.rows.length} messages marked as read`,
      updatedCount: result.rows.length
    });
  }

  return res.status(400).json({ error: 'Invalid action' });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Message ID is required' });
  }

  const query = 'DELETE FROM messages WHERE id = $1 RETURNING id';
  const result = await getPool().query(query, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Message not found' });
  }

  return res.status(200).json({ 
    success: true, 
    message: 'Message deleted successfully' 
  });
}
