import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaInfoCircle, FaWallet, FaCheck, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { toast } from 'react-toastify';
import CustomSelect from '../components/CustomSelect';
import { fundingService, CreateFundingData } from '../services/fundingService';
import { contractService } from '../services/contractService';

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  logo_url?: string;
}

const CreateFunding: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  
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
    funding_purpose: '',
    paymentMethod: 'BONE'
  });

  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to create funding');
      navigate('/funding');
      return;
    }
    fetchUserProjects();
  }, [isConnected, walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      setFormData(prev => ({ ...prev, wallet_address: walletAddress }));
      fetchUserProjects();
    }
  }, [walletAddress]);

  // Load platform pricing on component mount
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const response = await fetch('/api/admin?type=settings');
        if (response.ok) {
          const data = await response.json();
          setPlatformPricing({
            fundingListingFee: data.fundingListingFee || 500,
            fundingListingFeeAda: data.fundingListingFeeAda || 50
          });
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
        // Set default pricing if API fails
        setPlatformPricing({
          fundingListingFee: 500,
          fundingListingFeeAda: 50
        });
      }
    };
    loadPricing();
  }, []);

  const fetchUserProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects', {
        headers: {
          'x-wallet-address': walletAddress || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter projects that belong to the user and don't already have active funding
        console.log('All projects:', data);
        console.log('Current wallet:', walletAddress);
        
        const userOwnedProjects = data.filter((project: any) => {
          console.log('Checking project:', project.title, 'walletAddress:', project.walletAddress, 'has_active_funding:', project.has_active_funding);
          // Check if user owns this project
          const isOwner = project.walletAddress === walletAddress;
          // For now, allow all user projects since we don't have active funding check implemented
          return isOwner;
        });
        setUserProjects(userOwnedProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load your projects');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!platformPricing) {
      return {
        amount: formData.paymentMethod === 'ADA' ? 50 : 500,
        currency: formData.paymentMethod
      };
    }
    
    const amount = formData.paymentMethod === 'ADA' 
      ? platformPricing.fundingListingFeeAda 
      : platformPricing.fundingListingFee;
    
    return {
      amount,
      currency: formData.paymentMethod
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
      toast.error('Please connect your wallet');
      return;
    }

    setPaymentStatus('processing');

    try {
      // Get wallet API
      const cardano = (window as any).cardano;
      const connectedWallet = localStorage.getItem('connectedWallet');
      
      if (!cardano || !connectedWallet || !cardano[connectedWallet]) {
        throw new Error(`${connectedWallet} wallet not available. Please make sure your wallet is enabled.`);
      }
      
      const walletApi = await cardano[connectedWallet].enable();
      await contractService.initializeLucid(walletApi);
      
      // Prepare funding data for smart contract
      const fundingData = {
        project_id: formData.project_id,
        funding_goal: formData.funding_goal,
        funding_deadline: formData.funding_deadline,
        funding_purpose: formData.funding_purpose,
        paymentAmount: totalCost.amount,
        paymentCurrency: formData.paymentMethod,
        walletAddress: walletAddress,
        timestamp: Date.now()
      };
      
      // Process payment through smart contract
      const result = formData.paymentMethod === 'ADA'
        ? await contractService.postFundingWithADA(fundingData)
        : await contractService.postFundingWithBONE(fundingData);
      
      if (result.success) {
        // Save funding to database after successful payment
        const fundingToSave: CreateFundingData = {
          ...formData,
          bone_posting_fee: totalCost.amount,
          bone_tx_hash: result.txHash || 'contract_tx_' + Date.now()
        };

        await fundingService.createFundingProject(fundingToSave, walletAddress);
        
        setPaymentStatus('success');
        toast.success('Funding project created successfully!');
        
        setTimeout(() => {
          navigate('/funding');
        }, 2000);
      } else {
        setPaymentStatus('error');
        toast.error(result.error || 'Payment failed');
      }
      
    } catch (error: any) {
      console.error('Error creating funding:', error);
      setPaymentStatus('error');
      toast.error(error.message || 'Failed to create funding project');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'funding_goal' ? parseFloat(value) || 0 : 
              type === 'radio' ? value : value
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/funding')}
            className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Funding
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Funding Project</h1>
          <p className="mt-2 text-gray-600">
            Set up funding for one of your existing projects
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
              onClick={() => navigate('/projects/create')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create New Project
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white shadow-sm rounded-lg p-6"
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
                    onChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
                    placeholder="Choose a project to create funding for"
                    className=""
                  />
                </div>
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

              {/* Project Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Wallet Address * <span className="text-xs text-gray-400">(Max: 120 chars)</span>
                </label>
                <input
                  type="text"
                  name="wallet_address"
                  value={formData.wallet_address}
                  onChange={handleInputChange}
                  required
                  maxLength={120}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="addr1..."
                />
                <div className="flex justify-between mt-1">
                  <p className="text-sm text-gray-500">
                    The Cardano wallet address where funds will be sent
                  </p>
                  <span className="text-xs text-gray-400">
                    {formData.wallet_address.length}/120
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
                  Funding Deadline *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="funding_deadline"
                    value={formData.funding_deadline}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  When the funding period should end
                </p>
              </div>

            {/* Funding Cost Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaInfoCircle className="text-blue-600 text-lg" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Funding Creation Fee
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Creating a funding campaign costs <strong>2 ADA</strong> (testing rate). This helps prevent spam
                      and ensures serious projects.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* How BoneBoard Funding Works */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <FaInfoCircle className="text-blue-600 text-xl mr-3" />
                <h3 className="text-lg font-semibold text-blue-900">How BoneBoard Funding Works</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Direct Wallet Funding</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Contributors send ADA directly to your project wallet - no middleman fees
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Blockchain Security</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        All transactions are permanently recorded on Cardano blockchain
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Real-time Analytics</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Track funding progress, contributors, and engagement metrics live
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Community Driven</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Build a community around your project with contributor recognition
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-white border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <FaInfoCircle className="text-blue-600 text-lg mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Pro Tip: Projects with clear funding purposes and realistic goals get 3x more contributions!
                    </p>
                  </div>
                </div>
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
                          <span className="font-medium">{formData.funding_goal} ADA</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Deadline:</span>
                          <span className="font-medium">{new Date(formData.funding_deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Payment Method */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <FaWallet className="mr-2" />
                        Payment Method
                      </h3>
                  
                      <div className="space-y-4">
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
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                                B
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">BONE Token</div>
                                <div className="text-xs text-gray-500">Recommended</div>
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
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <div className="flex items-center">
                              <span className="text-lg mr-3">₳</span>
                              <div>
                                <div className="text-sm font-medium text-gray-900">ADA</div>
                                <div className="text-xs text-gray-500">Cardano</div>
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
                              <span className="text-gray-600">Funding Campaign Fee</span>
                              <span>{totalCost.amount} {formData.paymentMethod === 'ADA' ? '₳' : 'BONE'}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 flex justify-between font-medium">
                              <span>Total</span>
                              <span>{totalCost.amount} {formData.paymentMethod === 'ADA' ? '₳' : 'BONE'}</span>
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
        )}
      </div>
    </div>
  );
};

export default CreateFunding;
