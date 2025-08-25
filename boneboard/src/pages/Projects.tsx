import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaGlobe, FaTwitter, FaDiscord, FaExternalLinkAlt, FaTimes, FaMapMarkerAlt, FaClock, FaCoins, FaDollarSign, FaBuilding, FaSearch, FaFilter, FaChevronDown } from 'react-icons/fa';
import { JobService } from '../services/jobService';
import { ProjectService, Project as StoredProject } from '../services/projectService';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

type Project = {
  id: number;
  name: string;
  title?: string; // API returns title field
  logo: string | null;
  description: string;
  category: string;
  jobsAvailable: number;
  socials: {
    website?: string;
    twitter?: string;
    discord?: string;
    github?: string;
  };
  jobs: Array<{
    id: number;
    title: string;
    type: string;
    location: string;
    description: string;
    skills: string[];
  }>;
};

const PROJECT_CATEGORIES = [
  'AI', 'Alpha Group', 'Book Publishing', 'Bridge', 'CEX', 'Cloud Services', 'Compute', 'Currency',
  'DAO', 'DeFi', 'DePIN', 'Derivatives', 'DEX', 'DEX Aggregator', 'Education', 'Gaming',
  'Index Funds', 'Infrastructure', 'Launchpad', 'Layer 2', 'Lend/Borrow', 'Liquid Staking',
  'Memecoin', 'Metaverse', 'Music', 'NFT', 'NFT Infrastructure', 'NFT Marketplace', 'Oracle',
  'PoW Mining', 'Prediction Market', 'Privacy', 'Reserve Coin', 'RWA', 'SocialFi', 'Stablecoin',
  'Storage', 'Synthetics', 'Telecoms', 'Utilities', 'Wallet', 'Wrapped Token', 'Yield Farming'
];

