import { contractService, ProjectPostingData } from './contractService';
import { ProjectService } from './projectService';
import { toast } from 'react-toastify';

interface PendingProjectTransaction {
  txHash: string;
  projectData: ProjectPostingData;
  formData: any;
  logoFile: File | null;
  timestamp: number;
}

class ProjectTransactionMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  async startMonitoring(walletAddress: string) {
    if (this.isChecking) return;
    
    console.log('Starting project transaction monitoring for wallet:', walletAddress);
    this.isChecking = true;
    
    // Initial check for current wallet
    await this.checkPendingTransactions(walletAddress);
    
    // Also check for any other pending transactions in localStorage
    await this.checkAllPendingTransactions();
    
    // Set up interval checking every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkPendingTransactions(walletAddress);
      this.checkAllPendingTransactions();
    }, 10000);
  }

  stopMonitoring() {
    console.log('Stopping project transaction monitoring');
    this.isChecking = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkAllPendingTransactions() {
    // Find all pending project transactions in localStorage
    const pendingKeys = Object.keys(localStorage).filter(key => key.startsWith('pendingProjectTx_'));
    
    if (pendingKeys.length === 0) return;
    
    console.log(`Found ${pendingKeys.length} pending project transaction(s) in localStorage`);
    
    for (const pendingKey of pendingKeys) {
      const walletAddress = pendingKey.replace('pendingProjectTx_', '');
      await this.checkPendingTransactions(walletAddress);
    }
  }

  private async checkPendingTransactions(walletAddress: string) {
    const pendingKey = `pendingProjectTx_${walletAddress}`;
    const pendingTxData = localStorage.getItem(pendingKey);
    
    if (!pendingTxData) {
      // No pending transactions for this wallet, but check if there are others
      const allPendingKeys = Object.keys(localStorage).filter(key => key.startsWith('pendingProjectTx_'));
      if (allPendingKeys.length === 0) {
        // No pending transactions at all, stop monitoring
        this.stopMonitoring();
      }
      return;
    }

    try {
      const pendingTx: PendingProjectTransaction = JSON.parse(pendingTxData);
      console.log('Found pending project transaction:', { txHash: pendingTx.txHash, timestamp: pendingTx.timestamp });
      
      // Check if transaction is older than 2 minutes (timeout)
      const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
      if (pendingTx.timestamp < twoMinutesAgo) {
        console.log('Project transaction timeout reached, removing from localStorage');
        localStorage.removeItem(pendingKey);
        this.stopMonitoring();
        toast.error('Transaction confirmation timeout. Your payment may still be processing on the blockchain. Please check your wallet and try creating the project again if needed.');
        return;
      }

      // Initialize Lucid before checking transaction status
      try {
        const walletApi = await this.getWalletApi();
        if (walletApi) {
          await contractService.initializeLucid(walletApi);
        }
      } catch (error) {
        console.log('Could not initialize Lucid for status check, will retry later');
      }
      
      console.log('Checking project transaction status for:', pendingTx.txHash);
      // Check transaction status
      const status = await contractService.checkTransactionStatus(pendingTx.txHash);
      console.log('Project transaction status:', status);
      
      if (status === 'confirmed') {
        console.log('Project transaction confirmed, saving project to database');
        // Remove from localStorage first to prevent duplicate processing
        localStorage.removeItem(pendingKey);
        this.stopMonitoring();
        
        // Save project to database
        try {
          await this.saveProjectToDatabase(pendingTx.projectData, pendingTx.formData, pendingTx.logoFile, pendingTx.txHash);
          
          // Dispatch custom event for UI to handle success state
          window.dispatchEvent(new CustomEvent('projectCreatedSuccessfully', {
            detail: { txHash: pendingTx.txHash }
          }));
          
          toast.success(`Project created successfully! Transaction confirmed: ${pendingTx.txHash.substring(0, 8)}...`);
          return;
        } catch (error) {
          console.error('Error saving project to database:', error);
          toast.error('Transaction confirmed but failed to save project. Please contact support.');
        }
      } else {
        // For both 'failed' and 'pending', we continue checking until timeout
        console.log('Project transaction still being processed, will check again');
      }
    } catch (error) {
      console.error('Error checking pending project transaction:', error);
      console.log('Will retry checking project transaction status');
    }
  }

  private async saveProjectToDatabase(projectData: ProjectPostingData, formData: any, logoFile: File | null, txHash: string) {
    // Convert logo file to base64 data URL for metadata
    let logoDataUrl = null;
    if (logoFile) {
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(logoFile);
      });
    }

    const projectForStorage = {
      title: formData.name,
      name: formData.name,
      description: formData.description,
      website: formData.website || '',
      category: formData.category,
      logo: logoDataUrl,
      twitter: formData.twitter.verified ? {
        username: formData.twitter.username,
        verified: formData.twitter.verified,
        id: formData.twitter.id
      } : undefined,
      discord: formData.discord.verified ? {
        serverName: formData.discord.serverName,
        verified: formData.discord.verified,
        inviteUrl: formData.discord.inviteUrl
      } : undefined,
      paymentAmount: projectData.paymentAmount,
      paymentCurrency: projectData.paymentCurrency,
      walletAddress: projectData.walletAddress,
      txHash,
      status: 'confirmed' as const,
      createdAt: new Date().toISOString()
    };
    
    await ProjectService.addProject(projectForStorage);
    console.log('Project saved successfully after payment confirmation');
  }

  private async getWalletApi() {
    try {
      const cardano = (window as any).cardano;
      if (!cardano) return null;

      // Try to get the connected wallet from localStorage
      const connectedWallet = localStorage.getItem('connectedWallet');
      if (!connectedWallet || !cardano[connectedWallet]) return null;

      const walletInfo = cardano[connectedWallet];
      const isEnabled = await walletInfo.isEnabled();
      
      if (!isEnabled) {
        await walletInfo.enable();
      }

      return await walletInfo.enable();
    } catch (error) {
      console.error('Error getting wallet API:', error);
      return null;
    }
  }
}

export const projectTransactionMonitor = new ProjectTransactionMonitor();
