import { motion } from 'framer-motion';
import { FaBone } from 'react-icons/fa';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [title] = useState('');

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
      className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center">
        <motion.h1 
          className="text-4xl font-bold text-white tracking-wider mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          BoneBoard
        </motion.h1>
        
        <motion.div 
          className="w-64 h-2 bg-blue-700 rounded-full overflow-hidden mx-auto"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div
            className="h-full bg-white rounded-full"
            style={{
              width: '100%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </motion.div>

        <motion.p 
          className="mt-4 text-blue-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Loading {title}...
        </motion.p>

        {/* Floating bone elements */}
        <div className="absolute inset-0 pointer-events-none">
          <FaBone className="absolute top-1/4 left-1/4 text-white/20 text-xs animate-ping" style={{ animationDelay: '1000ms' }} />
          <FaBone className="absolute top-3/4 right-1/4 text-white/20 text-xs animate-ping" style={{ animationDelay: '1500ms' }} />
          <FaBone className="absolute top-1/2 left-1/6 text-white/20 text-xs animate-ping" style={{ animationDelay: '2000ms' }} />
          <FaBone className="absolute top-1/3 right-1/6 text-white/20 text-xs animate-ping" style={{ animationDelay: '2500ms' }} />
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;