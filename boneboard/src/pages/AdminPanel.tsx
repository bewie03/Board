import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBriefcase, FaChartBar, FaExclamationTriangle, FaArchive, FaClock, FaTrash, FaShieldAlt, FaDollarSign, FaTimes, FaGlobe, FaExternalLinkAlt, FaEnvelope, FaCalendarAlt, FaMapMarkerAlt, FaPlay, FaCoins, FaInfoCircle, FaTrashAlt } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
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
  project_name?: string;
  item_type?: string;
}

const AdminPanel: React.FC = () => {
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState<'reports' | 'paused' | 'archived' | 'pricing'>('reports');
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [archivedReports, setArchivedReports] = useState<ScamReport[]>([]);
  const [pausedItems, setPausedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, type: 'report' | 'item', id: string, itemId?: string} | null>(null);
  const [reportsSearchTerm, setReportsSearchTerm] = useState('');
  const [pausedSearchTerm, setPausedSearchTerm] = useState('');
  const [archivedSearchTerm, setArchivedSearchTerm] = useState('');
  const [reportsSortBy, setReportsSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest');
  const [pausedSortBy, setPausedSortBy] = useState<'newest' | 'oldest'>('newest');
  const [archivedSortBy, setArchivedSortBy] = useState<'newest' | 'oldest'>('newest');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  // Check admin access
  const ADMIN_WALLET = 'addr1q9l3t0hzcfdf3h9ewvz9x6pm9pm0swds3ghmazv97wcktljtq67mkhaxfj2zv5umsedttjeh0j3xnnew0gru6qywqy9s9j7x4d';
  
  if (walletAddress && walletAddress !== ADMIN_WALLET) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'pricing') {
      loadSettings();
    } else if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'paused') {
      loadPausedItems();
    } else if (activeTab === 'archived') {
      loadArchivedReports();
    }
  }, [activeTab]);

  const getTimeAgo = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  const loadSettings = async () => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      // Mock settings for now
      setSettings({
        projectListingFee: 10,
        jobListingFee: 5,
        maxProjectDuration: 365,
        maxJobDuration: 30,
        enablePayments: true,
        maintenanceMode: false
      });
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
      const response = await fetch('/api/reports', {
        headers: { 'x-wallet-address': walletAddress }
      });
      const data = await response.json();
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedReports = async () => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/reports?archived=true', {
        headers: { 'x-wallet-address': walletAddress }
      });
      const data = await response.json();
      setArchivedReports(data.reports || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load archived reports');
      console.error('Error loading archived reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPausedItems = async () => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      // Fetch paused projects and jobs, plus reports for paused items
      const [pausedProjects, pausedJobs, pausedReports] = await Promise.all([
        fetch('/api/projects?status=paused', {
          headers: { 'x-wallet-address': walletAddress }
        }).then(res => res.json()),
        fetch('/api/jobs?status=paused', {
          headers: { 'x-wallet-address': walletAddress }
        }).then(res => res.json()),
        fetch('/api/reports?paused=true', {
          headers: { 'x-wallet-address': walletAddress }
        }).then(res => res.json())
      ]);
      
      const combined = [
        ...(pausedProjects.projects || []).map((p: any) => ({ ...p, type: 'project' })),
        ...(Array.isArray(pausedJobs) ? pausedJobs : []).map((j: any) => ({ ...j, type: 'job' }))
      ];
      
      // Add reports for paused items to show in pause menu
      if (pausedReports && pausedReports.length > 0) {
        pausedReports.forEach((report: any) => {
          const existingItem = combined.find(item => item.id === report.scam_identifier);
          if (existingItem) {
            existingItem.report = report;
          }
        });
      }
      
      setPausedItems(combined);
    } catch (err: any) {
      setError(err.message || 'Failed to load paused items');
      console.error('Error loading paused items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReport = async (reportId: string, action: 'pause' | 'delete' | 'archive' | 'restore' | 'permanent_delete', projectId?: string) => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/reports', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          reportId,
          action,
          projectId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Reload all relevant data
      await loadReports();
      await loadArchivedReports();
      await loadPausedItems();
    } catch (err: any) {
      setError(err.message || 'Failed to process report');
      console.error('Error processing report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreItem = async (itemId: string, itemType: 'project' | 'job') => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      const endpoint = itemType === 'project' ? '/api/projects' : '/api/jobs';
      const response = await fetch(`${endpoint}?id=${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          status: itemType === 'project' ? 'active' : 'confirmed'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Find the related report and restore it (which will archive it)
      const relatedReport = pausedItems.find(item => item.id === itemId);
      if (relatedReport && relatedReport.report) {
        await fetch('/api/reports', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': walletAddress
          },
          body: JSON.stringify({
            reportId: relatedReport.report.id,
            action: 'restore',
            projectId: itemId
          })
        });
      }
      
      await loadPausedItems();
      await loadArchivedReports();
    } catch (err: any) {
      setError(err.message || 'Failed to restore item');
      console.error('Error restoring item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    if (!walletAddress) {
      setError('Wallet not connected');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      // Mock update for now - would call API in real implementation
      console.log('Updating settings:', newSettings);
      await loadSettings(); // Reload to get updated data
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
      console.error('Error updating settings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!walletAddress || walletAddress !== ADMIN_WALLET) {
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
                onClick={() => setActiveTab('paused')}
                className={`flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'paused'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <FaClock className="mr-2 h-4 w-4" />
                Paused
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`flex items-center px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  activeTab === 'archived'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <FaArchive className="mr-2 h-4 w-4" />
                Archived
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
                <div className="mb-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={reportsSearchTerm}
                    onChange={(e) => setReportsSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-4 flex-wrap">
                    <select
                      value={reportsSortBy}
                      onChange={(e) => setReportsSortBy(e.target.value as 'newest' | 'oldest' | 'severity')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="severity">By Severity</option>
                    </select>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as 'all' | 'low' | 'medium' | 'high' | 'critical')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                {reports.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FaExclamationTriangle className="h-10 w-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Yet</h3>
                    <p className="text-blue-600">No scam reports have been submitted</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports
                      .filter(report => {
                        const matchesSearch = report.title.toLowerCase().includes(reportsSearchTerm.toLowerCase()) ||
                          report.description.toLowerCase().includes(reportsSearchTerm.toLowerCase()) ||
                          report.project_name?.toLowerCase().includes(reportsSearchTerm.toLowerCase());
                        const matchesSeverity = severityFilter === 'all' || report.severity === severityFilter;
                        return matchesSearch && matchesSeverity;
                      })
                      .sort((a, b) => {
                        if (reportsSortBy === 'oldest') {
                          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                        } else if (reportsSortBy === 'severity') {
                          const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                          return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - (severityOrder[a.severity as keyof typeof severityOrder] || 0);
                        } else {
                          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        }
                      })
                      .map((report) => (
                      <ReportCard 
                        key={report.id} 
                        report={report} 
                        onProcess={handleProcessReport}
                        loading={loading}
                        onSelectProject={setSelectedProject}
                        onSelectJob={setSelectedJob}
                        onDeleteConfirm={setDeleteConfirm}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paused Items Tab */}
          {activeTab === 'paused' && (
            <div className="bg-white shadow-sm rounded-xl border border-blue-100">
              <div className="px-6 py-5 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <FaClock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Paused Items</h2>
                      <p className="text-sm text-blue-600">Manage paused projects and job listings</p>
                    </div>
                  </div>
                  <div className="bg-yellow-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-yellow-800">{pausedItems.length} Paused</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Search paused items..."
                    value={pausedSearchTerm}
                    onChange={(e) => setPausedSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex gap-4 flex-wrap">
                    <select
                      value={pausedSortBy}
                      onChange={(e) => setPausedSortBy(e.target.value as 'newest' | 'oldest')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading paused items...</p>
                  </div>
                ) : pausedItems
                  .filter(item => 
                    item.title?.toLowerCase().includes(pausedSearchTerm.toLowerCase()) ||
                    item.description?.toLowerCase().includes(pausedSearchTerm.toLowerCase()) ||
                    item.company?.toLowerCase().includes(pausedSearchTerm.toLowerCase())
                  )
                  .sort((a, b) => {
                    if (pausedSortBy === 'oldest') {
                      return new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime();
                    } else {
                      return new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime();
                    }
                  })
                  .length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FaClock className="h-10 w-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Paused Items</h3>
                    <p className="text-blue-600">No projects or jobs are currently paused</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pausedItems
                      .filter(item => 
                        item.title?.toLowerCase().includes(pausedSearchTerm.toLowerCase()) ||
                        item.description?.toLowerCase().includes(pausedSearchTerm.toLowerCase()) ||
                        item.company?.toLowerCase().includes(pausedSearchTerm.toLowerCase())
                      )
                      .sort((a, b) => {
                        if (pausedSortBy === 'oldest') {
                          return new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime();
                        } else {
                          return new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime();
                        }
                      })
                      .map((item) => (
                      <PausedItemCard 
                        key={item.id} 
                        item={item} 
                        onRestore={handleRestoreItem}
                        loading={loading}
                        onSelectProject={setSelectedProject}
                        onSelectJob={setSelectedJob}
                        onDeleteConfirm={setDeleteConfirm}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Archived Reports Tab */}
          {activeTab === 'archived' && (
            <div className="bg-white shadow-sm rounded-xl border border-blue-100">
              <div className="px-6 py-5 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <FaArchive className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Archived Reports</h2>
                      <p className="text-sm text-blue-600">View resolved and archived reports</p>
                    </div>
                  </div>
                  <div className="bg-gray-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-gray-800">{archivedReports.length} Archived</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-6 space-y-4">
                  <input
                    type="text"
                    placeholder="Search archived reports..."
                    value={archivedSearchTerm}
                    onChange={(e) => setArchivedSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex gap-4 flex-wrap">
                    <select
                      value={archivedSortBy}
                      onChange={(e) => setArchivedSortBy(e.target.value as 'newest' | 'oldest')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>
                </div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading archived reports...</p>
                  </div>
                ) : archivedReports
                  .filter(report => 
                    report.title.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
                    report.description.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
                    report.project_name?.toLowerCase().includes(archivedSearchTerm.toLowerCase())
                  )
                  .sort((a, b) => {
                    if (archivedSortBy === 'oldest') {
                      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    } else {
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }
                  })
                  .length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FaArchive className="h-10 w-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Archived Reports</h3>
                    <p className="text-blue-600">No reports have been archived yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {archivedReports
                      .filter(report => 
                        report.title.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
                        report.description.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
                        report.project_name?.toLowerCase().includes(archivedSearchTerm.toLowerCase())
                      )
                      .sort((a, b) => {
                        if (archivedSortBy === 'oldest') {
                          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                        } else {
                          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        }
                      })
                      .map((report) => (
                      <ReportCard 
                        key={report.id} 
                        report={report} 
                        onProcess={handleProcessReport}
                        loading={false}
                        isArchived={true}
                        onSelectProject={setSelectedProject}
                        onSelectJob={setSelectedJob}
                        onDeleteConfirm={setDeleteConfirm}
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

      {/* Project Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">{selectedProject.title}</h2>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                        selectedProject.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedProject.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        selectedProject.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedProject.status}
                      </span>
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">Project</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">Project Details</h3>
                    <div className="space-y-5">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Description</label>
                        <p className="text-gray-900 mt-2 leading-relaxed">{selectedProject.description}</p>
                      </div>
                      {selectedProject.skills && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 block">Required Skills</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProject.skills.split(',').map((skill: string, index: number) => (
                              <span key={index} className="px-3 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">Contact Information</h3>
                    <div className="space-y-5">
                      {selectedProject.contact_email && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <label className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Email</label>
                          <p className="text-blue-900 flex items-center gap-3 mt-2">
                            <FaEnvelope className="w-5 h-5" />
                            <span className="font-medium">{selectedProject.contact_email}</span>
                          </p>
                        </div>
                      )}
                      {selectedProject.website && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Website</label>
                          <p className="text-gray-900 flex items-center gap-3 mt-2">
                            <FaGlobe className="w-5 h-5" />
                            <a href={selectedProject.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                              {selectedProject.website}
                            </a>
                          </p>
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <label className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Created</label>
                        <p className="text-blue-900 flex items-center gap-3 mt-2">
                          <FaCalendarAlt className="w-5 h-5" />
                          <span className="font-medium">{getTimeAgo(selectedProject.createdAt || selectedProject.created_at)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setSelectedProject(null);
                        window.location.href = `/projects?id=${selectedProject.id}`;
                      }}
                      className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-lg shadow-lg hover:shadow-xl"
                    >
                      <FaExternalLinkAlt className="w-5 h-5" />
                      View Full Project
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Modal */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">{selectedJob.title}</h2>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                        selectedJob.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedJob.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        selectedJob.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedJob.status}
                      </span>
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">Job</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">Job Details</h3>
                    <div className="space-y-5">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Description</label>
                        <p className="text-gray-900 mt-2 leading-relaxed">{selectedJob.description}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <label className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Salary</label>
                        <p className="text-blue-900 mt-1 text-lg font-bold">{selectedJob.salary}</p>
                      </div>
                      {selectedJob.location && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Location</label>
                          <p className="text-gray-900 flex items-center gap-3 mt-2">
                            <FaMapMarkerAlt className="w-5 h-5" />
                            <span className="font-medium">{selectedJob.location}</span>
                          </p>
                        </div>
                      )}
                      {selectedJob.skills && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 block">Required Skills</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedJob.skills.split(',').map((skill: string, index: number) => (
                              <span key={index} className="px-3 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">Company Information</h3>
                    <div className="space-y-5">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <label className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Company</label>
                        <p className="text-blue-900 mt-2 font-bold text-lg">{selectedJob.company || selectedJob.company_name}</p>
                      </div>
                      {selectedJob.contact_email && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <label className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Email</label>
                          <p className="text-blue-900 flex items-center gap-3 mt-2">
                            <FaEnvelope className="w-5 h-5" />
                            <span className="font-medium">{selectedJob.contact_email}</span>
                          </p>
                        </div>
                      )}
                      {selectedJob.website && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Website</label>
                          <p className="text-gray-900 flex items-center gap-3 mt-2">
                            <FaGlobe className="w-5 h-5" />
                            <a href={selectedJob.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                              {selectedJob.website}
                            </a>
                          </p>
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <label className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Posted</label>
                        <p className="text-blue-900 flex items-center gap-3 mt-2">
                          <FaCalendarAlt className="w-5 h-5" />
                          <span className="font-medium">{getTimeAgo(selectedJob.createdAt || selectedJob.created_at)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setSelectedJob(null);
                        window.location.href = `/jobs?id=${selectedJob.id}`;
                      }}
                      className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-lg shadow-lg hover:shadow-xl"
                    >
                      <FaExternalLinkAlt className="w-5 h-5" />
                      View Full Job
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {deleteConfirm?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this {deleteConfirm.type === 'item' ? 'job/project' : 'report'}? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirm.type === 'item' && deleteConfirm.itemId) {
                    await handleProcessReport(deleteConfirm.id, 'permanent_delete', deleteConfirm.itemId);
                  }
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </PageTransition>
  );
};

// Report Card Component
const ReportCard: React.FC<{
  report: ScamReport;
  onProcess: (reportId: string, action: 'pause' | 'delete' | 'archive' | 'restore' | 'permanent_delete', projectId?: string) => Promise<void>;
  loading: boolean;
  isArchived?: boolean;
  onSelectProject: (project: any) => void;
  onSelectJob: (job: any) => void;
  onDeleteConfirm: (confirm: {show: boolean, type: 'report' | 'item', id: string, itemId?: string}) => void;
}> = ({ report, onProcess, loading, isArchived = false, onSelectProject, onSelectJob, onDeleteConfirm }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      case 'critical': return 'bg-purple-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 text-white';
      case 'verified': return 'bg-green-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'resolved': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  const handleCardClick = async (e: React.MouseEvent) => {
    console.log('Report card clicked:', report);
    
    // Don't trigger if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      console.log('Clicked on button, ignoring');
      return;
    }
    
    if (report.scam_identifier) {
      // Determine if this is a project or job report
      // Check if the scam_identifier exists in projects first, then fallback to jobs
      let itemType = 'job'; // default
      
      // First try to fetch as project
      try {
        const projectResponse = await fetch(`/api/projects?id=${report.scam_identifier}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const projects = Array.isArray(projectData) ? projectData : (projectData.projects || []);
          if (projects.length > 0) {
            itemType = 'project';
          }
        }
      } catch (error) {
        // If project fetch fails, it's likely a job
        itemType = 'job';
      }
      console.log('Fetching details for:', { itemType, id: report.scam_identifier });
      
      try {
        // Now fetch the data for the modal (we already determined the type above)
        if (itemType === 'project') {
          // We already fetched project data above, so use it
          const response = await fetch(`/api/projects?id=${report.scam_identifier}`);
          const data = await response.json();
          console.log('Project API response:', data);
          const projects = Array.isArray(data) ? data : (data.projects || []);
          if (projects.length > 0) {
            console.log('Opening project modal with:', projects[0]);
            onSelectProject(projects[0]);
          } else {
            console.log('No projects found in response');
          }
        } else {
          const response = await fetch(`/api/jobs?id=${report.scam_identifier}`);
          const data = await response.json();
          console.log('Jobs API response:', data);
          const jobs = Array.isArray(data) ? data : (data.jobs || []);
          if (jobs.length > 0) {
            console.log('Opening job modal with:', jobs[0]);
            onSelectJob(jobs[0]);
          } else {
            console.log('No jobs found in response');
          }
        }
      } catch (error) {
        console.error('Error fetching item details:', error);
        // Don't open new tab - just show error in console
        alert('Unable to load details for this item. Please try again.');
      }
    } else {
      console.log('Missing scam_identifier:', { 
        scam_identifier: report.scam_identifier 
      });
    }
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
      onClick={handleCardClick}
    >
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
          {report.project_name && (
            <div className="mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                {report.item_type === 'project' ? '📋' : '💼'} {report.project_name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center gap-1">
              <FaClock className="h-3 w-3" />
              {formatDate(report.created_at)}
            </span>
            <span className="capitalize">{report.scam_type.replace('_', ' ')}</span>
            <span className="font-mono text-xs bg-gray-500 text-white px-3 py-1 rounded-full">
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
          {isArchived ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onProcess(report.id, 'restore', report.scam_identifier)}
                disabled={loading}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center gap-1"
              >
                <FaArchive className="h-3 w-3" />
                Unarchive
              </button>
              <button
                onClick={() => onProcess(report.id, 'delete', report.scam_identifier)}
                disabled={loading}
                className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 flex items-center gap-1"
              >
                <FaTrash className="h-3 w-3" />
                Remove
              </button>
              <button
                onClick={() => onDeleteConfirm({show: true, type: 'item', id: report.id, itemId: report.scam_identifier})}
                disabled={loading}
                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-1"
              >
                <FaTrashAlt className="h-3 w-3" />
                Delete
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onProcess(report.id, 'pause', report.scam_identifier)}
                disabled={loading}
                className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200 flex items-center gap-1"
              >
                <FaClock className="h-3 w-3" />
                Pause
              </button>
              <button
                onClick={() => onProcess(report.id, 'archive', report.scam_identifier)}
                disabled={loading}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center gap-1"
              >
                <FaArchive className="h-3 w-3" />
                Archive
              </button>
              <button
                onClick={() => onProcess(report.id, 'delete', report.scam_identifier)}
                disabled={loading}
                className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 flex items-center gap-1"
              >
                <FaTrash className="h-3 w-3" />
                Remove
              </button>
              <button
                onClick={() => onDeleteConfirm({show: true, type: 'item', id: report.id, itemId: report.scam_identifier})}
                disabled={loading}
                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-1"
              >
                <FaTrashAlt className="h-3 w-3" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Paused Item Card Component
const PausedItemCard: React.FC<{
  item: any;
  onRestore: (itemId: string, itemType: 'project' | 'job') => Promise<void>;
  loading: boolean;
  onSelectProject: (project: any) => void;
  onSelectJob: (job: any) => void;
  onDeleteConfirm: (confirm: {show: boolean, type: 'report' | 'item', id: string, itemId?: string}) => void;
}> = ({ item, onRestore, loading, onSelectProject, onSelectJob, onDeleteConfirm }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    // Don't trigger if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (item.id) {
      try {
        // Fetch the full project/job data for the modal
        if (item.type === 'project') {
          const response = await fetch(`/api/projects?id=${item.id}`);
          const data = await response.json();
          const projects = Array.isArray(data) ? data : (data.projects || []);
          if (projects.length > 0) {
            onSelectProject(projects[0]);
          }
        } else if (item.type === 'job') {
          const response = await fetch(`/api/jobs?id=${item.id}`);
          const data = await response.json();
          const jobs = Array.isArray(data) ? data : (data.jobs || []);
          if (jobs.length > 0) {
            onSelectJob(jobs[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching item details:', error);
        alert('Unable to load details for this item. Please try again.');
      }
    }
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
              {item.type.toUpperCase()}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-white">
              PAUSED
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center gap-1">
              <FaClock className="h-3 w-3" />
              {formatDate(item.updated_at || item.created_at)}
            </span>
            {item.type === 'project' && item.category && (
              <span className="capitalize">{item.category}</span>
            )}
            {item.type === 'job' && item.company && (
              <span>{item.company}</span>
            )}
            <span className="font-mono text-xs bg-gray-500 text-white px-3 py-1 rounded-full">
              ID: {item.id.slice(0, 8)}...
            </span>
          </div>
          <p className="text-gray-700 text-sm mb-4 line-clamp-2">{item.description}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {item.type === 'project' ? 'Project' : 'Job'} ID: {item.id.slice(0, 8)}...
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRestore(item.id, item.type)}
            disabled={loading}
            className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center gap-1"
          >
            <FaPlay className="h-3 w-3" />
            Resume
          </button>
          <button
            onClick={() => onDeleteConfirm({show: true, type: 'item', id: item.id, itemId: item.id})}
            disabled={loading}
            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-1"
          >
            <FaTrashAlt className="h-3 w-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// Pricing Settings Component
const PricingSettings: React.FC<{
  settings: any;
  onUpdate: (settings: any) => Promise<void>;
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
              <FaCoins className="h-6 w-6 text-blue-600" />
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
              <FaInfoCircle className="h-5 w-5 text-blue-600" />
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
