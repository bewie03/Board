import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '../contexts/WalletContext';
import { useContract } from '../hooks/useContract';
import { JobService, Job } from '../services/jobService';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCalendarPlus, FaMoneyBillWave, FaCheckCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import PageTransition from '../components/PageTransition';
import CustomMonthPicker from '../components/CustomMonthPicker';
import { calculateMonthsFromNow } from '../utils/fundingPricing';

interface ExtensionData {
  jobId: string;
  months: number;
  paymentMethod: 'ADA' | 'BONE';
  paymentAmount: number;
}

const ExtendJob: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  const { extendJobWithADA, extendJobWithBONE, isLoading: contractLoading } = useContract();

  // Job and pricing data
  const [job, setJob] = useState<Job | null>(null);
  const [platformPricing, setPlatformPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMonths, setSelectedMonths] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ADA' | 'BONE'>('ADA');
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');

  useEffect(() => {
    if (!isConnected || !walletAddress) {
      navigate('/profile/my-jobs');
      return;
    }

    loadJobAndPricing();
  }, [jobId, isConnected, walletAddress]);

  useEffect(() => {
    // Check for pending extension transaction
    const pendingKey = `pendingJobExtensionTx_${jobId}`;
    const pendingTx = localStorage.getItem(pendingKey);
    
    if (pendingTx) {
      try {
        const txData = JSON.parse(pendingTx);
        setPaymentStatus('processing');
        setTxHash(txData.txHash);
        setCurrentStep(2);
        toast.info('Resuming pending extension transaction...');
      } catch (error) {
        console.error('Error parsing pending extension transaction:', error);
        localStorage.removeItem(pendingKey);
      }
    }
  }, [jobId]);

  useEffect(() => {
    // Listen for extension completion
    const handleExtensionSuccess = () => {
      setPaymentStatus('success');
      toast.success('Job listing extended successfully!');
      
      // Clean up and redirect after a delay
      setTimeout(() => {
        navigate('/profile/my-jobs');
      }, 3000);
    };

    window.addEventListener('jobExtensionCompletedSuccessfully', handleExtensionSuccess);
    
    return () => {
      window.removeEventListener('jobExtensionCompletedSuccessfully', handleExtensionSuccess);
    };
  }, [navigate]);

  const loadJobAndPricing = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      
      // Load job details and platform pricing in parallel
      const [jobData, pricingData] = await Promise.all([
        JobService.getJobById(jobId),
        fetch('/api/platform-pricing').then(res => res.json())
      ]);

      // Verify job ownership
      if (jobData && jobData.walletAddress !== walletAddress) {
        toast.error('You can only extend your own job listings');
        navigate('/profile/my-jobs');
        return;
      }

      setJob(jobData);
      setPlatformPricing(pricingData);
    } catch (error) {
      console.error('Error loading job data:', error);
      toast.error('Failed to load job details');
      navigate('/profile/my-jobs');
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentAmount = (months: number, method: 'ADA' | 'BONE'): number => {
    if (!platformPricing) return 0;
    
    const monthsNum = calculateMonthsFromNow(months.toString());
    const basePrice = platformPricing.job_posting_fee || 50;
    
    if (method === 'ADA') {
      return basePrice * monthsNum;
    } else {
      return (basePrice * monthsNum) / (platformPricing.bone_to_ada_rate || 10);
    }
  };

  const handleMonthsChange = (months: string) => {
    setSelectedMonths(months);
    if (months) {
      const monthsNum = calculateMonthsFromNow(months);
      const amount = calculatePaymentAmount(monthsNum, paymentMethod);
      setPaymentAmount(amount);
    }
  };

  const handlePaymentMethodChange = (method: 'ADA' | 'BONE') => {
    setPaymentMethod(method);
    if (selectedMonths) {
      const monthsNum = calculateMonthsFromNow(selectedMonths);
      const amount = calculatePaymentAmount(monthsNum, method);
      setPaymentAmount(amount);
    }
  };

  const handleNextStep = () => {
    if (!selectedMonths) {
      toast.error('Please select extension period');
      return;
    }
    setCurrentStep(2);
  };

  const handlePayment = async () => {
    if (!job || !selectedMonths || !walletAddress) return;

    const monthsNum = calculateMonthsFromNow(selectedMonths);
    const extensionData: ExtensionData = {
      jobId: job.id,
      months: monthsNum,
      paymentMethod,
      paymentAmount
    };

    try {
      setPaymentStatus('processing');
      
      let result;
      if (paymentMethod === 'ADA') {
        result = await extendJobWithADA(extensionData);
      } else {
        result = await extendJobWithBONE(extensionData);
      }

      if (result.success && result.txHash) {
        setTxHash(result.txHash);
        
        // Store pending transaction for monitoring
        const pendingTx = {
          txHash: result.txHash,
          jobId: job.id,
          months: monthsNum,
          paymentMethod,
          walletAddress,
          timestamp: Date.now()
        };
        
        localStorage.setItem(`pendingJobExtensionTx_${job.id}`, JSON.stringify(pendingTx));
        
        toast.info('Extension payment submitted! Waiting for blockchain confirmation...');
      } else {
        setPaymentStatus('error');
        toast.error(result.error || 'Extension payment failed');
      }
    } catch (error) {
      console.error('Extension payment error:', error);
      setPaymentStatus('error');
      toast.error('Extension payment failed');
    }
  };

  const getNewExpiryDate = (): string => {
    if (!job || !selectedMonths) return '';
    
    const currentExpiry = new Date(job.expiresAt);
    const monthsToAdd = calculateMonthsFromNow(selectedMonths);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);
    
    return newExpiry.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading job details...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!job) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <FaExclamationTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-gray-500 mb-4">The job listing you're trying to extend could not be found.</p>
            <button
              onClick={() => navigate('/profile/my-jobs')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <FaArrowLeft className="mr-2 h-4 w-4" />
              Back to My Jobs
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/profile/my-jobs')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <FaArrowLeft className="mr-2 h-4 w-4" />
              Back to My Jobs
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Extend Job Listing</h1>
            <p className="mt-2 text-gray-600">Extend the visibility period for "{job.title}"</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`flex-shrink-0 w-8 h-8 border-2 ${currentStep >= 1 ? 'border-blue-600 bg-blue-600' : 'border-gray-300'} rounded-full flex items-center justify-center`}>
                  {currentStep > 1 ? (
                    <FaCheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-white' : 'text-gray-500'}`}>1</span>
                  )}
                </div>
                <span className="ml-3 text-sm font-medium">Extension Details</span>
              </div>
              <div className={`flex-1 h-0.5 mx-4 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`flex-shrink-0 w-8 h-8 border-2 ${currentStep >= 2 ? 'border-blue-600 bg-blue-600' : 'border-gray-300'} rounded-full flex items-center justify-center`}>
                  <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-white' : 'text-gray-500'}`}>2</span>
                </div>
                <span className="ml-3 text-sm font-medium">Payment</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-lg shadow-sm">
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <FaCalendarPlus className="mr-3 text-blue-600" />
                  Extension Details
                </h2>

                {/* Current Job Info */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">{job.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">at {job.company}</p>
                  <p className="text-sm text-gray-500">
                    Current expiry: {new Date(job.expiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Extension Period Selection */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Extension Period
                    </label>
                    <CustomMonthPicker
                      value={selectedMonths}
                      onChange={handleMonthsChange}
                      placeholder="Choose extension period..."
                    />
                  </div>

                  {selectedMonths && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Extension Summary</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>Extension period: {selectedMonths}</p>
                        <p>New expiry date: {getNewExpiryDate()}</p>
                        <p>Extension cost: {paymentAmount.toFixed(2)} ADA</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={handleNextStep}
                    disabled={!selectedMonths}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Continue to Payment
                    <svg className="ml-2 -mr-1 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="p-8"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <FaMoneyBillWave className="mr-3 text-blue-600" />
                  Payment
                </h2>

                {paymentStatus === 'idle' && (
                  <>
                    {/* Extension Summary */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <h3 className="font-medium text-gray-900 mb-4">Extension Summary</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Job:</span>
                          <p className="font-medium">{job.title}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Extension Period:</span>
                          <p className="font-medium">{selectedMonths}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Current Expiry:</span>
                          <p className="font-medium">{new Date(job.expiresAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">New Expiry:</span>
                          <p className="font-medium text-blue-600">{getNewExpiryDate()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Payment Method
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            onClick={() => handlePaymentMethodChange('ADA')}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                              paymentMethod === 'ADA'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium text-gray-900">ADA Payment</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {calculatePaymentAmount(calculateMonthsFromNow(selectedMonths), 'ADA').toFixed(2)} ADA
                            </div>
                          </button>
                          <button
                            onClick={() => handlePaymentMethodChange('BONE')}
                            className={`p-4 border-2 rounded-lg text-left transition-all ${
                              paymentMethod === 'BONE'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium text-gray-900">BONE Payment</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {calculatePaymentAmount(calculateMonthsFromNow(selectedMonths), 'BONE').toFixed(2)} BONE
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Wallet Connection Status */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <FaCheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm font-medium text-green-800">
                            Wallet Connected: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between mt-8">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <FaArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </button>
                      <button
                        onClick={handlePayment}
                        disabled={contractLoading || !selectedMonths}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {contractLoading ? (
                          <>
                            <FaSpinner className="animate-spin mr-2 h-5 w-5" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Pay {paymentAmount.toFixed(2)} {paymentMethod}
                            <FaMoneyBillWave className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

                {/* Payment Status Display */}
                {paymentStatus === 'processing' && (
                  <div className="text-center py-12">
                    <FaSpinner className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Extension Payment</h3>
                    <p className="text-gray-500 mb-4">
                      Please wait while we confirm your transaction on the blockchain...
                    </p>
                    {txHash && (
                      <p className="text-xs text-gray-400 font-mono">
                        Transaction: {txHash.slice(0, 16)}...{txHash.slice(-8)}
                      </p>
                    )}
                  </div>
                )}

                {paymentStatus === 'success' && (
                  <div className="text-center py-12">
                    <FaCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Extension Successful!</h3>
                    <p className="text-gray-500 mb-4">
                      Your job listing has been extended until {getNewExpiryDate()}
                    </p>
                    <button
                      onClick={() => navigate('/profile/my-jobs')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      View My Jobs
                    </button>
                  </div>
                )}

                {paymentStatus === 'error' && (
                  <div className="text-center py-12">
                    <FaExclamationTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Extension Failed</h3>
                    <p className="text-gray-500 mb-4">
                      There was an error processing your extension payment. Please try again.
                    </p>
                    <div className="space-x-4">
                      <button
                        onClick={() => setPaymentStatus('idle')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={() => navigate('/profile/my-jobs')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ExtendJob;
