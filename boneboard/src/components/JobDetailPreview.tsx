import React from 'react';
import { FaXTwitter } from 'react-icons/fa6';
import { FaMapMarkerAlt, FaMoneyBillWave, FaClock, FaDiscord, FaEnvelope, FaLink } from 'react-icons/fa';

export interface JobDetailPreviewProps {
  title: string;
  company: string;
  type: string;
  category: string;
  salary: string;
  logo?: string;
  workArrangement: 'remote' | 'hybrid' | 'onsite';
  description: string;
  requiredSkills: string[];
  additionalInfo: string[];
  howToApply: string;
  twitter?: string;
  discord?: string;
  website?: string;
  contactEmail?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
}

// Helper function to format text (e.g., 'full-time' to 'Full-time')
const formatText = (text: string) => {
  if (!text) return '';
  return text
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const JobDetailPreview: React.FC<JobDetailPreviewProps> = ({
  title,
  company,
  type,
  salary,
  logo,
  workArrangement,
  description,
  requiredSkills,
  additionalInfo,
  howToApply,
  twitter,
  discord,
  website,
  contactEmail,
  isVerified = false,
  isFeatured = false
}) => {
  return (
    <div className={`w-full max-w-full overflow-hidden ${isFeatured ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="p-6">
        {/* Header Section */}
        <div className="flex gap-6 mb-6">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logo ? (
              <img 
                src={logo} 
                alt={`${company || 'Company'} logo`}
                className="w-20 h-20 rounded-xl object-cover border-2 border-gray-100 shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200';
                    placeholder.innerHTML = '<span class="text-gray-400 text-base font-medium">No Logo</span>';
                    parent.replaceChild(placeholder, target);
                  }
                }}
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                <span className="text-gray-400 text-base font-medium">No Logo</span>
              </div>
            )}
          </div>
          {/* Title and Company */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {title || 'Job Title'}
            </h2>
            
            <div className="text-xl text-gray-600 mb-4 flex items-center gap-3">
              {company || 'Company Name'}
              {isVerified && (
                <div className="inline-flex items-center">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Job Details Cards */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FaMapMarkerAlt className="text-blue-600 text-lg" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Work Style</p>
              <p className="font-semibold text-gray-900">
                {workArrangement === 'remote' ? 'Remote' : workArrangement === 'hybrid' ? 'Hybrid' : 'On-site'}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FaClock className="text-blue-600 text-lg" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Job Type</p>
              <p className="font-semibold text-gray-900">{formatText(type) || 'Not specified'}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FaMoneyBillWave className="text-blue-600 text-lg" />
              </div>
              <p className="text-sm text-gray-500 mb-1">Salary</p>
              <p className="font-semibold text-gray-900">{salary || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 py-2 w-full max-w-full overflow-hidden">
        <div className="mb-6 max-w-full overflow-hidden">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Job Description</h4>
          <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere word-break-break-all max-w-full" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>{description || 'Job description will appear here...'}</div>
        </div>
        
        {/* Required Skills */}
        {requiredSkills && requiredSkills.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Required Skills</h4>
            <div className="flex flex-wrap gap-2">
              {requiredSkills
                .filter(skill => skill && skill.trim() !== '')
                .map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {skill.replace(/[{}"\\\s]+/g, ' ').trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {additionalInfo.length > 0 && (
          <div className="mb-6 mt-6">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Additional Information</h4>
            <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
              {additionalInfo
                .filter(info => info && info.trim() !== '')
                .map((info, index) => (
                  <div key={index} className="mb-2">
                    {info.replace(/[{}"\\\s]+/g, ' ').trim()}
                  </div>
                ))
              }
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">How to Apply</h4>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
              {howToApply || 'Application instructions will appear here...'}
            </div>
          </div>
        </div>

        {/* Contact & Links */}
        {(website || twitter || discord || contactEmail) && (
          <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Contact & Links</h4>
            <div className="flex flex-wrap gap-2">
              {website && (
                <a 
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                >
                  <FaLink className="h-4 w-4 mr-2" />
                  <span>Website</span>
                </a>
              )}
              
              {twitter && (
                <a 
                  href={`https://twitter.com/${twitter.startsWith('@') ? twitter.substring(1) : twitter}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                >
                  <FaXTwitter className="h-4 w-4 mr-2" />
                  <span>Twitter</span>
                </a>
              )}
              
              {discord && (
                <a 
                  href={discord} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                >
                  <FaDiscord className="h-4 w-4 mr-2" />
                  <span>Discord</span>
                </a>
              )}
              
              {contactEmail && (
                <a 
                  href={`mailto:${contactEmail}`} 
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                >
                  <FaEnvelope className="h-4 w-4 mr-2" />
                  <span>Email</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailPreview;
