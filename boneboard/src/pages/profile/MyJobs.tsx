import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageTransition from '../../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import { JobService, Job } from '../../services/jobService';
import { toast } from 'react-toastify';
import { FaTrash, FaEye, FaEdit, FaPause, FaPlay, FaClock, FaSave, FaTimes, FaMapMarkerAlt, FaCoins, FaDollarSign, FaLink, FaTwitter, FaDiscord, FaEnvelope, FaCheck, FaMoneyBillWave, FaBuilding } from 'react-icons/fa';

// Category mapping to match JobListings
const JOB_CATEGORIES = [
  { id: 'development', name: 'Development' },
  { id: 'design', name: 'Design & Creative' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'community', name: 'Community & Social' },
  { id: 'business', name: 'Business Development' },
  { id: 'content', name: 'Content Creation' },
  { id: 'defi', name: 'DeFi & Finance' },
  { id: 'nft', name: 'NFT & Digital Assets' },
  { id: 'security', name: 'Security & Auditing' },
  { id: 'research', name: 'Research & Analysis' },
];

// Helper function to get expiry time string
const getExpiryTimeString = (expiryDate: string): string => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffInMs = expiry.getTime() - now.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.ceil(diffInDays / 7);
  const diffInMonths = Math.ceil(diffInDays / 30);

  if (diffInDays <= 0) {
    return 'Expired';
  } else if (diffInDays === 1) {
    return 'in 1 day';
  } else if (diffInDays < 7) {
    return `in ${diffInDays} days`;
  } else if (diffInWeeks === 1) {
    return 'in 1 week';
  } else if (diffInWeeks < 4) {
    return `in ${diffInWeeks} weeks`;
  } else if (diffInMonths === 1) {
    return 'in 1 month';
  } else {
    return `in ${diffInMonths} months`;
  }
};

