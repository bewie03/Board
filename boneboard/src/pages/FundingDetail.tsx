import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaCalendarAlt, FaTwitter, FaDiscord, FaGlobe, FaTimes, FaHeart, FaShare } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import { fundingService, FundingProject, FundingContribution } from '../services/fundingService';
import { toast } from 'react-toastify';

const FundingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  
  const [project, setProject] = useState<FundingProject & { contributions: FundingContribution[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeMessage, setContributeMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [contributing, setContributing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const data = await fundingService.getFundingProject(id!);
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details');
      navigate('/funding');
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async () => {
    if (!isConnected || !walletAddress || !project) {
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
        project.wallet_address,
        amount
      );

      // Record contribution in database
      await fundingService.contributeTo({
        project_funding_id: project.id,
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
      fetchProject(); // Refresh to show updated funding

    } catch (error: any) {
      console.error('Contribution error:', error);
      toast.error(error.message || 'Failed to process contribution');
    } finally {
      setContributing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
          <button
            onClick={() => navigate('/funding')}
            className="mt-4 text-blue-600 hover:text-blue-500"
          >
            Back to Funding
          </button>
        </div>
      </div>
    );
  }

  const isExpired = fundingService.isExpired(project.funding_deadline);
  const canContribute = !isExpired && !project.is_funded;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/funding')}
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <FaArrowLeft className="mr-2" />
              Back to Funding
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white shadow-sm rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center">
                    {project.logo_url ? (
                      <img
                        src={project.logo_url}
                        alt={project.title}
                        className="h-16 w-16 rounded-full object-cover mr-4"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                        <span className="text-blue-600 font-bold text-xl">
                          {project.title.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {project.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <FaHeart />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                      <FaShare />
                    </button>
                  </div>
                </div>

                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                  {project.description}
                </p>

                {/* Social Links */}
                <div className="flex gap-4">
                  {project.website && (
                    <a
                      href={project.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-500"
                    >
                      <FaGlobe className="mr-2" />
                      Website
                    </a>
                  )}
                  {project.twitter_link && (
                    <a
                      href={project.twitter_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-500"
                    >
                      <FaTwitter className="mr-2" />
                      Twitter
                    </a>
                  )}
                  {project.discord_link && (
                    <a
                      href={project.discord_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-500"
                    >
                      <FaDiscord className="mr-2" />
                      Discord
                    </a>
                  )}
                </div>
              </motion.div>

              {/* Recent Contributions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white shadow-sm rounded-lg p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Recent Contributions ({project.contributions.length})
                </h2>
                
                {project.contributions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">💝</div>
                    <p className="text-gray-500">No contributions yet. Be the first to support this project!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.contributions.slice(0, 10).map((contribution) => (
                      <div key={contribution.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="flex items-center mb-1">
                            <span className="font-medium text-gray-900">
                              {contribution.display_name}
                            </span>
                            <span className="ml-2 text-sm text-gray-500">
                              {formatDate(contribution.created_at)}
                            </span>
                          </div>
                          {contribution.message && (
                            <p className="text-gray-700 text-sm">{contribution.message}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-green-600">
                            +{fundingService.formatADA(contribution.ada_amount)} ADA
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Funding Progress */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white shadow-sm rounded-lg p-6"
              >
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {fundingService.formatADA(project.current_funding)} ADA
                  </div>
                  <div className="text-gray-500">
                    raised of {fundingService.formatADA(project.funding_goal)} ADA goal
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(project.progress_percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>{project.progress_percentage.toFixed(1)}% funded</span>
                    <span>{project.contributor_count} contributors</span>
                  </div>
                </div>

                {/* Deadline */}
                <div className="flex items-center justify-center text-gray-600 mb-6">
                  <FaCalendarAlt className="mr-2" />
                  <span>{fundingService.formatDeadline(project.funding_deadline)}</span>
                </div>

                {/* Contribute Button */}
                <button
                  onClick={() => setShowContributeModal(true)}
                  disabled={!canContribute}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {project.is_funded ? 'Fully Funded' : 
                   isExpired ? 'Funding Expired' : 
                   'Contribute Now'}
                </button>

                {!isConnected && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Connect your wallet to contribute
                  </p>
                )}
              </motion.div>

              {/* Project Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white shadow-sm rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">{formatDate(project.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deadline</span>
                    <span className="font-medium">{formatDate(project.funding_deadline)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-medium ${
                      project.is_funded ? 'text-green-600' : 
                      isExpired ? 'text-red-600' : 
                      'text-blue-600'
                    }`}>
                      {project.is_funded ? 'Fully Funded' : 
                       isExpired ? 'Expired' : 
                       'Active'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribute Modal */}
      <AnimatePresence>
        {showContributeModal && (
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
                  Contribute to {project.title}
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

export default FundingDetail;
