import React, { createContext, useContext, useState, ReactNode } from 'react'

interface WalletContextType {
  isConnected: boolean
  walletAddress: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  balance: {
    ada: number
    bone: number
  }
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderProps {
  children: ReactNode
}

const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState({ ada: 0, bone: 0 })

  const connectWallet = async () => {
    try {
      // TODO: Implement actual Cardano wallet connection
      // For now, simulate connection
      setIsConnected(true)
      setWalletAddress('addr1qxy2lpan99fcnyrz4usn6k9y2gdrvqjjnpkmxmp7fskr0uqng0ddxzk')
      setBalance({ ada: 100, bone: 500 })
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setWalletAddress(null)
    setBalance({ ada: 0, bone: 0 })
  }

  const value: WalletContextType = {
    isConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    balance,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

export default WalletProvider
