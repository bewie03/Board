import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { WalletProvider } from './contexts/WalletContext';
import Footer from './components/Footer';
import Home from './pages/Home';
import JobListings from './pages/JobListings';
import PostJob from './pages/PostJob';
import Projects from './pages/Projects';
import SubmitProject from './pages/SubmitProject';
import CreateProject from './pages/CreateProject';
import MyProjects from './pages/profile/MyProjects';
import MyJobs from './pages/profile/MyJobs';
import AccountSettings from './pages/profile/AccountSettings';
import SavedJobs from './pages/SavedJobs';
// Freelancer imports commented out
// import Freelancers from './pages/Freelancers';
// import FreelancerProfile from './pages/FreelancerProfile';
// import FreelancerProfileCreation from './pages/FreelancerProfileCreation';
import TwitterCallback from './pages/auth/TwitterCallback';
import DiscordCallback from './pages/auth/DiscordCallback';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import Header from './components/Header';



// Layout component that includes Header and Footer
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow pt-5">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<JobListings />} />
        <Route path="/jobs/:jobId" element={<JobListings />} />
        {/* Freelancer routes commented out */}
        {/* <Route path="/freelancers" element={<Freelancers />} /> */}
        {/* <Route path="/freelancers/:id" element={<FreelancerProfile />} /> */}
        {/* <Route path="/freelancers/create" element={<FreelancerProfileCreation />} /> */}
        {/* <Route path="/freelancers/edit" element={<FreelancerProfileCreation />} /> */}
        <Route path="/projects" element={<Projects />} />
        <Route path="/submit-project" element={<SubmitProject />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/projects/new" element={<CreateProject />} />
        
        {/* Profile Routes */}
        <Route path="/my-projects" element={<MyProjects />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/saved-jobs" element={<SavedJobs />} />
        <Route path="/profile" element={<AccountSettings />} />
        
        {/* OAuth Callback Routes */}
        <Route path="/auth/twitter/callback" element={<TwitterCallback />} />
        <Route path="/auth/discord/callback" element={<DiscordCallback />} />
        <Route path="/projects/new/auth/discord/callback" element={<DiscordCallback />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  // Debug: Check if wallet is detected
  useEffect(() => {
    console.log('Cardano wallet detected:', !!(window as any).cardano);
    if ((window as any).cardano) {
      console.log('Available wallets:', Object.keys((window as any).cardano));
      console.log('Vesper (vespr) wallet detected:', !!(window as any).cardano.vespr);
    }
  }, []);

  return (
    <WalletProvider>
      <Router>
        <Layout>
          <AnimatedRoutes />
        </Layout>
        <ToastContainer position="top-right" autoClose={5000} />
      </Router>
    </WalletProvider>
  );
}

export default App;