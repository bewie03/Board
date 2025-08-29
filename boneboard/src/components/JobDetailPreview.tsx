import React from 'react';
import { FaMapMarkerAlt, FaMoneyBillWave, FaClock, FaTwitter, FaDiscord, FaEnvelope, FaLink } from 'react-icons/fa';

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
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 break-words">
              {title || 'Job Title'}
            </h3>
            <div className="mt-1">
              <p className="text-sm text-gray-500 break-words">
                {company || 'Company Name'}
              </p>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {getCategoryName(category) || 'Uncategorized'}
                </span>
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            {logo ? (
              <img 
                className="h-16 w-16 rounded-full border border-gray-200 object-cover" 
                src={logo} 
                alt={`${company || 'Company'} logo`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="h-16 w-16 rounded-full border border-gray-200 bg-gray-100"></div>';
                  }
                }}
              />
            ) : (
              <div className="h-16 w-16 rounded-full border border-gray-200 bg-gray-100"></div>
            )}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
            <span className="flex items-center min-w-0">
              <FaMapMarkerAlt className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              <span className="truncate">{workArrangement === 'remote' ? 'Remote' : workArrangement === 'hybrid' ? 'Hybrid' : 'On-site'}</span>
            </span>
            <span className="flex items-center min-w-0">
              <FaMoneyBillWave className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              <span className="break-words">{salary || 'Salary'}</span>
            </span>
            <span className="flex items-center min-w-0">
              <FaClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
              <span className="truncate">{type || 'Full-time'}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="px-6 py-5 w-full max-w-full overflow-hidden">
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Job Description</h4>
          <p className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">{description || 'Job description will appear here...'}</p>
        </div>
        
        {requiredSkills.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Required Skills</h4>
            <div className="flex flex-wrap gap-2">
              {requiredSkills.map((skill, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 break-words max-w-full"
                >
                  <span className="break-words">{skill}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        
        {additionalInfo.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Additional Information</h4>
            <div className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {additionalInfo.join('\n')}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">How to Apply</h4>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">
              {howToApply || 'Application instructions will appear here...'}
            </p>
          </div>
        </div>

        {(website || twitter || discord || contactEmail) && (
          <div className="mt-6 pt-4 border-t border-gray-200 px-6 pb-6">
            {/* Links section */}
            {website && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">LINKS</h4>
                <div className="flex items-center">
                  <a 
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <FaLink className="flex-shrink-0 mr-2 h-3.5 w-3.5" />
                    <span className="break-all">{website.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                  </a>
                </div>
              </div>
            )}
            
            {/* Contact section */}
            {(twitter || discord || contactEmail) && (
              <>
                <h4 className="text-sm font-medium text-gray-500 mb-3">CONTACT</h4>
                <div className="flex flex-wrap gap-4">
                  {twitter && (
                    <a 
                      href={`https://twitter.com/${twitter.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-900 hover:text-blue-600"
                      title="Twitter"
                    >
                      <FaTwitter className="h-4 w-4 mr-1.5" />
                      <span>X</span>
                    </a>
                  )}
                  
                  {discord && (
                    <a 
                      href={discord} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-gray-900 hover:text-indigo-600"
                      title="Discord"
                    >
                      <FaDiscord className="h-4 w-4 mr-1.5" />
                      <span>Discord</span>
                    </a>
                  )}
                  
                  {contactEmail && (
                    <button 
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          await navigator.clipboard.writeText(contactEmail.trim());
                          // Change button text to show copied state
                          const button = e.currentTarget;
                          const originalContent = button.innerHTML;
                          button.innerHTML = `
                            <span class="inline-flex items-center">
                              <FaEnvelope className="h-4 w-4 mr-1.5" />
                              <span class="text-green-600">Copied!</span>
                            </span>
                          `;
                          // Revert back after 2 seconds
                          setTimeout(() => {
                            button.innerHTML = originalContent;
                          }, 2000);
                        } catch (err) {
                          console.error('Failed to copy email: ', err);
                          // Fallback to mailto if clipboard fails
                          window.location.href = `mailto:${contactEmail.trim()}`;
                        }
                      }}
                      className="inline-flex items-center text-sm text-gray-900 hover:text-blue-600 focus:outline-none"
                      title={`Copy email to clipboard: ${contactEmail}`}
                    >
                      <FaEnvelope className="h-4 w-4 mr-1.5" />
                      <span>Email</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailPreview;
