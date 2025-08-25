import React, { useState, useEffect } from 'react';
import { FaBriefcase, FaUsers } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';
import { JobService } from '../services/jobService';
import { ProjectService } from '../services/projectService';

const Home: React.FC = () => {
  const [jobCount, setJobCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [boneBurnt, setBoneBurnt] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const activeJobs = await JobService.getActiveJobs();
        const allProjects = await ProjectService.getAllProjects();
        
        setJobCount(activeJobs.length);
        setProjectCount(allProjects.length);
        
        // Get total BONE burnt from database
        const burnedBoneResponse = await fetch('/api/burnedbone');
        if (burnedBoneResponse.ok) {
          const burnedData = await burnedBoneResponse.json();
          setBoneBurnt(Math.round(burnedData.totalBoneBurned));
        } else {
          setBoneBurnt(0);
        }
      } catch (error) {
        console.error('Error loading home data:', error);
        // Set fallback values if API fails
        setJobCount(0);
        setProjectCount(0);
        setBoneBurnt(0);
      }
    };

    loadData();
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen relative overflow-hidden bg-slate-50">
        {/* Clean Professional Background */}
        <div className="absolute inset-0 bg-slate-50"></div>
        
        {/* Animated Morphing Bubbles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Morphing Bubbles with Size Changes */}
          <div className="absolute top-16 left-8 w-6 h-6 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble1 12s ease-in-out infinite',
            animationDelay: '0s'
          }}></div>
          <div className="absolute top-24 left-32 w-4 h-4 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble2 15s ease-in-out infinite',
            animationDelay: '2s'
          }}></div>
          <div className="absolute top-48 right-16 w-8 h-8 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble3 18s ease-in-out infinite',
            animationDelay: '4s'
          }}></div>
          <div className="absolute top-72 right-40 w-5 h-5 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble1 14s ease-in-out infinite',
            animationDelay: '6s'
          }}></div>
          <div className="absolute top-96 left-1/3 w-7 h-7 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble2 16s ease-in-out infinite',
            animationDelay: '8s'
          }}></div>
          <div className="absolute top-32 right-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble3 13s ease-in-out infinite',
            animationDelay: '10s'
          }}></div>
          
          <div className="absolute bottom-32 left-1/5 w-9 h-9 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble1 20s ease-in-out infinite',
            animationDelay: '3s'
          }}></div>
          <div className="absolute bottom-56 right-1/3 w-4 h-4 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble2 17s ease-in-out infinite',
            animationDelay: '5s'
          }}></div>
          <div className="absolute bottom-80 left-1/2 w-6 h-6 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble3 22s ease-in-out infinite',
            animationDelay: '7s'
          }}></div>
          <div className="absolute bottom-24 right-1/6 w-5 h-5 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble1 19s ease-in-out infinite',
            animationDelay: '9s'
          }}></div>
          
          {/* More scattered morphing bubbles */}
          <div className="absolute top-1/3 left-1/6 w-4 h-4 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble2 21s ease-in-out infinite',
            animationDelay: '12s'
          }}></div>
          <div className="absolute top-2/3 right-1/5 w-7 h-7 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble3 16s ease-in-out infinite',
            animationDelay: '14s'
          }}></div>
          <div className="absolute top-1/2 left-3/4 w-5 h-5 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble1 23s ease-in-out infinite',
            animationDelay: '16s'
          }}></div>
          <div className="absolute top-3/4 right-2/3 w-6 h-6 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble2 18s ease-in-out infinite',
            animationDelay: '18s'
          }}></div>
          <div className="absolute top-1/4 left-2/3 w-3 h-3 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble3 25s ease-in-out infinite',
            animationDelay: '20s'
          }}></div>
          <div className="absolute top-5/6 left-1/4 w-8 h-8 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble1 17s ease-in-out infinite',
            animationDelay: '22s'
          }}></div>
          <div className="absolute top-1/6 right-1/2 w-4 h-4 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble2 24s ease-in-out infinite',
            animationDelay: '24s'
          }}></div>
          <div className="absolute bottom-1/3 left-3/5 w-6 h-6 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble3 19s ease-in-out infinite',
            animationDelay: '26s'
          }}></div>
          <div className="absolute bottom-1/6 right-3/4 w-5 h-5 bg-blue-300 rounded-full opacity-25" style={{
            animation: 'morphBubble1 21s ease-in-out infinite',
            animationDelay: '28s'
          }}></div>
          <div className="absolute top-4/5 left-1/8 w-7 h-7 bg-blue-400 rounded-full opacity-30" style={{
            animation: 'morphBubble2 26s ease-in-out infinite',
            animationDelay: '30s'
          }}></div>
        </div>
        
        {/* Custom CSS for relaxed morphing animations */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes morphBubble1 {
              0%, 100% { transform: scale(1) translateY(0px); opacity: 0.25; }
              50% { transform: scale(1.2) translateY(-8px); opacity: 0.30; }
            }
            
            @keyframes morphBubble2 {
              0%, 100% { transform: scale(1) translateX(0px); opacity: 0.30; }
              50% { transform: scale(1.1) translateX(6px); opacity: 0.35; }
            }
            
            @keyframes morphBubble3 {
              0%, 100% { transform: scale(1) translate(0px, 0px); opacity: 0.25; }
              33% { transform: scale(1.15) translate(4px, -6px); opacity: 0.30; }
              66% { transform: scale(0.9) translate(-3px, -4px); opacity: 0.28; }
            }
          `
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Enhanced Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-6"
            >
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 bg-clip-text text-transparent mb-4">
                BoneBoard
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-700 mb-8 font-medium"
            >
              Cardano's Professional Job & Project Marketplace
            </motion.p>
            
            {/* Enhanced Main CTA */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link 
                to="/jobs" 
                className="inline-flex items-center justify-center px-10 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
              >
                Browse Jobs
              </Link>
            </motion.div>
          </div>

          {/* Clear Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="group"
            >
              <Link to="/jobs" className="block">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center border border-gray-200 hover:border-blue-300 cursor-pointer">
                  <div className="text-4xl font-bold text-blue-600 mb-3 group-hover:scale-110 transition-transform">{jobCount}</div>
                  <div className="text-gray-800 font-semibold text-lg group-hover:text-blue-600 transition-colors">Active Jobs</div>
                </div>
              </Link>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="group"
            >
              <Link to="/projects" className="block">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center border border-gray-200 hover:border-blue-300 cursor-pointer">
                  <div className="text-4xl font-bold text-blue-600 mb-3 group-hover:scale-110 transition-transform">{projectCount}</div>
                  <div className="text-gray-800 font-semibold text-lg group-hover:text-blue-600 transition-colors">Total Projects</div>
                </div>
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="group cursor-pointer"
            >
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-center border border-gray-200 hover:border-blue-300">
                <div className="text-4xl font-bold text-blue-600 mb-3 group-hover:scale-110 transition-transform">{boneBurnt}</div>
                <div className="text-gray-800 font-semibold text-lg group-hover:text-blue-600 transition-colors">Total $BONE Burnt</div>
              </div>
            </motion.div>
          </div>

          {/* Clear Feature Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Job Listings */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="group"
            >
              <Link to="/jobs" className="block">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 hover:border-blue-300 h-full">
                  <div className="flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl text-white mb-4 group-hover:scale-110 transition-all duration-300 shadow-md">
                    <FaBriefcase className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    Job Listings
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Find blockchain development opportunities, smart contract work, and Cardano ecosystem positions.
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Post a Job */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="group"
            >
              <Link to="/post-job" className="block">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 hover:border-blue-300 h-full">
                  <div className="flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl text-white mb-4 group-hover:scale-110 transition-all duration-300 shadow-md">
                    <FaUsers className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    Post a Job
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    Hire talented developers from the Cardano community. Pay with $BONE tokens to reach qualified candidates.
                  </p>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Home;
