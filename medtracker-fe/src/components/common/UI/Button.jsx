import React from 'react';

const Button = ({ 
  variant = 'filled', 
  color = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  children, 
  className = '', 
  ...props 
}) => {
  // Base classes
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Size variants
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
    xl: "px-8 py-4 text-lg"
  };

  // Color and variant combinations
  const variantClasses = {
    filled: {
      primary: "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm hover:shadow-md",
      secondary: "bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 shadow-sm hover:shadow-md",
      success: "bg-success-500 text-white hover:bg-success-600 focus:ring-success-500 shadow-sm hover:shadow-md",
      warning: "bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500 shadow-sm hover:shadow-md",
      error: "bg-error-500 text-white hover:bg-error-600 focus:ring-error-500 shadow-sm hover:shadow-md",
      surface: "bg-surface-500 text-white hover:bg-surface-600 focus:ring-surface-500 shadow-sm hover:shadow-md"
    },
    outline: {
      primary: "border-2 border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500",
      secondary: "border-2 border-secondary-500 text-secondary-500 hover:bg-secondary-50 focus:ring-secondary-500",
      success: "border-2 border-success-500 text-success-500 hover:bg-success-50 focus:ring-success-500",
      warning: "border-2 border-warning-500 text-warning-500 hover:bg-warning-50 focus:ring-warning-500",
      error: "border-2 border-error-500 text-error-500 hover:bg-error-50 focus:ring-error-500",
      surface: "border-2 border-surface-500 text-surface-500 hover:bg-surface-50 focus:ring-surface-500"
    },
    ghost: {
      primary: "text-primary-500 hover:bg-primary-50 focus:ring-primary-500",
      secondary: "text-secondary-500 hover:bg-secondary-50 focus:ring-secondary-500",
      success: "text-success-500 hover:bg-success-50 focus:ring-success-500",
      warning: "text-warning-500 hover:bg-warning-50 focus:ring-warning-500",
      error: "text-error-500 hover:bg-error-50 focus:ring-error-500",
      surface: "text-surface-500 hover:bg-surface-50 focus:ring-surface-500"
    },
    soft: {
      primary: "bg-primary-100 text-primary-700 hover:bg-primary-200 focus:ring-primary-500",
      secondary: "bg-secondary-100 text-secondary-700 hover:bg-secondary-200 focus:ring-secondary-500",
      success: "bg-success-100 text-success-700 hover:bg-success-200 focus:ring-success-500",
      warning: "bg-warning-100 text-warning-700 hover:bg-warning-200 focus:ring-warning-500",
      error: "bg-error-100 text-error-700 hover:bg-error-200 focus:ring-error-500",
      surface: "bg-surface-100 text-surface-700 hover:bg-surface-200 focus:ring-surface-500"
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  // Build final className
  const finalClassName = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant]?.[color] || variantClasses.filled.primary,
    className
  ].join(' ');

  return (
    <button
      className={finalClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
};

export default Button;