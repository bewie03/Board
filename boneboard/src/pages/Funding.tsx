import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSearch, FaSort, FaCheck, FaClock, FaUsers, FaDiscord, FaGlobe, FaTimes, FaInfoCircle, FaPlus } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useWallet } from '../contexts/WalletContext';
import { fundingService, FundingProject } from '../services/fundingService';
import { toast } from 'react-toastify';
import CustomSelect from '../components/CustomSelect';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { PROJECT_CATEGORIES } from '../constants/categories';
import { fraudDetection, FraudCheckResult } from '../utils/fraudDetection';

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);
  const [selectedProjectForPanel, setSelectedProjectForPanel] = useState<FundingProject | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionMessage, setContributionMessage] = useState('');
  const [isContributionAnonymous, setIsContributionAnonymous] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [userHasActiveFunding, setUserHasActiveFunding] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);


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

  const statusOptions = [
    { value: 'all', label: 'All Projects' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'expired', label: 'Expired' }
  ];

  useEffect(() => {
    fetchProjects();
    checkUserActiveFunding();
  }, [isConnected, walletAddress]);

  const checkUserActiveFunding = async () => {
    if (!isConnected || !walletAddress) {
      setUserHasActiveFunding(false);
      return;
    }

    try {
      const existingFundings = await fundingService.getFundingByWallet(walletAddress);
      const hasActiveFunding = existingFundings.some(funding => 
        !fundingService.isExpired(funding.funding_deadline)
      );
      setUserHasActiveFunding(hasActiveFunding);
    } catch (error) {
      console.error('Error checking user active funding:', error);
      setUserHasActiveFunding(false);
    }
  };

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
      
      // Status filtering
      const now = new Date();
      const deadline = new Date(project.funding_deadline);
      const isExpired = deadline < now;
      const isCompleted = project.is_funded;
      const isActive = !isExpired && !isCompleted;
      
      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = isActive;
      } else if (statusFilter === 'completed') {
        matchesStatus = isCompleted;
      } else if (statusFilter === 'expired') {
        matchesStatus = isExpired && !isCompleted;
      }
      
      return matchesSearch && matchesCategory && matchesVerified && matchesStatus;
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

      // Anti-fraud check: Prevent self-donations
      const fraudCheck: FraudCheckResult = await fraudDetection.checkContributionAllowed(
        selectedProject.id,
        walletAddress,
        selectedProject.wallet_address
      );

      if (!fraudCheck.isAllowed) {
        toast.error(fraudCheck.reason || 'Contribution not allowed');
        setContributing(false);
        return;
      }

      // Show warning for medium risk
      if (fraudCheck.riskLevel === 'medium') {
        toast.warning('Unusual activity detected. Contribution will be monitored.');
      }

      // Validate wallet address BEFORE transaction
      const validation = await fundingService.validateWalletAddress(walletAddress);
      
      if (!validation.isValid) {
        console.error('Wallet address validation failed:', validation.error);
        toast.error(validation.error || 'Wallet address validation failed');
        setContributing(false);
        return;
      }

      // Send ADA transaction to funding wallet using validated address
      const { txHash } = await fundingService.sendADA(
        selectedProject.funding_wallet || selectedProject.wallet_address,
        amount
      );

      // Record contribution in database with validated address
      await fundingService.contributeTo({
        project_funding_id: selectedProject.id,
        ada_amount: amount,
        ada_tx_hash: txHash,
        message: contributionMessage,
        is_anonymous: isContributionAnonymous
      }, validation.paymentAddress!); // Use the pre-validated payment address

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
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-extrabold text-gray-900">Project Funding</h1>
                    <div className="relative">
                      <button
                        onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="About Project Funding"
                      >
                        <FaInfoCircle className="h-5 w-5" />
                      </button>
                      {showInfoTooltip && (
                        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                          <div className="text-sm">
                            <h3 className="font-semibold text-gray-900 mb-2">About Project Funding</h3>
                            <p className="text-gray-600 mb-2">
                              Support innovative Cardano projects by contributing ADA to their funding campaigns. Help bring promising ideas to life.
                            </p>
                            <ul className="text-gray-600 space-y-1 text-xs">
                              <li>• Contribute ADA to projects you believe in</li>
                              <li>• Track funding progress and deadlines</li>
                              <li>• View project details and team information</li>
                              <li>• Filter by category, funding status, and verification</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Support innovative projects in the Cardano ecosystem
                  </p>
                </div>
{!userHasActiveFunding && (
                  <button
                    onClick={() => navigate('/funding/create')}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <FaPlus className="w-5 h-5 mr-2" />
                    Create Funding
                  </button>
                )}
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
                      options={statusOptions}
                      value={statusFilter}
                      onChange={setStatusFilter}
                      placeholder="Status"
                      className=""
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
                  className={`bg-white shadow-sm rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative ${
                    project.is_funded 
                      ? 'ring-2 ring-blue-100' 
                      : fundingService.isExpired(project.funding_deadline)
                      ? 'ring-2 ring-gray-300 opacity-60'
                      : ''
                  }`}
                  onClick={() => setSelectedProjectForPanel(project)}
                >
                  {/* Light blue overlay for fully funded projects */}
                  {project.is_funded && (
                    <div className="absolute inset-0 bg-blue-100 bg-opacity-30 pointer-events-none z-10"></div>
                  )}
                  
                  {/* Grey overlay for expired projects */}
                  {!project.is_funded && fundingService.isExpired(project.funding_deadline) && (
                    <div className="absolute inset-0 bg-gray-400 bg-opacity-20 pointer-events-none z-10"></div>
                  )}
                  
                  {/* Project Header */}
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {/* Project Logo */}
                      {project.logo ? (
                        <img 
                          src={project.logo} 
                          alt={`${project.title} logo`}
                          className={`w-16 h-16 rounded-lg object-cover border-2 border-gray-100 shadow-sm flex-shrink-0 ${
                            !project.is_funded && fundingService.isExpired(project.funding_deadline) 
                              ? 'filter grayscale' 
                              : ''
                          }`}
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
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              !project.is_funded && fundingService.isExpired(project.funding_deadline)
                                ? 'bg-gray-400'
                                : 'bg-blue-500'
                            }`} title="Verified Project">
                              <FaCheck className="text-white text-xs" />
                            </div>
                          )}
                          {/* Status badges - removed for fully funded projects */}
                        </div>
                        {project.category && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            !project.is_funded && fundingService.isExpired(project.funding_deadline)
                              ? 'text-gray-500 bg-gray-200'
                              : 'text-blue-600 bg-blue-50'
                          }`}>
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
                          {project.contributor_count} contributions
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
                        className={`flex-1 px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center justify-center gap-2 ${
                          project.is_funded 
                            ? 'bg-blue-600 text-white cursor-default' 
                            : fundingService.isExpired(project.funding_deadline)
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {project.is_funded ? (
                          'Fully Funded'
                        ) : fundingService.isExpired(project.funding_deadline) ? (
                          <>
                            <FaClock />
                            Expired
                          </>
                        ) : (
                          'Contribute'
                        )}
                      </button>
                      
                      {/* Time Left Indicator - only show if not fully funded and not expired */}
                      {!project.is_funded && !fundingService.isExpired(project.funding_deadline) && (
                        <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-md border border-gray-200 min-w-[120px] justify-center">
                          <FaClock className="mr-2 text-gray-500" />
                          <span className="font-medium">{fundingService.formatDeadline(project.funding_deadline)}</span>
                        </div>
                      )}
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
              className="bg-white h-full w-full max-w-2xl overflow-y-auto scrollbar-hide"
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
                      {selectedProjectForPanel.contributor_count} contributions
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
                      'Fully Funded'
                    ) : fundingService.isExpired(selectedProjectForPanel.funding_deadline) ? (
                      <>
                        Contribute
                      </>
                    ) : (
                      <>
                        Contribute
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
              className="bg-white rounded-xl shadow-2xl p-0 w-full max-w-lg overflow-hidden"
            >
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Support This Project
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {selectedProject.title}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowContributeModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Contribution Amount
                  </label>
                  <div className="relative">
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
                      className="w-full px-4 py-3 text-lg font-medium border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm font-medium">ADA</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Maximum contribution: 999 ADA</p>
                </div>

                {/* Message Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Message to Project Team <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={contributionMessage}
                      onChange={(e) => {
                        const value = e.target.value;
                        const lines = value.split('\n');
                        
                        // Prevent pasting or typing that would exceed limits
                        if (value.length > 150) {
                          return;
                        }
                        
                        if (lines.length > 4) {
                          return;
                        }
                        
                        // Check for lines that are too long (approximate 45 chars per line for readability)
                        const hasLongLine = lines.some(line => line.length > 45);
                        if (hasLongLine) {
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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white resize-none"
                      rows={3}
                      maxLength={150}
                      placeholder="Share your thoughts or encouragement with the team..."
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded-md">
                      {contributionMessage.length}/150
                    </div>
                  </div>
                  {contributionMessage.split('\n').some(line => line.length > 45) && (
                    <p className="text-xs text-red-500 mt-2 flex items-center">
                      <FaTimes className="w-3 h-3 mr-1" />
                      Some lines are too long (max 45 characters per line)
                    </p>
                  )}
                </div>

                {/* Anonymous Checkbox with Better Styling */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="flex items-start cursor-pointer">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        id="anonymous"
                        checked={isContributionAnonymous}
                        onChange={(e) => setIsContributionAnonymous(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isContributionAnonymous 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'bg-white border-gray-300 hover:border-blue-400'
                      }`}>
                        {isContributionAnonymous && (
                          <FaCheck className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-900">
                        Contribute anonymously
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        Your wallet address and username will be hidden from public view
                      </p>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowContributeModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContribute}
                    disabled={contributing || !contributionAmount}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
                  >
                    {contributing ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        Contribute {contributionAmount ? `${contributionAmount} ADA` : ''}
                      </div>
                    )}
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
