import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { FreelancerService, Freelancer } from '../services/freelancerService';
import PageTransition from '../components/PageTransition';
import { FaStar, FaSearch, FaPlus, FaEdit, FaGlobe } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Freelancers: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress, isConnected } = useWallet();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [filteredFreelancers, setFilteredFreelancers] = useState<Freelancer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [userProfile, setUserProfile] = useState<Freelancer | null>(null);

  const categories = [
    'all',
    'Web Development',
    'Mobile Development',
    'Blockchain Development',
    'Design',
    'Marketing',
    'Content Writing',
    'Consulting',
    'Other'
  ];

  const sortOptions = [
    { value: 'rating', label: 'Top Rated' },
    { value: 'reviewCount', label: 'Most Reviews' },
    { value: 'completedOrders', label: 'Most Orders' },
    { value: 'newest', label: 'Newest' }
  ];

  const mainLanguages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Russian',
    'Chinese',
    'Japanese',
    'Korean',
    'Arabic',
    'Hindi',
    'Dutch',
    'Swedish',
    'Norwegian',
    'Danish',
    'Finnish',
    'Polish',
    'Czech',
    'Hungarian',
    'Romanian',
    'Bulgarian',
    'Greek',
    'Turkish',
    'Hebrew',
    'Thai',
    'Vietnamese',
    'Indonesian',
    'Malay',
    'Tagalog'
  ];

  useEffect(() => {
    const loadFreelancers = async () => {
      try {
        const allFreelancers = await FreelancerService.getAllFreelancers();
        console.log('Loading freelancers:', allFreelancers.map(f => ({ name: f.name, category: f.category, avatar: f.avatar })));
        setFreelancers(allFreelancers);
        
        // Check if current user has a freelancer profile
        if (walletAddress) {
          const profile = await FreelancerService.getFreelancerByWallet(walletAddress);
          setUserProfile(profile || null);
        }
      } catch (error) {
        console.error('Error loading freelancers:', error);
      }
    };

    loadFreelancers();
    
    // Enhanced event listeners for comprehensive sync
    const handleProfileUpdate = (event: any) => {
      console.log('Profile update detected:', event.detail);
      setTimeout(() => {
        loadFreelancers();
      }, 100);
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'freelancerProfiles' || e.key?.startsWith('freelancer_')) {
        console.log('Storage change detected:', e.key);
        setTimeout(() => {
          loadFreelancers();
        }, 100);
      }
    };

    const handleServicePackagesUpdate = (event: any) => {
      console.log('Service packages updated:', event.detail);
      setTimeout(() => {
        loadFreelancers();
      }, 100);
    };

    const handleFreelancerStatusUpdate = (event: any) => {
      console.log('Freelancer status updated:', event.detail);
      setTimeout(() => {
        loadFreelancers();
      }, 100);
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.language-dropdown')) {
        setShowLanguageDropdown(false);
      }
    };

    // Add all event listeners
    window.addEventListener('freelancerProfileUpdated', handleProfileUpdate);
    window.addEventListener('servicePackagesUpdated', handleServicePackagesUpdate);
    window.addEventListener('freelancerUpdated', handleProfileUpdate);
    window.addEventListener('freelancerStatusUpdated', handleFreelancerStatusUpdate);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('freelancerProfileUpdated', handleProfileUpdate);
      window.removeEventListener('servicePackagesUpdated', handleServicePackagesUpdate);
      window.removeEventListener('freelancerUpdated', handleProfileUpdate);
      window.removeEventListener('freelancerStatusUpdated', handleFreelancerStatusUpdate);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [walletAddress]);

  useEffect(() => {
    let filtered = [...freelancers];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(freelancer =>
        (freelancer.name && freelancer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (freelancer.title && freelancer.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (freelancer.bio && freelancer.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (freelancer.skills && freelancer.skills.some(skill => skill && skill.toLowerCase().includes(searchQuery.toLowerCase())))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(freelancer => {
        console.log('Filtering freelancer:', freelancer.name, 'Category:', freelancer.category, 'Selected:', selectedCategory);
        return freelancer.category === selectedCategory;
      });
    }


    // Filter by languages
    if (selectedLanguages.length > 0) {
      filtered = filtered.filter(freelancer =>
        selectedLanguages.some(lang => freelancer.languages.includes(lang))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'reviewCount':
          return b.reviewCount - a.reviewCount;
        case 'completedOrders':
          return b.completedOrders - a.completedOrders;
        case 'newest':
          return new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime();
        default:
          return 0;
      }
    });

    setFilteredFreelancers(filtered);
  }, [freelancers, searchQuery, selectedCategory, selectedLanguages, sortBy]);

  const handleCreateProfile = () => {
    if (!isConnected) {
      alert('Please connect your wallet to create a freelancer profile');
      return;
    }
    navigate('/freelancers/create');
  };

  const handleViewProfile = () => {
    if (userProfile) {
      navigate(`/freelancers/${userProfile.id}`);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Find Cardano Freelancers
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Connect with skilled professionals in the Cardano ecosystem. From smart contract development to marketing, find the perfect freelancer for your project.
            </p>
          </div>

          {/* User Profile Section (if exists) */}
          {userProfile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Your Freelancer Profile</h3>
                    <p className="text-gray-600">{userProfile.title}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center">
                        <FaStar className="text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">{userProfile.rating}</span>
                        <span className="text-sm text-gray-500 ml-1">({userProfile.reviewCount} reviews)</span>
                      </div>
                      <span className="text-sm text-gray-500">{userProfile.completedOrders} orders completed</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleViewProfile}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaEdit className="mr-2" />
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Profile CTA (if no profile) */}
          {!userProfile && isConnected && (
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 mb-8 text-center text-white">
              <h2 className="text-2xl font-bold mb-4">Become a Freelancer</h2>
              <p className="text-lg mb-6">
                Join the BoneBoard community and start offering your services to the Cardano ecosystem.
                Profile creation fee: 200 ADA
              </p>
              <button
                onClick={handleCreateProfile}
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FaPlus className="mr-2" />
                Create Freelancer Profile
              </button>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col gap-4">
              {/* First Row - Search */}
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search freelancers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Second Row - Filters */}
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Category Filter */}
                <div className="lg:w-64">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                </div>


                {/* Languages Filter */}
                <div className="lg:w-64 relative language-dropdown">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left bg-white flex items-center justify-between"
                    >
                      <span className="text-gray-700">
                        {selectedLanguages.length === 0 ? 'Select Languages' : `${selectedLanguages.length} selected`}
                      </span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showLanguageDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {mainLanguages.map(language => (
                          <label key={language} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedLanguages.includes(language)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLanguages(prev => [...prev, language]);
                                } else {
                                  setSelectedLanguages(prev => prev.filter(l => l !== language));
                                }
                              }}
                              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-gray-700">{language}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {selectedLanguages.length > 0 && (
                      <button
                        onClick={() => setSelectedLanguages([])}
                        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-20"
                        title="Clear selection"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Sort */}
                <div className="lg:w-48">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {selectedLanguages.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600 font-medium">Active filters:</span>
                  {selectedLanguages.map(lang => (
                    <span key={lang} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {lang}
                      <button
                        onClick={() => setSelectedLanguages(prev => prev.filter(l => l !== lang))}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-gray-600">
              Showing {filteredFreelancers.length} freelancer{filteredFreelancers.length !== 1 ? 's' : ''}
              {searchQuery && ` for "${searchQuery}"`}
              {selectedCategory !== 'all' && ` in ${selectedCategory}`}
            </p>
          </div>

          {/* Freelancers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFreelancers.map((freelancer) => (
              <motion.div
                key={freelancer.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/freelancers/${freelancer.id}`)}
              >
                <div className="p-6">
                  {/* Profile Header */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                        <img
                          src={freelancer.avatar}
                          alt={freelancer.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                        freelancer.busyStatus === 'available' ? 'bg-green-500' :
                        freelancer.busyStatus === 'busy' ? 'bg-yellow-500' :
                        freelancer.busyStatus === 'unavailable' ? 'bg-red-500' :
                        freelancer.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{freelancer.name}</h3>
                      <p className="text-sm text-gray-600">{freelancer.title}</p>
                      {freelancer.category && (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mt-1">
                          {freelancer.category}
                        </span>
                      )}
                      <div className="flex items-center mt-1">
                        <FaStar className="text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">{freelancer.rating}</span>
                        <span className="text-sm text-gray-500 ml-1">({freelancer.reviewCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {freelancer.bio}
                  </p>

                  {/* Skills */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {freelancer.skills.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                      {freelancer.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{freelancer.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-gray-100 my-4"></div>

                  {/* Languages */}
                  <div className="mb-4">
                    <div className="flex items-center text-xs text-gray-600">
                      <FaGlobe className="mr-2 text-gray-500" />
                      <span>{freelancer.languages.slice(0, 2).join(', ')}</span>
                      {freelancer.languages.length > 2 && (
                        <span className="ml-1">+{freelancer.languages.length - 2} more</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between text-sm text-gray-500 border-t pt-4">
                    <span>{freelancer.completedOrders} orders</span>
                    <span>Response: {freelancer.responseTime}</span>
                  </div>

                  {/* Hourly Rate */}
                  {freelancer.services.length > 0 && freelancer.services[0].pricing && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Hourly Rate</span>
                        <span className="text-lg font-semibold text-green-600">
                          {freelancer.services[0].pricing.basic.price} {freelancer.services[0].pricing.basic.currency}/hr
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Starting at</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {Math.min(...freelancer.services.map(s => s.pricing.basic.price))} {freelancer.services[0].pricing.basic.currency}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* No Results */}
          {filteredFreelancers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FaSearch className="mx-auto text-6xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No freelancers found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or browse all categories.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Freelancers;
