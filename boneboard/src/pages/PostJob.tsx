import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaTimes, FaWallet, FaUpload } from 'react-icons/fa';
import Modal from '../components/Modal';
import JobDetailPreview from '../components/JobDetailPreview';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../contexts/WalletContext';
import { toast } from 'react-toastify';
import { ProjectService, Project } from '../services/projectService';
import PageTransition from '../components/PageTransition';

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, walletAddress, formatAddress } = useWallet();
  const { isLoading: contractLoading, postJob } = useContract();
  const [currentStep, setCurrentStep] = useState(1);
  // Job categories for Cardano ecosystem
  const JOB_CATEGORIES = [
    { id: 'development', name: 'Development' },
    { id: 'design', name: 'Design & Creative' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'community', name: 'Community & Social' },
    { id: 'business', name: 'Business Development' },
    { id: 'content', name: 'Content Creation' },
    { id: 'defi', name: 'DeFi & Finance' },
    { id: 'nft', name: 'NFT & Digital Assets' },
    { id: 'security', name: 'Security & Auditing' },
    { id: 'research', name: 'Research & Analysis' },
  ];

  const JOB_TYPES = [
    { id: 'Full-time', name: 'Full-time' },
    { id: 'Part-time', name: 'Part-time' },
    { id: 'Contract', name: 'Contract' },
    { id: 'Internship', name: 'Internship' },
  ];

  // Get user's projects from ProjectService
  const [userProjects, setUserProjects] = useState<Project[]>([]);

  useEffect(() => {
    const loadUserProjects = async () => {
      if (isConnected && walletAddress) {
        try {
          const projects = await ProjectService.getProjectsByWallet(walletAddress);
          setUserProjects(projects);
        } catch (error) {
          console.error('Error loading user projects:', error);
          setUserProjects([]);
        }
      } else {
        setUserProjects([]);
      }
    };
    loadUserProjects();
  }, [isConnected, walletAddress]);
  
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // Job Details
    title: '',
    company: '',
    type: 'Full-time',
    category: 'development',
    salary: '',
    salaryType: 'ADA' as 'ADA' | 'fiat' | 'custom',
    customPaymentType: '',
    description: '',
    requiredSkills: [] as string[],
    additionalInfo: [] as string[],
    workArrangement: 'remote' as 'remote' | 'hybrid' | 'onsite',
    
    // Form specific fields
    companyWebsite: '',
    companyLogo: null as string | null,
    contactEmail: '',
    website: '',
    twitter: '',
    discord: '',
    howToApply: '',
    listingDuration: 1,
    paymentMethod: 'BONE' as 'BONE' | 'ADA',
    agreeToTerms: false,
    featured: false,
  });
  
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [platformPricing, setPlatformPricing] = useState<{jobListingFee: number, jobListingFeeAda: number, jobListingCurrency: string} | null>(null);

  // Load platform pricing on component mount
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const response = await fetch('/api/admin?type=settings');
        if (response.ok) {
          const data = await response.json();
          setPlatformPricing({
            jobListingFee: data.jobListingFee,
            jobListingFeeAda: data.jobListingFeeAda,
            jobListingCurrency: data.jobListingCurrency
          });
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
        // Set default pricing if API fails
        setPlatformPricing({
          jobListingFee: 250,
          jobListingFeeAda: 25,
          jobListingCurrency: 'ADA'
        });
      }
    };
    loadPricing();
  }, []);
  
  // Calculate total price based on admin settings
  const calculateTotal = () => {
    if (!platformPricing) {
      return {
        amount: 25,
        displayText: '25 ADA (Loading...)',
        currency: 'ADA',
        baseAmount: 25,
        durationDiscount: 0,
        projectDiscount: 0,
        featuredCost: 0
      };
    }

    // Get base price based on payment method
    const basePrice = formData.paymentMethod === 'BONE' 
      ? platformPricing.jobListingFee 
      : platformPricing.jobListingFeeAda;
    
    const currency = formData.paymentMethod;
    
    // Calculate duration pricing
    const durationMultiplier = getDurationMultiplier(formData.listingDuration);
    let priceAfterDuration = basePrice * durationMultiplier;
    const durationDiscount = basePrice * formData.listingDuration - priceAfterDuration;
    
    // Calculate featured cost (+50% of base after duration)
    const featuredCost = formData.featured ? priceAfterDuration * 0.5 : 0;
    let priceAfterFeatured = priceAfterDuration + featuredCost;
    
    // Calculate project discount (20% off final price)
    const projectDiscount = selectedProject ? priceAfterFeatured * 0.2 : 0;
    const finalPrice = priceAfterFeatured - projectDiscount;
    
    // Round to reasonable precision
    const roundedPrice = Math.round(finalPrice * 100) / 100;
    
    let displayText = `${roundedPrice} ${currency}`;
    
    // Add discount indicators
    if (selectedProject && formData.listingDuration > 1) {
      displayText += ` (20% project + ${getDurationDiscount(formData.listingDuration)}% duration discount)`;
    } else if (selectedProject) {
      displayText += ` (20% project discount)`;
    } else if (formData.listingDuration > 1) {
      displayText += ` (${getDurationDiscount(formData.listingDuration)}% duration discount)`;
    }
    
    return {
      amount: roundedPrice,
      displayText,
      currency: currency,
      baseAmount: Math.round((basePrice * formData.listingDuration) * 100) / 100,
      durationDiscount: Math.round(durationDiscount * 100) / 100,
      projectDiscount: Math.round(projectDiscount * 100) / 100,
      featuredCost: Math.round(featuredCost * 100) / 100
    };
  };
  
  // Duration multipliers with progressive discounts
  const getDurationMultiplier = (months: number) => {
    const discounts = {
      1: 1.0,    // Base price
      2: 1.9,    // 5% discount
      3: 2.7,    // 10% discount  
      6: 5.1,    // 15% discount
      12: 9.6    // 20% discount
    };
    return discounts[months as keyof typeof discounts] || months;
  };
  
  // Get discount percentage for display
  const getDurationDiscount = (months: number) => {
    const discounts = { 1: 0, 2: 5, 3: 10, 6: 15, 12: 20 };
    return discounts[months as keyof typeof discounts] || 0;
  };
  
  const totalCost = calculateTotal();
  
  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value || null;
    setSelectedProject(projectId);
    
    if (projectId) {
      const project = userProjects.find(p => p.id === projectId);
      if (project) {
        setFormData(prev => ({
          ...prev,
          company: project.name || '',
          companyWebsite: project.website || '',
          website: project.website || '',
          twitter: typeof project.twitter === 'object' ? project.twitter.username || '' : project.twitter || '',
          discord: typeof project.discord === 'object' ? project.discord.inviteUrl || '' : project.discord || '',
          companyLogo: project.logo || '',
        }));
      }
    } else {
      // Clear company info if no project selected
      setFormData(prev => ({
        ...prev,
        company: '',
        companyWebsite: '',
        website: '',
        twitter: '',
        discord: '',
        companyLogo: '',
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };


  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 2) {
      setCurrentStep(2);
      return;
    }
    
    // Validate wallet connection
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet to post a job');
      return;
    }
    
    // Validate form data
    if (!formData.title.trim() || !formData.company.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Validate required text areas
    if (!formData.description.trim()) {
      toast.error('Job description is required');
      return;
    }
    
    if (!formData.howToApply.trim()) {
      toast.error('Please specify how to apply');
      return;
    }
    
    if (!formData.agreeToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }
    
    setPaymentStatus('processing');
    
    try {
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
      
      // Prepare job data for smart contract
      const jobData = {
        title: formData.title,
        company: formData.company,
        description: formData.description,
        salary: formData.salary,
        salaryType: formData.salaryType,
        category: formData.category,
        type: formData.type,
        contactEmail: formData.contactEmail,
        howToApply: formData.howToApply,
        duration: formData.listingDuration,
        paymentAmount: totalCost.amount,
        paymentCurrency: formData.paymentMethod,
        workArrangement: formData.workArrangement,
        requiredSkills: formData.requiredSkills,
        additionalInfo: formData.additionalInfo,
        companyWebsite: formData.companyWebsite,
        companyLogo: formData.companyLogo,
        website: formData.website,
        twitter: formData.twitter,
        discord: formData.discord,
        walletAddress: walletAddress,
        timestamp: Date.now(),
        status: 'pending' as const,
        featured: formData.featured
      };
      
      // Post job using smart contract
      const success = await postJob(jobData);
      
      if (success) {
        setPaymentStatus('success');
        // Navigate to jobs page after a delay
        setTimeout(() => {
          navigate('/jobs');
        }, 2000);
      } else {
        setPaymentStatus('error');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStatus('error');
      toast.error('Failed to post job. Please try again.');
    }
  };



  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Form */}
            <div className="lg:w-2/3">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <FaArrowLeft className="mr-2" />
            Back to Jobs
          </button>
          <h1 className="mt-2 text-3xl font-extrabold text-gray-900">Post a Job</h1>
          <p className="mt-2 text-sm text-gray-600">
            Reach thousands of qualified candidates in the Cardano ecosystem
          </p>
          
          {/* Project Selection Dropdown */}
          <div className="mb-6">
            <div className="space-y-1">
              <label htmlFor="project" className="block text-sm font-medium text-gray-700">
                Select Your Project (Optional)
              </label>
              <p className="text-xs text-gray-500">
                Select one of your projects to apply a 20% discount
              </p>
            </div>
            <div className="mt-1">
              <select
                id="project"
                name="project"
                className="w-full h-[42px] pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] appearance-none cursor-pointer"
                style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")'
                }}
                value={selectedProject || ''}
                onChange={handleProjectSelect}
              >
                <option value="">-- Select a project --</option>
                {userProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name || project.title}
                  </option>
                ))}
              </select>
            </div>
            {selectedProject ? (
              <p className="mt-2 text-sm text-green-600">
                20% discount applied for project listings!
              </p>
            ) : userProjects.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                You don't have any projects yet. <Link to="/my-projects" className="text-blue-600 hover:text-blue-500">Create a project</Link> to get a 20% discount on job postings.
              </p>
            ) : null}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            {currentStep === 1 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Job Details</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Fill in the details of your job posting
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Job Title */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      maxLength={35}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Senior Cardano Developer"
                      required
                    />
                  </div>
                  
                  {/* Company and Work Arrangement */}
                  <div className="space-y-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Company *
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      maxLength={40}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Work Arrangement *
                    </label>
                    <select
                      name="workArrangement"
                      value={formData.workArrangement}
                      onChange={handleChange}
                      className="w-full h-[42px] pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] appearance-none cursor-pointer"
                      style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")'
                      }}
                      required
                    >
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </div>

                  {/* Job Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Job Type *
                    </label>
                    <div className="relative">
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full h-[42px] pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] appearance-none cursor-pointer"
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")'
                        }}
                        required
                      >
                        {JOB_TYPES.map((jobType) => (
                          <option key={jobType.id} value={jobType.id}>
                            {jobType.name}
                          </option>
                        ))}
                      </select>

                    </div>
                  </div>

                  {/* Job Category */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Job Category *
                    </label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full h-[42px] pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] appearance-none cursor-pointer"
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")'
                        }}
                        required
                      >
                        {JOB_CATEGORIES.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Salary and Payment Type */}
                  <div className="space-y-2 sm:col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Salary *
                        </label>
                        <input
                          type="text"
                          name="salary"
                          value={formData.salary}
                          onChange={handleChange}
                          maxLength={18}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g. $80k-90k USD"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Payment Type *
                        </label>
                        <select
                          name="salaryType"
                          value={formData.salaryType}
                          onChange={handleChange}
                          className="w-full h-[42px] pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] appearance-none cursor-pointer"
                          style={{
                            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")'
                          }}
                          required
                        >
                          <option value="ADA">ADA</option>
                          <option value="fiat">Fiat</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Custom Payment Type Input */}
                    {formData.salaryType === 'custom' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Custom Payment Type *
                        </label>
                        <input
                          type="text"
                          name="customPaymentType"
                          value={formData.customPaymentType}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g. USDC, Bitcoin, Ethereum, etc."
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Company Logo Upload - Only show when no project selected */}
                  {!selectedProject && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Company Logo (Optional)
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                          <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="company-logo-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                            >
                              <span>Upload a file</span>
                              <input
                                id="company-logo-upload"
                                name="companyLogo"
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setFormData(prev => ({
                                        ...prev,
                                        companyLogo: event.target?.result as string
                                      }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 2MB
                          </p>
                        </div>
                      </div>
                      {formData.companyLogo && (
                        <div className="mt-2 flex items-center">
                          <img
                            src={formData.companyLogo}
                            alt="Company logo preview"
                            className="h-16 w-16 rounded-full object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, companyLogo: null }))}
                            className="ml-3 text-sm text-red-600 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Website Link */}
                  <div className="space-y-2 sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Website (Optional)
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">https://</span>
                      </div>
                      <input
                        type="text"
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        maxLength={50}
                        className="pl-16 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="example.com"
                      />
                    </div>
                  </div>

                  {/* Social Media Links */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:col-span-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Twitter (Optional)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">@</span>
                        </div>
                        <input
                          type="text"
                          name="twitter"
                          value={formData.twitter}
                          onChange={handleChange}
                          maxLength={30}
                          className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="username"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Discord Server Invite (Optional)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="url"
                          name="discord"
                          value={formData.discord}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://discord.gg/invite-code"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Email - Will be moved to the bottom later */}

                  {/* Job Description */}
                  <div className="space-y-2 sm:col-span-2 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">
                        Job Description *
                      </label>
                      <span className="text-xs text-gray-500">
                        {formData.description.length}/300 characters
                      </span>
                    </div>
                    <textarea
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      maxLength={300}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Provide a detailed description of the job role, responsibilities and any other relevant details that would help candidates understand the position."
                      required
                    />
                  </div>
                  
                  {/* Required Skills */}
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">
                        Required Skills *
                      </label>
                      <span className="text-xs text-gray-500">
                        {formData.requiredSkills.length}/5 skills added
                      </span>
                    </div>
                    <div className="space-y-2">
                      {formData.requiredSkills.map((skill, index) => (
                        <div key={index} className="flex items-center">
                          <input
                            type="text"
                            value={skill}
                            onChange={(e) => {
                              if (e.target.value.length <= 25) {
                                const newSkills = [...formData.requiredSkills];
                                newSkills[index] = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  requiredSkills: newSkills
                                }));
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Skill ${index + 1} (max 25 chars)`}
                            maxLength={25}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newSkills = formData.requiredSkills.filter((_, i) => i !== index);
                              setFormData(prev => ({
                                ...prev,
                                requiredSkills: newSkills
                              }));
                            }}
                            className="ml-2 text-red-500 hover:text-red-700"
                            aria-label="Remove skill"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.requiredSkills.length < 5) {
                            setFormData(prev => ({
                              ...prev,
                              requiredSkills: [...prev.requiredSkills, '']
                            }));
                          }
                        }}
                        disabled={formData.requiredSkills.length >= 5}
                        className={`mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md ${
                          formData.requiredSkills.length >= 5 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        }`}
                      >
                        {formData.requiredSkills.length >= 5 
                          ? 'Maximum 5 skills reached' 
                          : '+ Add Skill'}
                      </button>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">
                        Additional Information
                      </label>
                      <span className="text-xs text-gray-500">
                        {formData.additionalInfo.join('\n').length}/300 characters
                      </span>
                    </div>
                    <div className="relative">
                      <textarea
                        name="additionalInfo"
                        rows={4}
                        value={formData.additionalInfo.join('\n')}
                        onChange={(e) => {
                          if (e.target.value.length <= 300) {
                            const lines = e.target.value.split('\n');
                            setFormData(prev => ({
                              ...prev,
                              additionalInfo: lines
                            }));
                          }
                        }}
                        maxLength={300}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter any additional information about the job, benefits, or company culture. Each new line will be treated as a separate point."
                      />
                      {formData.additionalInfo.join('\n').length >= 270 && (
                        <div className={`text-xs mt-1 text-right ${
                          formData.additionalInfo.join('\n').length >= 300 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {300 - formData.additionalInfo.join('\n').length} characters remaining
                        </div>
                      )}
                    </div>
                  </div>

                  {/* How to Apply */}
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">
                        How to Apply *
                      </label>
                      <span className="text-xs text-gray-500">
                        {formData.howToApply.length}/300 characters
                      </span>
                    </div>
                    <div className="bg-gray-50 border border-gray-300 rounded-md p-3">
                      <textarea
                        name="howToApply"
                        rows={3}
                        value={formData.howToApply}
                        onChange={handleChange}
                        maxLength={300}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Enter application instructions, URL, or email address where applicants should send their applications"
                        required
                      />
                    </div>
                  </div>
                    
                  {/* Contact Email */}
                  <div className="space-y-2 sm:col-span-2 pt-2 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      maxLength={50}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This email will be shown to applicants for job-related inquiries.
                    </p>
                  </div>


                </div>

                {/* Duration and Payment Method */}
                <div className="space-y-4 pt-4 border-t border-gray-200 sm:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900">Listing Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Duration */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Listing Duration *
                      </label>
                      <select
                        name="listingDuration"
                        value={formData.listingDuration}
                        onChange={handleChange}
                        className="w-full h-[42px] pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] appearance-none cursor-pointer"
                      style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")'
                      }}
                        required
                      >
                        <option value={1}>1 Month - Base Price</option>
                        <option value={2}>2 Months - 5% Discount</option>
                        <option value={3}>3 Months - 10% Discount</option>
                        <option value={6}>6 Months - 15% Discount</option>
                        <option value={12}>12 Months - 20% Discount</option>
                      </select>
                    </div>
                    
                    {/* Payment Method */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Payment Method *
                      </label>
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        className="w-full h-[42px] pl-4 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] appearance-none cursor-pointer"
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")'
                        }}
                        required
                      >
                        <option value="BONE">Pay with BONE</option>
                        <option value="ADA">Pay with ADA</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        You'll need to connect your Cardano wallet to pay with {formData.paymentMethod === 'ADA' ? 'ADA' : 'BONE tokens'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Total Cost */}
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Cost:</span>
                      <span className="text-lg font-bold text-blue-700">
                        {totalCost.displayText}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Your job will be live for {formData.listingDuration} month and will require payment confirmation on the Cardano blockchain.
                    </p>
                  </div>
                  
                  {/* Featured Job Option */}
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="featured"
                          name="featured"
                          type="checkbox"
                          checked={formData.featured}
                          onChange={handleChange}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="featured" className="font-medium text-gray-700 cursor-pointer">
                          ★ Feature this job listing (+50% cost)
                        </label>
                        <p className="text-gray-600 mt-1">
                          Featured jobs appear at the top of search results and get highlighted styling for maximum visibility.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Terms and Conditions */}
                  <div className="flex items-start">
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
                        I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-blue-600 hover:text-blue-500 focus:outline-none">Terms of Service</button> and <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-600 hover:text-blue-500 focus:outline-none">Privacy Policy</button> *
                      </label>
                      <p className="text-gray-500">
                        By checking this box, you confirm that the information provided is accurate and you agree to our terms.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="pt-5 border-t border-gray-200 sm:col-span-2">
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!formData.agreeToTerms || contractLoading || paymentStatus === 'processing'}
                    >
                      {contractLoading || paymentStatus === 'processing' ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Continue to Payment'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {currentStep === 2 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {paymentStatus === 'idle' && (
                  <>
                    {/* Job Summary */}
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Job Summary</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Job Title:</span>
                          <span className="font-medium">{formData.title}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Category:</span>
                          <span className="font-medium">{formData.category}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium">{formData.listingDuration} {formData.listingDuration === 1 ? 'Month' : 'Months'}</span>
                        </div>
                        {formData.featured && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Featured:</span>
                            <span className="font-medium text-blue-600">★ Yes</span>
                          </div>
                        )}
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
                              <span className="text-gray-600">Base Job Listing Fee</span>
                              <span>{totalCost.baseAmount} {formData.paymentMethod === 'ADA' ? '₳' : 'BONE'}</span>
                            </div>
                            {totalCost.durationDiscount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Duration Discount ({formData.listingDuration} months)</span>
                                <span>-{totalCost.durationDiscount} {formData.paymentMethod === 'ADA' ? '₳' : 'BONE'}</span>
                              </div>
                            )}
                            {totalCost.projectDiscount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Project Discount</span>
                                <span>-{totalCost.projectDiscount} {formData.paymentMethod === 'ADA' ? '₳' : 'BONE'}</span>
                              </div>
                            )}
                            {totalCost.featuredCost > 0 && (
                              <div className="flex justify-between text-blue-600">
                                <span>Featured Listing (+50%)</span>
                                <span>+{totalCost.featuredCost} {formData.paymentMethod === 'ADA' ? '₳' : 'BONE'}</span>
                              </div>
                            )}
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
                      Your job posting has been submitted and is now live on BoneBoard.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => navigate('/jobs')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        View Job Posting
                      </button>
                    </div>
                  </div>
                )}

                {paymentStatus === 'error' && (
                  <div className="text-center py-12">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h3 className="mt-3 text-lg font-medium text-gray-900">Payment Failed</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      There was an error processing your payment. Please try again or contact support.
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
          </div>
          </div>
          </div>
          
          {/* Preview Section */}
          <div className="lg:w-1/2">
            <div className="sticky top-8 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Job Preview</h2>
              
              {/* Full Job Detail Preview */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <JobDetailPreview
                  title={formData.title || 'Job Title'}
                  company={formData.company || 'Company Name'}
                  type={formData.type}
                  category={formData.category}
                  workArrangement={formData.workArrangement}
                  salary={formData.salary}
                  salaryType={formData.salaryType}
                  customPaymentType={formData.customPaymentType}
                  logo={formData.companyLogo || undefined}
                  description={formData.description}
                  requiredSkills={formData.requiredSkills}
                  additionalInfo={formData.additionalInfo}
                  howToApply={formData.howToApply}
                  website={formData.website}
                  twitter={formData.twitter}
                  discord={formData.discord}
                  contactEmail={formData.contactEmail}
                />
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Terms of Service Modal */}
<Modal 
        isOpen={showTerms} 
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
      >
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
          <section className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">1</span>
              Acceptance of Terms
            </h3>
            <p className="text-gray-700 pl-8">
              By accessing and using BoneBoard, you accept and agree to be bound by these Terms of Service, including the use of Cardano blockchain and smart contracts for all transactions. If you do not agree, please do not use our platform.
            </p>
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
              <li>Distributing malware, viruses, or harmful code</li>
              <li>Engaging in any form of discrimination or hate speech</li>
            </ul>
          </section>
          
          <section className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
              Job Postings and Listings
            </h3>
            <ul className="list-disc pl-12 space-y-2 text-gray-700">
              <li>All job postings must be accurate and not misleading</li>
              <li>You must have the legal right to post the job listing</li>
              <li>Compensation details must be clearly stated in ADA or other Cardano native tokens</li>
              <li>Payment terms must comply with the smart contract requirements</li>
              <li>Discriminatory hiring practices are strictly prohibited</li>
            </ul>
          </section>
        </div>
      </Modal>

      {/* Privacy Policy Modal */}
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
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-12 space-y-2 text-gray-700">
              <li>Account information (name, email, etc.)</li>
              <li>Job listing details</li>
              <li>Cardano wallet addresses and transaction history</li>
              <li>Smart contract interaction data</li>
              <li>Communications with other users</li>
            </ul>
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
              <li>Process transactions through Cardano blockchain</li>
              <li>Execute and enforce smart contract terms</li>
              <li>Send you transaction confirmations and blockchain events</li>
              <li>Provide customer support for blockchain-related issues</li>
            </ul>
          </section>
          
          <section className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
              Information Sharing
            </h3>
            <p className="text-gray-700 pl-8">
              We do not share your personal information with third parties except as described in this policy. We may share information with:
            </p>
            <ul className="list-disc pl-12 space-y-2 text-gray-700">
              <li>Cardano node operators and blockchain validators (as required for transaction processing)</li>
              <li>Law enforcement or other government officials, in response to a verified request and in compliance with applicable laws</li>
              <li>Smart contract auditors and security researchers (on an as-needed basis)</li>
              <li>Other parties in connection with a company transaction, such as a merger or sale, while maintaining blockchain data immutability</li>
            </ul>
          </section>
        </div>
      </Modal>
      </div>
    </PageTransition>
  );
};

export default PostJob;
