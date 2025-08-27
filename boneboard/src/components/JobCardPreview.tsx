import React from 'react';
import { FaMapMarkerAlt, FaMoneyBillWave, FaClock } from 'react-icons/fa';

export interface JobCardPreviewProps {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  category: string;
  logo?: string;
}

const JobCardPreview: React.FC<JobCardPreviewProps> = ({
  title,
  company,
  location,
  type,
  salary,
  category,
  logo
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
        
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="flex items-center text-sm text-gray-600">
            <FaMapMarkerAlt className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span className="truncate">{location || 'Location'}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <FaMoneyBillWave className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span className="truncate">{salary}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <FaClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
            <span>{type || 'Full-time'}</span>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default JobCardPreview;
