import React, { useState, useEffect } from 'react';
import { FaUser, FaUserTie } from 'react-icons/fa';

interface User {
  walletAddress: string;
  name: string;
  avatar: string;
  isFreelancer: boolean;
}

const UserSwitcher: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Load current user
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }

    // Load available freelancer profiles as potential users
    const freelancerProfiles = localStorage.getItem('freelancerProfiles');
    if (freelancerProfiles) {
      const profiles = JSON.parse(freelancerProfiles);
      const users = profiles.map((profile: any) => ({
        walletAddress: profile.walletAddress,
        name: profile.name,
        avatar: profile.avatar,
        isFreelancer: true
      }));
      setAvailableUsers(users);
    }
  }, []);

  const switchUser = (user: User) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    setShowDropdown(false);
    // Reload the page to update the profile view
    window.location.reload();
  };

  const createNewUser = () => {
    const newWalletAddress = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newUser = {
      walletAddress: newWalletAddress,
      name: 'Demo Client',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      isFreelancer: false
    };
    
    switchUser(newUser);
  };

  if (!currentUser) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 bg-white rounded-lg shadow-lg px-3 py-2 border hover:bg-gray-50 transition-colors"
        >
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">{currentUser.name}</div>
            <div className="text-xs text-gray-500 flex items-center">
              {currentUser.isFreelancer ? <FaUserTie className="mr-1" /> : <FaUser className="mr-1" />}
              {currentUser.isFreelancer ? 'Freelancer' : 'Client'}
            </div>
          </div>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border py-2 max-h-80 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
              Switch User (Demo)
            </div>
            
            {availableUsers.map((user) => (
              <button
                key={user.walletAddress}
                onClick={() => switchUser(user)}
                className={`w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                  currentUser.walletAddress === user.walletAddress ? 'bg-blue-50' : ''
                }`}
              >
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500 flex items-center">
                    {user.isFreelancer ? <FaUserTie className="mr-1" /> : <FaUser className="mr-1" />}
                    {user.isFreelancer ? 'Freelancer' : 'Client'}
                  </div>
                </div>
                {currentUser.walletAddress === user.walletAddress && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </button>
            ))}
            
            <div className="border-t mt-2 pt-2">
              <button
                onClick={createNewUser}
                className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 transition-colors text-blue-600"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaUser className="text-blue-600 text-sm" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium">Create New Client</div>
                  <div className="text-xs text-gray-500">For testing messaging</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSwitcher;
