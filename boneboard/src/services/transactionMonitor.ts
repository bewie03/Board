import { contractService, JobPostingData } from './contractService';
import { JobService } from './jobService';
import { toast } from 'react-toastify';

interface PendingTransaction {
  txHash: string;
  jobData: JobPostingData;
  timestamp: number;
}

class TransactionMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  async startMonitoring(walletAddress: string) {
    if (this.isChecking) return;
    
    console.log('Starting transaction monitoring for wallet:', walletAddress);
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
    console.log('Stopping transaction monitoring');
    this.isChecking = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkAllPendingTransactions() {
    // Find all pending transactions in localStorage
    const pendingKeys = Object.keys(localStorage).filter(key => key.startsWith('pendingTx_'));
    
    if (pendingKeys.length === 0) return;
    
    console.log(`Found ${pendingKeys.length} pending transaction(s) in localStorage`);
    
    for (const pendingKey of pendingKeys) {
      const walletAddress = pendingKey.replace('pendingTx_', '');
      await this.checkPendingTransactions(walletAddress);
    }
  }

  private async checkPendingTransactions(walletAddress: string) {
    const pendingKey = `pendingTx_${walletAddress}`;
    const pendingTxData = localStorage.getItem(pendingKey);
    
    if (!pendingTxData) {
      // No pending transactions for this wallet, but check if there are others
      const allPendingKeys = Object.keys(localStorage).filter(key => key.startsWith('pendingTx_'));
      if (allPendingKeys.length === 0) {
        // No pending transactions at all, stop monitoring
        this.stopMonitoring();
      }
      return;
    }

    try {
      const pendingTx: PendingTransaction = JSON.parse(pendingTxData);
      console.log('Found pending transaction:', { txHash: pendingTx.txHash, timestamp: pendingTx.timestamp });
      
      // Check if transaction is older than 2 minutes (timeout)
      const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
      if (pendingTx.timestamp < twoMinutesAgo) {
        console.log('Transaction timeout reached, removing from localStorage');
        localStorage.removeItem(pendingKey);
        this.stopMonitoring();
        toast.error('Transaction confirmation timeout. Your payment may still be processing on the blockchain. Please check your wallet and try posting again if needed.');
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
      
      console.log('Checking transaction status for:', pendingTx.txHash);
      // Check transaction status
      const status = await contractService.checkTransactionStatus(pendingTx.txHash);
      console.log('Transaction status:', status);
      
      if (status === 'confirmed') {
        console.log('Transaction confirmed, saving job to database');
        // Remove from localStorage first to prevent duplicate processing
        localStorage.removeItem(pendingKey);
        this.stopMonitoring();
        
        // Save job to database
        try {
          await this.saveJobToDatabase(pendingTx.jobData, pendingTx.txHash);
          
          // Dispatch custom event for UI to handle success state
          window.dispatchEvent(new CustomEvent('jobPostedSuccessfully', {
            detail: { txHash: pendingTx.txHash }
          }));
          
          toast.success(`Job posted successfully! Transaction confirmed: ${pendingTx.txHash.substring(0, 8)}...`);
          return;
        } catch (error) {
          console.error('Error saving job to database:', error);
          toast.error('Transaction confirmed but failed to save job. Please contact support.');
        }
      } else {
        // For both 'failed' and 'pending', we continue checking until timeout
        console.log('Transaction still being processed, will check again');
      }
    } catch (error) {
      console.error('Error checking pending transaction:', error);
      console.log('Will retry checking transaction status');
    }
  }

  private async saveJobToDatabase(jobData: JobPostingData, txHash: string) {
    const jobToSave = {
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      salary: jobData.salary,
      salaryType: jobData.salaryType as 'ADA' | 'FIAT' | 'Custom',
      category: jobData.category,
      type: jobData.type,
      contactEmail: jobData.contactEmail,
      howToApply: jobData.howToApply,
      duration: jobData.duration,
      paymentAmount: jobData.paymentAmount,
      paymentCurrency: jobData.paymentCurrency,
      walletAddress: jobData.walletAddress,
      timestamp: jobData.timestamp,
      txHash: txHash,
      status: 'confirmed' as const,
      workArrangement: jobData.workArrangement,
      requiredSkills: jobData.requiredSkills,
      additionalInfo: jobData.additionalInfo,
      companyWebsite: jobData.companyWebsite,
      companyLogo: jobData.companyLogo,
      website: jobData.website,
      twitter: jobData.twitter,
      discord: jobData.discord
    };
    
    await JobService.addJob(jobToSave);
    console.log('Job saved successfully after payment confirmation');
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

export const transactionMonitor = new TransactionMonitor();
