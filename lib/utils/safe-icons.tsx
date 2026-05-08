'use client';

import React from 'react';

// Safe icon component that uses emojis as fallback
export const SafeIcon = ({ 
  emoji, 
  size = 20, 
  className = '' 
}: { 
  emoji: string; 
  size?: number; 
  className?: string; 
}) => (
  <div 
    className={`inline-flex items-center justify-center ${className}`}
    style={{ width: size, height: size }}
  >
    <span style={{ fontSize: size * 0.8 }}>{emoji}</span>
  </div>
);

// Common icon mappings
export const IconMap = {
  // Navigation
  home: '🏠',
  menu: '☰',
  back: '←',
  forward: '→',
  up: '↑',
  down: '↓',
  
  // Actions
  refresh: '🔄',
  save: '💾',
  edit: '✏️',
  delete: '🗑️',
  add: '➕',
  remove: '➖',
  search: '🔍',
  filter: '🔽',
  
  // Status
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  loading: '⏳',
  
  // Business
  money: '💰',
  calculator: '🧮',
  receipt: '🧾',
  truck: '🚚',
  package: '📦',
  shopping: '🛒',
  store: '🏪',
  user: '👤',
  users: '👥',
  
  // Food & Restaurant
  food: '🍩',
  cookie: '🍪',
  utensils: '🍴',
  bike: '🚲',
  
  // Charts & Reports
  chart: '📊',
  trending: '📈',
  report: '📋',
  calendar: '📅',
  
  // Communication
  bell: '🔔',
  phone: '📞',
  email: '📧',
  
  // System
  settings: '⚙️',
  bug: '🐛',
  logout: '🚪',
  
  // Default fallback
  default: '📋'
};

// Safe icon wrapper that tries to use lucide-react first, falls back to emoji
export const createSafeIcon = (iconName: keyof typeof IconMap) => {
  return ({ size = 20, className = '' }: { size?: number; className?: string }) => (
    <SafeIcon 
      emoji={IconMap[iconName] || IconMap.default} 
      size={size} 
      className={className} 
    />
  );
};

// Pre-created safe icons for common use
export const Icons = {
  Home: createSafeIcon('home'),
  Menu: createSafeIcon('menu'),
  Refresh: createSafeIcon('refresh'),
  Save: createSafeIcon('save'),
  Edit: createSafeIcon('edit'),
  Delete: createSafeIcon('delete'),
  Add: createSafeIcon('add'),
  Success: createSafeIcon('success'),
  Error: createSafeIcon('error'),
  Warning: createSafeIcon('warning'),
  Info: createSafeIcon('info'),
  Loading: createSafeIcon('loading'),
  Money: createSafeIcon('money'),
  Calculator: createSafeIcon('calculator'),
  Receipt: createSafeIcon('receipt'),
  Truck: createSafeIcon('truck'),
  Package: createSafeIcon('package'),
  Shopping: createSafeIcon('shopping'),
  Store: createSafeIcon('store'),
  User: createSafeIcon('user'),
  Users: createSafeIcon('users'),
  Food: createSafeIcon('food'),
  Cookie: createSafeIcon('cookie'),
  Utensils: createSafeIcon('utensils'),
  Bike: createSafeIcon('bike'),
  Chart: createSafeIcon('chart'),
  Trending: createSafeIcon('trending'),
  Report: createSafeIcon('report'),
  Calendar: createSafeIcon('calendar'),
  Bell: createSafeIcon('bell'),
  Phone: createSafeIcon('phone'),
  Settings: createSafeIcon('settings'),
  Bug: createSafeIcon('bug'),
  Logout: createSafeIcon('logout'),
  Default: createSafeIcon('default')
};

export default Icons;