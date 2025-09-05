import React, { useState, useEffect } from 'react';
import { FaDiscord, FaLayerGroup } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import Modal from './Modal';

const Footer: React.FC = () => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCookies, setShowCookies] = useState(false);

  // Listen for cookie policy modal trigger from CookieConsent component
  useEffect(() => {
    const handleOpenCookiePolicy = () => {
      setShowCookies(true);
    };

    window.addEventListener('openCookiePolicy', handleOpenCookiePolicy);
    return () => window.removeEventListener('openCookiePolicy', handleOpenCookiePolicy);
  }, []);

  const openDiscord = () => {
    window.open('https://discord.gg/boneboard', '_blank', 'noopener,noreferrer');
  };

  const openWhitepaper = () => {
    window.open('https://www.walletpup.com/boneboard-whitepaper', '_blank', 'noopener,noreferrer');
  };

  const termsContent = (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">1</span>
            Acceptance of Terms
          </h3>
          <p className="text-gray-700 pl-8">
            By accessing and using BoneBoard, you accept and agree to be bound by these Terms of Service, including the use of Cardano blockchain and smart contracts for all transactions. If you do not agree, please do not use our platform.
          </p>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">2</span>
            Platform Services
          </h3>
          <p className="text-gray-700 pl-8">
            BoneBoard provides a comprehensive Cardano ecosystem platform offering:
          </p>
          <ul className="list-disc pl-12 space-y-2 text-gray-700">
            <li>Job board for blockchain and Cardano ecosystem positions</li>
            <li>Project showcase and verification system</li>
            <li>Crowdfunding platform for Cardano projects with ADA payments</li>
            <li>User profiles and portfolio management</li>
            <li>Community reporting and moderation tools</li>
          </ul>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
            Blockchain Transactions & Payments
          </h3>
          <p className="text-gray-700 pl-8">
            All platform transactions are processed through the Cardano blockchain:
          </p>
          <ul className="list-disc pl-12 space-y-2 text-gray-700">
            <li>Job posting fees are paid in ADA via smart contracts</li>
            <li>Project funding contributions are sent directly to project wallets</li>
            <li>All transactions are immutable and recorded on the blockchain</li>
            <li>Users must connect a compatible Cardano wallet to use paid features</li>
            <li>Transaction fees and network costs are the user's responsibility</li>
          </ul>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">4</span>
            User Conduct & Prohibited Activities
          </h3>
          <p className="text-gray-700 pl-8">
            Users agree to use BoneBoard in compliance with all applicable laws. Prohibited activities include:
          </p>
          <ul className="list-disc pl-12 space-y-2 text-gray-700">
            <li>Posting fraudulent, misleading, or deceptive content</li>
            <li>Creating fake projects or jobs to collect funds</li>
            <li>Using multiple wallets to circumvent fraud detection systems</li>
            <li>Harassing, bullying, or threatening other users</li>
            <li>Violating intellectual property rights or copyrights</li>
            <li>Distributing malware, viruses, or harmful code</li>
            <li>Engaging in any form of discrimination or hate speech</li>
            <li>Attempting to manipulate ratings or verification systems</li>
          </ul>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">5</span>
            Content & Job Postings
          </h3>
          <p className="text-gray-700 pl-8">
            All content posted on BoneBoard must meet our standards:
          </p>
          <ul className="list-disc pl-12 space-y-2 text-gray-700">
            <li>Job postings must be accurate, legitimate, and comply with employment laws</li>
            <li>Project descriptions must truthfully represent the project's goals and status</li>
            <li>All content must be appropriate for a professional environment</li>
            <li>BoneBoard reserves the right to remove content that violates these terms</li>
            <li>Users are responsible for the accuracy of their posted content</li>
          </ul>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">6</span>
            Fraud Prevention & Security
          </h3>
          <p className="text-gray-700 pl-8">
            BoneBoard implements security measures to protect users:
          </p>
          <ul className="list-disc pl-12 space-y-2 text-gray-700">
            <li>Browser fingerprinting and device tracking for fraud detection</li>
            <li>Wallet address monitoring to prevent self-funding schemes</li>
            <li>Rate limiting on reports and API access</li>
            <li>Community reporting system for inappropriate content</li>
            <li>Users may not circumvent or interfere with security measures</li>
            <li>Suspicious activity may result in account restrictions</li>
          </ul>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">7</span>
            Wallet Connection & Security
          </h3>
          <p className="text-gray-700 pl-8">
            Wallet security is a shared responsibility:
          </p>
          <ul className="list-disc pl-12 space-y-2 text-gray-700">
            <li>Users are solely responsible for wallet security and private keys</li>
            <li>BoneBoard never has access to your wallet funds or private keys</li>
            <li>Always verify transaction details before confirming</li>
            <li>Report suspicious activity immediately</li>
            <li>Use only official wallet providers and verified smart contracts</li>
          </ul>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">8</span>
            Limitation of Liability
          </h3>
          <p className="text-gray-700 pl-8">
            BoneBoard provides this platform "as is" and is not responsible for: the accuracy of job postings or project information; the conduct of users; blockchain transaction failures; wallet security breaches; or any financial losses. Users engage with the platform at their own risk and should conduct their own due diligence.
          </p>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">9</span>
            Dispute Resolution
          </h3>
          <p className="text-gray-700 pl-8">
            Disputes between users should be resolved directly. BoneBoard may provide assistance but is not obligated to mediate disputes. For platform-related issues, users may contact our support team through Discord.
          </p>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">10</span>
            Modifications & Termination
          </h3>
          <p className="text-gray-700 pl-8">
            BoneBoard reserves the right to modify these terms, suspend or terminate accounts, or discontinue services at any time. Continued use after modifications constitutes acceptance of new terms.
          </p>
        </section>
      </div>
    </div>
  );

  const privacyContent = (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">1</span>
            Information We Collect
          </h3>
          <div className="ml-8 space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Personal Information:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Email addresses for account communication</li>
                <li>Usernames and profile information you provide</li>
                <li>Profile pictures and uploaded content</li>
                <li>Social media links (Twitter, Discord) when provided</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Blockchain & Wallet Data:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Cardano wallet addresses for transactions</li>
                <li>Transaction hashes and blockchain data</li>
                <li>Payment information for job postings and project funding</li>
                <li>Smart contract interaction data</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Technical & Security Data:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>IP addresses and device information</li>
                <li>Browser fingerprints for fraud detection</li>
                <li>Device identifiers and session data</li>
                <li>Usage patterns and activity logs</li>
                <li>Local storage data for user preferences</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Platform Activity:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Job postings, project submissions, and content you create</li>
                <li>Saved jobs and bookmarked content</li>
                <li>Reports submitted through our moderation system</li>
                <li>Community interactions and verification status</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-gray-300 pl-4">
              <h4 className="font-medium text-gray-800 mb-2">What We <span className="font-bold">Don't</span> Collect:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Private keys or seed phrases (never share these!)</li>
                <li>Wallet funds or financial account information</li>
                <li>Resumes or CVs (sent directly to employers)</li>
                <li>Personal identification documents</li>
                <li>Sensitive personal data not required for our services</li>
              </ul>
            </div>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">2</span>
            How We Use Your Information
          </h3>
          <div className="ml-8 space-y-3">
            <p className="text-gray-700">
              We use your information to provide, maintain, and improve our services:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Process transactions through Cardano blockchain</li>
              <li>Execute and enforce smart contract terms</li>
              <li>Verify project and user authenticity</li>
              <li>Prevent fraud and detect suspicious activity</li>
              <li>Provide customer support for blockchain-related issues</li>
              <li>Send transaction confirmations and platform notifications</li>
              <li>Moderate content and enforce community standards</li>
              <li>Improve platform security and user experience</li>
            </ul>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
            Fraud Detection & Security Measures
          </h3>
          <div className="ml-8">
            <p className="text-gray-700 mb-3">
              <span className="font-medium">Important:</span> We implement advanced security measures to protect our community:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li><span className="font-medium">Browser Fingerprinting:</span> We collect device and browser characteristics to create unique fingerprints for fraud detection</li>
              <li><span className="font-medium">Wallet Monitoring:</span> We track wallet addresses and transaction patterns to prevent self-funding and manipulation</li>
              <li><span className="font-medium">Device Tracking:</span> We monitor device usage patterns to detect suspicious account switching</li>
              <li><span className="font-medium">Session Analysis:</span> We analyze user sessions to identify potential fraudulent behavior</li>
              <li><span className="font-medium">Rate Limiting:</span> We limit API access and report submissions to prevent abuse</li>
            </ul>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">4</span>
            Information Sharing & Disclosure
          </h3>
          <div className="ml-8 space-y-3">
            <p className="text-gray-700">
              We do not sell your personal information. We may share information in these limited circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Cardano blockchain validators (required for transaction processing)</li>
              <li>Law enforcement when legally required</li>
              <li>Security researchers for platform auditing (anonymized data only)</li>
              <li>Service providers who assist with platform operations (under strict confidentiality)</li>
              <li>In connection with business transactions (mergers, acquisitions) while maintaining blockchain data immutability</li>
            </ul>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">5</span>
            Blockchain Privacy & Transparency
          </h3>
          <div className="ml-8">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800">Public Blockchain Data</h4>
                  <p className="text-sm text-gray-700 mt-1">All transactions are permanently recorded on the Cardano blockchain and are publicly viewable. This includes wallet addresses, transaction amounts, and timestamps.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800">Wallet Security</h4>
                  <p className="text-sm text-gray-700 mt-1">We never have access to your private keys or wallet funds. All transactions require your explicit approval through your connected wallet.</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-800">Direct Payments</h4>
                  <p className="text-sm text-gray-700 mt-1">Project funding goes directly to project wallets. We don't hold or control user funds at any point in the process.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">6</span>
            Data Retention & Storage
          </h3>
          <div className="ml-8 space-y-3">
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li><span className="font-medium">Account Data:</span> Retained while your account is active and for 30 days after deletion</li>
              <li><span className="font-medium">Blockchain Data:</span> Permanently stored on Cardano blockchain (cannot be deleted)</li>
              <li><span className="font-medium">Security Logs:</span> Retained for 90 days for fraud detection and platform security</li>
              <li><span className="font-medium">Content:</span> Job postings and projects retained according to platform terms</li>
              <li><span className="font-medium">Local Storage:</span> Stored in your browser and can be cleared by you at any time</li>
            </ul>
          </div>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">7</span>
            Your Privacy Rights
          </h3>
          <div className="ml-8">
            <p className="text-gray-700 mb-3">You have the following rights regarding your data:</p>
            <ul className="grid gap-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>Access and view what data we have about you</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>Request correction of inaccurate information</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>Request deletion of your account and associated data</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>Opt-out of non-essential communications</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">✓</span>
                <span>Export your data in a portable format</span>
              </li>
            </ul>
            <p className="text-sm text-gray-500 mt-3">
              Note: Blockchain transactions cannot be deleted due to the immutable nature of distributed ledgers.
            </p>
          </div>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">8</span>
            Contact & Data Requests
          </h3>
          <div className="ml-8">
            <p className="text-gray-700">
              For privacy-related questions, data requests, or to exercise your rights, please contact our support team through Discord. We will respond to legitimate requests within 30 days.
            </p>
          </div>
        </section>
      </div>
    </div>
  );

  const cookieContent = (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <p className="text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">1</span>
            What Are Cookies & Similar Technologies
          </h3>
          <div className="ml-8 space-y-3">
            <p className="text-gray-700">
              BoneBoard uses cookies, local storage, and browser fingerprinting technologies to enhance your experience and protect our platform:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li><span className="font-medium">Cookies:</span> Small text files stored in your browser to remember your preferences</li>
              <li><span className="font-medium">Local Storage:</span> Browser storage for saved jobs, user preferences, and session data</li>
              <li><span className="font-medium">Browser Fingerprinting:</span> Collection of device and browser characteristics for security</li>
              <li><span className="font-medium">Session Storage:</span> Temporary storage for wallet connections and transaction monitoring</li>
            </ul>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">2</span>
            Types of Cookies We Use
          </h3>
          <div className="ml-8 space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Essential Cookies (Required)</h4>
              <p className="text-sm text-gray-700 mb-2">These cookies are necessary for the platform to function:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                <li>Wallet connection and authentication</li>
                <li>Transaction monitoring and confirmation</li>
                <li>Session management and security</li>
                <li>Form data preservation during payment processes</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Security & Fraud Prevention</h4>
              <p className="text-sm text-gray-700 mb-2">These help us protect the platform and users:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                <li>Browser fingerprinting for fraud detection</li>
                <li>Device tracking to prevent manipulation</li>
                <li>Wallet address monitoring for security</li>
                <li>Rate limiting and abuse prevention</li>
              </ul>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Functional Cookies</h4>
              <p className="text-sm text-gray-700 mb-2">These enhance your user experience:</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                <li>Saved jobs and bookmarks</li>
                <li>User preferences and settings</li>
                <li>Theme and display preferences</li>
                <li>Search filters and sorting options</li>
              </ul>
            </div>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">3</span>
            Browser Fingerprinting for Security
          </h3>
          <div className="ml-8">
            <p className="text-gray-700 mb-3">
              <span className="font-medium">Important Security Feature:</span> We collect browser and device characteristics to create unique fingerprints:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Screen resolution and color depth</li>
              <li>Browser type, version, and plugins</li>
              <li>Operating system and device information</li>
              <li>Timezone and language settings</li>
              <li>Canvas and WebGL fingerprints</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              This data helps us detect fraudulent activity, prevent self-funding schemes, and protect the integrity of our crowdfunding platform.
            </p>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">4</span>
            Local Storage & Data Persistence
          </h3>
          <div className="ml-8 space-y-3">
            <p className="text-gray-700">
              We use browser local storage to enhance your experience:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li><span className="font-medium">Saved Jobs:</span> Your bookmarked jobs (savedJobs_[walletAddress])</li>
              <li><span className="font-medium">Transaction Monitoring:</span> Pending blockchain transactions</li>
              <li><span className="font-medium">User Preferences:</span> Settings and display options</li>
              <li><span className="font-medium">Security Data:</span> Fraud detection and device tracking</li>
              <li><span className="font-medium">Project Ownership:</span> Anti-fraud project association data</li>
            </ul>
          </div>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">5</span>
            Managing Your Cookie Preferences
          </h3>
          <div className="ml-8 space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Browser Controls:</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
                <li>Clear cookies and local storage through browser settings</li>
                <li>Disable cookies (may affect platform functionality)</li>
                <li>Use private/incognito browsing mode</li>
                <li>Configure browser privacy settings</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-gray-400 pl-4">
              <p className="text-gray-700 text-sm">
                <span className="font-medium">Note:</span> Disabling essential cookies will prevent you from using core platform features like wallet connection, transaction monitoring, and fraud protection systems.
              </p>
            </div>
          </div>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">6</span>
            Third-Party Services
          </h3>
          <div className="ml-8">
            <p className="text-gray-700">
              BoneBoard may integrate with third-party services that use their own cookies and tracking technologies:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-gray-700 mt-2">
              <li>Cardano wallet providers (Nami, Eternl, Vespr, etc.)</li>
              <li>Blockchain explorers and transaction services</li>
              <li>Social media platforms (Twitter, Discord)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-3">
              These services have their own privacy policies and cookie practices.
            </p>
          </div>
        </section>
        
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-2">7</span>
            Updates to This Policy
          </h3>
          <div className="ml-8">
            <p className="text-gray-700">
              We may update this Cookie Policy to reflect changes in our practices or legal requirements. Continued use of BoneBoard after updates constitutes acceptance of the revised policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <>
      <footer className="bg-white border-t border-gray-200 relative z-20">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Social Links */}
            <div className="flex justify-center md:justify-start items-center space-x-6">
              <a 
                href="https://twitter.com/boneboard" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-500 hover:text-blue-500 transition-all duration-200 group"
                title="Follow us on X (Twitter)"
              >
                <FaXTwitter className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </a>
              
              <button 
                onClick={openDiscord}
                className="text-gray-500 hover:text-indigo-500 transition-all duration-200 focus:outline-none group"
                aria-label="Join our Discord"
                title="Join our Discord"
              >
                <FaDiscord className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
              
              <button 
                onClick={openWhitepaper}
                className="text-gray-500 hover:text-green-500 transition-all duration-200 focus:outline-none group"
                aria-label="View Whitepaper"
                title="View Whitepaper"
              >
                <FaLayerGroup className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>
            
            {/* Copyright and Links */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-500">
                © {new Date().getFullYear()} BoneBoard. All rights reserved.
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <button 
                  onClick={() => setShowTerms(true)}
                  className="hover:text-gray-600 focus:outline-none transition-colors"
                >
                  Terms
                </button>
                <button 
                  onClick={() => setShowPrivacy(true)}
                  className="hover:text-gray-600 focus:outline-none transition-colors"
                >
                  Privacy
                </button>
                <button 
                  onClick={() => setShowCookies(true)}
                  className="hover:text-gray-600 focus:outline-none transition-colors"
                >
                  Cookies
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
        showUnderstandButton={true}
      >
        {termsContent}
      </Modal>

      <Modal 
        isOpen={showPrivacy} 
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
        showUnderstandButton={true}
      >
        {privacyContent}
      </Modal>

      <Modal 
        isOpen={showCookies} 
        onClose={() => setShowCookies(false)}
        title="Cookie Policy"
        showUnderstandButton={true}
      >
        {cookieContent}
      </Modal>
    </>
  );
};

export default Footer;
