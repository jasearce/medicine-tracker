import React, { useState } from 'react';
import { 
  BellIcon, 
  UserCircleIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../hooks/useAuth';

const Header = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-surface-300 shadow-sm sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MT</span>
              </div>
              <h1 className="text-xl font-semibold text-surface-900">
                MedTracker
              </h1>
            </div>
          </div>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search medicines, logs..."
                className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Quick Add Button */}
            <button className="btn variant-filled-primary p-2 rounded-lg hover:bg-primary-600 transition-colors">
              <PlusIcon className="h-5 w-5" />
              <span className="sr-only">Quick Add</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors relative"
              >
                <BellIcon className="h-6 w-6" />
                {/* Notification Badge */}
                <span className="absolute top-1 right-1 h-2 w-2 bg-error-500 rounded-full"></span>
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-surface-200 z-50">
                  <div className="p-4 border-b border-surface-200">
                    <h3 className="text-lg font-semibold text-surface-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-surface-100 hover:bg-surface-50">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-warning-500 rounded-full mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900">
                            Medicine Reminder
                          </p>
                          <p className="text-sm text-surface-600">
                            Time to take Aspirin (100mg)
                          </p>
                          <p className="text-xs text-surface-400 mt-1">5 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 text-center">
                      <button className="text-sm text-primary-600 hover:text-primary-700">
                        View all notifications
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded-lg transition-colors"
              >
                <UserCircleIcon className="h-6 w-6" />
                <span className="hidden md:block text-sm font-medium">
                  {user?.firstName || user?.email?.split('@')[0] || 'User'}
                </span>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-surface-200 z-50">
                  <div className="p-4 border-b border-surface-200">
                    <p className="text-sm font-medium text-surface-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-surface-600">{user?.email}</p>
                  </div>
                  <div className="py-2">
                    <button className="w-full px-4 py-2 text-left text-sm text-surface-700 hover:bg-surface-50 flex items-center space-x-2">
                      <UserCircleIcon className="h-4 w-4" />
                      <span>Profile</span>
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-surface-700 hover:bg-surface-50 flex items-center space-x-2">
                      <Cog6ToothIcon className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <hr className="my-2 border-surface-200" />
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-error-600 hover:bg-error-50 flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;