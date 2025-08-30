import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaSearch, FaUsers, FaTimes, FaSort, FaCheckCircle, FaClock, FaDollarSign, FaCheck, FaCalendarAlt, FaTwitter, FaDiscord, FaGlobe } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import { fundingService, FundingProject } from '../services/fundingService';
import { toast } from 'react-toastify';
import CustomSelect from '../components/CustomSelect';
import { PROJECT_CATEGORIES } from '../constants/categories';

const Funding: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  
  const [projects, setProjects] = useState<FundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);
  const [selectedProjectForPanel, setSelectedProjectForPanel] = useState<FundingProject | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeMessage, setContributeMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [contributing, setContributing] = useState(false);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'ada_high', label: 'ADA Raised (High to Low)' },
    { value: 'ada_low', label: 'ADA Raised (Low to High)' },
    { value: 'deadline_soon', label: 'Deadline (Soonest First)' },
    { value: 'deadline_far', label: 'Deadline (Latest First)' },
    { value: 'goal_high', label: 'Goal (High to Low)' },
    { value: 'goal_low', label: 'Goal (Low to High)' }
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log('Fetching all funding projects for main page...');
      const data = await fundingService.getAllFundingProjects();
      console.log('Funding projects received:', data.length, data);
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load funding projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedProjects = projects
    .filter((project: FundingProject) => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.includes(project.category);
      const matchesVerified = !showVerifiedOnly || project.is_verified;
      return matchesSearch && matchesCategory && matchesVerified;
    })
    .sort((a: FundingProject, b: FundingProject) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'ada_high':
          return (b.current_funding || 0) - (a.current_funding || 0);
        case 'ada_low':
          return (a.current_funding || 0) - (b.current_funding || 0);
        case 'deadline_soon':
          return new Date(a.funding_deadline).getTime() - new Date(b.funding_deadline).getTime();
        case 'deadline_far':
          return new Date(b.funding_deadline).getTime() - new Date(a.funding_deadline).getTime();
        case 'goal_high':
          return b.funding_goal - a.funding_goal;
        case 'goal_low':
          return a.funding_goal - b.funding_goal;
        default:
          return 0;
      }
    });

  const handleContribute = async () => {
    if (!isConnected || !walletAddress || !selectedProject) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setContributing(true);

      // Send ADA transaction
      const txHash = await fundingService.sendADA(
        selectedProject.wallet_address,
        amount
      );

      // Record contribution in database
      await fundingService.contributeTo({
        project_funding_id: selectedProject.id,
        ada_amount: amount,
        ada_tx_hash: txHash,
        message: contributeMessage,
        is_anonymous: isAnonymous
      }, walletAddress);

      toast.success('Contribution successful! Thank you for supporting this project.');
      setShowContributeModal(false);
      setContributeAmount('');
      setContributeMessage('');
      setIsAnonymous(false);
      fetchProjects(); // Refresh to show updated funding

    } catch (error: any) {
      console.error('Contribution error:', error);
      toast.error(error.message || 'Failed to process contribution');
    } finally {
      setContributing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading funding projects...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg mb-6">
            <div className="px-6 py-8 sm:p-10">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">Project Funding</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Support innovative projects in the Cardano ecosystem
                  </p>
                </div>
                <button
                  onClick={() => navigate('/funding/create')}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <FaPlus className="w-5 h-5 mr-2" />
                  Create Funding
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white shadow-sm rounded-lg mb-6">
            <div className="px-6 py-6">
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search funding projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative min-w-[220px]">
                    <div className="relative">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                      >
                        <span className="text-gray-700">
                          {selectedCategories.length === 0 
                            ? 'All Categories' 
                            : selectedCategories.length === 1 
                              ? selectedCategories[0]
                              : `${selectedCategories.length} categories selected`
                          }
                        </span>
                      </button>
                      {showFilters && (
                        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {PROJECT_CATEGORIES.map(category => (
                            <label key={category} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(category)}
                                onChange={() => toggleCategory(category)}
                                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-gray-900">{category}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="min-w-[220px]">
                    <CustomSelect
                      options={sortOptions}
                      value={sortBy}
                      onChange={setSortBy}
                      placeholder="Sort by"
                      className=""
                    />
                  </div>
                  
                  <div className="flex items-center min-w-[220px]">
                    <button
                      onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors mr-3 ${
                        showVerifiedOnly 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                      }`}
                    >
                      <FaCheckCircle className="w-3 h-3" />
                    </button>
                    <label className="text-sm text-gray-700 cursor-pointer" onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}>
                      Show only verified projects
                    </label>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredAndSortedProjects.length} of {projects.length} funding projects
              {showVerifiedOnly && ' (verified only)'}
            </span>
            <span className="flex items-center gap-2">
              <FaSort className="text-gray-400" />
              Sorted by: {sortOptions.find(opt => opt.value === sortBy)?.label}
            </span>
          </div>
          
          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProjects.length === 0 ? (
              <div className="col-span-full bg-white shadow-sm rounded-lg p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">💡</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-500">Try adjusting your search or create a new funding project.</p>
              </div>
            ) : (
              filteredAndSortedProjects.map((project: FundingProject) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0 }}
                  className="bg-white shadow-sm rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  onClick={() => setSelectedProjectForPanel(project)}
                >
                  {/* Project Header */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-gray-900 truncate">{project.title}</h3>
                        {project.is_verified && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center" title="Verified Project">
                            <FaCheck className="text-white text-xs" />
                          </div>
                        )}
                      </div>
                      {/* Project Logo */}
                      {project.logo_url ? (
                        <img 
                          src={project.logo_url} 
                          alt={`${project.title} logo`}
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Logo</span>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {fundingService.formatADA(project.current_funding)} ADA raised
                        </span>
                        <span className="text-sm text-gray-500">
                          {(project.progress_percentage || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(project.progress_percentage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                        <span>Goal: {fundingService.formatADA(project.funding_goal)} ADA</span>
                        <span className="flex items-center">
                          <FaUsers className="mr-1" />
                          {project.contributor_count} contributors
                        </span>
                      </div>
                    </div>

                    {/* Contributor Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <FaUsers className="text-green-500 mr-1 text-sm" />
                          {project.contributor_count} backers
                        </span>
                        <span className="flex items-center">
                          <FaCalendarAlt className="text-blue-500 mr-1 text-sm" />
                          {fundingService.formatDeadline(project.funding_deadline)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                          setShowContributeModal(true);
                        }}
                        disabled={fundingService.isExpired(project.funding_deadline) || project.is_funded}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {project.is_funded ? (
                          <>
                            <FaCheckCircle />
                            Fully Funded
                          </>
                        ) : fundingService.isExpired(project.funding_deadline) ? (
                          <>
                            <FaClock />
                            Expired
                          </>
                        ) : (
                          <>
                            <FaDollarSign />
                            Contribute
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Project Details Side Panel */}
      <AnimatePresence>
        {selectedProjectForPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end p-4 z-50"
            onClick={() => setSelectedProjectForPanel(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-white h-full w-full max-w-2xl rounded-l-lg overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    {selectedProjectForPanel.logo_url ? (
                      <img 
                        src={selectedProjectForPanel.logo_url} 
                        alt={`${selectedProjectForPanel.title} logo`}
                        className="w-16 h-16 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Logo</span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {selectedProjectForPanel.title}
                        {selectedProjectForPanel.is_verified && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center" title="Verified Project">
                            <FaCheck className="text-white text-sm" />
                          </div>
                        )}
                      </h2>
                      <p className="text-gray-600">{selectedProjectForPanel.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProjectForPanel(null)}
                    className="text-gray-400 hover:text-gray-600 p-2"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>

                {/* Funding Progress */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {fundingService.formatADA(selectedProjectForPanel.current_funding)} ADA
                      </h3>
                      <p className="text-gray-600">raised of {fundingService.formatADA(selectedProjectForPanel.funding_goal)} ADA goal</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {(selectedProjectForPanel.progress_percentage || 0).toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500">funded</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(selectedProjectForPanel.progress_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <FaUsers />
                      {selectedProjectForPanel.contributor_count} contributors
                    </span>
                    <span>{fundingService.formatDeadline(selectedProjectForPanel.funding_deadline)}</span>
                  </div>
                </div>

                {/* Funding Purpose */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Funding Purpose</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedProjectForPanel.funding_purpose || 'No specific funding purpose provided.'}
                  </p>
                </div>

                {/* Project Links */}
                {(selectedProjectForPanel.website || selectedProjectForPanel.twitter_link || selectedProjectForPanel.discord_link) && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Links</h3>
                    <div className="flex gap-4">
                      {selectedProjectForPanel.website && (
                        <a 
                          href={selectedProjectForPanel.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          <FaGlobe />
                          Website
                        </a>
                      )}
                      {selectedProjectForPanel.twitter_link && (
                        <a 
                          href={selectedProjectForPanel.twitter_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          <FaTwitter />
                          Twitter
                        </a>
                      )}
                      {selectedProjectForPanel.discord_link && (
                        <a 
                          href={selectedProjectForPanel.discord_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          <FaDiscord />
                          Discord
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Contributors Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contributors</h3>
                  <div className="space-y-3">
                    {selectedProjectForPanel.contributions && selectedProjectForPanel.contributions.length > 0 ? (
                      selectedProjectForPanel.contributions.map((contribution: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900">
                                {contribution.display_name || contribution.contributor_wallet}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(contribution.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-lg font-semibold text-blue-600">
                              {fundingService.formatADA(contribution.amount)} ADA
                            </span>
                          </div>
                          {contribution.message && (
                            <p className="text-gray-700 text-sm italic">"{contribution.message}"</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No contributions yet. Be the first to support this project!</p>
                    )}
                  </div>
                </div>

                {/* Contribute Button */}
                <div className="sticky bottom-0 bg-white border-t pt-4">
                  <button
                    onClick={() => {
                      setSelectedProject(selectedProjectForPanel);
                      setSelectedProjectForPanel(null);
                      setShowContributeModal(true);
                    }}
                    disabled={fundingService.isExpired(selectedProjectForPanel.funding_deadline) || selectedProjectForPanel.is_funded}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    {selectedProjectForPanel.is_funded ? (
                      <>
                        <FaCheckCircle />
                        Fully Funded
                      </>
                    ) : fundingService.isExpired(selectedProjectForPanel.funding_deadline) ? (
                      <>
                        <FaClock />
                        Funding Expired
                      </>
                    ) : (
                      <>
                        <FaDollarSign />
                        Contribute Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contribute Modal */}
      <AnimatePresence>
        {showContributeModal && selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Contribute to {selectedProject.title}
                </h3>
                <button
                  onClick={() => setShowContributeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (ADA)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount in ADA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={contributeMessage}
                    onChange={(e) => setContributeMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Leave a message for the project team..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700">
                    Contribute anonymously
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowContributeModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContribute}
                    disabled={contributing || !contributeAmount}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {contributing ? 'Processing...' : 'Contribute'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Funding;
