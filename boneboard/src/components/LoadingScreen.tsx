import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
    setIsVisible(true);
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <motion.div 
      className="fixed inset-0 bg-slate-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated Background Bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-8 w-6 h-6 bg-blue-300 rounded-full opacity-25 animate-pulse"></div>
        <div className="absolute top-24 right-16 w-4 h-4 bg-blue-400 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-8 h-8 bg-blue-300 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-48 right-1/3 w-5 h-5 bg-blue-400 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/6 w-7 h-7 bg-blue-300 rounded-full opacity-25 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/3 right-1/5 w-3 h-3 bg-blue-400 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '2.5s' }}></div>
      </div>

      <div className="text-center relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent mb-4">
            BoneBoard
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
        </motion.div>
        
        <motion.div 
          className="flex items-center justify-center space-x-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </motion.div>

        <motion.p 
          className="mt-6 text-gray-600 text-lg font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Loading Marketplace...
        </motion.p>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;