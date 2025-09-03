import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEdit, FaTimes, FaGlobe, FaDiscord, FaBuilding, FaSave, FaMapMarkerAlt, FaClock, FaCoins, FaDollarSign, FaExternalLinkAlt, FaTrash } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useWallet } from '../../contexts/WalletContext';
import { ProjectService, Project } from '../../services/projectService';
import { JobService } from '../../services/jobService';
import { toast } from 'react-toastify';
import { initiateTwitterOAuth } from '../../utils/auth';
import PageTransition from '../../components/PageTransition';
import CustomSelect from '../../components/CustomSelect';
import { Link } from 'react-router-dom';
import { PROJECT_CATEGORIES } from '../../constants/categories';

const MyProjects: React.FC = () => {
  const { isConnected, walletAddress } = useWallet();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Project>>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
    associatedJobsCount: number;
  } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<'twitter' | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [lineCount, setLineCount] = useState(1);

  // Helper function to get job count for a project
  const getProjectJobCount = (project: Project) => {
    const projectName = project.title || project.name;
    return allJobs.filter(job => 
      job.company && projectName && (
        job.company.toLowerCase().includes(projectName.toLowerCase()) ||
        projectName.toLowerCase().includes(job.company.toLowerCase())
      )
    ).length;
  };

  useEffect(() => {
    const fetchUserProjects = async () => {
      if (isConnected && walletAddress) {
        try {
          const userProjects = await ProjectService.getProjectsByWallet(walletAddress);
          setProjects(userProjects);
          
          // Load all jobs to show related ones
          const fetchedJobs = await JobService.getActiveJobs();
          setAllJobs(fetchedJobs);
        } catch (error) {
          console.error('Error fetching user projects:', error);
        }
      } else {
        setProjects([]);
        setAllJobs([]);
      }
      setLoading(false);
    };

    fetchUserProjects();
  }, [isConnected, walletAddress]);

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    const description = project.description || '';
    setEditFormData({
      name: project.title || project.name,
      description: description,
      website: project.website,
      category: project.category,
      logo: project.logo,
      twitter: typeof project.twitter === 'object' ? project.twitter : {
        username: project.twitterLink || (typeof project.twitter === 'string' ? project.twitter : ''),
        verified: false,
        id: '',
        profileImageUrl: ''
      },
      discord: project.discordLink || (typeof project.discord === 'string' ? project.discord : (typeof project.discord === 'object' && project.discord?.inviteUrl ? project.discord.inviteUrl : ''))
    });
    setLogoPreview(project.logo || null);
    setCharacterCount(description.length);
    setLineCount(description.split('\n').length);
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;

    try {
      const success = await ProjectService.updateProject(editingProject.id, editFormData);
      if (success) {
        // Refresh projects list
        const updatedProjects = await ProjectService.getProjectsByWallet(walletAddress!);
        setProjects(updatedProjects);
        setEditingProject(null);
        setEditFormData({});
        setLogoPreview(null);
        toast.success('Project updated successfully!');
      } else {
        toast.error('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditFormData({});
    setLogoPreview(null);
  };

  const handleDeleteProject = (projectId: string) => {
    // Count jobs associated with this project
    const associatedJobs = allJobs.filter(job => job.project_id === projectId || job.selected_project_id === projectId);
    const project = projects.find(p => p.id === projectId);
    
    setProjectToDelete({
      id: projectId,
      name: project?.title || project?.name || 'this project',
      associatedJobsCount: associatedJobs.length
    });
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    const { id: projectId, associatedJobsCount } = projectToDelete;
    try {
      const success = await ProjectService.deleteProject(projectId);
      if (success) {
        // Refresh projects list
        const updatedProjects = await ProjectService.getProjectsByWallet(walletAddress!);
        setProjects(updatedProjects);
        
        // Refresh jobs list to reflect deletions
        const fetchedJobs = await JobService.getActiveJobs();
        setAllJobs(fetchedJobs);
        
        if (associatedJobsCount > 0) {
          toast.success(`Project and ${associatedJobsCount} associated job${associatedJobsCount > 1 ? 's' : ''} deleted successfully!`);
        } else {
          toast.success('Project deleted successfully!');
        }
      } else {
        toast.error('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setShowDeleteModal(false);
      setProjectToDelete(null);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size should not exceed 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setEditFormData(prev => ({ ...prev, logo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTwitterAuth = async () => {
    try {
      setIsAuthenticating('twitter');
      
      const twitterData = await initiateTwitterOAuth();
      
      setEditFormData(prev => ({
        ...prev,
        twitter: {
          username: twitterData.username,
          verified: true,
          id: twitterData.id,
          profileImageUrl: twitterData.profileImageUrl || ''
        }
      }));
      
      toast.success('Twitter account connected successfully!');
    } catch (err) {
      console.error('Twitter auth error:', err);
      toast.error('Failed to authenticate with Twitter. Please try again.');
    } finally {
      setIsAuthenticating(null);
    }
  };

  const removeTwitterAuth = () => {
    setEditFormData(prev => ({
      ...prev,
      twitter: {
        username: '',
        verified: false,
        id: '',
        profileImageUrl: ''
      }
    }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const lines = value.split('\n');
    
    // Enforce 500 character limit
    if (value.length > 500) {
      return;
    }
    
    // Enforce 8 line limit
    if (lines.length > 8) {
      return;
    }
    
    setEditFormData(prev => ({ ...prev, description: value }));
    setCharacterCount(value.length);
    setLineCount(lines.length);
  };

  if (!isConnected) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              My Projects
              <div className="group relative ml-2">
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Project Management:</p>
                    <p>• Edit project details anytime</p>
                    <p>• Create funding campaigns for projects</p>
                    <p>• Link jobs to verified projects</p>
                    <p>• Projects stay permanent once created</p>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </h1>
              <p className="mt-1 text-sm text-gray-500">Manage your project listings and funding</p>
            </div>
            
            <div className="p-6">
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Connect Your Wallet</h3>
                <p className="mt-1 text-sm text-gray-500">Connect your wallet to view and manage your projects.</p>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              My Projects
              <div className="group relative ml-2">
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Project Management:</p>
                    <p>• Edit project details anytime</p>
                    <p>• Create funding campaigns for projects</p>
                    <p>• Link jobs to verified projects</p>
                    <p>• Projects stay permanent once created</p>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </h1>
            <p className="mt-1 text-sm text-gray-500">Manage your project listings and funding</p>
          </div>
          
          <div className="p-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your projects...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              My Projects
              <div className="group relative ml-2">
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  <div className="max-w-xs">
                    <p className="font-semibold mb-1">Project Management:</p>
                    <p>• Edit project details anytime</p>
                    <p>• Create funding campaigns for projects</p>
                    <p>• Link jobs to verified projects</p>
                    <p>• Projects stay permanent once created</p>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </h1>
            <p className="mt-1 text-sm text-gray-500">Manage your project listings and funding</p>
          </div>
        
          <div className="p-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No projects yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
              <div className="mt-6">
                <Link
                  to="/projects/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 01-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Project
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} found
                </p>
                <Link
                  to="/projects/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 01-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Project
                </Link>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => (
                  <motion.div 
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: index * 0.1,
                      ease: 'easeOut'
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedProject(project)}
                    className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative overflow-hidden"
                  >
                    {/* Edit and Delete buttons - positioned absolutely */}
                    <div className="absolute top-3 right-3 flex space-x-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProject(project);
                        }}
                        className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition-all duration-200 shadow-sm"
                        title="Edit project"
                      >
                        <FaEdit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-gray-400 hover:text-red-600 hover:bg-white transition-all duration-200 shadow-sm"
                        title="Delete project"
                      >
                        <FaTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="p-4">
                      {/* Logo and Title Section */}
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                          {project.logo ? (
                            <img 
                              src={project.logo} 
                              alt={`${project.name} logo`}
                              className="w-full h-full rounded-xl object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="text-blue-600 text-lg"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                                }
                              }}
                            />
                          ) : (
                            <FaBuilding className="text-blue-600 text-lg" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{project.title || project.name}</h3>
                            {project.isVerified && (
                              <div 
                                className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0"
                                title="Verified project"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {project.category}
                          </span>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                        {project.description}
                      </p>
                      
                      {/* Bottom Section */}
                      <div className="flex items-center justify-between">
                        {/* Social Links */}
                        <div className="flex items-center space-x-2">
                          {project.website && (
                            <a 
                              href={project.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Website"
                            >
                              <FaGlobe className="h-4 w-4" />
                            </a>
                          )}
                          {/* Twitter - check both object with verified and string formats */}
                          {((typeof project.twitter === 'object' && project.twitter?.username) || 
                            (typeof project.twitter === 'string' && project.twitter) ||
                            project.twitterLink) && (
                            <a 
                              href={
                                typeof project.twitter === 'object' && project.twitter?.username
                                  ? `https://twitter.com/${project.twitter.username}`
                                  : typeof project.twitter === 'string' && project.twitter
                                    ? project.twitter.startsWith('http') ? project.twitter : `https://twitter.com/${project.twitter}`
                                    : project.twitterLink?.startsWith('http') ? project.twitterLink : `https://twitter.com/${project.twitterLink}`
                              }
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Twitter"
                            >
                              <FaXTwitter className="h-4 w-4" />
                            </a>
                          )}
                          {/* Discord - check both object and string formats */}
                          {((typeof project.discord === 'object' && project.discord?.inviteUrl) ||
                            (typeof project.discord === 'string' && project.discord) ||
                            project.discordLink) && (
                            <a 
                              href={
                                typeof project.discord === 'object' && project.discord?.inviteUrl
                                  ? project.discord.inviteUrl
                                  : typeof project.discord === 'string' && project.discord
                                    ? project.discord
                                    : project.discordLink || ''
                              }
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Discord"
                            >
                              <FaDiscord className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        
                        {/* Jobs Count */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{getProjectJobCount(project)}</div>
                          <div className="text-xs text-gray-500">jobs</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Edit Project Side Panel */}
      <AnimatePresence>
        {editingProject && (
          <>
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={handleCancelEdit}
            />
            
            {/* Side Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 overflow-y-auto scrollbar-hide" 
              style={{ top: '0px' }}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center bg-white">
                        {logoPreview || editingProject.logo ? (
                          <img 
                            className="h-full w-full rounded-xl object-cover" 
                            src={logoPreview || editingProject.logo || ''} 
                            alt={`${editingProject.name} logo`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="text-blue-600 text-xl"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                              }
                            }}
                          />
                        ) : (
                          <FaBuilding className="text-blue-600 text-xl" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h2 className="text-2xl font-bold text-gray-900">{editingProject.title || editingProject.name}</h2>
                          {editingProject.isVerified && (
                            <div 
                              className="ml-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center"
                              title="Verified project"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <CustomSelect
                            options={[
                              { value: '', label: 'Select a category' },
                              ...PROJECT_CATEGORIES.map(category => ({
                                value: category,
                                label: category
                              }))
                            ]}
                            value={editFormData.category || ''}
                            onChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleCancelEdit}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <FaTimes className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-6 space-y-8">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Project Description *
                    </label>
                    <div className="relative">
                      <textarea
                        value={editFormData.description || ''}
                        onChange={handleDescriptionChange}
                        rows={8}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Describe your project in detail..."
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                        {characterCount}/500 chars • {lineCount}/8 lines
                      </div>
                    </div>
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={editFormData.website || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://your-project.com"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Project Logo
                    </label>
                    <div className="flex items-center space-x-4">
                      {logoPreview && (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-20 h-20 rounded-xl object-cover border border-gray-200"
                        />
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaXTwitter className="inline h-4 w-4 mr-2 text-blue-400" />
                          Twitter Verification {typeof editFormData.twitter === 'object' && editFormData.twitter?.verified && <span className="text-green-500 ml-1">✓</span>}
                        </label>
                        {typeof editFormData.twitter === 'object' && editFormData.twitter?.verified ? (
                          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center">
                              {editFormData.twitter.profileImageUrl ? (
                                <img
                                  src={editFormData.twitter.profileImageUrl}
                                  alt="Twitter profile"
                                  className="h-8 w-8 rounded-full mr-3"
                                />
                              ) : (
                                <FaXTwitter className="h-5 w-5 text-blue-500 mr-2" />
                              )}
                              <span className="text-sm font-medium text-gray-900">
                                Connected as @{editFormData.twitter.username}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={removeTwitterAuth}
                              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                              disabled={isAuthenticating === 'twitter'}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleTwitterAuth}
                              disabled={isAuthenticating === 'twitter'}
                              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FaXTwitter className="w-5 h-5 mr-2 text-gray-900" />
                              {isAuthenticating === 'twitter' ? 'Connecting...' : 'Connect with Twitter'}
                            </button>
                            <p className="mt-1 text-xs text-gray-500">
                              We'll verify your Twitter account ownership
                            </p>
                          </>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FaDiscord className="inline h-4 w-4 mr-2 text-indigo-500" />
                          Discord Server Invite
                        </label>
                        <input
                          type="text"
                          value={typeof editFormData.discord === 'object' ? editFormData.discord?.inviteUrl || '' : editFormData.discord || ''}
                          onChange={(e) => setEditFormData(prev => ({ 
                            ...prev, 
                            discord: e.target.value
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://discord.gg/invite-code"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={handleCancelEdit}
                      className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    >
                      <FaTimes className="h-4 w-4 mr-2 inline" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center transition-colors"
                    >
                      <FaSave className="h-4 w-4 mr-2" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <>
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setSelectedProject(null)}
            />
            
            {/* Modal */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
              className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-xl z-50 overflow-y-auto scrollbar-hide" 
              style={{ top: '0px' }}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center bg-white">
                        {selectedProject!.logo ? (
                          <img 
                            className="h-full w-full rounded-xl object-cover" 
                            src={selectedProject!.logo} 
                            alt={`${selectedProject!.name} logo`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const parent = (e.target as HTMLImageElement).parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="text-blue-600 text-xl"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h8z" clip-rule="evenodd"></path></svg></div>';
                              }
                            }}
                          />
                        ) : (
                          <FaBuilding className="text-blue-600 text-xl" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h2 className="text-2xl font-bold text-gray-900">{selectedProject!.title || selectedProject!.name}</h2>
                          {selectedProject!.isVerified && (
                            <div 
                              className="ml-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center"
                              title="Verified project"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mt-1">
                          {selectedProject!.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <FaTimes className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 py-6 space-y-8">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">About {selectedProject!.title || selectedProject!.name}</h3>
                    <p className="text-gray-700 leading-relaxed">{selectedProject!.description}</p>
                  </div>

                  {/* Links */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Links & Social</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedProject!.website && (
                        <a 
                          href={selectedProject!.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaGlobe className="h-5 w-5 text-gray-600 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Website</div>
                            <div className="text-xs text-gray-500">Visit site</div>
                          </div>
                          <FaExternalLinkAlt className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      )}
                      {(typeof selectedProject!.twitter === 'object' && selectedProject!.twitter?.verified) && (
                        <a 
                          href={`https://twitter.com/${selectedProject!.twitter.username}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaXTwitter className="h-5 w-5 text-blue-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">X (Twitter)</div>
                            <div className="text-xs text-gray-500">Follow us</div>
                          </div>
                          <FaExternalLinkAlt className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      )}
                      {(typeof selectedProject!.discord === 'object' && selectedProject!.discord?.verified) && (
                        <a 
                          href={selectedProject!.discord.inviteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <FaDiscord className="h-5 w-5 text-indigo-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Discord</div>
                            <div className="text-xs text-gray-500">Join server</div>
                          </div>
                          <FaExternalLinkAlt className="h-3 w-3 text-gray-400 ml-auto" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Related Jobs */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Available Jobs ({(() => {
                        const projectName = selectedProject!.title || selectedProject!.name;
                        return allJobs.filter(job => 
                          job.company && projectName && (
                            job.company.toLowerCase().includes(projectName.toLowerCase()) ||
                            projectName.toLowerCase().includes(job.company.toLowerCase())
                          )
                        ).length;
                      })()})
                    </h3>
                    <div className="space-y-4">
                      {(() => {
                        const projectName = selectedProject!.title || selectedProject!.name;
                        return allJobs.filter(job => 
                          job.company && projectName && (
                            job.company.toLowerCase().includes(projectName.toLowerCase()) ||
                            projectName.toLowerCase().includes(job.company.toLowerCase())
                          )
                        );
                      })()
                        .map((job) => (
                          <Link
                            key={job.id}
                            to={`/jobs/${job.id}`}
                            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                                  {job.title}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1">{job.company}</p>
                                <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <FaMapMarkerAlt className="h-3 w-3 mr-1" />
                                    {job.workArrangement || 'Remote'}
                                  </span>
                                  <span className="flex items-center">
                                    <FaClock className="h-3 w-3 mr-1" />
                                    {job.type || 'Full-time'}
                                  </span>
                                  <span className="flex items-center">
                                    {job.salaryType === 'ADA' ? (
                                      <FaCoins className="h-3 w-3 mr-1" />
                                    ) : (
                                      <FaDollarSign className="h-3 w-3 mr-1" />
                                    )}
                                    {job.salary || 'Competitive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                  {job.description}
                                </p>
                              </div>
                              <div className="ml-4 text-xs text-blue-600 font-medium">
                                View Job →
                              </div>
                            </div>
                          </Link>
                        ))
                      }
                      {(() => {
                        const projectName = selectedProject!.title || selectedProject!.name;
                        return allJobs.filter(job => 
                          job.company && projectName && (
                            job.company.toLowerCase().includes(projectName.toLowerCase()) ||
                            projectName.toLowerCase().includes(job.company.toLowerCase())
                          )
                        ).length === 0;
                      })() && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No jobs currently available for this project.</p>
                          <Link 
                            to="/jobs" 
                            className="text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block"
                          >
                            Browse all jobs →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && projectToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <FaTrash className="text-red-600 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete <strong>{projectToDelete.name}</strong>?
                </p>
                
                {projectToDelete.associatedJobsCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-800 font-medium mb-2">
                      This will also delete {projectToDelete.associatedJobsCount} job listing{projectToDelete.associatedJobsCount > 1 ? 's' : ''} associated with this project!
                    </p>
                  </div>
                )}
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• This action CANNOT be undone</li>
                    <li>• You will NOT receive any refunds</li>
                    <li>• All data will be permanently lost</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProjectToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteProject}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete Project
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default MyProjects;
