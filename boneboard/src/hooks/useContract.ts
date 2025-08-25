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

export const useContract = (): UseContractReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const { walletAddress, isConnected } = useWallet();

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
        console.log('Payment successful, verifying transaction...');
        
        // Wait for transaction confirmation before saving to database
        try {
          const txStatus = await contractService.checkTransactionStatus(result.txHash);
          
          if (txStatus === 'confirmed') {
            // Save job to database only after payment confirmation
            try {
              const jobToSave = {
                title: fullJobData.title,
                company: fullJobData.company,
                description: fullJobData.description,
                salary: fullJobData.salary,
                salaryType: fullJobData.salaryType,
                category: fullJobData.category,
                type: fullJobData.type,
                contactEmail: fullJobData.contactEmail,
                howToApply: fullJobData.howToApply,
                duration: fullJobData.duration,
                paymentAmount: fullJobData.paymentAmount,
                paymentCurrency: fullJobData.paymentCurrency,
                walletAddress: fullJobData.walletAddress,
                timestamp: fullJobData.timestamp,
                txHash: result.txHash,
                status: 'confirmed' as const,
                workArrangement: fullJobData.workArrangement,
                requiredSkills: fullJobData.requiredSkills,
                additionalInfo: fullJobData.additionalInfo,
                companyWebsite: fullJobData.companyWebsite,
                companyLogo: fullJobData.companyLogo,
                website: fullJobData.website,
                twitter: fullJobData.twitter,
                discord: fullJobData.discord
              };
              
              // Save to database via API call
              await JobService.addJob(jobToSave);
              
              console.log('Job saved successfully after payment confirmation');
            } catch (error) {
              console.error('Error saving job after payment confirmation:', error);
              toast.error('Payment confirmed but failed to save job. Please contact support.');
              return false;
            }
            
            toast.success(`Job posted successfully! Payment confirmed. Transaction: ${result.txHash.substring(0, 8)}...`);
            return true;
          } else {
            toast.error('Payment transaction failed to confirm. Please try again.');
            return false;
          }
        } catch (error) {
          console.error('Error verifying transaction:', error);
          toast.error('Payment submitted but confirmation failed. Please check your transaction.');
          return false;
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
