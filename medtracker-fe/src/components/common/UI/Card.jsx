import React from 'react';

const Card = ({
  children,
  variant = 'default',
  padding = 'default',
  hover = false,
  clickable = false,
  onClick,
  className = '',
  header,
  footer,
  ...props
}) => {
  // Base classes
  const baseClasses = "bg-white rounded-lg border transition-all duration-200";

  // Variant classes
  const variantClasses = {
    default: "border-surface-200 shadow-sm",
    filled: "border-surface-200 bg-surface-50 shadow-sm",
    outlined: "border-surface-300 shadow-none",
    elevated: "border-surface-200 shadow-lg",
    ghost: "border-transparent shadow-none"
  };

  // Padding variants
  const paddingClasses = {
    none: "",
    sm: "p-4",
    default: "p-6",
    lg: "p-8"
  };

  // Interactive states
  const interactiveClasses = {
    hover: hover ? "hover:shadow-md hover:border-surface-300" : "",
    clickable: clickable ? "cursor-pointer hover:shadow-md hover:border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2" : ""
  };

  // Build final className
  const finalClassName = [
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    interactiveClasses.hover,
    interactiveClasses.clickable,
    className
  ].filter(Boolean).join(' ');

  const CardContent = () => (
    <>
      {header && (
        <div className="border-b border-surface-200 pb-4 mb-4">
          {header}
        </div>
      )}
      
      <div className={padding === 'none' ? 'p-6' : ''}>
        {children}
      </div>
      
      {footer && (
        <div className="border-t border-surface-200 pt-4 mt-4">
          {footer}
        </div>
      )}
    </>
  );

  if (clickable && onClick) {
    return (
      <button
        className={finalClassName}
        onClick={onClick}
        {...props}
      >
        <CardContent />
      </button>
    );
  }

  return (
    <div className={finalClassName} {...props}>
      <CardContent />
    </div>
  );
};

// Specialized card components
export const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  className = '',
  ...props 
}) => {
  const changeColors = {
    positive: 'text-success-600 bg-success-100',
    negative: 'text-error-600 bg-error-100',
    neutral: 'text-surface-600 bg-surface-100'
  };

  return (
    <Card variant="default" hover className={className} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-surface-600">{title}</p>
          <p className="text-2xl font-bold text-surface-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${changeColors[changeType]}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="ml-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export const MedicineCard = ({ 
  medicine, 
  onEdit, 
  onDelete, 
  onTake,
  className = '',
  ...props 
}) => {
  const { name, dose, scheduleType, nextDoseTime, isActive } = medicine;

  return (
    <Card 
      variant="default" 
      hover 
      className={`${!isActive ? 'opacity-60' : ''} ${className}`} 
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-surface-900 truncate">
            {name}
          </h3>
          <p className="text-sm text-surface-600 mt-1">{dose}</p>
          <div className="flex items-center mt-2 space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              scheduleType === 'daily' 
                ? 'bg-primary-100 text-primary-800'
                : scheduleType === 'weekly'
                  ? 'bg-secondary-100 text-secondary-800'
                  : 'bg-surface-100 text-surface-800'
            }`}>
              {scheduleType}
            </span>
            {nextDoseTime && (
              <span className="text-xs text-surface-500">
                Next: {nextDoseTime}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {onTake && isActive && (
            <button
              onClick={onTake}
              className="px-3 py-1 text-xs font-medium text-white bg-success-600 hover:bg-success-700 rounded-md transition-colors"
            >
              Take
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1 text-xs font-medium text-surface-700 bg-surface-100 hover:bg-surface-200 rounded-md transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1 text-xs font-medium text-error-700 bg-error-100 hover:bg-error-200 rounded-md transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export const WeightCard = ({ 
  weight, 
  date, 
  change, 
  unit = 'kg',
  className = '',
  ...props 
}) => {
  return (
    <Card variant="default" className={className} {...props}>
      <div className="text-center">
        <p className="text-3xl font-bold text-surface-900">
          {weight} <span className="text-lg font-medium text-surface-600">{unit}</span>
        </p>
        <p className="text-sm text-surface-600 mt-1">{date}</p>
        {change && (
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              parseFloat(change) > 0 
                ? 'text-warning-700 bg-warning-100' 
                : parseFloat(change) < 0
                  ? 'text-success-700 bg-success-100'
                  : 'text-surface-600 bg-surface-100'
            }`}>
              {change > 0 ? '+' : ''}{change} {unit}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default Card;