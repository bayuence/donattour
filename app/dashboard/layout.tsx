'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute, useAuth } from '@/lib/context/auth-context';
import * as Lucide from 'lucide-react';

// ─── Definisi Menu ──────────────────────────────────────────

interface MenuItem {
  label: string;
  href: string;
  icon: Lucide.LucideIcon;
  group: 'kasir' | 'otr' | 'online' | 'manajemen';
  shortLabel?: string; // untuk bottom nav
}

const MENU_ITEMS: MenuItem[] = [
  // === Grup Kasir ===
  { label: 'Kasir', href: '/dashboard/kasir', icon: Lucide.Banknote, group: 'kasir', shortLabel: 'Kasir' },
  { label: 'Pengeluaran Outlet', href: '/dashboard/pengeluaran-outlet', icon: Lucide.Wallet, group: 'kasir', shortLabel: 'Pengeluaran' },
  { label: 'Transaksi', href: '/dashboard/transaksi', icon: Lucide.Receipt, group: 'kasir', shortLabel: 'Transaksi' },
  { label: 'Input Produk', href: '/dashboard/input-produk', icon: Lucide.Donut, group: 'kasir', shortLabel: 'Produk' },
  { label: 'Laporan Outlet', href: '/dashboard/laporan-outlet', icon: Lucide.BarChart3, group: 'kasir', shortLabel: 'Laporan' },

  // === Grup Donat OTR ===
  { label: 'Kasir OTR', href: '/dashboard/otr/kasir', icon: Lucide.Truck, group: 'otr', shortLabel: 'Kasir OTR' },
  { label: 'Stok OTR', href: '/dashboard/otr/stok', icon: Lucide.Package, group: 'otr', shortLabel: 'Stok OTR' },
  { label: 'Riwayat OTR', href: '/dashboard/otr/riwayat', icon: Lucide.History, group: 'otr', shortLabel: 'Riwayat' },

  // === Grup Donat Online ===
  { label: 'Pesanan Online', href: '/dashboard/online/pesanan', icon: Lucide.ShoppingCart, group: 'online', shortLabel: 'Online' },
  { label: 'ShopeeFood', href: '/dashboard/online/shopee', icon: Lucide.ShoppingBag, group: 'online', shortLabel: 'Shopee' },
  { label: 'GoFood', href: '/dashboard/online/gofood', icon: Lucide.Bike, group: 'online', shortLabel: 'GoFood' },
  { label: 'GrabFood', href: '/dashboard/online/grabfood', icon: Lucide.Soup, group: 'online', shortLabel: 'Grab' },
  { label: 'TikTok Shop', href: '/dashboard/online/Music', icon: Lucide.Music, group: 'online', shortLabel: 'TikTok' },

  // === Grup Manajemen ===
  { label: 'Kelola Outlet', href: '/dashboard/kelola-outlet', icon: Lucide.Store, group: 'manajemen' },
  { label: 'Kelola Produk', href: '/dashboard/kelola-produk', icon: Lucide.Donut, group: 'manajemen' },
  { label: 'Kelola Karyawan', href: '/dashboard/kelola-karyawan', icon: Lucide.Users, group: 'manajemen' },
  { label: 'Kelola OTR', href: '/dashboard/kelola-otr', icon: Lucide.Truck, group: 'manajemen' },
  { label: 'Transaksi (Editor)', href: '/dashboard/transaksi-editor', icon: Lucide.FileJson, group: 'manajemen' },
  { label: 'Laporan', href: '/dashboard/laporan', icon: Lucide.TrendingUp, group: 'manajemen' },
  { label: 'Pengaturan', href: '/dashboard/pengaturan', icon: Lucide.Settings, group: 'manajemen' },
];

interface NavItem {
  label: string;
  href: string;
  icon: Lucide.LucideIcon;
  shortLabel?: string;
}

// Menu yang tampil di bottom nav mobile (prioritas utama)
const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: 'Kasir', href: '/dashboard/kasir', icon: Lucide.Banknote },
  { label: 'OTR', href: '/dashboard/otr/kasir', icon: Lucide.Truck },
  { label: 'Laporan', href: '/dashboard/laporan-outlet', icon: Lucide.BarChart3 },
  { label: 'Menu', href: '#menu', icon: Lucide.Menu },       // trigger full sidebar
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

  // Accordion state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    kasir: true,
    otr: true,
    online: true,
    manajemen: true,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 no-scrollbar">
          {groups.map((group) => {
            const isExpanded = expandedGroups[group.key];
            return (
              <div key={group.key} className="space-y-1">
                <button 
                  onClick={() => toggleGroup(group.key)}
                  disabled={collapsed}
                  className={`w-full flex items-center justify-between px-3 md:py-1 mb-1 transition-all text-left group/label ${collapsed ? 'lg:hidden opacity-0' : 'opacity-100'}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 group-hover/label:text-orange-500 transition-colors">
                    {group.label}
                  </p>
                  <Lucide.ChevronRight 
                    size={11} 
                    className={`text-gray-300 transition-transform duration-300 group-hover/label:text-orange-400 ${isExpanded ? 'rotate-90' : ''}`} 
                  />
                </button>
                <div className={`space-y-0.5 overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group
                        ${isActive
                          ? 'bg-orange-50 text-orange-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100 hover:shadow-sm'
                        }`}
                    >
                      <item.icon size={20} className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );})}
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
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all group"
          >
            <Lucide.LogOut size={20} className="flex-shrink-0 transition-transform group-hover:translate-x-1" />
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
              className="flex-1 relative group"
            >
              {!isMenu ? (
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center h-full gap-1 transition-all
                    ${isActive ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-orange-500 rounded-b-full shadow-[0_2px_8px_rgba(249,115,22,0.4)]" />
                  )}
                  <item.icon size={20} className={`transition-transform ${isActive ? 'scale-110' : 'group-active:scale-95'}`} />
                  <span className="text-[10px] font-bold tracking-tight">{item.shortLabel || item.label}</span>
                </Link>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-400 group-active:text-gray-600 transition-colors">
                  <item.icon size={20} className="transition-transform group-active:scale-95" />
                  <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
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
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3 lg:hidden shadow-sm">
      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
        {currentMenu?.icon ? <currentMenu.icon size={20} /> : <Lucide.Donut size={20} />}
      </div>
      <h1 className="text-base font-bold text-gray-900 truncate flex-1">{currentMenu?.label || 'donattour'}</h1>
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
        <Lucide.User size={12} className="text-gray-400" />
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{user?.name}</span>
      </div>
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
