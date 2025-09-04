import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCookie } from 'react-icons/fa';

const CookieConsent: React.FC = () => {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const hasConsented = localStorage.getItem('cookieConsent');
    if (!hasConsented) {
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowConsent(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('cookieConsent', 'dismissed');
    setShowConsent(false);
  };

  return (
    <AnimatePresence>
      {showConsent && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-80 max-w-xs">
            <div className="space-y-3">
              {/* Header with icon and title */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaCookie className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">
                  We use cookies to enhance your experience
                </h3>
              </div>
              
              {/* Description */}
              <p className="text-gray-600 text-xs leading-relaxed">
                BoneBoard uses cookies, local storage, and browser fingerprinting for wallet connections, transaction monitoring, fraud prevention, and saving preferences.
              </p>
              
              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleAccept}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  Accept All
                </button>
                
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
