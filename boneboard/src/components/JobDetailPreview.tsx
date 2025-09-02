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
}

// Helper function to format text (e.g., 'full-time' to 'Full-time')
const formatText = (text: string) => {
  if (!text) return '';
  return text
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
};

// Helper function to get category name from ID
const getCategoryName = (categoryId: string) => {
  const categories: Record<string, string> = {
    'development': 'Development',
    'design': 'Design & Creative',
    'marketing': 'Marketing',
    'community': 'Community & Social',
    'business': 'Business Development',
    'content': 'Content Creation',
    'defi': 'DeFi & Finance',
    'nft': 'NFT & Digital Assets',
    'security': 'Security & Auditing',
    'research': 'Research & Analysis',
  };
  return categories[categoryId] || formatText(categoryId);
};

const JobDetailPreview: React.FC<JobDetailPreviewProps> = ({
  title,
  company,
  type,
  category,
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
  contactEmail
}) => {
  return (
    <div className="w-full max-w-full overflow-hidden">
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
            
            <div className="flex items-center gap-3">
              <span className="text-xl text-gray-700 font-medium">{company || 'Company Name'}</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                {getCategoryName(category) || 'Uncategorized'}
              </span>
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
      <div className="px-6 py-5 w-full max-w-full overflow-hidden">
        <div className="mb-6 max-w-full overflow-hidden">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Job Description</h4>
          <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere word-break-break-all max-w-full" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>{description || 'Job description will appear here...'}</div>
        </div>
        
        {/* Required Skills */}
        {requiredSkills && requiredSkills.length > 0 && (
          <div>
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
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Additional Information</h4>
            <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
              {additionalInfo.join('\n')}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">How to Apply</h4>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
              {howToApply || 'Application instructions will appear here...'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
          <div className="flex flex-col space-y-4">
            {/* Links */}
            {website && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Company Website</h4>
                <a 
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                >
                  <FaLink className="h-4 w-4 mr-2" />
                  <span>{website.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                </a>
              </div>
            )}
            
            {/* Contact */}
            {(twitter || discord || contactEmail) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact</h4>
                <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
};

export default JobDetailPreview;
