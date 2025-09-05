// Project verification badge component
import React from 'react';
import { getProjectStatusDisplay, getProjectStatusClasses } from '../utils/adminAuth';

interface ProjectVerificationBadgeProps {
  status: string;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const ProjectVerificationBadge: React.FC<ProjectVerificationBadgeProps> = ({ 
  status,
  isVerified: isVerifiedProp,
  size = 'md',
  showText = true 
}) => {
  const isVerified = isVerifiedProp !== undefined ? isVerifiedProp : status === 'verified';
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1'
  };

  if (isVerified) {
    return (
      <div className={`inline-flex items-center gap-1 rounded-full font-medium bg-blue-100 text-blue-800 border border-blue-200 ${sizeClasses[size]}`}>
        <span className="text-blue-600">✓</span>
        {showText && (
          <span>Verified</span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 rounded-full font-medium border ${getProjectStatusClasses(status)} ${sizeClasses[size]}`}>
      {showText && (
        <span>{getProjectStatusDisplay(status)}</span>
      )}
    </div>
  );
};
