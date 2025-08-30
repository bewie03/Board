import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaInfoCircle } from 'react-icons/fa';
import CustomSelect from '../components/CustomSelect';
import { PROJECT_CATEGORIES } from '../constants/categories';
import { useWallet } from '../contexts/WalletContext';
import { fundingService, CreateFundingData } from '../services/fundingService';
import { toast } from 'react-toastify';

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
  const [creating, setCreating] = useState(false);
  
  const [formData, setFormData] = useState<CreateFundingData>({
    project_id: '',
    funding_goal: 0,
    funding_deadline: '',
    wallet_address: '',
    funding_purpose: ''
  });

  useEffect(() => {
    if (!isConnected) {
      toast.error('Please connect your wallet to create funding');
      navigate('/funding');
      return;
    }
    fetchUserProjects();
  }, [isConnected, walletAddress]);

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
        const userOwnedProjects = data.filter((project: any) => 
          project.user_wallet === walletAddress && !project.has_active_funding
        );
        setUserProjects(userOwnedProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load your projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.project_id || !formData.funding_goal || !formData.funding_deadline || !formData.wallet_address || !formData.funding_purpose) {
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

    try {
      setCreating(true);

      // Set funding creation fee to 2 ADA for testing
      const fundingData: CreateFundingData = {
        ...formData,
        bone_posting_fee: 2, // 2 ADA for testing
        bone_tx_hash: 'test_tx_' + Date.now() // Test transaction hash
      };

      await fundingService.createFundingProject(fundingData, walletAddress);
      
      toast.success('Funding project created successfully!');
      navigate('/funding');
      
    } catch (error: any) {
      console.error('Error creating funding:', error);
      toast.error(error.message || 'Failed to create funding project');
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'funding_goal' ? parseFloat(value) || 0 : value
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
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No eligible projects found</h3>
            <p className="text-gray-500 mb-4">
              You need to create a project first, or all your projects already have active funding campaigns.
            </p>
            <button
              onClick={() => navigate('/create-project')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Create New Project
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow-sm rounded-lg"
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Project *
                </label>
                <CustomSelect
                  options={userProjects.map(project => ({
                    value: project.id,
                    label: project.title
                  }))}
                  value={formData.project_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
                  placeholder="Choose one of your projects..."
                  className=""
                />
                <p className="mt-1 text-sm text-gray-500">
                  Only your projects without existing funding campaigns are shown
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
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-lg font-semibold text-yellow-900">Funding Creation Fee</h4>
                    <p className="text-sm text-yellow-800">
                      Creating a funding campaign costs <strong>2 ADA</strong> (testing rate). This helps prevent spam and ensures serious projects.
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <div className="text-center mb-4">
                  <FaInfoCircle className="text-blue-500 text-2xl mx-auto mb-2" />
                  <h4 className="text-xl font-bold text-blue-900">How BoneBoard Funding Works</h4>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                        <h5 className="font-semibold text-blue-900">Direct Wallet Funding</h5>
                      </div>
                      <p className="text-sm text-blue-700 ml-11">Contributors send ADA directly to your project wallet - no middleman fees</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                        <h5 className="font-semibold text-green-900">Blockchain Security</h5>
                      </div>
                      <p className="text-sm text-green-700 ml-11">All transactions are permanently recorded on Cardano blockchain</p>
                    </div>
                  </div>
                  
                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</div>
                        <h5 className="font-semibold text-purple-900">Real-time Analytics</h5>
                      </div>
                      <p className="text-sm text-purple-700 ml-11">Track funding progress, contributors, and engagement metrics live</p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</div>
                        <h5 className="font-semibold text-orange-900">Community Driven</h5>
                      </div>
                      <p className="text-sm text-orange-700 ml-11">Build a community around your project with contributor recognition</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800 text-center">
                    <strong>💡 Pro Tip:</strong> Projects with clear funding purposes and realistic goals get 3x more contributions!
                  </p>
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
                  disabled={creating}
                  className="flex-1 px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Funding Project'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CreateFunding;
