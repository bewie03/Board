import { Lucid, Blockfrost } from 'lucid-cardano';

// BONE token configuration
const BONE_POLICY_ID = import.meta.env.VITE_BONE_POLICY_ID || '078eafce5cd7edafdf63900edef2c1ea759e77f30ca81d6bbdeec924';
const BONE_TOKEN_NAME = import.meta.env.VITE_BONE_TOKEN_NAME || '79756d6d69';

// Blockfrost configuration
const BLOCKFROST_API_KEY = import.meta.env.VITE_BLOCKFROST_API_KEY;
const NETWORK = import.meta.env.VITE_NETWORK || 'Mainnet';

export interface WalletBalance {
  ada: number;
  bone: number;
}

class WalletBalanceService {
  private lucid: Lucid | null = null;

  async initializeLucid(): Promise<void> {
    if (this.lucid) return;

    if (!BLOCKFROST_API_KEY) {
      throw new Error('Blockfrost API key not configured');
    }

    this.lucid = await Lucid.new(
      new Blockfrost(
        `https://cardano-${NETWORK.toLowerCase()}.blockfrost.io/api/v0`,
        BLOCKFROST_API_KEY
      ),
      NETWORK as 'Preview' | 'Mainnet'
    );
  }

  async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
    try {
      await this.initializeLucid();
      
      if (!this.lucid) {
        throw new Error('Failed to initialize Lucid');
      }

      // Get UTXOs for the wallet address
      const utxos = await this.lucid.utxosAt(walletAddress);
      
      let adaBalance = 0;
      let boneBalance = 0;

      // Calculate balances from UTXOs
      utxos.forEach(utxo => {
        // Add ADA balance (lovelace to ADA conversion)
        adaBalance += Number(utxo.assets.lovelace) / 1_000_000;

        // Check for BONE tokens
        const boneAssetKey = `${BONE_POLICY_ID}${BONE_TOKEN_NAME}`;
        if (utxo.assets[boneAssetKey]) {
          boneBalance += Number(utxo.assets[boneAssetKey]);
        }
      });

      return {
        ada: Math.round(adaBalance * 100) / 100, // Round to 2 decimal places
        bone: boneBalance
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return { ada: 0, bone: 0 };
    }
  }

  // Format balance for display
  formatBalance(balance: number, currency: 'ADA' | 'BONE'): string {
    if (currency === 'ADA') {
      return balance.toFixed(2);
    } else {
      return balance.toLocaleString();
    }
  }
}

export const walletBalanceService = new WalletBalanceService();
