import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash, FaPause, FaPlay, FaEye, FaCalendarAlt, FaUsers, FaCoins, FaTimes, FaCheck, FaGlobe, FaTwitter, FaDiscord } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import { toast } from 'react-toastify';
import { fundingService } from '../../services/fundingService';

interface FundingProject {
  id: string;
  project_id: string;
  project_title: string;
  title?: string;
  project_logo?: string;
  logo_url?: string;
  description?: string;
  category?: string;
  website?: string;
  twitter_link?: string;
  discord_link?: string;
  is_verified?: boolean;
  funding_goal: number;
  current_funding: number;
  funding_deadline: string;
  funding_purpose: string;
  is_active: boolean;
  is_funded?: boolean;
  created_at: string;
  contributor_count: number;
  progress_percentage: number;
  contributions?: any[];
}

const MyFunding: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const [fundingProjects, setFundingProjects] = useState<FundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPurpose, setEditingPurpose] = useState<string | null>(null);
  const [editPurposeText, setEditPurposeText] = useState('');
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);

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

  const handleEditPurpose = (fundingId: string, currentPurpose: string) => {
    setEditingPurpose(fundingId);
    setEditPurposeText(currentPurpose);
  };

  const handleSavePurpose = async (fundingId: string) => {
    try {
      const response = await fetch(`/api/funding/${fundingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress || ''
        },
        body: JSON.stringify({
          funding_purpose: editPurposeText
        })
      });

      if (response.ok) {
        toast.success('Funding purpose updated successfully');
        setEditingPurpose(null);
        fetchMyFunding(); // Refresh the list
      } else {
        toast.error('Failed to update funding purpose');
      }
    } catch (error) {
      console.error('Error updating funding purpose:', error);
      toast.error('Failed to update funding purpose');
    }
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
                          {funding.project_title || funding.title}
                        </h3>
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                          {funding.funding_purpose || 'No funding purpose specified'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
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
                        onClick={() => setSelectedProject(funding)}
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

                  {/* Funding Purpose */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Funding Purpose</label>
                      {editingPurpose !== funding.id && (
                        <button
                          onClick={() => handleEditPurpose(funding.id, funding.funding_purpose)}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                        >
                          <FaEdit className="w-3 h-3 mr-1" />
                          Edit
                        </button>
                      )}
                    </div>
                    
                    {editingPurpose === funding.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editPurposeText}
                          onChange={(e) => setEditPurposeText(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {editPurposeText.length}/500 characters
                          </span>
                          <div className="space-x-2">
                            <button
                              onClick={() => setEditingPurpose(null)}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSavePurpose(funding.id)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-md">
                        {funding.funding_purpose || 'No purpose specified'}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Project Details Side Panel */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end p-4 z-50"
            onClick={() => setSelectedProject(null)}
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
                    {(selectedProject.logo_url || selectedProject.project_logo) ? (
                      <img 
                        src={selectedProject.logo_url || selectedProject.project_logo} 
                        alt={`${selectedProject.title || selectedProject.project_title} logo`}
                        className="w-16 h-16 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No Logo</span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {selectedProject.title || selectedProject.project_title}
                        {selectedProject.is_verified && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center" title="Verified Project">
                            <FaCheck className="text-white text-sm" />
                          </div>
                        )}
                      </h2>
                      <p className="text-gray-600">{selectedProject.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProject(null)}
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
                        {fundingService.formatADA(selectedProject.current_funding)} ADA
                      </h3>
                      <p className="text-gray-600">raised of {fundingService.formatADA(selectedProject.funding_goal)} ADA goal</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {(selectedProject.progress_percentage || 0).toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-500">funded</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(selectedProject.progress_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <FaUsers />
                      {selectedProject.contributor_count} contributors
                    </span>
                    <span>{fundingService.formatDeadline(selectedProject.funding_deadline)}</span>
                  </div>
                </div>

                {/* Funding Purpose */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Funding Purpose</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedProject.funding_purpose || 'No specific funding purpose provided.'}
                  </p>
                </div>

                {/* Project Links */}
                {(selectedProject.website || selectedProject.twitter_link || selectedProject.discord_link) && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Links</h3>
                    <div className="flex gap-4">
                      {selectedProject.website && (
                        <a 
                          href={selectedProject.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          <FaGlobe />
                          Website
                        </a>
                      )}
                      {selectedProject.twitter_link && (
                        <a 
                          href={selectedProject.twitter_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
                        >
                          <FaTwitter />
                          Twitter
                        </a>
                      )}
                      {selectedProject.discord_link && (
                        <a 
                          href={selectedProject.discord_link} 
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
                    {selectedProject.contributions && selectedProject.contributions.length > 0 ? (
                      selectedProject.contributions.map((contribution: any, index: number) => (
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
                      <p className="text-gray-500 text-center py-8">No contributions yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyFunding;
