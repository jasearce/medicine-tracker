import React, { useState } from 'react';
import { 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const Alert = ({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon: CustomIcon,
  actions,
  className = '',
  ...props
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Variant configurations
  const variantConfig = {
    success: {
      containerClasses: 'bg-success-50 border-success-200 text-success-800',
      iconClasses: 'text-success-400',
      icon: CheckCircleIcon,
      titleClasses: 'text-success-800'
    },
    warning: {
      containerClasses: 'bg-warning-50 border-warning-200 text-warning-800',
      iconClasses: 'text-warning-400',
      icon: ExclamationTriangleIcon,
      titleClasses: 'text-warning-800'
    },
    error: {
      containerClasses: 'bg-error-50 border-error-200 text-error-800',
      iconClasses: 'text-error-400',
      icon: XCircleIcon,
      titleClasses: 'text-error-800'
    },
    info: {
      containerClasses: 'bg-primary-50 border-primary-200 text-primary-800',
      iconClasses: 'text-primary-400',
      icon: InformationCircleIcon,
      titleClasses: 'text-primary-800'
    },
    neutral: {
      containerClasses: 'bg-surface-50 border-surface-200 text-surface-800',
      iconClasses: 'text-surface-400',
      icon: InformationCircleIcon,
      titleClasses: 'text-surface-800'
    }
  };

  const config = variantConfig[variant] || variantConfig.info;
  const Icon = CustomIcon || config.icon;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  return (
    <div
      className={`
        border rounded-lg p-4
        ${config.containerClasses}
        ${className}
      `}
      role="alert"
      {...props}
    >
      <div className="flex">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconClasses}`} />
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleClasses} mb-1`}>
              {title}
            </h3>
          )}
          
          <div className="text-sm">
            {children}
          </div>

          {/* Actions */}
          {actions && (
            <div className="mt-3">
              {actions}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={handleDismiss}
                className={`
                  inline-flex rounded-md p-1.5 transition-colors
                  ${config.iconClasses} hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current
                `}
              >
                <XMarkIcon className="h-5 w-5" />
                <span className="sr-only">Dismiss</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized alert components
export const SuccessAlert = ({ title = "Success", children, ...props }) => (
  <Alert variant="success" title={title} {...props}>
    {children}
  </Alert>
);

export const ErrorAlert = ({ title = "Error", children, ...props }) => (
  <Alert variant="error" title={title} {...props}>
    {children}
  </Alert>
);

export const WarningAlert = ({ title = "Warning", children, ...props }) => (
  <Alert variant="warning" title={title} {...props}>
    {children}
  </Alert>
);

export const InfoAlert = ({ title = "Information", children, ...props }) => (
  <Alert variant="info" title={title} {...props}>
    {children}
  </Alert>
);

// Medicine-specific alert components
export const MedicineReminderAlert = ({ medicine, onTake, onDismiss }) => {
  const actions = (
    <div className="flex space-x-3">
      <button
        onClick={onTake}
        className="bg-success-100 hover:bg-success-200 text-success-800 px-3 py-1 rounded-md text-xs font-medium transition-colors"
      >
        Mark as Taken
      </button>
      <button
        onClick={onDismiss}
        className="bg-warning-100 hover:bg-warning-200 text-warning-800 px-3 py-1 rounded-md text-xs font-medium transition-colors"
      >
        Snooze 15min
      </button>
    </div>
  );

  return (
    <Alert
      variant="warning"
      title="Medicine Reminder"
      actions={actions}
      className="mb-4"
    >
      It's time to take your <strong>{medicine.name}</strong> ({medicine.dose})
    </Alert>
  );
};

export const LowStockAlert = ({ medicine, onReorder, ...props }) => {
  const actions = (
    <button
      onClick={onReorder}
      className="bg-error-100 hover:bg-error-200 text-error-800 px-3 py-1 rounded-md text-xs font-medium transition-colors"
    >
      Set Reminder to Reorder
    </button>
  );

  return (
    <Alert
      variant="error"
      title="Low Stock Warning"
      actions={actions}
      dismissible
      {...props}
    >
      Your <strong>{medicine.name}</strong> is running low. Consider reordering soon.
    </Alert>
  );
};

export const AdherenceAlert = ({ percentage, period = 'week', ...props }) => {
  const variant = percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error';
  const title = percentage >= 80 ? 'Great Adherence!' : percentage >= 60 ? 'Adherence Could Improve' : 'Low Adherence';
  
  return (
    <Alert variant={variant} title={title} dismissible {...props}>
      Your medication adherence this {period} is {percentage}%. 
      {percentage < 80 && ' Try setting more reminders or talking to your healthcare provider.'}
    </Alert>
  );
};

export const WeightGoalAlert = ({ currentWeight, goalWeight, unit = 'kg', ...props }) => {
  const difference = Math.abs(currentWeight - goalWeight);
  const isAtGoal = difference <= 1;
  const variant = isAtGoal ? 'success' : 'info';
  const title = isAtGoal ? 'Goal Achieved!' : 'Weight Goal Progress';

  return (
    <Alert variant={variant} title={title} dismissible {...props}>
      {isAtGoal 
        ? `Congratulations! You've reached your weight goal of ${goalWeight}${unit}.`
        : `You're ${difference}${unit} away from your goal of ${goalWeight}${unit}. Keep it up!`
      }
    </Alert>
  );
};

// Toast-style alert for temporary notifications
export const ToastAlert = ({ 
  variant = 'info', 
  title, 
  children, 
  duration = 5000,
  onClose,
  className = '',
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <Alert
      variant={variant}
      title={title}
      dismissible
      onDismiss={() => {
        setIsVisible(false);
        onClose?.();
      }}
      className={`
        fixed top-4 right-4 z-50 max-w-sm shadow-lg
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${className}
      `}
      {...props}
    >
      {children}
    </Alert>
  );
};

export default Alert;