'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { useAuth, ProtectedRoute } from '@/lib/context/auth-context';
import { AlertBell } from '@/components/layout/AlertBell';
import { SyncStatusBar } from '@/components/offline/SyncStatusBar';
import { OfflineReadyIndicator } from '@/components/offline/OfflineReadyIndicator';
import { OfflineSeedProvider } from '@/components/offline/OfflineSeedProvider';
import { PreloadButton } from '@/app/components/PreloadButton';

// Realtime hooks dipindah ke masing-masing halaman yang membutuhkan
// agar tidak menyebabkan query invalidation massal di semua halaman sekaligus

// Named imports — required for Next.js optimizePackageImports compatibility
import {
  Calculator, Wallet, Receipt, Plus, Truck, Package, History,
  ShoppingCart, ShoppingBag, Bike, Utensils, Music, Home, FileText,
  Store, Cookie, Users, Edit3, Settings, Menu, ChevronRight,
  LogOut, User, Bell, ClipboardList, Shield, Clock, Calendar, Plane, LayoutDashboard,
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
const SafeClipboardList = ClipboardList;
const SafeShield = Shield;
const SafeClock = Clock;
const SafeCalendar = Calendar;
const SafePlane = Plane;
const SafeLayoutDashboard = LayoutDashboard;

// ─── Definisi Menu ──────────────────────────────────────────

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: 'kasir' | 'otr' | 'online' | 'manajemen';
  subGroup?: 'office' | 'toko' | 'karyawan';
  shortLabel?: string; // untuk bottom nav
}

