export interface MessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  url: string;
  size: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderWalletAddress: string;
  receiverId: string;
  content: string;
  attachments?: MessageAttachment[];
  timestamp: Date;
  isRead: boolean;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface ConversationParticipant {
  walletAddress: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  messages: Message[];
  lastActivity: Date;
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: Date;
}

export interface ResponseTimeData {
  userWallet: string;
  responseTimes: number[]; // in minutes
  averageResponseTime: number;
  lastUpdated: Date;
}

class MessageServiceClass {
  private conversations: Conversation[] = [];
  private responseTimeData: ResponseTimeData[] = [];

  // Get or create conversation between two users - now uses database
  async getOrCreateConversation(user1Wallet: string, user2Wallet: string): Promise<Conversation> {
    try {
      // Check if user has agreed to messaging terms
      const hasAgreed = localStorage.getItem('messaging_agreement_accepted');
      if (!hasAgreed) {
        throw new Error('MESSAGING_AGREEMENT_REQUIRED');
      }

      // Try to get conversation from API first
      const response = await fetch(`/api/messages?wallet=${user1Wallet}&conversations=true`);
      if (response.ok) {
        const conversations = await response.json();
        const existingConv = conversations.find((conv: any) => 
          (conv.participant_1_wallet === user1Wallet && conv.participant_2_wallet === user2Wallet) ||
          (conv.participant_1_wallet === user2Wallet && conv.participant_2_wallet === user1Wallet)
        );
        
        if (existingConv) {
          return this.transformDbConversation(existingConv);
        }
      }
    } catch (error) {
      if ((error as Error).message === 'MESSAGING_AGREEMENT_REQUIRED') {
        throw error;
      }
      console.error('Error fetching conversations from API:', error);
    }
    const existingConversation = this.conversations.find(conv => 
      !conv.isDeleted &&
      conv.participants.some(p => p.walletAddress === user1Wallet) && 
      conv.participants.some(p => p.walletAddress === user2Wallet)
    );

    if (existingConversation) {
      return existingConversation;
    }

    // Get user profiles - simplified
    const user1Profile = { name: 'User 1', avatar: '', isOnline: false };
    const user2Profile = { name: 'User 2', avatar: '', isOnline: false };

    const newConversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participants: [
        {
          walletAddress: user1Wallet,
          name: user1Profile?.name || 'Unknown User',
          avatar: user1Profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
          isOnline: user1Profile?.isOnline || false
        },
        {
          walletAddress: user2Wallet,
          name: user2Profile?.name || 'Unknown User',
          avatar: user2Profile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
          isOnline: user2Profile?.isOnline || false
        }
      ],
      messages: [],
      lastActivity: new Date(),
      isDeleted: false
    };

