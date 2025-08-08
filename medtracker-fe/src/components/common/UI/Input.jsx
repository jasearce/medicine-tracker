import React, { forwardRef } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  error = null,
  success = false,
  helperText,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  size = 'md',
  variant = 'default',
  className = '',
  id,
  name,
  ...props
}, ref) => {
  // Generate unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  // Size variants
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-4 py-3 text-base"
  };

  // Base input classes
  const baseClasses = "block w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

  // Variant classes
  const variantClasses = {
    default: "border-surface-300 focus:border-primary-500 focus:ring-primary-500",
    filled: "bg-surface-50 border-surface-200 focus:bg-white focus:border-primary-500 focus:ring-primary-500"
  };

  // State-specific classes
  let stateClasses = variantClasses[variant];
  
  if (error) {
    stateClasses = "border-error-300 focus:border-error-500 focus:ring-error-500 bg-error-50";
  } else if (success) {
    stateClasses = "border-success-300 focus:border-success-500 focus:ring-success-500 bg-success-50";
  }

  // Icon padding adjustments
  const iconPadding = {
    leading: LeadingIcon ? "pl-10" : "",
    trailing: TrailingIcon || error || success ? "pr-10" : ""
  };

  // Build final input className
  const inputClassName = [
    baseClasses,
    sizeClasses[size],
    stateClasses,
    iconPadding.leading,
    iconPadding.trailing,
    className
  ].join(' ');

  // Determine trailing icon
  const getTrailingIcon = () => {
    if (error) return ExclamationCircleIcon;
    if (success) return CheckCircleIcon;
    return TrailingIcon;
  };

  const FinalTrailingIcon = getTrailingIcon();

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-surface-700 mb-2"
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Leading Icon */}
        {LeadingIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LeadingIcon className="h-5 w-5 text-surface-400" />
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          type={type}
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClassName}
          {...props}
        />

        {/* Trailing Icon */}
        {FinalTrailingIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <FinalTrailingIcon 
              className={`h-5 w-5 ${
                error 
                  ? 'text-error-400' 
                  : success 
                    ? 'text-success-400' 
                    : 'text-surface-400'
              }`} 
            />
          </div>
        )}
      </div>

      {/* Helper Text / Error Message */}
      {(helperText || error) && (
        <p className={`mt-2 text-sm ${
          error 
            ? 'text-error-600' 
            : success 
              ? 'text-success-600' 
              : 'text-surface-500'
        }`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;