const MENU_ITEMS: MenuItem[] = [
  // === Grup Kasir ===
  { label: 'Kasir', href: '/dashboard/kasir', icon: SafeCalculator, group: 'kasir', shortLabel: 'Kasir' },
  { label: 'Input Pengeluaran', href: '/dashboard/input-pengeluaran', icon: SafeWallet, group: 'kasir', shortLabel: 'Pengeluaran' },
  { label: 'Transaksi', href: '/dashboard/transaksi', icon: SafeReceipt, group: 'kasir', shortLabel: 'Transaksi' },
  { label: 'Input Produksi', href: '/dashboard/input-produksi', icon: SafePlus, group: 'kasir', shortLabel: 'Produksi' },
  { label: 'Tagihan', href: '/dashboard/tagihan', icon: SafeClipboardList, group: 'kasir', shortLabel: 'Tagihan' },
  { label: 'Laporan Harian Outlet', href: '/dashboard/laporan-harian-outlet', icon: SafeFileText, group: 'kasir', shortLabel: 'Laporan Harian' },

  // === Grup Donat OTR (Diubah menjadi Donattour Karyawan) ===
  { label: 'Presensi Karyawan', href: '/dashboard/karyawan/presensi', icon: SafeUsers, group: 'otr', shortLabel: 'Presensi' },
  { label: 'Jadwal Shift', href: '/dashboard/karyawan/jadwal', icon: SafeClipboardList, group: 'otr', shortLabel: 'Jadwal' },
  { label: 'Pengajuan Cuti', href: '/dashboard/karyawan/cuti', icon: SafeFileText, group: 'otr', shortLabel: 'Cuti' },

  // === Grup Donat Online ===
  { label: 'Pesanan Online', href: '/dashboard/online/pesanan', icon: SafeShoppingCart, group: 'online', shortLabel: 'Online' },
  { label: 'ShopeeFood', href: '/dashboard/online/shopee', icon: SafeShoppingBag, group: 'online', shortLabel: 'Shopee' },
  { label: 'GoFood', href: '/dashboard/online/gofood', icon: SafeBike, group: 'online', shortLabel: 'GoFood' },
  { label: 'GrabFood', href: '/dashboard/online/grabfood', icon: SafeUtensils, group: 'online', shortLabel: 'Grab' },
  { label: 'TikTok Shop', href: '/dashboard/online/tiktok', icon: SafeMusic, group: 'online', shortLabel: 'TikTok' },

  // === DONATTOUR MANAGEMENT ===
  // Sub-Group 1: Office
  { label: 'Dashboard Owner', href: '/dashboard', icon: SafeHome, group: 'manajemen', subGroup: 'office' },
  { label: 'Laporan Periode', href: '/dashboard/laporan', icon: SafeFileText, group: 'manajemen', subGroup: 'office' },
  { label: 'Analisis Pengeluaran', href: '/dashboard/expense-analytics', icon: SafeWallet, group: 'manajemen', subGroup: 'office' },
  { label: 'Pengaturan', href: '/dashboard/pengaturan', icon: SafeSettings, group: 'manajemen', subGroup: 'office' },

  // Sub-Group 2: Toko
  { label: 'Kelola Outlet', href: '/dashboard/kelola-outlet', icon: SafeStore, group: 'manajemen', subGroup: 'toko' },
  { label: 'Kelola Produk', href: '/dashboard/kelola-produk', icon: SafeCookie, group: 'manajemen', subGroup: 'toko' },
  { label: 'Transaksi (Editor)', href: '/dashboard/transaksi-editor', icon: SafeEdit3, group: 'manajemen', subGroup: 'toko' },
  { label: 'Riwayat Produksi (Editor)', href: '/dashboard/riwayat-produksi', icon: SafeHistory, group: 'manajemen', subGroup: 'toko' },

  // Sub-Group 3: Karyawan (Urutan: Overview -> Kelola Posisi -> Data Karyawan -> Presensi -> Jadwal -> Cuti)
  { label: 'Overview Karyawan', href: '/dashboard/kelola-karyawan', icon: SafeLayoutDashboard, group: 'manajemen', subGroup: 'karyawan' },
  { label: 'Kelola Divisi & Peran', href: '/dashboard/kelola-karyawan/kelola-divisi', icon: SafeShield, group: 'manajemen', subGroup: 'karyawan' },
  { label: 'Data Karyawan', href: '/dashboard/kelola-karyawan/karyawan', icon: SafeUsers, group: 'manajemen', subGroup: 'karyawan' },
  { label: 'Presensi Staf', href: '/dashboard/kelola-karyawan/kelola-presensi', icon: SafeClock, group: 'manajemen', subGroup: 'karyawan' },
  { label: 'Jadwal Shift Staf', href: '/dashboard/kelola-karyawan/kelola-jadwal', icon: SafeCalendar, group: 'manajemen', subGroup: 'karyawan' },
  { label: 'Kelola Cuti Staf', href: '/dashboard/kelola-karyawan/kelola-cuti', icon: SafePlane, group: 'manajemen', subGroup: 'karyawan' },
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
  { label: 'Presensi', href: '/dashboard/karyawan/presensi', icon: SafeUsers },
  { label: 'Laporan Harian', href: '/dashboard/laporan-harian-outlet', icon: SafeFileText },
  { label: 'Menu', href: '#menu', icon: SafeMenu },       // trigger full sidebar
];

const GROUP_LABELS: Record<string, string> = {
  kasir: 'DONATTOUR STORE',
  otr: 'DONATTOUR KARYAWAN',
  online: 'DONATTOUR ONLINE',
  manajemen: 'DONATTOUR MANAGEMENT',
};

const SUBGROUP_LABELS: Record<string, string> = {
  office: 'Manajemen Office',
  toko: 'Manajemen Toko',
  karyawan: 'Manajemen Karyawan',
};

interface GroupStructure {
  key: string;
  label: string;
  items?: MenuItem[];
  subGroups?: { subKey: string; subLabel: string; items: MenuItem[] }[];
}

