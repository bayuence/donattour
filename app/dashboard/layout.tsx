'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute, useAuth } from '@/lib/context/auth-context';

// ─── Definisi Menu ──────────────────────────────────────────

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  group: 'kasir' | 'manajemen' | 'pengaturan';
}

const MENU_ITEMS: MenuItem[] = [
  // === Grup Kasir (paling atas) ===
  { label: 'Kasir', href: '/dashboard/kasir', icon: '💰', group: 'kasir' },
  { label: 'Pengeluaran Outlet', href: '/dashboard/pengeluaran-outlet', icon: '💸', group: 'kasir' },
  { label: 'Presensi', href: '/dashboard/presensi', icon: '📋', group: 'kasir' },
  { label: 'Transaksi', href: '/dashboard/transaksi', icon: '🧾', group: 'kasir' },
  { label: 'Input Produk', href: '/dashboard/input-produk', icon: '🍩', group: 'kasir' },
  { label: 'Laporan Outlet', href: '/dashboard/laporan-outlet', icon: '📊', group: 'kasir' },

  // === Grup Manajemen ===
  { label: 'Kelola Outlet', href: '/dashboard/kelola-outlet', icon: '🏪', group: 'manajemen' },
  { label: 'Kelola Kasir', href: '/dashboard/kelola-kasir', icon: '👥', group: 'manajemen' },
  { label: 'Transaksi (Editor)', href: '/dashboard/transaksi-editor', icon: '✏️', group: 'manajemen' },
  { label: 'Presensi', href: '/dashboard/presensi-manajemen', icon: '📊', group: 'manajemen' },
  { label: 'Laporan', href: '/dashboard/laporan', icon: '📈', group: 'manajemen' },

  // === Pengaturan ===
  { label: 'Pengaturan', href: '/dashboard/pengaturan', icon: '⚙️', group: 'pengaturan' },
];

const GROUP_LABELS: Record<string, string> = {
  kasir: 'Kasir',
  manajemen: 'Manajemen',
  pengaturan: 'Pengaturan',
};

function groupMenuItems(items: MenuItem[]) {
  const groups: { key: string; label: string; items: MenuItem[] }[] = [];
  const order = ['kasir', 'manajemen', 'pengaturan'];

  for (const groupKey of order) {
    const groupItems = items.filter((item) => item.group === groupKey);
    if (groupItems.length > 0) {
      groups.push({ key: groupKey, label: GROUP_LABELS[groupKey], items: groupItems });
    }
  }
  return groups;
}

// ─── Sidebar Component ──────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    onMobileClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  const groups = groupMenuItems(MENU_ITEMS);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col transition-all duration-300
          ${/* Mobile: slide in/out */''}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-72
          ${/* Desktop: always visible, respect collapsed */''}
          lg:translate-x-0
          ${collapsed ? 'lg:w-[68px]' : 'lg:w-64'}
        `}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <span className="text-2xl flex-shrink-0">🍩</span>
          <div className={`overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
            <h1 className="text-lg font-bold text-gray-900 truncate">donattour</h1>
            <p className="text-[11px] text-gray-400 truncate">Management System</p>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="ml-auto text-gray-400 hover:text-gray-600 lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <p className={`px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${collapsed ? 'lg:hidden' : ''}`}>
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-gray-100 p-3 space-y-2">
          <div className={`px-3 py-2 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="text-lg flex-shrink-0">🚪</span>
            <span className={`${collapsed ? 'lg:hidden' : ''}`}>Logout</span>
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-7 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 shadow-sm hidden lg:flex"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>
    </>
  );
}

// ─── Mobile Top Bar ─────────────────────────────────────────

function MobileTopBar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const currentMenu = MENU_ITEMS.find(m => m.href === pathname);

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
      <button
        onClick={onMenuOpen}
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <span className="text-lg">{currentMenu?.icon || '🍩'}</span>
      <h1 className="text-sm font-bold text-gray-900 truncate">{currentMenu?.label || 'donattour'}</h1>
      <span className="ml-auto text-xs text-gray-400">{user?.name}</span>
    </div>
  );
}

// ─── Layout ─────────────────────────────────────────────────

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />
      {/* Content area: no margin on mobile, sidebar margin on desktop */}
      <div
        className="transition-all duration-300"
        style={{ marginLeft: 0 }}
      >
        {/* Desktop margin via CSS */}
        <style>{`
          @media (min-width: 1024px) {
            .dashboard-content { margin-left: ${collapsed ? '68px' : '256px'} !important; }
          }
        `}</style>
        <div className="dashboard-content transition-all duration-300">
          {/* Mobile: top bar with hamburger */}
          <MobileTopBar onMenuOpen={() => setMobileOpen(true)} />
          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
