import { useState, useCallback } from 'react';
import { contractService, JobPostingData } from '../services/contractService';
import { useWallet } from '../contexts/WalletContext';
import { toast } from 'react-toastify';

export interface UseContractReturn {
  isLoading: boolean;
  postJob: (jobData: Omit<JobPostingData, 'walletAddress' | 'timestamp'>) => Promise<boolean>;
  getJobs: () => Promise<any[]>;
  checkTxStatus: (txHash: string) => Promise<'pending' | 'confirmed' | 'failed'>;
  getWalletApi: () => Promise<any>;
}

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
        
        
        // Store pending transaction in localStorage for monitoring (like projects do)
        const pendingKey = `pendingTx_${walletAddress}`;
        const pendingTx = {
          txHash: result.txHash,
          jobData: fullJobData,
          timestamp: Date.now()
        };
        
        // Try to store in localStorage with error handling
        try {
          localStorage.setItem(pendingKey, JSON.stringify(pendingTx));
        } catch (error) {
          // If localStorage is full, try to clean up old entries and retry
          console.warn('localStorage full, attempting cleanup:', error);
          const allKeys = Object.keys(localStorage);
          const oldPendingKeys = allKeys.filter(key => 
            key.startsWith('pendingTx_') && 
            Date.now() - JSON.parse(localStorage.getItem(key) || '{}').timestamp > 5 * 60 * 1000
          );
          
          oldPendingKeys.forEach(key => localStorage.removeItem(key));
          
          try {
            localStorage.setItem(pendingKey, JSON.stringify(pendingTx));
          } catch (retryError) {
            console.error('Failed to store transaction even after cleanup:', retryError);
            toast.error('Unable to store transaction data. Please try again.');
            return false;
          }
        }
        
        // Start transaction monitoring (like projects do)
        import('../services/transactionMonitor').then(({ transactionMonitor }) => {
          transactionMonitor.startMonitoring(walletAddress!);
        });
        
        // Don't save immediately - let transaction monitor handle all saves to prevent duplicates
        return true;
      } else {
        toast.error(result.error || 'Failed to post job');
        return false;
      }
    } catch (error) {
      console.error('Error posting job:', error);
      
      // Handle specific error types with user-friendly messages
      let errorMessage = 'An unexpected error occurred while posting the job';
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('input exhaust') || message.includes('insufficient funds') || message.includes('inputsexhaustederror')) {
          errorMessage = 'Insufficient funds: Your wallet doesn\'t have enough ADA to cover the transaction cost and fees. Please add more ADA or consolidate your UTXOs by sending all ADA to yourself.';
        } else if (message.includes('utxo') || message.includes('unspent')) {
          errorMessage = 'UTXO issue: Your wallet has fragmented funds. Try consolidating by sending all your ADA to yourself in one transaction, then retry.';
        } else if (message.includes('network') || message.includes('connection')) {
          errorMessage = 'Network connection issue: Please check your internet connection and try again.';
        } else if (message.includes('wallet') || message.includes('cardano')) {
          errorMessage = 'Wallet connection issue: Please disconnect and reconnect your wallet, then try again.';
        } else if (message.includes('timeout')) {
          errorMessage = 'Transaction timeout: The blockchain is busy. Please wait a moment and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, {
        autoClose: 5600,
        style: { whiteSpace: 'pre-line' }
      });
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
    checkTxStatus,
    getWalletApi
  };
};
