import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  variant = 'spinner',
  text,
  className = '',
  overlay = false,
  fullScreen = false 
}) => {
  // Size variants
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  // Color variants
  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
    surface: 'text-surface-600',
    white: 'text-white'
  };

  // Text size based on spinner size
  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  // Spinner variants
  const SpinnerVariant = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const DotsVariant = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${sizeClasses[size]} ${colorClasses[color]} bg-current rounded-full
            animate-pulse
          `}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const PulseVariant = () => (
    <div
      className={`
        ${sizeClasses[size]} ${colorClasses[color]} bg-current rounded-full
        animate-ping ${className}
      `}
    />
  );

  const BarsVariant = () => (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`
            w-1 bg-current rounded-full animate-pulse
            ${colorClasses[color]}
            ${size === 'xs' ? 'h-3' : size === 'sm' ? 'h-4' : size === 'md' ? 'h-6' : size === 'lg' ? 'h-8' : 'h-12'}
          `}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.2s'
          }}
        />
      ))}
    </div>
  );

  // Select variant component
  const getVariantComponent = () => {
    switch (variant) {
      case 'dots':
        return <DotsVariant />;
      case 'pulse':
        return <PulseVariant />;
      case 'bars':
        return <BarsVariant />;
      default:
        return <SpinnerVariant />;
    }
  };

  // Content component
  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center space-y-3">
      {getVariantComponent()}
      {text && (
        <p className={`${textSizeClasses[size]} ${colorClasses[color]} font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  // Full screen loading
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90">
        <LoadingContent />
      </div>
    );
  }

  // Overlay loading
  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
        <LoadingContent />
      </div>
    );
  }

  // Inline loading
  return <LoadingContent />;
};

// Specialized loading components
export const PageLoader = ({ text = "Loading..." }) => (
  <LoadingSpinner 
    size="lg" 
    text={text} 
    fullScreen 
    color="primary"
  />
);

export const ButtonLoader = ({ size = 'sm' }) => (
  <LoadingSpinner 
    size={size} 
    color="white" 
    className="mr-2"
  />
);

export const CardLoader = ({ text }) => (
  <div className="flex items-center justify-center p-8">
    <LoadingSpinner 
      size="md" 
      text={text}
      color="surface"
    />
  </div>
);

export const TableLoader = () => (
  <div className="flex items-center justify-center py-12">
    <LoadingSpinner 
      size="lg" 
      text="Loading data..."
      color="surface"
    />
  </div>
);

export const InlineLoader = ({ size = 'sm', color = 'primary' }) => (
  <LoadingSpinner 
    size={size} 
    color={color}
    className="inline-block"
  />
);

// Skeleton loaders for content placeholders
export const SkeletonLoader = ({ 
  lines = 3, 
  className = '',
  animate = true 
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`
          h-4 bg-surface-200 rounded
          ${animate ? 'animate-pulse' : ''}
          ${i === lines - 1 ? 'w-3/4' : 'w-full'}
        `}
      />
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-white rounded-lg border border-surface-200 p-6 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="h-12 w-12 bg-surface-200 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-200 rounded w-3/4" />
          <div className="h-3 bg-surface-200 rounded w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-surface-200 rounded" />
        <div className="h-3 bg-surface-200 rounded w-5/6" />
      </div>
    </div>
  </div>
);

export default LoadingSpinner;