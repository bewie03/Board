import React from 'react';
import { FaMapMarkerAlt, FaMoneyBillWave, FaClock } from 'react-icons/fa';

export interface JobCardPreviewProps {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  salaryType: 'crypto' | 'fiat';
  logo?: string;
  category?: string;
}

const JobCardPreview: React.FC<JobCardPreviewProps> = ({
  title,
  company,
  location,
  type,
  salary,
  salaryType,
  logo = '/Logo.png',
  category = 'Development'
}) => {
  return (
    <div className="bg-white shadow rounded-xl hover:shadow-md transition-shadow duration-200 cursor-pointer border border-gray-100 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img 
                className="h-12 w-12 rounded-full object-cover border border-gray-200 p-1" 
                src={logo} 
                alt={`${company} logo`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/Logo.png';
                }}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 truncate max-w-xs">{title || 'Job Title'}</h3>
              <p className="text-sm text-gray-600">{company || 'Company Name'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {category}
            </span>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center text-sm text-gray-600">
            <FaMapMarkerAlt className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span className="truncate">{location || 'Location'}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <FaClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span>{new Date().toISOString().split('T')[0]}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <FaMoneyBillWave className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span className="truncate">{salary || 'Salary'}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {salaryType === 'crypto' ? 'Paid in ADA' : 'Paid in Fiat'}
            </span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {type || 'Full-time'}
            </span>
            <span className="text-sm text-gray-500">
              {location === 'Remote' ? '🌍 Remote' : '📍 On-site'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCardPreview;
