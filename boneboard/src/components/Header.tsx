import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBone, FaWallet, FaRegBookmark, FaBell } from 'react-icons/fa';
import { FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useWallet } from '../contexts/WalletContext';
import { FreelancerService } from '../services/freelancerService';
import { MessageService } from '../services/messageService';
import WalletSelector from './WalletSelector';
import { motion } from 'framer-motion';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isConnected, 
    walletAddress, 
    connectedWallet,
    availableWallets, 
    username,
    profilePhoto,
    connect, 
    disconnect,
    formatAddress 
  } = useWallet();
  
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleConnectWallet = async (walletId: string) => {
    try {
      await connect(walletId);
      setShowWalletSelector(false);
      toast.success('Wallet connected successfully');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  // Check if user is a freelancer and close profile dropdown when clicking outside
  useEffect(() => {
    if (walletAddress) {
      const checkFreelancerProfile = async () => {
        try {
          const freelancerProfile = await FreelancerService.getFreelancerByWallet(walletAddress);
          setIsFreelancer(!!freelancerProfile);
          
          if (freelancerProfile) {
            // Update counts with real data
            setNotificationCount(MessageService.getNotificationCount(walletAddress));
            setMessageCount(MessageService.getUnreadMessageCount(walletAddress));
          }
        } catch (error) {
          console.error('Error checking freelancer profile:', error);
        }
      };
      
      checkFreelancerProfile();
    }
    
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [walletAddress]);

  const navItems = [
    { path: '/jobs', label: 'Job Search' },
    { path: '/freelancers', label: 'Freelancers' },
    { path: '/projects', label: 'Projects' },
    { path: '/post-job', label: 'Post Job' },
  ];

  return (
    <>
      {/* Main Header */}
      <header className="bg-slate-50 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <NavLink to="/" className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full flex items-center justify-center">
                <FaBone className="text-blue-600 text-xl" />
              </div>
              <span className="text-xl font-bold text-blue-700">BoneBoard</span>
            </NavLink>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center justify-center flex-1">
              <div className="flex items-center space-x-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => 
                      `px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'text-blue-700 border-b-2 border-blue-700' 
                          : 'text-gray-700 hover:text-blue-700 hover:scale-105'
                      }`
                    }
                  >
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  </NavLink>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Freelancer Notifications */}
              {isConnected && isFreelancer && (
                <div className="flex items-center space-x-3">
                  {/* Notifications */}
                  <div className="relative" ref={notificationRef}>
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <FaBell className="text-lg" />
                      {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {notificationCount}
                        </span>
                      )}
                    </button>
                    
                    {/* Notifications Dropdown */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-4 border-b border-gray-100">
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          <div className="p-8 text-center text-gray-500">
                            <FaBell className="mx-auto text-4xl mb-3 opacity-50" />
                            <p className="text-sm">No notifications yet</p>
                            <p className="text-xs mt-1">You'll see notifications here when you receive orders, messages, or reviews</p>
                          </div>
                        </div>
                        <div className="p-3 border-t border-gray-100">
                          <button className="text-sm text-blue-600 hover:text-blue-800">View all notifications</button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                </div>
              )}
              
              <div className="relative" ref={profileRef}>
                {isConnected && walletAddress && connectedWallet ? (
                  <button 
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-700 dark:text-gray-200 dark:hover:text-white"
                    onClick={() => setShowProfile(!showProfile)}
                    aria-expanded={showProfile}
                    aria-haspopup="true"
                  >
                    <div className="relative">
                      {profilePhoto ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img 
                            src={profilePhoto} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          <FaUserCircle className="text-xl" />
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    </div>
                    <div className="hidden md:flex items-center">
                      <span className="text-sm font-medium">
                        {username || (connectedWallet ? connectedWallet.charAt(0).toUpperCase() + connectedWallet.slice(1) : 'Wallet')}
                      </span>
                      <FiChevronDown className={`ml-1 transition-transform ${showProfile ? 'transform rotate-180' : ''}`} />
                    </div>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowWalletSelector(true)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    aria-label="Connect wallet"
                  >
                    <FaWallet className="text-base" />
                    <span>Connect Wallet</span>
                  </button>
                )}
                
                <WalletSelector
                  isOpen={showWalletSelector}
                  onClose={() => setShowWalletSelector(false)}
                  onSelectWallet={handleConnectWallet}
                  availableWallets={availableWallets}
                />
                
                {showProfile && isConnected && walletAddress && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                    {/* Profile Content */}
                    <div className="p-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                          {profilePhoto ? (
                            <img 
                              src={profilePhoto} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FaUserCircle className="text-3xl text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {username || (walletAddress ? formatAddress(walletAddress) : 'Anonymous User')}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            {connectedWallet ? connectedWallet.charAt(0).toUpperCase() + connectedWallet.slice(1) : 'Connected'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {isFreelancer && (
                          <button
                            onClick={async () => {
                              setShowProfile(false);
                              try {
                                const freelancerProfile = await FreelancerService.getFreelancerByWallet(walletAddress!);
                                if (freelancerProfile) {
                                  navigate(`/freelancers/${freelancerProfile.id}`);
                                }
                              } catch (error) {
                                console.error('Error getting freelancer profile:', error);
                              }
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            My Freelancer Profile
                          </button>
                        )}
                        
                        {isFreelancer && (
                          <button
                            onClick={async () => {
                              setShowProfile(false);
                              try {
                                const freelancerProfile = await FreelancerService.getFreelancerByWallet(walletAddress!);
                                if (freelancerProfile) {
                                  navigate(`/freelancers/${freelancerProfile.id}`);
                                  // This will trigger the messaging modal from the profile page
                                }
                              } catch (error) {
                                console.error('Error getting freelancer profile:', error);
                              }
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Messages {messageCount > 0 && `(${messageCount})`}
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            navigate('/my-jobs');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          My Job Listings
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            navigate('/saved-jobs');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors duration-200 flex items-center"
                        >
                          <FaRegBookmark className="w-4 h-4 mr-3 text-blue-600" />
                          Saved Jobs
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            navigate('/my-projects');
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          My Projects
                        </button>
                        
                        <button 
                          onClick={() => {
                            navigate('/profile');
                            setShowProfile(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Account Settings
                        </button>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button 
                          onClick={async () => {
                            try {
                              await disconnect();
                              setShowProfile(false);
                              toast.success('Wallet disconnected');
                              navigate('/');
                            } catch (error) {
                              console.error('Failed to disconnect wallet:', error);
                              toast.error('Failed to disconnect wallet');
                            }
                          }}
                          className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Disconnect Wallet
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2 text-gray-600 hover:text-blue-700"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showMobileMenu ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {showMobileMenu && (
            <div className="md:hidden bg-white py-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `block px-4 py-2 ${
                      isActive ? 'text-blue-700 font-medium' : 'text-gray-700'
                    }`
                  }
                  onClick={() => setShowMobileMenu(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="border-t border-gray-200 mt-2 pt-2">
                <a href="#" className="block px-4 py-2 text-gray-700">Sign In</a>
                <a href="#" className="block px-4 py-2 text-blue-700">Create Account</a>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}

export default Header
