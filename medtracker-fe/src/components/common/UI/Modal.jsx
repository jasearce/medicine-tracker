import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  footer
}) => {
  // Size variants
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl mx-4'
  };

  // Handle ESC key
  useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [closeOnEsc, isOpen, onClose]);

  // Prevent body scroll when modal is open
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

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={handleOverlayClick}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`
            relative w-full ${sizeClasses[size]} transform transition-all duration-300 scale-100 opacity-100
            ${className}
          `}
        >
          {/* Modal Content */}
          <div className="bg-white rounded-lg shadow-xl border border-surface-200">
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={`
                flex items-center justify-between px-6 py-4 border-b border-surface-200
                ${headerClassName}
              `}>
                {title && (
                  <h3 className="text-lg font-semibold text-surface-900">
                    {title}
                  </h3>
                )}
                
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className={`px-6 py-4 ${bodyClassName}`}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className={`
                px-6 py-4 border-t border-surface-200 bg-surface-50 rounded-b-lg
                ${footerClassName}
              `}>
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Predefined modal types for common use cases
export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  confirmVariant = "error",
  loading = false 
}) => {
  const footer = (
    <div className="flex space-x-3 justify-end">
      <button
        onClick={onClose}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium text-surface-700 bg-white border border-surface-300 rounded-lg hover:bg-surface-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`
          px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50
          ${confirmVariant === 'error' 
            ? 'bg-error-600 hover:bg-error-700 focus:ring-error-500' 
            : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
          }
        `}
      >
        {loading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </div>
        ) : confirmText}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={footer}
      closeOnOverlayClick={!loading}
      closeOnEsc={!loading}
    >
      <p className="text-surface-600">{message}</p>
    </Modal>
  );
};

export default Modal;