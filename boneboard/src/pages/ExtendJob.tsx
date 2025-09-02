import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useContract } from '../hooks/useContract';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaMoneyBillWave, FaCheckCircle, FaSpinner } from 'react-icons/fa';

interface Job {
  id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  salary_range: string;
  job_type: string;
  experience_level: string;
  skills: string[];
  deadline: string;
  wallet_address: string;
  status: string;
  created_at: string;
}

interface ExtensionData {
  id: string;
  type: string;
  title: string;
  months: number;
  paymentAmount: number;
  paymentCurrency: string;
}

const ExtendJob: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { isConnected, walletAddress } = useWallet();
  const { extendJobWithADA, extendJobWithBONE, isLoading: contractLoading } = useContract();

  // Job and pricing data
  const [job, setJob] = useState<Job | null>(null);
  const [platformPricing, setPlatformPricing] = useState<{jobListingFee: number, jobListingFeeAda: number} | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    months: 1,
    paymentMethod: 'ADA' as 'ADA' | 'BONE'
  });
  const [currentStep, setCurrentStep] = useState(1);

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!jobId) {
      toast.error('Job ID is required');
      navigate('/my-jobs');
      return;
    }

    loadJobAndPricing();
  }, [jobId, walletAddress, navigate]);

  useEffect(() => {
    if (!walletAddress) return;

    const checkPendingTransaction = () => {
      const keys = Object.keys(localStorage);
      const pendingKey = keys.find(key => 
        key.startsWith(`pendingJobExtensionTx_${walletAddress}_`) && 
        key.includes(jobId || '')
      );

      if (pendingKey) {
        try {
          const pendingData = JSON.parse(localStorage.getItem(pendingKey) || '{}');
          if (pendingData.jobId === jobId) {
            setFormData({
              months: pendingData.months || 1,
              paymentMethod: pendingData.paymentCurrency || 'ADA'
            });
            setCurrentStep(2);
            setPaymentStatus('processing');
            toast.info('Resuming payment processing...');
          }
        } catch (error) {
          console.error('Error parsing pending transaction:', error);
          localStorage.removeItem(pendingKey);
        }
      }
    };

    checkPendingTransaction();
  }, [walletAddress, jobId]);

  useEffect(() => {
    const handleExtensionSuccess = () => {
      setPaymentStatus('success');
      toast.success('Job listing extended successfully!');
      setTimeout(() => {
        navigate('/my-jobs');
      }, 2000);
    };

    window.addEventListener('jobExtendedSuccessfully', handleExtensionSuccess);
    return () => {
      window.removeEventListener('jobExtendedSuccessfully', handleExtensionSuccess);
    };
  }, [navigate]);

  const loadJobAndPricing = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      
      // Load job data
      const jobResponse = await fetch(`/api/jobs/${jobId}`);
      if (!jobResponse.ok) {
        throw new Error('Failed to load job data');
      }
      const jobData = await jobResponse.json();
      
      // Check if user owns this job
      if (jobData.wallet_address !== walletAddress) {
        toast.error('You can only extend your own job listings');
        navigate('/my-jobs');
        return;
      }
      
      setJob(jobData);

      // Load platform pricing
      const pricingResponse = await fetch('/api/admin?type=settings');
      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        setPlatformPricing({
          jobListingFee: pricingData.jobListingFee || 500,
          jobListingFeeAda: pricingData.jobListingFeeAda || 25
        });
      } else {
        // Fallback pricing
        setPlatformPricing({
          jobListingFee: 500,
          jobListingFeeAda: 25
        });
      }
    } catch (error) {
      console.error('Error loading job data:', error);
      toast.error('Failed to load job data');
      navigate('/my-jobs');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total cost
  const calculateTotal = () => {
    if (!platformPricing) {
      return {
        amount: 25,
        displayText: '25 ADA (Loading...)',
        currency: 'ADA'
      };
    }

    const basePrice = formData.paymentMethod === 'BONE' 
      ? platformPricing.jobListingFee 
      : platformPricing.jobListingFeeAda;
    
    const totalPrice = basePrice * formData.months;
    
    return {
      amount: totalPrice,
      displayText: `${totalPrice} ${formData.paymentMethod}`,
      currency: formData.paymentMethod
    };
  };


  const handlePayment = async () => {
    if (!job || !platformPricing) return;

    try {
      setPaymentStatus('processing');
      
      const totalCost = calculateTotal();
      
      const extensionData: ExtensionData = {
        id: job.id,
        type: 'job',
        title: job.title,
        months: formData.months,
        paymentAmount: totalCost.amount,
        paymentCurrency: formData.paymentMethod
      };

      let result;
      if (formData.paymentMethod === 'ADA') {
        result = await extendJobWithADA(extensionData);
      } else {
        result = await extendJobWithBONE(extensionData);
      }

      if (result.success && result.txHash) {
        // Store pending transaction
        const pendingKey = `pendingJobExtensionTx_${walletAddress}_${job.id}`;
        localStorage.setItem(pendingKey, JSON.stringify({
          ...extensionData,
          txHash: result.txHash,
          timestamp: Date.now(),
          jobId: job.id
        }));

        toast.success('Payment submitted! Waiting for confirmation...');
      } else {
        setPaymentStatus('error');
        toast.error(result.error || 'Payment failed');
      }
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      toast.error(error.message || 'Payment failed');
    }
  };

  const getNewExpiryDate = (): string => {
    if (!job) return '';
    
    const currentExpiry = new Date(job.deadline);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + formData.months);
    
    return newExpiry.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading job data...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Job not found</div>
      </div>
    );
  }

  const totalCost = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/my-jobs')}
            className="text-white hover:text-purple-300 transition-colors mr-4"
          >
            <FaArrowLeft className="text-xl" />
          </button>
          <h1 className="text-3xl font-bold text-white">Extend Job Listing</h1>
        </div>

        {/* Job Info Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">{job.title}</h2>
          <p className="text-purple-200 mb-2">{job.company}</p>
          <p className="text-purple-300 text-sm">
            Current deadline: {new Date(job.deadline).toLocaleDateString()}
          </p>
          <p className="text-green-300 text-sm mt-2">
            New deadline: {getNewExpiryDate()}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 1 ? 'bg-purple-500 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              1
            </div>
            <div className={`h-1 w-16 ${currentStep >= 2 ? 'bg-purple-500' : 'bg-gray-600'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep >= 2 ? 'bg-purple-500 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8">
              <h3 className="text-2xl font-semibold text-white mb-6">Select Extension Duration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[1, 3, 6].map((months) => (
                  <button
                    key={months}
                    onClick={() => setFormData(prev => ({ ...prev, months }))}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      formData.months === months
                        ? 'border-purple-400 bg-purple-500/20 text-white'
                        : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-purple-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-2">{months}</div>
                      <div className="text-sm">Month{months > 1 ? 's' : ''}</div>
                      {platformPricing && (
                        <div className="text-lg font-semibold mt-2">
                          {formData.paymentMethod === 'BONE' 
                            ? `${(platformPricing.jobListingFee || 500) * months} BONE`
                            : `${(platformPricing.jobListingFeeAda || 25) * months} ADA`
                          }
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {formData.months > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Payment Method</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'ADA' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.paymentMethod === 'ADA'
                          ? 'border-blue-400 bg-blue-500/20 text-white'
                          : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-blue-500'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-semibold">ADA</div>
                        <div className="text-sm">
                          {(platformPricing?.jobListingFeeAda || 25) * formData.months} ADA
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'BONE' }))}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.paymentMethod === 'BONE'
                          ? 'border-orange-400 bg-orange-500/20 text-white'
                          : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-orange-500'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-semibold">BONE</div>
                        <div className="text-sm">
                          {(platformPricing?.jobListingFee || 500) * formData.months} BONE
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {formData.months > 0 && (
                <div className="text-center">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all"
                  >
                    Continue to Payment
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8">
              <h3 className="text-2xl font-semibold text-white mb-6">Payment Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-purple-200">Job Title:</span>
                  <span className="text-white font-semibold">{job.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-200">Extension Duration:</span>
                  <span className="text-white font-semibold">{formData.months} month{formData.months > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-200">Current Deadline:</span>
                  <span className="text-white">{new Date(job.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-200">New Deadline:</span>
                  <span className="text-green-300 font-semibold">
                    {getNewExpiryDate()}
                  </span>
                </div>
                <div className="border-t border-purple-500/30 pt-4">
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-purple-200">Total Cost:</span>
                    <span className="text-white font-bold">{totalCost.displayText}</span>
                  </div>
                </div>
              </div>

              {!isConnected ? (
                <div className="text-center">
                  <p className="text-yellow-300 mb-4">Please connect your wallet to proceed with payment</p>
                  <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all">
                    Connect Wallet
                  </button>
                </div>
              ) : paymentStatus === 'processing' ? (
                <div className="text-center">
                  <FaSpinner className="animate-spin text-4xl text-purple-400 mx-auto mb-4" />
                  <p className="text-white text-lg">Processing payment...</p>
                  <p className="text-purple-300 text-sm mt-2">
                    Please wait for blockchain confirmation
                  </p>
                </div>
              ) : paymentStatus === 'success' ? (
                <div className="text-center">
                  <FaCheckCircle className="text-4xl text-green-400 mx-auto mb-4" />
                  <p className="text-white text-lg">Extension successful!</p>
                  <p className="text-purple-300 text-sm mt-2">
                    Your job listing has been extended
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handlePayment}
                    disabled={contractLoading}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      contractLoading
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
                    }`}
                  >
                    {contractLoading ? (
                      <span className="flex items-center justify-center">
                        <FaSpinner className="animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <FaMoneyBillWave className="mr-2" />
                        Pay {totalCost.displayText}
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="w-full py-3 rounded-xl border border-purple-500 text-purple-300 hover:bg-purple-500/10 transition-all"
                  >
                    Back to Duration Selection
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ExtendJob;
