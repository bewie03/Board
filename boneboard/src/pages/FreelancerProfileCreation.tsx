import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { toast } from 'react-toastify';
import PageTransition from '../components/PageTransition';
import { FaPlus, FaTrash, FaArrowLeft, FaWallet } from 'react-icons/fa';
import { contractService, FreelancerProfileData as ContractFreelancerData } from '../services/contractService';

interface ServicePackage {
  name: string;
  description: string;
  price: number;
  deliveryDays: number;
  features: string[];
}

interface FreelancerProfileData {
  name: string;
  title: string;
  bio: string;
  location: string;
  category: string;
  skills: string[];
  languages: string[];
  packages: ServicePackage[];
  workExamples: string[];
  walletAddress: string;
  profileImage?: string;
}

const FreelancerProfileCreation: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress, isConnected } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileData, setProfileData] = useState<FreelancerProfileData>({
    name: '',
    title: '',
    bio: '',
    location: '',
    category: '',
    skills: [],
    languages: ['English'],
    packages: [
      { name: '', description: '', price: 0, deliveryDays: 7, features: [''] },
      { name: '', description: '', price: 0, deliveryDays: 14, features: [''] },
      { name: '', description: '', price: 0, deliveryDays: 21, features: [''] }
    ],
    workExamples: [],
    walletAddress: walletAddress || '',
    profileImage: undefined
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'Web Development',
    'Mobile Development',
    'Blockchain Development',
    'Design',
    'Marketing',
    'Content Writing',
    'Consulting',
    'Other'
  ];

  const mainLanguages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Russian',
    'Chinese',
    'Japanese',
    'Korean',
    'Arabic',
    'Hindi',
    'Dutch',
    'Swedish',
    'Norwegian',
    'Danish',
    'Finnish',
    'Polish',
    'Czech',
    'Hungarian',
    'Romanian',
    'Bulgarian',
    'Greek',
    'Turkish',
    'Hebrew',
    'Thai',
    'Vietnamese',
    'Indonesian',
    'Malay',
    'Tagalog'
  ];

  const handleInputChange = (field: keyof FreelancerProfileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (currentSkill.trim() && !profileData.skills.includes(currentSkill.trim()) && profileData.skills.length < 10) {
      setProfileData(prev => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()]
      }));
      setCurrentSkill('');
    }
  };

  const removeSkill = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const addLanguage = (language: string) => {
    if (!profileData.languages.includes(language)) {
      setProfileData(prev => ({
        ...prev,
        languages: [...prev.languages, language]
      }));
    }
    setShowLanguageDropdown(false);
  };

  const removeLanguage = (index: number) => {
    if (profileData.languages.length > 1) {
      setProfileData(prev => ({
        ...prev,
        languages: prev.languages.filter((_, i) => i !== index)
      }));
    }
  };

  // Package functions removed since packages section is commented out

  // Handle profile image upload
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file, 400, 0.8);
        setProfileData(prev => ({
          ...prev,
          profileImage: compressedImage
        }));
        toast.success('Profile image uploaded successfully!');
      } catch (error) {
        console.error('Error compressing profile image:', error);
        toast.error('Failed to process profile image. Please try again.');
      }
    }
  };

  // Helper function to compress images
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 6 - profileData.workExamples.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      
      if (files.length > remainingSlots) {
        toast.warning(`Only ${remainingSlots} more images can be added. Maximum 6 work examples allowed.`);
      }
      
      // Process files with compression
      for (const file of filesToProcess) {
        try {
          const compressedImage = await compressImage(file);
          setProfileData(prev => ({
            ...prev,
            workExamples: [...prev.workExamples, compressedImage]
          }));
        } catch (error) {
          console.error('Error compressing image:', error);
          toast.error('Failed to process image. Please try again.');
        }
      }
    }
  };

  const removeWorkExample = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      workExamples: prev.workExamples.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!profileData.title.trim()) {
      toast.error('Professional title is required');
      return false;
    }
    if (!profileData.bio.trim()) {
      toast.error('Bio is required');
      return false;
    }
    if (!profileData.category) {
      toast.error('Category is required');
      return false;
    }
    if (profileData.skills.length === 0) {
      toast.error('At least one skill is required');
      return false;
    }
    // Package validation removed - they can edit packages later on profile
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setShowPayment(true);
  };

  const handlePayment = async (paymentMethod: 'ADA' | 'BONE') => {
    setIsLoading(true);
    
    try {
      // Get wallet API
      const cardano = (window as any).cardano;
      const connectedWallet = localStorage.getItem('connectedWallet');
      if (!cardano || !connectedWallet || !cardano[connectedWallet]) {
        throw new Error('Wallet not connected');
      }
      
      const walletApi = await cardano[connectedWallet].enable();
      await contractService.initializeLucid(walletApi);
      
      // Prepare freelancer data for blockchain
      const freelancerData: ContractFreelancerData = {
        name: profileData.name,
        title: profileData.title,
        description: profileData.bio,
        skills: profileData.skills,
        experience: profileData.category,
        contactEmail: '', // Add if needed
        walletAddress: walletAddress!,
        paymentAmount: 2, // 2 ADA like job listings
        paymentCurrency: paymentMethod,
        timestamp: Date.now(),
        website: '',
        twitter: '',
        discord: ''
      };
      
      // Process payment through contract service
      const result = paymentMethod === 'ADA'
        ? await contractService.postFreelancerWithADA(freelancerData)
        : await contractService.postFreelancerWithBONE(freelancerData);
      
      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }
      
      const txHash = result.txHash!;
      toast.info('Payment submitted! Waiting for blockchain confirmation...');

      // Wait for transaction confirmation like job listings do
      try {
        const txStatus = await contractService.checkTransactionStatus(txHash);
        
        if (txStatus === 'confirmed') {
          // Save profile only after payment confirmation
          const profilePayload = {
            name: profileData.name,
            title: profileData.title,
            bio: profileData.bio,
            location: profileData.location,
            category: profileData.category,
            skills: profileData.skills,
            languages: profileData.languages,
            workExamples: profileData.workExamples,
            profileImage: profileData.profileImage,
            walletAddress: walletAddress,
            paymentMethod,
            paymentAmount: 2, // 2 ADA like job listings
            txHash: txHash,
            packages: []
          };
          
          // Save profile to database via API
          const response = await fetch('/api/freelancers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(profilePayload)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          await response.json();
          
          toast.success(`Freelancer profile created successfully! Payment confirmed. Transaction: ${txHash.substring(0, 8)}...`);
          navigate('/freelancers');
        } else {
          toast.error('Payment transaction failed to confirm. Please try again.');
          throw new Error('Payment transaction failed to confirm.');
        }
      } catch (error) {
        console.error('Error verifying transaction:', error);
        toast.error('Payment submitted but confirmation failed. Please check your transaction.');
        throw new Error('Payment submitted but confirmation failed.');
      }
    } catch (error: any) {
      console.error('Error creating profile:', error);
      
      // Show the specific error message from contract service
      const errorMessage = error.message || 'Failed to create profile. Please try again.';
      
      // Show more specific error message for known issues
      if (errorMessage.includes('HTTP error! status: 500')) {
        toast.error('Server error. Please check the console for details.');
      } else if (errorMessage.includes('HTTP error! status: 413')) {
        toast.error('Images too large. Please try smaller images.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      setShowPayment(false);
    }
  };

  if (!isConnected) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Wallet Connection Required</h2>
            <p className="text-gray-600 mb-6">Please connect your wallet to create a freelancer profile.</p>
            <button
              onClick={() => navigate('/freelancers')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Freelancers
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
          {/* Back Button */}
          <button
            onClick={() => navigate('/freelancers')}
            className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back to Freelancers
          </button>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
            <div className="bg-white border-b border-gray-100 px-6 py-5 sm:px-8">
              <h1 className="text-2xl font-bold text-gray-900">Create Freelancer Profile</h1>
              <p className="mt-1.5 text-gray-500">Set up your professional profile to start offering services</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                {/* Profile Image */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="h-20 w-20 rounded-full border-2 border-gray-300 overflow-hidden bg-gray-100 flex items-center justify-center">
                      {profileData.profileImage ? (
                        <img 
                          src={profileData.profileImage} 
                          alt="Profile" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">No Image</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={profileImageInputRef}
                        onChange={handleProfileImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => profileImageInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upload Photo
                      </button>
                      <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Cardano Smart Contract Developer"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell clients about your experience and expertise..."
                  />
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={profileData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    </select>
                  </div>
                </div>

              {/* Skills */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills (Max 10)</h2>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={currentSkill}
                    onChange={(e) => setCurrentSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Add a skill (${profileData.skills.length}/10)`}
                    disabled={profileData.skills.length >= 10}
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    disabled={profileData.skills.length >= 10}
                    className={`px-4 py-2 rounded-lg ${profileData.skills.length >= 10 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                  >
                    <FaPlus />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Languages</h2>
                <div className="relative mb-4">
                  <button
                    type="button"
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
                  >
                    <span className="text-gray-500">Add a language...</span>
                    <FaPlus className="text-gray-400" />
                  </button>
                  
                  {showLanguageDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {mainLanguages
                        .filter(lang => !profileData.languages.includes(lang))
                        .map(language => (
                        <button
                          key={language}
                          type="button"
                          onClick={() => addLanguage(language)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                          {language}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileData.languages.map((language, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {language}
                      {profileData.languages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLanguage(index)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Service Packages - Removed, can be edited later on profile */}
              {/* <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Packages (Up to 3)</h2>
                <div className="space-y-6">
                  {profileData.packages.map((pkg, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6">
                      <h3 className="font-medium text-gray-900 mb-4">
                        Package {index + 1} {index === 0 ? '(Basic)' : index === 1 ? '(Standard)' : '(Premium)'}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Package Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={pkg.name}
                            onChange={(e) => updatePackage(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Basic Smart Contract"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Price (ADA) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={pkg.price}
                              onChange={(e) => updatePackage(index, 'price', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Delivery (Days) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={pkg.deliveryDays}
                              onChange={(e) => updatePackage(index, 'deliveryDays', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="7"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={pkg.description}
                          onChange={(e) => updatePackage(index, 'description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Describe what's included in this package..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                        <div className="space-y-2">
                          {pkg.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex gap-2">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => updatePackageFeature(index, featureIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Feature description"
                              />
                              {pkg.features.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removePackageFeature(index, featureIndex)}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addPackageFeature(index)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            + Add Feature
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div> */}

              {/* Work Examples */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Examples (Optional - Max 6)</h2>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={profileData.workExamples.length >= 6}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={profileData.workExamples.length >= 6}
                    className={`${profileData.workExamples.length >= 6 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                  >
                    {profileData.workExamples.length >= 6 ? 'Maximum 6 images reached' : 'Click to upload work examples'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 5MB each - images will be compressed ({profileData.workExamples.length}/6)</p>
                </div>
                
                {profileData.workExamples.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {profileData.workExamples.map((example, index) => (
                      <div key={index} className="relative">
                        <img
                          src={example}
                          alt={`Work example ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeWorkExample(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating Profile...' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Payment</h3>
            <p className="text-gray-600 mb-6">
              Choose your payment method to create your freelancer profile:
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => handlePayment('ADA')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center">
                  <FaWallet className="text-blue-600 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Pay with ADA</div>
                    <div className="text-sm text-gray-500">Cardano native token</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">2 ADA</div>
                </div>
              </button>

              <button
                onClick={() => handlePayment('BONE')}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center">
                  <FaWallet className="text-purple-600 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Pay with BONE</div>
                    <div className="text-sm text-gray-500">BoneBoard token</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">2 BONE</div>
                </div>
              </button>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowPayment(false)}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {isLoading && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Processing payment...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default FreelancerProfileCreation;
