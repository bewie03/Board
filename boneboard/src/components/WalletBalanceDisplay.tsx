import React, { useState, useEffect, useRef } from 'react';
import { walletBalanceService, WalletBalance } from '../services/walletBalanceService';

interface WalletBalanceDisplayProps {
  walletAddress: string | null;
  className?: string;
}

const WalletBalanceDisplay: React.FC<WalletBalanceDisplayProps> = ({ 
  walletAddress, 
  className = '' 
}) => {
  const [balance, setBalance] = useState<WalletBalance>({ ada: 0, bone: 0 });
  const [loading, setLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const balanceCache = useRef<{ [address: string]: WalletBalance }>({});

  const fetchBalance = async () => {
    if (!walletAddress) {
      setBalance({ ada: 0, bone: 0 });
      setHasInitialized(true);
      return;
    }

    // Check if we have cached balance - only fetch once per page load
    const cacheKey = walletAddress;
    
    if (balanceCache.current[cacheKey]) {
      setBalance(balanceCache.current[cacheKey]);
      setHasInitialized(true);
      return;
    }

    setLoading(true);
    try {
      const walletBalance = await walletBalanceService.getWalletBalance(walletAddress);
      setBalance(walletBalance);
      balanceCache.current[cacheKey] = walletBalance;
      setHasInitialized(true);
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      setBalance({ ada: 0, bone: 0 });
      setHasInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasInitialized) {
      fetchBalance();
    }
  }, [walletAddress, hasInitialized]);

  if (!walletAddress) {
    return null;
  }

  return (
    <div className={`flex space-x-2 w-full ${className}`}>
      {/* ADA Balance */}
      <div className="flex-1 flex items-center justify-between px-2 py-1.5 bg-blue-50 rounded border border-blue-100">
        <span className="text-blue-600 text-sm font-bold">₳</span>
        <span className="text-xs font-semibold text-blue-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.ada, 'ADA')}
        </span>
      </div>

      {/* BONE Balance */}
      <div className="flex-1 flex items-center justify-between px-2 py-1.5 bg-blue-50 rounded border border-blue-100">
        <span className="text-blue-600 text-sm">🦴</span>
        <span className="text-xs font-semibold text-blue-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.bone, 'BONE')}
        </span>
      </div>
    </div>
  );
};

export default WalletBalanceDisplay;
