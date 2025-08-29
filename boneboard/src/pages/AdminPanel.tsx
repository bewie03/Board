import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShieldAlt, FaChartBar, FaExclamationTriangle, FaDollarSign, FaTrash, FaPause, FaBuilding, FaGlobe, FaTwitter, FaDiscord, FaTimes, FaEnvelope, FaCalendarAlt, FaExternalLinkAlt, FaMapMarkerAlt, FaCoins, FaBriefcase, FaInfoCircle } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';
import PageTransition from '../components/PageTransition';


const AdminPanel: React.FC = () => {
  const { walletAddress } = useWallet();
  const [activeTab, setActiveTab] = useState<'reports' | 'pricing'>('reports');
  const [reportedItems, setReportedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [showReportSidePanel, setShowReportSidePanel] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, type: 'report' | 'item', id: string, itemId?: string} | null>(null);
  const [reportsSearchTerm, setReportsSearchTerm] = useState('');
  const [reportsSortBy, setReportsSortBy] = useState<'newest' | 'oldest' | 'severity'>('newest');
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
    if (walletAddress === ADMIN_WALLET) {
      loadReportedItems();
      loadSettings();
    }
  }, [walletAddress]);

  useEffect(() => {
    if (activeTab === 'pricing') {
      loadSettings();
    } else if (activeTab === 'reports') {
      loadReportedItems();
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


  const loadReportedItems = async () => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Loading reported items...');
      
      // Fetch all reports first (both pending and verified to show paused items)
      const reportsResponse = await fetch('/api/reports', {
        headers: { 'x-wallet-address': walletAddress }
      });
      
      if (!reportsResponse.ok) {
        throw new Error(`HTTP error! status: ${reportsResponse.status}`);
      }
      
      const reportsData = await reportsResponse.json();
      const allReports = reportsData.reports || [];
      console.log('All reports loaded:', allReports);
      
      // Group reports by scam_identifier (project/job ID)
      const reportsByItem = new Map();
      allReports.forEach((report: any) => {
        const itemId = report.scam_identifier;
        if (!reportsByItem.has(itemId)) {
          reportsByItem.set(itemId, []);
        }
        reportsByItem.get(itemId).push(report);
      });
      
      // Fetch project and job details for each reported item
      const reportedItems = [];
      for (const [itemId, reports] of reportsByItem.entries()) {
        const firstReport = reports[0];
        let itemData = null;
        
        try {
          // Try to fetch as project first
          const projectResponse = await fetch(`/api/projects?id=${itemId}`);
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            const projects = Array.isArray(projectData) ? projectData : (projectData.projects || []);
            if (projects.length > 0) {
              itemData = { ...projects[0], type: 'project' };
            }
          }
          
          // If not found as project, try as job
          if (!itemData) {
            const jobResponse = await fetch(`/api/jobs?id=${itemId}`);
            if (jobResponse.ok) {
              const jobData = await jobResponse.json();
              const jobs = Array.isArray(jobData) ? jobData : (jobData.jobs || []);
              if (jobs.length > 0) {
                itemData = { ...jobs[0], type: 'job' };
              }
            }
          }
          
          // If we found the item, add it with its reports
          if (itemData) {
            reportedItems.push({
              ...itemData,
              reports: reports,
              reportCount: reports.length,
              primaryReport: firstReport
            });
          } else {
            // If item not found, create a placeholder from report data
            reportedItems.push({
              id: itemId,
              title: firstReport.project_name || firstReport.title || 'Unknown Item',
              description: firstReport.description || 'No description available',
              type: firstReport.item_type || 'project',
              created_at: firstReport.created_at,
              reports: reports,
              reportCount: reports.length,
              primaryReport: firstReport,
              isPlaceholder: true
            });
          }
        } catch (error) {
          console.error(`Error fetching details for item ${itemId}:`, error);
        }
      }
      
      console.log('Reported items processed:', reportedItems);
      setReportedItems(reportedItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load reported items');
      console.error('Error loading reported items:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleProcessReport = async (reportId: string, action: 'pause' | 'delete' | 'restore' | 'permanent_delete', projectId?: string) => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      console.log(`[FRONTEND] Processing report ${reportId} with action: ${action}, projectId: ${projectId}`);
      
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
        const errorText = await response.text();
        console.error('[FRONTEND] API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[FRONTEND] API Response:', result);
      
      // Reload all relevant data
      console.log('[FRONTEND] Reloading all data...');
      await loadReportedItems();
      console.log('[FRONTEND] All data reloaded successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to process report');
      console.error('[FRONTEND] Error processing report:', err);
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
                    <span className="text-sm font-medium text-red-800">{reportedItems.length} Items</span>
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
                {reportedItems.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FaExclamationTriangle className="h-10 w-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reported Items</h3>
                    <p className="text-blue-600">No projects or jobs have been reported yet</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {reportedItems
                      .filter(item => {
                        const matchesSearch = item.title?.toLowerCase().includes(reportsSearchTerm.toLowerCase()) ||
                          item.description?.toLowerCase().includes(reportsSearchTerm.toLowerCase()) ||
                          item.company?.toLowerCase().includes(reportsSearchTerm.toLowerCase());
                        const matchesSeverity = severityFilter === 'all' || 
                          item.reports?.some((report: any) => report.severity === severityFilter);
                        return matchesSearch && matchesSeverity;
                      })
                      .sort((a, b) => {
                        if (reportsSortBy === 'oldest') {
                          return new Date(a.created_at || a.createdAt).getTime() - new Date(b.created_at || b.createdAt).getTime();
                        } else if (reportsSortBy === 'severity') {
                          const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                          const aMaxSeverity = Math.max(...(a.reports?.map((r: any) => severityOrder[r.severity as keyof typeof severityOrder] || 0) || [0]));
                          const bMaxSeverity = Math.max(...(b.reports?.map((r: any) => severityOrder[r.severity as keyof typeof severityOrder] || 0) || [0]));
                          return bMaxSeverity - aMaxSeverity;
                        } else {
                          return new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime();
                        }
                      })
                      .map((item) => (
                        <ReportedItemCard 
                          key={item.id} 
                          item={item} 
                          onPause={(itemId) => handleProcessReport(item.primaryReport?.id, 'pause', itemId)}
                          onDelete={(itemId) => setDeleteConfirm({show: true, type: 'item', id: itemId, itemId})}
                          onShowReports={(item) => {
                            setSelectedReport({
                              ...item.primaryReport,
                              itemType: item.type,
                              itemTitle: item.title,
                              allReports: item.reports || [],
                              website: item.website,
                              twitter: item.twitter,
                              discord: item.discord
                            });
                            setShowReportSidePanel(true);
                          }}
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

      {/* Report Side Panel */}
      <AnimatePresence>
        {showReportSidePanel && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end"
            onClick={() => setShowReportSidePanel(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedReport.itemTitle}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600 capitalize">
                          {selectedReport.itemType} Report
                        </span>
                        {selectedReport.allReports && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {selectedReport.allReports.length} Report{selectedReport.allReports.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowReportSidePanel(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FaTimes className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {/* Social Links */}
                  <div className="flex space-x-3">
                    {selectedReport.website && (
                      <a href={selectedReport.website} target="_blank" rel="noopener noreferrer" 
                         className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors">
                        <FaGlobe className="h-4 w-4" />
                      </a>
                    )}
                    {selectedReport.twitter && (
                      <a href={typeof selectedReport.twitter === 'string' ? selectedReport.twitter : `https://twitter.com/${selectedReport.twitter.username}`} 
                         target="_blank" rel="noopener noreferrer"
                         className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors">
                        <FaTwitter className="h-4 w-4" />
                      </a>
                    )}
                    {selectedReport.discord && (
                      <a href={typeof selectedReport.discord === 'string' ? selectedReport.discord : selectedReport.discord.inviteUrl} 
                         target="_blank" rel="noopener noreferrer"
                         className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors">
                        <FaDiscord className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Report Info */}
                <div className="space-y-6">

                  {/* Individual Reports */}
                  {selectedReport.allReports && selectedReport.allReports.length > 0 ? (
                    selectedReport.allReports.map((report: any, index: number) => (
                      <div key={report.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-medium text-gray-900">Report #{index + 1}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            report.severity === 'high' ? 'bg-red-500 text-white' :
                            report.severity === 'medium' ? 'bg-yellow-500 text-white' :
                            report.severity === 'low' ? 'bg-green-500 text-white' :
                            'bg-purple-600 text-white'
                          }`}>
                            {report.severity?.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <h5 className="font-medium text-gray-900 mb-2">{report.title}</h5>
                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">{report.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                          <span className="capitalize">{report.scam_type}</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded-full ${
                            report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            report.status === 'verified' ? 'bg-green-100 text-green-800' :
                            report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {report.status?.toUpperCase()}
                          </span>
                        </div>
                        
                        {/* Evidence for this report */}
                        {report.evidence_urls && report.evidence_urls.length > 0 && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-700 mb-2">Evidence:</h6>
                            <div className="space-y-1">
                              {report.evidence_urls.map((url: string, urlIndex: number) => (
                                <a
                                  key={urlIndex}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
                                >
                                  <FaExternalLinkAlt className="h-2 w-2 flex-shrink-0" />
                                  Evidence {urlIndex + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium text-gray-900">Report #1</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          selectedReport.severity === 'high' ? 'bg-red-500 text-white' :
                          selectedReport.severity === 'medium' ? 'bg-yellow-500 text-white' :
                          selectedReport.severity === 'low' ? 'bg-green-500 text-white' :
                          'bg-purple-600 text-white'
                        }`}>
                          {selectedReport.severity?.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(selectedReport.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h5 className="font-medium text-gray-900 mb-2">{selectedReport.title}</h5>
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">{selectedReport.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                        <span className="capitalize">{selectedReport.scam_type}</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          selectedReport.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedReport.status === 'verified' ? 'bg-green-100 text-green-800' :
                          selectedReport.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedReport.status?.toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Evidence */}
                      {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                        <div>
                          <h6 className="text-xs font-medium text-gray-700 mb-2">Evidence:</h6>
                          <div className="space-y-1">
                            {selectedReport.evidence_urls.map((url: string, index: number) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
                              >
                                <FaExternalLinkAlt className="h-2 w-2 flex-shrink-0" />
                                Evidence {index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </PageTransition>
  );
};


// Reported Item Card Component (styled like MyJobs/MyProjects)
const ReportedItemCard: React.FC<{
  item: any;
  onPause: (itemId: string, itemType: 'project' | 'job') => void;
  onDelete: (itemId: string, itemType: 'project' | 'job') => void;
  onShowReports: (item: any) => void;
  loading: boolean;
}> = ({ item, onPause, onDelete, onShowReports, loading }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString();
  };


  const handleCardClick = () => {
    onShowReports(item);
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-300"
      onClick={handleCardClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {/* Circular Avatar */}
          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {item.avatar || item.logo || item.companyLogo || item.company_logo ? (
              <img 
                src={item.avatar || item.logo || item.companyLogo || item.company_logo} 
                alt={`${item.title} logo`}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="text-blue-600 text-lg flex items-center justify-center w-full h-full"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                  }
                }}
              />
            ) : (
              <FaBuilding className="text-blue-600 text-lg" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900 truncate">{item.title}</h3>
              {item.isVerified && (
                <div 
                  className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0"
                  title="Verified project"
                >
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {item.type === 'project' ? item.category : item.company}
              </span>
              <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                {item.reportCount || 1} Report{(item.reportCount || 1) > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPause(item.id, item.type);
              }}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
              title="Pause item"
            >
              <FaPause className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id, item.type);
              }}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete item"
            >
              <FaTrash className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description}
        </p>
        
        <div className="text-xs text-gray-500">
          Created {formatDate(item.created_at || item.createdAt)}
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
