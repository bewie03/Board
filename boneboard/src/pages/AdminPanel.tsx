import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaProjectDiagram, FaBriefcase, FaChartBar, FaExclamationTriangle, FaArchive, FaClock, FaTrash, FaShieldAlt, FaDollarSign, FaBug, FaTimes, FaGlobe, FaExternalLinkAlt, FaEnvelope, FaCalendarAlt, FaMapMarkerAlt, FaPlay } from 'react-icons/fa';
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
  const [activeTab, setActiveTab] = useState('reports');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [archivedReports, setArchivedReports] = useState<ScamReport[]>([]);
  const [pausedItems, setPausedItems] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [settings, setSettings] = useState<any>({
    projectListingFee: 0,
    jobListingFee: 0,
    maxProjectDuration: 365,
    maxJobDuration: 30,
    enablePayments: true,
    maintenanceMode: false
  });

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
      // Fetch paused projects and jobs
      const [pausedProjects, pausedJobs] = await Promise.all([
        fetch('/api/projects?status=paused', {
          headers: { 'x-wallet-address': walletAddress }
        }).then(res => res.json()),
        fetch('/api/jobs?status=paused', {
          headers: { 'x-wallet-address': walletAddress }
        }).then(res => res.json())
      ]);
      
      const combined = [
        ...(pausedProjects.projects || []).map((p: any) => ({ ...p, type: 'project' })),
        ...(Array.isArray(pausedJobs) ? pausedJobs : []).map((j: any) => ({ ...j, type: 'job' }))
      ];
      
      setPausedItems(combined);
    } catch (err: any) {
      setError(err.message || 'Failed to load paused items');
      console.error('Error loading paused items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReport = async (reportId: string, action: 'pause' | 'delete' | 'archive' | 'restore', projectId?: string) => {
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
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress
        },
        body: JSON.stringify({
          id: itemId,
          status: itemType === 'project' ? 'active' : 'active'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await loadPausedItems();
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
                        onSelectProject={setSelectedProject}
                        onSelectJob={setSelectedJob}
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
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading paused items...</p>
                  </div>
                ) : pausedItems.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FaClock className="h-10 w-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Paused Items</h3>
                    <p className="text-blue-600">No projects or jobs are currently paused</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pausedItems.map((item) => (
                      <PausedItemCard 
                        key={item.id} 
                        item={item} 
                        onRestore={handleRestoreItem}
                        loading={loading}
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
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading archived reports...</p>
                  </div>
                ) : archivedReports.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FaArchive className="h-10 w-10 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Archived Reports</h3>
                    <p className="text-blue-600">No reports have been archived yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {archivedReports.map((report) => (
                      <ReportCard 
                        key={report.id} 
                        report={report} 
                        onProcess={handleProcessReport}
                        loading={false}
                        isArchived={true}
                        onSelectProject={setSelectedProject}
                        onSelectJob={setSelectedJob}
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
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedProject.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedProject.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedProject.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        selectedProject.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedProject.status}
                      </span>
                      <span className="text-sm text-gray-500">Project</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Project Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p className="text-gray-900">{selectedProject.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Budget</label>
                        <p className="text-gray-900">${selectedProject.budget}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Timeline</label>
                        <p className="text-gray-900">{selectedProject.timeline}</p>
                      </div>
                      {selectedProject.skills && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Required Skills</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedProject.skills.split(',').map((skill: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Creator</label>
                        <p className="text-gray-900">{selectedProject.wallet_address}</p>
                      </div>
                      {selectedProject.contact_email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900 flex items-center gap-2">
                            <FaEnvelope className="w-4 h-4" />
                            {selectedProject.contact_email}
                          </p>
                        </div>
                      )}
                      {selectedProject.website && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Website</label>
                          <p className="text-gray-900 flex items-center gap-2">
                            <FaGlobe className="w-4 h-4" />
                            <a href={selectedProject.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {selectedProject.website}
                            </a>
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Created</label>
                        <p className="text-gray-900 flex items-center gap-2">
                          <FaCalendarAlt className="w-4 h-4" />
                          {new Date(selectedProject.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <a
                      href={`/projects?id=${selectedProject.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FaExternalLinkAlt className="w-4 h-4" />
                      View Full Project
                    </a>
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
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedJob.title}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedJob.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedJob.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        selectedJob.status === 'filled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedJob.status}
                      </span>
                      <span className="text-sm text-gray-500">Job</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FaTimes className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Job Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p className="text-gray-900">{selectedJob.description}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Salary</label>
                        <p className="text-gray-900">${selectedJob.salary}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Job Type</label>
                        <p className="text-gray-900">{selectedJob.job_type}</p>
                      </div>
                      {selectedJob.location && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Location</label>
                          <p className="text-gray-900 flex items-center gap-2">
                            <FaMapMarkerAlt className="w-4 h-4" />
                            {selectedJob.location}
                          </p>
                        </div>
                      )}
                      {selectedJob.skills && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Required Skills</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedJob.skills.split(',').map((skill: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Company Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Company</label>
                        <p className="text-gray-900">{selectedJob.company_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Employer</label>
                        <p className="text-gray-900">{selectedJob.wallet_address}</p>
                      </div>
                      {selectedJob.contact_email && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Email</label>
                          <p className="text-gray-900 flex items-center gap-2">
                            <FaEnvelope className="w-4 h-4" />
                            {selectedJob.contact_email}
                          </p>
                        </div>
                      )}
                      {selectedJob.website && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Website</label>
                          <p className="text-gray-900 flex items-center gap-2">
                            <FaGlobe className="w-4 h-4" />
                            <a href={selectedJob.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {selectedJob.website}
                            </a>
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Posted</label>
                        <p className="text-gray-900 flex items-center gap-2">
                          <FaCalendarAlt className="w-4 h-4" />
                          {new Date(selectedJob.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <a
                      href={`/jobs?id=${selectedJob.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FaExternalLinkAlt className="w-4 h-4" />
                      View Full Job
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

// Report Card Component
const ReportCard: React.FC<{
  report: ScamReport;
  onProcess: (reportId: string, action: 'pause' | 'delete' | 'archive' | 'restore', projectId?: string) => Promise<void>;
  loading: boolean;
  isArchived?: boolean;
  onSelectProject: (project: any) => void;
  onSelectJob: (job: any) => void;
}> = ({ report, onProcess, loading, isArchived = false, onSelectProject, onSelectJob }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm';
      case 'medium': return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-sm';
      case 'low': return 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm';
      case 'critical': return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-sm';
      case 'verified': return 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm';
      case 'rejected': return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm';
      case 'resolved': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm';
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
    
    if (report.project_name && report.scam_identifier) {
      const itemType = report.item_type || (report.scam_type === 'project' ? 'project' : 'job');
      console.log('Fetching details for:', { itemType, id: report.scam_identifier });
      
      try {
        // Fetch the full project/job data for the modal
        if (itemType === 'project') {
          const response = await fetch(`/api/projects?id=${report.scam_identifier}`);
          const data = await response.json();
          console.log('Project API response:', data);
          // Handle both array and object response formats
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
          // Handle both array and object response formats
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
      console.log('Missing project_name or scam_identifier:', { 
        project_name: report.project_name, 
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
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
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
            <span className="font-mono text-xs bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-1 rounded-full shadow-sm">
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
            <button
              onClick={() => onProcess(report.id, 'restore', report.scam_identifier)}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all duration-200"
            >
              <FaPlay className="h-3 w-3" />
              Resume
            </button>
          ) : (
            <>
              <button
                onClick={() => onProcess(report.id, 'pause', report.scam_identifier)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all duration-200"
              >
                <FaClock className="h-3 w-3" />
                Pause
              </button>
              <button
                onClick={() => onProcess(report.id, 'archive', report.scam_identifier)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all duration-200"
              >
                <FaArchive className="h-3 w-3" />
                Archive
              </button>
              <button
                onClick={() => onProcess(report.id, 'delete', report.scam_identifier)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all duration-200"
              >
                <FaTrash className="h-3 w-3" />
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
}> = ({ item, onRestore, loading }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    if (item.id) {
      // Open the project/job in a new tab for review
      if (item.type === 'project') {
        window.open(`/projects?id=${item.id}`, '_blank');
      } else if (item.type === 'job') {
        window.open(`/jobs?id=${item.id}`, '_blank');
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
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {item.type.toUpperCase()}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
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
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
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
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 flex items-center gap-1"
          >
            <FaProjectDiagram className="h-3 w-3" />
            Restore
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
