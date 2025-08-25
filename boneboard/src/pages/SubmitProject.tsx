import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaRocket, FaUpload, FaCoins, FaLightbulb, FaUsers, FaCheckCircle, FaWallet, FaDiscord, FaTwitter } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import PageTransition from '../components/PageTransition';

interface ProjectFormData {
  title: string;
  description: string;
  category: string;
  fundingGoal: string;
  logo: File | null;
  benefits: string;
  whatItDoes: string;
  targetAudience: string;
  timeline: string;
  teamSize: string;
  fundingAddress: string;
  discordLink: string;
  twitterLink: string;
}

const SubmitProject: React.FC = () => {
  const { isConnected } = useWallet();
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    category: '',
    fundingGoal: '',
    logo: null,
    benefits: '',
    whatItDoes: '',
    targetAudience: '',
    timeline: '',
    teamSize: '',
    fundingAddress: '',
    discordLink: '',
    twitterLink: ''
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    'DeFi', 'NFT', 'Gaming', 'Infrastructure', 'Education', 
    'Social', 'Marketplace', 'Analytics', 'Wallet', 'Other'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        logo: file
      }));
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      alert('Please connect your wallet to submit a project');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    setSubmitted(true);
    
    // Reset form after successful submission
    setTimeout(() => {
      setFormData({
        title: '',
        description: '',
        category: '',
        fundingGoal: '',
        logo: null,
        benefits: '',
        whatItDoes: '',
        targetAudience: '',
        timeline: '',
        teamSize: '',
        fundingAddress: '',
        discordLink: '',
        twitterLink: ''
      });
      setLogoPreview(null);
      setSubmitted(false);
    }, 3000);
  };

  if (submitted) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-lg"
          >
            <FaCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Your project has been successfully submitted for review. The community will be able to view and fund your project once it's approved.
            </p>
            <div className="text-sm text-gray-500">
              Redirecting to funding page...
            </div>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center mb-4"
            >
              <div className="p-3 bg-blue-100 rounded-full mr-3">
                <FaRocket className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Submit Your Project</h1>
            </motion.div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Share your innovative Cardano project idea with the community and get the funding you need to bring it to life.
            </p>
          </div>

          {/* Connect Wallet Warning */}
          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 text-center"
            >
              <FaCoins className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Connect Your Wallet</h3>
              <p className="text-blue-700">
                You need to connect your wallet to submit a project for funding.
              </p>
            </motion.div>
          )}

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Project Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your project name"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Funding Goal */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Funding Goal (ADA) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">₳</span>
                    <input
                      type="number"
                      name="fundingGoal"
                      value={formData.fundingGoal}
                      onChange={handleInputChange}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="0"
                      min="1"
                      required
                    />
                  </div>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors cursor-pointer">
                        <FaUpload className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-600">
                          {formData.logo ? formData.logo.name : 'Choose logo file'}
                        </span>
                        <input
                          type="file"
                          onChange={handleLogoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                      </label>
                    </div>
                    {logoPreview && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Size */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Team Size
                  </label>
                  <input
                    type="text"
                    name="teamSize"
                    value={formData.teamSize}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., 3-5 developers, 1 designer"
                  />
                </div>

                {/* Timeline */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Development Timeline
                  </label>
                  <input
                    type="text"
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., 6 months, Q2 2024"
                  />
                </div>

                {/* Funding Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FaWallet className="inline h-4 w-4 mr-1 text-blue-600" />
                    Funding Address (ADA) *
                  </label>
                  <input
                    type="text"
                    name="fundingAddress"
                    value={formData.fundingAddress}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono text-sm"
                    placeholder="addr1..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cardano wallet address where funding will be sent
                  </p>
                </div>

                {/* Social Links */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700">Social Links (Optional)</h4>
                  
                  {/* Discord */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      <FaDiscord className="inline h-4 w-4 mr-1 text-blue-600" />
                      Discord Server
                    </label>
                    <input
                      type="url"
                      name="discordLink"
                      value={formData.discordLink}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="https://discord.gg/..."
                    />
                  </div>

                  {/* Twitter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      <FaTwitter className="inline h-4 w-4 mr-1 text-blue-600" />
                      Twitter/X Profile
                    </label>
                    <input
                      type="url"
                      name="twitterLink"
                      value={formData.twitterLink}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Project Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Project Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Provide a detailed description of your project..."
                    required
                  />
                </div>

                {/* What It Does */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FaLightbulb className="inline h-4 w-4 mr-1 text-blue-600" />
                    What It Does *
                  </label>
                  <textarea
                    name="whatItDoes"
                    value={formData.whatItDoes}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Explain the core functionality and features of your project..."
                    required
                  />
                </div>

                {/* Benefits */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FaCheckCircle className="inline h-4 w-4 mr-1 text-blue-600" />
                    What It Brings to the Ecosystem *
                  </label>
                  <textarea
                    name="benefits"
                    value={formData.benefits}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Describe the value and benefits your project brings to the Cardano ecosystem..."
                    required
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FaUsers className="inline h-4 w-4 mr-1 text-blue-600" />
                    Target Audience
                  </label>
                  <textarea
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Who will use your project? (e.g., DeFi users, NFT collectors, developers...)"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 text-center">
              <button
                type="submit"
                disabled={!isConnected || isSubmitting}
                className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 ${
                  !isConnected || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-1'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting Project...
                  </div>
                ) : (
                  'Submit Project for Funding'
                )}
              </button>
              
              {!isConnected && (
                <p className="text-sm text-gray-500 mt-2">
                  Connect your wallet to submit your project
                </p>
              )}
            </div>
          </motion.form>
        </div>
      </div>
    </PageTransition>
  );
};

export default SubmitProject;
