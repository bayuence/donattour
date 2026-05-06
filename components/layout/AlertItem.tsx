// ============================================================================
// ALERT ITEM COMPONENT
// ============================================================================
// File: components/layout/AlertItem.tsx
// Description: Individual alert item in dropdown
// Version: 1.0
// Date: 2026-05-05
// ============================================================================

'use client';

import { AlertCircle, AlertTriangle, Info, Check } from 'lucide-react';
import { Alert } from '@/lib/context/alert-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface AlertItemProps {
  alert: Alert;
  onMarkRead: (id: string) => void;
}

// ============================================================================
// SEVERITY CONFIG
// ============================================================================

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-l-blue-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    borderColor: 'border-l-yellow-600',
  },
  critical: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    borderColor: 'border-l-red-600',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AlertItem({ alert, onMarkRead }: AlertItemProps) {
  const config = SEVERITY_CONFIG[alert.severity];
  const Icon = config.icon;

  /**
   * Format timestamp to relative time
   */
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Handle mark as read
   */
  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(alert.id);
  };

  return (
    <div
      className={cn(
        'px-4 py-3 hover:bg-gray-50 transition-colors border-l-4',
        config.borderColor,
        !alert.is_read && config.bgColor
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={cn('h-5 w-5', config.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {alert.title}
          </h4>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {alert.message}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            {/* Timestamp */}
            <span className="text-xs text-gray-400">
              {formatTime(alert.created_at)}
            </span>

            {/* Mark as read button */}
            {!alert.is_read && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs"
                onClick={handleMarkRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Tandai Dibaca
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
