import { useState, useCallback, useEffect } from 'react';
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
  
  // Collect all pendingTx keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pendingTx_')) {
      keysToRemove.push(key);
    }
  }
  
  // Remove all pending transaction data
  keysToRemove.forEach(key => {
    console.log('Force removing:', key);
    localStorage.removeItem(key);
  });
  
  console.log(`Removed ${keysToRemove.length} pending transaction entries`);
};

export const useContract = (): UseContractReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const { walletAddress, isConnected } = useWallet();
  let checkInterval: NodeJS.Timeout | null = null;

  // Check for pending transactions on component mount and set up periodic checking
  useEffect(() => {
    
    const checkPendingTransactions = async () => {
      const pendingKey = `pendingTx_${walletAddress}`;
      const pendingTxData = localStorage.getItem(pendingKey);
      
      console.log('Checking for pending transactions...', { pendingKey, hasPendingData: !!pendingTxData });
      
      if (pendingTxData) {
        try {
          const pendingTx: PendingTransaction = JSON.parse(pendingTxData);
          console.log('Found pending transaction:', { txHash: pendingTx.txHash, timestamp: pendingTx.timestamp });
          
          // Check if transaction is older than 2 minutes (timeout)
          const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
          if (pendingTx.timestamp < twoMinutesAgo) {
            console.log('Transaction timeout reached, removing from localStorage');
            localStorage.removeItem(pendingKey);
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
            toast.error('Transaction confirmation timeout. Your payment may still be processing on the blockchain. Please check your wallet and try posting again if needed.');
            return;
          }

          // Initialize Lucid before checking transaction status
          try {
            const walletApi = await getWalletApi();
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
            // Save job to database
            await saveJobToDatabase(pendingTx.jobData, pendingTx.txHash);
            localStorage.removeItem(pendingKey);
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
            toast.success(`Your job posting has been confirmed! Transaction: ${pendingTx.txHash.substring(0, 8)}...`);
          } else {
            // For both 'failed' and 'pending', we continue checking until timeout
            // Only remove on timeout, not on individual failed checks
            console.log('Transaction still being processed, will check again');
          }
          // If still pending, continue checking
        } catch (error) {
          console.error('Error checking pending transaction:', error);
          // Don't remove on error - could be temporary network issue
          console.log('Will retry checking transaction status');
        }
      } else {
        console.log('No pending transactions found');
      }
    };
    
    // Initial check and setup interval
    const setupChecking = async () => {
      await checkPendingTransactions();
      
      // Set up interval to check every 10 seconds if there's still a pending transaction
      const pendingKey = `pendingTx_${walletAddress}`;
      if (localStorage.getItem(pendingKey)) {
        console.log('Setting up interval checking for pending transaction');
        checkInterval = setInterval(checkPendingTransactions, 10000); // Check every 10 seconds
      }
    };
    
    setupChecking();
    
    // Cleanup interval on unmount
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [walletAddress]);

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
            toast.success(`Payment submitted successfully! Your job will be posted once the transaction is confirmed on the blockchain. Transaction: ${result.txHash.substring(0, 8)}...`);
            return true;
          }
        } catch (error) {
          console.error('Error checking immediate transaction status:', error);
          toast.success(`Payment submitted! Your job will be posted once confirmed. Transaction: ${result.txHash.substring(0, 8)}...`);
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
