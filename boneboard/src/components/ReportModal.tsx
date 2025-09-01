import React, { useState } from 'react';
import { FaTimes, FaExclamationTriangle, FaFlag } from 'react-icons/fa';
import { useWallet } from '../contexts/WalletContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onSubmit: (reportData: ReportData) => Promise<void>;
}

export interface ReportData {
  title: string;
  description: string;
  scam_type: string;
  severity: 'low' | 'medium' | 'high';
  scam_identifier: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  onSubmit
}) => {
  const { walletAddress } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ReportData>({
    title: '',
    description: '',
    scam_type: 'project',
    severity: 'medium',
    scam_identifier: projectId
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your wallet to submit a report');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        scam_type: 'project',
        severity: 'medium',
        scam_identifier: projectId
      });
    } catch (error: any) {
      console.error('Error submitting report:', error);
      
      // Check if it's a rate limit error
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        const toast = (await import('react-toastify')).toast;
        toast.error('You can only submit 2 reports every 3 minutes. Please wait before submitting another report.', {
          position: 'top-right',
          autoClose: 5000,
        });
      } else {
        const toast = (await import('react-toastify')).toast;
        toast.error('Failed to submit report. Please try again.', {
          position: 'top-right',
          autoClose: 3000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FaFlag className="text-red-500" size={20} />
            <h2 className="text-xl font-bold">Report Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Reporting: {projectName}
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="text-yellow-600 mt-0.5" size={16} />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Important:</p>
                  <p>
                    Please provide detailed information about why you're reporting this project. 
                    False reports may result in action against your account.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Report Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Title *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of the issue"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100 characters
              </div>
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type *
              </label>
              <select
                value={formData.scam_type}
                onChange={(e) => setFormData({ ...formData, scam_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="project">Malicious/Scam Project</option>
                <option value="user">Fake/Impersonation User</option>
                <option value="website">Malicious Website</option>
                <option value="wallet_address">Suspicious Wallet Address</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity *
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="low">Low - Minor issue</option>
                <option value="medium">Medium - Moderate concern</option>
                <option value="high">High - Urgent/dangerous</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Description *
              </label>
              <textarea
                required
                rows={5}
                maxLength={1000}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide detailed information about the issue, including any evidence or context..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </div>
            </div>


            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || !walletAddress}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>

            {!walletAddress && (
              <div className="text-center text-sm text-red-600 mt-2">
                Please connect your wallet to submit a report
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
