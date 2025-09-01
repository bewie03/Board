import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaGlobe, FaLink, FaDiscord, FaExternalLinkAlt, FaTimes, FaMapMarkerAlt, FaClock, FaCoins, FaDollarSign, FaBuilding, FaSearch, FaFlag } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { JobService } from '../services/jobService';
import { ProjectService, Project as ServiceProject } from '../services/projectService';
import { useWallet } from '../contexts/WalletContext';
import { ProjectVerificationToggle } from '../components/ProjectVerificationToggle';
import { ReportModal, ReportData } from '../components/ReportModal';
import { toast } from 'react-toastify';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';
import { PROJECT_CATEGORIES } from '../constants/categories';
import MultiSelectDropdown from '../components/MultiSelectDropdown';

type Job = {
  id: number;
  title: string;
  type: string;
  location: string;
  description: string;
  skills: string[];
};

type Project = ServiceProject & {
  jobsAvailable?: number;
  socials?: {
    website?: string;
    twitter?: string;
    discord?: string;
    github?: string;
  };
  jobs?: Job[];
};

const Projects: React.FC = () => {
  const { walletAddress } = useWallet();
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [showActiveJobsOnly, setShowActiveJobsOnly] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingProject, setReportingProject] = useState<Project | null>(null);
  
  // Check if current user is admin
  const ADMIN_WALLET = 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';
  const isAdmin = walletAddress === ADMIN_WALLET;
  
  // Debug logging
  console.log('Current wallet:', walletAddress);
  console.log('Admin wallet:', ADMIN_WALLET);
  console.log('Is admin:', isAdmin);
  console.log('Wallet match check:', walletAddress === ADMIN_WALLET);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);

  // Load jobs and projects data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching projects and jobs...');
        const fetchedJobs = await JobService.getActiveJobs();
        console.log('Fetched jobs:', fetchedJobs);
        setAllJobs(fetchedJobs);
        
        const fetchedProjects = await ProjectService.getActiveProjects();
        console.log('Fetched projects:', fetchedProjects);
        setCreatedProjects(fetchedProjects);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Filter projects based on search and filters
  const searchFiltered = createdProjects.filter(project => {
    const matchesSearch = !searchTerm || 
      (project.title || project.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const categoryFiltered = selectedCategories.includes('all') 
    ? searchFiltered 
    : searchFiltered.filter(project => selectedCategories.includes(project.category));

  const filteredProjects = categoryFiltered.filter(project => {
    if (showVerifiedOnly) {
      return project.isVerified || false;
    }
    return true;
  });

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleVerificationChange = (projectId: string, verified: boolean) => {
    // Update the project in the local state
    setCreatedProjects(prev => 
      prev.map(project => 
        project.id === projectId 
          ? { ...project, isVerified: verified }
          : project
      )
    );
    
    // Update selected project if it's the one being modified
    if (selectedProject && selectedProject.id.toString() === projectId) {
      setSelectedProject(prev => prev ? {
        ...prev,
        isVerified: verified
      } : null);
    }
  };

  const handleReportProject = (project: Project) => {
    setReportingProject(project);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (reportData: ReportData) => {
    if (!walletAddress || !reportingProject) return;

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
          scam_identifier: reportingProject.id.toString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      toast.success('Report submitted successfully. Thank you for helping keep the platform safe.');
      setShowReportModal(false);
      setReportingProject(null);
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  };

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

  // Sample projects data - removed for production
  const sampleProjects: Project[] = [];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header in White Container */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-6 py-8 sm:p-10">
              <div className="flex justify-between items-start">
                <div className="text-left flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                    Explore Projects
                  </h1>
                  <p className="mt-2 text-sm text-gray-500">
                    Discover exciting projects in the Cardano ecosystem
                  </p>
                </div>
                <Link
                  to="/create-project"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ml-4"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Project
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white shadow rounded-lg mb-6" style={{ overflow: 'visible' }}>
            <div className="px-6 py-8 sm:p-10">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Discover Projects</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Explore {createdProjects.length} projects in the Cardano ecosystem
                </p>
              </div>

              <div className="mt-6">
                <div className="flex flex-col lg:flex-row gap-4 mb-3">
                  <div className="flex-1 relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by project name or description..."
                      className="w-full pl-10 pr-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="min-w-[200px]">
                      <MultiSelectDropdown
                        options={[
                          { value: 'all', label: 'All Categories' },
                          ...PROJECT_CATEGORIES.map(cat => ({ value: cat, label: cat }))
                        ]}
                        selectedValues={selectedCategories}
                        onChange={(values) => setSelectedCategories(values)}
                        placeholder="All Categories"
                      />
                    </div>

                    <div className="flex items-center min-w-[200px] bg-white border border-gray-300 rounded-lg px-3 h-[42px]">
                      <input
                        type="checkbox"
                        id="active-jobs"
                        checked={showActiveJobsOnly}
                        onChange={(e) => setShowActiveJobsOnly(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                      />
                      <label htmlFor="active-jobs" className="text-sm text-gray-700 cursor-pointer select-none">
                        Active jobs only
                      </label>
                    </div>

                    <div className="flex items-center min-w-[180px] bg-white border border-gray-300 rounded-lg px-3 h-[42px]">
                      <input
                        type="checkbox"
                        id="verified-only"
                        checked={showVerifiedOnly}
                        onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-2"
                      />
                      <label htmlFor="verified-only" className="text-sm text-gray-700 cursor-pointer select-none">
                        Verified only
                      </label>
                    </div>

                    {(searchTerm || selectedCategories.length > 0 || showActiveJobsOnly || showVerifiedOnly) && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategories([]);
                          setShowActiveJobsOnly(false);
                          setShowVerifiedOnly(false);
                          setShowCategoryDropdown(false);
                        }}
                        className="min-w-[140px] h-[42px] px-4 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors font-medium"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Results count */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">
                    Showing {filteredProjects.length} of {createdProjects.length} projects
                  </span>
                  {selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map(category => (
                        <span key={category} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {category}
                          <button
                            onClick={() => toggleCategory(category)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {/* Display filtered projects */}
          {filteredProjects.map((project, index) => {
            const projectName = project.title || project.name || '';
            const relatedJobs = allJobs.filter(job => 
              job.company && projectName && (
                job.company.toLowerCase().includes(projectName.toLowerCase()) ||
                projectName.toLowerCase().includes(job.company.toLowerCase())
              )
            );
            
            return (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: "easeOut"
                }} 
                onClick={() => setSelectedProject({
                  ...project,
                  id: project.id,
                  name: project.title || project.name || '',
                  logo: project.logo || null,
                  description: project.description,
                  category: project.category,
                  status: project.status,
                  jobsAvailable: relatedJobs.length,
                  socials: {
                    website: project.website, // Use the actual website field from database
                    twitter: project.twitterLink || ((typeof project.twitter === 'string' && project.twitter) ? (project.twitter.startsWith('http') ? project.twitter : `https://twitter.com/${project.twitter}`) : (typeof project.twitter === 'object' && project.twitter?.verified) ? `https://twitter.com/${project.twitter.username}` : undefined),
                    discord: project.discordLink || ((typeof project.discord === 'string' && project.discord) ? project.discord : (typeof project.discord === 'object' && project.discord?.verified) ? project.discord.inviteUrl : undefined),
                  },
                  jobs: relatedJobs.map((job, index) => ({
                    id: index,
                    title: job.title,
                    type: job.type,
                    location: job.workArrangement || 'Remote',
                    description: job.description,
                    skills: job.requiredSkills || []
                  }))
                })}
                className="group cursor-pointer bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-white border-2 border-gray-200 overflow-hidden shadow-sm flex items-center justify-center">
                        {project.logo ? (
                          <img 
                            className="h-full w-full object-cover" 
                            src={project.logo} 
                            alt={`${project.name} logo`}
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
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                            {project.title || project.name}
                          </h2>
                          <ProjectVerificationToggle
                            projectId={String(project.id)}
                            isVerified={project.isVerified || false}
                            walletAddress={walletAddress}
                            onVerificationChange={(verified) => handleVerificationChange(String(project.id), verified)}
                          />
                        </div>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {project.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {relatedJobs.length}
                      </div>
                      <div className="text-sm text-gray-500">
                        {relatedJobs.length === 1 ? 'job' : 'jobs'}
                      </div>
                    </div>
                  </div>
                  
                  <p className="mt-4 text-gray-600 line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>
                  
                  {/* Social Links Preview */}
                  <div className="mt-4 flex items-center space-x-3">
                    {project.website && (
                      <div className="flex items-center text-gray-400 hover:text-blue-600">
                        <FaGlobe className="h-4 w-4" />
                      </div>
                    )}
                    {(project.twitterLink || ((typeof project.twitter === 'string' && project.twitter) || (typeof project.twitter === 'object' && project.twitter?.verified))) && (
                      <div className="flex items-center text-gray-400 hover:text-blue-600">
                        <FaXTwitter className="h-4 w-4" />
                      </div>
                    )}
                    {(project.discordLink || ((typeof project.discord === 'string' && project.discord) || (typeof project.discord === 'object' && project.discord?.verified))) && (
                      <div className="flex items-center text-gray-400 hover:text-indigo-600">
                        <FaDiscord className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {/* Display sample projects */}
          {sampleProjects.map((project, index) => {
            const relatedJobs = allJobs.filter(job => 
              job.company && project.name && (
                job.company.toLowerCase().includes(project.name.toLowerCase()) ||
                project.name.toLowerCase().includes(job.company.toLowerCase())
              )
            );
            
            return (
              <motion.div 
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4,
                  delay: (filteredProjects.length + index) * 0.1,
                  ease: "easeOut"
                }} 
                onClick={() => setSelectedProject(project)}
                className="group cursor-pointer bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-white border-2 border-gray-200 overflow-hidden shadow-sm flex items-center justify-center">
                        {project.logo ? (
                          <img 
                            className="h-full w-full object-cover" 
                            src={project.logo} 
                            alt={`${project.name} logo`}
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
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                            {project.title || project.name}
                          </h2>
                          <ProjectVerificationToggle
                            projectId={String(project.id)}
                            isVerified={project.isVerified || false}
                            walletAddress={walletAddress}
                            onVerificationChange={(verified) => handleVerificationChange(String(project.id), verified)}
                          />
                        </div>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {project.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {relatedJobs.length}
                      </div>
                      <div className="text-sm text-gray-500">
                        {relatedJobs.length === 1 ? 'job' : 'jobs'}
                      </div>
                    </div>
                  </div>
                  
                  <p className="mt-4 text-gray-600 line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>
                  
                  {/* Social Links Preview */}
                  <div className="mt-4 flex items-center space-x-3">
                    {project.website && (
                      <div className="text-blue-600 hover:text-blue-800">
                        <FaLink className="h-4 w-4" />
                      </div>
                    )}
                    {project.twitter && (
                      <div className="text-blue-400 hover:text-blue-600">
                        <FaXTwitter className="h-4 w-4" />
                      </div>
                    )}
                    {project.discord && (
                      <div className="text-indigo-600 hover:text-indigo-800">
                        <FaDiscord className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Project Profile Modal */}
        <AnimatePresence>
          {selectedProject && (
            <>
              {/* Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setSelectedProject(null)}
              />
              
              {/* Modal */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
                className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-xl z-50 overflow-y-auto" 
                style={{ top: '0px' }}
              >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-16 w-16 rounded-xl border border-gray-200 flex items-center justify-center bg-white">
                        {selectedProject.logo ? (
                          <img 
                            className="h-full w-full rounded-xl object-cover" 
                            src={selectedProject.logo} 
                            alt={`${selectedProject.name} logo`}
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
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                          <ProjectVerificationToggle
                            projectId={String(selectedProject.id)}
                            isVerified={selectedProject.isVerified || false}
                            walletAddress={walletAddress}
                            onVerificationChange={(verified) => handleVerificationChange(String(selectedProject.id), verified)}
                          />
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {selectedProject.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleReportProject(selectedProject);
                          setSelectedProject(null);
                        }}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Report this project"
                      >
                        <FaFlag className="h-4 w-4" />
                        Report
                      </button>
                      <button
                        onClick={() => setSelectedProject(null)}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <FaTimes className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-6 space-y-8">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">About {selectedProject.name}</h3>
                    <p className="text-gray-700 leading-relaxed">{selectedProject.description}</p>
                  </div>

                  {/* Links */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Links & Social</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedProject.website && (
                        <a 
                          href={selectedProject.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaGlobe className="h-5 w-5 text-blue-600 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">Website</div>
                            <div className="text-sm text-gray-500">Visit project site</div>
                          </div>
                          <FaExternalLinkAlt className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      )}
                      {(selectedProject.twitterLink || selectedProject.twitter) && (
                        <a 
                          href={selectedProject.twitterLink || (typeof selectedProject.twitter === 'string' ? selectedProject.twitter : '')} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaXTwitter className="h-5 w-5 text-blue-400 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">Twitter</div>
                            <div className="text-sm text-gray-500">Follow updates</div>
                          </div>
                          <FaExternalLinkAlt className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      )}
                      {(selectedProject.discordLink || selectedProject.discord) && (
                        <a 
                          href={selectedProject.discordLink || (typeof selectedProject.discord === 'string' ? selectedProject.discord : '')} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaDiscord className="h-5 w-5 text-indigo-500 mr-3" />
                          <div>
                            <div className="font-medium text-gray-900">Discord</div>
                            <div className="text-sm text-gray-500">Join community</div>
                          </div>
                          <FaExternalLinkAlt className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      )}

                    </div>
                  </div>

                  {/* Related Jobs */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Available Jobs ({allJobs.filter(job => 
                        job.company && selectedProject.name && (
                          job.company.toLowerCase().includes(selectedProject.name.toLowerCase()) ||
                          selectedProject.name.toLowerCase().includes(job.company.toLowerCase())
                        )
                      ).length})
                    </h3>
                    <div className="space-y-4">
                      {allJobs
                        .filter(job => 
                          job.company && selectedProject.name && (
                            job.company.toLowerCase().includes(selectedProject.name.toLowerCase()) ||
                            selectedProject.name.toLowerCase().includes(job.company.toLowerCase())
                          )
                        )
                        .map((job) => (
                          <Link
                            key={job.id}
                            to={`/jobs/${job.id}`}
                            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                                  {job.title}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1">{job.company}</p>
                                <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <FaMapMarkerAlt className="h-3 w-3 mr-1" />
                                    {job.workArrangement || 'Remote'}
                                  </span>
                                  <span className="flex items-center">
                                    <FaClock className="h-3 w-3 mr-1" />
                                    {job.type || 'Full-time'}
                                  </span>
                                  <span className="flex items-center">
                                    {job.salaryType === 'ADA' ? (
                                      <FaCoins className="h-3 w-3 mr-1" />
                                    ) : (
                                      <FaDollarSign className="h-3 w-3 mr-1" />
                                    )}
                                    {job.salary || 'Competitive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                  {job.description}
                                </p>
                              </div>
                              <div className="ml-4 text-xs text-blue-600 font-medium">
                                View Job →
                              </div>
                            </div>
                          </Link>
                        ))
                      }
                      {allJobs.filter(job => 
                        job.company && selectedProject.name && (
                          job.company.toLowerCase().includes(selectedProject.name.toLowerCase()) ||
                          selectedProject.name.toLowerCase().includes(job.company.toLowerCase())
                        )
                      ).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No jobs currently available for this project.</p>
                          <Link 
                            to="/jobs" 
                            className="text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block"
                          >
                            Browse all jobs →
                          </Link>
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

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportingProject(null);
          }}
          projectId={reportingProject?.id.toString() || ''}
          projectName={reportingProject?.title || reportingProject?.name || ''}
          onSubmit={handleReportSubmit}
        />
        </div>
      </div>
    </PageTransition>
  );
};

export default Projects;