function groupMenuItems(items: MenuItem[]): GroupStructure[] {
  const groups: GroupStructure[] = [];
  const order = ['kasir', 'otr', 'online', 'manajemen'];
  for (const groupKey of order) {
    if (groupKey === 'manajemen') {
      const subOrder: ('office' | 'toko' | 'karyawan')[] = ['office', 'toko', 'karyawan'];
      const subGroups: { subKey: string; subLabel: string; items: MenuItem[] }[] = [];
      for (const subKey of subOrder) {
        const subItems = items.filter((item) => item.group === 'manajemen' && item.subGroup === subKey);
        if (subItems.length > 0) {
          subGroups.push({
            subKey,
            subLabel: SUBGROUP_LABELS[subKey],
            items: subItems,
          });
        }
      }
      if (subGroups.length > 0) {
        groups.push({ key: groupKey, label: GROUP_LABELS[groupKey], subGroups });
      }
    } else {
      const groupItems = items.filter((item) => item.group === groupKey);
      if (groupItems.length > 0) {
        groups.push({ key: groupKey, label: GROUP_LABELS[groupKey], items: groupItems });
      }
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

  // Sub-groups collapse/expand state (Office, Toko, Karyawan)
  const [expandedSubGroups, setExpandedSubGroups] = useState<Record<string, boolean>>({
    office: true,
    toko: true,
    karyawan: true,
  });

  const [mounted, setMounted] = useState(false);

  // Restore from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar-expanded-groups');
      if (saved) {
        setExpandedGroups(JSON.parse(saved));
      }
      const savedSub = localStorage.getItem('sidebar-expanded-subgroups');
      if (savedSub) {
        setExpandedSubGroups(JSON.parse(savedSub));
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

  const toggleSubGroup = (subKey: string) => {
    setExpandedSubGroups(prev => {
      const newState = { ...prev, [subKey]: !prev[subKey] };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sidebar-expanded-subgroups', JSON.stringify(newState));
        } catch (e) {
          console.warn('Failed to save sidebar substate:', e);
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
  const allowedMenus = (userWithProfile?.profile?.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR OTR', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT'])
    .map((m: string) => m === 'DONATTOUR OTR' ? 'DONATTOUR KARYAWAN' : m);

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
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-[60] flex flex-col transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-[calc(100vw-1rem)] max-w-[280px]
          sm:translate-x-0
          ${collapsed ? 'sm:w-[68px]' : 'sm:w-64'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 min-w-0">
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
          <div className={`min-w-0 overflow-hidden transition-all duration-300 ${collapsed ? 'hidden' : ''}`}>
            <h1 className="text-base font-bold text-gray-900 truncate">donattour</h1>
            <p className="text-[10px] text-gray-400 truncate">Management System</p>
          </div>
          <button
            onClick={onMobileClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 sm:hidden"
          >✕</button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 no-scrollbar">
          {groups.map((group, groupIdx) => {
            const isExpanded = expandedGroups[group.key];
            return (
              <div key={group.key || `group-${groupIdx}`} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.key)}
                  disabled={collapsed}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1 mb-1 transition-all text-left group/label min-w-0 ${collapsed ? 'sm:hidden opacity-0' : 'opacity-100'}`}
                >
                  <p className="min-w-0 flex-1 truncate text-[10px] font-black uppercase tracking-wider text-gray-500 group-hover/label:text-orange-500 transition-colors">
                    {group.label}
                  </p>
                  <SafeChevronRight
                    size={11}
                    className={`text-gray-300 transition-transform duration-300 group-hover/label:text-orange-400 ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
                <div className={`space-y-0.5 overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {/* Direct Items */}
                  {group.items?.map((item, itemIdx) => {
                    const isActive = pathname === item.href;
                    let IconComponent = item.icon || SafeFileText;

                    return (
                      <Link
                        key={`sidebar-${item.href || itemIdx}-${item.label}`}
                        href={item.href}
                        prefetch={true}
                        title={collapsed ? item.label : undefined}
                        className={`flex min-w-0 items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group overflow-hidden
                          ${isActive
                            ? 'bg-orange-50 text-orange-700 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100 hover:shadow-sm'
                          }`}
                      >
                        <IconComponent
                          size={20}
                          className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                        />
                        <span className={`min-w-0 flex-1 truncate ${collapsed ? 'sm:hidden' : ''}`}>{item.label}</span>
                      </Link>
                    );
                  })}

                  {/* Sub Groups (for DONATTOUR MANAGEMENT) */}
                  {group.subGroups?.map((subGroup) => {
                    const isSubExpanded = expandedSubGroups[subGroup.subKey] ?? true;
                    return (
                      <div key={subGroup.subKey} className="space-y-0.5 pt-1.5 first:pt-0">
                        <button
                          onClick={() => toggleSubGroup(subGroup.subKey)}
                          disabled={collapsed}
                          className={`w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-orange-600/90 uppercase tracking-wider group/sublabel transition-colors hover:text-orange-700 ${collapsed ? 'sm:hidden' : ''}`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                            <span className="truncate">{subGroup.subLabel}</span>
                          </span>
                          <SafeChevronRight
                            size={10}
                            className={`text-orange-400/80 transition-transform duration-300 group-hover/sublabel:text-orange-600 ${isSubExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>
                        <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ${isSubExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          {subGroup.items.map((item, itemIdx) => {
                            const isActive = pathname === item.href;
                            let IconComponent = item.icon || SafeFileText;

                            return (
                              <Link
                                key={`sidebar-${item.href || itemIdx}-${item.label}`}
                                href={item.href}
                                prefetch={true}
                                title={collapsed ? item.label : undefined}
                                className={`flex min-w-0 items-center gap-3 px-3 py-2.5 pl-5 rounded-xl text-sm font-medium transition-all group overflow-hidden
                                  ${isActive
                                    ? 'bg-orange-50 text-orange-700 shadow-sm font-semibold'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100 hover:shadow-sm'
                                  }`}
                              >
                                <IconComponent
                                  size={18}
                                  className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-gray-600'}`}
                                />
                                <span className={`min-w-0 flex-1 truncate ${collapsed ? 'sm:hidden' : ''}`}>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          {/* Preload Button - ALWAYS VISIBLE */}
          <PreloadButton />
          
          {/* User row: name+role on left, bell on right (collapsed: bell only, centered) */}
          <div
            className={`flex items-center gap-2 px-3 py-2 min-w-0 ${collapsed ? 'sm:justify-center' : ''}`}
          >
            <div className={`min-w-0 flex-1 ${collapsed ? 'sm:hidden' : ''}`}>
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 capitalize truncate">
                {user.role.replace('_', ' ')}
              </p>
            </div>
            <div className="shrink-0">
              <AlertBell />
            </div>
          </div>

          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className="flex min-w-0 items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all group overflow-hidden"
          >
            <SafeLogOut
              size={20}
              className="flex-shrink-0 transition-transform group-hover:translate-x-1"
            />
            <span className={`min-w-0 flex-1 truncate ${collapsed ? 'sm:hidden' : ''}`}>Logout</span>
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
  const allowedMenus = (userWithProfile?.profile?.accessible_menus || ['DONATTOUR STORE', 'DONATTOUR OTR', 'DONATTOUR ONLINE', 'DONATTOUR MANAGEMENT'])
    .map((m: string) => m === 'DONATTOUR OTR' ? 'DONATTOUR KARYAWAN' : m);

  const isAllowed = (href: string) => {
    if (href === '#menu') return true;
    if (href.startsWith('/dashboard/otr') || href.startsWith('/dashboard/karyawan')) return allowedMenus.includes('DONATTOUR KARYAWAN');
    return allowedMenus.includes('DONATTOUR STORE');
  };

  const navItems = BOTTOM_NAV_ITEMS.filter(item => isAllowed(item.href));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 shadow-lg sm:hidden safe-area-bottom bottom-nav-mobile">
      <div className="flex items-stretch h-16">
        {navItems.map((item, navIdx) => {
          const isMenu = item.href === '#menu';
          const isActive = !isMenu && pathname === item.href;
          return (
            <button
              key={`bottom-nav-${item.href || navIdx}-${item.label}`}
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
      
      {/* Offline Ready Indicator */}
      <OfflineReadyIndicator />
      
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
      {/* ✅ PERF FIX #6: Menggunakan CSS class (globals.css) bukan inline <style> */}
      {/* Class 'sidebar-collapsed' mengontrol margin-left tanpa layout reflow setiap render */}
      <div className={`dashboard-content transition-all duration-300 min-h-screen flex flex-col ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top bar — mobile portrait only (< 640px) */}
        <div className="mobile-top-bar sm:hidden">
          <MobileTopBar />
        </div>

        {/* Page content — padding-bottom for bottom nav on mobile portrait */}
        <div className="flex-1 flex flex-col pb-20 sm:pb-0 dashboard-page-content">
          {children}
          <SyncStatusBar />
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
        <OfflineSeedProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </OfflineSeedProvider>
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
