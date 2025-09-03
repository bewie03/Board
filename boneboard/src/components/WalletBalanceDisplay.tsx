import React, { useState, useEffect } from 'react';
import { FaBone } from 'react-icons/fa';
import { walletBalanceService, WalletBalance } from '../services/walletBalanceService';

interface WalletBalanceDisplayProps {
  walletAddress: string | null;
  className?: string;
}

// Global cache that persists across component mounts/unmounts
const globalBalanceCache: { [address: string]: WalletBalance } = {};

// Function to clear balance cache (called after payments)
export const clearBalanceCache = (walletAddress?: string) => {
  if (walletAddress) {
    delete globalBalanceCache[walletAddress];
    console.log('Cleared balance cache for wallet:', walletAddress);
  } else {
    // Clear all cached balances
    Object.keys(globalBalanceCache).forEach(key => delete globalBalanceCache[key]);
    console.log('Cleared all balance cache');
  }
};

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

  // Listen for payment completion events to refresh balance
  useEffect(() => {
    const handlePaymentSuccess = (event: CustomEvent) => {
      console.log('🔄 Payment event received:', event.type, 'for wallet:', walletAddress);
      console.log('Event details:', event.detail);
      if (walletAddress) {
        clearBalanceCache(walletAddress);
        fetchBalance();
      }
    };

    // Listen for all payment-related events
    const events = [
      'jobPostedSuccessfully',
      'fundingCreatedSuccessfully', 
      'fundingExtendedSuccessfully',
      'projectCreatedSuccessfully'
    ];

    events.forEach(eventName => {
      window.addEventListener(eventName, handlePaymentSuccess as EventListener);
    });

    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, handlePaymentSuccess as EventListener);
      });
    };
  }, [walletAddress]);

  useEffect(() => {
    fetchBalance();
  }, [walletAddress]);

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
        <FaBone className="text-blue-600 text-sm" />
        <span className="text-xs font-semibold text-blue-700">
          {loading ? '...' : walletBalanceService.formatBalance(balance.bone, 'BONE')}
        </span>
      </div>
    </div>
  );
};

export default WalletBalanceDisplay;
