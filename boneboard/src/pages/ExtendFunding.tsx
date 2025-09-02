import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCalendarAlt, FaCheck, FaTimes, FaWallet } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import { useContract } from '../hooks/useContract';
import { toast } from 'react-toastify';
import { calculateFundingCost } from '../utils/fundingPricing';

interface FundingProject {
  id: string;
  title: string;
  description: string;
  funding_goal: number;
  current_funding: number;
  funding_deadline: string;
  wallet_address: string;
  is_active: boolean;
  created_at: string;
}

const ExtendFunding: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { isConnected, walletAddress, formatAddress } = useWallet();
  const { extendWithADA, extendWithBONE, isLoading: contractLoading } = useContract();
  
  const [project, setProject] = useState<FundingProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    months: 1,
    paymentMethod: 'ADA' as 'ADA' | 'BONE'
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [platformPricing, setPlatformPricing] = useState<{fundingListingFee: number, fundingListingFeeAda: number} | null>(null);

  // Load platform pricing from admin panel
  useEffect(() => {
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
    loadPlatformPricing();
  }, []);

  // Load project data
  useEffect(() => {
    if (!projectId || !walletAddress) {
      toast.error('Project ID or wallet address missing');
      navigate('/my-funding');
      return;
    }

    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects?id=${projectId}&wallet=${encodeURIComponent(walletAddress)}`);
        if (response.ok) {
          const projectsData = await response.json();
          const projects = Array.isArray(projectsData) ? projectsData : (projectsData.projects || []);
          const projectData = projects.find((project: any) => project.id === projectId);
          
          if (!projectData) {
            throw new Error('Project not found');
          }
          
          setProject(projectData);
        } else {
          toast.error('Project not found or access denied');
          navigate('/my-funding');
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project');
        navigate('/my-funding');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, walletAddress, navigate]);

  // Check for pending extension transactions
  useEffect(() => {
    if (!walletAddress || !projectId) return;

    const pendingKey = `pendingExtensionTx_${walletAddress}_${projectId}`;
    const pendingTxData = localStorage.getItem(pendingKey);
    
    if (pendingTxData) {
      try {
        const txData = JSON.parse(pendingTxData);
        // Resume to payment step if there's a pending transaction
        setFormData(prev => ({
          ...prev,
          months: txData.months,
          paymentMethod: txData.paymentMethod
        }));
        setCurrentStep(2);
        setPaymentStatus('processing');
        toast.info('Resuming pending extension transaction...');
      } catch (error) {
        console.error('Error parsing pending transaction data:', error);
        localStorage.removeItem(pendingKey);
      }
    }
  }, [walletAddress, projectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handlePayment = async () => {
    if (!project || !walletAddress) return;

    const extensionData = {
      id: project.id,
      type: 'project' as const,
      title: project.title,
      months: formData.months,
      paymentAmount: totalCost.amount,
      paymentCurrency: formData.paymentMethod
    };

    try {
      setPaymentStatus('processing');
      
      const txKey = `pendingExtensionTx_${walletAddress}_${project.id}`;
      localStorage.setItem(txKey, JSON.stringify({
        projectId: project.id,
        months: formData.months,
        paymentMethod: formData.paymentMethod,
        timestamp: Date.now()
      }));

      let success;
      if (formData.paymentMethod === 'ADA') {
        success = await extendWithADA(extensionData);
      } else {
        success = await extendWithBONE(extensionData);
      }

      if (success) {
        toast.info('Payment submitted! Waiting for blockchain confirmation...');
        // Payment status will be updated by transaction monitor
      } else {
        setPaymentStatus('error');
        localStorage.removeItem(txKey);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
    }
  };

  const calculateTotal = () => {
    if (!platformPricing) {
      return {
        amount: formData.paymentMethod === 'ADA' ? 6 : 500,
        currency: formData.paymentMethod,
        months: formData.months
      };
    }

    const baseCost = formData.paymentMethod === 'ADA' 
      ? platformPricing.fundingListingFeeAda 
      : platformPricing.fundingListingFee;
    const dynamicCost = calculateFundingCost(formData.months, baseCost);
    
    return {
      amount: dynamicCost,
      currency: formData.paymentMethod,
      months: formData.months
    };
  };

  const totalCost = calculateTotal();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Project not found</p>
          <button
            onClick={() => navigate('/my-funding')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to My Funding
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => navigate('/my-funding')}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <FaArrowLeft className="mr-2" />
              Back to My Funding
            </button>
            <h1 className="mt-2 text-3xl font-extrabold text-gray-900">Extend Funding Period</h1>
            <p className="mt-2 text-sm text-gray-600">
              Extend the funding period for "{project.title}"
            </p>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-8 sm:p-10">
              {/* Step Indicator */}
              <div className="mb-8">
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > 1 ? <FaCheck className="w-4 h-4" /> : '1'}
                  </div>
                  <div className={`flex-1 h-1 mx-4 ${currentStep > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > 2 ? <FaCheck className="w-4 h-4" /> : '2'}
                  </div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-sm text-gray-600">Extension Details</span>
                  <span className="text-sm text-gray-600">Payment</span>
                </div>
              </div>

              {currentStep === 1 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Extension Details</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Choose how long you want to extend your funding period
                    </p>
                  </div>

                  {/* Project Info */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">{project.title}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Current Goal:</span>
                        <span className="ml-2 font-medium">{project.funding_goal} ADA</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Funding:</span>
                        <span className="ml-2 font-medium">{project.current_funding} ADA</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Deadline:</span>
                        <span className="ml-2 font-medium">
                          {new Date(project.funding_deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Extension Period Selection */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Extension Period
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[1, 2, 3, 6].map((months) => (
                        <button
                          key={months}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, months }))}
                          className={`p-4 border-2 rounded-lg text-center transition-colors ${
                            formData.months === months
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium">{months} Month{months > 1 ? 's' : ''}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {calculateFundingCost(months)} ADA
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom months input */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Or enter custom months (1-12):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={formData.months}
                        onChange={(e) => setFormData(prev => ({ ...prev, months: parseInt(e.target.value) || 1 }))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* New Deadline Preview */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <FaCalendarAlt className="text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">New Deadline</p>
                        <p className="text-sm text-blue-700">
                          {(() => {
                            const currentDeadline = new Date(project.funding_deadline);
                            const newDeadline = new Date(currentDeadline);
                            newDeadline.setMonth(newDeadline.getMonth() + formData.months);
                            return newDeadline.toLocaleDateString();
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5">
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => navigate('/my-funding')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {currentStep === 2 && (
                <>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Payment</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Complete your payment to extend the funding period
                    </p>
                  </div>

                  {/* Extension Summary */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-4">Extension Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Project:</span>
                        <span className="font-medium">{project.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Extension Period:</span>
                        <span className="font-medium">{formData.months} month{formData.months > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Deadline:</span>
                        <span className="font-medium">{new Date(project.funding_deadline).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">New Deadline:</span>
                        <span className="font-medium text-blue-600">
                          {(() => {
                            const currentDeadline = new Date(project.funding_deadline);
                            const newDeadline = new Date(currentDeadline);
                            newDeadline.setMonth(newDeadline.getMonth() + formData.months);
                            return newDeadline.toLocaleDateString();
                          })()}
                        </span>
                      </div>
                      <hr className="my-3" />
                      <div className="flex justify-between font-medium">
                        <span>Total Cost:</span>
                        <span>{totalCost.amount} {totalCost.currency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <FaWallet className="mr-2" />
                      Payment Method
                    </h3>
                    
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
                            <div className="text-xs text-gray-500">
                              {platformPricing ? platformPricing.fundingListingFee : 500} BONE/month
                            </div>
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
                          <span className="text-2xl mr-3">₳</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">Cardano ADA</div>
                            <div className="text-xs text-gray-500">
                              {platformPricing ? platformPricing.fundingListingFeeAda : 10} ADA/month
                            </div>
                          </div>
                        </div>
                        {formData.paymentMethod === 'ADA' && (
                          <FaCheck className="absolute top-2 right-2 h-4 w-4 text-blue-500" />
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Wallet Connection Status */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Wallet Connection</h3>
                    <div className="space-y-4">
                      {isConnected && walletAddress ? (
                        <div className="mb-4">
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-center">
                              <FaCheck className="h-5 w-5 text-green-600 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                Connected: {formatAddress(walletAddress)}
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
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handlePayment}
                        disabled={!isConnected || contractLoading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {contractLoading ? 'Processing...' : `Pay ${totalCost} ${formData.paymentMethod === 'ADA' ? 'ADA' : 'BONE'}`}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {paymentStatus === 'processing' && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-500">Processing your payment...</p>
                  <p className="mt-2 text-xs text-gray-400">Please confirm the transaction in your wallet</p>
                </div>
              )}

              {paymentStatus === 'success' && (
                <div className="text-center py-12">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <FaCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-gray-900">Extension Successful!</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Your funding period has been extended successfully.
                  </p>
                  <div className="mt-6 space-x-3">
                    <button
                      type="button"
                      onClick={() => navigate('/my-funding')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Back to My Funding
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/funding/${project.id}`)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      View Project
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
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtendFunding;
