# BoneBoard Smart Contracts Setup

## Overview

BoneBoard uses Cardano smart contracts to handle job postings, project funding, and scam reporting. Users pay with $BONE tokens or ADA to post content, and all transactions are recorded on the Cardano blockchain.

## Current Implementation Status

✅ **Completed:**
- Wallet connection (Vespr, Lace, Eternl, Nami, Flint)
- Job posting form with smart contract integration
- Local job storage and display
- Payment simulation for testing
- Transaction metadata structure

🚧 **In Progress:**
- Smart contract deployment
- Real blockchain integration
- $BONE token minting

❌ **To Do:**
- PostgreSQL database setup
- Backend API endpoints
- Transaction confirmation monitoring
- Scam watch functionality
- Project funding features

## Features

### 1. Job Listings
- **Cost:** 50 BONE or 50 ADA per month
- **Discount:** 20% off for project listings
- **Payment Methods:** $BONE tokens (recommended) or ADA
- **Duration:** 1-12 months
- **Metadata:** Stored on-chain with transaction

### 2. Project Funding (Planned)
- **Cost:** 25 BONE or 25 ADA listing fee
- **Funding:** Community can send ADA to projects
- **Transparency:** All funding tracked on-chain

### 3. Scam Watch (Planned)
- **Cost:** 5 BONE or 5 ADA per report
- **Community Moderation:** Users vote on scam reports
- **Transparency:** All reports public and verifiable

## Smart Contract Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Job Posting   │    │ Project Funding  │    │   Scam Watch    │
│   Contract      │    │   Contract       │    │   Contract      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Post job      │    │ • Create project │    │ • Report scam   │
│ • Pay BONE/ADA  │    │ • Fund project   │    │ • Vote on report│
│ • Store metadata│    │ • Withdraw funds │    │ • Resolve report│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory:

```env
# Blockfrost API (get from https://blockfrost.io)
VITE_BLOCKFROST_API_KEY=your_blockfrost_api_key_here

# Smart Contract Addresses (deploy contracts and update these)
VITE_JOB_POSTING_CONTRACT=addr_test1...
VITE_PROJECT_FUNDING_CONTRACT=addr_test1...
VITE_SCAM_WATCH_CONTRACT=addr_test1...

# BONE Token Configuration (mint token and update these)
VITE_BONE_POLICY_ID=your_bone_token_policy_id_here
```

### 2. Wallet Setup

Supported wallets:
- **Vespr** (Recommended)
- **Lace**
- **Eternl**
- **Nami**
- **Flint**

Install any of these browser extensions and create a Cardano wallet.

### 3. Testing Mode

Currently, the application runs in **simulation mode** for testing:
- Wallet connections work with real wallets
- Transactions are simulated (no real blockchain interaction)
- Jobs are stored locally in browser storage
- Sample jobs are provided for testing

### 4. Production Setup (Future)

For production deployment, you'll need:

1. **Deploy Smart Contracts:**
   ```bash
   # Deploy job posting contract
   cardano-cli transaction build-raw ...
   
   # Deploy project funding contract
   cardano-cli transaction build-raw ...
   
   # Deploy scam watch contract
   cardano-cli transaction build-raw ...
   ```

2. **Mint BONE Token:**
   ```bash
   # Create minting policy
   cardano-cli transaction policyid --script-file bone-policy.script
   
   # Mint initial BONE supply
   cardano-cli transaction build-raw ...
   ```

3. **Setup Database:**
   ```sql
   -- PostgreSQL schema
   CREATE TABLE jobs (
     id SERIAL PRIMARY KEY,
     title VARCHAR(255) NOT NULL,
     company VARCHAR(255) NOT NULL,
     description TEXT,
     tx_hash VARCHAR(64) UNIQUE,
     wallet_address VARCHAR(255),
     created_at TIMESTAMP DEFAULT NOW(),
     expires_at TIMESTAMP,
     status VARCHAR(20) DEFAULT 'pending'
   );
   ```

## Current Workflow

### Job Posting Process

1. **User connects wallet** → Wallet context stores connection
2. **User fills job form** → Form validation and cost calculation
3. **User clicks "Submit & Pay"** → Smart contract integration begins
4. **Wallet popup appears** → User signs transaction
5. **Transaction simulated** → Success/failure feedback
6. **Job stored locally** → Displayed on jobs page

### Code Structure

```
src/
├── services/
│   ├── contractService.ts     # Smart contract interactions
│   ├── jobService.ts         # Job data management
│   └── walletService.ts      # Wallet connection logic
├── hooks/
│   └── useContract.ts        # Contract interaction hook
├── contexts/
│   └── WalletContext.tsx     # Wallet state management
├── config/
│   └── contracts.ts          # Contract configuration
└── pages/
    ├── PostJob.tsx           # Job posting form
    └── JobListings.tsx       # Job display page
```

## Testing

### Test Job Posting

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Connect a Cardano wallet (testnet recommended)

3. Navigate to "Post Job" page

4. Fill out the job form:
   - Job title and description
   - Company information
   - Payment method (BONE or ADA)
   - Duration (1-12 months)

5. Click "Submit & Pay" and confirm in wallet

6. Check "Job Search" page to see your posted job

### Sample Data

The application includes sample jobs for testing:
- Senior Cardano Developer (DeFi Protocol)
- UI/UX Designer (CardanoNFT)
- Community Manager (Stake Pool)

## Troubleshooting

### Common Issues

1. **Wallet not connecting:**
   - Ensure wallet extension is installed and unlocked
   - Check browser console for errors
   - Try refreshing the page

2. **Transaction failing:**
   - Check wallet has sufficient funds
   - Verify network (testnet vs mainnet)
   - Check browser console for error messages

3. **Jobs not displaying:**
   - Check browser local storage
   - Clear cache and reload
   - Verify JobService is working

### Debug Mode

Enable debug logging:
```javascript
localStorage.setItem('boneboard_debug', 'true');
```

## Next Steps

1. **Deploy actual smart contracts** to Cardano testnet
2. **Integrate real Blockfrost API** for blockchain queries
3. **Setup PostgreSQL database** for persistent storage
4. **Create backend API** for job management
5. **Implement transaction monitoring** for confirmations
6. **Add project funding** and scam watch features
7. **Deploy to production** with mainnet contracts

## Support

For questions or issues:
- Check the browser console for error messages
- Review the smart contract configuration in `src/config/contracts.ts`
- Test with different wallets if connection issues persist
- Verify environment variables are set correctly

## Security Notes

- Never commit private keys or seed phrases
- Use testnet for development and testing
- Validate all user inputs before blockchain submission
- Implement proper error handling for failed transactions
- Monitor smart contracts for unusual activity
