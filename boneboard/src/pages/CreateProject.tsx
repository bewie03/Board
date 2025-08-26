import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUpload, FaTwitter, FaDiscord, FaWallet, FaCheck, FaTimes } from 'react-icons/fa';
import Modal from '../components/Modal';
import { useWallet } from '../contexts/WalletContext';
import { initiateTwitterOAuth, initiateDiscordOAuth } from '../utils/auth';
import { toast } from 'react-toastify';
import { ProjectService } from '../services/projectService';
import { contractService, ProjectPostingData } from '../services/contractService';

const PROJECT_CATEGORIES = [
  'AI',
  'Alpha Group',
  'Book Publishing',
  'Bridge',
  'CEX',
  'Cloud Services',
  'Compute',
  'Currency',
  'DAO',
  'DeFi',
  'DePIN',
  'Derivatives',
  'DEX',
  'DEX Aggregator',
  'Education',
  'Gaming',
  'Index Funds',
  'Infrastructure',
  'Launchpad',
  'Layer 2',
  'Lend/Borrow',
  'Liquid Staking',
  'Memecoin',
  'Metaverse',
  'Music',
  'NFT',
  'NFT Infrastructure',
  'NFT Marketplace',
  'Oracle',
  'PoW Mining',
  'Prediction Market',
  'Privacy',
  'Reserve Coin',
  'RWA',
  'SocialFi',
  'Stablecoin',
  'Storage',
  'Synthetics',
  'Telecoms',
  'Token Distribution',
  'Tools',
  'Utility',
  'Wallet',
  'Wrapped Token',
  'Yield',
  'Yield Products',
  'Other'
];

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

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    category: '',
    twitter: {
      username: '',
      verified: false,
      id: ''
    },
    discord: {
      serverName: '',
      verified: false,
      inviteUrl: ''
    },
    paymentMethod: 'BONE' as 'BONE' | 'ADA',
    agreeToTerms: false,
  });
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (value.length <= 300) {
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
      const result = await initiateTwitterOAuth();
      
      setFormData(prev => ({
        ...prev,
        twitter: {
          username: result.username,
          verified: true,
          id: result.id
        }
      }));
    } catch (err) {
      console.error('Twitter auth error:', err);
      setError('Failed to authenticate with Twitter. Please try again.');
    } finally {
      setIsAuthenticating(null);
    }
  };

  const handleDiscordAuth = async () => {
    try {
      setIsAuthenticating('discord');
      setError(null);
      
      // In a real app, this would redirect to Discord OAuth
      // For now, we'll simulate a successful auth
      const discordData = await initiateDiscordOAuth();
      
      setFormData(prev => ({
        ...prev,
        discord: {
          serverName: discordData.username,
          verified: true,
          inviteUrl: discordData.id
        },
      }));
    } catch (err) {
      console.error('Discord auth error:', err);
      setError('Failed to authenticate with Discord. Please try again.');
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
        id: ''
      }
    }));
  };

  const removeDiscordAuth = () => {
    setFormData(prev => ({
      ...prev,
      discord: {
        serverName: '',
        verified: false,
        inviteUrl: ''
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
      
      // Convert logo file to base64 data URL for metadata
      let logoDataUrl = null;
      if (logoFile) {
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoFile);
        });
      }

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
        discord: formData.discord.serverName
      };

      // Validate wallet address matches current extension wallet
      const cardano = (window as any).cardano;
      const connectedWallet = localStorage.getItem('connectedWallet');
      
      if (!cardano || !connectedWallet || !cardano[connectedWallet]) {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }
      
      const walletApi = await cardano[connectedWallet].enable();
      const currentAddresses = await walletApi.getUsedAddresses();
      
      if (currentAddresses.length === 0) {
        throw new Error('No addresses found in wallet. Please check your wallet connection.');
      }
      
      // Get current wallet address from extension
      const currentAddress = currentAddresses[0];
      
      // Compare with stored wallet address
      if (currentAddress !== walletAddress) {
        throw new Error('Wallet address mismatch detected. Please reconnect your wallet or switch back to the original address in your wallet extension.');
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
      toast.info('Payment submitted! Waiting for blockchain confirmation...');

      // Wait for transaction confirmation like job listings do
      try {
        const txStatus = await contractService.checkTransactionStatus(txHash);
        
        if (txStatus === 'confirmed') {
          // Save project to database only after payment confirmation
          const projectForStorage = {
            title: formData.name,
            name: formData.name,
            description: formData.description,
            website: formData.website,
            category: formData.category,
            logo: logoDataUrl,
            twitter: formData.twitter,
            discord: formData.discord,
            paymentAmount: totalCost.amount,
            paymentCurrency: formData.paymentMethod as 'BONE' | 'ADA',
            walletAddress: walletAddress!,
            txHash,
            status: 'confirmed' as const,
            createdAt: new Date().toISOString()
          };
          
          await ProjectService.addProject(projectForStorage);
          
          setPaymentStatus('success');
          toast.success(`Project created successfully! Payment confirmed. Transaction: ${txHash.substring(0, 8)}...`);
          
          // Navigate to projects page after a delay
          setTimeout(() => {
            navigate('/projects');
          }, 2000);
        } else {
          toast.error('Payment transaction failed to confirm. Please try again.');
          setPaymentStatus('error');
          setError('Payment transaction failed to confirm. Please try again.');
        }
      } catch (error) {
        console.error('Error verifying transaction:', error);
        toast.error('Payment submitted but confirmation failed. Please check your transaction.');
        setPaymentStatus('error');
        setError('Payment submitted but confirmation failed. Please check your transaction.');
      }
      
    } catch (err) {
      console.error('Error creating project:', err);
      setPaymentStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project. Please try again.';
      toast.error(errorMessage);
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
                  <div className="mt-1">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="e.g. BoneSwap"
                      required
                    />
                  </div>
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
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2 pr-16"
                        placeholder="Tell us about your project..."
                        required
                      />
                      <div className={`absolute bottom-2 right-2 text-xs ${formData.description.length >= 280 ? 'text-red-500' : 'text-gray-400'}`}>
                        {formData.description.length}/300
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Brief description of your project and its goals. {formData.description.length >= 280 && (
                      <span className="text-red-500">
                        {300 - formData.description.length} characters remaining
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
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      required
                    >
                      <option value="">Select a category</option>
                      {PROJECT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Project Website */}
                <div className="sm:col-span-6">
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <div className="mt-1">
                    <input
                      type="url"
                      name="website"
                      id="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twitter Verification {formData.twitter.verified && <span className="text-green-500 ml-1">✓</span>}
                    </label>
                    {formData.twitter.verified ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center">
                          <FaTwitter className="h-5 w-5 text-blue-400 mr-2" />
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
                          <FaTwitter className="w-5 h-5 mr-2 text-blue-400" />
                          {isAuthenticating === 'twitter' ? 'Connecting...' : 'Connect with Twitter'}
                        </button>
                        <p className="mt-1 text-xs text-gray-500">
                          We'll verify your Twitter account ownership
                        </p>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discord Verification {formData.discord.verified && <span className="text-green-500 ml-1">✓</span>}
                    </label>
                    {formData.discord.verified ? (
                      <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                        <div className="flex items-center">
                          <FaDiscord className="h-5 w-5 text-indigo-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            Connected as {formData.discord.serverName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={removeDiscordAuth}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                          disabled={isAuthenticating === 'discord'}
                        >
                          {isAuthenticating === 'discord' ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleDiscordAuth}
                          disabled={isAuthenticating === 'discord'}
                          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaDiscord className="w-5 h-5 mr-2 text-indigo-500" />
                          {isAuthenticating === 'discord' ? 'Connecting...' : 'Connect with Discord'}
                        </button>
                        <p className="mt-1 text-xs text-gray-500">
                          We'll verify your Discord account ownership
                        </p>
                      </>
                    )}
                  </div>
                </div>

                  </div>
                )}
                
                {currentStep === 2 && (
                  <div className="space-y-6">
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