interface FundingProject {
  id: string;
  project_id: string;
  funding_goal: number;
  current_funding: number;
  funding_deadline: string;
  is_active: boolean;
  is_funded: boolean;
  wallet_address: string;
  title: string;
  description: string;
  category: string;
  logo_url?: string;
  website?: string;
  twitter_link?: string;
  discord_link?: string;
  progress_percentage: number;
  contributor_count: number;
  created_at: string;
}

interface FundingContribution {
  id: string;
  project_funding_id: string;
  contributor_wallet: string;
  ada_amount: number;
  ada_tx_hash: string;
  message?: string;
  is_anonymous: boolean;
  display_name: string;
  created_at: string;
}

interface CreateFundingData {
  project_id: string;
  funding_goal: number;
  funding_deadline: string;
  bone_posting_fee?: number;
  bone_tx_hash?: string;
  wallet_address: string;
}

interface ContributeData {
  project_funding_id: string;
  ada_amount: number;
  ada_tx_hash: string;
  message?: string;
  is_anonymous?: boolean;
}

class FundingService {
  private baseUrl = '/api/funding';

  async getAllFundingProjects(): Promise<FundingProject[]> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch funding projects');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching funding projects:', error);
      throw error;
    }
  }

  async getFundingProject(id: string): Promise<FundingProject & { contributions: FundingContribution[] }> {
    try {
      const response = await fetch(`${this.baseUrl}?action=single&id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch funding project');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching funding project:', error);
      throw error;
    }
  }

  async createFundingProject(data: CreateFundingData, walletAddress: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create funding project');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating funding project:', error);
      throw error;
    }
  }

  async contributeTo(data: ContributeData, walletAddress: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?action=contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to contribute to project');
      }

      return await response.json();
    } catch (error) {
      console.error('Error contributing to project:', error);
      throw error;
    }
  }

  async updateFundingProject(id: string, data: Partial<FundingProject>, walletAddress: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update funding project');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating funding project:', error);
      throw error;
    }
  }

  // Wallet integration methods
  async sendADA(recipientAddress: string, amount: number): Promise<string> {
    try {
      // For now, return a mock transaction hash
      // In a real implementation, you would integrate with the wallet API
      const mockTxHash = 'tx_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`Mock ADA transaction: ${amount} ADA to ${recipientAddress}, hash: ${mockTxHash}`);
      return mockTxHash;
    } catch (error) {
      console.error('Error sending ADA:', error);
      throw new Error('Failed to send ADA transaction');
    }
  }

  async sendBONE(recipientAddress: string, amount: number): Promise<string> {
    try {
      // This would integrate with your BONE token smart contract
      // For now, returning a placeholder - you'll need to implement the actual BONE token transfer
      console.log('BONE transfer not yet implemented:', { recipientAddress, amount });
      throw new Error('BONE token transfers not yet implemented');
    } catch (error) {
      console.error('Error sending BONE:', error);
      throw error;
    }
  }

  // Utility methods
  formatADA(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  }

  formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Expires today';
    } else if (diffDays === 1) {
      return '1 day left';
    } else {
      return `${diffDays} days left`;
    }
  }

  calculateProgress(current: number, goal: number): number {
    if (goal <= 0) return 0;
    return Math.min((current / goal) * 100, 100);
  }

  isExpired(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }
}

export const fundingService = new FundingService();
export type { FundingProject, FundingContribution, CreateFundingData, ContributeData };
