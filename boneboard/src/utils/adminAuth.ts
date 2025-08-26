// Admin wallet authentication utilities
export const ADMIN_WALLET_ADDRESS = 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';

/**
 * Check if a wallet address has admin privileges
 */
export const isAdminWallet = (walletAddress: string | null): boolean => {
  if (!walletAddress) return false;
  return walletAddress === ADMIN_WALLET_ADDRESS;
};

/**
 * Admin authentication hook for components
 */
export const useAdminAuth = (walletAddress: string | null) => {
  const isAdmin = isAdminWallet(walletAddress);
  
  return {
    isAdmin,
    requireAdmin: () => {
      if (!isAdmin) {
        throw new Error('Admin privileges required');
      }
    }
  };
};

/**
 * Admin middleware for API routes
 */
export const requireAdminAuth = (walletAddress: string | null) => {
  if (!isAdminWallet(walletAddress)) {
    throw new Error('Unauthorized: Admin access required');
  }
};

/**
 * Project verification status types
 */
export type ProjectVerificationStatus = 'active' | 'verified' | 'completed' | 'paused' | 'cancelled';

/**
 * Check if a project status indicates verification
 */
export const isVerifiedProject = (status: string): boolean => {
  return status === 'verified';
};

/**
 * Get display text for project status
 */
export const getProjectStatusDisplay = (status: string): string => {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'paused':
      return 'Paused';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

/**
 * Get CSS classes for project status badges
 */
export const getProjectStatusClasses = (status: string): string => {
  switch (status) {
    case 'verified':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'active':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'paused':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
