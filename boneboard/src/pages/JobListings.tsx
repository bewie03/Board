import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaSearch, FaFilter, FaMapMarkerAlt, FaMoneyBillWave, FaClock, FaBuilding, FaBookmark, FaRegBookmark, FaTimes, FaLink, FaTwitter, FaDiscord, FaCheck, FaEnvelope, FaFlag } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import { JobService } from '../services/jobService';
import { ReportModal, ReportData } from '../components/ReportModal';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

interface Job {
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
  discord?: { inviteUrl: string };
  timestamp: number;
  companyLogo?: string;
  featured?: boolean;
}

interface JobWithDisplayProps extends Job {
  isProjectVerified?: boolean;
  logo: string | null;
  posted: string;
}

type ActualJobCategory = 'development' | 'design' | 'marketing' | 'community' | 'business' | 'content' | 'defi' | 'nft' | 'security' | 'research';
type JobCategory = 'all' | ActualJobCategory;
type DateRange = 'all' | 'today' | 'week' | 'month';
type PaymentType = 'all' | 'ada' | 'fiat';
type JobType = 'all' | 'full-time' | 'part-time' | 'contract' | 'internship';
type WorkArrangement = 'all' | 'remote' | 'hybrid' | 'onsite';
type VerificationFilter = 'all' | 'verified';

import { JOB_CATEGORIES_WITH_ALL as JOB_CATEGORIES } from '../constants/categories';