    this.conversations.push(newConversation);
    await this.saveToDatabase();
    return newConversation;
  }

  // Send a message - now uses database API
  async sendMessage(
    senderWallet: string, 
    receiverWallet: string, 
    content: string, 
    _attachments?: File[]
  ): Promise<Message> {
    try {
      // Get user profiles for sender/receiver info - simplified
      const senderProfile = { name: 'Sender', avatar: '', isOnline: false };
      const receiverProfile = { name: 'Receiver', avatar: '', isOnline: false };

      // Send message via API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderWallet,
          receiverWallet,
          content,
          senderName: senderProfile?.name || 'Unknown User',
          senderAvatar: senderProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
          receiverName: receiverProfile?.name || 'Unknown User',
          receiverAvatar: receiverProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      
      // Transform to frontend format
      const message: Message = {
        id: result.message.id,
        conversationId: result.conversationId,
        senderId: senderWallet,
        senderName: senderProfile?.name || 'Unknown User',
        senderAvatar: senderProfile?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
        senderWalletAddress: senderWallet,
        receiverId: receiverWallet,
        content,
        attachments: [], // Attachments disabled
        timestamp: new Date(result.message.created_at),
        isRead: false,
        isEdited: false,
        isDeleted: false
      };

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }




  // Get average response time for a user
  getAverageResponseTime(userWallet: string): string {
    const responseData = this.responseTimeData.find(data => data.userWallet === userWallet);
    
    if (!responseData || responseData.responseTimes.length === 0) {
      return "No data yet";
    }

    const avgMinutes = responseData.averageResponseTime;
    
    if (avgMinutes < 60) {
      return `${avgMinutes} min`;
    } else if (avgMinutes < 1440) { // Less than 24 hours
      const hours = Math.round(avgMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.round(avgMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }

  // Edit a message
  editMessage(messageId: string, newContent: string, userWallet: string): boolean {
    const conversation = this.conversations.find(conv => 
      conv.messages.some(msg => msg.id === messageId)
    );
    
    if (!conversation) return false;
    
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (!message || message.senderId !== userWallet || message.isDeleted) return false;
    
    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();
    
    this.saveToStorage();
    return true;
  }

  // Delete a message
  deleteMessage(messageId: string, userWallet: string): boolean {
    const conversation = this.conversations.find(conv => 
      conv.messages.some(msg => msg.id === messageId)
    );
    
    if (!conversation) return false;
    
    const message = conversation.messages.find(msg => msg.id === messageId);
    if (!message || message.senderId !== userWallet) return false;
    
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    
    this.saveToStorage();
    return true;
  }

  // Delete a conversation
  deleteConversation(conversationId: string, userWallet: string): boolean {
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (!conversation) return false;
    
    // Check if user is participant
    const isParticipant = conversation.participants.some(p => p.walletAddress === userWallet);
    if (!isParticipant) return false;
    
    conversation.isDeleted = true;
    conversation.deletedBy = userWallet;
    conversation.deletedAt = new Date();
    
    this.saveToStorage();
    return true;
  }

  // Get conversations for a user
  getUserConversations(userWallet: string): Conversation[] {
    return this.conversations
      .filter(conv => 
        !conv.isDeleted &&
        conv.participants.some(p => p.walletAddress === userWallet)
      )
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  // Get conversation by ID
  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.find(conv => conv.id === conversationId && !conv.isDeleted);
  }

  // Format timestamp based on user's timezone
  formatMessageTime(timestamp: Date, userTimezone?: string): string {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const options: Intl.DateTimeFormatOptions = {
      timeZone: userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return messageDate.toLocaleTimeString([], { 
        ...options,
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString([], { 
        ...options,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return messageDate.toLocaleDateString([], { 
        ...options,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  // Get unread message count for a user
  getUnreadMessageCount(userWallet: string): number {
    return this.conversations
      .filter(conv => 
        !conv.isDeleted &&
        conv.participants.some(p => p.walletAddress === userWallet)
      )
      .reduce((count, conv) => {
        return count + conv.messages.filter(msg => 
          msg.receiverId === userWallet && !msg.isRead && !msg.isDeleted
        ).length;
      }, 0);
  }

  // Mark messages as read
  markMessagesAsRead(conversationId: string, userWallet: string): void {
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (!conversation) return;

    conversation.messages
      .filter(msg => msg.receiverId === userWallet && !msg.isRead && !msg.isDeleted)
      .forEach(msg => msg.isRead = true);

    this.saveToStorage();
  }

  // Transform database conversation to frontend format
  private transformDbConversation(dbConv: any): Conversation {
    return {
      id: dbConv.id,
      participants: [
        {
          walletAddress: dbConv.participant_1_wallet,
          name: dbConv.participant_1_name || 'Unknown User',
          avatar: dbConv.participant_1_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
          isOnline: false
        },
        {
          walletAddress: dbConv.participant_2_wallet,
          name: dbConv.participant_2_name || 'Unknown User', 
          avatar: dbConv.participant_2_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
          isOnline: false
        }
      ],
      messages: [],
      lastActivity: new Date(dbConv.last_message_at),
      isDeleted: false
    };
  }

  // Get notification count
  getNotificationCount(_walletAddress: string): number {
    // This would integrate with order system, etc.
    // For now, return 0 since no notification system is implemented yet
    return 0;
  }

  // Save data to database instead of localStorage
  private async saveToDatabase(): Promise<void> {
    // Database operations are now handled by the API endpoints
    // This method is kept for compatibility but does nothing
    return Promise.resolve();
  }

  // Keep saveToStorage for backward compatibility
  private saveToStorage(): void {
    // No longer saves to localStorage to avoid quota issues
    // All data is now stored in database via API calls
  }

  // Load data from localStorage
  private loadFromStorage(): void {
    try {
      const conversationsData = localStorage.getItem('boneboard_conversations');
      if (conversationsData) {
        this.conversations = JSON.parse(conversationsData).map((conv: any) => ({
          ...conv,
          lastActivity: new Date(conv.lastActivity),
          deletedAt: conv.deletedAt ? new Date(conv.deletedAt) : undefined,
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            editedAt: msg.editedAt ? new Date(msg.editedAt) : undefined,
            deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : undefined
          }))
        }));
      }

      const responseTimeData = localStorage.getItem('boneboard_response_times');
      if (responseTimeData) {
        this.responseTimeData = JSON.parse(responseTimeData).map((data: any) => ({
          ...data,
          lastUpdated: new Date(data.lastUpdated)
        }));
      }
    } catch (error) {
      console.error('Failed to load message data from localStorage:', error);
    }
  }

  constructor() {
    this.loadFromStorage();
  }
}

export const MessageService = new MessageServiceClass();
