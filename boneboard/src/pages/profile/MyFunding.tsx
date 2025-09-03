import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../../components/PageTransition';
import { FaCoins, FaUsers, FaCalendarAlt, FaEye, FaPause, FaPlay, FaRedo, FaCheck, FaGlobe, FaDiscord, FaEdit, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '../../contexts/WalletContext';
import { toast } from 'react-toastify';
import { fundingService } from '../../services/fundingService';
import { calculateFundingCost } from '../../utils/fundingPricing';
import { contractService } from '../../services/contractService';
import CustomSelect from '../../components/CustomSelect';

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
                        toast.success('Address copied!');
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
        <p className="text-gray-500 text-center py-8">No contributions yet.</p>
      )}
    </div>
  );
};

interface FundingProject {
  id: string;
  project_id: string;
  funding_goal: number;
  current_funding: number;
  funding_deadline: string;
  funding_purpose: string;
  is_active: boolean;
  is_funded: boolean;
  wallet_address: string;
  funding_wallet?: string;
  created_at: string;
  updated_at: string;
  project_title: string;
  title?: string;
  logo?: string;
  description?: string;
  category?: string;
  website?: string;
  twitter_link?: string;
  discord_link?: string;
  discord_invite?: string;
  is_verified?: boolean;
  progress_percentage: number;
  contributor_count: number;
  contributions?: any[];
}

