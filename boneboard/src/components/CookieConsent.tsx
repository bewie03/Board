import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCookie, FaTimes } from 'react-icons/fa';

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
          className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 lg:left-8 lg:right-8 z-50"
        >
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              {/* Cookie Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaCookie className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  We use cookies to enhance your experience
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  BoneBoard uses cookies, local storage, and browser fingerprinting technologies to enhance your experience and protect our platform. 
                  We use these for wallet connections, transaction monitoring, fraud prevention, and saving your preferences like bookmarked jobs.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAccept}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Accept All Cookies
                  </button>
                  
                  <button
                    onClick={handleDismiss}
                    className="inline-flex items-center justify-center px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Dismiss
                  </button>
                  
                  <button
                    onClick={() => {
                      // Open cookie policy in footer modal
                      const event = new CustomEvent('openCookiePolicy');
                      window.dispatchEvent(event);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2.5 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 focus:outline-none underline"
                  >
                    Learn More
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none"
                aria-label="Dismiss cookie notice"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
