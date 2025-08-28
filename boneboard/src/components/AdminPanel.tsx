// Admin panel component for platform management
import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { isAdminWallet } from '../utils/adminAuth';
import { adminService, PlatformSettings } from '../services/adminService';
import { FaShieldAlt, FaCog, FaCheckCircle, FaTimes, FaEdit, FaChartBar, FaExclamationTriangle, FaTrash, FaPause, FaPlay, FaArchive } from 'react-icons/fa';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState<'settings' | 'reports' | 'archived' | 'stats'>('settings');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [archivedReports, setArchivedReports] = useState<any[]>([]);

  // Check admin access
  if (!isAdminWallet(walletAddress)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <FaTimes size={48} />
          </div>
          <h2 className="text-xl font-bold text-center mb-2">Access Denied</h2>
          <p className="text-gray-600 text-center mb-4">
            You don't have admin privileges to access this panel.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadSettings();
    loadStats();
    if (walletAddress) {
      loadReports();
      loadArchivedReports();
    }
  }, [walletAddress]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const platformSettings = await adminService.getPlatformSettings();
      setSettings(platformSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const adminStats = await adminService.getAdminStats();
      setStats(adminStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadReports = async () => {
    if (!walletAddress) return;
    try {
      const reportsData = await adminService.getReports(walletAddress, false);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadArchivedReports = async () => {
    if (!walletAddress) return;
    try {
      const archivedData = await adminService.getReports(walletAddress, true);
      setArchivedReports(archivedData);
    } catch (error) {
      console.error('Error loading archived reports:', error);
    }
  };

  const handleReportAction = async (reportId: string, action: 'pause' | 'delete' | 'archive' | 'restore', projectId?: string) => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      await adminService.processReport(walletAddress, reportId, action, projectId);
      
      // Reload reports data
      await loadReports();
      await loadArchivedReports();
      
      alert(`Report ${action}d successfully!`);
    } catch (error) {
      console.error(`Error ${action}ing report:`, error);
      alert(`Failed to ${action} report. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async (updates: Partial<PlatformSettings>) => {
    if (!walletAddress || !settings) return;

    try {
      setLoading(true);
      const updatedSettings = await adminService.updatePlatformSettings(walletAddress, updates);
      setSettings(updatedSettings);
      alert('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FaCog size={20} />
        Platform Settings
      </h3>

      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Listing Fee
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={settings.projectListingFee}
                  onChange={(e) => setSettings({
                    ...settings,
                    projectListingFee: parseFloat(e.target.value) || 0
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={settings.projectListingCurrency}
                  onChange={(e) => setSettings({
                    ...settings,
                    projectListingCurrency: e.target.value as 'ADA' | 'BONE'
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADA">ADA</option>
                  <option value="BONE">BONE</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Listing Fee
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={settings.jobListingFee}
                  onChange={(e) => setSettings({
                    ...settings,
                    jobListingFee: parseFloat(e.target.value) || 0
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={settings.jobListingCurrency}
                  onChange={(e) => setSettings({
                    ...settings,
                    jobListingCurrency: e.target.value as 'ADA' | 'BONE'
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADA">ADA</option>
                  <option value="BONE">BONE</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Last Updated</h4>
              <p className="text-sm text-gray-600">
                {new Date(settings.lastUpdated).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                By: {settings.updatedBy}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleSettingsUpdate(settings || {})}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={loadSettings}
          className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FaChartBar size={20} />
        Platform Statistics
      </h3>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h4 className="font-semibold text-blue-900">Total Projects</h4>
            <p className="text-3xl font-bold text-blue-600">{stats.totalProjects}</p>
            <p className="text-sm text-blue-700 mt-1">
              {stats.verifiedProjects} verified
            </p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <h4 className="font-semibold text-green-900">Total Jobs</h4>
            <p className="text-3xl font-bold text-green-600">{stats.totalJobs}</p>
            <p className="text-sm text-green-700 mt-1">
              {stats.activeJobs} active
            </p>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg">
            <h4 className="font-semibold text-purple-900">Total Users</h4>
            <p className="text-3xl font-bold text-purple-600">{stats.totalUsers}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FaExclamationTriangle size={20} />
        Project Reports
      </h3>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          Review reported projects and jobs. Take action by pausing or deleting malicious content.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FaCheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium mb-2">No Reports</h4>
          <p>No project or job reports to review at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{report.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      report.severity === 'high' ? 'bg-red-100 text-red-800' :
                      report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.severity} priority
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{report.description}</p>
                  <div className="text-sm text-gray-500">
                    Reported by: {report.reporter_id} • {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button 
                    onClick={() => handleReportAction(report.id, 'pause', report.scam_identifier)}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  >
                    <FaPause size={14} />
                    Pause
                  </button>
                  <button 
                    onClick={() => handleReportAction(report.id, 'delete', report.scam_identifier)}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <FaTrash size={14} />
                    Delete
                  </button>
                  <button 
                    onClick={() => handleReportAction(report.id, 'archive')}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <FaArchive size={14} />
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderArchivedTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FaArchive size={20} />
        Archived Reports
      </h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          Previously processed reports. You can restore projects/jobs if needed.
        </p>
      </div>

      {archivedReports.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FaArchive size={48} className="mx-auto mb-4 text-gray-300" />
          <h4 className="text-lg font-medium mb-2">No Archived Reports</h4>
          <p>No archived reports to display.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {archivedReports.map((report) => (
            <div key={report.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-700">{report.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      report.status === 'deleted' ? 'bg-red-100 text-red-800' :
                      report.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{report.description}</p>
                  <div className="text-sm text-gray-500">
                    Processed: {new Date(report.updated_at).toLocaleDateString()} • 
                    Action taken by: {report.verified_by}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {report.status === 'paused' && (
                    <button 
                      onClick={() => handleReportAction(report.id, 'restore', report.scam_identifier)}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <FaPlay size={14} />
                      Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FaShieldAlt className="text-red-500" size={24} />
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { id: 'settings', label: 'Settings', icon: FaCog },
            { id: 'reports', label: 'Reports', icon: FaCheckCircle },
            { id: 'archived', label: 'Archived', icon: FaEdit },
            { id: 'stats', label: 'Statistics', icon: FaChartBar }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'reports' && renderReportsTab()}
          {activeTab === 'archived' && renderArchivedTab()}
        </div>
      </div>
    </div>
  );
};
