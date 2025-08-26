import { useState, useCallback } from 'react';
import { contractService, JobPostingData } from '../services/contractService';
import { useWallet } from '../contexts/WalletContext';
import { toast } from 'react-toastify';
import { JobService } from '../services/jobService';

export interface UseContractReturn {
  isLoading: boolean;
  postJob: (jobData: Omit<JobPostingData, 'walletAddress' | 'timestamp'>) => Promise<boolean>;
  getJobs: () => Promise<any[]>;
  checkTxStatus: (txHash: string) => Promise<'pending' | 'confirmed' | 'failed'>;
}

interface PendingTransaction {
  txHash: string;
  jobData: JobPostingData;
  timestamp: number;
}

// Cleanup functions for localStorage management
const cleanupOldTransactions = () => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour ago
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pendingTx_')) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.timestamp && parsed.timestamp < oneHourAgo) {
            console.log('Removing old transaction:', key);
            localStorage.removeItem(key);
            i--; // Adjust index since we removed an item
          }
        }
      } catch (error) {
        console.warn('Error parsing transaction data, removing:', key);
        localStorage.removeItem(key);
        i--; // Adjust index since we removed an item
      }
    }
  }
};

const forceCleanupLocalStorage = () => {
  console.log('Force cleaning localStorage...');
  const keysToRemove: string[] = [];
  
  // Log all localStorage keys to debug what's taking up space
  console.log('Current localStorage keys and sizes:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      const size = value ? value.length : 0;
      console.log(`${key}: ${size} characters`);
      
      // Collect pendingTx keys and other large items
      if (key.startsWith('pendingTx_') || size > 10000) {
        keysToRemove.push(key);
      }
    }
  }
  
  // Remove collected keys
  keysToRemove.forEach(key => {
    console.log('Force removing:', key);
    localStorage.removeItem(key);
  });
  
  console.log(`Removed ${keysToRemove.length} entries from localStorage`);
};

export const useContract = (): UseContractReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const { walletAddress, isConnected } = useWallet();

  // Transaction monitoring is now handled globally by transactionMonitor service
  // This useEffect is no longer needed as monitoring starts when wallet connects

  const postJob = useCallback(async (jobData: Omit<JobPostingData, 'walletAddress' | 'timestamp'>): Promise<boolean> => {
    if (!walletAddress || !isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setIsLoading(true);
    
    try {
      // Get wallet API from window.cardano
      const walletApi = await getWalletApi();
      if (!walletApi) {
        toast.error('Unable to access wallet');
        return false;
      }

      // Initialize Lucid with wallet
      const initialized = await contractService.initializeLucid(walletApi);
      if (!initialized) {
        toast.error('Failed to initialize blockchain connection');
        return false;
      }

      // Prepare job data
      const fullJobData: JobPostingData = {
        ...jobData,
        walletAddress,
        timestamp: Date.now()
      };

      // Post job based on payment method
      let result;
      if (jobData.paymentCurrency === 'BONE') {
        result = await contractService.postJobWithBONE(fullJobData);
      } else {
        result = await contractService.postJobWithADA(fullJobData);
      }

      if (result.success && result.txHash) {
        console.log('Payment successful, storing pending transaction...');
        
        // Store pending transaction in localStorage
        const pendingTx: PendingTransaction = {
          txHash: result.txHash,
          jobData: fullJobData,
          timestamp: Date.now()
        };
        
        const pendingKey = `pendingTx_${walletAddress}`;
        
        // Clean up old localStorage data before storing new transaction
        try {
          cleanupOldTransactions();
          localStorage.setItem(pendingKey, JSON.stringify(pendingTx));
        } catch (error) {
          if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, attempting cleanup and retry');
            // Force cleanup of all old transactions
            forceCleanupLocalStorage();
            try {
              localStorage.setItem(pendingKey, JSON.stringify(pendingTx));
            } catch (retryError) {
              console.error('Failed to store transaction even after cleanup:', retryError);
              toast.error('Unable to store transaction data. Please try again.');
              return false;
            }
          } else {
            throw error;
          }
        }
        
        // Try immediate confirmation check
        try {
          const txStatus = await contractService.checkTransactionStatus(result.txHash);
          
          if (txStatus === 'confirmed') {
            // Save job to database immediately if confirmed
            await saveJobToDatabase(fullJobData, result.txHash);
            localStorage.removeItem(pendingKey);
            toast.success(`Job posted successfully! Payment confirmed. Transaction: ${result.txHash.substring(0, 8)}...`);
            return true;
          } else {
            // Transaction is pending - inform user it will be processed in background
            toast.success(`Payment submitted successfully! Your job will be posted once the transaction is confirmed on the blockchain. Please avoid refreshing the page. Transaction: ${result.txHash.substring(0, 8)}...`);
            return true;
          }
        } catch (error) {
          console.error('Error checking immediate transaction status:', error);
          toast.success(`Payment submitted! Your job will be posted once confirmed. Please avoid refreshing the page. Transaction: ${result.txHash.substring(0, 8)}...`);
          return true;
        }
      } else {
        toast.error(result.error || 'Failed to post job');
        return false;
      }
    } catch (error) {
      console.error('Error posting job:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while posting the job';
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, walletAddress]);

  const getJobs = useCallback(async (): Promise<any[]> => {
    try {
      return await contractService.getJobPostings();
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
  }, []);

  const checkTxStatus = useCallback(async (txHash: string): Promise<'pending' | 'confirmed' | 'failed'> => {
    try {
      return await contractService.checkTransactionStatus(txHash);
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return 'failed';
    }
  }, []);

  const saveJobToDatabase = async (jobData: JobPostingData, txHash: string) => {
    const jobToSave = {
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      salary: jobData.salary,
      salaryType: jobData.salaryType,
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
  };

  const getWalletApi = async () => {
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
  };

  return {
    isLoading,
    postJob,
    getJobs,
    checkTxStatus
  };
};
