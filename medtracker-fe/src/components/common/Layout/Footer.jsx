import React from 'react';
import { 
  HeartIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Support',
      links: [
        { name: 'Help Center', href: '/help', icon: QuestionMarkCircleIcon },
        { name: 'Contact Us', href: '/contact' },
        { name: 'System Status', href: '/status' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '/privacy', icon: ShieldCheckIcon },
        { name: 'Terms of Service', href: '/terms', icon: DocumentTextIcon },
        { name: 'Data Security', href: '/security' }
      ]
    },
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '/features' },
        { name: 'Changelog', href: '/changelog' },
        { name: 'API Docs', href: '/api-docs' }
      ]
    }
  ];

  return (
    <footer className="bg-white border-t border-surface-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MT</span>
                </div>
                <span className="text-lg font-semibold text-surface-900">MedTracker</span>
              </div>
              <p className="text-sm text-surface-600 mb-4">
                Your personal medicine companion for better health management and medication adherence.
              </p>
              <div className="flex items-center space-x-1 text-sm text-surface-500">
                <span>Made with</span>
                <HeartIcon className="h-4 w-4 text-error-500" />
                <span>for better health</span>
              </div>
            </div>

            {/* Footer Links */}
            {footerLinks.map((section) => (
              <div key={section.title} className="col-span-1">
                <h3 className="text-sm font-semibold text-surface-900 uppercase tracking-wider mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className="flex items-center text-sm text-surface-600 hover:text-primary-600 transition-colors"
                        >
                          {Icon && <Icon className="h-4 w-4 mr-2" />}
                          {link.name}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-surface-200 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-4 text-sm text-surface-500">
              <span>© {currentYear} MedTracker. All rights reserved.</span>
              <span className="hidden md:block">•</span>
              <span className="hidden md:block">Version 1.0.0</span>
            </div>

            {/* Health Disclaimer */}
            <div className="flex items-center space-x-2 text-xs text-surface-400 bg-surface-50 px-3 py-2 rounded-lg">
              <ShieldCheckIcon className="h-4 w-4 flex-shrink-0" />
              <span className="text-center md:text-left">
                This app is for tracking purposes only. Always consult your healthcare provider.
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <div className="border-t border-warning-200 bg-warning-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center space-x-2 text-sm text-warning-800">
            <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Emergency:</span>
            <span>For medical emergencies, call your local emergency number immediately</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;