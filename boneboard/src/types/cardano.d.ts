declare global {
  interface Window {
    cardano?: {
      enable: () => Promise<CardanoWallet>;
      isEnabled: () => Promise<boolean>;
    };
  }
}

export interface CardanoWallet {
  getChangeAddress: () => Promise<string>;
  getNetworkId: () => Promise<number>;
  getRewardAddresses: () => Promise<string[]>;
  getUnusedAddresses: () => Promise<string[]>;
  getUsedAddresses: () => Promise<string[]>;
  getUtxos: (amount?: any, paginate?: any) => Promise<any[]>;
  signData: (addr: string, payload: string) => Promise<{ signature: string }>;
  signTx: (tx: string, partialSign?: boolean) => Promise<string>;
  submitTx: (tx: string) => Promise<string>;
  getCollateral: (amount: any) => Promise<any[]>;
  experimental: {
    getCollateral: (amount: any) => Promise<any[]>;
  };
  [key: string]: any;
}
