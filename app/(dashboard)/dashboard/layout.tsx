'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

// Temporary auth context for testing
const useAuth = () => ({
  user: { name: 'Test User', role: 'admin' },
  logout: () => console.log('logout')
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => children;

// Temporary AlertBell component
const AlertBell = () => (
  <div className="relative">
    <SafeBell size={20} className="text-gray-400 hover:text-gray-600 transition-colors" />
  </div>
);

import { useRealtimeProductionAndInventory } from '@/lib/hooks/useRealtimeProduction';
import { useRealtimeOrders } from '@/lib/hooks/use-realtime-inventory';

// Named imports — required for Next.js optimizePackageImports compatibility
import {
  Calculator, Wallet, Receipt, Plus, Truck, Package, History,
  ShoppingCart, ShoppingBag, Bike, Utensils, Music, Home, FileText,
  Store, Cookie, Users, Edit3, Settings, Menu, ChevronRight,
  LogOut, User, Bell,
} from 'lucide-react';

const SafeCalculator = Calculator;
const SafeWallet = Wallet;
const SafeReceipt = Receipt;
const SafePlus = Plus;
const SafeTruck = Truck;
const SafePackage = Package;
const SafeHistory = History;
const SafeShoppingCart = ShoppingCart;
const SafeShoppingBag = ShoppingBag;
const SafeBike = Bike;
const SafeUtensils = Utensils;
const SafeMusic = Music;
const SafeHome = Home;
const SafeFileText = FileText;
const SafeStore = Store;
const SafeCookie = Cookie;
const SafeUsers = Users;
const SafeEdit3 = Edit3;
const SafeSettings = Settings;
const SafeMenu = Menu;
const SafeChevronRight = ChevronRight;
const SafeLogOut = LogOut;
const SafeUser = User;
const SafeBell = Bell;

// ─── Definisi Menu ──────────────────────────────────────────

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: 'kasir' | 'otr' | 'online' | 'manajemen';
  shortLabel?: string; // untuk bottom nav
}

const MENU_ITEMS: MenuItem[] = [
  // === Grup Kasir ===
  { label: 'Kasir', href: '/dashboard/kasir', icon: SafeCalculator, group: 'kasir', shortLabel: 'Kasir' },
  { label: 'Input Pengeluaran', href: '/dashboard/pengeluaran-outlet', icon: SafeWallet, group: 'kasir', shortLabel: 'Pengeluaran' },
  { label: 'Transaksi', href: '/dashboard/transaksi', icon: SafeReceipt, group: 'kasir', shortLabel: 'Transaksi' },
  { label: 'Input Produksi', href: '/dashboard/input-produksi', icon: SafePlus, group: 'kasir', shortLabel: 'Produksi' },
  { label: 'Laporan Outlet', href: '/dashboard/laporan-outlet', icon: SafeFileText, group: 'kasir', shortLabel: 'Laporan' },

  // === Grup Donat OTR ===
  { label: 'Kasir OTR', href: '/dashboard/otr/kasir', icon: SafeTruck, group: 'otr', shortLabel: 'Kasir OTR' },
  { label: 'Stok OTR', href: '/dashboard/otr/stok', icon: SafePackage, group: 'otr', shortLabel: 'Stok OTR' },
  { label: 'Riwayat OTR', href: '/dashboard/otr/riwayat', icon: SafeHistory, group: 'otr', shortLabel: 'Riwayat' },

  // === Grup Donat Online ===
  { label: 'Pesanan Online', href: '/dashboard/online/pesanan', icon: SafeShoppingCart, group: 'online', shortLabel: 'Online' },
  { label: 'ShopeeFood', href: '/dashboard/online/shopee', icon: SafeShoppingBag, group: 'online', shortLabel: 'Shopee' },
  { label: 'GoFood', href: '/dashboard/online/gofood', icon: SafeBike, group: 'online', shortLabel: 'GoFood' },
  { label: 'GrabFood', href: '/dashboard/online/grabfood', icon: SafeUtensils, group: 'online', shortLabel: 'Grab' },
  { label: 'TikTok Shop', href: '/dashboard/online/tiktok', icon: SafeMusic, group: 'online', shortLabel: 'TikTok' },

  // === Grup Manajemen ===
  { label: 'Dashboard Owner', href: '/dashboard', icon: SafeHome, group: 'manajemen' },
  { label: 'Laporan Periode', href: '/dashboard/laporan', icon: SafeFileText, group: 'manajemen' },
  { label: 'Kelola Outlet', href: '/dashboard/kelola-outlet', icon: SafeStore, group: 'manajemen' },
  { label: 'Kelola Produk', href: '/dashboard/kelola-produk', icon: SafeCookie, group: 'manajemen' },
  { label: 'Kelola Karyawan', href: '/dashboard/kelola-karyawan', icon: SafeUsers, group: 'manajemen' },
  { label: 'Kelola OTR', href: '/dashboard/kelola-otr', icon: SafeTruck, group: 'manajemen' },
  { label: 'Transaksi (Editor)', href: '/dashboard/transaksi-editor', icon: SafeEdit3, group: 'manajemen' },
  { label: 'Pengaturan', href: '/dashboard/pengaturan', icon: SafeSettings, group: 'manajemen' },
];

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortLabel?: string;
}

