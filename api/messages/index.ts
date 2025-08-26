import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Database connection for messages functionality
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
    console.error('Messages API Error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      method: req.method,
      url: req.url,
      query: req.query,
      body: req.body
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      method: req.method,
      endpoint: req.url
    });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { wallet, conversation, conversations } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Get conversations for user
  if (conversations === 'true') {
    try {
      const query = `
        SELECT c.*, 
               CASE 
                 WHEN c.participant_1_wallet = $1 THEN c.participant_2_name
                 ELSE c.participant_1_name
               END as other_participant_name,
               CASE 
                 WHEN c.participant_1_wallet = $1 THEN c.participant_2_avatar
                 ELSE c.participant_1_avatar
               END as other_participant_avatar,
               CASE 
                 WHEN c.participant_1_wallet = $1 THEN c.participant_2_wallet
                 ELSE c.participant_1_wallet
               END as other_participant_wallet
        FROM conversations c
        WHERE c.participant_1_wallet = $1 OR c.participant_2_wallet = $1
        ORDER BY c.last_message_at DESC
      `;
      
      console.log('Executing conversations query for wallet:', wallet);
      const result = await getPool().query(query, [wallet]);
      console.log('Conversations query result:', result.rows.length, 'rows');
      return res.status(200).json(result.rows);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch conversations',
        details: error.message,
        wallet: wallet
      });
    }
  }

  // Get messages for specific conversation
  if (conversation) {
    const query = `
      SELECT m.*, 
             CASE 
               WHEN m.sender_wallet = $1 THEN true
               ELSE false
             END as is_own_message
      FROM messages m
      WHERE m.conversation_id = $2
      ORDER BY m.created_at ASC
    `;
    
    const result = await getPool().query(query, [wallet, conversation]);
    return res.status(200).json(result.rows);
  }

  return res.status(400).json({ error: 'Either conversation ID or conversations=true is required' });
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('POST /api/messages - Request body:', req.body);
    
    const { senderWallet, receiverWallet, content, senderName, senderAvatar, receiverName, receiverAvatar } = req.body;

    if (!senderWallet || !receiverWallet || !content) {
      return res.status(400).json({ error: 'Sender wallet, receiver wallet, and content are required' });
    }

    console.log('Attempting to connect to database...');
    const client = await getPool().connect();
    console.log('Database connection successful');
    
    try {
      await client.query('BEGIN');

    // Get or create conversation
    let conversationResult = await client.query(`
      SELECT id FROM conversations 
      WHERE (participant_1_wallet = $1 AND participant_2_wallet = $2) 
         OR (participant_1_wallet = $2 AND participant_2_wallet = $1)
    `, [senderWallet, receiverWallet]);

    let conversationId;
    
    if (conversationResult.rows.length === 0) {
      // Create new conversation
      const newConvResult = await client.query(`
        INSERT INTO conversations (
          participant_1_wallet, participant_2_wallet, 
          participant_1_name, participant_1_avatar,
          participant_2_name, participant_2_avatar,
          last_message_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `, [senderWallet, receiverWallet, senderName, senderAvatar, receiverName, receiverAvatar]);
      
      conversationId = newConvResult.rows[0].id;
    } else {
      conversationId = conversationResult.rows[0].id;
      
      // Update last message time
      await client.query(`
        UPDATE conversations 
        SET last_message_at = NOW() 
        WHERE id = $1
      `, [conversationId]);
    }

    // Insert message (matching your actual database schema)
    const messageResult = await client.query(`
      INSERT INTO messages (
        conversation_id, sender_wallet, sender_name, sender_avatar,
        receiver_wallet, content
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [conversationId, senderWallet, senderName, senderAvatar, receiverWallet, content]);

    await client.query('COMMIT');
    
    return res.status(201).json({
      success: true,
      message: messageResult.rows[0],
      conversationId
    });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database error in handlePost:', error);
      return res.status(500).json({ 
        error: 'Failed to send message', 
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Connection error in handlePost:', error);
    return res.status(500).json({ 
      error: 'Database connection failed', 
      details: error.message 
    });
  }
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