const MyJobs: React.FC = () => {
  const { isConnected, walletAddress } = useWallet();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Job>>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);


  const clearSelectedJob = () => {
    setSelectedJob(null);
    setEditingJob(null);
    setEditFormData({});
  };

  useEffect(() => {
    const loadJobs = async () => {
      if (isConnected && walletAddress) {
        try {
          const userJobs = await JobService.getUserJobs(walletAddress);
          setJobs(userJobs);
        } catch (error) {
          console.error('Error loading user jobs:', error);
          setJobs([]);
        }
      } else {
        setJobs([]);
      }
      setLoading(false);
    };
    loadJobs();
  }, [isConnected, walletAddress]);

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job listing?')) {
      try {
        const success = await JobService.deleteJob(jobId);
        if (success) {
          setJobs(jobs.filter(job => job.id !== jobId));
          toast.success('Job listing deleted successfully!');
        } else {
          toast.error('Failed to delete job listing.');
        }
      } catch (error) {
        console.error('Error deleting job:', error);
        toast.error('Failed to delete job listing.');
      }
    }
  };

  const handlePauseJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      const newStatus = job.status === 'confirmed' ? 'paused' : 'confirmed';
      try {
        const success = await JobService.updateJob(jobId, { status: newStatus as any });
        if (success) {
          setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus as any } : j));
          toast.success(`Job ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully!`);
        } else {
          toast.error('Failed to update job status.');
        }
      } catch (error) {
        console.error('Error updating job status:', error);
        toast.error('Failed to update job status.');
      }
    }
  };


  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setEditingJob(job);
    setEditFormData({
      title: job.title,
      company: job.company,
      description: job.description,
      salary: job.salary,
      salaryType: job.salaryType,
      category: job.category,
      type: job.type,
      contactEmail: job.contactEmail,
      howToApply: job.howToApply,
      workArrangement: job.workArrangement,
      requiredSkills: job.requiredSkills,
      additionalInfo: job.additionalInfo,
      website: job.website || job.companyWebsite,
      twitter: job.twitter,
      discord: job.discord
    });
  };

  const handleSaveEdit = async () => {
    if (!editingJob || !editFormData.title || !editFormData.company || !editFormData.description) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      const success = await JobService.updateJob(editingJob.id, editFormData);
      if (success) {
        const updatedJob = { ...editingJob, ...editFormData };
        setJobs(jobs.map(j => j.id === editingJob.id ? updatedJob : j));
        
        // Update selectedJob if it's the same job being edited
        if (selectedJob && selectedJob.id === editingJob.id) {
          setSelectedJob(updatedJob);
        }
        
        setEditingJob(null);
        setEditFormData({});
        toast.success('Job updated successfully!');
      } else {
        toast.error('Failed to update job.');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job.');
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setEditFormData({});
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading your job listings...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Job Listings</h1>
                <p className="mt-1 text-sm text-gray-500">Manage your job postings and applications</p>
              </div>
              <Link
                to="/post-job"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Post New Job
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {!isConnected ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-center py-12"
              >
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Connect Your Wallet</h3>
                <p className="mt-1 text-sm text-gray-500">Connect your wallet to view and manage your job listings.</p>
              </motion.div>
            ) : jobs.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-center py-12"
              >
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No job listings yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by posting a new job.</p>
                <div className="mt-6">
                  <Link
                    to="/post-job"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Post a Job
                  </Link>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {jobs.map((job, index) => (
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
                      onClick={() => setSelectedJob(job)}
                      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-4 flex-1 min-w-0">
                            {/* Company Logo */}
                            <div className="flex-shrink-0">
                              {job.companyLogo ? (
                                <img 
                                  className="h-12 w-12 rounded-full border border-gray-200 object-cover" 
                                  src={job.companyLogo} 
                                  alt={`${job.company} logo`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="h-12 w-12 rounded-full border border-gray-200 bg-blue-100 flex items-center justify-center"><svg class="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full border border-gray-200 bg-blue-100 flex items-center justify-center">
                                  <FaBuilding className="h-6 w-6 text-blue-600" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold flex items-center">
                                <span className="truncate">{job.title}</span>
                                {job.featured && <span className="ml-2 text-blue-500 text-xl flex-shrink-0" title="Featured Job">★</span>}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                {job.company}
                              </p>
                              {/* Job Details with Icons */}
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                                <div className="flex items-center">
                                  <FaMapMarkerAlt className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                                  <span>{job.workArrangement === 'remote' ? 'Remote' : job.workArrangement === 'hybrid' ? 'Hybrid' : 'On-site'}</span>
                                </div>
                                <div className="flex items-center">
                                  <FaClock className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                                  <span>{job.type}</span>
                                </div>
                                <div className="flex items-center">
                                  {job.salaryType === 'ADA' ? (
                                    <FaCoins className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                                  ) : (
                                    <FaDollarSign className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                                  )}
                                  <span>{job.salaryType === 'ADA' ? 'Paid in ADA' : 'Paid in Fiat'}</span>
                                </div>
                                <div className="flex items-center">
                                  <FaMoneyBillWave className="flex-shrink-0 mr-1 h-3 w-3 text-gray-400" />
                                  <span>{job.salary}</span>
                                </div>
                              </div>
                              {job.featured && (
                                <div className="flex items-center mb-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                    <span className="text-blue-600 mr-1 text-sm">★</span>
                                    Featured
                                  </span>
                                </div>
                              )}
                              {new Date(job.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                                    <FaClock className="h-3 w-3 mr-1" />
                                    Expires Soon
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJob(job);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="View job details"
                            >
                              <FaEye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditJob(job);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit job"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePauseJob(job.id);
                              }}
                              className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                              title={job.status === 'confirmed' ? 'Pause job' : 'Resume job'}
                            >
                              {job.status === 'confirmed' ? <FaPause className="h-4 w-4" /> : <FaPlay className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteJob(job.id);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete job"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {job.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Posted {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-500">
                          Expires {getExpiryTimeString(job.expiresAt)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>


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
                    <h2 className="text-lg font-medium text-gray-900">
                      {editingJob ? 'Edit Job Details' : 'Job Details'}
                    </h2>
                    <div className="flex items-center gap-2">
                      {/* Edit Mode Toggle */}
                      {editingJob ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center transition-all duration-200"
                          >
                            <FaSave className="h-3 w-3 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEditJob(selectedJob)}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-110"
                          title="Edit job"
                        >
                          <FaEdit className="h-4 w-4 text-gray-600" />
                        </button>
                      )}
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
                  <div className="p-6">
                    {/* Job Header */}
                    <div className="flex items-start">
                      <div className="flex-1">
                        {editingJob ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editFormData.title || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                              className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-200 focus:border-blue-500 outline-none w-full"
                              placeholder="Job Title"
                            />
                            <input
                              type="text"
                              value={editFormData.company || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, company: e.target.value }))}
                              className="text-lg text-gray-600 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none w-full"
                              placeholder="Company Name"
                            />
                            <select
                              value={editFormData.category || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 focus:border-blue-500 outline-none"
                            >
                              <option value="development">Development</option>
                              <option value="design">Design & Creative</option>
                              <option value="marketing">Marketing</option>
                              <option value="community">Community & Social</option>
                              <option value="business">Business Development</option>
                              <option value="content">Content Creation</option>
                              <option value="defi">DeFi & Finance</option>
                              <option value="nft">NFT & Digital Assets</option>
                              <option value="security">Security & Auditing</option>
                              <option value="research">Research & Analysis</option>
                            </select>
                          </div>
                        ) : (
                          <div>
                            <h1 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h1>
                            <div className="mt-2">
                              <p className="text-lg text-gray-600">{selectedJob.company}</p>
                              <div className="mt-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                                  {JOB_CATEGORIES.find(cat => cat.id === selectedJob.category)?.name || selectedJob.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        <div className="h-20 w-20 rounded-full border border-gray-200 flex items-center justify-center bg-white">
                          {selectedJob.companyLogo ? (
                            <img 
                              className="h-full w-full rounded-full object-cover" 
                              src={selectedJob.companyLogo}
                              alt={`${selectedJob.company} logo`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="text-blue-600 text-2xl"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                                }
                              }}
                            />
                          ) : (
                            <FaBuilding className="text-blue-600 text-2xl" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Job Details Bar */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                          {editingJob ? (
                            <select
                              value={editFormData.workArrangement || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, workArrangement: e.target.value as any }))}
                              className="text-sm bg-transparent border border-gray-200 rounded px-2 py-1 focus:border-blue-500 outline-none"
                            >
                              <option value="remote">Remote</option>
                              <option value="hybrid">Hybrid</option>
                              <option value="onsite">On-site</option>
                            </select>
                          ) : (
                            <span>{selectedJob.workArrangement === 'remote' ? 'Remote' : selectedJob.workArrangement === 'hybrid' ? 'Hybrid' : 'On-site'}</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <FaClock className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                          {editingJob ? (
                            <select
                              value={editFormData.type || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
                              className="text-sm bg-transparent border border-gray-200 rounded px-2 py-1 focus:border-blue-500 outline-none"
                            >
                              <option value="Full-time">Full-time</option>
                              <option value="Part-time">Part-time</option>
                              <option value="Contract">Contract</option>
                              <option value="Freelance">Freelance</option>
                            </select>
                          ) : (
                            <span>{selectedJob.type}</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <FaMoneyBillWave className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                          {editingJob ? (
                            <input
                              type="text"
                              value={editFormData.salary || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, salary: e.target.value }))}
                              className="text-sm bg-transparent border border-gray-200 rounded px-2 py-1 focus:border-blue-500 outline-none w-32"
                              placeholder="Salary"
                            />
                          ) : (
                            <span>{selectedJob.salary}</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          {editingJob ? (
                            <>
                              <FaCoins className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                              <select
                                value={editFormData.salaryType || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, salaryType: e.target.value }))}
                                className="text-sm bg-transparent border border-gray-200 rounded px-2 py-1 focus:border-blue-500 outline-none"
                              >
                                <option value="FIAT">Paid in Fiat</option>
                                <option value="ADA">Paid in ADA</option>
                              </select>
                            </>
                          ) : (
                            <>
                              {selectedJob.salaryType === 'ADA' ? (
                                <FaCoins className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                              ) : (
                                <FaDollarSign className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                              )}
                              <span>{selectedJob.salaryType === 'ADA' ? 'Paid in ADA' : 'Paid in Fiat'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job Content */}
                  <div className="px-6 py-6 space-y-8">
                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Job Description</h4>
                      {editingJob ? (
                        <textarea
                          value={editFormData.description || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Describe the role, responsibilities, and requirements..."
                        />
                      ) : (
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <p className="whitespace-pre-line leading-relaxed">{selectedJob.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Required Skills */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Required Skills</h4>
                      {editingJob ? (
                        <textarea
                          value={editFormData.requiredSkills ? (Array.isArray(editFormData.requiredSkills) ? editFormData.requiredSkills.join(', ') : editFormData.requiredSkills) : ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, requiredSkills: e.target.value.split(',').map(skill => skill.trim()) }))}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Enter skills separated by commas (e.g., React, TypeScript, Node.js)"
                        />
                      ) : selectedJob?.requiredSkills && selectedJob.requiredSkills.length > 0 ? (
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
                      ) : (
                        <p className="text-sm text-gray-500">No skills specified</p>
                      )}
                    </div>

                    {/* Additional Information */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Additional Information</h4>
                      {editingJob ? (
                        <textarea
                          value={editFormData.additionalInfo ? (Array.isArray(editFormData.additionalInfo) ? editFormData.additionalInfo.join('\n') : editFormData.additionalInfo) : ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, additionalInfo: e.target.value.split('\n').map(info => info.trim()) }))}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Enter additional information (one item per line)"
                        />
                      ) : selectedJob.additionalInfo && selectedJob.additionalInfo.length > 0 ? (
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <p className="whitespace-pre-line leading-relaxed">
                            {selectedJob.additionalInfo
                              .filter(info => info && info.trim() !== '')
                              .map(info => info.replace(/[{}"\\/\s]+/g, ' ').trim())
                              .join('\n')
                            }
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No additional information provided</p>
                      )}
                    </div>

                    {/* How to Apply */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">How to Apply</h4>
                      {editingJob ? (
                        <textarea
                          value={editFormData.howToApply || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, howToApply: e.target.value }))}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Instructions for applicants..."
                        />
                      ) : (
                        <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                          <div className="prose prose-sm max-w-none text-gray-700">
                            <p className="leading-relaxed">{selectedJob.howToApply}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col space-y-4">
                    {/* Links */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Company Website</h4>
                      {editingJob ? (
                        <input
                          type="url"
                          value={editFormData.website || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="https://company.com"
                        />
                      ) : selectedJob.website ? (
                        <a 
                          href={selectedJob.website.startsWith('http') ? selectedJob.website : `https://${selectedJob.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FaLink className="flex-shrink-0 mr-2 h-4 w-4" />
                          <span>{selectedJob.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}</span>
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500">No website provided</p>
                      )}
                    </div>
                    
                    {/* Contact */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact Email</h4>
                      {editingJob ? (
                        <input
                          type="email"
                          value={editFormData.contactEmail || ''}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="jobs@company.com"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-4">
                          {selectedJob.twitter && (
                            <a 
                              href={`https://twitter.com/${selectedJob.twitter.startsWith('@') ? selectedJob.twitter.substring(1) : selectedJob.twitter}`} 
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
                              href={(selectedJob.discord as any)?.inviteUrl || selectedJob.discord} 
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default MyJobs;
