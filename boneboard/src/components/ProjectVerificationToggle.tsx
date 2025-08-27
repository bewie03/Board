import React, { useState } from 'react';
import { FaCheck, FaSpinner } from 'react-icons/fa';
import { adminService } from '../services/adminService';
import { isAdminWallet } from '../utils/adminAuth';

interface ProjectVerificationToggleProps {
  projectId: string;
  isVerified: boolean;
  walletAddress: string | null;
  onVerificationChange: (verified: boolean) => void;
}

export const ProjectVerificationToggle: React.FC<ProjectVerificationToggleProps> = ({
  projectId,
  isVerified,
  walletAddress,
  onVerificationChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const isAdmin = isAdminWallet(walletAddress);

  // Show for everyone when verified, but only allow admin to click
  if (!isAdmin && !isVerified) {
    return null; // Only show for non-admins if project is verified
  }

  const handleToggleVerification = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (isLoading) return;

    console.log('=== VERIFICATION TOGGLE ===');
    console.log('Project ID:', projectId);
    console.log('Wallet Address:', walletAddress);
    console.log('Is Verified:', isVerified);
    console.log('Is Admin:', isAdmin);
    console.log('========================');

    setIsLoading(true);
    try {
      if (isVerified) {
        console.log('Calling unverifyProject...');
        await adminService.unverifyProject(walletAddress!, projectId);
        onVerificationChange(false);
      } else {
        console.log('Calling verifyProject...');
        await adminService.verifyProject(walletAddress!, projectId);
        onVerificationChange(true);
      }
      console.log('Verification toggle completed successfully');
    } catch (error) {
      console.error('Error toggling project verification:', error);
      console.error('Error details:', error);
      // You could add a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={isAdmin ? handleToggleVerification : undefined}
      disabled={isLoading || !isAdmin}
      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
        isVerified
          ? 'bg-blue-500 text-white hover:bg-blue-600'
          : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
      title={isAdmin ? (isVerified ? 'Click to unverify project' : 'Click to verify project') : 'Verified by admin'}
    >
      {isLoading ? (
        <FaSpinner className="animate-spin w-3 h-3" />
      ) : isVerified ? (
        <FaCheck className="w-3 h-3" />
      ) : (
        <div className="w-3 h-3 border border-gray-400 rounded-full" />
      )}
    </button>
  );
};
