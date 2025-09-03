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
  const balanceCache = useRef<{ [address: string]: WalletBalance }>({});
  const lastFetchTime = useRef<{ [address: string]: number }>({});

  const fetchBalance = async () => {
    if (!walletAddress) {
      setBalance({ ada: 0, bone: 0 });
      return;
    }

    // Check if we have cached balance and it's less than 5 minutes old
    const now = Date.now();
    const cacheKey = walletAddress;
    const lastFetch = lastFetchTime.current[cacheKey] || 0;
    const fiveMinutes = 5 * 60 * 1000;

    if (balanceCache.current[cacheKey] && (now - lastFetch) < fiveMinutes) {
      setBalance(balanceCache.current[cacheKey]);
      return;
    }

    setLoading(true);
    try {
      const walletBalance = await walletBalanceService.getWalletBalance(walletAddress);
      setBalance(walletBalance);
      balanceCache.current[cacheKey] = walletBalance;
      lastFetchTime.current[cacheKey] = now;
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
      setBalance({ ada: 0, bone: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [walletAddress]);

  if (!walletAddress) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* ADA Balance */}
      <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
        <span className="text-blue-600 text-xs font-bold">₳</span>
        <span className="text-xs font-medium text-gray-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.ada, 'ADA')}
        </span>
      </div>

      {/* BONE Balance */}
      <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
        <span className="text-orange-600 text-xs">🦴</span>
        <span className="text-xs font-medium text-gray-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.bone, 'BONE')}
        </span>
      </div>
    </div>
  );
};

export default WalletBalanceDisplay;
