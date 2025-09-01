import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { transactionMonitor } from '../services/transactionMonitor';
import { fraudDetection } from '../utils/fraudDetection';

// Define the wallet interface
export interface CardanoWallet {
  enable: () => Promise<any>;
  getChangeAddress?: () => Promise<string>;
  getUnusedAddresses?: () => Promise<string[]>;
  getUsedAddresses?: () => Promise<string[]>;
  getAddress?: () => Promise<string>;
  name?: string;
  icon?: string;
  [key: string]: any; // For any additional methods
}

// Wallet info interface
export interface WalletInfo {
  name: string;
  icon?: string;
  apiVersion: string;
  enable: () => Promise<CardanoWallet>;
  isEnabled: () => Promise<boolean>;
}

declare global {
  interface Window {
    cardano?: {
      [key: string]: any;
      vespr?: WalletInfo | { enable: () => Promise<CardanoWallet> };
      lace?: WalletInfo;
      eternl?: WalletInfo;
      nami?: WalletInfo;
      flint?: WalletInfo;
    };
  }
}

type WalletContextType = {
  isConnected: boolean;
  walletAddress: string | null;
  connectedWallet: string | null;
  availableWallets: Array<{ id: string; name: string; icon?: string }>;
  username: string | null;
  profilePhoto: string | null;
  setUsername: (username: string) => void;
  setProfilePhoto: (photoUrl: string | null) => void;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => void;
  formatAddress: (address: string | null) => string;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // State initialization with localStorage
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('isConnected') === 'true';
  });
  
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('walletAddress');
  });
  const [connectedWallet, setConnectedWallet] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('connectedWallet');
  });
  const [username, setUsernameState] = useState<string | null>(null);
  const [profilePhoto, setProfilePhotoState] = useState<string | null>(null);
  
  const walletRef = useRef<CardanoWallet | null>(null);
  
  // Helper functions for wallet-specific profile data
  const getWalletProfileKey = useCallback((address: string, field: string) => {
    return `boneboard_${field}_${address}`;
  }, []);

  const loadWalletProfile = useCallback((address: string) => {
    if (typeof window === 'undefined') return;
    
    const usernameKey = getWalletProfileKey(address, 'username');
    const photoKey = getWalletProfileKey(address, 'profile_photo');
    
    const savedUsername = localStorage.getItem(usernameKey);
    const savedPhoto = localStorage.getItem(photoKey);
    
    setUsernameState(savedUsername);
    setProfilePhotoState(savedPhoto);
  }, [getWalletProfileKey]);

  const saveWalletProfile = useCallback((address: string, username: string | null, photo: string | null) => {
    if (typeof window === 'undefined') return;
    
    const usernameKey = getWalletProfileKey(address, 'username');
    const photoKey = getWalletProfileKey(address, 'profile_photo');
    
    if (username) {
      localStorage.setItem(usernameKey, username);
    } else {
      localStorage.removeItem(usernameKey);
    }
    
    if (photo) {
      localStorage.setItem(photoKey, photo);
    } else {
      localStorage.removeItem(photoKey);
    }
  }, [getWalletProfileKey]);
  
  // Update wallet reference and localStorage
  const updateWallet = useCallback((newWallet: CardanoWallet | null, walletId?: string) => {
    walletRef.current = newWallet;
    if (walletId) {
      setConnectedWallet(walletId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('connectedWallet', walletId);
      }
    } else {
      setConnectedWallet(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('connectedWallet');
      }
    }
  }, []);

  // Set username and update wallet-specific localStorage
  const setUsername = useCallback((newUsername: string) => {
    if (!walletAddress) return;
    
    setUsernameState(newUsername);
    saveWalletProfile(walletAddress, newUsername, profilePhoto);
  }, [walletAddress, profilePhoto, saveWalletProfile]);
  
  // Set profile photo and update wallet-specific localStorage
  const setProfilePhoto = useCallback((newPhoto: string | null) => {
    if (!walletAddress) return;
    
    setProfilePhotoState(newPhoto);
    saveWalletProfile(walletAddress, username, newPhoto);
  }, [walletAddress, username, saveWalletProfile]);

  // Format address for display
  const formatAddress = useCallback((address: string | null): string => {
    if (!address) return 'Not connected';

    try {
      if (address.startsWith('addr1') || address.startsWith('addr_test')) {
        const start = address.slice(0, 8);
        const end = address.slice(-4);
        return `${start}...${end}`;
      }

      if (address.startsWith('0x')) {
        return `0x...${address.slice(-4)}`;
      }

      if (address.length > 12) {
        return `${address.slice(0, 8)}...${address.slice(-4)}`;
      }

      return address;
    } catch (error) {
      console.error('Error formatting address:', error);
      return 'Invalid address';
    }
  }, []);

  // Get available wallets
  const availableWallets = React.useMemo(() => {
    if (typeof window === 'undefined' || !window.cardano) return [];

    const cardano = window.cardano;
    const wallets: Array<{ id: string; name: string; icon?: string }> = [];

    const getWalletInfo = (wallet: any, id: string, name: string) => {
      if (!wallet) return null;
      return {
        id,
        name,
        icon: (wallet as any).icon || undefined
      };
    };

    const vesprInfo = getWalletInfo(cardano.vespr, 'vespr', 'Vespr');
    const laceInfo = getWalletInfo(cardano.lace, 'lace', 'Lace');
    const eternlInfo = getWalletInfo(cardano.eternl, 'eternl', 'Eternl');
    const namiInfo = getWalletInfo(cardano.nami, 'nami', 'Nami');
    const flintInfo = getWalletInfo(cardano.flint, 'flint', 'Flint');

    if (vesprInfo) wallets.push(vesprInfo);
    if (laceInfo) wallets.push(laceInfo);
    if (eternlInfo) wallets.push(eternlInfo);
    if (namiInfo) wallets.push(namiInfo);
    if (flintInfo) wallets.push(flintInfo);

    return wallets;
  }, []);

  // Helper function to convert hex string to Uint8Array
  const hexToBytes = useCallback((hexString: string): Uint8Array => {
    const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    const bytes = new Uint8Array(Math.ceil(cleanHex.length / 2));
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
  }, []);

  // Helper function to convert hex to bech32 format
  const convertHexToBech32 = useCallback(async (address: string): Promise<string> => {
    try {
      if (address.startsWith('addr1') || address.startsWith('addr_test')) {
        return address;
      }

      if (address.startsWith('0x') || /^[0-9a-fA-F]+$/.test(address)) {
        try {
          const CML = await import('@dcspark/cardano-multiplatform-lib-browser');
          const bytes = hexToBytes(address);
          const addr = CML.Address.from_bytes(bytes);
          const bech32 = addr.to_bech32();
          addr.free();
          return bech32;
        } catch (error) {
          console.error('Error converting hex to bech32:', error);
          return `addr1_${address.slice(0, 10)}...${address.slice(-8)}`;
        }
      }

      return address;

    } catch (error) {
      console.error('Unexpected error in convertHexToBech32:', error);
      return address;
    }
  }, [hexToBytes]);

  // Connect to wallet function
  const connect = useCallback(async (walletId: string): Promise<void> => {
    if (typeof window === 'undefined' || !window.cardano) {
      throw new Error('No Cardano wallet extension found');
    }

    try {
      const cardano = window.cardano;
      const walletInfo = cardano[walletId as keyof typeof cardano];

      if (!walletInfo) {
        throw new Error(`Wallet ${walletId} not found`);
      }

      console.log(`Connecting to ${walletId} wallet...`);

      const wallet = await walletInfo.enable();

      const getAddress = wallet.getChangeAddress || wallet.getUnusedAddresses || wallet.getUsedAddresses || wallet.getAddress;
      if (!getAddress) {
        throw new Error('Connected wallet does not support address retrieval');
      }

      let address = await getAddress();
      let currentAddress = Array.isArray(address) ? address[0] : address;

      if (!currentAddress) {
        throw new Error('Failed to get address from wallet');
      }

      try {
        const formattedAddress = await convertHexToBech32(currentAddress);
        currentAddress = formattedAddress;
      } catch (error) {
        console.warn('Using unformatted address due to conversion error:', error);
      }

      const bech32Address = currentAddress;

      setIsConnected(true);
      setWalletAddress(bech32Address);
      setConnectedWallet(walletId);
      walletRef.current = wallet;
      
      // Track wallet session for fraud detection with wallet API access
      await fraudDetection.initializeWalletTracking(bech32Address, wallet);
      
      // Load profile data for this wallet
      loadWalletProfile(bech32Address);

      if (typeof window !== 'undefined') {
        localStorage.setItem('walletAddress', bech32Address);
        localStorage.setItem('isConnected', 'true');
        localStorage.setItem('connectedWallet', walletId);
      }

      // Start monitoring for pending transactions
      transactionMonitor.startMonitoring(bech32Address);

      console.log(`Successfully connected to ${walletId} wallet`);
      
      // Force a re-render by triggering a small delay to ensure all state updates are processed
      setTimeout(() => {
        // This ensures any components using the wallet context get the updated state
        console.log('Wallet connection state updated');
      }, 100);

    } catch (error) {
      console.error(`Error connecting to ${walletId}:`, error);
      updateWallet(null);
      setWalletAddress(null);
      setIsConnected(false);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('isConnected');
        localStorage.removeItem('connectedWallet');
      }

      throw error;
    }
  }, [convertHexToBech32, updateWallet]);

  // Disconnect wallet function
  const disconnect = useCallback((): void => {
    updateWallet(null);
    setWalletAddress(null);
    setIsConnected(false);
    
    // Clear profile data when disconnecting
    setUsernameState(null);
    setProfilePhotoState(null);

    // Stop transaction monitoring
    transactionMonitor.stopMonitoring();

    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('isConnected');
      localStorage.removeItem('connectedWallet');
    }

    console.log('Wallet disconnected');
  }, [updateWallet]);

  // Load profile data when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      loadWalletProfile(walletAddress);
    } else {
      // Clear profile data when no wallet is connected
      setUsernameState(null);
      setProfilePhotoState(null);
    }
  }, [walletAddress, loadWalletProfile]);

  // Reconnect to wallet on page load if previously connected
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let isMounted = true;

    const cleanup = () => {
      walletRef.current = null;
      setWalletAddress(null);
      setIsConnected(false);
      setConnectedWallet(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('isConnected');
        localStorage.removeItem('connectedWallet');
      }
    };

  const checkWalletConnection = async () => {
      try {
        const storedAddress = localStorage.getItem('walletAddress');
        const storedIsConnected = localStorage.getItem('isConnected');
        const savedWallet = localStorage.getItem('connectedWallet');
        
        if (!storedAddress || storedIsConnected !== 'true' || !savedWallet) {
          cleanup();
          return; // No stored connection
        }
        
        if (walletAddress && isConnected) return; // Already connected
        
        const cardano = window.cardano;
        if (!cardano) {
          throw new Error('Wallet not available');
        }
        
        const walletInfo = cardano[savedWallet as keyof typeof cardano];
        if (!walletInfo) {
          throw new Error(`Wallet ${savedWallet} not found`);
        }
        
        try {
          const isEnabled = await walletInfo.isEnabled();
          if (!isEnabled) {
            throw new Error('Wallet not enabled');
          }
          
          const wallet = await walletInfo.enable();
          const getAddress = wallet.getChangeAddress || wallet.getUnusedAddresses || wallet.getUsedAddresses || wallet.getAddress;
          if (!getAddress) {
            throw new Error('Connected wallet does not support address retrieval');
          }
          
          const address = await getAddress();
          const currentAddress = Array.isArray(address) ? address[0] : address;
          
          if (!isMounted) return;
          
          if (currentAddress) {
            let formattedAddress = currentAddress;
            try {
              formattedAddress = await convertHexToBech32(currentAddress);
            } catch (error) {
              console.warn('Using unformatted address due to conversion error:', error);
            }
            
            updateWallet(wallet, savedWallet);
            setWalletAddress(formattedAddress);
            setIsConnected(true);
            
            // Load wallet-specific profile data
            loadWalletProfile(formattedAddress);
            
            // Start monitoring for pending transactions on reconnect
            transactionMonitor.startMonitoring(formattedAddress);
            
            // Initialize fraud detection on reconnect
            await fraudDetection.initializeWalletTracking(formattedAddress, wallet);
            
            console.log(`Successfully reconnected to ${savedWallet} wallet`);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
          if (isMounted) {
            cleanup();
          }
        }
      } catch (error) {
        console.error('Error in wallet connection check:', error);
        if (isMounted) {
          cleanup();
        }
      } finally {
        // Don't set up recurring checks - only check once on mount
      }
    };

    // Initial check
    checkWalletConnection();

    // Clean up on unmount
    return () => {
      isMounted = false;
    };
  }, [walletAddress, updateWallet, convertHexToBech32]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<WalletContextType>(
    () => ({
      isConnected,
      walletAddress,
      connectedWallet,
      availableWallets,
      username,
      profilePhoto,
      setUsername,
      setProfilePhoto,
      connect,
      disconnect,
      formatAddress,
    }),
    [
      isConnected,
      walletAddress,
      connectedWallet,
      availableWallets,
      username,
      profilePhoto,
      setUsername,
      setProfilePhoto,
      connect,
      disconnect,
      formatAddress
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// For backward compatibility
export const useWalletContext = useWallet;