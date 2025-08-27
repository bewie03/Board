import React, { useState } from 'react';
import { FaCheckCircle, FaCircle, FaSpinner } from 'react-icons/fa';
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

  if (!isAdmin) {
    return null; // Don't show anything if not admin
  }

  const handleToggleVerification = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (isVerified) {
        await adminService.unverifyProject(walletAddress!, projectId);
        onVerificationChange(false);
      } else {
        await adminService.verifyProject(walletAddress!, projectId);
        onVerificationChange(true);
      }
    } catch (error) {
      console.error('Error toggling project verification:', error);
      // You could add a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleToggleVerification}
        disabled={isLoading}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
          isVerified
            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={isVerified ? 'Click to unverify project' : 'Click to verify project'}
      >
        {isLoading ? (
          <FaSpinner className="animate-spin w-4 h-4" />
        ) : isVerified ? (
          <FaCheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <FaCircle className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-sm font-medium">
          {isVerified ? 'Verified' : 'Verify Project'}
        </span>
      </button>
      <div className="text-xs text-gray-500">
        Admin Only
      </div>
    </div>
  );
};
