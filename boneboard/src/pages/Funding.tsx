import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaSearch, FaUsers, FaTimes, FaSort, FaCheckCircle, FaClock, FaDollarSign, FaCheck, FaDiscord, FaGlobe } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useWallet } from '../contexts/WalletContext';
import { fundingService, FundingProject } from '../services/fundingService';
import { toast } from 'react-toastify';
import CustomSelect from '../components/CustomSelect';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { PROJECT_CATEGORIES } from '../constants/categories';

// Contributors Section Component
const ContributorsSection: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        setLoading(true);
        const project = await fundingService.getFundingProject(projectId);
        setContributions(project.contributions || []);
      } catch (error) {
        console.error('Error fetching contributions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContributions();
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-4">Loading contributors...</div>;
  }

  return (
    <div className="space-y-3">
      {contributions.length > 0 ? (
        contributions.map((contribution: any, index: number) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                {contribution.display_name === 'Anonymous' ? (
                  <p className="font-medium text-gray-900">Anonymous</p>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-gray-900 font-medium">
                      {contribution.username || 'Unknown User'}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(contribution.contributor_wallet);
                        toast.success('Wallet address copied!');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline text-left mt-1"
                      title="Click to copy full wallet address"
                    >
                      {contribution.contributor_wallet.slice(0, 8)}...{contribution.contributor_wallet.slice(-6)}
                    </button>
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  {new Date(contribution.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-lg font-semibold text-blue-600">
                {fundingService.formatADA(contribution.ada_amount)} ADA
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
  );
};

const Funding: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  
  const [projects, setProjects] = useState<FundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);
  const [selectedProjectForPanel, setSelectedProjectForPanel] = useState<FundingProject | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionMessage, setContributionMessage] = useState('');
  const [isContributionAnonymous, setIsContributionAnonymous] = useState(false);
  const [contributing, setContributing] = useState(false);


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
        selectedCategories.includes('all') ||
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

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setContributing(true);

      // Send ADA transaction to funding wallet
      const txHash = await fundingService.sendADA(
        selectedProject.funding_wallet || selectedProject.wallet_address,
        amount
      );

      // Record contribution in database
      await fundingService.contributeTo({
        project_funding_id: selectedProject.id,
        ada_amount: amount,
        ada_tx_hash: txHash,
        message: contributionMessage,
        is_anonymous: isContributionAnonymous
      }, walletAddress);

      toast.success('Contribution successful! Thank you for supporting this project.');
      setShowContributeModal(false);
      setContributionAmount('');
      setContributionMessage('');
      setIsContributionAnonymous(false);
      fetchProjects(); // Refresh to show updated funding
      
      // Refresh contributors in the side panel if it's open
      if (selectedProjectForPanel && selectedProjectForPanel.id === selectedProject.id) {
        // Force re-render of contributors section
        setSelectedProjectForPanel({...selectedProjectForPanel});
      }

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
            <div className="px-6 py-4">
              <div className="flex flex-col lg:flex-row gap-4 mb-3">
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search funding projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-[42px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="min-w-[200px]">
                    <MultiSelectDropdown
                      options={[
                        { value: 'all', label: 'All Categories' },
                        ...PROJECT_CATEGORIES.map(cat => ({ value: cat, label: cat }))
                      ]}
                      selectedValues={selectedCategories.length === 0 ? ['all'] : selectedCategories}
                      onChange={(values) => {
                        if (values.includes('all')) {
                          setSelectedCategories([]);
                        } else {
                          setSelectedCategories(values);
                        }
                      }}
                      placeholder="All Categories"
                    />
                  </div>
                  
                  <div className="min-w-[180px]">
                    <CustomSelect
                      options={sortOptions}
                      value={sortBy}
                      onChange={setSortBy}
                      placeholder="Sort by"
                      className=""
                    />
                  </div>
                  
                  <div className="flex items-center min-w-[180px] bg-white border border-gray-300 rounded-lg px-3 h-[42px]">
                    <input
                      type="checkbox"
                      id="verified-only"
                      checked={showVerifiedOnly}
                      onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    <label htmlFor="verified-only" className="text-sm text-gray-700 cursor-pointer select-none">
                      Verified only
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Results Summary */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {filteredAndSortedProjects.length} of {projects.length} funding projects
                  {showVerifiedOnly && ' (verified only)'}
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <FaSort className="mr-1" />
                  Sorted by: {sortOptions.find(option => option.value === sortBy)?.label || 'Newest First'}
                </div>
              </div>
            </div>
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
                    <div className="flex items-center gap-4 mb-4">
                      {/* Project Logo */}
                      {project.logo ? (
                        <img 
                          src={project.logo} 
                          alt={`${project.title} logo`}
                          className="w-16 h-16 rounded-lg object-cover border-2 border-gray-100 shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
                          <span className="text-gray-400 text-sm font-medium">No Logo</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                          {project.is_verified && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center" title="Verified Project">
                              <FaCheck className="text-white text-xs" />
                            </div>
                          )}
                        </div>
                        {project.category && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                            {project.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.funding_purpose || project.description}</p>

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

                    {/* Action Buttons with Time Left */}
                    <div className="flex items-center gap-3">
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
                      
                      {/* Time Left Indicator */}
                      <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-md border border-gray-200 min-w-[120px] justify-center">
                        <FaClock className="mr-2 text-gray-500" />
                        <span className="font-medium">{fundingService.formatDeadline(project.funding_deadline)}</span>
                      </div>
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50"
            onClick={() => setSelectedProjectForPanel(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-white h-full w-full max-w-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-6 flex-1">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      {selectedProjectForPanel.logo ? (
                        <img 
                          src={selectedProjectForPanel.logo} 
                          alt={`${selectedProjectForPanel.title} logo`}
                          className="w-20 h-20 rounded-xl object-cover border-2 border-gray-100 shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                          <span className="text-gray-400 text-base font-medium">No Logo</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Title and Links */}
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-3">
                        {selectedProjectForPanel.title}
                        {selectedProjectForPanel.is_verified && (
                          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center" title="Verified Project">
                            <FaCheck className="text-white text-sm" />
                          </div>
                        )}
                      </h2>
                      
                      {/* Project Links */}
                      {(selectedProjectForPanel.website || selectedProjectForPanel.twitter_link || selectedProjectForPanel.discord_link) && (
                        <div className="flex gap-2 mb-4">
                          {selectedProjectForPanel.website && (
                            <a 
                              href={selectedProjectForPanel.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-9 h-9 bg-gray-100 hover:bg-blue-100 rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                              title="Visit Website"
                            >
                              <FaGlobe className="text-base" />
                            </a>
                          )}
                          {selectedProjectForPanel.twitter_link && (
                            <a 
                              href={selectedProjectForPanel.twitter_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-9 h-9 bg-gray-100 hover:bg-blue-100 rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                              title="Follow on Twitter"
                            >
                              <FaXTwitter className="text-base" />
                            </a>
                          )}
                          {selectedProjectForPanel.discord_link && (
                            <a 
                              href={selectedProjectForPanel.discord_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-9 h-9 bg-gray-100 hover:bg-blue-100 rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                              title="Join Discord"
                            >
                              <FaDiscord className="text-base" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedProjectForPanel(null)}
                    className="text-gray-400 hover:text-gray-600 p-2 ml-4 flex-shrink-0"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
                
                {/* Description */}
                <div className="mb-6">
                  <p className="text-gray-600 text-lg leading-relaxed">{selectedProjectForPanel.description}</p>
                </div>

                {/* Funding Progress */}
                <div className="bg-gray-50 rounded-lg p-6 mb-4">
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

                {/* Contributors Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contributors</h3>
                  <ContributorsSection projectId={selectedProjectForPanel.id} />
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

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (ADA)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    max="999"
                    value={contributionAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseFloat(value) <= 999 && value.length <= 3)) {
                        setContributionAmount(value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount in ADA (max 999)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    value={contributionMessage}
                    onChange={(e) => {
                      const value = e.target.value;
                      const lines = value.split('\n');
                      
                      // Prevent pasting or typing that would exceed limits
                      if (value.length > 200) {
                        return;
                      }
                      
                      if (lines.length > 4) {
                        return;
                      }
                      
                      setContributionMessage(value);
                    }}
                    onKeyDown={(e) => {
                      const value = e.currentTarget.value;
                      const lines = value.split('\n');
                      
                      // Prevent Enter key if already at 4 lines
                      if (e.key === 'Enter' && lines.length >= 4) {
                        e.preventDefault();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    maxLength={200}
                    placeholder="Leave a message for the project team... (max 200 chars, 4 lines)"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {contributionMessage.length}/200 characters, {contributionMessage.split('\n').length}/4 lines
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isContributionAnonymous}
                    onChange={(e) => setIsContributionAnonymous(e.target.checked)}
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
                    disabled={contributing || !contributionAmount}
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
