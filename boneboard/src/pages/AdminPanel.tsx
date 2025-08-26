import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaChartBar, FaDollarSign, FaBug, FaExclamationTriangle } from 'react-icons/fa';
import { AdminService, PlatformSettings } from '../services/adminService';
import { useWallet } from '../contexts/WalletContext';
import { isAdminWallet } from '../utils/adminAuth';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'pricing' | 'bugs'>('reports');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { walletAddress } = useWallet();
  const navigate = useNavigate();
  const adminService = AdminService.getInstance();

  // Redirect if not admin
  useEffect(() => {
    if (walletAddress && !isAdminWallet(walletAddress)) {
      navigate('/');
    }
  }, [walletAddress, navigate]);

  // Load platform settings
  useEffect(() => {
    if (activeTab === 'pricing') {
      loadSettings();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const platformSettings = await adminService.getPlatformSettings();
      setSettings(platformSettings);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<PlatformSettings>) => {
    if (!walletAddress) {
      setError('Wallet not connected');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await adminService.updatePlatformSettings(walletAddress, newSettings);
      await loadSettings(); // Reload to get updated data
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
      console.error('Error updating settings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!walletAddress || !isAdminWallet(walletAddress)) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <FaExclamationTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Access Denied</h1>
            <p className="mt-2 text-gray-600">Admin privileges required</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <FaShieldAlt className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-600">Platform Management Dashboard</p>
                </div>
              </div>
              <div className="bg-blue-100 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-blue-800">Admin Mode</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaChartBar className="inline mr-2" />
                Reports
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pricing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaDollarSign className="inline mr-2" />
                Pricing
              </button>
              <button
                onClick={() => setActiveTab('bugs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bugs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaBug className="inline mr-2" />
                Bug Reports
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <FaExclamationTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">User Reports</h2>
                <p className="text-sm text-gray-600">Manage reported projects and job listings</p>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <FaChartBar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Reports Yet</h3>
                  <p className="mt-2 text-gray-600">User reporting system will be implemented here</p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Platform Pricing</h2>
                <p className="text-sm text-gray-600">Manage listing fees and pricing structure</p>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading settings...</p>
                  </div>
                ) : settings ? (
                  <PricingSettings 
                    settings={settings} 
                    onUpdate={handleUpdateSettings}
                    loading={loading}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Failed to load pricing settings</p>
                    <button 
                      onClick={loadSettings}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bug Reports Tab */}
          {activeTab === 'bugs' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Bug Reports</h2>
                <p className="text-sm text-gray-600">Track and manage platform issues</p>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <FaBug className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Bug Reports</h3>
                  <p className="mt-2 text-gray-600">Bug reporting system will be implemented here</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

// Pricing Settings Component
const PricingSettings: React.FC<{
  settings: PlatformSettings;
  onUpdate: (settings: Partial<PlatformSettings>) => Promise<void>;
  loading: boolean;
}> = ({ settings, onUpdate, loading }) => {
  const [projectFeeBone, setProjectFeeBone] = useState(settings.projectListingFee);
  const [jobFeeBone, setJobFeeBone] = useState(settings.jobListingFee);
  const [projectFeeAda, setProjectFeeAda] = useState((settings as any).projectListingFeeAda || settings.projectListingFee);
  const [jobFeeAda, setJobFeeAda] = useState((settings as any).jobListingFeeAda || settings.jobListingFee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      projectListingFee: projectFeeBone,
      jobListingFee: jobFeeBone,
      projectListingFeeAda: projectFeeAda,
      jobListingFeeAda: jobFeeAda,
      projectListingCurrency: settings.projectListingCurrency,
      jobListingCurrency: settings.jobListingCurrency,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-8">
        {/* Project Listing Fees */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Project Listing Fees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                BONE Price (Base Price)
              </label>
              <div className="flex">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={projectFeeBone}
                  onChange={(e) => setProjectFeeBone(parseFloat(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700">
                  BONE
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ADA Price (Alternative)
              </label>
              <div className="flex">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={projectFeeAda}
                  onChange={(e) => setProjectFeeAda(parseFloat(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700">
                  ADA
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Job Listing Fees */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Job Listing Fees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                BONE Price (Base Price)
              </label>
              <div className="flex">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={jobFeeBone}
                  onChange={(e) => setJobFeeBone(parseFloat(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700">
                  BONE
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ADA Price (Alternative)
              </label>
              <div className="flex">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={jobFeeAda}
                  onChange={(e) => setJobFeeAda(parseFloat(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700">
                  ADA
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Pricing Structure</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Base price is for 1-month listings</p>
            <p>• Duration discounts: 2mo (5%), 3mo (10%), 6mo (15%), 12mo (20%)</p>
            <p>• Project listings get 20% discount</p>
            <p>• Featured listings cost +50%</p>
          </div>
        </div>
      </div>

      {/* Current Settings Info */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Current Settings</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Last updated: {new Date(settings.lastUpdated).toLocaleString()}</p>
          <p>Updated by: {settings.updatedBy}</p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update Pricing'}
        </button>
      </div>
    </form>
  );
};

export default AdminPanel;
