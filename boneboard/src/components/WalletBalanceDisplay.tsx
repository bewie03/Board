import React, { useState, useEffect } from 'react';
import { FaBone } from 'react-icons/fa';
import { walletBalanceService, WalletBalance } from '../services/walletBalanceService';
import { useWallet } from '../contexts/WalletContext';

interface WalletBalanceDisplayProps {
  walletAddress: string | null;
  className?: string;
}

// Global cache that persists across component mounts/unmounts
const globalBalanceCache: { [address: string]: WalletBalance } = {};

const WalletBalanceDisplay: React.FC<WalletBalanceDisplayProps> = ({ 
  walletAddress, 
  className = '' 
}) => {
  const { balance: contextBalance, balanceLoading: contextLoading } = useWallet();
  const [balance, setBalance] = useState<WalletBalance>({ ada: 0, bone: 0 });
  const [loading, setLoading] = useState(false);

  // Use context balance if available and matches the requested wallet address
  const shouldUseContextBalance = contextBalance && walletAddress && contextBalance.ada > 0 || contextBalance.bone > 0;
  const displayBalance = shouldUseContextBalance ? contextBalance : balance;
  const displayLoading = shouldUseContextBalance ? contextLoading : loading;

  const fetchBalance = async () => {
    if (!walletAddress) {
      setBalance({ ada: 0, bone: 0 });
      return;
    }

    // Check if we have cached balance - only fetch once per page load
    const cacheKey = walletAddress;
    
    if (globalBalanceCache[cacheKey]) {
      setBalance(globalBalanceCache[cacheKey]);
      return;
    }

    setLoading(true);
    try {
      const walletBalance = await walletBalanceService.getWalletBalance(walletAddress);
      setBalance(walletBalance);
      globalBalanceCache[cacheKey] = walletBalance;
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      setBalance({ ada: 0, bone: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch balance if context balance is not available
    if (!shouldUseContextBalance) {
      fetchBalance();
    }
  }, [walletAddress, shouldUseContextBalance]);

  if (!walletAddress) {
    return null;
  }

  return (
    <div className={`flex space-x-2 w-full ${className}`}>
      {/* ADA Balance */}
      <div className="flex-1 flex items-center justify-between px-2 py-1.5 bg-blue-50 rounded border border-blue-100">
        <span className="text-blue-600 text-sm font-bold">₳</span>
        <span className="text-xs font-semibold text-blue-700">
          {displayLoading ? '...' : walletBalanceService.formatBalance(displayBalance.ada, 'ADA')}
        </span>
      </div>

      {/* BONE Balance */}
      <div className="flex-1 flex items-center justify-between px-2 py-1.5 bg-blue-50 rounded border border-blue-100">
        <FaBone className="text-blue-600 text-sm" />
        <span className="text-xs font-semibold text-blue-700">
          {displayLoading ? '...' : walletBalanceService.formatBalance(displayBalance.bone, 'BONE')}
        </span>
      </div>
    </div>
  );
};

export default WalletBalanceDisplay;
