import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaInfoCircle } from 'react-icons/fa';
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
        // Filter projects that don't already have active funding
        const projectsWithoutFunding = data.filter((project: any) => !project.has_active_funding);
        setUserProjects(projectsWithoutFunding);
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

      // For now, we'll skip the BONE payment requirement
      // In a full implementation, you'd handle BONE token payment here
      const fundingData: CreateFundingData = {
        ...formData,
        bone_posting_fee: 0, // Set to 0 for now
        bone_tx_hash: 'placeholder' // Placeholder for now
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects available</h3>
            <p className="text-gray-500 mb-4">
              You need to create a project first before setting up funding.
            </p>
            <button
              onClick={() => navigate('/projects/create')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Project
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
                  Select Project *
                </label>
                <select
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a project...</option>
                  {userProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Only projects without existing funding are shown
                </p>
              </div>

              {/* Funding Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Goal (ADA) *
                </label>
                <input
                  type="number"
                  name="funding_goal"
                  value={formData.funding_goal || ''}
                  onChange={handleInputChange}
                  step="0.000001"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter funding goal in ADA"
                />
                <p className="mt-1 text-sm text-gray-500">
                  The total amount you want to raise for this project
                </p>
              </div>

              {/* Project Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Wallet Address *
                </label>
                <input
                  type="text"
                  name="wallet_address"
                  value={formData.wallet_address}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="addr1..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  The Cardano wallet address where funds will be sent
                </p>
              </div>

              {/* Funding Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Purpose *
                </label>
                <textarea
                  name="funding_purpose"
                  value={formData.funding_purpose}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Explain what you need the funding for and how it will be used..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  Describe your funding goals, milestones, and how the funds will be allocated
                </p>
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

              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <FaInfoCircle className="text-blue-500 text-xl" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-blue-900 mb-3">How Funding Works</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</div>
                          <div>
                            <h5 className="font-medium text-blue-800">Direct Wallet Funding</h5>
                            <p className="text-sm text-blue-700">Contributors send ADA directly to your project wallet</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</div>
                          <div>
                            <h5 className="font-medium text-blue-800">Blockchain Recording</h5>
                            <p className="text-sm text-blue-700">All transactions are permanently recorded on Cardano</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</div>
                          <div>
                            <h5 className="font-medium text-blue-800">Real-time Tracking</h5>
                            <p className="text-sm text-blue-700">Monitor funding progress and contributor activity live</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</div>
                          <div>
                            <h5 className="font-medium text-blue-800">Flexible Duration</h5>
                            <p className="text-sm text-blue-700">Funding continues until deadline or goal is reached</p>
                          </div>
                        </div>
                      </div>
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
