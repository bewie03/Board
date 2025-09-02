import { contractService, JobPostingData } from './contractService';
import { JobService } from './jobService';
import { toast } from 'react-toastify';

interface PendingTransaction {
  txHash: string;
  jobData: JobPostingData;
  timestamp: number;
}

interface PendingFundingTransaction {
  txHash: string;
  fundingData: any;
  walletAddress: string;
  timestamp: number;
}

class TransactionMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private isChecking = false;

  async startMonitoring(walletAddress: string) {
    if (this.isChecking) {
      console.log('Transaction monitoring already active, skipping duplicate start');
      return;
    }
    
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
    // Find all pending job transactions in localStorage
    const pendingJobKeys = Object.keys(localStorage).filter(key => key.startsWith('pendingTx_'));
    // Find all pending funding transactions in localStorage
    const pendingFundingKeys = Object.keys(localStorage).filter(key => key.startsWith('pendingFundingTx_'));
    
    const totalPending = pendingJobKeys.length + pendingFundingKeys.length;
    if (totalPending === 0) return;
    
    console.log(`Found ${totalPending} pending transaction(s) in localStorage (${pendingJobKeys.length} jobs, ${pendingFundingKeys.length} funding)`);
    
    // Check job transactions
    for (const pendingKey of pendingJobKeys) {
      const walletAddress = pendingKey.replace('pendingTx_', '');
      await this.checkPendingTransactions(walletAddress);
    }
    
    // Check funding transactions
    for (const pendingKey of pendingFundingKeys) {
      const txHash = pendingKey.replace('pendingFundingTx_', '');
      await this.checkPendingFundingTransactions(txHash);
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
        
        // Save job to database first (with duplicate check)
        try {
          await this.saveJobToDatabase(pendingTx.jobData, pendingTx.txHash);
          
          // Only remove from localStorage and stop monitoring after successful save
          localStorage.removeItem(pendingKey);
          this.stopMonitoring();
          
          // Dispatch custom event for UI to handle success state
          window.dispatchEvent(new CustomEvent('jobPostedSuccessfully', {
            detail: { txHash: pendingTx.txHash }
          }));
          
          toast.success(`Job posted successfully! Transaction confirmed: ${pendingTx.txHash.substring(0, 8)}...`);
          return;
        } catch (error) {
          console.error('Error saving job to database:', error);
          // Don't remove from localStorage if save failed, allow retry
          toast.error('Transaction confirmed but failed to save job. Will retry...');
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
    // Check if job with this txHash already exists to prevent duplicates
    try {
      const existingJobs = await JobService.getAllJobs();
      const existingJob = existingJobs.find(job => job.txHash === txHash);
      
      if (existingJob) {
        console.log('Job with this transaction hash already exists, skipping duplicate save:', txHash);
        return;
      }
    } catch (error) {
      console.error('Error checking for existing job:', error);
      // Continue with save attempt even if check fails
    }

    const jobToSave = {
      title: jobData.title,
      company: jobData.company,
      type: jobData.type,
      category: jobData.category,
      description: jobData.description,
      salary: jobData.salary,
      salaryType: jobData.salaryType,
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
      discord: jobData.discord,
      contactEmail: jobData.contactEmail,
      howToApply: jobData.howToApply,
      duration: jobData.duration,
      featured: jobData.featured,
      selectedProjectId: jobData.selectedProjectId
    };
    
    await JobService.addJob(jobToSave);
    console.log('Job saved successfully after payment confirmation');
  }

  private async checkPendingFundingTransactions(txHash: string) {
    const pendingKey = `pendingFundingTx_${txHash}`;
    const pendingTxData = localStorage.getItem(pendingKey);
    
    if (!pendingTxData) {
      return;
    }

    try {
      const pendingTx: PendingFundingTransaction = JSON.parse(pendingTxData);
      console.log('Found pending funding transaction:', { txHash: pendingTx.txHash, timestamp: pendingTx.timestamp });
      
      // Check if transaction is older than 2 minutes (timeout)
      const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
      if (pendingTx.timestamp < twoMinutesAgo) {
        console.log('Funding transaction timeout reached, removing from localStorage');
        localStorage.removeItem(pendingKey);
        toast.error('Funding transaction confirmation timeout. Your payment may still be processing on the blockchain. Please check your wallet and try creating funding again if needed.');
        return;
      }

      // Initialize Lucid before checking transaction status
      try {
        const walletApi = await this.getWalletApi();
        if (walletApi) {
          await contractService.initializeLucid(walletApi);
        }
      } catch (error) {
        console.log('Could not initialize Lucid for funding status check, will retry later');
      }
      
      console.log('Checking funding transaction status for:', pendingTx.txHash);
      // Check transaction status
      const status = await contractService.checkTransactionStatus(pendingTx.txHash);
      console.log('Funding transaction status:', status);
      
      if (status === 'confirmed') {
        console.log('Funding transaction confirmed, creating funding project');
        
        // Create funding project in database
        try {
          const { fundingService } = await import('./fundingService');
          
          // Check if funding already exists before creating (prevent duplicates)
          const existingFundings = await fundingService.getFundingByWallet(pendingTx.walletAddress);
          const activeFunding = existingFundings.find(funding => funding.is_active);
          
          if (activeFunding) {
            console.log('Funding project already exists, removing from localStorage');
            localStorage.removeItem(pendingKey);
            toast.success('Funding project already created successfully!');
            return;
          }
          
          // Transform the funding data to match API expectations
          const createFundingData = {
            project_id: pendingTx.fundingData.project_id,
            funding_goal: pendingTx.fundingData.funding_goal,
            funding_deadline: pendingTx.fundingData.funding_deadline,
            funding_purpose: pendingTx.fundingData.funding_purpose,
            bone_posting_fee: pendingTx.fundingData.paymentAmount || 0,
            bone_tx_hash: pendingTx.txHash,
            wallet_address: pendingTx.walletAddress,
            funding_wallet: pendingTx.fundingData.funding_wallet || pendingTx.walletAddress
          };
          
          await fundingService.createFundingProject(createFundingData, pendingTx.walletAddress);
          
          // Only remove from localStorage after successful save
          localStorage.removeItem(pendingKey);
          
          // Dispatch custom event for UI to handle success state
          window.dispatchEvent(new CustomEvent('fundingCreatedSuccessfully', {
            detail: { txHash: pendingTx.txHash }
          }));
          
          toast.success(`Funding project created successfully! Transaction confirmed: ${pendingTx.txHash.substring(0, 8)}...`);
          return;
        } catch (error: any) {
          console.error('Error creating funding project:', error);
          
          // Check if it's a duplicate funding campaign error
          if (error.message && error.message.includes('already has an active funding campaign')) {
            console.log('Duplicate funding campaign detected, removing from localStorage');
            localStorage.removeItem(pendingKey);
            toast.error('This project already has an active funding campaign. Please check your funding page.');
            return;
          }
          
          // For other errors, don't spam notifications - only show once per transaction
          const errorKey = `fundingError_${pendingTx.txHash}`;
          const hasShownError = localStorage.getItem(errorKey);
          
          if (!hasShownError) {
            localStorage.setItem(errorKey, 'true');
            toast.error('Transaction confirmed but failed to create funding project. Will retry...');
          }
        }
      } else {
        // For both 'failed' and 'pending', we continue checking until timeout
        console.log('Funding transaction still being processed, will check again');
      }
    } catch (error) {
      console.error('Error checking pending funding transaction:', error);
      console.log('Will retry checking funding transaction status');
    }
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
