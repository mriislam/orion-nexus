'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SubNavigationItem {
  name: string;
  href: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  subItems?: SubNavigationItem[];
}
import {
  LayoutDashboard,
  Server,
  Shield,
  Activity,
  Settings,
  Network,
  Cloud,
  BarChart3,
  Radio,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Users,
  ShieldCheck
} from 'lucide-react';

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard
  },
  {
    name: 'Devices',
    href: '/devices',
    icon: Server
  },
  {
    name: 'SSL Certificates',
    href: '/ssl',
    icon: Shield
  },
  {
    name: 'Uptime Monitoring',
    href: '/uptime',
    icon: Activity
  },
  {
    name: 'Network Diagnostics',
    href: '/network-diagnostics',
    icon: Network
  },
  {
    name: 'Stream Monitoring',
    href: '/stream-monitoring',
    icon: Radio,
    subItems: [
      {
        name: 'Channel Viewer',
        href: '/stream-monitoring/channel-viewer'
      }
    ]
  },
  {
    name: 'GCP Integration',
    href: '/gcp-integration',
    icon: Cloud,
    subItems: [
      {
        name: 'Credentials',
        href: '/gcp-integration/credentials'
      },
      {
        name: 'Resources',
        href: '/gcp-integration/resources'
      },
      {
        name: 'Metrics',
        href: '/gcp-integration/metrics'
      }
    ]
  },
  {
    name: 'Firebase Analytics',
    href: '/firebase-analytics',
    icon: Flame,
  },
  {
    name: 'Google Analytics',
    href: '/analytics',
    icon: BarChart3,
  },

  {
    name: 'Settings',
    href: '/settings',
    icon: Settings
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const { isAuthenticated } = useAuth();

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  // Show all navigation items for authenticated users
  const filteredNavigation = React.useMemo(() => {
    return navigation;
  }, []);

  // Auto-expand GCP Integration if we're on a sub-page
  React.useEffect(() => {
    if (pathname.startsWith('/gcp-integration/') && !expandedItems.includes('GCP Integration')) {
      setExpandedItems(prev => [...prev, 'GCP Integration']);
    }

  }, [pathname, expandedItems]);

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
      sidebarOpen ? "w-64" : "w-16"
    )}>
      {/* Logo and toggle */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className={cn(
          "flex items-center space-x-2 transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0"
        )}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">ON</span>
          </div>
          {sidebarOpen && (
            <span className="text-xl font-bold text-gray-900">Orion Nexus</span>
          )}
        </div>
        
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          const isExpanded = expandedItems.includes(item.name);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const Icon = item.icon;
          
          return (
            <div key={item.name}>
              {/* Main navigation item */}
              <div className="flex items-center">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group flex-1",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn(
                    "flex-shrink-0 w-5 h-5",
                    isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"
                  )} />
                  {sidebarOpen && (
                    <span className="ml-3 truncate">{item.name}</span>
                  )}
                </Link>
                
                {/* Expand/collapse button for items with sub-items */}
                {hasSubItems && sidebarOpen && (
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className="p-1 ml-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
              
              {/* Sub-navigation items */}
               {hasSubItems && isExpanded && sidebarOpen && (
                 <div className="ml-8 mt-1 space-y-1">
                   {item.subItems?.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={cn(
                          "flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors",
                          isSubActive
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        )}
                      >
                        <span className="truncate">{subItem.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className={cn(
          "flex items-center transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0"
        )}>
          {sidebarOpen && (
            <div className="text-xs text-gray-500">
              <p>Orion Nexus v1.0</p>
              <p>Network Monitoring Portal</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}