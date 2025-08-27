import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBookmark, FaRegBookmark, FaMapMarkerAlt, FaMoneyBillWave, FaClock, FaCoins, FaDollarSign, FaTimes, FaBuilding, FaTwitter, FaDiscord, FaEnvelope, FaLink, FaCheck } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { JobService } from '../services/jobService';
import PageTransition from '../components/PageTransition';
import { JOB_CATEGORIES } from '../constants/categories';

// Helper function to get relative time
const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 60) {
    return diffInMinutes <= 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  } else if (diffInDays < 7) {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

interface Job {
  isProjectVerified?: boolean;
  id: string;
  title: string;
  company: string;
  description: string;
  salary: string;
  salaryType: string;
  category: string;
  type: string;
  contactEmail: string;
  howToApply: string;
  workArrangement?: string;
  requiredSkills?: string[];
  additionalInfo?: string[];
  website?: string;
  twitter?: string;
  discord?: string;
  logo: string | null;
  posted: string;
  timestamp: number;
  companyLogo?: string | null;
  duration?: number;
  paymentAmount?: number;
  paymentCurrency?: string;
  walletAddress?: string;
  status?: string;
  txHash?: string;
}


const SavedJobs: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [savedJobsData, setSavedJobsData] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);

  // Load saved jobs for the connected wallet
  useEffect(() => {
    if (isConnected && walletAddress) {
      try {
        const userSavedJobs = JSON.parse(localStorage.getItem(`savedJobs_${walletAddress}`) || '[]');
        setSavedJobs(userSavedJobs);
      } catch {
        setSavedJobs([]);
      }
    } else {
      setSavedJobs([]);
    }
  }, [isConnected, walletAddress]);

  // Fetch all jobs and filter saved ones
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const activeJobs = await JobService.getActiveJobs();
        const fetchedJobs = activeJobs.map(job => ({
          ...job,
          logo: job.companyLogo || null,
          posted: new Date(job.timestamp).toISOString(),
          requiredSkills: (() => {
            if (Array.isArray(job.requiredSkills)) return job.requiredSkills;
            if (typeof job.requiredSkills === 'string' && job.requiredSkills) {
              const skillsString = job.requiredSkills as string;
              try {
                return skillsString.startsWith('[') ? JSON.parse(skillsString) : [skillsString];
              } catch {
                return [skillsString];
              }
            }
            return [];
          })(),
          additionalInfo: (() => {
            if (Array.isArray(job.additionalInfo)) return job.additionalInfo;
            if (typeof job.additionalInfo === 'string' && job.additionalInfo) {
              const infoString = job.additionalInfo as string;
              try {
                return infoString.startsWith('[') ? JSON.parse(infoString) : [infoString];
              } catch {
                return [infoString];
              }
            }
            return [];
          })(),
          workArrangement: job.workArrangement || 'remote'
        }));
        setJobs(fetchedJobs);
        
        // Filter saved jobs
        const savedJobsFiltered = fetchedJobs.filter(job => savedJobs.includes(job.id));
        setSavedJobsData(savedJobsFiltered);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (savedJobs.length > 0) {
      fetchJobs();
    } else {
      setLoading(false);
    }
  }, [savedJobs]);

  const toggleSaveJob = (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isConnected || !walletAddress) return;

    setSavedJobs(prev => {
      const newSavedJobs = prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId];
      
      // Update localStorage
      localStorage.setItem(`savedJobs_${walletAddress}`, JSON.stringify(newSavedJobs));
      
      return newSavedJobs;
    });

    // Update saved jobs data
    setSavedJobsData(prev => {
      if (savedJobs.includes(jobId)) {
        return prev.filter(job => job.id !== jobId);
      } else {
        const jobToAdd = jobs.find(job => job.id === jobId);
        return jobToAdd ? [...prev, jobToAdd] : prev;
      }
    });
  };

  const selectJob = (jobId: string) => {
    const job = savedJobsData.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
    }
  };

  const clearSelectedJob = () => {
    setSelectedJob(null);
  };

  const clearAllSavedJobs = () => {
    if (walletAddress) {
      setSavedJobs([]);
      setSavedJobsData([]);
      localStorage.removeItem(`savedJobs_${walletAddress}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Saved Jobs</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your bookmarked job opportunities
          </p>
        </div>

        {!isConnected ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-12 text-center">
              <FaRegBookmark className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-500 mb-6">
                Connect your wallet to view and manage your saved jobs.
              </p>
              <button
                onClick={() => navigate('/jobs')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Browse Jobs
              </button>
            </div>
          </div>
        ) : savedJobsData.length === 0 ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-12 text-center">
              <FaRegBookmark className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Jobs</h3>
              <p className="text-gray-500 mb-6">
                You haven't saved any jobs yet. Browse available positions and bookmark the ones that interest you.
              </p>
              <button
                onClick={() => navigate('/jobs')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Browse Jobs
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Actions Bar */}
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {savedJobsData.length} Saved Job{savedJobsData.length !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Click on any job to view details
                    </p>
                  </div>
                  <button
                    onClick={clearAllSavedJobs}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FaTimes className="h-4 w-4 mr-2" />
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* Saved Jobs List */}
            <div className="space-y-4">
              {savedJobsData.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.1,
                    ease: 'easeOut'
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectJob(job.id)}
                  className="bg-white shadow rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-300 relative"
                >
                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => toggleSaveJob(job.id, e)}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110"
                  >
                    <FaBookmark className="h-4 w-4 text-blue-600" />
                  </button>
                  
                  <div className="px-6 py-5 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                          {job.title}
                          {job.isProjectVerified && (
                            <div 
                              className="ml-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0"
                              title="Verified project"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </h3>
                        <div className="mt-1">
                          <p className="text-sm text-gray-500">{job.company}</p>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {JOB_CATEGORIES.find(cat => cat.id === job.category)?.name || job.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {job.logo ? (
                          <img 
                            className="h-16 w-16 rounded-full border border-gray-200 object-cover" 
                            src={job.logo} 
                            alt={`${job.company} logo`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`h-16 w-16 rounded-full border border-gray-200 bg-blue-100 flex items-center justify-center ${job.logo ? 'hidden' : ''}`}>
                          <FaBuilding className="h-8 w-8 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          <FaMapMarkerAlt className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {job.workArrangement === 'remote' ? 'Remote' : job.workArrangement === 'hybrid' ? 'Hybrid' : job.workArrangement === 'onsite' ? 'On-site' : 'Remote'}
                        </span>
                        <span className="flex items-center">
                          <FaMoneyBillWave className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {job.salary}
                        </span>
                        <span className="flex items-center">
                          <FaClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {job.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4">
                    <p className="text-sm text-gray-700 line-clamp-3">{job.description}</p>
                    
                    
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Posted {getTimeAgo(job.posted)}</span>
                        <span className="text-xs text-blue-600 font-medium">Click to view details →</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* Job Details Slide-out Panel */}
        <AnimatePresence>
          {selectedJob && (
            <>
              {/* Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={clearSelectedJob}
              />
              
              {/* Slide-out Panel */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-[60]" 
                style={{ top: '64px' }}
              >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Job Details</h2>
                    <div className="flex items-center gap-2">
                      {/* Bookmark Button */}
                      <button
                        onClick={(e) => toggleSaveJob(selectedJob.id, e)}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-110"
                      >
                        {savedJobs.includes(selectedJob.id) ? (
                          <FaBookmark className="h-4 w-4 text-blue-600" />
                        ) : (
                          <FaRegBookmark className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                        )}
                      </button>
                      {/* Close Button */}
                      <button
                        onClick={clearSelectedJob}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <FaTimes className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  {/* Job Header */}
                  <div className="px-6 py-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h1>
                        <div className="mt-2">
                          <p className="text-lg text-gray-600">{selectedJob.company}</p>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {JOB_CATEGORIES.find(cat => cat.id === selectedJob.category)?.name || selectedJob.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        {selectedJob.logo ? (
                          <img 
                            className="h-20 w-20 rounded-full border border-gray-200 object-cover" 
                            src={selectedJob.logo} 
                            alt={`${selectedJob.company} logo`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`h-20 w-20 rounded-full border border-gray-200 bg-blue-100 flex items-center justify-center ${selectedJob.logo ? 'hidden' : ''}`}>
                          <FaBuilding className="h-10 w-10 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Job Meta Info */}
                    <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="flex-shrink-0 mr-3 h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          {selectedJob.workArrangement === 'remote' ? 'Remote' : selectedJob.workArrangement === 'hybrid' ? 'Hybrid' : selectedJob.workArrangement === 'onsite' ? 'On-site' : 'Remote'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FaClock className="flex-shrink-0 mr-3 h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">{selectedJob.type}</span>
                      </div>
                      <div className="flex items-center">
                        <FaMoneyBillWave className="flex-shrink-0 mr-3 h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">{selectedJob.salary}</span>
                      </div>
                      <div className="flex items-center">
                        {selectedJob.salaryType === 'ADA' ? (
                          <FaCoins className="flex-shrink-0 mr-3 h-4 w-4 text-gray-400" />
                        ) : (
                          <FaDollarSign className="flex-shrink-0 mr-3 h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-gray-700">
                          {selectedJob.salaryType === 'ADA' ? 'Paid in ADA' : 'Paid in Fiat'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Job Content */}
                  <div className="px-6 py-6 space-y-8">
                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Job Description</h4>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <p className="leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
                      </div>
                    </div>

                    {/* Required Skills */}
                    {selectedJob?.requiredSkills && selectedJob.requiredSkills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Required Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.requiredSkills
                            .filter(skill => skill && skill.trim() !== '')
                            .map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {skill.replace(/[{}"\\/\s]+/g, ' ').trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Information */}
                    {selectedJob.additionalInfo && selectedJob.additionalInfo.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Additional Information</h4>
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <p className="whitespace-pre-line leading-relaxed">
                            {selectedJob.additionalInfo
                              .filter(info => info && info.trim() !== '')
                              .map(info => info.replace(/[{}"\\/\s]+/g, ' ').trim())
                              .join('\n')
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {/* How to Apply */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">How to Apply</h4>
                      <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <p className="leading-relaxed">{selectedJob.howToApply}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col space-y-4">
                    {/* Links */}
                    {selectedJob.website && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Company Website</h4>
                        <a 
                          href={selectedJob.website.startsWith('http') ? selectedJob.website : `https://${selectedJob.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FaLink className="flex-shrink-0 mr-2 h-4 w-4" />
                          <span>{selectedJob.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                        </a>
                      </div>
                    )}
                    
                    {/* Contact */}
                    {(selectedJob.twitter || selectedJob.discord || selectedJob.contactEmail) && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact</h4>
                        <div className="flex flex-wrap gap-4">
                          {selectedJob.twitter && (
                            <a 
                              href={`https://twitter.com/${selectedJob.twitter.replace('@', '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            >
                              <FaTwitter className="h-4 w-4 mr-2" />
                              <span>X (Twitter)</span>
                            </a>
                          )}
                          
                          {selectedJob.discord && (
                            <a 
                              href={selectedJob.discord} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                            >
                              <FaDiscord className="h-4 w-4 mr-2" />
                              <span>Discord</span>
                            </a>
                          )}
                          
                          {selectedJob.contactEmail && (
                            <button 
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(selectedJob.contactEmail!);
                                  setEmailCopied(true);
                                  setTimeout(() => setEmailCopied(false), 2000);
                                } catch (err) {
                                  window.location.href = `mailto:${selectedJob.contactEmail}`;
                                }
                              }}
                              className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              {emailCopied ? (
                                <>
                                  <FaCheck className="h-4 w-4 mr-2 text-green-600" />
                                  <span className="text-green-600">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <FaEnvelope className="h-4 w-4 mr-2" />
                                  <span>Email</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
};

export default SavedJobs;
