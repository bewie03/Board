// Project verification badge component
import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import { isVerifiedProject, getProjectStatusDisplay, getProjectStatusClasses } from '../utils/adminAuth';

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
  const isVerified = isVerifiedProp !== undefined ? isVerifiedProp : isVerifiedProject(status);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  if (isVerified) {
    return (
      <div className={`inline-flex items-center gap-1 rounded-full font-medium border ${getProjectStatusClasses(status)} ${sizeClasses[size]}`}>
        <FaShieldAlt size={iconSizes[size]} className="text-green-600" />
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
