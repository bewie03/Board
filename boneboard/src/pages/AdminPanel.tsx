import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaChartBar, FaDollarSign, FaBug, FaExclamationTriangle, FaProjectDiagram, FaBriefcase, FaTrash, FaArchive, FaClock } from 'react-icons/fa';
import { AdminService, PlatformSettings } from '../services/adminService';
import { useWallet } from '../contexts/WalletContext';
import { isAdminWallet } from '../utils/adminAuth';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';

interface ScamReport {
  id: string;
  title: string;
  description: string;
  scam_type: string;
  severity: string;
  status: string;
  scam_identifier: string;
  created_at: string;
  reporter_id: string;
  evidence_urls?: string[];
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'pricing'>('reports');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [reports, setReports] = useState<ScamReport[]>([]);
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

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'pricing') {
      loadSettings();
    } else if (activeTab === 'reports') {
      loadReports();
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

  const loadReports = async () => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      const reportsData = await adminService.getReports(walletAddress);
      setReports(reportsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReport = async (reportId: string, action: 'pause' | 'delete' | 'archive' | 'restore', projectId?: string) => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      await adminService.processReport(walletAddress, reportId, action, projectId);
      await loadReports(); // Reload reports after processing
    } catch (err: any) {
      setError(err.message || 'Failed to process report');
      console.error('Error processing report:', err);
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                  <FaShieldAlt className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-blue-600">Platform Management Dashboard</p>
                </div>
              </div>
              <div className="bg-blue-600 px-4 py-2 rounded-xl">
                <span className="text-sm font-semibold text-white">Admin Mode</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100">
            <nav className="flex space-x-1 p-2">
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <FaChartBar className="mr-2 h-4 w-4" />
                Reports
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'pricing'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <FaDollarSign className="mr-2 h-4 w-4" />
                Pricing
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="bg-white shadow-sm rounded-xl border border-blue-100">
              <div className="px-6 py-5 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <FaExclamationTriangle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Scam Reports</h2>
                      <p className="text-sm text-blue-600">Manage reported projects and suspicious activity</p>
                    </div>
                  </div>
                  <div className="bg-red-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-red-800">{reports.length} Reports</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading reports...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FaExclamationTriangle className="h-10 w-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Yet</h3>
                    <p className="text-blue-600">No scam reports have been submitted</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <ReportCard 
                        key={report.id} 
                        report={report} 
                        onProcess={handleProcessReport}
                        loading={loading}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="bg-white shadow-sm rounded-xl border border-blue-100">
              <div className="px-6 py-5 border-b border-blue-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <FaDollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Platform Pricing</h2>
                    <p className="text-sm text-blue-600">Manage listing fees and pricing structure</p>
                  </div>
                </div>
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

        </div>
      </div>
    </PageTransition>
  );
};

// Report Card Component
const ReportCard: React.FC<{
  report: ScamReport;
  onProcess: (reportId: string, action: 'pause' | 'delete' | 'archive' | 'restore', projectId?: string) => Promise<void>;
  loading: boolean;
}> = ({ report, onProcess, loading }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      case 'critical': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity)}`}>
              {report.severity.toUpperCase()}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
              {report.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center gap-1">
              <FaClock className="h-3 w-3" />
              {formatDate(report.created_at)}
            </span>
            <span className="capitalize">{report.scam_type.replace('_', ' ')}</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              ID: {report.scam_identifier.slice(0, 8)}...
            </span>
          </div>
          <p className="text-gray-700 text-sm mb-4 line-clamp-2">{report.description}</p>
          {report.evidence_urls && report.evidence_urls.length > 0 && (
            <div className="mb-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Evidence:</span>
              <div className="mt-1 space-y-1">
                {report.evidence_urls.slice(0, 2).map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:text-blue-800 truncate"
                  >
                    {url}
                  </a>
                ))}
                {report.evidence_urls.length > 2 && (
                  <span className="text-xs text-gray-500">+{report.evidence_urls.length - 2} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Report ID: {report.id.slice(0, 8)}...
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onProcess(report.id, 'archive', report.scam_identifier)}
            disabled={loading}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 flex items-center gap-1"
          >
            <FaArchive className="h-3 w-3" />
            Archive
          </button>
          <button
            onClick={() => onProcess(report.id, 'delete', report.scam_identifier)}
            disabled={loading}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 flex items-center gap-1"
          >
            <FaTrash className="h-3 w-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
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
        <div className="bg-white rounded-xl p-6 border border-blue-200">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 shadow-sm">
              <FaProjectDiagram className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Project Listing Fees</h3>
              <p className="text-sm text-blue-700">Set pricing for project submissions</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                🦴 BONE Price (Base Price)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={projectFeeBone}
                  onChange={(e) => setProjectFeeBone(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-gray-500 font-medium">BONE</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                ₳ ADA Price (Alternative)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={projectFeeAda}
                  onChange={(e) => setProjectFeeAda(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-gray-500 font-medium">ADA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Job Listing Fees */}
        <div className="bg-white rounded-xl p-6 border border-blue-200">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <FaBriefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Job Listing Fees</h3>
              <p className="text-sm text-blue-600">Set pricing for job postings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                🦴 BONE Price (Base Price)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={jobFeeBone}
                  onChange={(e) => setJobFeeBone(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-gray-500 font-medium">BONE</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                ₳ ADA Price (Alternative)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={jobFeeAda}
                  onChange={(e) => setJobFeeAda(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-gray-500 font-medium">ADA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3 shadow-sm">
              <FaBug className="h-5 w-5 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Pricing Structure</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <span className="text-sm text-gray-700">Base price is for 1-month listings</span>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <span className="text-sm text-gray-700">Project listings get 20% discount</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
                <span className="text-sm text-gray-700">Duration discounts: 2mo (5%), 3mo (10%), 6mo (15%), 12mo (20%)</span>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white text-xs font-bold">4</span>
                </div>
                <span className="text-sm text-gray-700">Featured listings cost +50%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Settings Info */}
      <div className="bg-white p-6 rounded-xl border border-blue-200">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <FaShieldAlt className="h-5 w-5 text-blue-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900">Current Settings</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <div className="w-3 h-3 bg-blue-600 rounded-full mr-3"></div>
            <span className="text-sm text-gray-700"><strong>Last updated:</strong> {new Date(settings.lastUpdated).toLocaleString()}</span>
          </div>
          <div className="flex items-start p-3 bg-blue-50 rounded-lg">
            <div className="w-3 h-3 bg-blue-600 rounded-full mr-3 mt-1 flex-shrink-0"></div>
            <span className="text-sm text-gray-700 break-all"><strong>Updated by:</strong> {settings.updatedBy}</span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Updating...
            </div>
          ) : (
            'Update Pricing'
          )}
        </button>
      </div>
    </form>
  );
};

export default AdminPanel;
