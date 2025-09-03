import { Lucid, Blockfrost } from 'lucid-cardano';
import { JobService } from './jobService';

// BONE token configuration (using YUMMI token for testing)
const BONE_POLICY_ID = import.meta.env.VITE_BONE_POLICY_ID || '078eafce5cd7edafdf63900edef2c1ea759e77f30ca81d6bbdeec924';
const BONE_TOKEN_NAME = import.meta.env.VITE_BONE_TOKEN_NAME || '79756d6d69';

// Blockfrost configuration
const BLOCKFROST_API_KEY = import.meta.env.VITE_BLOCKFROST_API_KEY;
const NETWORK = import.meta.env.VITE_NETWORK || 'Mainnet'; // 'Preview' for testnet, 'Mainnet' for mainnet

// Contract addresses - Using mainnet address for job posting payments
const JOB_POSTING_ADDRESS = import.meta.env.VITE_JOB_POSTING_ADDRESS || 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';

// Dynamic fees will be passed from the UI based on admin settings

export interface JobPostingData {
  title: string;
  company: string;
  description: string;
  salary: string;
  salaryType: 'ADA' | 'FIAT' | 'Other';
  category: string;
  type: string;
  contactEmail: string;
  howToApply: string;
  duration: number;
  paymentAmount: number;
  paymentCurrency: 'BONE' | 'ADA';
  walletAddress: string;
  timestamp: number;
  workArrangement?: 'remote' | 'hybrid' | 'onsite';
  requiredSkills?: string[];
  additionalInfo?: string[];
  companyWebsite?: string;
  companyLogo?: string | null;
  website?: string;
  twitter?: string;
  discord?: string;
  featured?: boolean;
  selectedProjectId?: string | null;
  // Relisting metadata
  isRelisting?: boolean;
  relistingJobId?: string;
}

export interface ProjectPostingData {
  title: string;
  description: string;
  fundingGoal: number;
  category: string;
  contactEmail: string;
  walletAddress: string;
  paymentAmount: number;
  paymentCurrency: 'BONE' | 'ADA';
  timestamp: number;
  website?: string;
  twitter?: string;
  discord?: string;
  additionalInfo?: string[];
  // Extension metadata
  isExtending?: boolean;
  extendingFundingId?: string;
  duration?: number;
}

export interface FreelancerProfileData {
  name: string;
  title: string;
  description: string;
  skills: string[];
  experience: string;
  hourlyRate?: string;
  contactEmail: string;
  walletAddress: string;
  paymentAmount: number;
  paymentCurrency: 'BONE' | 'ADA';
  timestamp: number;
  website?: string;
  twitter?: string;
  discord?: string;
  portfolio?: string[];
}

export class ContractService {
  private lucid: Lucid | null = null;

  async initializeLucid(walletApi: any) {
    try {
      console.log('Initializing Lucid with Blockfrost...', walletApi ? 'with wallet' : 'without wallet');
      console.log('Network:', NETWORK);
      console.log('Blockfrost URL:', `https://cardano-${NETWORK.toLowerCase()}.blockfrost.io/api/v0`);
      console.log('API Key present:', !!BLOCKFROST_API_KEY);
      console.log('API Key length:', BLOCKFROST_API_KEY?.length || 0);
      
      if (!BLOCKFROST_API_KEY) {
        throw new Error('Blockfrost API key not configured. Please set VITE_BLOCKFROST_API_KEY environment variable.');
      }
      
      // Initialize Lucid with Blockfrost provider
      const lucid = await Lucid.new(
        new Blockfrost(
          `https://cardano-${NETWORK.toLowerCase()}.blockfrost.io/api/v0`,
          BLOCKFROST_API_KEY
        ),
        NETWORK as 'Preview' | 'Mainnet'
      );
      
      // Select wallet if provided
      if (walletApi) {
        lucid.selectWallet(walletApi);
      }
      
      this.lucid = lucid;
      console.log('Lucid initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Lucid:', error);
      return false;
    }
  }

  async postJobWithBONE(jobData: JobPostingData): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      // Calculate BONE amount (assuming whole tokens, no decimals for simplicity)
      const boneAmount = Math.floor(jobData.paymentAmount);
      
      // Construct the full asset ID: policyId + tokenName (hex)
      const fullAssetId = `${BONE_POLICY_ID}${BONE_TOKEN_NAME}`;
      
      console.log(`Sending ${boneAmount} BONE tokens`);
      console.log(`Asset ID: ${fullAssetId}`);
      console.log(`To address: ${JOB_POSTING_ADDRESS}`);
      
