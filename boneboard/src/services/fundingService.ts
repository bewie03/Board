interface FundingProject {
  id: string;
  project_id: string;
  funding_goal: number;
  current_funding: number;
  funding_deadline: string;
  funding_purpose: string;
  is_active: boolean;
  is_funded: boolean;
  is_verified?: boolean;
  wallet_address: string;
  funding_wallet?: string;
  title: string;
  project_title?: string;
  description: string;
  category: string;
  logo?: string;
  website?: string;
  twitter_link?: string;
  discord_link?: string;
  progress_percentage: number;
  contributor_count: number;
  created_at: string;
  contributions?: FundingContribution[];
}

interface FundingContribution {
  id?: string;
  latest_contribution_id?: string;
  project_funding_id: string;
  contributor_wallet: string;
  display_name?: string;
  amount?: number;
  ada_amount?: number;
  total_ada_amount: number;
  ada_tx_hash?: string;
  latest_tx_hash?: string;
  message?: string;
  latest_message?: string;
  contribution_count: number;
  is_anonymous: boolean;
  created_at?: string;
  latest_contribution_date?: string;
}

interface CreateFundingData {
  project_id: string;
  funding_goal: number;
  funding_deadline: string;
  bone_posting_fee?: number;
  bone_tx_hash?: string;
  wallet_address: string;
  funding_wallet: string;
  funding_purpose: string;
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

  async getFundingByWallet(walletAddress: string): Promise<FundingProject[]> {
    try {
      const response = await fetch(`${this.baseUrl}?owner=${walletAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch funding projects by wallet');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching funding projects by wallet:', error);
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
  async validateWalletAddress(connectedAddress: string): Promise<{ isValid: boolean; paymentAddress?: string; error?: string }> {
    const { contractService } = await import('./contractService');
    
    try {
      // Get wallet API from window.cardano
      const walletApi = await this.getConnectedWalletApi();
      if (!walletApi) {
        return { isValid: false, error: 'No wallet connected' };
      }

      // Initialize Lucid with wallet
      const initialized = await contractService.initializeLucid(walletApi);
      if (!initialized) {
        return { isValid: false, error: 'Failed to initialize smart contract service' };
      }

      // Get payment address from wallet
      const result = await contractService.getWalletPaymentAddress();
      
      if (!result.success || !result.paymentAddress) {
        return { isValid: false, error: result.error || 'Failed to get payment address from wallet' };
      }

      // Validate addresses match
      const isValid = result.paymentAddress === connectedAddress;
      
      return { 
        isValid, 
        paymentAddress: result.paymentAddress,
        error: isValid ? undefined : `Connected wallet address (${connectedAddress.substring(0, 8)}...) does not match payment address (${result.paymentAddress.substring(0, 8)}...)`
      };
    } catch (error) {
      console.error('Error validating wallet address:', error);
      return { isValid: false, error: 'Failed to validate wallet address' };
    }
  }

  async sendADA(recipientAddress: string, amount: number): Promise<{ txHash: string; paymentAddress: string }> {
    const { contractService } = await import('./contractService');
    
    try {
      // Get wallet API from window.cardano
      const walletApi = await this.getConnectedWalletApi();
      if (!walletApi) {
        throw new Error('No wallet connected');
      }

      // Initialize Lucid with wallet
      const initialized = await contractService.initializeLucid(walletApi);
      if (!initialized) {
        throw new Error('Failed to initialize smart contract service');
      }

      // Create ADA contribution transaction
      const result = await contractService.contributeADA(recipientAddress, amount);
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      if (!result.paymentAddress) {
        throw new Error('Failed to get payment address from wallet');
      }

      return { 
        txHash: result.txHash!, 
        paymentAddress: result.paymentAddress 
      };
    } catch (error) {
      console.error('Error sending ADA:', error);
      throw error;
    }
  }

  private async getConnectedWalletApi(): Promise<any> {
    // Check for connected wallet in window.cardano
    const cardano = (window as any).cardano;
    if (!cardano) {
      throw new Error('No Cardano wallet detected');
    }

    // Try common wallet names
    const walletNames = ['vespr', 'lace', 'eternl', 'nami', 'flint'];
    
    for (const walletName of walletNames) {
      const wallet = cardano[walletName];
      if (wallet && await wallet.isEnabled()) {
        return await wallet.enable();
      }
    }

    throw new Error('No wallet is connected');
  }

  async contributeToProject(data: ContributeData, walletAddress: string): Promise<void> {
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
      throw new Error(error.error || 'Failed to record contribution');
    }
  }

  async sendBONE(recipientAddress: string, amount: number): Promise<{ txHash: string; paymentAddress: string }> {
    const { contractService } = await import('./contractService');
    
    try {
      // Get wallet API from window.cardano
      const walletApi = await this.getConnectedWalletApi();
      if (!walletApi) {
        throw new Error('No wallet connected');
      }

      // Initialize Lucid with wallet
      const initialized = await contractService.initializeLucid(walletApi);
      if (!initialized) {
        throw new Error('Failed to initialize smart contract service');
      }

      // Create BONE contribution transaction
      const result = await contractService.contributeBONE(recipientAddress, amount);
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      if (!result.paymentAddress) {
        throw new Error('Failed to get payment address from wallet');
      }

      return { 
        txHash: result.txHash!, 
        paymentAddress: result.paymentAddress 
      };
    } catch (error) {
      console.error('Error sending BONE:', error);
      throw error;
    }
  }

  // Utility methods
  formatADA(amount: number): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0.00';
    }
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
    } else if (diffDays <= 7) {
      return `${diffDays} days left`;
    } else if (diffDays <= 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week left' : `${weeks} weeks left`;
    } else if (diffDays <= 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month left' : `${months} months left`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year left' : `${years} years left`;
    }
  }

  calculateProgress(current: number, goal: number): number {
    if (goal <= 0) return 0;
    return Math.min((current / goal) * 100, 100);
  }

  isExpired(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }

  formatExpiredTime(deadline: string): string {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Expired today';
    } else if (diffDays === 1) {
      return 'Expired 1 day ago';
    } else if (diffDays <= 7) {
      return `Expired ${diffDays} days ago`;
    } else if (diffDays <= 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? 'Expired 1 week ago' : `Expired ${weeks} weeks ago`;
    } else if (diffDays <= 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'Expired 1 month ago' : `Expired ${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? 'Expired 1 year ago' : `Expired ${years} years ago`;
    }
  }
}

export const fundingService = new FundingService();
export type { FundingProject, FundingContribution, CreateFundingData, ContributeData };
