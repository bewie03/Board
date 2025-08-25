import React, { useState, useEffect } from 'react';
import { FaRocket, FaCoins, FaUsers, FaCalendarAlt, FaPlus, FaWallet, FaThumbsUp, FaThumbsDown, FaTimes, FaDiscord, FaTwitter, FaExternalLinkAlt, FaCopy } from 'react-icons/fa';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { useWallet } from '../contexts/WalletContext';

interface Project {
  id: number;
  title: string;
  description: string;
  category: string;
  fundingGoal: number;
  currentFunding: number;
  backers: number;
  status: 'active' | 'funded' | 'expired';
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  logo?: string;
  fundingAddress?: string;
  discordLink?: string;
  twitterLink?: string;
}

const ProjectFunding: React.FC = () => {
  const { isConnected } = useWallet();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [fundingAmount, setFundingAmount] = useState('');

  // Sample projects data
  useEffect(() => {
    const sampleProjects: Project[] = [
      {
        id: 1,
        title: "Cardano DeFi Analytics Dashboard",
        description: "A comprehensive analytics platform for tracking DeFi protocols, liquidity pools, and yield farming opportunities across the Cardano ecosystem.",
        category: "DeFi",
        fundingGoal: 50000,
        currentFunding: 32500,
        fundingAddress: "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtpc5zdq",
        createdAt: "2024-01-15",
        backers: 47,
        status: 'active',
        upvotes: 142,
        downvotes: 8,
        userVote: null,
        logo: "https://via.placeholder.com/80x80/3b82f6/ffffff?text=DA",
        discordLink: "https://discord.gg/cardano-defi",
        twitterLink: "https://twitter.com/cardano_defi"
      },
      {
        id: 2,
        title: "NFT Marketplace for Cardano Artists",
        description: "A decentralized marketplace specifically designed for Cardano-based NFTs with advanced filtering, royalty management, and community features.",
        category: "NFT",
        fundingGoal: 75000,
        currentFunding: 75000,
        fundingAddress: "addr1qy3fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtpc5zdq",
        createdAt: "2024-01-10",
        backers: 89,
        status: 'funded',
        upvotes: 203,
        downvotes: 12,
        userVote: null,
        logo: "https://via.placeholder.com/80x80/8b5cf6/ffffff?text=NFT",
        discordLink: "https://discord.gg/cardano-nft",
        twitterLink: "https://twitter.com/cardano_nft"
      },
      {
        id: 3,
        title: "Smart Contract Security Auditing Tool",
        description: "Automated security analysis tool for Plutus smart contracts with vulnerability detection and best practice recommendations.",
        category: "Security",
        fundingGoal: 40000,
        currentFunding: 15750,
        fundingAddress: "addr1qz4fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtpc5zdq",
        createdAt: "2024-01-20",
        backers: 23,
        status: 'active',
        upvotes: 87,
        downvotes: 15,
        userVote: null,
        logo: "https://via.placeholder.com/80x80/10b981/ffffff?text=SEC",
        discordLink: "https://discord.gg/cardano-security",
        twitterLink: "https://twitter.com/cardano_security"
      }
    ];
    setProjects(sampleProjects);
  }, []);

  const handleFundProject = (projectId: number) => {
    if (!isConnected) {
      alert('Please connect your wallet to fund projects');
      return;
    }
    
    const amount = parseFloat(fundingAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid funding amount');
      return;
    }

    // In a real app, this would interact with Cardano blockchain
    setProjects(prev => prev.map(project => 
      project.id === projectId 
        ? { 
            ...project, 
            currentFunding: project.currentFunding + amount,
            backers: project.backers + 1,
            status: project.currentFunding + amount >= project.fundingGoal ? 'funded' : 'active'
          }
        : project
    ));
    
    setSelectedProject(null);
    setFundingAmount('');
    alert(`Successfully funded ₳${amount}!`);
  };

  const handleVote = (projectId: number, voteType: 'up' | 'down') => {
    if (!isConnected) {
      alert('Please connect your wallet to vote');
      return;
    }

    setProjects(prev => prev.map(project => {
      if (project.id === projectId) {
        const currentVote = project.userVote;
        let newUpvotes = project.upvotes;
        let newDownvotes = project.downvotes;
        let newUserVote: 'up' | 'down' | null = voteType;

        // Remove previous vote if exists
        if (currentVote === 'up') {
          newUpvotes--;
        } else if (currentVote === 'down') {
          newDownvotes--;
        }

        // Add new vote or remove if same vote
        if (currentVote === voteType) {
          newUserVote = null; // Remove vote if clicking same button
        } else {
          if (voteType === 'up') {
            newUpvotes++;
          } else {
            newDownvotes++;
          }
        }

        return {
          ...project,
          upvotes: newUpvotes,
          downvotes: newDownvotes,
          userVote: newUserVote
        };
      }
      return project;
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'funded': return 'text-blue-800 bg-blue-200';
      case 'expired': return 'text-blue-500 bg-blue-50';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFundingPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Funding</h1>
              <p className="text-gray-600">Support innovative Cardano projects with ADA funding</p>
            </div>
            
            {isConnected && (
              <button
                onClick={() => window.location.href = '/submit-project'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaPlus className="h-4 w-4 mr-2" />
                Submit Project
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaRocket className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                  <p className="text-gray-600">Total Projects</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaCoins className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">₳{projects.reduce((sum, p) => sum + p.currentFunding, 0).toLocaleString()}</p>
                  <p className="text-gray-600">Total Funded</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaUsers className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{projects.reduce((sum, p) => sum + p.backers, 0)}</p>
                  <p className="text-gray-600">Total Backers</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaCalendarAlt className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'active').length}</p>
                  <p className="text-gray-600">Active Projects</p>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setSelectedProject(project)}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {project.logo && (
                        <img
                          src={project.logo}
                          alt={`${project.title} logo`}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{project.category}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors">{project.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                  
                  {/* Voting Section */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(project.id, 'up');
                        }}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                          project.userVote === 'up' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <FaThumbsUp className="h-4 w-4" />
                        <span className="text-sm font-medium">{project.upvotes}</span>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(project.id, 'down');
                        }}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-colors ${
                          project.userVote === 'down' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <FaThumbsDown className="h-4 w-4" />
                        <span className="text-sm font-medium">{project.downvotes}</span>
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {Math.round((project.upvotes / (project.upvotes + project.downvotes)) * 100)}% positive
                    </div>
                  </div>
                  
                  {/* Funding Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>₳{project.currentFunding.toLocaleString()} raised</span>
                      <span>₳{project.fundingGoal.toLocaleString()} goal</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getFundingPercentage(project.currentFunding, project.fundingGoal)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>{project.backers} backers</span>
                      <span>{getFundingPercentage(project.currentFunding, project.fundingGoal).toFixed(1)}% funded</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    
                    <span className="text-xs text-blue-600 font-medium">Click to view details →</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Project Detail Side Panel */}
          {selectedProject && (
            <>
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => {
                  setSelectedProject(null);
                  setFundingAmount('');
                }}
              />
              
              {/* Side Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                      {selectedProject.logo && (
                        <img
                          src={selectedProject.logo}
                          alt={`${selectedProject.title} logo`}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      )}
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedProject.title}</h3>
                        <div className="flex items-center space-x-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedProject.status)}`}>
                            {selectedProject.status.charAt(0).toUpperCase() + selectedProject.status.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">{selectedProject.category}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProject(null);
                        setFundingAmount('');
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FaTimes className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                
                  <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed">{selectedProject.description}</p>
                  </div>
                  
                  {/* Social Links */}
                  {(selectedProject.discordLink || selectedProject.twitterLink) && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Connect with the Team</h4>
                      <div className="flex space-x-4">
                        {selectedProject.discordLink && (
                          <a
                            href={selectedProject.discordLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <FaDiscord className="h-4 w-4" />
                            <span>Discord</span>
                            <FaExternalLinkAlt className="h-3 w-3" />
                          </a>
                        )}
                        {selectedProject.twitterLink && (
                          <a
                            href={selectedProject.twitterLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            <FaTwitter className="h-4 w-4" />
                            <span>Twitter</span>
                            <FaExternalLinkAlt className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Funding Address */}
                  {selectedProject.fundingAddress && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">
                        <FaWallet className="inline h-5 w-5 mr-2 text-blue-600" />
                        Funding Address
                      </h4>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 text-sm bg-white p-2 rounded border font-mono break-all">
                          {selectedProject.fundingAddress}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(selectedProject.fundingAddress!)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Copy address"
                        >
                          <FaCopy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                
                {/* Voting Section */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Community Feedback</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleVote(selectedProject.id, 'up')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          selectedProject.userVote === 'up' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <FaThumbsUp className="h-5 w-5" />
                        <span className="font-medium">{selectedProject.upvotes}</span>
                      </button>
                      
                      <button
                        onClick={() => handleVote(selectedProject.id, 'down')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                          selectedProject.userVote === 'down' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <FaThumbsDown className="h-5 w-5" />
                        <span className="font-medium">{selectedProject.downvotes}</span>
                      </button>
                    </div>
                    
                    <div className="text-gray-600">
                      {Math.round((selectedProject.upvotes / (selectedProject.upvotes + selectedProject.downvotes)) * 100)}% positive feedback
                    </div>
                  </div>
                </div>
                
                {/* Funding Progress */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Funding Progress</h4>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>₳{selectedProject.currentFunding.toLocaleString()} raised</span>
                    <span>₳{selectedProject.fundingGoal.toLocaleString()} goal</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${getFundingPercentage(selectedProject.currentFunding, selectedProject.fundingGoal)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{selectedProject.backers} backers</span>
                    <span>{getFundingPercentage(selectedProject.currentFunding, selectedProject.fundingGoal).toFixed(1)}% funded</span>
                  </div>
                </div>
                
                {/* Funding Section */}
                {selectedProject.status === 'active' && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Fund This Project</h4>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Funding Amount (ADA)
                      </label>
                      <input
                        type="number"
                        value={fundingAmount}
                        onChange={(e) => setFundingAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount in ADA"
                        min="1"
                      />
                    </div>
                    <button
                      onClick={() => handleFundProject(selectedProject.id)}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Fund Project
                    </button>
                  </div>
                )}
                

                  <div className="text-sm text-gray-500 text-center">
                    Created {new Date(selectedProject.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* Connect Wallet Message */}
          {!isConnected && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <FaWallet className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Connect Your Wallet</h3>
              <p className="text-blue-700">
                Connect your Cardano wallet to fund projects and submit your own project proposals.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ProjectFunding;
