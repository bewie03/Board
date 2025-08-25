// Smart Contract Configuration for BoneBoard
// This file contains the configuration for Cardano smart contracts

export const CONTRACT_CONFIG = {
  // Network configuration
  NETWORK: process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Preview',
  
  // Blockfrost API configuration
  BLOCKFROST: {
    API_URL: process.env.NODE_ENV === 'production' 
      ? 'https://cardano-mainnet.blockfrost.io/api/v0'
      : 'https://cardano-preview.blockfrost.io/api/v0',
    API_KEY: process.env.VITE_BLOCKFROST_API_KEY || 'your_blockfrost_api_key_here'
  },
  
  // Smart contract addresses (replace with actual deployed contract addresses)
  CONTRACTS: {
    JOB_POSTING: process.env.VITE_JOB_POSTING_CONTRACT || 'addr_test1...',
    PROJECT_FUNDING: process.env.VITE_PROJECT_FUNDING_CONTRACT || 'addr_test1...',
    SCAM_WATCH: process.env.VITE_SCAM_WATCH_CONTRACT || 'addr_test1...'
  },
  
  // BONE token configuration
  BONE_TOKEN: {
    POLICY_ID: process.env.VITE_BONE_POLICY_ID || 'your_bone_token_policy_id_here',
    ASSET_NAME: 'BONE',
    DECIMALS: 6
  },
  
  // Pricing configuration
  PRICING: {
    JOB_POSTING: {
      MONTHLY_PRICE_ADA: 50,
      MONTHLY_PRICE_BONE: 50,
      PROJECT_DISCOUNT: 0.2 // 20% discount for project listings
    },
    PROJECT_FUNDING: {
      LISTING_FEE_ADA: 25,
      LISTING_FEE_BONE: 25
    },
    SCAM_WATCH: {
      REPORT_FEE_ADA: 5,
      REPORT_FEE_BONE: 5
    }
  },
  
  // Transaction configuration
  TRANSACTION: {
    METADATA_LABEL: 674, // Standard metadata label for job postings
    CONFIRMATION_BLOCKS: 1,
    TIMEOUT_MS: 300000 // 5 minutes
  }
};

// Helper functions
export const getContractAddress = (contractType: 'JOB_POSTING' | 'PROJECT_FUNDING' | 'SCAM_WATCH'): string => {
  return CONTRACT_CONFIG.CONTRACTS[contractType];
};

export const getBoneAssetId = (): string => {
  return `${CONTRACT_CONFIG.BONE_TOKEN.POLICY_ID}${CONTRACT_CONFIG.BONE_TOKEN.ASSET_NAME}`;
};

export const formatBoneAmount = (amount: number): bigint => {
  return BigInt(Math.floor(amount * Math.pow(10, CONTRACT_CONFIG.BONE_TOKEN.DECIMALS)));
};

export const formatAdaAmount = (amount: number): bigint => {
  return BigInt(Math.floor(amount * 1_000_000)); // Convert ADA to lovelace
};
