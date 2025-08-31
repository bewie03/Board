import React, { useState } from 'react';
import { FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import Modal from './Modal';

const Footer: React.FC = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const openDiscord = () => {
    window.open('https://discord.gg/boneboard', '_blank', 'noopener,noreferrer');
  };

  const termsContent = (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Terms of Service</h2>
        <p className="text-sm text-gray-500 mt-1">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">1</span>
            Acceptance of Terms
          </h3>
          <p className="text-gray-700 pl-8">
            By accessing and using BoneBoard, you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.
          </p>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">2</span>
            User Conduct
          </h3>
          <p className="text-gray-700 pl-8">
            Users agree to use BoneBoard in compliance with all applicable laws and regulations. Prohibited activities include but are not limited to:
          </p>
          <ul className="list-disc pl-12 space-y-2 text-gray-700">
            <li>Posting fraudulent, misleading, or deceptive content</li>
            <li>Harassing, bullying, or threatening other users</li>
            <li>Violating intellectual property rights or copyrights</li>
            <li>Distributing malware, viruses, or harmful code</li>
            <li>Engaging in any form of discrimination or hate speech</li>
          </ul>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
            Job Postings
          </h3>
          <p className="text-gray-700 pl-8">
            All job postings must be accurate, up-to-date, and comply with all applicable employment laws. BoneBoard reserves the right to remove any posting that violates these terms without notice.
          </p>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">4</span>
            Limitation of Liability
          </h3>
          <p className="text-gray-700 pl-8">
            BoneBoard provides this platform as a service and is not responsible for the accuracy of job postings, the conduct of users, or any transactions that occur as a result of using this service. Use of the platform is at your own risk.
          </p>
        </section>
      </div>
    </div>
  );

  const privacyContent = (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Privacy Policy</h2>
        <p className="text-sm text-gray-500 mt-1">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">1</span>
            What We Collect (And What We Don't)
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 mt-2 ml-8 space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Information We Collect:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Basic contact information (email address)</li>
                <li>Wallet address for blockchain transactions</li>
                <li>IP address and device information for security</li>
                <li>Activity data on our platform</li>
              </ul>
            </div>
            
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <h4 className="font-medium text-green-800 mb-2">What We <span className="font-bold">Don't</span> Collect:</h4>
              <ul className="list-disc pl-5 space-y-1 text-green-700">
                <li>Resumes or CVs (they go directly to job posters)</li>
                <li>Personal identification documents</li>
                <li>Financial information (handled by your wallet provider)</li>
                <li>Sensitive personal data not required for our services</li>
              </ul>
            </div>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">2</span>
            How Job Applications Work
          </h3>
          <div className="bg-blue-50 rounded-lg p-4 ml-8">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800">Direct Connection</h4>
                  <p className="text-sm text-gray-700 mt-1">When you apply for a job, your application and resume go directly to the job poster's contact information. We don't store or process this information.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800">Secure Wallet Integration</h4>
                  <p className="text-sm text-gray-700 mt-1">Your wallet connection is secure and private. We only use it to verify your identity and process blockchain transactions.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800">No Middleman</h4>
                  <p className="text-sm text-gray-700 mt-1">We don't act as an intermediary for job applications. All communication happens directly between you and the employer.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
            Data Security & Privacy
          </h3>
          <div className="space-y-3 ml-8">
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
              <p className="text-amber-800 text-sm">
                <span className="font-medium">Security First:</span> We implement industry-standard security measures to protect your information. However, no method of transmission over the internet is 100% secure.
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">We collect minimal data:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Only what's necessary to provide our services</li>
                <li>No access to your wallet funds or private keys</li>
                <li>No storage of sensitive personal information</li>
              </ul>
            </div>
          </div>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">4</span>
            Your Control
          </h3>
          <div className="bg-green-50 rounded-lg p-4 ml-8">
            <p className="text-gray-700 mb-3">You're in control of your data:</p>
            <ul className="grid gap-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>View what data we have about you</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Request deletion of your account and data</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Opt-out of communications</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 mt-3">
              For any questions about your data, please contact our support team.
            </p>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <>
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex justify-center md:justify-start space-x-6 mb-4 md:mb-0">
              <a href="https://twitter.com/boneboard" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors duration-200">
                <FaXTwitter className="h-6 w-6" />
              </a>
              <button 
                onClick={openDiscord}
                className="text-gray-500 hover:text-indigo-500 transition-colors duration-200 focus:outline-none"
                aria-label="Join our Discord"
              >
                <FaDiscord className="h-6 w-6" />
              </button>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} BoneBoard. All rights reserved.
              </p>
              <div className="mt-1 text-xs text-gray-400">
                <button 
                  onClick={() => setShowTerms(true)}
                  className="hover:text-gray-500 focus:outline-none"
                >
                  Terms
                </button>
                <span className="mx-2">•</span>
                <button 
                  onClick={() => setShowPrivacy(true)}
                  className="hover:text-gray-500 focus:outline-none"
                >
                  Privacy
                </button>
                <span className="mx-2">•</span>
                <button 
                  onClick={openDiscord}
                  className="hover:text-gray-500 focus:outline-none"
                >
                  Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <Modal 
        isOpen={showTerms} 
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
      >
        {termsContent}
      </Modal>

      <Modal 
        isOpen={showPrivacy} 
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
      >
        {privacyContent}
      </Modal>
    </>
  );
};

export default Footer;
