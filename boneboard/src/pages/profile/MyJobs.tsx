import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaEdit, 
  FaTrash, 
  FaPause, 
  FaPlay, 
  FaBuilding, 
  FaClock, 
  FaSave, 
  FaTimes, 
  FaCheck, 
  FaMapMarkerAlt, 
  FaMoneyBillWave, 
  FaLink, 
  FaEnvelope, 
  FaPlus 
} from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { SiDiscord } from 'react-icons/si';
import { Job, JobService } from '../../services/jobService';
import { useWallet } from '../../contexts/WalletContext';
import PageTransition from '../../components/PageTransition';
import CustomSelect from '../../components/CustomSelect';
import { JOB_CATEGORIES } from '../../constants/categories';
import { toast } from 'react-toastify';

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
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expiredJobs, setExpiredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Job>>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showExpiredJobs, setShowExpiredJobs] = useState(false);

  const clearSelectedJob = () => {
    setSelectedJob(null);
    setEditingJob(null);
    setEditFormData({});
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this job listing?')) {
      try {
        const success = await JobService.deleteJob(jobId);
        if (success) {
          setJobs(jobs.filter(job => job.id !== jobId));
          setExpiredJobs(expiredJobs.filter(job => job.id !== jobId));
          toast.success('Job listing deleted successfully!');
          clearSelectedJob();
        } else {
          toast.error('Failed to delete job listing');
        }
      } catch (error) {
        console.error('Error deleting job:', error);
        toast.error('Error deleting job listing');
      }
    }
  };

  const handlePauseJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      try {
        const success = await JobService.updateJob(jobId, { status: 'paused' as any });
        if (success) {
          // Update the job status in the jobs array instead of moving to separate array
          setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'paused' as any } : j));
          toast.success('Job paused successfully!');
        } else {
          toast.error('Failed to pause job.');
        }
      } catch (error) {
        console.error('Error pausing job:', error);
        toast.error('Error pausing job.');
      }
    }
  };


  useEffect(() => {
    const loadJobs = async () => {
      if (isConnected && walletAddress) {
        try {
          const userJobs = await JobService.getUserJobs(walletAddress);
          // Separate active/paused and expired jobs
          const now = new Date();
          const activeJobs = userJobs.filter((job: Job) => {
            const expiresAt = new Date(job.expiresAt);
            return (job.status === 'confirmed' || job.status === 'paused') && expiresAt > now;
          });
          
          const expiredJobsList = userJobs.filter((job: Job) => {
            const expiresAt = new Date(job.expiresAt);
            return job.status === 'confirmed' && expiresAt <= now;
          });
          
          setJobs(activeJobs);
          setExpiredJobs(expiredJobsList);
        } catch (error) {
          console.error('Error loading user jobs:', error);
          setJobs([]);
          setExpiredJobs([]);
        }
      } else {
        setJobs([]);
        setExpiredJobs([]);
      }
      setLoading(false);
    };
    loadJobs();

    // Listen for job posted successfully event to refresh the list
    const handleJobPosted = () => {
      console.log('Job posted successfully, refreshing job list');
      loadJobs();
    };

    window.addEventListener('jobPostedSuccessfully', handleJobPosted);

    return () => {
      window.removeEventListener('jobPostedSuccessfully', handleJobPosted);
    };
  }, [isConnected, walletAddress]);




  const handleUnpauseJob = async (job: Job) => {
    try {
      const success = await JobService.unpauseJob(job.id);
      if (success) {
        // Update the job status in the jobs array
        setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'confirmed' } : j));
        toast.success('Job unpaused successfully!');
      } else {
        toast.error('Failed to unpause job.');
      }
    } catch (error) {
      console.error('Error unpausing job:', error);
      toast.error('Error unpausing job.');
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
      toast.error('Error updating job.');
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setEditFormData({});
  };

  const handleReactivateJob = (job: Job) => {
    navigate('/post-job', { 
      state: { 
        relistingJob: job,
        isRelisting: true 
      } 
    });
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                My Jobs
                <div className="group relative ml-2">
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div className="max-w-xs">
                      <p className="font-semibold mb-1">Job Management:</p>
                      <p>• Pause jobs when interviewing candidates</p>
                      <p>• Unpause if you need to repost the job</p>
                      <p>• Edit job details anytime while active</p>
                      <p>• Jobs auto-expire after 30 days</p>
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                  </div>
                </div>
              </h1>
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
            ) : jobs.length === 0 && expiredJobs.length === 0 ? (
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
                      className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                        job.status === 'paused' 
                          ? 'border-orange-200 opacity-75' 
                          : 'border-gray-200'
                      }`}
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
                                {job.status === 'paused' && (
                                  <span className="ml-2 text-orange-500 text-sm flex-shrink-0" title="Paused Job">PAUSED</span>
                                )}
                                {job.featured && <span className="ml-2 text-blue-500 text-xl flex-shrink-0" title="Featured Job">★</span>}
                              </h3>
                              <div className="text-sm text-gray-600 mb-2 flex items-center">
                                <span>{job.company}</span>
                                {job.isProjectVerified && (
                                  <div 
                                    className="ml-2 w-3 h-3 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0"
                                    title="Verified project"
                                  >
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-1 flex-shrink-0">
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
                                if (job.status === 'paused') {
                                  handleUnpauseJob(job);
                                } else {
                                  handlePauseJob(job.id);
                                }
                              }}
                              className={`p-2 transition-colors ${
                                job.status === 'paused' 
                                  ? 'text-gray-400 hover:text-green-600' 
                                  : 'text-gray-400 hover:text-orange-600'
                              }`}
                              title={job.status === 'paused' ? 'Resume job' : 'Pause job'}
                            >
                              {job.status === 'paused' ? <FaPlay className="h-4 w-4" /> : <FaPause className="h-4 w-4" />}
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
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {job.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className={`text-xs ${job.status === 'paused' ? 'text-orange-500' : 'text-gray-500'}`}>
                            Posted {new Date(job.createdAt).toLocaleDateString()} • 
                            {job.status === 'paused' ? ' Paused' : ` Expires ${getExpiryTimeString(job.expiresAt)}`}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Expired Jobs Section */}
                {expiredJobs.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Expired Jobs ({expiredJobs.length})
                      </h3>
                      <button
                        onClick={() => setShowExpiredJobs(!showExpiredJobs)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {showExpiredJobs ? 'Hide' : 'Show'} Expired Jobs
                      </button>
                    </div>

                    {showExpiredJobs && (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {expiredJobs.map((job, index) => (
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
                            className="bg-white border border-red-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer opacity-75"
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
                                            parent.innerHTML = '<div class="h-12 w-12 rounded-full border border-gray-200 bg-red-100 flex items-center justify-center"><svg class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="h-12 w-12 rounded-full border border-gray-200 bg-red-100 flex items-center justify-center">
                                        <FaBuilding className="h-6 w-6 text-red-600" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold flex items-center">
                                      <span className="truncate">{job.title}</span>
                                      <span className="ml-2 text-red-500 text-sm flex-shrink-0" title="Expired Job">EXPIRED</span>
                                    </h3>
                                    <div className="text-sm text-gray-600 mb-2 flex items-center">
                                      <span>{job.company}</span>
                                      {job.isProjectVerified && (
                                        <div 
                                          className="ml-2 w-3 h-3 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0"
                                          title="Verified project"
                                        >
                                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex space-x-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReactivateJob(job);
                                    }}
                                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                    title="Reactivate job"
                                  >
                                    <FaPlay className="h-4 w-4" />
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
                              
                              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                {job.description}
                              </p>
                              
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-red-500">
                                  Posted {new Date(job.createdAt).toLocaleDateString()} • Expired {new Date(job.expiresAt) < new Date() ? 
                                    `${Math.ceil((new Date().getTime() - new Date(job.expiresAt).getTime()) / (1000 * 60 * 60 * 24))} days ago` : 
                                    'recently'
                                  }
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
              style={{ top: '0px' }}
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
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <div className="px-8 py-6">
                    {/* Header Section */}
                    <div className="flex gap-6 mb-6">
                      {/* Logo */}
                      <div className="flex-shrink-0">
                        {selectedJob.companyLogo ? (
                          <img 
                            src={selectedJob.companyLogo} 
                            alt={`${selectedJob.company} logo`}
                            className="w-20 h-20 rounded-xl object-cover border-2 border-gray-100 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200"><span class="text-gray-400 text-base font-medium">No Logo</span></div>';
                              }
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                            <FaBuilding className="text-gray-400 text-xl" />
                          </div>
                        )}
                      </div>
                      
                      {/* Title and Company */}
                      <div className="flex-1">
                        {editingJob ? (
                          <div className="space-y-4">
                            <input
                              type="text"
                              value={editFormData.title || ''}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                              className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-200 focus:border-blue-500 outline-none w-full pb-2"
                              placeholder="Job Title"
                            />
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={editFormData.company || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, company: e.target.value }))}
                                className="text-xl text-gray-700 font-medium bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none flex-1"
                                placeholder="Company Name"
                              />
                              <CustomSelect
                                options={JOB_CATEGORIES.map(category => ({
                                  value: category.id,
                                  label: category.name
                                }))}
                                value={editFormData.category || ''}
                                onChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 focus:border-blue-500 outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-3">
                              {selectedJob.title}
                            </h2>
                            
                            <div className="text-xl text-gray-600 mb-4 flex items-center gap-3">
                              {selectedJob.company}
                              {selectedJob.isProjectVerified && (
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center" title="Verified Project">
                                  <FaCheck className="text-white text-xs" />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                          <div className="font-semibold text-gray-900">
                          {editingJob ? (
                            <CustomSelect
                              options={[
                                { value: 'remote', label: 'Remote' },
                                { value: 'hybrid', label: 'Hybrid' },
                                { value: 'onsite', label: 'On-site' }
                              ]}
                              value={editFormData.workArrangement || ''}
                              onChange={(value) => setEditFormData(prev => ({ ...prev, workArrangement: value as any }))}
                              className="text-sm bg-transparent border border-gray-200 rounded px-2 py-1 focus:border-blue-500 outline-none"
                            />
                          ) : (
                            <span>{selectedJob.workArrangement === 'remote' ? 'Remote' : selectedJob.workArrangement === 'hybrid' ? 'Hybrid' : 'On-site'}</span>
                          )}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <FaClock className="text-blue-600 text-lg" />
                          </div>
                          <p className="text-sm text-gray-500 mb-1">Job Type</p>
                          <div className="font-semibold text-gray-900">
                          {editingJob ? (
                            <CustomSelect
                              options={[
                                { value: 'Full-time', label: 'Full-time' },
                                { value: 'Part-time', label: 'Part-time' },
                                { value: 'Contract', label: 'Contract' },
                                { value: 'Internship', label: 'Internship' }
                              ]}
                              value={editFormData.type || ''}
                              onChange={(value) => setEditFormData(prev => ({ ...prev, type: value }))}
                              className="text-sm bg-transparent border border-gray-200 rounded px-2 py-1 focus:border-blue-500 outline-none"
                            />
                          ) : (
                            <span>{selectedJob.type}</span>
                          )}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <FaMoneyBillWave className="text-blue-600 text-lg" />
                          </div>
                          <p className="text-sm text-gray-500 mb-1">Salary</p>
                          <div className="font-semibold text-gray-900">
                          {editingJob ? (
                            <div className="flex flex-col items-center space-y-2">
                              <input
                                type="text"
                                value={editFormData.salary || ''}
                                onChange={(e) => {
                                  if (e.target.value.length <= 20) {
                                    setEditFormData(prev => ({ ...prev, salary: e.target.value }));
                                  }
                                }}
                                maxLength={20}
                                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center"
                                placeholder="Amount"
                              />
                              <div className="w-32">
                                <CustomSelect
                                  options={[
                                    { value: 'ADA', label: 'ADA' },
                                    { value: 'FIAT', label: 'FIAT' },
                                    { value: 'Other', label: 'Other' }
                                  ]}
                                  value={editFormData.salaryType || 'FIAT'}
                                  onChange={(value) => setEditFormData(prev => ({ ...prev, salaryType: value as 'ADA' | 'FIAT' | 'Other' }))}
                                  placeholder="Currency"
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <span>{selectedJob.salary}</span>
                          )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job Content */}
                  <div className="p-6 space-y-8">
                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Job Description</h4>
                      {editingJob ? (
                        <div className="space-y-2">
                          <textarea
                            value={editFormData.description || ''}
                            onChange={(e) => {
                              const lines = e.target.value.split('\n');
                              if (lines.length <= 10 && e.target.value.length <= 500) {
                                setEditFormData(prev => ({ ...prev, description: e.target.value }));
                              }
                            }}
                            maxLength={500}
                            rows={10}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Describe the role, responsibilities, and requirements..."
                          />
                          <p className="text-xs text-gray-500 text-right">{(editFormData.description || '').length}/500 characters</p>
                        </div>
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
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {(editFormData.requiredSkills || []).slice(0, 5).map((skill, index) => (
                              <div key={index} className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                <input
                                  type="text"
                                  value={String(skill).replace(/[{}"\\/\s]+/g, ' ').trim()}
                                  onChange={(e) => {
                                    const newSkills = [...(editFormData.requiredSkills || [])];
                                    newSkills[index] = e.target.value.slice(0, 25);
                                    setEditFormData(prev => ({ ...prev, requiredSkills: newSkills }));
                                  }}
                                  maxLength={25}
                                  className="bg-transparent border-none outline-none text-sm font-medium text-blue-700 placeholder-blue-400 w-32"
                                  placeholder="Skill name"
                                />
                                <button
                                  onClick={() => {
                                    const newSkills = (editFormData.requiredSkills || []).filter((_, i) => i !== index);
                                    setEditFormData(prev => ({ ...prev, requiredSkills: newSkills }));
                                  }}
                                  className="ml-2 text-blue-400 hover:text-red-500 transition-colors"
                                >
                                  <FaTimes className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            {(!editFormData.requiredSkills || editFormData.requiredSkills.length < 5) && (
                              <button
                                onClick={() => {
                                  const newSkills = [...(editFormData.requiredSkills || []), ''];
                                  setEditFormData(prev => ({ ...prev, requiredSkills: newSkills }));
                                }}
                                className="flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-3 py-2 text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors"
                              >
                                <FaPlus className="h-3 w-3 mr-1" />
                                <span className="text-sm">Add Skill</span>
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">Max 5 skills, 25 characters each</p>
                        </div>
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
                        <div className="space-y-2">
                          <textarea
                            value={(() => {
                              if (!editFormData.additionalInfo) return '';
                              if (Array.isArray(editFormData.additionalInfo)) {
                                return editFormData.additionalInfo
                                  .map(info => String(info).replace(/[{}"\\/\s]+/g, ' ').trim())
                                  .join('\n');
                              }
                              return String(editFormData.additionalInfo).replace(/[{}"\\/\s]+/g, ' ').trim();
                            })()}
                            onChange={(e) => {
                              const lines = e.target.value.split('\n');
                              if (lines.length <= 10 && e.target.value.length <= 400) {
                                setEditFormData(prev => ({ ...prev, additionalInfo: lines.map(info => info.trim()) }));
                              }
                            }}
                            maxLength={400}
                            rows={10}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Enter additional information (one item per line)"
                          />
                          <p className="text-xs text-gray-500 text-right">{(() => {
                            if (!editFormData.additionalInfo) return '0/400 characters';
                            if (Array.isArray(editFormData.additionalInfo)) {
                              return `${editFormData.additionalInfo.join('\n').length}/400 characters`;
                            }
                            return `${String(editFormData.additionalInfo).length}/400 characters`;
                          })()}</p>
                        </div>
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
                        <div className="space-y-2">
                          <textarea
                            value={editFormData.howToApply || ''}
                            onChange={(e) => {
                              const lines = e.target.value.split('\n');
                              if (lines.length <= 10 && e.target.value.length <= 250) {
                                setEditFormData(prev => ({ ...prev, howToApply: e.target.value }));
                              }
                            }}
                            maxLength={250}
                            rows={10}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            placeholder="Instructions for applicants..."
                          />
                          <p className="text-xs text-gray-500 text-right">{(editFormData.howToApply || '').length}/250 characters</p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                          <div className="prose prose-sm max-w-none text-gray-700">
                            <p className="leading-relaxed">{selectedJob.howToApply}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contact & Links */}
                    <div>
                      {((editingJob ? editFormData.website : selectedJob.website) || (editingJob ? editFormData.twitter : selectedJob.twitter) || (editingJob ? editFormData.discord : selectedJob.discord) || (editingJob ? editFormData.contactEmail : selectedJob.contactEmail)) && (
                        <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
                          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Contact & Links</h4>
                          <div className="flex flex-wrap gap-2">
                          {(editingJob ? editFormData.website : selectedJob.website) && (
                            <div className="flex items-center">
                              {editingJob ? (
                                <div className="flex items-center space-x-2">
                                  <FaLink className="h-4 w-4 text-gray-500" />
                                  <input
                                    type="text"
                                    value={editFormData.website || ''}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="https://company.com"
                                  />
                                </div>
                              ) : (
                                <a 
                                  href={selectedJob.website?.startsWith('http') ? selectedJob.website : `https://${selectedJob.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                >
                                  <FaLink className="h-4 w-4 mr-2" />
                                  <span>Website</span>
                                </a>
                              )}
                            </div>
                          )}
                          
                          {(editingJob ? editFormData.twitter : selectedJob.twitter) && (
                            <div className="flex items-center">
                              {editingJob ? (
                                <div className="flex items-center space-x-2">
                                  <FaXTwitter className="h-4 w-4 text-gray-500" />
                                  <input
                                    type="text"
                                    value={editFormData.twitter || ''}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, twitter: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="@username"
                                  />
                                </div>
                              ) : (
                                <a 
                                  href={`https://twitter.com/${selectedJob.twitter?.startsWith('@') ? selectedJob.twitter.substring(1) : selectedJob.twitter}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                >
                                  <FaXTwitter className="h-4 w-4 mr-2" />
                                  <span>Twitter</span>
                                </a>
                              )}
                            </div>
                          )}
                          
                          {(editingJob ? editFormData.discord : selectedJob.discord) && (
                            <div className="flex items-center">
                              {editingJob ? (
                                <div className="flex items-center space-x-2">
                                  <SiDiscord className="h-4 w-4 text-gray-500" />
                                  <input
                                    type="text"
                                    value={editFormData.discord || ''}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, discord: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="Discord invite link"
                                  />
                                </div>
                              ) : (
                                <a 
                                  href={selectedJob.discord} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                >
                                  <SiDiscord className="h-4 w-4 mr-2" />
                                  <span>Discord</span>
                                </a>
                              )}
                            </div>
                          )}
                          
                          {(editingJob ? editFormData.contactEmail : selectedJob.contactEmail) && (
                            <div className="flex items-center">
                              {editingJob ? (
                                <div className="flex items-center space-x-2">
                                  <FaEnvelope className="h-4 w-4 text-gray-500" />
                                  <input
                                    type="email"
                                    value={editFormData.contactEmail || ''}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="contact@company.com"
                                  />
                                </div>
                              ) : (
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedJob.contactEmail!);
                                    toast.success('Email copied to clipboard!');
                                  }}
                                  className="inline-flex items-center px-3 py-2 rounded-md text-sm text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                >
                                  <FaEnvelope className="h-4 w-4 mr-2" />
                                  <span>Copy Email</span>
                                </button>
                              )}
                            </div>
                          )}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Edit Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          if (editingJob) {
                            setEditingJob(null);
                            setEditFormData({});
                          } else {
                            setEditingJob(selectedJob);
                            setEditFormData({
                              title: selectedJob?.title,
                              company: selectedJob?.company,
                              description: selectedJob?.description,
                              salary: selectedJob?.salary,
                              salaryType: selectedJob?.salaryType,
                              category: selectedJob?.category,
                              type: selectedJob?.type,
                              contactEmail: selectedJob?.contactEmail,
                              website: selectedJob?.website,
                              twitter: selectedJob?.twitter,
                              discord: selectedJob?.discord,
                              workArrangement: selectedJob?.workArrangement,
                              requiredSkills: selectedJob?.requiredSkills,
                              additionalInfo: selectedJob?.additionalInfo,
                              howToApply: selectedJob?.howToApply,
                            });
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {editingJob ? 'Cancel' : 'Edit Job'}
                      </button>
                      {editingJob && (
                        <button
                          onClick={handleSaveEdit}
                          disabled={false}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          Save Changes
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteJob(selectedJob.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete Job
                    </button>
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