      // Build the transaction without metadata to avoid WASM issues
      // Metadata will be handled by the transaction monitor service
      const tx = this.lucid.newTx()
        .payToAddress(
          JOB_POSTING_ADDRESS,
          { 
            [fullAssetId]: BigInt(boneAmount)
          }
        );

      // Complete and submit the transaction
      const completeTx = await tx.complete();
      const signedTx = await completeTx.sign().complete();
      const txHash = await signedTx.submit();

      // Track BONE payment in database
      try {
        await fetch('/api/burnedbone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: boneAmount })
        });
      } catch (error) {
        console.warn('Failed to track BONE payment in database:', error);
      }

      // Job will be stored by useContract after successful transaction
      return { success: true, txHash };
    } catch (error) {
      console.error('Error posting job with BONE:', error);
      const boneAmount = Math.floor(jobData.paymentAmount);
      const errorMessage = this.parsePaymentError(error, 'BONE', boneAmount);
      return { success: false, error: errorMessage };
    }
  }

  async postJobWithADA(jobData: JobPostingData): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      console.log('Creating ADA job posting transaction...');
      
      // Dynamic fee from admin settings in lovelace (1 ADA = 1,000,000 lovelace)
      const feeInLovelace = BigInt(jobData.paymentAmount * 1_000_000);
      
      console.log(`Sending ${jobData.paymentAmount} ADA (${feeInLovelace} lovelace) to ${JOB_POSTING_ADDRESS}`);
      
      // Build the transaction without metadata to avoid WASM issues
      // Metadata will be handled by the transaction monitor service
      const tx = this.lucid.newTx()
        .payToAddress(JOB_POSTING_ADDRESS, { lovelace: feeInLovelace });

      console.log('Building transaction...');
      const completeTx = await tx.complete();
      
      console.log('Signing transaction...');
      const signedTx = await completeTx.sign().complete();
      
      console.log('Submitting transaction...');
      const txHash = await signedTx.submit();
      
      console.log('Transaction submitted successfully:', txHash);
      return { success: true, txHash };
    } catch (error) {
      console.error('Error posting job with ADA:', error);
      const errorMessage = this.parsePaymentError(error, 'ADA', jobData.paymentAmount);
      return { success: false, error: errorMessage };
    }
  }


  async postProjectWithADA(projectData: ProjectPostingData): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      console.log('Creating ADA project posting transaction...');
      
      // Dynamic fee from admin settings in lovelace (1 ADA = 1,000,000 lovelace)
      const feeInLovelace = BigInt(projectData.paymentAmount * 1_000_000);
      
      console.log(`Sending ${projectData.paymentAmount} ADA (${feeInLovelace} lovelace) to ${JOB_POSTING_ADDRESS}`);
      
      // Build the transaction without metadata to avoid WASM issues
      // Metadata will be handled by the transaction monitor service
      const tx = this.lucid.newTx()
        .payToAddress(JOB_POSTING_ADDRESS, { lovelace: feeInLovelace });

      console.log('Building transaction...');
      const completeTx = await tx.complete();
      
      console.log('Signing transaction...');
      const signedTx = await completeTx.sign().complete();
      
      console.log('Submitting transaction...');
      const txHash = await signedTx.submit();
      
      console.log('Transaction submitted successfully:', txHash);
      return { success: true, txHash };
    } catch (error) {
      console.error('Error posting project with ADA:', error);
      const errorMessage = this.parsePaymentError(error, 'ADA', projectData.paymentAmount);
      return { success: false, error: errorMessage };
    }
  }

  async postProjectWithBONE(projectData: ProjectPostingData): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      // Calculate BONE amount (assuming whole tokens, no decimals for simplicity)
      const boneAmount = Math.floor(projectData.paymentAmount);
      
      // Construct the full asset ID: policyId + tokenName (hex)
      const fullAssetId = `${BONE_POLICY_ID}${BONE_TOKEN_NAME}`;
      
      console.log(`Sending ${boneAmount} BONE tokens`);
      console.log(`Asset ID: ${fullAssetId}`);
      console.log(`To address: ${JOB_POSTING_ADDRESS}`);
      
      // Build the transaction without metadata to avoid WASM issues
      // Metadata will be handled by the transaction monitor service
      const tx = this.lucid.newTx()
        .payToAddress(
          JOB_POSTING_ADDRESS,
          { 
            [fullAssetId]: BigInt(boneAmount)
          }
        );

      // Complete and submit the transaction
      const completeTx = await tx.complete();
      const signedTx = await completeTx.sign().complete();
      const txHash = await signedTx.submit();

      // Track BONE payment in database
      try {
        await fetch('/api/burnedbone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: boneAmount })
        });
      } catch (error) {
        console.warn('Failed to track BONE payment in database:', error);
      }

      // Project will be stored by useContract after successful transaction
      return { success: true, txHash };
    } catch (error) {
      console.error('Error posting project with BONE:', error);
      const boneAmount = Math.floor(projectData.paymentAmount);
      const errorMessage = this.parsePaymentError(error, 'BONE', boneAmount);
      return { success: false, error: errorMessage };
    }
  }

  async postFreelancerWithADA(freelancerData: FreelancerProfileData): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      console.log('Creating ADA freelancer profile transaction...');
      
      // Create the freelancer profile metadata - truncate strings to fit Cardano 64 char limit
      const metadata = {
        676: { // Standard metadata label for freelancer profiles
          freelancer: {
            name: freelancerData.name.substring(0, 60),
            title: freelancerData.title.substring(0, 60),
            description: freelancerData.description.substring(0, 60),
            skills: freelancerData.skills.join(',').substring(0, 60),
            experience: freelancerData.experience.substring(0, 60),
            hourlyRate: freelancerData.hourlyRate?.substring(0, 30) || '',
            contactEmail: freelancerData.contactEmail.substring(0, 60),
            timestamp: freelancerData.timestamp,
            poster: freelancerData.walletAddress.substring(0, 60),
            fee: `${freelancerData.paymentAmount} ADA`
          }
        }
      };

      // Dynamic fee from admin settings in lovelace (1 ADA = 1,000,000 lovelace)
      const feeInLovelace = BigInt(freelancerData.paymentAmount * 1_000_000);
      
      console.log(`Sending ${freelancerData.paymentAmount} ADA (${feeInLovelace} lovelace) to ${JOB_POSTING_ADDRESS}`);
      
      // Build the transaction - send 2 ADA to the posting address
      const tx = this.lucid.newTx()
        .payToAddress(JOB_POSTING_ADDRESS, { lovelace: feeInLovelace })
        .attachMetadata(676, metadata[676]);

      console.log('Building transaction...');
      const completeTx = await tx.complete();
      
      console.log('Signing transaction...');
      const signedTx = await completeTx.sign().complete();
      
      console.log('Submitting transaction...');
      const txHash = await signedTx.submit();
      
      console.log('Transaction submitted successfully:', txHash);
      return { success: true, txHash };
    } catch (error) {
      console.error('Error posting freelancer with ADA:', error);
      const errorMessage = this.parsePaymentError(error, 'ADA', freelancerData.paymentAmount);
      return { success: false, error: errorMessage };
    }
  }

  async postFreelancerWithBONE(freelancerData: FreelancerProfileData): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      // Create the freelancer profile metadata - truncate strings to fit Cardano 64 char limit
      const metadata = {
        676: { // Standard metadata label for freelancer profiles
          freelancer: {
            name: freelancerData.name.substring(0, 60),
            title: freelancerData.title.substring(0, 60),
            description: freelancerData.description.substring(0, 60),
            skills: freelancerData.skills.join(',').substring(0, 60),
            experience: freelancerData.experience.substring(0, 60),
            hourlyRate: freelancerData.hourlyRate?.substring(0, 30) || '',
            contactEmail: freelancerData.contactEmail.substring(0, 60),
            timestamp: freelancerData.timestamp,
            poster: freelancerData.walletAddress.substring(0, 60)
          }
        }
      };

      // Calculate BONE amount (assuming whole tokens, no decimals for simplicity)
      const boneAmount = Math.floor(freelancerData.paymentAmount);
      
      // Construct the full asset ID: policyId + tokenName (hex)
      const fullAssetId = `${BONE_POLICY_ID}${BONE_TOKEN_NAME}`;
      
      console.log(`Sending ${boneAmount} BONE tokens`);
      console.log(`Asset ID: ${fullAssetId}`);
      console.log(`To address: ${JOB_POSTING_ADDRESS}`);
      
      // Build the transaction
      const tx = this.lucid.newTx()
        .payToAddress(
          JOB_POSTING_ADDRESS,
          { 
            [fullAssetId]: BigInt(boneAmount)
          }
        )
        .attachMetadata(676, metadata[676]);

      // Complete and submit the transaction
      const completeTx = await tx.complete();
      const signedTx = await completeTx.sign().complete();
      const txHash = await signedTx.submit();

      // Track BONE payment in database
      try {
        await fetch('/api/burnedbone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ amount: boneAmount })
        });
      } catch (error) {
        console.warn('Failed to track BONE payment in database:', error);
      }

      // Freelancer profile will be stored by useContract after successful transaction
      return { success: true, txHash };
    } catch (error) {
      console.error('Error posting freelancer with BONE:', error);
      const boneAmount = Math.floor(freelancerData.paymentAmount);
      const errorMessage = this.parsePaymentError(error, 'BONE', boneAmount);
      return { success: false, error: errorMessage };
    }
  }

  private parsePaymentError(error: any, currency: 'ADA' | 'BONE', amount: number): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for insufficient funds patterns (including InputsExhaustedError)
    if (errorMessage.includes('insufficient') || 
        errorMessage.includes('not enough') || 
        errorMessage.includes('UTxO Balance Insufficient') ||
        errorMessage.includes('InsufficientCollateral') ||
        errorMessage.includes('ValueNotConserved') ||
        errorMessage.includes('InputsExhaustedError') ||
        errorMessage.includes('inputs exhausted')) {
      return `Not enough ${currency} in your wallet. You need at least ${amount} ${currency} to complete this payment.`;
    }
    
    // Check for asset not found (BONE token not in wallet)
    if (errorMessage.includes('asset') && errorMessage.includes('not found')) {
      return `${currency} token not found in your wallet. Please ensure you have ${amount} ${currency} tokens.`;
    }
    
    // Check for wallet connection issues
    if (errorMessage.includes('wallet') || errorMessage.includes('connection')) {
      return 'Wallet connection error. Please reconnect your wallet and try again.';
    }
    
    // Check for network issues
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Check for transaction building errors
    if (errorMessage.includes('transaction') && (errorMessage.includes('build') || errorMessage.includes('construct'))) {
      return 'Unable to create transaction. Please check your wallet balance and try again.';
    }
    
    // Default to a user-friendly message instead of technical error
    return 'Payment failed. Please check your wallet balance and try again.';
  }

  async getJobPostings(): Promise<any[]> {
    try {
      // In a real application, this would query the blockchain/backend
      // For now, we'll return jobs from JobService
      return JobService.getAllJobs();
    } catch (error) {
      console.error('Error getting job postings:', error);
      return [];
    }
  }

  async checkTransactionStatus(txHash: string, timeoutMs: number = 300000): Promise<'pending' | 'confirmed' | 'failed'> {
    if (!this.lucid) {
      console.log('Lucid not initialized, treating transaction as pending');
      return 'pending';
    }

    try {
      console.log(`Checking transaction status: ${txHash} (timeout: ${timeoutMs/1000}s)`);
      
      // Use awaitTx with configurable timeout (default 2 minutes)
      const confirmed = await Promise.race([
        this.lucid.awaitTx(txHash),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs))
      ]);
      
      if (confirmed) {
        console.log('Transaction confirmed:', txHash);
        return 'confirmed';
      } else {
        console.log(`Transaction still pending after ${timeoutMs/1000}s timeout:`, txHash);
        return 'pending';
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
      // Don't immediately mark as failed - could be network issue or still pending
      console.log('Treating as pending due to error - transaction may still be processing');
      return 'pending';
    }
  }

  async postFundingWithADA(fundingData: any): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      // Create the funding metadata - safely handle undefined values
      const metadata = {
        674: { // Standard metadata label for funding campaigns
          funding: {
            project_id: (fundingData.project_id || '').substring(0, 60),
            goal: fundingData.funding_goal || 0,
            deadline: (fundingData.funding_deadline || '').substring(0, 30),
            purpose: (fundingData.funding_purpose || '').substring(0, 60),
            timestamp: fundingData.timestamp || Date.now(),
            poster: (fundingData.wallet_address || fundingData.walletAddress || '').substring(0, 60)
          }
        }
      };

      // Calculate ADA amount in lovelace (1 ADA = 1,000,000 lovelace)
      const adaAmount = Math.floor(fundingData.paymentAmount * 1_000_000);
      
      console.log(`Sending ${fundingData.paymentAmount} ADA (${adaAmount} lovelace) for funding campaign`);
      console.log(`To address: ${JOB_POSTING_ADDRESS}`);
      
      // Build transaction
      const tx = await this.lucid
        .newTx()
        .payToAddress(JOB_POSTING_ADDRESS, { lovelace: BigInt(adaAmount) })
        .attachMetadata(674, metadata[674])
        .complete();

      // Sign and submit transaction
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();
      
      console.log(`Funding campaign payment transaction submitted: ${txHash}`);
      
      return { success: true, txHash };
    } catch (error) {
      console.error('Error posting funding with ADA:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async postFundingWithBONE(fundingData: any): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      // Create the funding metadata - safely handle undefined values
      const metadata = {
        674: { // Standard metadata label for funding campaigns
          funding: {
            project_id: (fundingData.project_id || '').substring(0, 60),
            goal: fundingData.funding_goal || 0,
            deadline: (fundingData.funding_deadline || '').substring(0, 30),
            purpose: (fundingData.funding_purpose || '').substring(0, 60),
            timestamp: fundingData.timestamp || Date.now(),
            poster: (fundingData.wallet_address || fundingData.walletAddress || '').substring(0, 60)
          }
        }
      };

      // Calculate BONE amount (assuming whole tokens)
      const boneAmount = Math.floor(fundingData.paymentAmount);
      
      // Construct the full asset ID: policyId + tokenName (hex)
      const fullAssetId = `${BONE_POLICY_ID}${BONE_TOKEN_NAME}`;
      
      console.log(`Sending ${boneAmount} BONE tokens for funding campaign`);
      console.log(`Asset ID: ${fullAssetId}`);
      console.log(`To address: ${JOB_POSTING_ADDRESS}`);
      
      // Build transaction with BONE token payment
      const tx = await this.lucid
        .newTx()
        .payToAddress(JOB_POSTING_ADDRESS, { [fullAssetId]: BigInt(boneAmount) })
        .attachMetadata(674, metadata[674])
        .complete();

      // Sign and submit transaction
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();
      
      console.log(`Funding campaign BONE payment transaction submitted: ${txHash}`);
      
      return { success: true, txHash };
    } catch (error) {
      console.error('Error posting funding with BONE:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  async contributeADA(recipientAddress: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      console.log(`Creating ADA contribution transaction...`);
      console.log(`Sending ${amount} ADA to ${recipientAddress}`);
      
      // Convert ADA to lovelace (1 ADA = 1,000,000 lovelace)
      const amountInLovelace = BigInt(Math.floor(amount * 1_000_000));
      
      // Create contribution metadata
      const metadata = {
        675: { // Standard metadata label for contributions
          contribution: {
            amount: amount,
            currency: 'ADA',
            recipient: recipientAddress.substring(0, 60),
            timestamp: Date.now(),
            type: 'funding_contribution'
          }
        }
      };
      
      // Build the transaction
      const tx = this.lucid.newTx()
        .payToAddress(recipientAddress, { lovelace: amountInLovelace })
        .attachMetadata(675, metadata[675]);

      console.log('Building transaction...');
      const completeTx = await tx.complete();
      
      console.log('Signing transaction...');
      const signedTx = await completeTx.sign().complete();
      
      console.log('Submitting transaction...');
      const txHash = await signedTx.submit();
      
      console.log('ADA contribution transaction submitted successfully:', txHash);
      return { success: true, txHash };
    } catch (error) {
      console.error('Error contributing ADA:', error);
      const errorMessage = this.parsePaymentError(error, 'ADA', amount);
      return { success: false, error: errorMessage };
    }
  }

  async contributeBONE(recipientAddress: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.lucid) {
      return { success: false, error: 'Lucid not initialized' };
    }

    try {
      console.log(`Creating BONE contribution transaction...`);
      console.log(`Sending ${amount} BONE to ${recipientAddress}`);
      
      // Calculate BONE amount (assuming whole tokens)
      const boneAmount = Math.floor(amount);
      
      // Construct the full asset ID: policyId + tokenName (hex)
      const fullAssetId = `${BONE_POLICY_ID}${BONE_TOKEN_NAME}`;
      
      // Create contribution metadata
      const metadata = {
        675: { // Standard metadata label for contributions
          contribution: {
            amount: boneAmount,
            currency: 'BONE',
            recipient: recipientAddress.substring(0, 60),
            timestamp: Date.now(),
            type: 'funding_contribution'
          }
        }
      };
      
      // Build the transaction
      const tx = this.lucid.newTx()
        .payToAddress(recipientAddress, { [fullAssetId]: BigInt(boneAmount) })
        .attachMetadata(675, metadata[675]);

      console.log('Building transaction...');
      const completeTx = await tx.complete();
      
      console.log('Signing transaction...');
      const signedTx = await completeTx.sign().complete();
      
      console.log('Submitting transaction...');
      const txHash = await signedTx.submit();
      
      console.log('BONE contribution transaction submitted successfully:', txHash);
      return { success: true, txHash };
    } catch (error) {
      console.error('Error contributing BONE:', error);
      const errorMessage = this.parsePaymentError(error, 'BONE', amount);
      return { success: false, error: errorMessage };
    }
  }

  // Funding transaction monitoring is now handled by the centralized transactionMonitor service
}

export const contractService = new ContractService();
