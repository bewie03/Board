import { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from '../../boneboard/src/lib/database';

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
  const { wallet, conversation, conversations } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  // Get conversations for a user
  if (conversations === 'true') {
    const query = `
      SELECT DISTINCT 
        c.id,
        c.participant_1_wallet,
        c.participant_2_wallet,
        c.participant_1_name,
        c.participant_1_avatar,
        c.participant_2_name,
        c.participant_2_avatar,
        c.last_message_at,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND receiver_wallet = $1 AND is_read = false) as unread_count
      FROM conversations c
      WHERE (c.participant_1_wallet = $1 OR c.participant_2_wallet = $1) 
        AND c.is_deleted = false
      ORDER BY c.last_message_at DESC
    `;
    
    const result = await getPool().query(query, [wallet]);
    return res.status(200).json(result.rows);
  }

  // Get messages for a specific conversation
  if (conversation) {
    const query = `
      SELECT m.*, 
        CASE 
          WHEN m.sender_wallet = $1 THEN 'sent'
          ELSE 'received'
        END as message_type
      FROM messages m
      WHERE m.conversation_id = $2 AND m.is_deleted = false
      ORDER BY m.created_at ASC
    `;
    
    const result = await getPool().query(query, [wallet, conversation]);
    return res.status(200).json(result.rows);
  }

  return res.status(400).json({ error: 'Either conversation ID or conversations=true is required' });
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { senderWallet, receiverWallet, content, senderName, senderAvatar, receiverName, receiverAvatar } = req.body;

  if (!senderWallet || !receiverWallet || !content) {
    return res.status(400).json({ error: 'Sender wallet, receiver wallet, and content are required' });
  }

  const client = await getPool().connect();
  
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

    // Insert message
    const messageResult = await client.query(`
      INSERT INTO messages (
        conversation_id, sender_wallet, sender_name, sender_avatar,
        receiver_wallet, content, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
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
    throw error;
  } finally {
    client.release();
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
