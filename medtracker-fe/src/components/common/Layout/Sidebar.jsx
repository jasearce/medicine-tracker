import React from 'react';
import { 
  HomeIcon,
  BeakerIcon,
  ClipboardDocumentListIcon,
  ScaleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeSolid,
  BeakerIcon as BeakerSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  ScaleIcon as ScaleSolid,
  ChartBarIcon as ChartBarSolid,
  Cog6ToothIcon as CogSolid
} from '@heroicons/react/24/solid';

const Sidebar = ({ isOpen, onClose, currentPath = '/' }) => {
  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      iconSolid: HomeSolid,
      description: 'Overview and quick actions'
    },
    {
      name: 'Medicines',
      href: '/medicines',
      icon: BeakerIcon,
      iconSolid: BeakerSolid,
      description: 'Manage your medications'
    },
    {
      name: 'Medicine Logs',
      href: '/medicine-logs',
      icon: ClipboardDocumentListIcon,
      iconSolid: ClipboardSolid,
      description: 'Track intake and adherence'
    },
    {
      name: 'Weight Tracking',
      href: '/weights',
      icon: ScaleIcon,
      iconSolid: ScaleSolid,
      description: 'Monitor weight trends'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      iconSolid: ChartBarSolid,
      description: 'Health insights and reports'
    }
  ];

  const secondaryNavigation = [
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      iconSolid: CogSolid,
      description: 'App preferences'
    }
  ];

  const NavItem = ({ item, isActive = false }) => {
    const Icon = isActive ? item.iconSolid : item.icon;
    
    return (
      <a
        href={item.href}
        className={`
          flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group
          ${isActive 
            ? 'bg-primary-500 text-white' 
            : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900'
          }
        `}
        onClick={onClose}
      >
        <Icon className={`
          mr-3 h-5 w-5 flex-shrink-0
          ${isActive 
            ? 'text-white' 
            : 'text-surface-400 group-hover:text-surface-600'
          }
        `} />
        <div className="flex-1 min-w-0">
          <span className="block">{item.name}</span>
          <span className={`
            block text-xs mt-0.5
            ${isActive 
              ? 'text-primary-100' 
              : 'text-surface-500 group-hover:text-surface-600'
            }
          `}>
            {item.description}
          </span>
        </div>
      </a>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-surface-200 lg:hidden">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MT</span>
              </div>
              <span className="text-lg font-semibold text-surface-900">MedTracker</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            <div className="space-y-1">
              {navigation.map((item) => (
                <NavItem
                  key={item.name}
                  item={item}
                  isActive={currentPath === item.href}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-surface-200 my-6"></div>

            {/* Secondary Navigation */}
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                Preferences
              </h3>
              {secondaryNavigation.map((item) => (
                <NavItem
                  key={item.name}
                  item={item}
                  isActive={currentPath === item.href}
                />
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-surface-200">
            <div className="bg-surface-50 rounded-lg p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
                    <BeakerIcon className="h-4 w-4 text-success-600" />
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900">
                    Health Tip
                  </p>
                  <p className="text-xs text-surface-600 mt-1">
                    Take medicines with food when prescribed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;