// Copy Button Component with Animation
const CopyButton: React.FC<{ textToCopy: string; fundingId: string }> = ({ textToCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <motion.button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md ${
        copied 
          ? 'bg-green-500 text-white' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      whileTap={{ scale: 0.95 }}
      animate={copied ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={copied ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.5 }}
      >
        {copied ? (
          <FaCheck className="w-4 h-4" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </motion.div>
      <span className="text-sm font-medium">
        {copied ? 'Copied!' : 'Copy'}
      </span>
    </motion.button>
  );
};

const MyFunding: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const [fundingProjects, setFundingProjects] = useState<FundingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPurpose, setEditingPurpose] = useState<string | null>(null);
  const [editPurposeText, setEditPurposeText] = useState('');
  const [selectedProject, setSelectedProject] = useState<FundingProject | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [projectToExtend, setProjectToExtend] = useState<FundingProject | null>(null);
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [extensionPaymentMethod, setExtensionPaymentMethod] = useState<'BONE' | 'ADA'>('ADA');
  const [platformPricing, setPlatformPricing] = useState<{fundingListingFee: number, fundingListingFeeAda: number} | null>(null);
  const [showExpiredFunding, setShowExpiredFunding] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      fetchMyFunding();
      loadPlatformPricing();
    }
  }, [walletAddress]);

  const loadPlatformPricing = async () => {
    try {
      const response = await fetch('/api/admin?type=settings');
      if (response.ok) {
        const data = await response.json();
        setPlatformPricing({
          fundingListingFee: data.fundingListingFee || 500,
          fundingListingFeeAda: data.fundingListingFeeAda || 6
        });
      } else {
        // API not found or error - use default values
        setPlatformPricing({
          fundingListingFee: 500,
          fundingListingFeeAda: 6
        });
      }
    } catch (error) {
      console.error('Error loading platform pricing (using defaults):', error);
      // Use default values
      setPlatformPricing({
        fundingListingFee: 500,
        fundingListingFeeAda: 6
      });
    }
  };

  const fetchMyFunding = async () => {
    try {
      setLoading(true);
      // Fetching funding data
      const response = await fetch(`/api/funding?owner=${encodeURIComponent(walletAddress || '')}`, {
        headers: {
          'x-wallet-address': walletAddress || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
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
      const response = await fetch(`/api/funding?id=${fundingId}`, {
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
      // Toggling funding status
      const response = await fetch(`/api/funding?id=${fundingId}`, {
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
        const errorData = await response.json();
        console.error('Toggle failed:', errorData);
        toast.error(`Failed to update funding status: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating funding status:', error);
      toast.error('Failed to update funding status');
    }
  };


  const handleExtendDeadline = (funding: FundingProject) => {
    // Check if user has any truly active funding campaigns (not expired)
    const hasActiveFunding = fundingProjects.some(f => 
      f.is_active && 
      !fundingService.isExpired(f.funding_deadline)
    );
    
    if (hasActiveFunding) {
      toast.error('You cannot extend expired funding while you have an active funding campaign. Please wait for your current campaign to expire or complete.');
      return;
    }
    
    // Navigate to CreateFunding page with extension data
    navigate('/funding/create', {
      state: { 
        extendingFunding: funding, 
        isExtending: true 
      }
    });
  };

  const calculateExtensionCost = () => {
    if (!platformPricing) return { amount: 0, currency: extensionPaymentMethod };
    
    const baseCost = extensionPaymentMethod === 'ADA' 
      ? platformPricing.fundingListingFeeAda 
      : platformPricing.fundingListingFee;
    
    const totalCost = calculateFundingCost(extensionMonths, baseCost);
    
    return {
      amount: totalCost,
      currency: extensionPaymentMethod
    };
  };

  const handleExtensionPayment = async () => {
    if (!projectToExtend || !platformPricing) return;

    try {
      const cost = calculateExtensionCost();
      
      // Create funding extension data
      const extensionData = {
        project_id: projectToExtend.project_id,
        funding_goal: projectToExtend.funding_goal,
        funding_deadline: '', // Will be calculated on backend
        wallet_address: walletAddress || '',
        funding_wallet: projectToExtend.funding_wallet || projectToExtend.wallet_address,
        funding_purpose: projectToExtend.funding_purpose,
        duration: extensionMonths,
        paymentAmount: cost.amount,
        paymentCurrency: cost.currency,
        // Extension metadata
        isExtending: true,
        extendingFundingId: projectToExtend.id
      };

      // Use the same payment system as funding creation
      await contractService.initializeLucid(window.cardano?.nami || window.cardano?.eternl);
      
      const result = extensionData.paymentCurrency === 'ADA'
        ? await contractService.postFundingWithADA(extensionData)
        : await contractService.postFundingWithBONE(extensionData);
      
      if (result.success && result.txHash) {
        toast.success('Extension payment initiated! Your funding deadline will be extended once payment is confirmed.');
        setShowExtendModal(false);
        setProjectToExtend(null);
      } else {
        toast.error(`Failed to initiate extension payment: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error extending funding deadline:', error);
      toast.error('Failed to extend funding deadline');
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
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">My Project Funding</h1>
                  <div className="relative">
                    <button
                      onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="About My Funding"
                    >
                      <FaInfoCircle className="h-5 w-5" />
                    </button>
                    {showInfoTooltip && (
                      <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
                        <div className="text-sm">
                          <h3 className="font-semibold text-gray-900 mb-2">Funding Rules</h3>
                          <p className="text-gray-600 mb-2">
                            Manage your project funding campaigns with extension capabilities.
                          </p>
                          <ul className="text-gray-600 space-y-1 text-xs">
                            <li>• Only 1 funding campaign per user</li>
                            <li>• Funding campaigns are permanent</li>
                            <li>• Cannot be deleted once created</li>
                            <li>• Can extend deadline with payment</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">Manage your active funding campaigns</p>
              </div>
              {!fundingProjects.some(funding => !fundingService.isExpired(funding.funding_deadline)) && (
                <button
                  onClick={() => navigate('/funding/create')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create Funding Project
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6">

            {fundingProjects.length === 0 ? (
              <div className="text-center py-12">
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
              <div className="space-y-8">
                {/* Active Funding Projects */}
            {fundingProjects.filter(funding => !fundingService.isExpired(funding.funding_deadline)).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Funding Projects</h2>
                <div className="space-y-6">
                  {fundingProjects.filter(funding => !fundingService.isExpired(funding.funding_deadline)).map((funding) => (
              <motion.div
                key={funding.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white shadow-sm rounded-lg overflow-hidden ${
                  fundingService.isExpired(funding.funding_deadline) 
                    ? 'border-l-4 border-red-500 opacity-75' 
                    : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {funding.logo ? (
                        <img
                          src={funding.logo}
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
                        <div className="flex items-center space-x-4 text-sm mt-2">
                          <span className={`flex items-center ${
                            fundingService.isExpired(funding.funding_deadline) 
                              ? 'text-red-600 font-medium' 
                              : 'text-gray-500'
                          }`}>
                            <FaCalendarAlt className="w-4 h-4 mr-1" />
                            {fundingService.isExpired(funding.funding_deadline) 
                              ? `Deadline passed: ${fundingService.formatDeadline(funding.funding_deadline)}`
                              : `Deadline: ${fundingService.formatDeadline(funding.funding_deadline)}`
                            }
                          </span>
                          <span className="flex items-center text-gray-500">
                            <FaUsers className="w-4 h-4 mr-1" />
                            {funding.contributor_count} contributors
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            fundingService.isExpired(funding.funding_deadline)
                              ? 'bg-red-100 text-red-800'
                              : funding.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {fundingService.isExpired(funding.funding_deadline) 
                              ? 'Expired' 
                              : funding.is_active 
                                ? 'Active' 
                                : 'Paused'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedProject(funding)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FaEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(funding.id, funding.is_active)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title={funding.is_active ? 'Pause' : 'Activate'}
                      >
                        {funding.is_active ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
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
                  
                  {/* Payment Address Section */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <FaCoins className="text-blue-600 text-lg" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">Payment Address</h4>
                        <p className="text-sm text-gray-600">
                          All contributions are automatically sent to this wallet address
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <code className="text-sm font-mono text-gray-800 break-all block leading-relaxed">
                            {funding.funding_wallet || funding.wallet_address}
                          </code>
                        </div>
                        <div className="flex-shrink-0">
                          <CopyButton 
                            textToCopy={funding.funding_wallet || funding.wallet_address}
                            fundingId={funding.id}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Funding Projects */}
            {fundingProjects.filter(funding => fundingService.isExpired(funding.funding_deadline)).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <svg className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Expired Funding Projects ({fundingProjects.filter(funding => fundingService.isExpired(funding.funding_deadline)).length})
                  </h3>
                  <button
                    onClick={() => setShowExpiredFunding(!showExpiredFunding)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showExpiredFunding ? 'Hide' : 'Show'} Expired Funding
                  </button>
                </div>
                {showExpiredFunding && (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {fundingProjects.filter(funding => fundingService.isExpired(funding.funding_deadline)).map((funding, index) => (
                    <motion.div
                      key={funding.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.1,
                        ease: 'easeOut'
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedProject(funding)}
                      className="bg-white border border-red-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer opacity-75"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-4 flex-1 min-w-0">
                            {/* Project Logo */}
                            <div className="flex-shrink-0">
                              {funding.logo ? (
                                <img 
                                  className="h-12 w-12 rounded-full border border-gray-200 object-cover" 
                                  src={funding.logo} 
                                  alt={`${funding.project_title || funding.title} logo`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="h-12 w-12 rounded-full border border-gray-200 bg-red-100 flex items-center justify-center"><svg class="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full border border-gray-200 bg-red-100 flex items-center justify-center">
                                  <FaCoins className="h-6 w-6 text-red-600" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold flex items-center">
                                <span className="truncate">{funding.project_title || funding.title}</span>
                              </h3>
                              <div className="text-sm text-gray-600 mb-2 flex items-center">
                                <span>Goal: {funding.funding_goal} ADA</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExtendDeadline(funding);
                              }}
                              className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                              title="Extend deadline"
                            >
                              <FaRedo className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Funding Stats */}
                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Raised:</span>
                            <span className="font-medium">{funding.current_funding} ADA</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Progress:</span>
                            <span className="font-medium">{funding.progress_percentage.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Contributors:</span>
                            <span className="font-medium">{funding.contributor_count}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Expired:</span>
                            <span className="font-medium text-red-600">{fundingService.formatExpiredTime(funding.funding_deadline)}</span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                          <div 
                            className="bg-red-400 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(funding.progress_percentage, 100)}%` }}
                          ></div>
                        </div>
                        {/* Funding Purpose */}
                        <div className="mb-4">
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {funding.funding_purpose || 'No purpose specified'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                    ))}
                  </div>
                )}
              </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Details Side Panel */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50"
            onClick={() => setSelectedProject(null)}
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
                      {selectedProject.logo ? (
                        <img 
                          src={selectedProject.logo} 
                          alt={`${selectedProject.title || selectedProject.project_title} logo`}
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
                        {selectedProject.title || selectedProject.project_title}
                        {selectedProject.is_verified && (
                          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center" title="Verified Project">
                            <FaCheck className="text-white text-sm" />
                          </div>
                        )}
                      </h2>
                      
                      {/* Project Links */}
                      {(selectedProject.website || selectedProject.twitter_link || selectedProject.discord_link) && (
                        <div className="flex gap-2 mb-4">
                          {selectedProject.website && (
                            <a 
                              href={selectedProject.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-9 h-9 bg-gray-100 hover:bg-blue-100 rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                              title="Visit Website"
                            >
                              <FaGlobe className="text-base" />
                            </a>
                          )}
                          {selectedProject.twitter_link && (
                            <a 
                              href={selectedProject.twitter_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-9 h-9 bg-gray-100 hover:bg-blue-100 rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-600 transition-colors"
                              title="Follow on Twitter"
                            >
                              <FaXTwitter className="text-base" />
                            </a>
                          )}
                          {selectedProject.discord_link && (
                            <a 
                              href={selectedProject.discord_link} 
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
                    onClick={() => setSelectedProject(null)}
                    className="text-gray-400 hover:text-gray-600 p-2 ml-4 flex-shrink-0"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
                
                {/* Description */}
                <div className="mb-6">
                  <p className="text-gray-600 text-lg leading-relaxed">{selectedProject.description}</p>
                </div>

                {/* Funding Progress */}
                <div className="bg-gray-50 rounded-lg p-6 mb-4">
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


                {/* Contributors Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contributors</h3>
                  <ContributorsSection projectId={selectedProject.id} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Extension Modal */}
      <AnimatePresence>
        {showExtendModal && projectToExtend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowExtendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <FaRedo className="text-green-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Extend Funding Deadline</h3>
                  <p className="text-sm text-gray-600">{projectToExtend.project_title || projectToExtend.title}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Duration Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Extension Duration *
                  </label>
                  <CustomSelect
                    name="extensionMonths"
                    options={[
                      { value: '1', label: '1 Month' },
                      { value: '2', label: '2 Months' },
                      { value: '3', label: '3 Months' },
                      { value: '6', label: '6 Months' },
                      { value: '12', label: '12 Months' }
                    ]}
                    value={extensionMonths.toString()}
                    onChange={(value) => setExtensionMonths(parseInt(value))}
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <CustomSelect
                    name="extensionPaymentMethod"
                    options={[
                      { value: 'ADA', label: 'ADA (Cardano)' },
                      { value: 'BONE', label: 'BONE Token' }
                    ]}
                    value={extensionPaymentMethod}
                    onChange={(value) => setExtensionPaymentMethod(value as 'BONE' | 'ADA')}
                  />
                </div>

                {/* Cost Display */}
                {platformPricing && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Extension Cost:</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {calculateExtensionCost().amount} {calculateExtensionCost().currency}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Your funding deadline will be extended by {extensionMonths} {extensionMonths === 1 ? 'month' : 'months'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowExtendModal(false);
                    setProjectToExtend(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtensionPayment}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Pay & Extend
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default MyFunding;
