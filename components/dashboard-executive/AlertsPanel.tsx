'use client';

// ============================================================================
// EXECUTIVE DASHBOARD — ALERTS PANEL (embedded feed)
// ============================================================================

import { AlertTriangle, Info, AlertCircle, CheckCheck } from 'lucide-react';
import { useAlerts } from '@/lib/context/alert-context';

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const SEVERITY_CLS: Record<string, string> = {
  info: 'bg-sky-50 text-sky-700 border-sky-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  critical: 'bg-rose-50 text-rose-700 border-rose-100',
};

export function AlertsPanel() {
  const { alerts, unreadCount, markAsRead, markAllAsRead, isLoading } = useAlerts();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-rose-50/40 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Alert &amp; Notifikasi</h3>
            <p className="text-[11px] text-gray-500">
              {unreadCount > 0
                ? `${unreadCount} butuh perhatian`
                : 'Semua alert sudah dibaca'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead().catch(() => {})}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 px-2 py-1 rounded-md hover:bg-orange-50"
          >
            <CheckCheck size={12} />
            Tandai semua
          </button>
        )}
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {isLoading && alerts.length === 0 ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCheck size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">Aman</p>
            <p className="text-[11px] text-gray-500">Belum ada alert hari ini</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {alerts.map((a) => {
              const Icon = SEVERITY_ICON[a.severity] || Info;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => markAsRead(a.id).catch(() => {})}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border ${
                        SEVERITY_CLS[a.severity] || SEVERITY_CLS.info
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{a.title}</p>
                      <p className="text-[12px] text-gray-600 line-clamp-2">{a.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {timeAgo(a.created_at)}
                      </p>
                    </div>
                    {!a.is_read && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));
  if (diffSec < 60) return `${diffSec} dtk lalu`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} hari lalu`;
}
