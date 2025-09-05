import React from 'react';
import { FaTimes, FaWallet } from 'react-icons/fa';

// Import wallet icons
import vesperIcon from '../assets/vesper.png';
import laceIcon from '../assets/lace.png';
import eternlIcon from '../assets/eternal.png';
import geroIcon from '../assets/gero.png';
// Fallback icons for wallets without specific images
import walletFallbackIcon from '../assets/Wallet Icon.png';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (walletId: string) => void;
  availableWallets: Array<{ id: string; name: string; icon?: string }>;
}

// Wallet display names and icons
const WALLET_CONFIG = {
  vespr: { name: 'Vespr', icon: vesperIcon },
  lace: { name: 'Lace', icon: laceIcon },
  eternl: { name: 'Eternl', icon: eternlIcon },
  gerowallet: { name: 'Gero', icon: geroIcon },

} as const;

const WalletSelector: React.FC<WalletSelectorProps> = ({
  isOpen,
  onClose,
  onSelectWallet,
  availableWallets,
}) => {
  if (!isOpen) return null;

  // Process wallets to ensure consistent naming and icons
  const processedWallets = availableWallets.map(wallet => ({
    ...wallet,
    name: WALLET_CONFIG[wallet.id as keyof typeof WALLET_CONFIG]?.name || wallet.name,
    icon: WALLET_CONFIG[wallet.id as keyof typeof WALLET_CONFIG]?.icon || '👛'
  }));

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connect Wallet
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
            Choose your preferred wallet to connect to BoneBoard
          </p>
          
          <div className="space-y-3">
            {processedWallets.length > 0 ? (
              processedWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => onSelectWallet(wallet.id)}
                  className="w-full flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors dark:border-gray-700"
                >
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    <img 
                      src={wallet.icon} 
                      alt={`${wallet.name} icon`} 
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        // Fallback to default icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.src = walletFallbackIcon;
                      }}
                    />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {wallet.name}
                  </span>
                </button>
              ))
            ) : (
              <div className="text-center py-6">
                <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                  <FaWallet className="text-gray-400 text-xl" />
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">No wallets found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Please install a Cardano wallet extension
                </p>
                <a 
                  href="https://cardano.org/wallets/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Get a Wallet
                </a>
              </div>
            )}
          </div>
          
          {processedWallets.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Don't have a wallet?{' '}
                <a 
                  href="https://cardano.org/wallets/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Learn more
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletSelector;
