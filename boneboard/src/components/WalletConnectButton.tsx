import React, { useState } from 'react';
import { useWalletContext } from '../contexts/WalletContext';
import { toast } from 'react-toastify';

const WalletConnectButton: React.FC = () => {
  const { isConnected, walletAddress, connect, disconnect } = useWalletContext();
  const [isConnecting, setIsConnecting] = useState(false);

  const formatAddress = (address: string) => {
    if (!address) return '';
    // For Cardano addresses, they typically start with 'addr1' or similar
    // Show first 6 and last 4 characters for better readability
    const prefix = address.startsWith('addr1') ? 'addr1' : '';
    const start = address.slice(0, 6);
    const end = address.slice(-4);
    return `${prefix}${start}...${end}`;
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect('nami'); // Default to nami wallet
      toast.success('Wallet connected successfully');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      
      // Show more specific error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('No Cardano wallet extension found')) {
          toast.error('No Cardano wallet found. Please install a wallet like Nami, Eternl, or Flint.');
        } else if (error.message.includes('Wallet API not properly initialized')) {
          toast.error('Wallet not ready. Please make sure your wallet extension is unlocked and try again.');
        } else {
          toast.error(error.message || 'Failed to connect wallet. Please try again.');
        }
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    try {
      disconnect();
      toast.info('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  return (
    <div className="relative">
      {isConnected && walletAddress ? (
        <div className="relative group">
          <button 
          className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isConnecting ? 'opacity-75' : ''}`}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <span className="font-mono">{formatAddress(walletAddress)}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
          
          {/* Profile Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">Wallet Address</p>
              <p className="text-xs text-gray-500 break-all">{walletAddress}</p>
            </div>
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm text-gray-700">Network: <span className="font-medium">Mainnet</span></p>
            </div>
            <div className="px-4 py-2">
              <button
                onClick={handleDisconnect}
                disabled={isConnecting}
                className="w-full text-left px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
};

export default WalletConnectButton;
