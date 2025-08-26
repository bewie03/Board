import React from 'react';
import { motion } from 'framer-motion';

interface MessagingAgreementProps {
  onAccept: () => void;
  onDecline: () => void;
}

const MessagingAgreement: React.FC<MessagingAgreementProps> = ({ onAccept, onDecline }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Messaging Guidelines</h2>
          <p className="text-gray-600">Please read and agree to our messaging terms before continuing</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">🚫 Prohibited Activities</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Scamming, fraud, or deceptive practices</li>
              <li>• Sharing illegal content or activities</li>
              <li>• Harassment, abuse, or threatening behavior</li>
              <li>• Spam or unsolicited promotional messages</li>
              <li>• Sharing personal financial information</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">✅ Best Practices</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Be professional and respectful</li>
              <li>• Clearly communicate project requirements</li>
              <li>• Use official payment methods only</li>
              <li>• Report suspicious activity immediately</li>
              <li>• Keep conversations project-focused</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notice</h3>
            <p className="text-sm text-yellow-700">
              All messages are monitored for safety and compliance. Violations may result in account suspension or permanent ban.
              Never share wallet private keys or seed phrases.
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            I Agree & Continue
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MessagingAgreement;
