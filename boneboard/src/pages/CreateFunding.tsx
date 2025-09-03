import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaInfoCircle, FaWallet, FaCheck, FaTimes, FaUsers, FaDollarSign, FaClock } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { fundingService } from '../services/fundingService';
import { toast } from 'react-toastify';
import { fraudDetection } from '../utils/fraudDetection';
import CustomSelect from '../components/CustomSelect';
import CustomMonthPicker from '../components/CustomMonthPicker';
import { calculateFundingCost, calculateMonthsFromNow } from '../utils/fundingPricing';
import { CreateFundingData } from '../services/fundingService';
import { contractService } from '../services/contractService';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  logo_url?: string;
  logo?: string;
  is_verified?: boolean;
  website?: string;
  discord_link?: string;
  discord_invite?: string;
  twitter_link?: string;
  twitter_username?: string;
  github_repo?: string;
  wallet_address: string;
  status: string;
  created_at: string;
  funding_goal?: number;
  payment_amount?: number;
  payment_currency?: string;
}

const CreateFunding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, walletAddress } = useWallet();
  
  // Check if this is a funding extension
  const { extendingFunding, isExtending } = location.state || {};
  
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [platformPricing, setPlatformPricing] = useState<{fundingListingFee: number, fundingListingFeeAda: number} | null>(null);
  
  const [formData, setFormData] = useState<CreateFundingData & { paymentMethod: 'BONE' | 'ADA' }>({
    project_id: '',
    funding_goal: 0,
    funding_deadline: '',
    wallet_address: walletAddress || '',
    funding_wallet: '',
    funding_purpose: '',
    paymentMethod: 'ADA'
  });

  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to create funding');
      navigate('/funding');
      return;
    }
    fetchUserProjects();
    if (!isExtending) {
      checkExistingFunding();
    }
    loadPlatformPricing();
  }, [isConnected, walletAddress, isExtending]);

  // Pre-fill form data for funding extension
  useEffect(() => {
    if (isExtending && extendingFunding) {
      setFormData(prev => ({
        ...prev,
        project_id: extendingFunding.project_id,
        funding_goal: extendingFunding.funding_goal,
        funding_purpose: extendingFunding.funding_purpose,
        funding_wallet: extendingFunding.funding_wallet || extendingFunding.wallet_address
      }));
      // Auto-advance to payment step
      setCurrentStep(2);
    }
  }, [isExtending, extendingFunding]);

  const checkExistingFunding = async () => {
    if (!walletAddress) return;
    
    try {
      const existingFundings = await fundingService.getFundingByWallet(walletAddress);
      
      const activeFunding = existingFundings.find(funding => funding.is_active);
      if (activeFunding) {
        // Silent redirect - don't show toast on page load, only show it when user tries to pay
        navigate('/funding');
        return;
      }
    } catch (error: any) {
      console.warn('Could not check existing funding on page load:', error);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      setFormData(prev => ({ 
        ...prev, 
        wallet_address: walletAddress
        // Don't override funding_wallet - let user set it manually
      }));
      fetchUserProjects();
    }
  }, [walletAddress]);

  // Check for pending funding transactions on load and resume to payment step
  useEffect(() => {
    if (isConnected && walletAddress) {
      // Check for any pending funding transactions for this wallet
      const allPendingKeys = Object.keys(localStorage).filter(key => key.startsWith('pendingFundingTx_'));
      
      for (const pendingKey of allPendingKeys) {
        const pendingTxData = localStorage.getItem(pendingKey);
        if (pendingTxData) {
          try {
            const pendingTx = JSON.parse(pendingTxData);
            // Check if this pending transaction belongs to current wallet
            if (pendingTx.walletAddress === walletAddress) {
              // Found pending funding transaction, resuming to payment step
              
              // Restore form data from pending transaction
              setFormData(prev => ({
                ...prev,
                project_id: pendingTx.fundingData.project_id,
                funding_goal: pendingTx.fundingData.funding_goal,
                funding_deadline: pendingTx.fundingData.funding_deadline,
                funding_purpose: pendingTx.fundingData.funding_purpose,
                funding_wallet: pendingTx.fundingData.funding_wallet || prev.funding_wallet,
                paymentMethod: pendingTx.fundingData.paymentCurrency,
                txHash: pendingTx.txHash
              }));
              setCurrentStep(2);
              setPaymentStatus('processing');
              
              toast.info('Resuming funding payment process. Your transaction is being monitored.');
              
              // Ensure transaction monitoring is running
              import('../services/transactionMonitor').then(({ transactionMonitor }) => {
                transactionMonitor.startMonitoring(walletAddress);
              });
              
              break; // Only restore one pending transaction
            }
          } catch (error) {
            console.error('Error parsing pending funding transaction:', error);
            localStorage.removeItem(pendingKey);
          }
        }
      }
    }
  }, [isConnected, walletAddress]);

  // Listen for successful funding creation from transaction monitor
  useEffect(() => {
    const handleFundingCreated = (event: any) => {
      if (event.detail?.projectId && walletAddress) {
        fraudDetection.recordProjectOwnership(event.detail.projectId, walletAddress);
        fraudDetection.recordOwnerFingerprint(event.detail.projectId);
      }
      
      // Don't show toast here - it's handled by the payment-specific listener
      navigate('/funding');
    };

    window.addEventListener('fundingCreatedSuccessfully', handleFundingCreated);
    
    return () => {
      window.removeEventListener('fundingCreatedSuccessfully', handleFundingCreated);
    };
  }, [navigate, walletAddress]);


  const fetchUserProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects?wallet=${encodeURIComponent(walletAddress || '')}`);
      
      if (response.ok) {
        const data = await response.json();
        // Projects loaded successfully
        setUserProjects(data || []);
      } else {
        console.error('API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load your projects');
    } finally {
      setLoading(false);
    }
  };

  const loadPlatformPricing = async () => {
    try {
      const response = await fetch('/api/admin?type=settings');
      if (response.ok) {
        const data = await response.json();
        setPlatformPricing({
          fundingListingFee: data.fundingListingFee || 500,
          fundingListingFeeAda: data.fundingListingFeeAda || 6
        });
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
      // Set default pricing if API fails
      setPlatformPricing({
        fundingListingFee: 500,
        fundingListingFeeAda: 6
      });
    }
  };

  const calculateTotal = () => {
    // Calculate dynamic pricing based on duration
    if (formData.funding_deadline && platformPricing) {
      try {
        const months = calculateMonthsFromNow(formData.funding_deadline);
        const baseCost = formData.paymentMethod === 'ADA' 
          ? platformPricing.fundingListingFeeAda 
          : platformPricing.fundingListingFee;
        const dynamicCost = calculateFundingCost(months, baseCost);
        
        return {
          amount: dynamicCost,
          currency: formData.paymentMethod,
          months
        };
      } catch (error) {
        console.error('Error calculating dynamic cost:', error);
      }
    }
    
    // Fallback to base cost if no deadline selected or pricing not loaded
    const fallbackCost = platformPricing 
      ? (formData.paymentMethod === 'ADA' ? platformPricing.fundingListingFeeAda : platformPricing.fundingListingFee)
      : (formData.paymentMethod === 'ADA' ? 6 : 500);
    
    return {
      amount: fallbackCost,
      currency: formData.paymentMethod,
      months: 1
    };
  };

  const totalCost = calculateTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 2) {
      // Validate form data before going to payment step
      if (!formData.project_id || !formData.funding_goal || !formData.funding_deadline || !formData.funding_purpose) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (formData.funding_goal <= 0) {
        toast.error('Funding goal must be greater than 0');
        return;
      }

      const deadlineDate = new Date(formData.funding_deadline);
      if (deadlineDate <= new Date()) {
        toast.error('Funding deadline must be in the future');
        return;
      }

      setCurrentStep(2);
      return;
    }
    
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    const selectedProject = userProjects.find(p => p.id === formData.project_id);
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    try {
      setPaymentStatus('processing');
      
      // Validate wallet address matches current extension wallet for the specific connected wallet type
      const cardano = (window as any).cardano;
      const connectedWallet = localStorage.getItem('connectedWallet');
      
      if (!cardano || !connectedWallet || !cardano[connectedWallet]) {
        throw new Error(`${connectedWallet} wallet not available. Please make sure your ${connectedWallet} wallet is enabled.`);
      }
      
      // Only check the specific wallet that was originally connected
      const walletApi = await cardano[connectedWallet].enable();
      const currentAddresses = await walletApi.getUsedAddresses();
      
      if (currentAddresses.length === 0) {
        throw new Error(`No addresses found in ${connectedWallet} wallet. Please check your wallet connection.`);
      }
      
      // Get current wallet address from the specific connected wallet extension
      let currentAddress = currentAddresses[0];
      
      // Convert hex address to bech32 using the same logic as WalletContext
      if (currentAddress && (currentAddress.startsWith('0x') || /^[0-9a-fA-F]+$/.test(currentAddress)) && !currentAddress.startsWith('addr')) {
        try {
          const CML = await import('@dcspark/cardano-multiplatform-lib-browser');
          const cleanHex = currentAddress.startsWith('0x') ? currentAddress.slice(2) : currentAddress;
          const bytes = new Uint8Array(Math.ceil(cleanHex.length / 2));
          for (let i = 0; i < cleanHex.length; i += 2) {
            bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
          }
          const addr = CML.Address.from_bytes(bytes);
          currentAddress = addr.to_bech32();
          addr.free();
        } catch (error) {
          console.warn('Failed to convert hex address to bech32:', error);
        }
      }
      
      // Wallet validation completed
      
      // Compare with stored wallet address from the same wallet type
      if (currentAddress !== walletAddress) {
        const currentTruncated = `${currentAddress?.slice(0, 8)}...${currentAddress?.slice(-8)}`;
        const expectedTruncated = `${walletAddress?.slice(0, 8)}...${walletAddress?.slice(-8)}`;
        throw new Error(`Address mismatch detected: expecting ${expectedTruncated} but ${currentTruncated} is connected in ${connectedWallet}. Please switch to the correct address or reconnect your wallet.`);
      }
      
      // Check if wallet already has active funding campaigns BEFORE payment
      try {
        const { fundingService } = await import('../services/fundingService');
        const existingFundings = await fundingService.getFundingByWallet(walletAddress);
        
        const activeFunding = existingFundings.find(funding => funding.is_active);
        if (activeFunding) {
          toast.error('You already have an active funding campaign. Only one funding campaign per wallet is allowed.');
          setPaymentStatus('error');
          return;
        }
      } catch (error: any) {
        console.warn('Could not check existing funding, proceeding with payment:', error);
      }

      await contractService.initializeLucid(walletApi);
      
      // Prepare funding data for smart contract
      const fundingData = {
        project_id: formData.project_id,
        funding_goal: formData.funding_goal,
        funding_deadline: formData.funding_deadline,
        funding_purpose: formData.funding_purpose,
        wallet_address: walletAddress || '',
        funding_wallet: formData.funding_wallet || walletAddress || '',
        paymentAmount: totalCost.amount,
        paymentCurrency: formData.paymentMethod as 'BONE' | 'ADA',
        timestamp: Date.now(),
        // Extension metadata
        isExtending: isExtending,
        extendingFundingId: extendingFunding?.id,
        duration: isExtending ? calculateMonthsFromNow(formData.funding_deadline) : undefined
      };
      
      // Process payment through smart contract
      const result = formData.paymentMethod === 'ADA'
        ? await contractService.postFundingWithADA(fundingData)
        : await contractService.postFundingWithBONE(fundingData);
      
      if (result.success && result.txHash) {
        // Store pending transaction in localStorage for persistent monitoring
        const pendingTx = {
          txHash: result.txHash,
          fundingData: fundingData,
          walletAddress: walletAddress,
          timestamp: Date.now()
        };
        
        localStorage.setItem(`pendingFundingTx_${result.txHash}`, JSON.stringify(pendingTx));
        
        // Keep status as 'processing' until blockchain confirmation
        setFormData(prev => ({ ...prev, txHash: result.txHash }));
        
        // Ensure transaction monitoring is running for funding transactions
        // Starting funding transaction monitoring
        const { transactionMonitor } = await import('../services/transactionMonitor');
        transactionMonitor.startMonitoring(walletAddress);
        
        toast.success('Payment transaction submitted! Monitoring blockchain for confirmation...');
        
        // Listen for successful funding creation event
        const handleFundingSuccess = (event: any) => {
          if (event.detail.txHash === result.txHash) {
            setPaymentStatus('success');
            toast.success('Funding project created successfully!');
            setTimeout(() => {
              navigate('/funding');
            }, 2000);
            window.removeEventListener('fundingCreatedSuccessfully', handleFundingSuccess);
          }
        };
        
        window.addEventListener('fundingCreatedSuccessfully', handleFundingSuccess);
        
        // Set a timeout to handle cases where the event doesn't fire
        setTimeout(() => {
          window.removeEventListener('fundingCreatedSuccessfully', handleFundingSuccess);
          // Check if still processing after 3 minutes
          if (paymentStatus === 'processing') {
            toast.info('Transaction is taking longer than expected. Please check your wallet or try again.');
            navigate('/funding');
          }
        }, 180000); // 3 minutes timeout
        
      } else {
        setPaymentStatus('error');
        toast.error(result.error || 'Payment failed');
      }
      
    } catch (error: any) {
      console.error('Error creating funding:', error);
      setPaymentStatus('error');
      
      // Check if it's a wallet address mismatch error
      if (error.message && error.message.includes('Address mismatch detected')) {
        toast.error('❌ Wallet Address Mismatch\n\n' + error.message, {
          autoClose: 8000,
          style: { whiteSpace: 'pre-line' }
        });
      } else {
        toast.error(error.message || 'Failed to create funding project');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (name === 'funding_goal') {
      // Only allow numbers and limit to 6 characters
      const numericValue = value.replace(/[^0-9]/g, '');
      const limitedValue = numericValue.slice(0, 6);
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(limitedValue) || 0
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'radio' ? value : value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {isExtending ? 'Extend Funding Deadline' : 'Create Funding Campaign'}
            </h1>
            <p className="mt-2 text-gray-600">
              {isExtending 
                ? `Extend the deadline for ${extendingFunding?.project_title || extendingFunding?.title}`
                : 'Launch a funding campaign for your project'
              }
            </p>
          </div>

        {userProjects.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaInfoCircle className="text-blue-600 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No eligible projects found</h3>
            <p className="text-gray-500 mb-6">
              You need to create a project first, or all your projects already have active funding campaigns.
            </p>
            <button
              onClick={() => navigate('/create-project')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create New Project
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Form Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white shadow-sm rounded-lg p-8"
            >
              {currentStep === 1 && (
              <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project *
                </label>
                <div className="relative">
                  <CustomSelect
                    options={userProjects.map(project => ({
                      value: project.id,
                      label: project.title
                    }))}
                    value={formData.project_id}
                    onChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        project_id: value
                        // Don't override funding_wallet - keep user's manual input
                      }));
                    }}
                    placeholder="Choose a project to create funding for"
                    className=""
                  />
                </div>
                
                {/* Selected Project Logo Preview */}
                {formData.project_id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      {(() => {
                        const selectedProject = userProjects.find(p => p.id === formData.project_id);
                        const logoSrc = selectedProject?.logo_url || selectedProject?.logo;
                        
                        return logoSrc ? (
                          <img 
                            src={logoSrc} 
                            alt="Project Logo"
                            className="w-16 h-16 rounded-lg object-cover border"
                            onError={(e) => {
                              console.error('Form logo failed to load:', logoSrc);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Logo</span>
                          </div>
                        );
                      })()}
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {userProjects.find(p => p.id === formData.project_id)?.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {userProjects.find(p => p.id === formData.project_id)?.description?.substring(0, 100)}...
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="mt-1 text-sm text-gray-500">
                  Only projects you own that don't have active funding are shown
                </p>
              </div>

              {/* Funding Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Goal (ADA) * <span className="text-xs text-gray-400">(Min: 100 ADA)</span>
                </label>
                <input
                  type="number"
                  name="funding_goal"
                  value={formData.funding_goal || ''}
                  onChange={handleInputChange}
                  step="0.000001"
                  min="100"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter funding goal in ADA (minimum 100)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  The total amount you want to raise for this project (minimum 100 ADA)
                </p>
              </div>

              {/* Funding Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Wallet Address * <span className="text-xs text-gray-400">(Max: 120 chars)</span>
                </label>
                <input
                  type="text"
                  name="funding_wallet"
                  value={formData.funding_wallet}
                  onChange={handleInputChange}
                  required
                  maxLength={120}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="addr1..."
                />
                <div className="flex justify-between mt-1">
                  <p className="text-sm text-gray-500">
                    The Cardano wallet address where funding contributions will be sent
                  </p>
                  <span className="text-xs text-gray-400">
                    {formData.funding_wallet.length}/120
                  </span>
                </div>
              </div>

              {/* Funding Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Purpose * <span className="text-xs text-gray-400">(Max: 500 chars)</span>
                </label>
                <textarea
                  name="funding_purpose"
                  value={formData.funding_purpose}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Explain what you need the funding for and how it will be used..."
                />
                <div className="flex justify-between mt-1">
                  <p className="text-sm text-gray-500">
                    Describe your funding goals, milestones, and how the funds will be allocated
                  </p>
                  <span className={`text-xs ${
                    formData.funding_purpose.length > 450 ? 'text-red-500' : 
                    formData.funding_purpose.length > 400 ? 'text-yellow-500' : 'text-gray-400'
                  }`}>
                    {formData.funding_purpose.length}/500
                  </span>
                </div>
              </div>

              {/* Funding Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Duration *
                </label>
                <CustomMonthPicker
                  value={formData.funding_deadline}
                  onChange={(monthYear) => setFormData(prev => ({ ...prev, funding_deadline: monthYear }))}
                  placeholder="Select funding duration"
                  maxMonths={12}
                />
                <p className="mt-1 text-sm text-gray-500">
                  How long your funding campaign will run (1-12 months) • Cost is {platformPricing ? (formData.paymentMethod === 'ADA' ? platformPricing.fundingListingFeeAda : platformPricing.fundingListingFee) : (formData.paymentMethod === 'ADA' ? '6' : '500')} {formData.paymentMethod} per month
                </p>
                {formData.funding_deadline && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">
                        Duration: {calculateMonthsFromNow(formData.funding_deadline)} month{calculateMonthsFromNow(formData.funding_deadline) !== 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-bold text-green-900">
                        Cost: {totalCost.amount.toLocaleString()} {totalCost.currency}
                      </span>
                    </div>
                  </div>
                )}
              </div>


            {/* How BoneBoard Funding Works */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <FaInfoCircle className="text-blue-600 text-lg mr-2" />
                <h3 className="text-md font-medium text-blue-900">How BoneBoard Funding Works</h3>
              </div>
              
              <div className="space-y-3 text-sm text-blue-700">
                <p>• Contributors send ADA directly to your project wallet - no middleman fees</p>
                <p>• All transactions are permanently recorded on Cardano blockchain</p>
                <p>• Track funding progress and contributors in real-time</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/funding')}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue to Payment
              </button>
            </div>
          </form>
            )}

            {currentStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {paymentStatus === 'idle' && (
                  <>
                    {/* Funding Summary */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Funding Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Project:</span>
                          <span className="font-medium">{userProjects.find(p => p.id === formData.project_id)?.title || 'Selected Project'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Funding Goal:</span>
                          <span className="font-medium">{formData.funding_goal || 0} ADA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium text-blue-600">
                            {formData.funding_deadline ? `${calculateMonthsFromNow(formData.funding_deadline)} month${calculateMonthsFromNow(formData.funding_deadline) !== 1 ? 's' : ''}` : 'Not selected'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Campaign Cost:</span>
                          <span className="font-medium text-blue-600">{totalCost.amount.toLocaleString()} {totalCost.currency}</span>
                        </div>
                        {formData.funding_wallet && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Funding Wallet:</span>
                            <span className="font-medium font-mono text-xs">
                              {formData.funding_wallet.slice(0, 8)}...{formData.funding_wallet.slice(-6)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Preview Section */}
                    {formData.project_id && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
                        <p className="text-sm text-gray-600 mb-4">This is how your funding project will appear on the funding page:</p>
                        
                        {/* Funding Card Preview */}
                        <div className="bg-white shadow-sm rounded-xl overflow-hidden border-2 border-blue-200">
                          {/* Project Header */}
                          <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                              {/* Project Logo */}
                              {(() => {
                                const selectedProject = userProjects.find(p => p.id === formData.project_id);
                                const logoSrc = selectedProject?.logo_url || selectedProject?.logo;
                                
                                return logoSrc ? (
                                  <img 
                                    src={logoSrc} 
                                    alt="Project logo"
                                    className="w-16 h-16 rounded-lg object-cover border-2 border-gray-100 shadow-sm flex-shrink-0"
                                    onError={(e) => {
                                      console.error('Preview logo failed to load:', logoSrc);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
                                    <span className="text-gray-400 text-sm font-medium">No Logo</span>
                                  </div>
                                );
                              })()}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-xl font-semibold text-gray-900">
                                    {userProjects.find(p => p.id === formData.project_id)?.title}
                                  </h3>
                                  {userProjects.find(p => p.id === formData.project_id)?.is_verified && (
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center" title="Verified Project">
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                {userProjects.find(p => p.id === formData.project_id)?.category && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
                                    {userProjects.find(p => p.id === formData.project_id)?.category}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{formData.funding_purpose || userProjects.find(p => p.id === formData.project_id)?.description}</p>

                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  0.00 ADA raised
                                </span>
                                <span className="text-sm text-gray-500">
                                  0.0%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: '0%' }}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                                <span>Goal: {formData.funding_goal || '0'} ADA</span>
                                <span className="flex items-center">
                                  <FaUsers className="mr-1" />
                                  0 contributors
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons with Time Left */}
                            <div className="flex items-center gap-3">
                              <button
                                disabled
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md opacity-50 cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <FaDollarSign />
                                Contribute
                              </button>
                              
                              {/* Time Left Indicator */}
                              <div className="flex items-center text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-md border border-gray-200 min-w-[120px] justify-center">
                                <FaClock className="mr-2 text-gray-500" />
                                <span className="font-medium">
                                  {formData.funding_deadline ? (() => {
                                    const deadline = new Date(formData.funding_deadline);
                                    const now = new Date();
                                    const diffTime = deadline.getTime() - now.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    if (diffDays < 0) return 'Expired';
                                    if (diffDays === 0) return 'Today';
                                    if (diffDays === 1) return '1 day left';
                                    if (diffDays <= 7) return `${diffDays} days left`;
                                    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks left`;
                                    return `${Math.ceil(diffDays / 30)} months left`;
                                  })() : 'No deadline'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-4 text-center">
                          * This is a preview. Your funding project will go live after payment confirmation.
                        </p>
                      </div>
                    )}

                    {/* Payment Information */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <FaWallet className="mr-2" />
                        Payment Information
                      </h3>
                  
                      <div className="space-y-4">
                        {/* Payment Method Selection */}
                        <div className="grid grid-cols-2 gap-4">
                          <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            formData.paymentMethod === 'BONE' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="BONE"
                              checked={formData.paymentMethod === 'BONE'}
                              onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'BONE' | 'ADA' }))}
                              className="sr-only"
                            />
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">🦴</span>
                              <div>
                                <div className="text-sm font-medium text-gray-900">BONE Token</div>
                                <div className="text-xs text-gray-500">{platformPricing ? platformPricing.fundingListingFee : 500} BONE/month</div>
                              </div>
                            </div>
                            {formData.paymentMethod === 'BONE' && (
                              <FaCheck className="absolute top-2 right-2 h-4 w-4 text-blue-500" />
                            )}
                          </label>
                          
                          <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            formData.paymentMethod === 'ADA' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="ADA"
                              checked={formData.paymentMethod === 'ADA'}
                              onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'BONE' | 'ADA' }))}
                              className="sr-only"
                            />
                            <div className="flex items-center">
                              <span className="text-lg mr-3">₳</span>
                              <div>
                                <div className="text-sm font-medium text-gray-900">ADA</div>
                                <div className="text-xs text-gray-500">{platformPricing ? platformPricing.fundingListingFeeAda : 6} ADA/month</div>
                              </div>
                            </div>
                            {formData.paymentMethod === 'ADA' && (
                              <FaCheck className="absolute top-2 right-2 h-4 w-4 text-blue-500" />
                            )}
                          </label>
                        </div>
                        
                        {/* Cost Breakdown */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Cost Breakdown</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Duration</span>
                              <span>{totalCost.months} month{totalCost.months !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Campaign Fee</span>
                              <span>{totalCost.amount.toLocaleString()} {totalCost.currency}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 flex justify-between font-medium text-lg">
                              <span>Total</span>
                              <span className="text-blue-600">{totalCost.amount.toLocaleString()} {totalCost.currency}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Wallet Connection */}
                        {isConnected && walletAddress ? (
                          <div className="mb-4">
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                              <div className="flex items-center">
                                <FaCheck className="h-5 w-5 text-green-600 mr-2" />
                                <span className="text-sm font-medium text-gray-900">
                                  Connected: {`${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <div className="flex items-center">
                                <FaTimes className="h-5 w-5 text-yellow-600 mr-2" />
                                <span className="text-sm font-medium text-gray-900">
                                  Wallet not connected
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-between">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          disabled={!isConnected}
                        >
                          Submit & Pay
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {paymentStatus === 'processing' && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-sm text-gray-500">Processing your payment...</p>
                  </div>
                )}

                {paymentStatus === 'success' && (
                  <div className="text-center py-12">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                      <FaCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="mt-3 text-lg font-medium text-gray-900">Payment Successful!</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Your funding campaign has been created and is now live on BoneBoard.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => navigate('/funding')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        View Funding Campaign
                      </button>
                    </div>
                  </div>
                )}

                {paymentStatus === 'error' && (
                  <div className="text-center py-12">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <FaTimes className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="mt-3 text-lg font-medium text-gray-900">Payment Failed</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      There was an error processing your payment. Please try again.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => setPaymentStatus('idle')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateFunding;