// Menu yang tampil di bottom nav mobile (prioritas utama)
const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: 'Kasir', href: '/dashboard/kasir', icon: SafeCalculator },
  { label: 'OTR', href: '/dashboard/otr/kasir', icon: SafeTruck },
  { label: 'Laporan', href: '/dashboard/laporan-outlet', icon: SafeFileText },
  { label: 'Menu', href: '#menu', icon: SafeMenu },       // trigger full sidebar
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

  // ✅ FIX: Initialize with safe default, restore after mount
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    kasir: true,
    otr: true,
    online: true,
    manajemen: true,
  });
  const [mounted, setMounted] = useState(false);

  // Restore from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-expanded-groups');
      if (saved) {
        setExpandedGroups(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
    setMounted(true);
  }, []);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const newState = { ...prev, [key]: !prev[key] };
      // Simpan ke localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sidebar-expanded-groups', JSON.stringify(newState));
        } catch (e) {
          console.warn('Failed to save sidebar state:', e);
        }
      }
      return newState;
    });
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
        <div className="fixed inset-0 bg-black/60 z-40 sm:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 flex flex-col transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-[280px]
          sm:translate-x-0
          ${collapsed ? 'sm:w-[68px]' : 'sm:w-64'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="relative w-9 h-9 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Donattour"
              fill
              sizes="36px"
              className="object-contain"
              priority
            />
          </div>
          {/* Sembunyikan teks saat collapsed — pakai `hidden` tanpa breakpoint */}
          <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'hidden' : ''}`}>
            <h1 className="text-base font-bold text-gray-900 truncate">donattour</h1>
            <p className="text-[10px] text-gray-400 truncate">Management System</p>
          </div>
          <button
            onClick={onMobileClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 sm:hidden"
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
                  className={`w-full flex items-center justify-between px-3 py-1 mb-1 transition-all text-left group/label ${collapsed ? 'sm:hidden opacity-0' : 'opacity-100'}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 group-hover/label:text-orange-500 transition-colors">
                    {group.label}
                  </p>
                  <SafeChevronRight
                    size={11}
                    className={`text-gray-300 transition-transform duration-300 group-hover/label:text-orange-400 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
                <div className={`space-y-0.5 overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  let IconComponent = item.icon;

                  // Safety check for undefined icons
                  if (!IconComponent) {
                    console.error(`Icon undefined for menu item: ${item.label}`);
                    // Use SafeFileText as fallback icon
                    IconComponent = SafeFileText;
                  }

                  return (
                    <Link
                      key={`sidebar-${item.href}`}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group
                        ${isActive
                          ? 'bg-orange-50 text-orange-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100 hover:shadow-sm'
                        }`}
                    >
                      <IconComponent
                        size={20}
                        className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                      />
                      <span className={`truncate ${collapsed ? 'sm:hidden' : ''}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );})}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          <div className={`px-3 py-2 ${collapsed ? 'sm:hidden' : ''}`}>
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
          </div>

          {/* Alert Bell for Desktop */}
          <div className="px-3 py-2 hidden sm:flex items-center justify-center">
            <AlertBell />
          </div>

          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all group"
          >
            <SafeLogOut
              size={20}
              className="flex-shrink-0 transition-transform group-hover:translate-x-1"
            />
            <span className={`${collapsed ? 'sm:hidden' : ''}`}>Logout</span>
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm hidden sm:flex text-xs"
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
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 shadow-lg sm:hidden safe-area-bottom bottom-nav-mobile">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isMenu = item.href === '#menu';
          const isActive = !isMenu && pathname === item.href;
          return (
            <button
              key={`bottom-nav-${item.href}`}
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
                  {item.icon && (
                    <item.icon 
                      size={20} 
                      className={`transition-transform ${isActive ? 'scale-110' : 'group-active:scale-95'}`}
                    />
                  )}
                  <span className="text-[10px] font-bold tracking-tight">{item.shortLabel || item.label}</span>
                </Link>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-400 group-active:text-gray-600 transition-colors">
                  {item.icon && (
                    <item.icon 
                      size={20} 
                      className="transition-transform group-active:scale-95"
                    />
                  )}
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
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3 sm:hidden shadow-sm">
      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
        {currentMenu?.icon ? (
          <currentMenu.icon size={20} />
        ) : (
          <SafeCookie size={20} />
        )}
      </div>
      <h1 className="text-base font-bold text-gray-900 truncate flex-1">{currentMenu?.label || 'donattour'}</h1>
      
      {/* Alert Bell */}
      <AlertBell />
      
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
        <SafeUser size={12} className="text-gray-400" />
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{user?.name}</span>
      </div>
    </div>
  );
}

