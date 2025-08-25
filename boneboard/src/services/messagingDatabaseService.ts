// Messaging service with PostgreSQL backend
import { db } from './database';
import { userService } from './userService';

export interface Conversation {
  id: string;
  participant1: string;
  participant2: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export class MessagingDatabaseService {
  // Create or get conversation between two users
  async createOrGetConversation(walletAddress1: string, walletAddress2: string): Promise<Conversation> {
    try {
      // Ensure both users exist
      const user1 = await userService.createOrGetUser(walletAddress1);
      const user2 = await userService.createOrGetUser(walletAddress2);

      // Try to find existing conversation (check both directions)
      let query = `
        SELECT * FROM conversations 
        WHERE (participant_1 = $1 AND participant_2 = $2) 
           OR (participant_1 = $2 AND participant_2 = $1)
      `;
      let result = await db.query(query, [user1.id, user2.id]);

      if (result.rows.length > 0) {
        return this.mapConversationFromDb(result.rows[0]);
      }

      // Create new conversation
      query = `
        INSERT INTO conversations (participant_1, participant_2)
        VALUES ($1, $2)
        RETURNING *
      `;
      result = await db.query(query, [user1.id, user2.id]);
      return this.mapConversationFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating/getting conversation:', error);
      throw error;
    }
  }

  // Get conversations for a user
  async getConversationsForUser(walletAddress: string): Promise<Conversation[]> {
    try {
      const user = await userService.getUserByWallet(walletAddress);
      if (!user) return [];

      const query = `
        SELECT c.*, 
               u1.wallet_address as participant_1_wallet,
               u2.wallet_address as participant_2_wallet
        FROM conversations c
        JOIN users u1 ON c.participant_1 = u1.id
        JOIN users u2 ON c.participant_2 = u2.id
        WHERE c.participant_1 = $1 OR c.participant_2 = $1
        ORDER BY c.last_message_at DESC
      `;
      const result = await db.query(query, [user.id]);
      return result.rows.map((row: Record<string, any>) => this.mapConversationFromDb(row));
    } catch (error) {
      console.error('Error getting conversations for user:', error);
      return [];
    }
  }

  // Send message
  async sendMessage(conversationId: string, senderWalletAddress: string, content: string, messageType: 'text' | 'image' | 'file' | 'system' = 'text', fileUrl?: string): Promise<Message> {
    try {
      const sender = await userService.getUserByWallet(senderWalletAddress);
      if (!sender) throw new Error('Sender not found');

      return await db.transaction(async (client) => {
        // Insert message
        const messageQuery = `
          INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const messageResult = await client.query(messageQuery, [conversationId, sender.id, content, messageType, fileUrl]);

        // Update conversation last_message_at
        const updateConversationQuery = `
          UPDATE conversations 
          SET last_message_at = NOW()
          WHERE id = $1
        `;
        await client.query(updateConversationQuery, [conversationId]);

        return this.mapMessageFromDb(messageResult.rows[0]);
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Get messages for conversation
  async getMessagesForConversation(conversationId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    try {
      const query = `
        SELECT m.*, u.wallet_address as sender_wallet
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await db.query(query, [conversationId, limit, offset]);
      return result.rows.map((row: Record<string, any>) => this.mapMessageFromDb(row)).reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error getting messages for conversation:', error);
      return [];
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, readerWalletAddress: string): Promise<void> {
    try {
      const reader = await userService.getUserByWallet(readerWalletAddress);
      if (!reader) return;

      const query = `
        UPDATE messages 
        SET is_read = true
        WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
      `;
      await db.query(query, [conversationId, reader.id]);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  // Get unread message count for user
  async getUnreadMessageCount(walletAddress: string): Promise<number> {
    try {
      const user = await userService.getUserByWallet(walletAddress);
      if (!user) return 0;

      const query = `
        SELECT COUNT(*) as count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE (c.participant_1 = $1 OR c.participant_2 = $1)
          AND m.sender_id != $1
          AND m.is_read = false
      `;
      const result = await db.query(query, [user.id]);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting unread message count:', error);
      return 0;
    }
  }

  // Migration method to move data from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    try {
      console.log('Starting messages migration from localStorage...');
      
      // Get data from localStorage
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const messages = JSON.parse(localStorage.getItem('messages') || '[]');
      
      // Migrate conversations
      for (const conversation of conversations) {
        try {
          if (conversation.participant1 && conversation.participant2) {
            await this.createOrGetConversation(conversation.participant1, conversation.participant2);
            console.log(`Migrated conversation between ${conversation.participant1} and ${conversation.participant2}`);
          }
        } catch (error) {
          console.error(`Error migrating conversation:`, error);
        }
      }

      // Migrate messages
      for (const message of messages) {
        try {
          if (message.conversationId && message.sender && message.content) {
            // Find the conversation in the database
            const conv = await this.createOrGetConversation(message.participant1 || message.sender, message.participant2 || message.recipient);
            await this.sendMessage(conv.id, message.sender, message.content, message.type || 'text', message.fileUrl);
            console.log(`Migrated message from ${message.sender}`);
          }
        } catch (error) {
          console.error(`Error migrating message:`, error);
        }
      }

      console.log('Messages migration completed');
    } catch (error) {
      console.error('Error during messages migration:', error);
    }
  }

  private mapConversationFromDb(row: Record<string, any>): Conversation {
    return {
      id: row.id,
      participant1: row.participant_1,
      participant2: row.participant_2,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at
    };
  }

  private mapMessageFromDb(row: Record<string, any>): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      content: row.content,
      messageType: row.message_type,
      fileUrl: row.file_url,
      isRead: row.is_read,
      createdAt: row.created_at
    };
  }
}

export const messagingDatabaseService = new MessagingDatabaseService();
