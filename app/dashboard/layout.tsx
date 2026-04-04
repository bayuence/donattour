'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute, useAuth } from '@/lib/context/auth-context';

// ─── Definisi Menu ──────────────────────────────────────────

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  group: 'kasir' | 'otr' | 'online' | 'manajemen';
  shortLabel?: string; // untuk bottom nav
}

const MENU_ITEMS: MenuItem[] = [
  // === Grup Kasir ===
  { label: 'Kasir', href: '/dashboard/kasir', icon: '💰', group: 'kasir', shortLabel: 'Kasir' },
  { label: 'Pengeluaran Outlet', href: '/dashboard/pengeluaran-outlet', icon: '💸', group: 'kasir', shortLabel: 'Pengeluaran' },
  { label: 'Presensi', href: '/dashboard/presensi', icon: '📋', group: 'kasir', shortLabel: 'Presensi' },
  { label: 'Transaksi', href: '/dashboard/transaksi', icon: '🧾', group: 'kasir', shortLabel: 'Transaksi' },
  { label: 'Input Produk', href: '/dashboard/input-produk', icon: '🍩', group: 'kasir', shortLabel: 'Produk' },
  { label: 'Laporan Outlet', href: '/dashboard/laporan-outlet', icon: '📊', group: 'kasir', shortLabel: 'Laporan' },

  // === Grup Donat OTR ===
  { label: 'Kasir OTR', href: '/dashboard/otr/kasir', icon: '🚐', group: 'otr', shortLabel: 'Kasir OTR' },
  { label: 'Stok OTR', href: '/dashboard/otr/stok', icon: '📦', group: 'otr', shortLabel: 'Stok OTR' },
  { label: 'Riwayat OTR', href: '/dashboard/otr/riwayat', icon: '🧾', group: 'otr', shortLabel: 'Riwayat' },

  // === Grup Donat Online ===
  { label: 'Pesanan Online', href: '/dashboard/online/pesanan', icon: '🛒', group: 'online', shortLabel: 'Online' },
  { label: 'ShopeeFood', href: '/dashboard/online/shopee', icon: '🛍️', group: 'online' },
  { label: 'GoFood', href: '/dashboard/online/gofood', icon: '🛵', group: 'online' },
  { label: 'GrabFood', href: '/dashboard/online/grabfood', icon: '🍲', group: 'online' },
  { label: 'TikTok Shop', href: '/dashboard/online/tiktok', icon: '🎵', group: 'online' },

  // === Grup Manajemen ===
  { label: 'Kelola Outlet', href: '/dashboard/kelola-outlet', icon: '🏪', group: 'manajemen' },
  { label: 'Kelola Produk', href: '/dashboard/kelola-produk', icon: '🍩', group: 'manajemen' },
  { label: 'Kelola Karyawan', href: '/dashboard/kelola-karyawan', icon: '👥', group: 'manajemen' },
  { label: 'Kelola OTR', href: '/dashboard/kelola-otr', icon: '🚐', group: 'manajemen' },
  { label: 'Transaksi (Editor)', href: '/dashboard/transaksi-editor', icon: '✏️', group: 'manajemen' },
  { label: 'Presensi', href: '/dashboard/presensi-manajemen', icon: '📊', group: 'manajemen' },
  { label: 'Laporan', href: '/dashboard/laporan', icon: '📈', group: 'manajemen' },
  { label: 'Pengaturan', href: '/dashboard/pengaturan', icon: '⚙️', group: 'manajemen' },
];

// Menu yang tampil di bottom nav mobile (prioritas utama)
const BOTTOM_NAV_ITEMS = [
  { label: 'Kasir', href: '/dashboard/kasir', icon: '💰' },
  { label: 'OTR', href: '/dashboard/otr/kasir', icon: '🚐' },
  { label: 'Presensi', href: '/dashboard/presensi', icon: '📋' },
  { label: 'Laporan', href: '/dashboard/laporan-outlet', icon: '📊' },
  { label: 'Menu', href: '#menu', icon: '☰' },       // trigger full sidebar
];

const GROUP_LABELS: Record<string, string> = {
  kasir: 'DONATTOUR STORE',
  otr: 'DONATTOUR OTR',
  online: 'DONATTOUR ONLINE',
  manajemen: 'DONATTOUR MANAGEMENT',
};

