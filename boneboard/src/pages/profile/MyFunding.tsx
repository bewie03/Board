import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaTrash, FaPause, FaPlay, FaEye, FaCalendarAlt, FaUsers, FaCoins, FaTimes, FaCheckCircle, FaClock, FaDollarSign, FaTwitter, FaDiscord, FaGlobe } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import { toast } from 'react-toastify';
import { fundingService } from '../../services/fundingService';

interface FundingProject {
  id: string;
  project_id: string;
  project_title: string;
  project_logo?: string;
  logo_url?: string;
  funding_goal: number;
  current_funding: number;
  funding_deadline: string;
  funding_purpose: string;
  is_active: boolean;
  created_at: string;
  contributor_count: number;
  progress_percentage: number;
}

const MyFunding: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const [fundingProjects, setFundingProjects] = useState<FundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectForPanel, setSelectedProjectForPanel] = useState<FundingProject | null>(null);
  const [detailedProject, setDetailedProject] = useState<any>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchMyFunding();
    }
  }, [walletAddress]);

  const fetchMyFunding = async () => {
    try {
      setLoading(true);
      console.log('Fetching funding for wallet:', walletAddress);
      const response = await fetch(`/api/funding?owner=${encodeURIComponent(walletAddress || '')}`, {
        headers: {
          'x-wallet-address': walletAddress || ''
        }
      });
      
      console.log('Funding API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Funding projects received:', data.length, data);
        setFundingProjects(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch funding projects:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching funding projects:', error);
      toast.error('Failed to load your funding projects');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (funding: FundingProject) => {
    try {
      console.log('Fetching detailed funding project:', funding.id);
      const detailed = await fundingService.getFundingProject(funding.id);
      console.log('Detailed funding project:', detailed);
      setDetailedProject(detailed);
      setSelectedProjectForPanel(funding);
    } catch (error) {
      console.error('Error fetching detailed funding project:', error);
      toast.error('Failed to load project details');
    }
  };

  const handleCloseSidePanel = () => {
    setSelectedProjectForPanel(null);
    setDetailedProject(null);
  };


  const handleToggleActive = async (fundingId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/funding/${fundingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress || ''
        },
        body: JSON.stringify({
          is_active: !currentStatus
        })
      });

      if (response.ok) {
        toast.success(`Funding project ${!currentStatus ? 'activated' : 'paused'} successfully`);
        fetchMyFunding(); // Refresh the list
      } else {
        toast.error('Failed to update funding status');
      }
    } catch (error) {
      console.error('Error updating funding status:', error);
      toast.error('Failed to update funding status');
    }
  };

  const handleDeleteFunding = async (fundingId: string) => {
    if (!confirm('Are you sure you want to delete this funding project? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/funding/${fundingId}`, {
        method: 'DELETE',
        headers: {
          'x-wallet-address': walletAddress || ''
        }
      });

      if (response.ok) {
        toast.success('Funding project deleted successfully');
        fetchMyFunding(); // Refresh the list
      } else {
        toast.error('Failed to delete funding project');
      }
    } catch (error) {
      console.error('Error deleting funding project:', error);
      toast.error('Failed to delete funding project');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your funding projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">My Project Funding</h1>
          <p className="mt-2 text-gray-600">
            Manage your active funding campaigns
          </p>
        </div>

        {fundingProjects.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCoins className="text-blue-600 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No funding projects found</h3>
            <p className="text-gray-500 mb-6">
              You haven't created any funding campaigns yet.
            </p>
            <button
              onClick={() => navigate('/funding/create')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Funding Project
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {fundingProjects.map((funding) => (
              <motion.div
                key={funding.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white shadow-sm rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {(funding.project_logo || funding.logo_url) ? (
                        <img
                          src={funding.project_logo || funding.logo_url}
                          alt="Project logo"
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-400 text-xs">No Logo</span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {funding.project_title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <FaCalendarAlt className="w-4 h-4 mr-1" />
                            {fundingService.formatDeadline(funding.funding_deadline)}
                          </span>
                          <span className="flex items-center">
                            <FaUsers className="w-4 h-4 mr-1" />
                            {funding.contributor_count} backers
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            funding.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {funding.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(funding)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(funding.id, funding.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          funding.is_active
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={funding.is_active ? 'Pause' : 'Activate'}
                      >
                        {funding.is_active ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteFunding(funding.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {funding.current_funding} ADA raised
                      </span>
                      <span className="text-sm text-gray-500">
                        {funding.progress_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(funding.progress_percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1 text-sm text-gray-500">
                      <span>Goal: {funding.funding_goal} ADA</span>
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selectedProjectForPanel && detailedProject && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseSidePanel}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
            />
            
            {/* Side Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Project Details</h2>
                  <button
                    onClick={handleCloseSidePanel}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FaTimes className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Project Logo and Title */}
                <div className="mb-6">
                  {(detailedProject.logo_url || detailedProject.project_logo) ? (
                    <img
                      src={detailedProject.logo_url || detailedProject.project_logo}
                      alt={detailedProject.project_title}
                      className="w-16 h-16 rounded-lg object-cover mb-3"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-gray-400 text-xs">No Logo</span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">{detailedProject.project_title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{detailedProject.description}</p>
                </div>

                {/* Funding Progress */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Funding Progress</span>
                    <span className="text-sm text-gray-500">
                      {Math.round(detailedProject.progress_percentage || 0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(detailedProject.progress_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{detailedProject.current_funding || 0} ADA raised</span>
                    <span>Goal: {detailedProject.funding_goal} ADA</span>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center text-gray-600 mb-1">
                      <FaUsers className="w-4 h-4 mr-2" />
                      <span className="text-sm">Backers</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {detailedProject.contributor_count || 0}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center text-gray-600 mb-1">
                      <FaClock className="w-4 h-4 mr-2" />
                      <span className="text-sm">Deadline</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {fundingService.formatDeadline(detailedProject.funding_deadline)}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      detailedProject.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {detailedProject.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Project Links */}
                {(detailedProject.website || detailedProject.twitter_link || detailedProject.discord_link) && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Project Links</h4>
                    <div className="space-y-2">
                      {detailedProject.website && (
                        <a
                          href={detailedProject.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <FaGlobe className="w-4 h-4 mr-2" />
                          Website
                        </a>
                      )}
                      {detailedProject.twitter_link && (
                        <a
                          href={detailedProject.twitter_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <FaTwitter className="w-4 h-4 mr-2" />
                          Twitter
                        </a>
                      )}
                      {detailedProject.discord_link && (
                        <a
                          href={detailedProject.discord_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <FaDiscord className="w-4 h-4 mr-2" />
                          Discord
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Verification Badge */}
                {detailedProject.is_verified && (
                  <div className="mb-6">
                    <div className="flex items-center text-green-600 bg-green-50 p-3 rounded-lg">
                      <FaCheckCircle className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">Verified Project</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleCloseSidePanel();
                      navigate(`/funding/${detailedProject.id}`);
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FaDollarSign className="w-4 h-4 mr-2" />
                    View Full Details
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyFunding;
