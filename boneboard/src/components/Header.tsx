import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBone, FaWallet, FaBookmark, FaShieldAlt, FaFolderOpen, FaCog, FaDonate, FaBookOpen } from 'react-icons/fa';
import { FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useWallet } from '../contexts/WalletContext';
import { isAdminWallet } from '../utils/adminAuth';
import { AdminPanel } from './AdminPanel';
// Freelancer and messaging services removed
import WalletSelector from './WalletSelector';

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
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [walletAddress]);

  const navItems = [
    { path: '/jobs', label: 'Job Search' },
    { path: '/projects', label: 'Projects' },
    { path: '/funding', label: 'Funding' },
    { path: '/post-job', label: 'Post Job' },
  ];

  return (
    <>
      {/* Main Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40" style={{ height: '80px' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <NavLink to="/" className="flex items-center space-x-3 group">
              <div className="bg-blue-100 p-2 rounded-full flex items-center justify-center group-hover:bg-blue-200 group-hover:scale-110 transition-all duration-200">
                <FaBone className="text-blue-600 text-xl group-hover:text-blue-700" />
              </div>
              <span className="text-xl font-bold text-blue-700 group-hover:text-blue-800 transition-colors duration-200">BoneBoard</span>
            </NavLink>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <NavLink 
                to="/jobs" 
                className={({ isActive }) => 
                  `text-gray-600 hover:text-gray-900 px-4 py-3 rounded-md text-base font-medium transition-all duration-200 hover:scale-105 hover:bg-gray-50 ${
                    isActive ? 'text-blue-600 bg-blue-50' : ''
                  }`
                }
              >
                Jobs
              </NavLink>
              <NavLink 
                to="/projects" 
                className={({ isActive }) => 
                  `text-gray-600 hover:text-gray-900 px-4 py-3 rounded-md text-base font-medium transition-all duration-200 hover:scale-105 hover:bg-gray-50 ${
                    isActive ? 'text-blue-600 bg-blue-50' : ''
                  }`
                }
              >
                Projects
              </NavLink>
              <NavLink 
                to="/funding" 
                className={({ isActive }) => 
                  `text-gray-600 hover:text-gray-900 px-4 py-3 rounded-md text-base font-medium transition-all duration-200 hover:scale-105 hover:bg-gray-50 ${
                    isActive ? 'text-blue-600 bg-blue-50' : ''
                  }`
                }
              >
                Funding
              </NavLink>
              {isConnected && walletAddress && isAdminWallet(walletAddress) && (
                <div className="flex items-center px-3 py-1 bg-blue-100 rounded-full hover:bg-blue-200 hover:scale-105 transition-all duration-200 cursor-default">
                  <FaShieldAlt className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Admin Mode</span>
                </div>
              )}
            </nav>
            
            <div className="flex items-center space-x-4">
              {/* Notifications - Hidden for now */}
              
              <div className="relative" ref={profileRef}>
                {isConnected && walletAddress && connectedWallet ? (
                  <button 
                    className="flex items-center space-x-3 text-gray-700 hover:text-blue-700 dark:text-gray-200 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                    onClick={() => setShowProfile(!showProfile)}
                    aria-expanded={showProfile}
                    aria-haspopup="true"
                  >
                    <div className="relative">
                      {profilePhoto ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
                          <img 
                            src={profilePhoto} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                            style={{ backgroundColor: 'white' }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                          <FaUserCircle className="text-2xl" />
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                    </div>
                    <div className="hidden md:flex items-center">
                      <span className="text-base font-medium">
                        {username || (connectedWallet ? connectedWallet.charAt(0).toUpperCase() + connectedWallet.slice(1) : 'Wallet')}
                      </span>
                      <FiChevronDown className={`ml-2 w-5 h-5 transition-transform ${showProfile ? 'transform rotate-180' : ''}`} />
                    </div>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowWalletSelector(true)}
                    className="flex items-center space-x-2 px-5 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                    aria-label="Connect wallet"
                  >
                    <FaWallet className="text-lg" />
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
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-xl z-[110] border border-gray-100 overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-white p-5 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 group">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shadow-md group-hover:shadow-lg transition-shadow duration-200 bg-white">
                          {profilePhoto ? (
                            <img 
                              src={profilePhoto} 
                              alt="Profile" 
                              className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-200"
                              style={{ backgroundColor: 'white' }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                              <FaUserCircle className="text-3xl text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-base group-hover:text-blue-600 transition-colors duration-200">
                            {username || (walletAddress ? formatAddress(walletAddress) : 'Anonymous User')}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className="w-2.5 h-2.5 bg-green-400 rounded-full mr-2 shadow-sm animate-pulse"></span>
                            <span className="text-sm text-gray-600 font-medium group-hover:text-gray-700 transition-colors duration-200">
                              {connectedWallet ? connectedWallet.charAt(0).toUpperCase() + connectedWallet.slice(1) : 'Connected'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Profile Menu Content */}
                    <div className="p-4">
                      <div className="space-y-1">
                        {/* Freelancer profile options removed */}
                        
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            navigate('/my-jobs');
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200 flex items-center group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                            <FaBookOpen className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="flex-1">My Jobs</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            navigate('/saved-jobs');
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200 flex items-center group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                            <FaBookmark className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="flex-1">Saved Jobs</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            navigate('/my-projects');
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200 flex items-center group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                            <FaFolderOpen className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="flex-1">My Projects</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setShowProfile(false);
                            navigate('/my-funding');
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200 flex items-center group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                            <FaDonate className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="flex-1">My Fundings</span>
                        </button>
                        
                        {/* Admin Panel Button - Only show for admin wallet */}
                        {isAdminWallet(walletAddress) && (
                          <button
                            onClick={() => {
                              navigate('/admin');
                              setShowProfile(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200 flex items-center group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                              <FaShieldAlt className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                            </div>
                            <span className="flex-1">Admin Panel</span>
                          </button>
                        )}
                        
                        <button 
                          onClick={() => {
                            navigate('/profile');
                            setShowProfile(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200 flex items-center group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                            <FaCog className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                          </div>
                          <span className="flex-1">Account Settings</span>
                        </button>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
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
                          className="w-full flex items-center justify-center px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group"
                        >
                          <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
          )}
        </div>
      </header>
      
      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </>
  )
}

export default Header
