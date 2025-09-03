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

  const fetchBalance = async () => {
    if (!walletAddress) {
      setBalance({ ada: 0, bone: 0 });
      return;
    }

    // Check if we have cached balance - only fetch once per page load
    const cacheKey = walletAddress;
    
    if (balanceCache.current[cacheKey]) {
      setBalance(balanceCache.current[cacheKey]);
      return;
    }

    setLoading(true);
    try {
      const walletBalance = await walletBalanceService.getWalletBalance(walletAddress);
      setBalance(walletBalance);
      balanceCache.current[cacheKey] = walletBalance;
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
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* ADA Balance */}
      <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center space-x-2">
          <span className="text-blue-600 text-sm font-bold">₳</span>
          <span className="text-sm font-medium text-gray-700">ADA</span>
        </div>
        <span className="text-sm font-semibold text-blue-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.ada, 'ADA')}
        </span>
      </div>

      {/* BONE Balance */}
      <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-100">
        <div className="flex items-center space-x-2">
          <span className="text-orange-600 text-sm">🦴</span>
          <span className="text-sm font-medium text-gray-700">BONE</span>
        </div>
        <span className="text-sm font-semibold text-orange-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.bone, 'BONE')}
        </span>
      </div>
    </div>
  );
};

export default WalletBalanceDisplay;