const JobListings: React.FC = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { isConnected, walletAddress } = useWallet();
  
  // Helper function to format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffInMs = now - timestamp;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const [jobs, setJobs] = useState<JobWithDisplayProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<JobCategory[]>(['all']);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithDisplayProps | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('all');
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType>('all');
  const [selectedJobType, setSelectedJobType] = useState<JobType>('all');
  const [selectedWorkArrangement, setSelectedWorkArrangement] = useState<WorkArrangement>('all');
  const [selectedVerificationFilter, setSelectedVerificationFilter] = useState<VerificationFilter>('all');
  const [emailCopied, setEmailCopied] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingJob, setReportingJob] = useState<JobWithDisplayProps | null>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryButtonRef.current && !categoryButtonRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const jobsData = await JobService.getActiveJobs();
        
        // Transform jobs to include display properties
        const transformedJobs: JobWithDisplayProps[] = jobsData.map(job => ({
          ...job,
          logo: job.companyLogo || null,
          posted: formatRelativeTime(job.timestamp),
          // Use actual project verification from database
          isProjectVerified: job.isProjectVerified || false,
          // Transform discord string to object format if needed
          discord: job.discord ? { inviteUrl: job.discord } : undefined,
          // Ensure companyLogo is properly typed
          companyLogo: job.companyLogo || undefined
        }));
        
        setJobs(transformedJobs);
        
        // If there's a jobId in the URL, select that job
        if (jobId) {
          const job = transformedJobs.find(j => j.id === jobId);
          if (job) setSelectedJob(job);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobs();
  }, [jobId]);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.company && job.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.requiredSkills && job.requiredSkills.some(skill => skill && skill.toLowerCase().includes(searchTerm.toLowerCase())));
    
    // Date filter
    let matchesDate = true;
    if (selectedDateRange !== 'all') {
      const jobDate = new Date(job.timestamp);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (selectedDateRange) {
        case 'today':
          matchesDate = now.toDateString() === jobDate.toDateString();
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
        default:
          matchesDate = true;
      }
    }
    
    const matchesCategory = selectedCategories.includes('all') || 
      selectedCategories.some(cat => cat !== 'all' && job.category === cat);
    
    // Payment type filter
    const matchesPayment = selectedPaymentType === 'all' || 
      (selectedPaymentType === 'ada' && job.salaryType === 'ADA') || 
      (selectedPaymentType === 'fiat' && job.salaryType === 'fiat');
    
    // Job type filter
    const matchesJobType = selectedJobType === 'all' || 
      (job.type && job.type.toLowerCase().includes(selectedJobType));
    
    // Work arrangement filter
    const matchesWorkArrangement = selectedWorkArrangement === 'all' ||
      job.workArrangement === selectedWorkArrangement;
    
    // Verification filter
    const matchesVerification = selectedVerificationFilter === 'all' ||
      (selectedVerificationFilter === 'verified' && job.isProjectVerified === true);
    
    return matchesSearch && matchesDate && matchesCategory && matchesPayment && matchesJobType && matchesWorkArrangement && matchesVerification;
  }).sort((a, b) => {
    // Sort featured jobs first, then by timestamp (newest first)
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return b.timestamp - a.timestamp;
  });

  // Get featured jobs for the featured section (keep separate sidebar section)
  const featuredJobs = jobs.filter(job => job.featured);

  const selectJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJob(job);
    }
  };

  const clearSelectedJob = () => {
    setSelectedJob(null);
  };

  const toggleSaveJob = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isConnected || !walletAddress) {
      // Could show a toast or modal here asking user to connect wallet
      alert('Please connect your wallet to save jobs');
      return;
    }
    
    const newSavedJobs = savedJobs.includes(jobId) 
      ? savedJobs.filter(id => id !== jobId)
      : [...savedJobs, jobId];
    
    setSavedJobs(newSavedJobs);
    localStorage.setItem(`savedJobs_${walletAddress}`, JSON.stringify(newSavedJobs));
  };

  const handleReportJob = (job: JobWithDisplayProps) => {
    setReportingJob(job);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (reportData: ReportData) => {
    if (!walletAddress || !reportingJob) return;

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          ...reportData,
          reporter_id: walletAddress,
          scam_identifier: reportingJob.id.toString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      toast.success('Report submitted successfully. Thank you for helping keep the platform safe.');
      setShowReportModal(false);
      setReportingJob(null);
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header in White Container */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-8 sm:p-10">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">Job Opportunities</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Discover exciting career opportunities in the Cardano ecosystem
                  </p>
                </div>
                <button
                  onClick={() => navigate('/post-job')}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Post a Job
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters - Full Width */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-white shadow rounded-lg mb-6"
            style={{ overflow: 'visible' }}
          >
            <div className="px-6 py-8 sm:p-10">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Find Your Perfect Role</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Search through {jobs.length} available positions
                </p>
              </div>

                <div className="mt-6 space-y-6">
                  {/* Search Bar */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Search Jobs</label>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by job title, company, or skills..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Category Multi-Select */}
                  <div className="space-y-2" style={{ position: 'relative', zIndex: 10 }}>
                    <label className="block text-sm font-medium text-gray-700">Categories</label>
                    <div className="relative">
                      <button
                        ref={categoryButtonRef}
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        className="w-full h-[42px] pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] appearance-none cursor-pointer text-left"
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")'
                        }}
                      >
                        <span className="text-gray-700">
                          {selectedCategories.includes('all') 
                            ? 'All Categories' 
                            : selectedCategories.length === 1 
                              ? JOB_CATEGORIES.find(cat => cat.id === selectedCategories[0])?.name 
                              : `${selectedCategories.length} categories selected`
                          }
                        </span>
                      </button>
                      
                      {showCategoryDropdown && (
                        <div className="absolute z-20 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto mt-1 w-full" 
                             style={{ position: 'absolute', top: '100%', left: 0 }}>
                          <div className="py-2">
                            <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes('all')}
                                onChange={() => {
                                  if (selectedCategories.includes('all')) {
                                    setSelectedCategories([]);
                                  } else {
                                    setSelectedCategories(['all']);
                                  }
                                }}
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700 font-medium">All Categories</span>
                            </label>
                            {JOB_CATEGORIES.filter(cat => cat.id !== 'all').map((category) => (
                              <label key={category.id} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(category.id as JobCategory) && !selectedCategories.includes('all')}
                                  onChange={() => {
                                    const categoryId = category.id as JobCategory;
                                    setSelectedCategories(prev => {
                                      const newCategories = prev.filter(cat => cat !== 'all') as ActualJobCategory[];
                                      if (categoryId !== 'all' && newCategories.includes(categoryId)) {
                                        const filtered = newCategories.filter(cat => cat !== categoryId);
                                        return filtered.length === 0 ? ['all'] : filtered;
                                      } else if (categoryId !== 'all') {
                                        return [...newCategories, categoryId];
                                      }
                                      return prev;
                                    });
                                  }}
                                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">{category.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Advanced Filters Toggle */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      <FaFilter className="mr-2" />
                      {showFilters ? 'Hide' : 'Show'} Advanced Filters
                    </button>
                    <span className="text-sm text-gray-500">
                      {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
                    </span>
                  </div>

                  {/* Advanced Filters */}
                  {showFilters && (
                    <div className="pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                        {/* Date Posted Filter */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Date Posted
                          </label>
                          <select
                            value={selectedDateRange}
                            onChange={(e) => setSelectedDateRange(e.target.value as DateRange)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Past Week</option>
                            <option value="month">Past Month</option>
                          </select>
                        </div>

                        {/* Payment Type Filter */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Payment Type
                          </label>
                          <select
                            value={selectedPaymentType}
                            onChange={(e) => setSelectedPaymentType(e.target.value as PaymentType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Types</option>
                            <option value="ada">ADA</option>
                            <option value="fiat">Fiat Currency</option>
                          </select>
                        </div>

                        {/* Job Type Filter */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Job Type
                          </label>
                          <select
                            value={selectedJobType}
                            onChange={(e) => setSelectedJobType(e.target.value as JobType)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Types</option>
                            <option value="full-time">Full-time</option>
                            <option value="part-time">Part-time</option>
                            <option value="contract">Contract</option>
                            <option value="internship">Internship</option>
                          </select>
                        </div>

                        {/* Work Arrangement Filter */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Work Arrangement
                          </label>
                          <select
                            value={selectedWorkArrangement}
                            onChange={(e) => setSelectedWorkArrangement(e.target.value as WorkArrangement)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Arrangements</option>
                            <option value="remote">Remote</option>
                            <option value="hybrid">Hybrid</option>
                            <option value="onsite">On-site</option>
                          </select>
                        </div>

                        {/* Verification Filter */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Verification Status
                          </label>
                          <select
                            value={selectedVerificationFilter}
                            onChange={(e) => setSelectedVerificationFilter(e.target.value as VerificationFilter)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">All Jobs</option>
                            <option value="verified">Verified Projects Only</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Job Results */}
            <div className="w-full lg:w-2/3">
            <div className="space-y-4">
              {filteredJobs.length === 0 ? (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-500 text-lg">No jobs found matching your criteria.</p>
                    <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filters.</p>
                  </div>
                </div>
              ) : (
                filteredJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.4,
                      delay: index * 0.1,
                      ease: "easeOut"
                    }}
                    onClick={() => selectJob(job.id)}
                    className={`group cursor-pointer bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative ${
                      selectedJob?.id === job.id ? 'ring-2 ring-blue-500 shadow-xl' : ''
                    } ${job.featured ? 'ring-2 ring-blue-400 bg-gradient-to-r from-blue-50 to-white' : ''}`}
                  >
                    {/* Bookmark Button */}
                    <button
                      onClick={(e) => toggleSaveJob(job.id, e)}
                      className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110"
                    >
                      {savedJobs.includes(job.id) ? (
                        <FaBookmark className="h-4 w-4 text-blue-600" />
                      ) : (
                        <FaRegBookmark className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                      )}
                    </button>
                    {/* Featured Badge */}
                    {job.featured && (
                      <div className="absolute top-4 left-4 z-10">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                          <span className="text-blue-600 mr-1 text-sm">★</span>
                          Featured
                        </span>
                      </div>
                    )}
                    <div className="px-6 py-5 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                            {job.title}
                            {job.featured && <span className="ml-2 text-blue-500 text-xl">★</span>}
                          </h3>
                          <div className="mt-1 flex items-center">
                            <span className="text-sm text-gray-500">
                              {job.company}
                            </span>
                            {job.isProjectVerified && (
                              <div 
                                className="ml-2 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0"
                                title="Verified project"
                              >
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {JOB_CATEGORIES.find(cat => cat.id === job.category)?.name || job.category}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0 h-14 w-14 rounded-full border border-gray-200 flex items-center justify-center bg-white">
                          {job.logo ? (
                            <img 
                              className="h-full w-full rounded-full object-cover"
                              src={job.logo!} 
                              alt={`${job.company} logo`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="text-blue-600 text-lg"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                                }
                              }}
                            />
                          ) : (
                            <FaBuilding className="text-blue-600 text-lg" />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                          <span className="flex items-center">
                            <FaMapMarkerAlt className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {job.workArrangement === 'remote' ? 'Remote' : job.workArrangement === 'hybrid' ? 'Hybrid' : 'On-site'}
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
                          <span className="text-xs text-gray-500">Posted {formatRelativeTime(job.timestamp)}</span>
                          <span className="text-xs text-blue-600 font-medium">Click to view details →</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-1/3">
              <div className="sticky top-8 space-y-6">
            {/* Featured Jobs Section */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              className="bg-white shadow rounded-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <span className="text-blue-500 mr-2 text-xl">★</span>
                  Featured Jobs
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Premium job listings with maximum visibility
                </p>
              </div>
              
              <div>
                {featuredJobs.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <div className="text-blue-500 text-5xl mb-2">★</div>
                    <h3 className="text-sm font-medium text-gray-900">No featured jobs</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Featured jobs will appear here when available.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {featuredJobs.slice(0, 3).map((job) => (
                      <div
                        key={job.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedJob(job);
                        }}
                        className="group cursor-pointer px-6 py-4 hover:bg-blue-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md relative"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {job.title}
                            </h4>
                            <p className="text-sm text-gray-500 truncate">
                              {job.company}
                            </p>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {JOB_CATEGORIES.find(cat => cat.id === job.category)?.name || job.category}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3 flex-shrink-0 h-14 w-14 rounded-full border border-gray-200 flex items-center justify-center bg-white">
                            {job.logo ? (
                              <img 
                                className="h-full w-full rounded-full object-cover" 
                                src={job.logo!} 
                                alt={`${job.company} logo`}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="text-blue-600 text-sm"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                                  }
                                }}
                              />
                            ) : (
                              <FaBuilding className="text-blue-600 text-sm" />
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Posted {job.posted}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {featuredJobs.length > 3 && (
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      // Scroll to main job list
                      document.querySelector('.space-y-4')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all {featuredJobs.length} featured jobs →
                  </button>
                </div>
              )}
            </motion.div>

            {/* Saved Jobs Section */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
              className="bg-white shadow rounded-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Saved Jobs</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Use the Save search button below the search results to save your search and receive every new job.
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {!isConnected ? (
                  <div className="px-6 py-8 text-center">
                    <FaRegBookmark className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Connect Your Wallet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Connect your wallet to save and manage your favorite jobs.
                    </p>
                  </div>
                ) : savedJobs.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <FaRegBookmark className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No saved jobs</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Click the bookmark icon on any job to save it here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {savedJobs.map((jobId) => {
                      const job = jobs.find(j => j.id === jobId);
                      if (!job) return null;
                      
                      return (
                        <div
                          key={job.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedJob(job);
                          }}
                          className="group cursor-pointer px-6 py-4 hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {job.title}
                              </h4>
                              <p className="text-sm text-gray-500 truncate">
                                {job.company}
                              </p>
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                  {JOB_CATEGORIES.find(cat => cat.id === job.category)?.name || job.category}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3 flex-shrink-0">
                              <img 
                                className="h-14 w-14 rounded-full border border-gray-200 object-cover" 
                                src={job.logo!} 
                                alt={`${job.company} logo`}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/Logo.png';
                                }}
                              />
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Posted {job.posted}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {savedJobs.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      if (walletAddress) {
                        setSavedJobs([]);
                        localStorage.removeItem(`savedJobs_${walletAddress}`);
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear all saved jobs
                  </button>
                </div>
              )}
            </motion.div>
          </div>
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
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-[60] transform" 
                style={{ top: '0px' }}
              >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Job Details</h2>
                    <div className="flex items-center gap-2">
                      {/* Report Button */}
                      <button
                        onClick={() => {
                          handleReportJob(selectedJob);
                          clearSelectedJob();
                        }}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Report this job"
                      >
                        <FaFlag className="h-4 w-4" />
                        Report
                      </button>
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
                        <h3 className="text-xl font-semibold text-gray-900">{selectedJob.title}</h3>
                        <div className="mt-2 flex items-center">
                          <span className="text-lg text-gray-600">
                            {selectedJob.company}
                          </span>
                          {selectedJob.isProjectVerified && (
                            <div 
                              className="ml-2 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0"
                              title="Verified project"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                            {JOB_CATEGORIES.find(cat => cat.id === selectedJob.category)?.name || selectedJob.category}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <div className="h-20 w-20 rounded-full border border-gray-200 flex items-center justify-center bg-white">
                          {selectedJob.logo ? (
                            <img 
                              className="h-full w-full rounded-full object-cover" 
                              src={selectedJob.logo!} 
                              alt={`${selectedJob.company} logo`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="text-blue-600 text-xl"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                                }
                              }}
                            />
                          ) : (
                            <FaBuilding className="text-blue-600 text-xl" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Job Details Bar */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                          <span>{selectedJob.workArrangement === 'remote' ? 'Remote' : selectedJob.workArrangement === 'hybrid' ? 'Hybrid' : 'On-site'}</span>
                        </div>
                        <div className="flex items-center">
                          <FaClock className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                          <span>{selectedJob.type}</span>
                        </div>
                        <div className="flex items-center">
                          <FaMoneyBillWave className="flex-shrink-0 mr-2 h-4 w-4 text-gray-400" />
                          <span>{selectedJob.salary}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Job Content */}
                  <div className="px-6 py-6 space-y-8">
                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Job Description</h4>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <p className="whitespace-pre-line leading-relaxed">{selectedJob.description}</p>
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
                              href={selectedJob.discord.inviteUrl} 
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

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportingJob(null);
          }}
          projectId={reportingJob?.id.toString() || ''}
          projectName={reportingJob?.title || ''}
          onSubmit={handleReportSubmit}
        />
        </div>
      </div>
    </>
  );
};

export default JobListings;
