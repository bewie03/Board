import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUpload, FaWallet, FaCheck, FaTimes, FaGlobe, FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import { useWallet } from '../contexts/WalletContext';
import { initiateTwitterOAuth } from '../utils/auth';
import { toast } from 'react-toastify';
// ProjectService import removed - now handled by projectTransactionMonitor
import { contractService, ProjectPostingData } from '../services/contractService';
import { PROJECT_CATEGORIES } from '../constants/categories';

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, walletAddress, formatAddress } = useWallet();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState<'twitter' | 'discord' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [currentStep, setCurrentStep] = useState(1);

  // Check for pending transactions on load and resume to payment step
  useEffect(() => {
    if (isConnected && walletAddress) {
      const pendingKey = `pendingProjectTx_${walletAddress}`;
      const pendingTxData = localStorage.getItem(pendingKey);
      
      if (pendingTxData) {
        try {
          const pendingTx = JSON.parse(pendingTxData);
          console.log('Found pending project transaction, resuming to payment step');
          
          // Restore form data from pending transaction
          setFormData(pendingTx.formData);
          if (pendingTx.logoPreview) {
            // Restore logo preview from stored data
            setLogoPreview(pendingTx.logoPreview);
          }
          setCurrentStep(2);
          setPaymentStatus('processing');
          
          toast.info('Resuming payment process. Your transaction is being monitored.');
          
          // Ensure transaction monitoring is running
          import('../services/projectTransactionMonitor').then(({ projectTransactionMonitor }) => {
            projectTransactionMonitor.startMonitoring(walletAddress);
          });
        } catch (error) {
          console.error('Error parsing pending project transaction:', error);
          localStorage.removeItem(pendingKey);
        }
      }
    }
  }, [isConnected, walletAddress]);

  // Listen for successful project creation from transaction monitor
  useEffect(() => {
    const handleProjectCreated = () => {
      if (currentStep === 2 && paymentStatus === 'processing') {
        setPaymentStatus('success');
        setTimeout(() => {
          navigate('/projects');
        }, 2000);
      }
    };

    // Listen for the custom event from transaction monitor
    window.addEventListener('projectCreatedSuccessfully', handleProjectCreated);
    
    return () => {
      window.removeEventListener('projectCreatedSuccessfully', handleProjectCreated);
    };
  }, [currentStep, paymentStatus, navigate]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    category: '',
    twitter: {
      username: '',
      verified: false,
      id: '',
      profileImageUrl: ''
    },
    discordInvite: '',
    paymentMethod: 'BONE' as 'BONE' | 'ADA',
    agreeToTerms: false,
  });
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (value.length <= 500) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTwitterAuth = async () => {
    try {
      setIsAuthenticating('twitter');
      setError(null);
      
      // In a real app, this would redirect to Twitter OAuth
      // For now, we'll simulate a successful auth
      const twitterData = await initiateTwitterOAuth();
      
      setFormData(prev => ({
        ...prev,
        twitter: {
          username: twitterData.username,
          verified: true,
          id: twitterData.id,
          profileImageUrl: twitterData.profileImageUrl || ''
        },
      }));
    } catch (err) {
      console.error('Twitter auth error:', err);
      setError('Failed to authenticate with Twitter. Please try again.');
    } finally {
      setIsAuthenticating(null);
    }
  };


  const removeTwitterAuth = () => {
    setFormData(prev => ({
      ...prev,
      twitter: {
        username: '',
        verified: false,
        id: '',
        profileImageUrl: ''
      }
    }));
  };


  const handleLogoUpload = (file: File) => {
    if (file) {
      // Check file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size should not exceed 2MB');
        return;
      }
      
      // Check file type
      if (!file.type.match('image.*')) {
        alert('Please select an image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setLogoFile(file);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleLogoUpload(file);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 2) {
      // Validate first step
      if (!formData.name.trim()) {
        setError('Project name is required');
        return;
      }
      
      if (!formData.description.trim()) {
        setError('Project description is required');
        return;
      }
      
      if (!formData.website.trim()) {
        setError('Website URL is required');
        return;
      }
      
      if (!formData.category) {
        setError('Please select a category');
        return;
      }
      
      if (!logoFile) {
        setError('Please upload a logo');
        return;
      }
      
      setCurrentStep(2);
      setError(null);
      return;
    }
    
    if (!formData.description.trim()) {
      setError('Project description is required');
      return;
    }
    
    if (!formData.website.trim()) {
      setError('Website URL is required');
      return;
    }
    
    setIsSubmitting(true);
    setPaymentStatus('processing');
    setError(null);
    
    try {
      // Process real blockchain payment
      toast.info('Processing payment...');
      
      // Logo conversion now handled by projectTransactionMonitor

      // Prepare project data for blockchain
      const projectData: ProjectPostingData = {
        title: formData.name,
        description: formData.description,
        fundingGoal: 0, // Set default funding goal
        category: formData.category,
        contactEmail: '', // Add contact email field if needed
        walletAddress: walletAddress!,
        paymentAmount: totalCost.amount,
        paymentCurrency: formData.paymentMethod as 'BONE' | 'ADA',
        timestamp: Date.now(),
        website: formData.website,
        twitter: formData.twitter.username,
        discord: formData.discordInvite
      };

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
      
      // Add debug logging
      console.log('Wallet validation debug:', {
        connectedWallet,
        currentAddress: currentAddress?.slice(0, 20) + '...',
        storedAddress: walletAddress?.slice(0, 20) + '...',
        addressesMatch: currentAddress === walletAddress
      });
      
      // Compare with stored wallet address from the same wallet type
      if (currentAddress !== walletAddress) {
        const currentTruncated = `${currentAddress?.slice(0, 8)}...${currentAddress?.slice(-8)}`;
        const expectedTruncated = `${walletAddress?.slice(0, 8)}...${walletAddress?.slice(-8)}`;
        throw new Error(`Address mismatch detected: expecting ${expectedTruncated} but ${currentTruncated} is connected in ${connectedWallet}. Please switch to the correct address or reconnect your wallet.`);
      }
      
      await contractService.initializeLucid(walletApi);
      
      // Process payment through contract service
      const result = formData.paymentMethod === 'ADA'
        ? await contractService.postProjectWithADA(projectData)
        : await contractService.postProjectWithBONE(projectData);
      
      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }
      
      const txHash = result.txHash!;
      
      // Save transaction to localStorage for persistence
      const pendingKey = `pendingProjectTx_${walletAddress}`;
      const pendingTxData = {
        txHash,
        projectData,
        formData,
        logoFile: null, // Can't serialize File object
        logoPreview: logoPreview, // Store the preview instead
        timestamp: Date.now()
      };
      localStorage.setItem(pendingKey, JSON.stringify(pendingTxData));
      
      setPaymentStatus('processing');
      toast.info('Payment submitted! Waiting for blockchain confirmation...');
      
      // Start transaction monitoring
      import('../services/projectTransactionMonitor').then(({ projectTransactionMonitor }) => {
        projectTransactionMonitor.startMonitoring(walletAddress!);
      });

      // Transaction monitoring will handle confirmation and database saving
      // The UI will be updated via the event listener when transaction is confirmed
      
    } catch (err) {
      console.error('Error creating project:', err);
      setPaymentStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project. Please try again.';
      
      // Check if it's a wallet address mismatch error
      if (errorMessage && errorMessage.includes('Address mismatch detected')) {
        toast.error('❌ Wallet Address Mismatch\n\n' + errorMessage, {
          autoClose: 8000,
          style: { whiteSpace: 'pre-line' }
        });
      } else {
        toast.error(errorMessage);
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, logoFile, navigate, currentStep, isConnected, walletAddress]);
  
  const [platformPricing, setPlatformPricing] = useState<{
    projectListingFee: number;
    projectListingFeeAda: number;
  } | null>(null);

  // Load platform pricing on component mount
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const response = await fetch('/api/admin?type=settings');
        if (response.ok) {
          const data = await response.json();
          setPlatformPricing({
            projectListingFee: data.projectListingFee || 500,
            projectListingFeeAda: data.projectListingFeeAda || 50
          });
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
        // Set default pricing if API fails
        setPlatformPricing({
          projectListingFee: 500,
          projectListingFeeAda: 50
        });
      }
    };
    loadPricing();
  }, []);

  const calculateProjectCost = () => {
    if (!platformPricing) {
      return {
        amount: formData.paymentMethod === 'ADA' ? 50 : 500,
        currency: formData.paymentMethod
      };
    }
    
    const amount = formData.paymentMethod === 'ADA' 
      ? platformPricing.projectListingFeeAda 
      : platformPricing.projectListingFee;
    
    return {
      amount,
      currency: formData.paymentMethod
    };
  };
  
  const totalCost = calculateProjectCost();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back button and title */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <FaArrowLeft className="mr-2" /> Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
              <div className="mt-2 flex items-center space-x-4">
                <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    1
                  </div>
                  <span className="ml-2 text-sm font-medium">Project Details</span>
                </div>
                <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 2 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    2
                  </div>
                  <span className="ml-2 text-sm font-medium">Payment</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-8 sm:p-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Logo Upload */}
                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Logo *
                  </label>
                  <div 
                    className={`mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    {logoPreview ? (
                      <div className="relative group">
                        <img
                          src={logoPreview}
                          alt="Project logo preview"
                          className="h-24 w-24 rounded-full object-cover mx-auto"
                        />
                        <label 
                          htmlFor="logo-upload"
                          className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          title="Change logo"
                        >
                          <span className="text-white text-xs font-medium">Change</span>
                          <input
                            id="logo-upload"
                            name="logo"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileInputChange}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-4 flex text-sm text-gray-600">
                          <label
                            htmlFor="logo-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="logo-upload"
                              name="logo"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleFileInputChange}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      PNG, JPG, GIF up to 2MB
                    </p>
                    {logoFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                    {!logoPreview && (
                      <p className="text-xs text-gray-400 mt-1">
                        Recommended size: 200x200px
                      </p>
                    )}
                  </div>
                </div>

                {/* Project Name */}
                <div className="sm:col-span-6">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Project Name *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      maxLength={50}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pr-16 border transition-colors duration-200"
                      placeholder="e.g. BoneSwap"
                      required
                    />
                    <div className={`absolute bottom-2 right-3 text-xs ${formData.name.length >= 45 ? 'text-red-500' : 'text-gray-400'}`}>
                      {formData.name.length}/50
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a memorable name for your project
                  </p>
                </div>

                {/* Project Description */}
                <div className="sm:col-span-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <div className="mt-1">
                    <div className="relative">
                      <textarea
                        id="description"
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleDescriptionChange}
                        maxLength={500}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-3 pr-16 transition-colors duration-200"
                        placeholder="Tell us about your project..."
                        required
                      />
                      <div className={`absolute bottom-2 right-3 text-xs ${formData.description.length >= 280 ? 'text-red-500' : 'text-gray-400'}`}>
                        {formData.description.length}/500
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Brief description of your project and its goals. {formData.description.length >= 280 && (
                      <span className="text-red-500">
                        {500 - formData.description.length} characters remaining
                      </span>
                    )}
                  </p>
                </div>

                {/* Project Category */}
                <div className="sm:col-span-6">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category *
                  </label>
                  <div className="mt-1">
                    <CustomSelect
                      id="category"
                      name="category"
                      options={[
                        { value: '', label: 'Select a category' },
                        ...PROJECT_CATEGORIES.map(category => ({
                          value: category,
                          label: category
                        }))
                      ]}
                      value={formData.category}
                      onChange={(value) => {
                        const event = { target: { name: 'category', value } } as React.ChangeEvent<HTMLSelectElement>;
                        handleChange(event);
                      }}
                      placeholder="Select a category"
                    />
                  </div>
                </div>

                {/* Project Website */}
                <div className="sm:col-span-6">
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="url"
                      name="website"
                      id="website"
                      value={formData.website}
                      onChange={handleChange}
                      maxLength={200}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pr-16 border transition-colors duration-200"
                      placeholder="https://example.com"
                    />
                    <div className={`absolute bottom-2 right-3 text-xs ${formData.website.length >= 180 ? 'text-red-500' : 'text-gray-400'}`}>
                      {formData.website.length}/200
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Your project's main website or landing page
                  </p>
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twitter Verification {formData.twitter.verified && <span className="text-green-500 ml-1">✓</span>}
                    </label>
                    {formData.twitter.verified ? (
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center">
                          {formData.twitter.profileImageUrl ? (
                            <img 
                              src={formData.twitter.profileImageUrl} 
                              alt={`@${formData.twitter.username}`}
                              className="h-8 w-8 rounded-full mr-3"
                            />
                          ) : (
                            <FaXTwitter className="h-5 w-5 text-blue-500 mr-2" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            Connected as @{formData.twitter.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={removeTwitterAuth}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                          disabled={isAuthenticating === 'twitter'}
                        >
                          {isAuthenticating === 'twitter' ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleTwitterAuth}
                          disabled={isAuthenticating === 'twitter'}
                          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaXTwitter className="w-5 h-5 mr-2 text-gray-900" />
                          {isAuthenticating === 'twitter' ? 'Connecting...' : 'Connect with Twitter'}
                        </button>
                        <p className="mt-1 text-xs text-gray-500">
                          We'll verify your Twitter account ownership
                        </p>
                      </>
                    )}
                  </div>

                  <div>
                    <label htmlFor="discordInvite" className="block text-sm font-medium text-gray-700">
                      Discord Invite Link
                    </label>
                    <div className="mt-1 relative">
                      <input
                        type="url"
                        name="discordInvite"
                        id="discordInvite"
                        value={formData.discordInvite}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border transition-colors duration-200"
                        placeholder="https://discord.gg/your-invite"
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Optional Discord server invite link
                    </p>
                  </div>
                </div>

                  </div>
                )}
                
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* Project Preview Card */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Preview</h3>
                      <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 max-w-md">
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-16 w-16 rounded-xl bg-white border-2 border-gray-200 overflow-hidden shadow-sm flex items-center justify-center">
                                {logoPreview ? (
                                  <img 
                                    className="h-full w-full object-cover" 
                                    src={logoPreview} 
                                    alt={`${formData.name} logo`}
                                  />
                                ) : (
                                  <div className="text-blue-600 text-2xl">
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clipRule="evenodd"></path>
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center gap-2">
                                  <h2 className="text-xl font-bold text-gray-900">
                                    {formData.name || 'Project Name'}
                                  </h2>
                                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    New
                                  </div>
                                </div>
                                <div className="flex items-center mt-2 space-x-2">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    {formData.category || 'Category'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-blue-600">0</div>
                              <div className="text-sm text-gray-500">jobs</div>
                            </div>
                          </div>
                          
                          <p className="mt-4 text-gray-600 line-clamp-3 leading-relaxed">
                            {formData.description || 'Project description will appear here...'}
                          </p>
                          
                          {/* Social Links Preview */}
                          <div className="mt-4 flex items-center space-x-3">
                            {formData.website && (
                              <div className="flex items-center text-gray-400 hover:text-blue-600">
                                <FaGlobe className="h-4 w-4" />
                              </div>
                            )}
                            {formData.twitter.verified && (
                              <div className="flex items-center text-gray-400 hover:text-blue-600">
                                <FaXTwitter className="h-4 w-4" />
                              </div>
                            )}
                            {formData.discordInvite && (
                              <div className="flex items-center text-gray-400 hover:text-indigo-600">
                                <FaDiscord className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Project Summary */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Project Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Project Name:</span>
                          <span className="font-medium">{formData.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Category:</span>
                          <span className="font-medium">{formData.category}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Website:</span>
                          <span className="font-medium">{formData.website}</span>
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
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <div className="flex items-center">
                              <span className="text-lg mr-3">🦴</span>
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
                              onChange={handleChange}
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
                              <span className="text-gray-600">Project Creation Fee</span>
                              <span>{totalCost.amount} {totalCost.currency === 'ADA' ? '₳' : 'BONE'}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 flex justify-between font-medium">
                              <span>Total</span>
                              <span>{totalCost.amount} {totalCost.currency === 'ADA' ? '₳' : 'BONE'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Wallet Connection */}
                        {isConnected && walletAddress ? (
                          <div className="mb-4">
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                              <div className="flex items-center">
                                <FaCheck className="h-5 w-5 text-green-600 mr-2" />
                                <span className="text-sm font-medium text-green-800">
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
                                <span className="text-sm font-medium text-yellow-800">
                                  Wallet not connected
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  window.dispatchEvent(new Event('wallet-connect-request'));
                                }}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Connect Now
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Terms and Conditions - Only show in step 2 */}
                {currentStep === 2 && (
                <div className="flex items-start mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        agreeToTerms: e.target.checked
                      }))}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="font-medium text-gray-700">
                      I agree to the{' '}
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          setShowTerms(true);
                        }} 
                        className="text-blue-600 hover:text-blue-500 focus:outline-none"
                      >
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          setShowPrivacy(true);
                        }} 
                        className="text-blue-600 hover:text-blue-500 focus:outline-none"
                      >
                        Privacy Policy
                      </button>{' '}
                      *
                    </label>
                    <p className="text-gray-500">
                      By checking this box, you confirm that the information provided is accurate and you agree to our terms.
                    </p>
                  </div>
                </div>
                )}
                  
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Payment Status */}
                {paymentStatus === 'processing' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Processing Payment</h3>
                    <p className="text-blue-700">Please wait while we process your transaction...</p>
                  </div>
                )}
                
                {paymentStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                    <FaCheck className="h-8 w-8 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-900 mb-2">Project Created Successfully!</h3>
                    <p className="text-green-700">Your project has been created and is now live on BoneBoard.</p>
                  </div>
                )}
                
                {paymentStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <FaTimes className="h-8 w-8 text-red-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-red-900 mb-2">Payment Failed</h3>
                    <p className="text-red-700">There was an error processing your payment. Please try again.</p>
                  </div>
                )}
                
                <div className="pt-5">
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentStep > 1) {
                          setCurrentStep(currentStep - 1);
                          setError(null);
                        } else {
                          navigate(-1);
                        }
                      }}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={isSubmitting || paymentStatus === 'processing'}
                    >
                      {currentStep > 1 ? 'Back' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || paymentStatus === 'processing' || paymentStatus === 'success' || (currentStep === 2 && !isConnected)}
                      className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : currentStep === 1 ? (
                        'Continue to Payment'
                      ) : (
                        `Pay ${totalCost.amount} ${totalCost.currency}`
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Terms of Service Modal */}
      {showTerms && (
        <Modal 
          isOpen={showTerms}
          onClose={() => setShowTerms(false)}
          title="Terms of Service"
        >
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">1</span>
                Acceptance of Terms
              </h3>
              <p className="text-gray-700 pl-8">
                By using BoneBoard, you agree to the following terms:
              </p>
              <ul className="list-disc pl-12 space-y-2 text-gray-700">
                <li>You are responsible for the accuracy of the information you provide</li>
                <li>You will not post any misleading or fraudulent information</li>
                <li>You understand that all transactions are final and non-refundable</li>
                <li>You agree to comply with all applicable laws and regulations</li>
                <li>You are at least 18 years of age or have parental consent</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">2</span>
                User Conduct
              </h3>
              <p className="text-gray-700 pl-8">
                Users agree to use BoneBoard in compliance with all applicable laws and regulations. Prohibited activities include but are not limited to:
              </p>
              <ul className="list-disc pl-12 space-y-2 text-gray-700">
                <li>Posting fraudulent, misleading, or deceptive content</li>
                <li>Harassing, bullying, or threatening other users</li>
                <li>Violating intellectual property rights or copyrights</li>
                <li>Attempting to interfere with the proper functioning of the platform</li>
              </ul>
            </section>
            
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
                Payments and Fees
              </h3>
              <p className="text-gray-700 pl-8">
                All payments are processed on the Cardano blockchain using smart contracts. Fees are non-refundable once the transaction is confirmed on the blockchain. You are responsible for any network fees associated with your transactions.
              </p>
            </section>
          </div>
        </Modal>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <Modal 
          isOpen={showPrivacy}
          onClose={() => setShowPrivacy(false)}
          title="Privacy Policy"
        >
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">1</span>
                Information We Collect
              </h3>
              <p className="text-gray-700 pl-8">
                We collect information you provide directly to us, such as when you create an account, post a job, or communicate with us. This may include your name, email address, wallet address, and any other information you choose to provide.
              </p>
            </section>
            
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">2</span>
                How We Use Your Information
              </h3>
              <p className="text-gray-700 pl-8">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-12 space-y-2 text-gray-700">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
              </ul>
            </section>
            
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
                Data Security
              </h3>
              <p className="text-gray-700 pl-8">
                We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CreateProject;