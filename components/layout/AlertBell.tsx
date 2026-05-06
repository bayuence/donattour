// ============================================================================
// ALERT BELL COMPONENT
// ============================================================================
// File: components/layout/AlertBell.tsx
// Description: Notification bell icon with dropdown alerts
// Version: 1.0
// Date: 2026-05-05
// ============================================================================

'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAlerts } from '@/lib/context/alert-context';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertItem } from './AlertItem';
import Link from 'next/link';

// ============================================================================
// COMPONENT
// ============================================================================

export function AlertBell() {
  const { alerts, unreadCount, isLoading, markAsRead, markAllAsRead } = useAlerts();
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Handle mark single alert as read
   */
  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
  };

  /**
   * Handle mark all alerts as read
   */
  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Notifikasi"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifikasi</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllRead}
            >
              Tandai Semua Dibaca
            </Button>
          )}
        </div>

        {/* Alert List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {alerts.length > 0 && (
          <div className="border-t px-4 py-3">
            <Link
              href="/dashboard/alerts"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              onClick={() => setIsOpen(false)}
            >
              Lihat Semua Alert →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
