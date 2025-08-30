import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaSearch, FaFilter, FaCalendarAlt, FaUsers, FaTimes } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import { fundingService, FundingProject } from '../services/fundingService';
import { toast } from 'react-toastify';

const Funding: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  
  const [projects, setProjects] = useState<FundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeMessage, setContributeMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [contributing, setContributing] = useState(false);

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'development', name: 'Development' },
    { id: 'design', name: 'Design' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'community', name: 'Community' },
    { id: 'defi', name: 'DeFi' },
    { id: 'nft', name: 'NFT' },
    { id: 'gaming', name: 'Gaming' },
    { id: 'education', name: 'Education' }
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await fundingService.getAllFundingProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load funding projects');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchTerm || 
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || project.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
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
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <FaFilter />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full bg-white shadow-sm rounded-lg p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">💡</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-500">Try adjusting your search or create a new funding project.</p>
              </div>
            ) : (
              filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="bg-white shadow-sm rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Project Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        {project.logo_url ? (
                          <img
                            src={project.logo_url}
                            alt={project.title}
                            className="h-12 w-12 rounded-full object-cover mr-3"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-bold text-lg">
                              {project.title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                            {project.title}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {project.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {project.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {fundingService.formatADA(project.current_funding)} ADA raised
                        </span>
                        <span className="text-sm text-gray-500">
                          {project.progress_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(project.progress_percentage, 100)}%` }}
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

                    {/* Deadline */}
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <FaCalendarAlt className="mr-2" />
                      {fundingService.formatDeadline(project.funding_deadline)}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setShowContributeModal(true);
                        }}
                        disabled={fundingService.isExpired(project.funding_deadline) || project.is_funded}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        {project.is_funded ? 'Fully Funded' : 
                         fundingService.isExpired(project.funding_deadline) ? 'Expired' : 
                         'Contribute'}
                      </button>
                      <button
                        onClick={() => navigate(`/funding/${project.id}`)}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

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