const Projects: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [createdProjects, setCreatedProjects] = useState<StoredProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showActiveJobsOnly, setShowActiveJobsOnly] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Load jobs and projects data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching projects and jobs...');
        const fetchedJobs = await JobService.getActiveJobs();
        console.log('Fetched jobs:', fetchedJobs);
        setAllJobs(fetchedJobs);
        
        const fetchedProjects = await ProjectService.getAllProjects();
        console.log('Fetched projects:', fetchedProjects);
        setCreatedProjects(fetchedProjects);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Filter projects based on search and filters
  const filteredProjects = createdProjects.filter(project => {
    const matchesSearch = !searchTerm || 
      (project.title || project.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategories.length === 0 || 
      selectedCategories.includes(project.category);
    
    const projectName = project.title || project.name;
    const projectJobs = allJobs.filter(job => 
      job.company && projectName && (
        job.company.toLowerCase().includes(projectName.toLowerCase()) ||
        projectName.toLowerCase().includes(job.company.toLowerCase())
      )
    );
    const matchesJobFilter = !showActiveJobsOnly || projectJobs.length > 0;
    
    return matchesSearch && matchesCategory && matchesJobFilter;
  });

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Sample projects data - removed for production
  const sampleProjects: Project[] = [];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Explore Projects
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Discover exciting projects in the Cardano ecosystem
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="relative max-w-lg mx-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search projects by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-4 justify-center items-center">
                {/* Category Filter */}
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="flex items-center px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <FaFilter className="h-4 w-4 mr-2 text-gray-500" />
                    Categories {selectedCategories.length > 0 && (
                      <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {selectedCategories.length}
                      </span>
                    )}
                    <FaChevronDown className={`h-4 w-4 ml-2 text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCategoryDropdown && (
                    <div className="absolute z-20 mt-2 w-72 bg-white shadow-xl max-h-64 rounded-lg py-2 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none border border-gray-200">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        Select Categories
                      </div>
                      {PROJECT_CATEGORIES.map((category) => (
                        <label key={category} className="flex items-center px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                          />
                          <span className="text-sm text-gray-900">{category}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Jobs Filter */}
                <label className="flex items-center cursor-pointer bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={showActiveJobsOnly}
                    onChange={(e) => setShowActiveJobsOnly(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                  />
                  <span className="text-sm text-gray-700 font-medium">Projects with active jobs</span>
                </label>

                {/* Clear Filters */}
                {(searchTerm || selectedCategories.length > 0 || showActiveJobsOnly) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategories([]);
                      setShowActiveJobsOnly(false);
                      setShowCategoryDropdown(false);
                    }}
                    className="px-4 py-2.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Results count */}
              <div className="text-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {filteredProjects.length} of {createdProjects.length} projects
                </span>
              </div>
            </div>
          </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {/* Display filtered projects */}
          {filteredProjects.map((project) => {
            const projectName = project.title || project.name || '';
            const relatedJobs = allJobs.filter(job => 
              job.company && projectName && (
                job.company.toLowerCase().includes(projectName.toLowerCase()) ||
                projectName.toLowerCase().includes(job.company.toLowerCase())
              )
            );
            
            return (
              <div 
                key={project.id} 
                onClick={() => setSelectedProject({
                  id: parseInt(project.id),
                  name: project.title || project.name || '',
                  logo: project.logo || null,
                  description: project.description,
                  category: project.category,
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
                className="group cursor-pointer bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
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
                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                          {project.title || project.name}
                        </h2>
                        <div className="flex items-center mt-2">
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
                        <FaTwitter className="h-4 w-4" />
                      </div>
                    )}
                    {(project.discordLink || ((typeof project.discord === 'string' && project.discord) || (typeof project.discord === 'object' && project.discord?.verified))) && (
                      <div className="flex items-center text-gray-400 hover:text-indigo-600">
                        <FaDiscord className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Display sample projects */}
          {sampleProjects.map((project) => {
            const relatedJobs = allJobs.filter(job => 
              job.company && project.name && (
                job.company.toLowerCase().includes(project.name.toLowerCase()) ||
                project.name.toLowerCase().includes(job.company.toLowerCase())
              )
            );
            
            return (
              <div 
                key={project.id} 
                onClick={() => setSelectedProject(project)}
                className="group cursor-pointer bg-white overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
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
                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                          {project.title || project.name}
                        </h2>
                        <div className="flex items-center mt-2">
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
                    {project.socials.website && (
                      <div className="flex items-center text-gray-400 hover:text-blue-600">
                        <FaGlobe className="h-4 w-4" />
                      </div>
                    )}
                    {project.socials.twitter && (
                      <div className="flex items-center text-gray-400 hover:text-blue-600">
                        <FaTwitter className="h-4 w-4" />
                      </div>
                    )}
                    {project.socials.discord && (
                      <div className="flex items-center text-gray-400 hover:text-blue-600">
                        <FaDiscord className="h-4 w-4" />
                      </div>
                    )}

                  </div>
                </div>
              </div>
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
                className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 overflow-y-auto" 
                style={{ top: '64px' }}
              >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center bg-white">
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
                        <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mt-1">
                          {selectedProject.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <FaTimes className="h-6 w-6" />
                    </button>
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
                      {selectedProject.socials.website && (
                        <a 
                          href={selectedProject.socials.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaGlobe className="h-5 w-5 text-gray-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Website</div>
                            <div className="text-xs text-gray-500">Visit site</div>
                          </div>
                          <FaExternalLinkAlt className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      )}
                      {selectedProject.socials.twitter && (
                        <a 
                          href={selectedProject.socials.twitter} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaTwitter className="h-5 w-5 text-blue-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">X (Twitter)</div>
                            <div className="text-xs text-gray-500">Follow us</div>
                          </div>
                          <FaExternalLinkAlt className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      )}
                      {selectedProject.socials.discord && (
                        <a 
                          href={selectedProject.socials.discord} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaDiscord className="h-5 w-5 text-indigo-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Discord</div>
                            <div className="text-xs text-gray-500">Join server</div>
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
        </div>
      </div>
    </PageTransition>
  );
};

export default Projects;