// ─── Layout ──────────────────────────────────────────────────

function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Start with safe default (always false on first render)
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  const { user } = useAuth();
  const outletId = (user as any)?.outlet_id;

  // 🔥 GLOBAL REALTIME SUBSCRIPTIONS
  // Membuat seluruh halaman (Laporan, Transaksi, Kasir, Produksi, dsb) menjadi realtime
  useRealtimeProductionAndInventory(outletId);
  useRealtimeOrders({ outletId });

  // ✅ FIX: Initialize state AFTER mount to avoid hydration mismatch
  useEffect(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved === 'true') {
        setCollapsed(true);
      }
    } catch (e) {
      // localStorage not available
    }

    // Then apply responsive behavior
    const handleResize = () => {
      const w = window.innerWidth;
      const newCollapsed = w >= 640 && w < 1200;
      setCollapsed(newCollapsed);
      try {
        localStorage.setItem('sidebar-collapsed', String(newCollapsed));
      } catch (e) {
        console.warn('Failed to save sidebar state:', e);
      }
    };

    handleResize(); // apply immediately on first mount
    window.addEventListener('resize', handleResize);
    setMounted(true);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          /* sm+ (640px+): sidebar selalu tampil, konten geser */
          @media (min-width: 640px) {
            .dashboard-content { margin-left: ${collapsed ? '68px' : '256px'} !important; }
          }

          /* Mobile portrait (<640px): tidak ada margin, konten full width */
          @media (max-width: 639px) and (orientation: portrait) {
            .dashboard-content { margin-left: 0 !important; }
          }

          /* ═══ SMART LANDSCAPE MODE ═══ */
          /* HP landscape (<640px landscape): tampilkan sidebar mini, sembunyikan mobile UI */
          @media (max-width: 639px) and (orientation: landscape) {
            aside {
              transform: translateX(0) !important;
              width: 68px !important;
              z-index: 50 !important;
            }
            aside .sm\\:hidden { display: none !important; }
            aside nav span, aside .overflow-hidden { display: none !important; }
            .dashboard-content { margin-left: 68px !important; width: calc(100% - 68px) !important; max-width: none !important; }
            .mobile-top-bar { display: none !important; }
            .bottom-nav-mobile { display: none !important; }
            .sm\\:flex { display: flex !important; }
            .sm\\:grid { display: grid !important; }
            .sm\\:block { display: block !important; }
            .dashboard-page-content { padding-bottom: 0 !important; }
            .sm\\:hidden { display: none !important; }
          }
        `}</style>
        <div className="dashboard-content transition-all duration-300 min-h-screen flex flex-col">
          {/* Top bar — mobile portrait only (< 640px) */}
          <div className="mobile-top-bar sm:hidden">
            <MobileTopBar />
          </div>

          {/* Page content — padding-bottom for bottom nav on mobile portrait */}
          <div className="flex-1 flex flex-col pb-20 sm:pb-0 dashboard-page-content">
            {children}
          </div>
        </div>
      </div>

      {/* Bottom Navigation — mobile only (< 768px) */}
      <BottomNav onMenuOpen={() => setMobileOpen(true)} />
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  // Error boundary untuk menangkap error rendering
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Layout Error:', error);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h1>
          <p className="text-gray-600 mb-4">Aplikasi mengalami error. Silakan refresh halaman.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }
  
  try {
    return (
      <ProtectedRoute>
        <DashboardLayout>{children}</DashboardLayout>
      </ProtectedRoute>
    );
  } catch (error) {
    console.error('Layout Render Error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sedang Diperbaiki</h1>
          <p className="text-gray-600 mb-4">Sistem sedang dalam perbaikan. Silakan coba lagi.</p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }
}
