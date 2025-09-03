import React, { useState, useEffect } from 'react';
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

  const fetchBalance = async () => {
    if (!walletAddress) {
      setBalance({ ada: 0, bone: 0 });
      return;
    }

    setLoading(true);
    try {
      const walletBalance = await walletBalanceService.getWalletBalance(walletAddress);
      setBalance(walletBalance);
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
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* ADA Balance */}
      <div className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors duration-200 border border-blue-200">
        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">₳</span>
        </div>
        <span className="text-sm font-semibold text-blue-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.ada, 'ADA')}
        </span>
      </div>

      {/* BONE Balance */}
      <div className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors duration-200 border border-blue-200">
        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">🦴</span>
        </div>
        <span className="text-sm font-semibold text-blue-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.bone, 'BONE')}
        </span>
      </div>
    </div>
  );
};

export default WalletBalanceDisplay;
