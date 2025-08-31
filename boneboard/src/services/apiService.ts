// API service to replace localStorage with database calls
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://bone-board.vercel.app/api' 
  : '/api';

export class ApiService {
  // Freelancer operations
  static async getFreelancers(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/freelancers`);
    if (!response.ok) throw new Error('Failed to fetch freelancers');
    return response.json();
  }

  static async getFreelancerByWallet(walletAddress: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/freelancers?walletAddress=${walletAddress}`);
    if (!response.ok) throw new Error('Failed to fetch freelancer');
    return response.json();
  }

  static async createFreelancer(freelancerData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/freelancers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(freelancerData)
    });
    if (!response.ok) throw new Error('Failed to create freelancer');
    return response.json();
  }

  static async updateFreelancer(walletAddress: string, updates: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/freelancers?walletAddress=${walletAddress}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update freelancer');
    return response.json();
  }

  // Review operations
  static async getReviews(freelancerId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/reviews?freelancerId=${freelancerId}`);
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
  }

  static async createReview(reviewData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });
    if (!response.ok) throw new Error('Failed to create review');
    return response.json();
  }

  // Job operations
  static async getJobs(params?: { wallet?: string; status?: string; category?: string; active?: boolean }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.wallet) searchParams.append('wallet', params.wallet);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.active) searchParams.append('active', 'true');

    const url = searchParams.toString() ? `${API_BASE_URL}/jobs?${searchParams.toString()}` : `${API_BASE_URL}/jobs`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch jobs');
    return response.json();
  }

  static async getJobById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/jobs?id=${id}`);
    if (!response.ok) throw new Error('Failed to fetch job');
    const jobs = await response.json();
    return jobs[0] || null;
  }

  static async createJob(jobData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData)
    });
    if (!response.ok) throw new Error('Failed to create job');
    return response.json();
  }

  static async updateJob(id: string, updates: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/jobs?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update job');
    return response.json();
  }

  static async deleteJob(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/jobs?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete job');
    return response.json();
  }

  // Project operations
  static async getProjects(params?: { wallet?: string; status?: string; category?: string }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.wallet) searchParams.append('wallet', params.wallet);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.category) searchParams.append('category', params.category);

    const url = searchParams.toString() ? `${API_BASE_URL}/projects?${searchParams.toString()}` : `${API_BASE_URL}/projects`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  }

  static async createProject(projectData: any): Promise<any> {
    // Transform frontend data structure to match API expectations
    const apiData = {
      title: projectData.name || projectData.title,
      description: projectData.description,
      category: projectData.category,
      fundingGoal: 0, // Default value
      logo: projectData.logo,
      website: projectData.website,
      fundingAddress: projectData.walletAddress, // Use wallet address as funding address
      discordLink: projectData.discordLink || projectData.discord || null,
      twitterLink: projectData.twitterLink || projectData.twitter || null,
      walletAddress: projectData.walletAddress,
      paymentAmount: projectData.paymentAmount || 0,
      paymentCurrency: projectData.paymentCurrency || 'BONE',
      txHash: projectData.txHash,
      expiresAt: projectData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    };

    console.log('Sending project data to API:', apiData);

    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Failed to create project: ${response.status} ${errorText}`);
    }
    
    return response.json();
  }

  static async voteOnProject(id: string, walletAddress: string, voteType: 'up' | 'down'): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/projects?id=${id}&action=vote`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, voteType })
    });
    if (!response.ok) throw new Error('Failed to vote on project');
    return response.json();
  }

  static async fundProject(id: string, funderWalletAddress: string, amount: number, txHash?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/projects?id=${id}&action=fund`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funderWalletAddress, amount, txHash })
    });
    if (!response.ok) throw new Error('Failed to fund project');
    return response.json();
  }

  // Saved jobs operations
  static async getSavedJobs(walletAddress: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/saved-jobs?wallet=${walletAddress}`);
    if (!response.ok) throw new Error('Failed to fetch saved jobs');
    return response.json();
  }

  static async saveJob(jobId: string, walletAddress: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/saved-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, walletAddress })
    });
    if (!response.ok) throw new Error('Failed to save job');
    return response.json();
  }

  static async unsaveJob(jobId: string, walletAddress: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/saved-jobs?jobId=${jobId}&wallet=${walletAddress}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to unsave job');
    return response.json();
  }

  // User profile operations
  static async getUserProfile(walletAddress: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user-profiles?wallet=${walletAddress}`);
    if (!response.ok) throw new Error('Failed to fetch user profile');
    return response.json();
  }

  static async createUserProfile(profileData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    if (!response.ok) throw new Error('Failed to create user profile');
    return response.json();
  }

  static async updateUserProfile(walletAddress: string, updates: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user-profiles?wallet=${walletAddress}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update user profile');
    return response.json();
  }

  // Message operations
  static async getMessages(walletAddress: string, conversationWith?: string): Promise<any[]> {
    const searchParams = new URLSearchParams({ wallet: walletAddress });
    if (conversationWith) searchParams.append('conversation', conversationWith);

    const response = await fetch(`${API_BASE_URL}/messages?${searchParams.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  }

  static async sendMessage(fromWalletAddress: string, toWalletAddress: string, content: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromWalletAddress, toWalletAddress, content })
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  }

  static async markMessageAsRead(messageId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/messages?id=${messageId}&action=mark-read`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('Failed to mark message as read');
    return response.json();
  }

  static async markConversationAsRead(walletAddress: string, conversationWith: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/messages?id=0&action=mark-conversation-read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, conversationWith })
    });
    if (!response.ok) throw new Error('Failed to mark conversation as read');
    return response.json();
  }

  // Project methods
  static async updateProject(id: string, updates: any): Promise<any> {
    // Transform frontend data structure to match API expectations
    const apiUpdates = {
      title: updates.name || updates.title,
      description: updates.description,
      category: updates.category,
      logo: updates.logo,
      website: updates.website,
      discordLink: updates.discord,
      twitterLink: updates.twitter,
      status: updates.status,
      isVerified: updates.isVerified,
      verifiedAt: updates.verifiedAt,
      verifiedBy: updates.verifiedBy
    };

    // Remove undefined values
    Object.keys(apiUpdates).forEach(key => {
      if ((apiUpdates as any)[key] === undefined) {
        delete (apiUpdates as any)[key];
      }
    });

    console.log('Sending project update to API:', apiUpdates);

    const response = await fetch(`${API_BASE_URL}/projects?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiUpdates)
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  }

  static async deleteProject(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/projects?id=${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete project');
    return response.json();
  }
}
