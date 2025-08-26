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

export const useContract = (): UseContractReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const { walletAddress, isConnected } = useWallet();

  // Check for pending transactions on component mount and set up periodic checking
  useEffect(() => {
    if (!walletAddress) return;
    
    let checkInterval: NodeJS.Timeout | null = null;
    
    const checkPendingTransactions = async () => {
      const pendingKey = `pendingTx_${walletAddress}`;
      const pendingTxData = localStorage.getItem(pendingKey);
      
      if (pendingTxData) {
        try {
          const pendingTx: PendingTransaction = JSON.parse(pendingTxData);
          
          // Check if transaction is older than 2 minutes (timeout)
          const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
          if (pendingTx.timestamp < twoMinutesAgo) {
            localStorage.removeItem(pendingKey);
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
            toast.error('Transaction confirmation timeout. Your payment may still be processing on the blockchain. Please check your wallet and try posting again if needed.');
            return;
          }
          
          // Check transaction status
          const status = await contractService.checkTransactionStatus(pendingTx.txHash);
          
          if (status === 'confirmed') {
            // Save job to database
            await saveJobToDatabase(pendingTx.jobData, pendingTx.txHash);
            localStorage.removeItem(pendingKey);
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
            toast.success(`Your job posting has been confirmed! Transaction: ${pendingTx.txHash.substring(0, 8)}...`);
          } else if (status === 'failed') {
            localStorage.removeItem(pendingKey);
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
            toast.error('Your job posting transaction failed. Please try posting again.');
          }
          // If still pending, continue checking
        } catch (error) {
          console.error('Error checking pending transaction:', error);
          localStorage.removeItem(pendingKey);
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
        }
      }
    };
    
    // Initial check
    checkPendingTransactions();
    
    // Set up interval to check every 10 seconds if there's a pending transaction
    const pendingKey = `pendingTx_${walletAddress}`;
    if (localStorage.getItem(pendingKey)) {
      checkInterval = setInterval(checkPendingTransactions, 10000); // Check every 10 seconds
    }
    
    // Cleanup interval on unmount
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [walletAddress]);

  const postJob = useCallback(async (jobData: Omit<JobPostingData, 'walletAddress' | 'timestamp'>): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
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
        localStorage.setItem(pendingKey, JSON.stringify(pendingTx));
        
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
      customSalaryType: jobData.customSalaryType,
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
