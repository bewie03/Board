import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import PageTransition from '../../components/PageTransition';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/Modal';

const AccountSettings: React.FC = () => {
  const { walletAddress, username, setUsername, profilePhoto, setProfilePhoto } = useWallet();
  const navigate = useNavigate();
  const [localUsername, setLocalUsername] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Load username from context when component mounts or username changes
  useEffect(() => {
    if (username) {
      setLocalUsername(username);
    }
  }, [username]);

  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(profilePhoto);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const compressImage = (file: File, maxSizeKB: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        const maxDimension = 800; // Max width/height for profile pics
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Fill canvas with white background first
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
        }
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Start with high quality and reduce if needed
        let quality = 0.9;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Reduce quality until under size limit
        while (compressedDataUrl.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) { // 1.37 accounts for base64 overhead
          quality -= 0.1;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(compressedDataUrl);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Show loading state for large files
        if (file.size > 1024 * 1024) {
          toast.info('Compressing image, please wait...');
        }
        
        const compressedImage = await compressImage(file, 1024);
        setProfileImage(compressedImage);
        setProfilePhoto(compressedImage);
        
        if (file.size > 1024 * 1024) {
          toast.success('Image compressed and uploaded successfully!');
        }
      } catch (error) {
        console.error('Error compressing image:', error);
        toast.error('Failed to process image. Please try again.');
      }
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('Copied to clipboard!');
    
    // Reset the copied state after 2 seconds
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!walletAddress) {
        toast.error('Please connect your wallet first');
        return;
      }

      // Save username to database via API
      const response = await fetch(`/api/user-profiles?wallet=${encodeURIComponent(walletAddress)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          username: localUsername
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Save the username to the context (which will also save to localStorage)
      setUsername(localUsername);
      
      // Show success message
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm account deletion');
      return;
    }

    setIsDeleting(true);
    
    try {
      if (!walletAddress) {
        toast.error('Please connect your wallet first');
        return;
      }

      const response = await fetch(`/api/user-profiles?wallet=${encodeURIComponent(walletAddress)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmDelete: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully. You will be redirected to the home page.');
      
      // Clear local storage and redirect
      localStorage.clear();
      setTimeout(() => {
        navigate('/');
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      toast.error(`Failed to delete account: ${error.message}`);
      console.error('Error deleting account:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="bg-white border-b border-gray-100 px-6 py-5 sm:px-8">
            <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-1.5 text-gray-500">Manage your account information and preferences</p>
          </div>
        
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'white' }}>
                  {profileImage || profilePhoto ? (
                    <img 
                      src={profileImage || profilePhoto || ''} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <svg className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </button>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
                <p className="text-sm text-gray-500 mt-1">JPG, GIF or PNG. Large images will be automatically compressed.</p>
                {(profileImage || profilePhoto) && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileImage(null);
                      setProfilePhoto(null);
                      toast.success('Profile picture removed');
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    Remove Picture
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-6">
              <label htmlFor="wallet-address" className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="wallet-address"
                  value={walletAddress || ''}
                  disabled
                  className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 font-mono text-sm"
                />
                <motion.button
                  type="button"
                  onClick={() => walletAddress && copyToClipboard(walletAddress)}
                  className="absolute inset-y-0 right-0 px-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                  title="Copy to clipboard"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isCopied ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {isCopied ? (
                    <motion.svg 
                      className="h-5 w-5 text-green-600" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  )}
                </motion.button>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={localUsername}
                onChange={(e) => setLocalUsername(e.target.value.slice(0, 15))}
                maxLength={15}
                className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your username (max 15 characters)"
              />
              <p className="text-xs text-gray-500 mt-1">{localUsername.length}/15 characters</p>
            </div>


            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Account
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>


          {/* Delete Account Modal */}
          <Modal
            isOpen={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false);
              setDeleteConfirmText('');
            }}
            title="Delete Account"
          >
            <div className="space-y-6">
              {/* Warning */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-red-900">
                    Permanently delete your account and all associated data
                  </h3>
                  <p className="mt-2 text-sm text-red-700">
                    This action cannot be undone. All of your data will be permanently removed.
                  </p>
                </div>
              </div>

              {/* What will be deleted */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-3">
                  This will permanently delete:
                </h4>
                <ul className="text-sm text-red-700 space-y-2">
                  <li className="flex items-center">
                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Your user profile and settings
                  </li>
                  <li className="flex items-center">
                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All job postings you've created
                  </li>
                  <li className="flex items-center">
                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All projects you've posted
                  </li>
                  <li className="flex items-center">
                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All saved jobs and bookmarks
                  </li>
                  <li className="flex items-center">
                    <svg className="h-4 w-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All other account data
                  </li>
                </ul>
              </div>

              {/* Confirmation */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please type <span className="font-mono font-semibold text-red-600">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-red-500 focus:border-red-500"
                    placeholder="Type DELETE to confirm"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting Account...
                      </>
                    ) : (
                      'Delete Account Permanently'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default AccountSettings;