function groupMenuItems(items: MenuItem[]) {
  const groups: { key: string; label: string; items: MenuItem[] }[] = [];
  const order = ['kasir', 'otr', 'online', 'manajemen'];
  for (const groupKey of order) {
    const groupItems = items.filter((item) => item.group === groupKey);
    if (groupItems.length > 0) {
      groups.push({ key: groupKey, label: GROUP_LABELS[groupKey], items: groupItems });
    }
  }
  return groups;
}

// ─── Sidebar (Desktop) ───────────────────────────────────────

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

  useEffect(() => {
    onMobileClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return null;

  // RBAC Access Control
  const userWithProfile = user as import('@/lib/types').UserWithProfile;
  const allowedMenus = userWithProfile?.profile?.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR OTR', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT'];

  let groups = groupMenuItems(MENU_ITEMS);
  groups = groups.filter(g => allowedMenus.includes(g.label));

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Backdrop mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-[280px]
          lg:translate-x-0
          ${collapsed ? 'lg:w-[68px]' : 'lg:w-64'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className={`relative flex-shrink-0 transition-all duration-300 ${collapsed ? 'lg:w-9 lg:h-9' : 'w-9 h-9'}`}>
            <Image
              src="/logo.png"
              alt="Donattour"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'lg:hidden' : ''}`}>
            <h1 className="text-base font-bold text-gray-900 truncate">donattour</h1>
            <p className="text-[10px] text-gray-400 truncate">Management System</p>
          </div>
          <button
            onClick={onMobileClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 lg:hidden"
          >✕</button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              <p className={`px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 ${collapsed ? 'lg:hidden' : ''}`}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          <div className={`px-3 py-2 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <span className="text-xl flex-shrink-0">🚪</span>
            <span className={`${collapsed ? 'lg:hidden' : ''}`}>Logout</span>
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm hidden lg:flex text-xs"
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>
    </>
  );
}

// ─── Bottom Navigation (Mobile Only) ─────────────────────────

function BottomNav({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  if (!user) return null;
  const userWithProfile = user as import('@/lib/types').UserWithProfile;
  const allowedMenus = userWithProfile?.profile?.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR OTR', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT'];

  const isAllowed = (href: string) => {
    if (href === '#menu') return true;
    if (href.startsWith('/dashboard/otr')) return allowedMenus.includes('DONATTOUR OTR');
    return allowedMenus.includes('DONATTOUR STORE'); // Presensi, Kasir, Laporan itu nyatu di Store (default mobile view)
  };

  const navItems = BOTTOM_NAV_ITEMS.filter(item => isAllowed(item.href));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 shadow-lg lg:hidden safe-area-bottom">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isMenu = item.href === '#menu';
          const isActive = !isMenu && pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={isMenu ? onMenuOpen : undefined}
              className="flex-1 relative"
            >
              {!isMenu ? (
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-full gap-1 transition-colors
                    ${isActive ? 'text-orange-600' : 'text-gray-400'}`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-orange-500 rounded-full" />
                  )}
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </Link>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-400">
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Mobile Top Bar ──────────────────────────────────────────

function MobileTopBar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const currentMenu = MENU_ITEMS.find((m) => m.href === pathname);

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 lg:hidden shadow-sm">
      <span className="text-xl">{currentMenu?.icon || '🍩'}</span>
      <h1 className="text-base font-bold text-gray-900 truncate flex-1">{currentMenu?.label || 'donattour'}</h1>
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{user?.name}</span>
    </div>
  );
}

// ─── Layout ──────────────────────────────────────────────────

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — desktop always visible, mobile overlay */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Content */}
      <div className="transition-all duration-300">
        <style>{`
          @media (min-width: 1024px) {
            .dashboard-content { margin-left: ${collapsed ? '68px' : '256px'} !important; }
          }
        `}</style>
        <div className="dashboard-content transition-all duration-300">
          {/* Top bar — mobile only */}
          <MobileTopBar />

          {/* Page content — padding-bottom for bottom nav on mobile */}
          <div className="pb-20 lg:pb-0">
            {children}
          </div>
        </div>
      </div>

      {/* Bottom Navigation — mobile only */}
      <BottomNav onMenuOpen={() => setMobileOpen(true)} />
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
