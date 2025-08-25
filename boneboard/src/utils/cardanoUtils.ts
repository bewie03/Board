// Removed unused lucid-cardano imports - will be added back when blockchain integration is implemented

export const createJobMetadata = (jobData: {
  title: string;
  description: string;
  company: string;
  type: string;
  category: string;
  salary: string;
  duration: number;
  paymentMethod: 'BONE' | 'ADA';
  paymentAmount: number;
}) => {
  return {
    '674': {
      job: {
        title: jobData.title,
        description: jobData.description,
        company: jobData.company,
        type: jobData.type,
        category: jobData.category,
        salary: jobData.salary,
        duration_months: jobData.duration,
        payment: {
          method: jobData.paymentMethod,
          amount: jobData.paymentAmount,
          currency: jobData.paymentMethod === 'BONE' ? 'BONE' : 'ADA',
          timestamp: new Date().toISOString()
        }
      }
    }
  };
};

export const formatLovelaceToAda = (lovelace: bigint | number): number => {
  return Number(lovelace) / 1000000;
};

export const formatAdaToLovelace = (ada: number): bigint => {
  return BigInt(Math.floor(ada * 1000000));
};

export const shortenAddress = (address: string, chars = 8): string => {
  if (!address) return '';
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
};
