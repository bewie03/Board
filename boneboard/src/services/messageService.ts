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
  freelancerWallet: string;
  responseTimes: number[]; // in minutes
  averageResponseTime: number;
  lastUpdated: Date;
}

class MessageServiceClass {
  private conversations: Conversation[] = [];
  private responseTimeData: ResponseTimeData[] = [];

  // Get or create conversation between two users
  async getOrCreateConversation(user1Wallet: string, user2Wallet: string): Promise<Conversation> {
    const existingConversation = this.conversations.find(conv => 
      !conv.isDeleted &&
      conv.participants.some(p => p.walletAddress === user1Wallet) && 
      conv.participants.some(p => p.walletAddress === user2Wallet)
    );

    if (existingConversation) {
      return existingConversation;
    }

    // Get user profiles
    const FreelancerService = await import('./freelancerService').then(m => m.default);
    const user1Profile = await FreelancerService.getFreelancerByWallet(user1Wallet);
    const user2Profile = await FreelancerService.getFreelancerByWallet(user2Wallet);

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
    this.saveToStorage();
    return newConversation;
  }

  // Send a message
  async sendMessage(
    senderWallet: string, 
    receiverWallet: string, 
    content: string, 
    attachments?: File[]
  ): Promise<Message> {
    const conversation = await this.getOrCreateConversation(senderWallet, receiverWallet);
    const sender = conversation.participants.find(p => p.walletAddress === senderWallet);
    
    // Process attachments
    let messageAttachments: MessageAttachment[] = [];
    if (attachments && attachments.length > 0) {
      messageAttachments = await this.processAttachments(attachments);
    }
    
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: conversation.id,
      senderId: senderWallet,
      senderName: sender?.name || 'Unknown User',
      senderAvatar: sender?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      senderWalletAddress: senderWallet,
      receiverId: receiverWallet,
      content,
      attachments: messageAttachments,
      timestamp: new Date(),
      isRead: false,
      isEdited: false,
      isDeleted: false
    };

    conversation.messages.push(message);
    conversation.lastActivity = new Date();

    // Track response time if this is a response from a freelancer
    this.trackResponseTime(senderWallet, receiverWallet, conversation);

    // Save to localStorage
    this.saveToStorage();

    return message;
  }

  // Process file attachments
  private async processAttachments(files: File[]): Promise<MessageAttachment[]> {
    const attachments: MessageAttachment[] = [];
    
    for (const file of files) {
      try {
        const dataUrl = await this.fileToDataUrl(file);
        const attachment: MessageAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url: dataUrl,
          size: file.size
        };
        attachments.push(attachment);
      } catch (error) {
        console.error('Error processing attachment:', error);
      }
    }
    
    return attachments;
  }

  // Convert file to data URL
  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Track response time for freelancers
  private trackResponseTime(senderId: string, receiverId: string, conversation: Conversation) {
    // Find the last message from the receiver (client)
    const messages = conversation.messages.filter(m => !m.isDeleted);
    const currentMessageIndex = messages.length - 1;
    
    // Look for the most recent message from the receiver before this one
    for (let i = currentMessageIndex - 1; i >= 0; i--) {
      if (messages[i].senderId === receiverId) {
        const clientMessage = messages[i];
        const freelancerResponse = messages[currentMessageIndex];
        
        // Calculate response time in minutes
        const responseTimeMs = freelancerResponse.timestamp.getTime() - clientMessage.timestamp.getTime();
        const responseTimeMinutes = Math.round(responseTimeMs / (1000 * 60));
        
        // Only track positive response times (avoid clock issues)
        if (responseTimeMinutes > 0) {
          this.addResponseTime(senderId, responseTimeMinutes);
        }
        break;
      }
    }
  }

  // Add response time data for a freelancer
  private addResponseTime(freelancerWallet: string, responseTimeMinutes: number) {
    let responseData = this.responseTimeData.find(data => data.freelancerWallet === freelancerWallet);
    
    if (!responseData) {
      responseData = {
        freelancerWallet,
        responseTimes: [],
        averageResponseTime: 0,
        lastUpdated: new Date()
      };
      this.responseTimeData.push(responseData);
    }

    // Add new response time (keep last 50 responses for rolling average)
    responseData.responseTimes.push(responseTimeMinutes);
    if (responseData.responseTimes.length > 50) {
      responseData.responseTimes.shift();
    }

    // Calculate new average
    const sum = responseData.responseTimes.reduce((acc, time) => acc + time, 0);
    responseData.averageResponseTime = Math.round(sum / responseData.responseTimes.length);
    responseData.lastUpdated = new Date();

    this.saveToStorage();
  }

  // Get average response time for a freelancer
  getAverageResponseTime(freelancerWallet: string): string {
    const responseData = this.responseTimeData.find(data => data.freelancerWallet === freelancerWallet);
    
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

  // Get notification count (new orders, reviews, etc.)
  getNotificationCount(_freelancerWallet: string): number {
    // This would integrate with order system, review system, etc.
    // For now, return 0 since no notification system is implemented yet
    return 0;
  }

  // Save data to localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem('boneboard_conversations', JSON.stringify(this.conversations));
      localStorage.setItem('boneboard_response_times', JSON.stringify(this.responseTimeData));
    } catch (error) {
      console.error('Failed to save message data to localStorage:', error);
    }
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
