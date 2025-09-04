import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showUnderstandButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, showUnderstandButton = false }) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true" 
          onClick={onClose}
        ></div>

        {/* Modal Container */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          {title && (
            <div className="px-6 pt-6 pb-4 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            <style dangerouslySetInnerHTML={{
              __html: `
                .modal-content::-webkit-scrollbar {
                  display: none;
                }
              `
            }} />
            <div className="modal-content">
              {children}
            </div>
          </div>
          
          {/* Footer - only show for TOS/Privacy/Cookies */}
          {showUnderstandButton && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                I Understand
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
